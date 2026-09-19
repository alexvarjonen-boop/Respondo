import express from 'express';
import path from 'path';
import crypto from 'crypto';
import dns from 'dns/promises';
import net from 'net';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pg from 'pg';
import Stripe from 'stripe';
import OpenAI from 'openai';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = Number(process.env.PORT || 3000);
const BASE = (process.env.BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');

const pool = process.env.DATABASE_URL
  ? new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    })
  : null;
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const JWT = process.env.JWT_SECRET || crypto.randomBytes(48).toString('hex');
const COOKIE = 'respondo_session';

const q = (text, params = []) => {
  if (!pool) throw new Error('Tietokantaa ei ole vielä yhdistetty.');
  return pool.query(text, params);
};
const uid = () => crypto.randomUUID();
const cleanEmail = (value) => String(value || '').trim().toLowerCase();

const SECRET_KEY = crypto.createHash('sha256').update(JWT).digest();
function encryptSecret(value) {
  const text = String(value || '');
  if (!text) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', SECRET_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((x) => x.toString('base64url')).join('.');
}
function decryptSecret(value) {
  const text = String(value || '');
  if (!text) return '';
  try {
    const [ivPart, tagPart, dataPart] = text.split('.');
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      SECRET_KEY,
      Buffer.from(ivPart, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(dataPart, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    return '';
  }
}

const slug = (value) =>
  String(value || 'yritys')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50) || `yritys-${crypto.randomBytes(3).toString('hex')}`;

const REFERRAL_COUPON_ID =
  process.env.STRIPE_REFERRAL_COUPON_ID || 'RESPONDO_REFERRAL_20_FIRST_MONTH';

const normalizeReferralCode = (value) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 32);

async function ensureReferralCode(userId) {
  const found = await q(
    'SELECT referral_code,subscription_plan,stripe_subscription_id FROM users WHERE id=$1',
    [userId],
  );
  if (!found.rowCount) return '';

  let user = found.rows[0];
  let plan = user.subscription_plan;

  // Backfill the plan for customers created before referral tracking existed.
  if (!plan && stripe && user.stripe_subscription_id) {
    try {
      const subscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id);
      const priceId = subscription.items?.data?.[0]?.price?.id || '';
      if (priceId && priceId === process.env.STRIPE_MONTHLY_PRICE_ID) plan = 'monthly';
      if (priceId && priceId === process.env.STRIPE_YEARLY_PRICE_ID) plan = 'yearly';
      if (plan) {
        await q('UPDATE users SET subscription_plan=$1,updated_at=NOW() WHERE id=$2', [plan, userId]);
      }
    } catch (e) {
      console.warn('Referral plan backfill failed', e?.message || e);
    }
  }

  // Normal monthly customers get a code. The one-use owner test also gets one so the full purchase flow can be tested.
  if (!['monthly', 'owner_test'].includes(plan)) return '';
  if (user.referral_code) return user.referral_code;

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = 'RESPONDO-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    try {
      const updated = await q(
        'UPDATE users SET referral_code=$1,updated_at=NOW() WHERE id=$2 AND referral_code IS NULL RETURNING referral_code',
        [code, userId],
      );
      if (updated.rowCount) return updated.rows[0].referral_code;

      const current = await q('SELECT referral_code FROM users WHERE id=$1', [userId]);
      if (current.rows[0]?.referral_code) return current.rows[0].referral_code;
    } catch (e) {
      if (e?.code === '23505') continue;
      throw e;
    }
  }
  throw new Error('Suosittelukoodia ei saatu luotua.');
}

async function applyReferralDiscountIfEligible(userId, subscriptionId) {
  if (!pool || !stripe || !subscriptionId) return false;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const redemption = await client.query(
      `SELECT rr.id,rr.code,rr.stripe_discount_applied,u.subscription_plan
         FROM referral_redemptions rr
         JOIN users u ON u.id=rr.referred_user_id
        WHERE rr.referred_user_id=$1
        FOR UPDATE`,
      [userId],
    );

    if (
      !redemption.rowCount ||
      redemption.rows[0].stripe_discount_applied ||
      redemption.rows[0].subscription_plan !== 'monthly'
    ) {
      await client.query('COMMIT');
      return false;
    }

    const row = redemption.rows[0];
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Checkout has already finalized the €0 trial invoice at this point.
    // Applying a duration=once coupon now makes it hit the first paid invoice after the trial.
    if (subscription.metadata?.referral_code !== row.code) {
      await stripe.subscriptions.update(subscriptionId, {
        discounts: [{ coupon: REFERRAL_COUPON_ID }],
        metadata: {
          ...subscription.metadata,
          referral_code: row.code,
          referral_discount: '20_percent_first_paid_month',
        },
      });
    }

    await client.query(
      "UPDATE referral_redemptions SET stripe_discount_applied=TRUE,status='applied' WHERE id=$1",
      [row.id],
    );
    await client.query('COMMIT');
    return true;
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    throw e;
  } finally {
    client.release();
  }
}


async function ownerTestPlanEnabled() {
  if (!pool || !process.env.STRIPE_OWNER_TEST_PRICE_ID) return false;
  const r = await q("SELECT value FROM app_settings WHERE key='owner_test_plan_enabled'");
  return r.rows[0]?.value === 'true';
}

async function closeOwnerTestPlan(subscriptionId) {
  if (!pool) return;
  await q(
    "INSERT INTO app_settings(key,value,updated_at) VALUES('owner_test_plan_enabled','false',NOW()) ON CONFLICT(key) DO UPDATE SET value='false',updated_at=NOW()"
  );

  if (stripe && subscriptionId) {
    try {
      await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
    } catch (e) {
      console.error('Owner test subscription auto-cancel failed', e?.message || e);
    }
  }

  if (stripe && process.env.STRIPE_OWNER_TEST_PRICE_ID) {
    try {
      await stripe.prices.update(process.env.STRIPE_OWNER_TEST_PRICE_ID, { active: false });
    } catch (e) {
      console.error('Owner test price deactivation failed', e?.message || e);
    }
  }
}


async function sendStripeReceiptForInvoice(invoiceId, fallbackEmail = '') {
  if (!stripe || !invoiceId) return false;

  const invoice = await stripe.invoices.retrieve(invoiceId, {
    expand: ['payments.data.payment'],
  });
  const email = cleanEmail(invoice.customer_email || fallbackEmail);
  if (!email || Number(invoice.amount_paid || 0) <= 0) return false;

  const invoicePayment = invoice.payments?.data?.find(
    (x) => x?.status === 'paid' && x?.payment?.type === 'payment_intent' && x?.payment?.payment_intent,
  );
  const paymentIntentId = invoicePayment?.payment?.payment_intent;
  if (!paymentIntentId) return false;

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ['latest_charge'],
  });
  const charge =
    typeof paymentIntent.latest_charge === 'string'
      ? await stripe.charges.retrieve(paymentIntent.latest_charge)
      : paymentIntent.latest_charge;

  if (!charge?.id) return false;
  if (cleanEmail(charge.receipt_email) === email) return true;

  await stripe.charges.update(charge.id, { receipt_email: email });
  return true;
}

async function backfillOwnerTestReceiptOnce() {
  if (!pool || !stripe) return;

  const done = await q("SELECT value FROM app_settings WHERE key='owner_test_receipt_backfill_done'");
  if (done.rows[0]?.value === 'true') return;

  const candidate = await q(
    `SELECT email,stripe_subscription_id
       FROM users
      WHERE subscription_plan='owner_test'
        AND stripe_subscription_id IS NOT NULL
      ORDER BY updated_at DESC
      LIMIT 1`,
  );
  if (!candidate.rowCount) return;

  const subscription = await stripe.subscriptions.retrieve(candidate.rows[0].stripe_subscription_id);
  const invoiceId =
    typeof subscription.latest_invoice === 'string'
      ? subscription.latest_invoice
      : subscription.latest_invoice?.id || null;

  if (!invoiceId) return;

  const sent = await sendStripeReceiptForInvoice(invoiceId, candidate.rows[0].email);
  if (sent) {
    await q(
      "INSERT INTO app_settings(key,value,updated_at) VALUES('owner_test_receipt_backfill_done','true',NOW()) ON CONFLICT(key) DO UPDATE SET value='true',updated_at=NOW()"
    );
  }
}


function normalizeWebUrl(value, originOnly = false) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const withScheme = /^https?:\/\//i.test(raw) ? raw : 'https://' + raw;
    const u = new URL(withScheme);
    if (!['http:', 'https:'].includes(u.protocol)) return '';
    return originOnly ? u.origin : u.toString();
  } catch {
    return '';
  }
}

function normalizeHost(value) {
  try {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const u = raw.includes('://') ? new URL(raw) : new URL('https://' + raw);
    return u.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function requestOrigin(req) {
  const value = String(req.headers.origin || '').trim();
  try {
    return value ? new URL(value) : null;
  } catch {
    return null;
  }
}

function widgetOriginAllowed(req, tenant) {
  const origin = requestOrigin(req);
  const allowedHost = normalizeHost(tenant.website);
  if (!origin || !allowedHost) return false;
  return normalizeHost(origin.hostname) === allowedHost;
}

function setWidgetCors(req, res) {
  const origin = requestOrigin(req);
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin.origin);
    res.setHeader('Vary', 'Origin');
  }
}


const SEARCH_STOPWORDS = new Set([
  'että','tämä','tassa','tässä','tuo','noi','ne','nyt','kun','kuin','jos','mutta','tai','ja','on','oli','ovat',
  'olla','voiko','saako','miten','mika','mikä','mitä','missä','missa','paljon','paljonko','teillä','teilla','te',
  'me','minä','mina','sinä','sina','se','sen','sitä','sita','myös','myos','vielä','viela','entä','enta'
]);

function normalizeSearchText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9åäö€+\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function searchTokens(value) {
  return normalizeSearchText(value)
    .split(' ')
    .filter((x) => x.length > 2 && !SEARCH_STOPWORDS.has(x));
}

function scoreKnowledgeRow(row, query) {
  const q = normalizeSearchText(query);
  const qTokens = searchTokens(q);
  const title = normalizeSearchText(row.title);
  const answer = normalizeSearchText(row.answer);
  const keywordText = normalizeSearchText((row.keywords || []).join(' '));
  let score = 0;

  if (title && q.includes(title)) score += 14;
  for (const rawKeyword of row.keywords || []) {
    const kw = normalizeSearchText(rawKeyword);
    if (kw && (q.includes(kw) || kw.includes(q))) score += 9;
  }

  const titleTokens = new Set(searchTokens(title));
  const answerTokens = new Set(searchTokens(answer));
  const keywordTokens = new Set(searchTokens(keywordText));
  for (const token of qTokens) {
    if (titleTokens.has(token)) score += 5;
    if (keywordTokens.has(token)) score += 5;
    if (answerTokens.has(token)) score += 1.2;

    const stem = token.slice(0, Math.min(6, token.length));
    if (stem.length >= 4) {
      if ([...titleTokens].some((x) => x.startsWith(stem))) score += 2;
      if ([...keywordTokens].some((x) => x.startsWith(stem))) score += 2;
    }
  }

  const topicHints = [
    [['hinta','maksaa','hinnoittelu','tarjous','kustannus'], ['hinnat','hinnoittelu','tarjouspyyntölomake']],
    [['auki','aukiolo','lauantai','sunnuntai','viikonloppu','kello'], ['aukioloajat']],
    [['puhelin','numero','soittaa'], ['puhelinnumero']],
    [['sahkoposti','sähköposti','email','meili'], ['sahkoposti','sähköposti']],
    [['palvelu','teette','tarjoatte','onnistuuko'], ['palvelut']],
    [['alue','toimialue','tuletteko','paikkakunta'], ['toimialue']],
    [['osoite','sijainti'], ['osoite']],
    [['tarjous','tarjouspyynto','tarjouspyyntö'], ['tarjouspyyntolomake','tarjouspyyntölomake']],
  ];
  for (const [needles, titles] of topicHints) {
    if (needles.some((x) => q.includes(normalizeSearchText(x))) && titles.some((x) => title.includes(normalizeSearchText(x)))) {
      score += 12;
    }
  }
  return score;
}

function selectRelevantKnowledge(rows, query, limit = 6) {
  return rows
    .filter((x) => normalizeSearchText(x.title) !== 'vastaustyyli')
    .map((x) => ({ ...x, _score: scoreKnowledgeRow(x, query) }))
    .filter((x) => x._score >= 2)
    .sort((a, b) => b._score - a._score)
    .slice(0, limit);
}


const knowledgeEmbeddingCache = new Map();

function cosineSimilarity(a, b) {
  let dot = 0;
  let aa = 0;
  let bb = 0;
  const len = Math.min(a?.length || 0, b?.length || 0);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    aa += a[i] * a[i];
    bb += b[i] * b[i];
  }
  return aa && bb ? dot / (Math.sqrt(aa) * Math.sqrt(bb)) : 0;
}

function embeddingCacheKey(row) {
  const updated = row.updated_at ? new Date(row.updated_at).getTime() : 0;
  return [
    String(row.id || ''),
    updated,
    String(row.title || ''),
    String(row.answer || '').length,
    String(row.answer || '').slice(0, 80),
  ].join('|');
}

async function semanticSelectKnowledge(rows, query, limit = 6) {
  if (!openai || !rows?.length || !String(query || '').trim()) return [];

  const candidates = rows
    .filter((x) => normalizeSearchText(x.title) !== 'vastaustyyli')
    .slice(0, 80);
  if (!candidates.length) return [];

  const missing = [];
  for (const row of candidates) {
    const key = embeddingCacheKey(row);
    if (!knowledgeEmbeddingCache.has(key)) missing.push({ row, key });
  }

  const inputs = [String(query).slice(0, 1600)];
  for (const item of missing) {
    inputs.push(
      [
        item.row.title,
        item.row.answer,
        Array.isArray(item.row.keywords) && item.row.keywords.length
          ? 'Hakusanat: ' + item.row.keywords.join(', ')
          : '',
      ]
        .filter(Boolean)
        .join('\n')
        .slice(0, 2600)
    );
  }

  try {
    const response = await openai.embeddings.create({
      model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
      input: inputs,
    });

    const queryVector = response.data?.[0]?.embedding;
    if (!queryVector) return [];

    missing.forEach((item, index) => {
      const vector = response.data?.[index + 1]?.embedding;
      if (vector) knowledgeEmbeddingCache.set(item.key, vector);
    });

    return candidates
      .map((row) => {
        const vector = knowledgeEmbeddingCache.get(embeddingCacheKey(row));
        return {
          ...row,
          _semantic: vector ? cosineSimilarity(queryVector, vector) : 0,
        };
      })
      .sort((a, b) => b._semantic - a._semantic)
      .slice(0, limit);
  } catch (e) {
    console.warn('Semantic knowledge search failed', e?.message || e);
    return [];
  }
}

function knowledgeValue(rows, title) {
  const wanted = normalizeSearchText(title);
  const row = rows.find((x) => normalizeSearchText(x.title) === wanted);
  return String(row?.answer || '').trim();
}

function answerTone(rows) {
  const value = knowledgeValue(rows, 'Vastaustyyli').toLowerCase();
  if (value.includes('lyhyt')) return 'Pidä vastaus erittäin lyhyenä ja suorana. Tavallisesti 1–2 lausetta.';
  if (value.includes('asial')) return 'Kirjoita asiallisesti, rauhallisesti ja ammattimaisesti. Vältä turhaa myyntikieltä.';
  return 'Kirjoita ystävällisesti, luontevasti ja ihmisen tavoin. Vältä robottimaista tai yliyrittävää sävyä.';
}

function inferIntent(message) {
  const q = normalizeSearchText(message);
  if (/tilausnumero|tilaukseni|tilauksen tila|order status|where is my order|seuranta/.test(q)) return 'Tilauksen tila';
  if (/ajanvaraus|varaa aika|ajan vara|booking|appointment/.test(q)) return 'Ajanvaraus';
  if (/tarjous|tarjouspyynt|arvio/.test(q)) return 'Tarjouspyyntö';
  if (/hinta|maksaa|hinnoittelu|kustannus/.test(q)) return 'Hinta';
  if (/auki|lauantai|sunnuntai|viikonloppu|kello/.test(q)) return 'Aukioloajat';
  if (/puhelin|sahkoposti|sähköposti|yhteys|soittaa/.test(q)) return 'Yhteystiedot';
  if (/missä|missa|osoite|toimialue|alue/.test(q)) return 'Sijainti';
  if (/palvelu|teette|tarjoatte|onnistuuko/.test(q)) return 'Palvelut';
  return 'Asiakaskysymys';
}

function chatActions(rows, message, handoff = false, lang = 'fi') {
  const actionLang = lang === 'en' ? 'en' : 'fi';
  const q = normalizeSearchText(message);
  const quote = knowledgeValue(rows, 'Tarjouspyyntölomake');
  const booking = knowledgeValue(rows, 'Ajanvarauslinkki');
  const phone = knowledgeValue(rows, 'Puhelinnumero');
  const email = knowledgeValue(rows, 'Sähköposti');
  const actions = [];
  const push = (action) => {
    const key = action?.url || (action?.mode ? action.mode + ':' + action.type : '');
    if (!key || actions.some((x) => (x.url || (x.mode ? x.mode + ':' + x.type : '')) === key)) return;
    actions.push(action);
  };

  if (/tilausnumero|tilaukseni|tilauksen tila|seuranta|order status|where is my order/.test(q)) {
    push({ type: 'order_status', mode: 'order_form', label: actionLang === 'en' ? 'Check order status' : 'Tarkista tilauksen tila' });
  }

  if (/ajanvaraus|varaa|aika|ajan|booking|appointment/.test(q)) {
    push({ type: 'booking', mode: 'booking_form', label: actionLang === 'en' ? 'Book a time' : 'Varaa aika' });
    if (booking) push({ type: 'booking', label: actionLang === 'en' ? 'Open calendar' : 'Avaa ajanvaraus', url: booking });
  }

  if (/tarjous|hinta-arvio|arvio|kustannusarvio|quote/.test(q)) {
    push({ type: 'quote', mode: 'quote_form', label: actionLang === 'en' ? 'Request a quote' : 'Pyydä tarjous' });
    if (quote) push({ type: 'quote', label: actionLang === 'en' ? 'Open quote form' : 'Avaa tarjouslomake', url: quote });
  }

  if (/soittakaa|ottakaa yhteytta|ottakaa yhteyttä|yhteydenotto|call me|contact me/.test(q)) {
    push({ type: 'callback', mode: 'lead', label: actionLang === 'en' ? 'Request a callback' : 'Pyydä yhteydenottoa' });
  }

  if (phone && (handoff || /puhelin|soita|soittaa|yhteys/.test(q))) {
    push({ type: 'phone', label: actionLang === 'en' ? 'Call' : 'Soita', url: 'tel:' + phone.replace(/\s+/g, '') });
  }
  if (email && (handoff || /sahkoposti|sähköposti|email|meili|yhteys/.test(q))) {
    push({ type: 'email', label: actionLang === 'en' ? 'Send email' : 'Lähetä sähköposti', url: 'mailto:' + email });
  }

  return actions.slice(0, 4);
}

function parseGroundedModelOutput(raw, selected) {
  const text = String(raw || '').trim();
  if (!text || /^HANDOFF\.?$/i.test(text)) return { answer: '', sourceIds: [] };
  const match = text.match(/^SOURCES:\s*([0-9,\s]+)\s*\n+/i);
  let answer = text;
  let sourceIds = [];
  if (match) {
    answer = text.slice(match[0].length).trim();
    const indexes = match[1].split(',').map((x) => Number(x.trim())).filter((x) => Number.isInteger(x) && x >= 1 && x <= selected.length);
    sourceIds = [...new Set(indexes.map((i) => selected[i - 1]?.id).filter(Boolean))];
  }
  if (!sourceIds.length) sourceIds = selected.slice(0, 2).map((x) => x.id).filter(Boolean);
  return { answer, sourceIds };
}

function isPrivateAddress(ip) {
  const version = net.isIP(ip);
  if (version === 4) {
    const [a,b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  if (version === 6) {
    const value = ip.toLowerCase();
    return value === '::1' || value === '::' || value.startsWith('fc') || value.startsWith('fd') || value.startsWith('fe80:');
  }
  return true;
}

async function assertPublicHttpUrl(value) {
  const normalized = normalizeWebUrl(value, false);
  if (!normalized) throw new Error('Tarkista verkkosivun osoite ja yritä uudelleen.');
  const url = new URL(normalized);
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local')) throw new Error('Verkkosivua ei voi hakea.');
  if (net.isIP(host)) {
    if (isPrivateAddress(host)) throw new Error('Verkkosivua ei voi hakea.');
  } else {
    const addresses = await dns.lookup(host, { all: true });
    if (!addresses.length || addresses.some((x) => isPrivateAddress(x.address))) throw new Error('Verkkosivua ei voi hakea.');
  }
  return url;
}

async function fetchPublicHtml(value) {
  let url = await assertPublicHttpUrl(value);
  for (let i = 0; i < 4; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    let response;
    try {
      response = await fetch(url, {
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'User-Agent': 'RESPONDO-AI-Website-Importer/1.0' },
      });
    } finally {
      clearTimeout(timer);
    }
    if ([301,302,303,307,308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) throw new Error('Verkkosivun uudelleenohjaus epäonnistui.');
      url = await assertPublicHttpUrl(new URL(location, url).toString());
      continue;
    }
    if (!response.ok) throw new Error('Verkkosivua ei saatu luettua.');
    const type = String(response.headers.get('content-type') || '');
    if (!type.includes('text/html')) throw new Error('Osoite ei näytä HTML-verkkosivulta.');
    const length = Number(response.headers.get('content-length') || 0);
    if (length > 1_500_000) throw new Error('Verkkosivu on liian suuri automaattiseen tuontiin.');
    const html = (await response.text()).slice(0, 1_500_000);
    return { html, finalUrl: url.toString() };
  }
  throw new Error('Verkkosivulla on liikaa uudelleenohjauksia.');
}

function htmlToReadableText(html) {
  return String(html || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<!--([\s\S]*?)-->/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|section|article|h1|h2|h3|h4|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}


function extractSameSiteLinks(html, baseUrl) {
  const out = [];
  let base;
  try { base = new URL(baseUrl); } catch { return out; }
  const seen = new Set();
  const re = /href\s*=\s*["']([^"'#]+)["']/gi;
  let match;

  while ((match = re.exec(String(html || '')))) {
    const raw = String(match[1] || '').replace(/&amp;/gi, '&').trim();
    if (!raw || /^(mailto:|tel:|javascript:|data:)/i.test(raw)) continue;

    try {
      const u = new URL(raw, base);
      if (!/^https?:$/.test(u.protocol)) continue;
      if (u.hostname.toLowerCase() !== base.hostname.toLowerCase()) continue;
      u.hash = '';
      if (/\.(pdf|jpg|jpeg|png|gif|svg|webp|zip|docx?|xlsx?)$/i.test(u.pathname)) continue;
      const key = u.origin + u.pathname.replace(/\/$/, '') + u.search;
      if (seen.has(key)) continue;
      seen.add(key);

      const p = normalizeSearchText(u.pathname + ' ' + u.search);
      let score = 0;
      if (/ajanvaraus|booking|book|appointment/.test(p)) score += 12;
      if (/tarjous|quote|request/.test(p)) score += 11;
      if (/hinta|price|pricing/.test(p)) score += 10;
      if (/palvelu|service/.test(p)) score += 9;
      if (/yhteys|contact/.test(p)) score += 8;
      if (/faq|ukk|kysym/.test(p)) score += 7;
      if (/meista|about/.test(p)) score += 4;
      out.push({ url: u.toString(), score });
    } catch {}
  }

  return out
    .sort((a, b) => b.score - a.score)
    .map((x) => x.url);
}

async function fetchWebsiteBundle(value, maxPages = 4) {
  const first = await fetchPublicHtml(value);
  const base = new URL(first.finalUrl);
  const links = extractSameSiteLinks(first.html, first.finalUrl);
  const pages = [{ url: first.finalUrl, html: first.html }];

  for (const link of links) {
    if (pages.length >= maxPages) break;
    try {
      const page = await fetchPublicHtml(link);
      const resolved = new URL(page.finalUrl);
      if (resolved.hostname.toLowerCase() !== base.hostname.toLowerCase()) continue;
      if (pages.some((x) => x.url === page.finalUrl)) continue;
      pages.push({ url: page.finalUrl, html: page.html });
    } catch {}
  }

  const text = pages.map((page) => {
    const readable = htmlToReadableText(page.html).slice(0, 11000);
    return 'SIVU: ' + page.url + '\n' + readable;
  }).join('\n\n---\n\n').slice(0, 36000);

  return {
    finalUrl: first.finalUrl,
    text,
    pages: pages.map((x) => x.url),
    links: links.slice(0, 30),
  };
}

function buildProfileKnowledge(profile = {}) {
  const rows = [];
  const add = (title, answer, keywords = []) => {
    const value = String(answer || '').trim();
    if (value) rows.push({ id: 'demo-' + rows.length, category: 'Yrityksen perustiedot', title, answer: value, keywords });
  };
  add('Hinnat', profile.pricing, ['hinta','maksaa','hinnoittelu']);
  add('Aukioloajat', profile.hours, ['auki','aukiolo','lauantai','sunnuntai']);
  add('Puhelinnumero', profile.phone, ['puhelin','numero','soittaa']);
  add('Sähköposti', profile.email, ['sähköposti','email']);
  add('Palvelut', Array.isArray(profile.services) ? profile.services.join(', ') : profile.services, ['palvelut','teette','tarjoatte']);
  add('Toimialue', profile.serviceArea, ['toimialue','alue','paikkakunta']);
  add('Osoite', profile.address, ['osoite','sijainti']);
  add('Verkkosivu', profile.website, ['verkkosivu','www']);
  add('Tarjouspyyntölomake', profile.quoteRequestUrl, ['tarjous','tarjouspyyntö']);
  add('Ajanvarauslinkki', profile.bookingUrl, ['ajanvaraus','varaa','aika','booking']);
  add('Lisätiedot', profile.notes, ['lisätieto','päivystys','maksutapa','takuu','ajanvaraus']);
  add('Vastaustyyli', profile.tone, ['tyyli']);
  for (const fact of Array.isArray(profile.customFacts) ? profile.customFacts.slice(0, 30) : []) {
    add(String(fact?.key || '').slice(0, 180), String(fact?.answer || '').slice(0, 1500), searchTokens(fact?.key || '').slice(0, 12));
  }
  return rows;
}

async function generateGroundedAnswer({ companyName, rows, message, history = [], lang = 'fi', pageContext = {} }) {
  const responseLang = lang === 'en' ? 'en' : 'fi';
  const cleanMessage = String(message || '').trim();
  if (!cleanMessage) return { answer: '', handoff: true, confidence: 0, intent: 'Tyhjä', sourceIds: [], selected: [] };

  const normalized = normalizeSearchText(cleanMessage);
  if (/^(hei|moi|moikka|hello|hi|hey|terve)[!. ]*$/.test(normalized)) {
    return { answer: responseLang === 'en' ? 'Hi! How can I help?' : 'Hei! Miten voin auttaa?', handoff: false, confidence: 1, intent: responseLang === 'en' ? 'Greeting' : 'Tervehdys', sourceIds: [], selected: [] };
  }
  if (/^(kiitos|kiitti|thanks|thank you)[!. ]*$/.test(normalized)) {
    return { answer: responseLang === 'en' ? 'You’re welcome! I’m happy to help if you have anything else.' : 'Ole hyvä! Autan mielelläni, jos tulee vielä jotain mieleen.', handoff: false, confidence: 1, intent: responseLang === 'en' ? 'Thanks' : 'Kiitos', sourceIds: [], selected: [] };
  }

  const priorQuestions = history.slice(-2).map((x) => String(x.question || x.user || '')).filter(Boolean);
  const needsContext = cleanMessage.length < 55 || /^(enta|entä|ja |mites|miten sitten|siis|se |sen |sita|sitä)/i.test(cleanMessage);
  const retrievalQuery = needsContext && priorQuestions.length ? priorQuestions.slice(-1)[0] + ' ' + cleanMessage : cleanMessage;
  let selected = selectRelevantKnowledge(rows, retrievalQuery, 6);
  const intent = inferIntent(cleanMessage);

  // Always combine keyword matching with semantic meaning matching.
  // The customer's wording does not need to resemble the saved example question.
  // Example: “Voinks mä saada jonku hinta-arvion?” can match “Mistä pyydän tarjouksen?”
  // when the approved answer is about requesting a quote.
  if (openai) {
    const semantic = await semanticSelectKnowledge(rows, retrievalQuery, 10);
    const merged = new Map();
    for (const row of [...semantic, ...selected]) {
      if (!row?.id) continue;
      const previous = merged.get(row.id);
      if (!previous) merged.set(row.id, row);
      else merged.set(row.id, { ...previous, ...row });
    }
    selected = [...merged.values()]
      .sort((a, b) => {
        const aRank = Number(a._semantic || 0) * 28 + Number(a._score || 0);
        const bRank = Number(b._semantic || 0) * 28 + Number(b._score || 0);
        return bRank - aRank;
      })
      .slice(0, 8);
  }

  if (!selected.length) {
    return { answer: '', handoff: true, confidence: 0.2, intent, sourceIds: [], selected: [] };
  }

  const top = selected[0];
  const normalizedTitle = normalizeSearchText(top?.title);
  const exactTitleMatch = normalizedTitle && (
    normalized === normalizedTitle ||
    normalized.includes(normalizedTitle) ||
    normalizedTitle.includes(normalized)
  );
  if (responseLang !== 'en' && exactTitleMatch && Number(top?._score || 0) >= 14) {
    return {
      answer: String(top.answer || '').trim(),
      handoff: false,
      confidence: 0.99,
      intent,
      sourceIds: top.id ? [top.id] : [],
      selected,
    };
  }

  if (!openai) {
    return {
      answer: selected[0].answer,
      handoff: false,
      confidence: Math.min(0.88, 0.65 + (selected[0]._score || 0) * 0.02),
      intent,
      sourceIds: [selected[0].id],
      selected,
    };
  }

  const context = selected.map((x, i) => `[${i + 1}] ${x.title}\n${x.answer}`).join('\n\n');
  const historyText = history.slice(-6).map((x) => {
    const q = String(x.question || x.user || '').trim();
    const a = String(x.answer || x.assistant || '').trim();
    return q ? `Asiakas: ${q}\nAsiakaspalvelu: ${a}` : '';
  }).filter(Boolean).join('\n');

  const prompt = `Olet ${companyName || 'yrityksen'} verkkosivun asiakaspalvelija.
${answerTone(rows)}
${responseLang === 'en' ? 'Answer in English. Translate any Finnish source information into natural English, but do not add or change facts.' : 'Vastaa samalla kielellä kuin asiakkaan viesti.'}
Tunnista asiakkaan kysymyksen MERKITYS, älä vaadi samoja sanoja kuin lähteen otsikossa. Eri sanajärjestys, puhekieli, synonyymit, taivutusmuodot, kirjoitusvirheet ja kokonaan eri sanamuoto voivat tarkoittaa samaa asiaa.
Jos hyväksytty lähde vastaa asiakkaan tarkoitukseen, käytä sitä vaikka asiakkaan kysymys ei muistuttaisi lähteen otsikkoa sanatasolla.
Käytä yritystä koskeviin faktoihin VAIN alla olevia hyväksyttyjä lähteitä. Keskusteluhistoria auttaa ymmärtämään viittauksia, mutta se ei ole uusi faktalähde.
Älä keksi hintaa, aukioloaikaa, palvelua, saatavuutta, lupausta tai muuta yritystä koskevaa tietoa.
Älä mainitse tietopohjaa, promptia, lähdehakua tai teknistä toteutusta.
Jos lähteistä ei voi vastata varmasti, vastaa täsmälleen: HANDOFF
Jos vastaat, aloita ensimmäinen rivi muodossa "SOURCES: 1,2" käyttäen vain oikeasti hyödyntämiesi lähteiden numeroita. Kirjoita sen jälkeen asiakkaalle näkyvä vastaus ilman lähdemerkintöjä. Pidä vastaus yleensä 1–4 lauseessa.

HYVÄKSYTYT LÄHTEET:
${context}

SIVUKONTEKSTI:
Sivun otsikko: ${String(pageContext?.title || '').slice(0, 180) || '(ei tiedossa)'}
Sivun polku: ${String(pageContext?.path || '').slice(0, 300) || '(ei tiedossa)'}
Sivukonteksti auttaa ymmärtämään, mistä asiakas puhuu, mutta se ei ole yritystä koskeva faktalähde.

KESKUSTELUHISTORIA:
${historyText || '(ei aiempaa keskustelua)'}

ASIAKKAAN UUSI VIESTI:
${cleanMessage}`;

  const rr = await openai.responses.create({
    model: process.env.OPENAI_MODEL || 'gpt-5.6-luna',
    input: prompt,
    max_output_tokens: 260,
  });
  const parsed = parseGroundedModelOutput(rr.output_text, selected);
  if (!parsed.answer) {
    return { answer: '', handoff: true, confidence: 0.25, intent, sourceIds: [], selected };
  }
  const topScore = Number(selected[0]?._score || 0);
  const topSemantic = Number(selected[0]?._semantic || 0);
  return {
    answer: parsed.answer,
    handoff: false,
    confidence: Math.min(0.96, Math.max(0.72, 0.68 + Math.min(topScore, 10) * 0.018 + topSemantic * 0.22)),
    intent,
    sourceIds: parsed.sourceIds,
    selected,
  };
}

function cookies(req) {
  return Object.fromEntries(
    String(req.headers.cookie || '')
      .split(';')
      .map((x) => x.trim().split('=').map(decodeURIComponent))
      .filter((x) => x.length === 2),
  );
}

function setSession(res, user) {
  res.cookie(
    COOKIE,
    jwt.sign({ sub: user.id, email: user.email }, JWT, { expiresIn: '14d' }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1209600000,
    },
  );
}

function auth(req, res, next) {
  try {
    const token = cookies(req)[COOKIE];
    if (!token) return res.status(401).json({ error: 'Kirjaudu sisään.' });
    req.user = jwt.verify(token, JWT);
    next();
  } catch {
    return res.status(401).json({ error: 'Istunto on vanhentunut.' });
  }
}

async function subscribed(req, res, next) {
  try {
    const r = await q('SELECT status, subscription_status FROM users WHERE id=$1', [req.user.sub]);
    if (!r.rowCount) return res.status(404).json({ error: 'Tiliä ei löytynyt.' });
    const user = r.rows[0];
    if (user.status !== 'active' || !['active', 'trialing'].includes(user.subscription_status)) {
      return res.status(402).json({ error: 'Aktiivinen tilaus tarvitaan.' });
    }
    next();
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}


const OAUTH_PROFILE_COOKIE = 'respondo_oauth_profile';
const OAUTH_STATE_COOKIE = 'respondo_oauth_state';

function oauthConfig(provider) {
  if (provider !== 'google') return { configured: false };
  return {
    configured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: BASE + '/api/auth/oauth/google/callback',
  };
}

function setOauthState(res, nonce) {
  res.cookie(OAUTH_STATE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 10 * 60 * 1000,
  });
}

function setOauthProfile(res, profile) {
  res.cookie(
    OAUTH_PROFILE_COOKIE,
    jwt.sign(profile, JWT, { expiresIn: '15m' }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    }
  );
}

function getOauthProfile(req) {
  try {
    const token = cookies(req)[OAUTH_PROFILE_COOKIE];
    if (!token) return null;
    return jwt.verify(token, JWT);
  } catch {
    return null;
  }
}

async function finishOauth(req, res, code, state) {
  const provider = 'google';
  const cfg = oauthConfig(provider);
  if (!cfg.configured) {
    return res.redirect('/kirjaudu?oauth_error=not_configured&provider=google');
  }

  let statePayload;
  try {
    statePayload = jwt.verify(String(state || ''), JWT);
  } catch {
    return res.redirect('/kirjaudu?oauth_error=state&provider=google');
  }

  const stateCookie = cookies(req)[OAUTH_STATE_COOKIE];
  if (!stateCookie || statePayload.nonce !== stateCookie || statePayload.provider !== provider) {
    return res.redirect('/kirjaudu?oauth_error=state&provider=google');
  }
  res.clearCookie(OAUTH_STATE_COOKIE);

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        redirect_uri: cfg.redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenResponse.ok) throw new Error('Google token exchange failed');
    const token = await tokenResponse.json();

    const userResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: 'Bearer ' + token.access_token },
    });
    if (!userResponse.ok) throw new Error('Google userinfo failed');
    const user = await userResponse.json();
    if (!user.email || user.email_verified === false) throw new Error('Google email not verified');

    const profile = {
      provider: 'google',
      sub: user.sub,
      email: cleanEmail(user.email),
      name: String(user.name || ''),
    };

    if (statePayload.flow === 'calendar') {
      let sessionUser = null;
      try {
        const sessionToken = cookies(req)[COOKIE];
        sessionUser = sessionToken ? jwt.verify(sessionToken, JWT) : null;
      } catch {}
      if (!sessionUser?.sub || sessionUser.sub !== statePayload.userId) {
        return res.redirect('/app?section=automation&calendar=auth_error');
      }

      const tr = await q('SELECT * FROM tenants WHERE owner_user_id=$1',[statePayload.userId]);
      if (!tr.rowCount) return res.redirect('/app?section=automation&calendar=missing_tenant');
      const tenant = tr.rows[0];

      const accessToken = String(token.access_token || '');
      const refreshToken = String(token.refresh_token || '');
      const expiresAt = new Date(Date.now() + Number(token.expires_in || 3600) * 1000);
      const existingRefresh = tenant.google_calendar_refresh_token || null;

      if (!accessToken || (!refreshToken && !existingRefresh)) {
        return res.redirect('/app?section=automation&calendar=no_refresh_token');
      }

      await q(
        `UPDATE tenants
            SET google_calendar_access_token=$1,
                google_calendar_refresh_token=$2,
                google_calendar_token_expires_at=$3,
                google_calendar_email=$4,
                google_calendar_id=COALESCE(google_calendar_id,'primary'),
                updated_at=NOW()
          WHERE id=$5`,
        [
          encryptSecret(accessToken),
          refreshToken ? encryptSecret(refreshToken) : existingRefresh,
          expiresAt,
          profile.email,
          tenant.id,
        ],
      );
      return res.redirect('/app?section=automation&calendar=connected');
    }

    if (statePayload.flow === 'login') {
      const found = await q('SELECT * FROM users WHERE lower(email)=lower($1)', [profile.email]);
      if (!found.rowCount) return res.redirect('/kirjaudu?oauth_error=no_account&provider=google');
      if (found.rows[0].status === 'pending') return res.redirect('/kirjaudu?oauth_error=pending&provider=google');
      setSession(res, found.rows[0]);
      return res.redirect('/app');
    }

    setOauthProfile(res, profile);
    return res.redirect('/tilaus?oauth=google');
  } catch (e) {
    console.error('Google OAuth failed', e);
    if (statePayload.flow === 'calendar') {
      return res.redirect('/app?section=automation&calendar=failed');
    }
    return res.redirect(
      '/' + (statePayload.flow === 'signup' ? 'tilaus' : 'kirjaudu') +
      '?oauth_error=failed&provider=google'
    );
  }
}

app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return res.status(503).send('Stripe not configured');

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return res.status(400).send('Invalid signature');
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata?.user_id;
      if (userId) {
        let subscriptionStatus = 'active';
        let periodEnd = null;
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          subscriptionStatus = subscription.status;
          if (subscription.current_period_end) periodEnd = new Date(subscription.current_period_end * 1000);
        }
        await q(
          `UPDATE users
             SET stripe_customer_id=$1,
                 stripe_subscription_id=$2,
                 status=CASE WHEN $3 IN ('active','trialing') THEN 'active' ELSE 'pending' END,
                 subscription_status=$3,
                 current_period_end=$4,
                 updated_at=NOW()
           WHERE id=$5`,
          [session.customer, session.subscription, subscriptionStatus, periodEnd, userId],
        );

        try {
          await ensureReferralCode(userId);
          const subscriptionId =
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription?.id || null;
          if (subscriptionId) await applyReferralDiscountIfEligible(userId, subscriptionId);
        } catch (e) {
          console.error('Referral activation from webhook failed', e);
        }

        if (session.metadata?.plan === 'owner_test') {
          const subscriptionId =
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription?.id || null;
          try {
            await closeOwnerTestPlan(subscriptionId);
          } catch (e) {
            console.error('Owner test plan close from webhook failed', e);
          }
        }
      }
    }

    if (event.type === 'invoice.paid') {
      const invoice = event.data.object;
      if (Number(invoice.amount_paid || 0) > 0) {
        try {
          await sendStripeReceiptForInvoice(invoice.id, invoice.customer_email || '');
        } catch (e) {
          console.error('Stripe receipt email failed', e);
        }
      }
    }

    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const periodEnd = subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : null;
      await q(
        `UPDATE users
            SET subscription_status=$1,
                status=CASE WHEN $1 IN ('active','trialing') THEN 'active' ELSE 'inactive' END,
                current_period_end=$2,
                updated_at=NOW()
          WHERE stripe_subscription_id=$3`,
        [subscription.status, periodEnd, subscription.id],
      );
    }

    return res.json({ received: true });
  } catch (e) {
    console.error('Stripe webhook failed', e);
    return res.status(500).json({ error: 'Webhook failed' });
  }
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({
  limit:'1mb',
  verify(req,res,buf) {
    req.rawBody = Buffer.from(buf);
  },
}));
app.use(express.urlencoded({ extended: false }));
app.use(express.text({ type: 'text/plain', limit: '20kb' }));
app.use(rateLimit({ windowMs: 60000, limit: 180, standardHeaders: true, legacyHeaders: false }));
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders(res, filePath) {
    if (filePath.endsWith('widget.js')) {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    }
  },
}));

const publicChatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 35,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Liian monta viestiä. Yritä hetken kuluttua uudelleen.' },
});
const demoChatLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demon viestiraja tuli täyteen. Yritä myöhemmin uudelleen.' },
});

app.get('/api/health', async (req, res) => {
  const health = {
    ok: true,
    service: 'RESPONDO AI',
    database: Boolean(pool),
    stripe: Boolean(stripe && process.env.STRIPE_WEBHOOK_SECRET),
    openai: Boolean(openai),
  };
  if (pool) {
    try {
      await pool.query('SELECT 1');
    } catch {
      health.ok = false;
      health.database = false;
    }
  }
  res.status(health.ok ? 200 : 503).json(health);
});



app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *\nAllow: /\nSitemap: ${BASE}/sitemap.xml\n`);
});

app.get('/sitemap.xml', (req, res) => {
  const urls = ['/', '/assistant', '/tietoturva', '/tietosuoja', '/kayttoehdot'];
  res.type('application/xml').send(
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    urls.map((path) => '<url><loc>' + BASE + path + '</loc></url>').join('') +
    '</urlset>'
  );
});

app.get('/api/app/google-calendar/start', auth, subscribed, (req,res) => {
  const cfg = oauthConfig('google');
  if (!cfg.configured) return res.redirect('/app?section=automation&calendar=not_configured');

  const nonce = crypto.randomBytes(20).toString('hex');
  const state = jwt.sign({
    provider:'google',
    flow:'calendar',
    nonce,
    userId:req.user.sub,
  },JWT,{ expiresIn:'10m' });
  setOauthState(res,nonce);

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id:cfg.clientId,
    redirect_uri:cfg.redirectUri,
    response_type:'code',
    scope:'openid email profile https://www.googleapis.com/auth/calendar.events',
    state,
    prompt:'consent',
    access_type:'offline',
    include_granted_scopes:'true',
  }).toString();
  return res.redirect(url.toString());
});

app.post('/api/app/google-calendar/disconnect', auth, subscribed, async (req,res) => {
  try {
    const tr = await q('SELECT id FROM tenants WHERE owner_user_id=$1',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    await q(
      `UPDATE tenants
          SET google_calendar_access_token=NULL,
              google_calendar_refresh_token=NULL,
              google_calendar_token_expires_at=NULL,
              google_calendar_email=NULL,
              updated_at=NOW()
        WHERE id=$1`,
      [tr.rows[0].id],
    );
    return res.json({ ok:true });
  } catch {
    return res.status(500).json({ error:'Google Calendar -yhteyttä ei voitu katkaista.' });
  }
});

app.get('/api/auth/oauth/:provider/start', (req, res) => {
  const provider = String(req.params.provider || '').toLowerCase();
  const flow = req.query.flow === 'login' ? 'login' : 'signup';
  if (provider !== 'google') return res.status(404).end();

  const cfg = oauthConfig('google');
  if (!cfg.configured) {
    return res.redirect(
      '/' + (flow === 'signup' ? 'tilaus' : 'kirjaudu') +
      '?oauth_error=not_configured&provider=google'
    );
  }

  const nonce = crypto.randomBytes(20).toString('hex');
  const state = jwt.sign({ provider: 'google', flow, nonce }, JWT, { expiresIn: '10m' });
  setOauthState(res, nonce);

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
    include_granted_scopes: 'true',
  }).toString();
  return res.redirect(url.toString());
});

app.get('/api/auth/oauth/google/callback', async (req, res) => {
  const code = String(req.query.code || '');
  const state = String(req.query.state || '');
  if (!code) {
    try {
      const statePayload = jwt.verify(state,JWT);
      if (statePayload.flow === 'calendar') {
        return res.redirect('/app?section=automation&calendar=cancelled');
      }
    } catch {}
    return res.redirect('/kirjaudu?oauth_error=failed&provider=google');
  }
  return finishOauth(req, res, code, state);
});

app.get('/api/auth/oauth-profile', (req, res) => {
  const profile = getOauthProfile(req);
  if (!profile) return res.status(404).json({ error: 'OAuth-profiilia ei löytynyt.' });
  return res.json({
    provider: profile.provider,
    email: profile.email,
    name: profile.name || '',
  });
});

app.get('/api/public/config', async (req, res) => {
  let ownerTestEnabled = false;
  try {
    ownerTestEnabled = await ownerTestPlanEnabled();
  } catch (e) {
    console.warn('Owner test config read failed', e?.message || e);
  }
  return res.json({
    brand: 'RESPONDO AI',
    supportEmail: process.env.SUPPORT_EMAIL || 'respondoai.fi@outlook.com',
    trialDays: 3,
    monthlyNet: 49,
    yearlyNet: 540,
    ownerTestEnabled,
    ownerTestPrice: 0.50,
  });
});

app.post('/api/auth/start-checkout', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Tietokantaa ei ole yhdistetty.' });
  if (!stripe) return res.status(503).json({ error: 'Stripe-maksuja ei ole yhdistetty.' });

  const { fullName, companyName, businessId, password, plan, acceptedTerms } = req.body;
  const email = cleanEmail(req.body.email);
  const normalizedPlan = plan === 'owner_test' ? 'owner_test' : (plan === 'yearly' ? 'yearly' : 'monthly');
  const referralCode = normalizeReferralCode(req.body.referralCode);
  const oauthProfile = getOauthProfile(req);
  const socialSignup = Boolean(oauthProfile && cleanEmail(oauthProfile.email) === email && oauthProfile.provider === 'google');
  if (!acceptedTerms || !email || !companyName || (!socialSignup && (!password || password.length < 10))) {
    return res.status(400).json({
      error: socialSignup
        ? 'Täytä kaikki pakolliset tiedot.'
        : 'Täytä kaikki pakolliset tiedot. Salasanan on oltava vähintään 10 merkkiä.',
    });
  }
  if (referralCode && normalizedPlan !== 'monthly') {
    return res.status(400).json({ error: 'Suosittelukoodi toimii vain kuukausitilauksessa.' });
  }

  try {
    if (normalizedPlan === 'owner_test' && !(await ownerTestPlanEnabled())) {
      return res.status(410).json({ error: 'Omistajan testitilaus ei ole enää käytettävissä.' });
    }

    const price =
      normalizedPlan === 'owner_test'
        ? process.env.STRIPE_OWNER_TEST_PRICE_ID
        : normalizedPlan === 'yearly'
          ? process.env.STRIPE_YEARLY_PRICE_ID
          : process.env.STRIPE_MONTHLY_PRICE_ID;
    if (!price) return res.status(503).json({ error: 'Stripe-hintaa ei ole määritetty.' });
    const existing = await q(
      'SELECT id,status,stripe_customer_id,stripe_subscription_id FROM users WHERE lower(email)=lower($1)',
      [email],
    );
    if (existing.rowCount) {
      const user = existing.rows[0];
      if (user.status === 'pending' && !user.stripe_customer_id && !user.stripe_subscription_id) {
        await q('DELETE FROM users WHERE id=$1', [user.id]);
      } else {
        return res.status(409).json({ error: 'Tällä sähköpostilla on jo tili.' });
      }
    }

    const id = uid();
    const hash = await bcrypt.hash(socialSignup ? crypto.randomBytes(32).toString('hex') : password, 12);
    const client = await pool.connect();
    let session;

    try {
      await client.query('BEGIN');

      let referrer = null;
      if (referralCode) {
        const ref = await client.query(
          `SELECT id,email,status,subscription_status,subscription_plan
             FROM users
            WHERE referral_code=$1`,
          [referralCode],
        );
        if (
          !ref.rowCount ||
          ref.rows[0].status !== 'active' ||
          !['active','trialing'].includes(ref.rows[0].subscription_status) ||
          !['monthly','owner_test'].includes(ref.rows[0].subscription_plan)
        ) {
          throw Object.assign(new Error('Suosittelukoodi ei ole voimassa.'), { publicStatus: 400 });
        }
        if (cleanEmail(ref.rows[0].email) === email) {
          throw Object.assign(new Error('Et voi käyttää omaa suosittelukoodiasi.'), { publicStatus: 400 });
        }
        const alreadyUsed = await client.query(
          'SELECT 1 FROM referral_redemptions WHERE referrer_user_id=$1 AND stripe_discount_applied=TRUE LIMIT 1',
          [ref.rows[0].id],
        );
        if (alreadyUsed.rowCount) {
          throw Object.assign(new Error('Tämä suosittelukoodi on jo käytetty.'), { publicStatus: 400 });
        }
        referrer = ref.rows[0];
      }

      await client.query(
        `INSERT INTO users(id,email,password_hash,full_name,company_name,business_id,status,subscription_plan)
         VALUES($1,$2,$3,$4,$5,$6,'pending',$7)`,
        [id, email, hash, fullName || '', companyName, businessId || null, normalizedPlan],
      );

      let tenantSlug = slug(companyName);
      const slugExists = await client.query('SELECT 1 FROM tenants WHERE slug=$1', [tenantSlug]);
      if (slugExists.rowCount) tenantSlug = `${tenantSlug}-${crypto.randomBytes(3).toString('hex')}`;

      await client.query(
        `INSERT INTO tenants(id,owner_user_id,slug,name,contact_email)
         VALUES($1,$2,$3,$4,$5)`,
        [uid(), id, tenantSlug, companyName, email],
      );

      if (referrer) {
        await client.query(
          `INSERT INTO referral_redemptions(id,referrer_user_id,referred_user_id,code,status)
           VALUES($1,$2,$3,$4,'pending')`,
          [uid(), referrer.id, id, referralCode],
        );
      }

      session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer_email: email,
        line_items: [{ price, quantity: 1 }],
        subscription_data: {
          ...(normalizedPlan === 'owner_test' ? {} : { trial_period_days: 3 }),
          metadata: {
            user_id: id,
            plan: normalizedPlan,
            ...(referralCode ? { referral_code: referralCode } : {}),
          },
        },
        tax_id_collection: { enabled: true },
        billing_address_collection: 'required',
        allow_promotion_codes: false,
        success_url: `${BASE}/api/auth/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:
          normalizedPlan === 'owner_test'
            ? `${BASE}/tilaus?owner-test=1&plan=owner_test&cancelled=1`
            : `${BASE}/tilaus?cancelled=1`,
        metadata: {
          user_id: id,
          plan: normalizedPlan,
          ...(referralCode ? { referral_code: referralCode } : {}),
        },
        automatic_tax: { enabled: true },
      });

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    return res.json({ url: session.url });
  } catch (e) {
    console.error('Checkout start failed', e);
    if (e?.publicStatus === 400) return res.status(400).json({ error: e.message });
    return res.status(500).json({ error: 'Tilauksen aloitus epäonnistui.' });
  }
});

app.get('/api/auth/checkout-success', async (req, res) => {
  if (!pool || !stripe) return res.redirect('/kirjaudu?checkout_error=1');

  const sessionId = String(req.query.session_id || '').trim();
  if (!sessionId || !sessionId.startsWith('cs_')) {
    return res.redirect('/kirjaudu?checkout_error=1');
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const userId = session.metadata?.user_id;

    if (
      session.status !== 'complete' ||
      session.mode !== 'subscription' ||
      !userId ||
      session.metadata?.auto_login_used === '1'
    ) {
      return res.redirect('/kirjaudu?checkout_error=1');
    }

    let subscriptionStatus = 'active';
    let periodEnd = null;

    if (session.subscription) {
      const subscriptionId =
        typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      subscriptionStatus = subscription.status;
      if (subscription.current_period_end) {
        periodEnd = new Date(subscription.current_period_end * 1000);
      }
    }

    if (!['active', 'trialing'].includes(subscriptionStatus)) {
      return res.redirect('/kirjaudu?checkout_error=1');
    }

    const customerId =
      typeof session.customer === 'string' ? session.customer : session.customer?.id || null;
    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id || null;

    const updated = await q(
      `UPDATE users
          SET stripe_customer_id=$1,
              stripe_subscription_id=$2,
              status='active',
              subscription_status=$3,
              current_period_end=$4,
              updated_at=NOW()
        WHERE id=$5
        RETURNING id,email,status,subscription_status`,
      [customerId, subscriptionId, subscriptionStatus, periodEnd, userId],
    );

    if (!updated.rowCount) return res.redirect('/kirjaudu?checkout_error=1');

    try {
      await ensureReferralCode(userId);
      if (subscriptionId) await applyReferralDiscountIfEligible(userId, subscriptionId);
    } catch (e) {
      console.error('Referral activation after checkout failed', e);
    }

    if (session.metadata?.plan === 'owner_test') {
      try {
        await closeOwnerTestPlan(subscriptionId);
      } catch (e) {
        console.error('Owner test plan close after checkout failed', e);
      }
    }

    await stripe.checkout.sessions.update(sessionId, {
      metadata: {
        ...session.metadata,
        auto_login_used: '1',
      },
    });

    setSession(res, updated.rows[0]);
    return res.redirect('/app?welcome=1');
  } catch (e) {
    console.error('Checkout success auto-login failed', e);
    return res.redirect('/kirjaudu?checkout_error=1');
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const email = cleanEmail(req.body.email);
    const r = await q('SELECT * FROM users WHERE lower(email)=lower($1)', [email]);
    if (!r.rowCount || !(await bcrypt.compare(req.body.password || '', r.rows[0].password_hash))) {
      return res.status(401).json({ error: 'Väärä sähköposti tai salasana.' });
    }
    if (r.rows[0].status === 'pending') {
      return res.status(403).json({ error: 'Viimeistele tilaus ensin.' });
    }
    setSession(res, r.rows[0]);
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie(COOKIE);
  res.json({ ok: true });
});

app.get('/api/auth/me', auth, async (req, res) => {
  try {
    const r = await q(
      'SELECT id,email,full_name,company_name,business_id,status,subscription_status,current_period_end FROM users WHERE id=$1',
      [req.user.sub],
    );
    if (!r.rowCount) return res.status(404).json({ error: 'Tiliä ei löytynyt.' });
    return res.json(r.rows[0]);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.get('/api/app/dashboard', auth, subscribed, async (req, res) => {
  try {
    const t = await q('SELECT * FROM tenants WHERE owner_user_id=$1', [req.user.sub]);
    if (!t.rowCount) return res.status(404).json({ error: 'Työtilaa ei löytynyt.' });
    const tenant = t.rows[0];
    const k = await q('SELECT * FROM knowledge WHERE tenant_id=$1 ORDER BY created_at DESC', [tenant.id]);
    const s = await q(
      `SELECT count(*)::int total,
              count(*) FILTER(WHERE handoff=false)::int answered,
              count(*) FILTER(WHERE handoff=true)::int handoffs,
              count(*) FILTER(WHERE created_at >= NOW() - INTERVAL '7 days')::int last7,
              count(*) FILTER(WHERE created_at >= NOW() - INTERVAL '30 days')::int last30
         FROM conversations WHERE tenant_id=$1`,
      [tenant.id],
    );
    const unanswered = await q(
      `SELECT id, question, answer, intent, confidence, created_at
         FROM conversations
        WHERE tenant_id=$1
          AND handoff=true
          AND COALESCE(intent,'') <> 'Resolved gap'
        ORDER BY created_at DESC
        LIMIT 30`,
      [tenant.id],
    );
    const recent = await q(
      `SELECT id, question, answer, intent, confidence, handoff, visitor_ref, source_ids, page_url, page_title, created_at
         FROM conversations
        WHERE tenant_id=$1
        ORDER BY created_at DESC
        LIMIT 30`,
      [tenant.id],
    );
    const daily = await q(
      `SELECT date_trunc('day', created_at)::date AS day, count(*)::int total
         FROM conversations
        WHERE tenant_id=$1 AND created_at >= NOW() - INTERVAL '13 days'
        GROUP BY 1 ORDER BY 1 ASC`,
      [tenant.id],
    );
    const gaps = await q(
      `SELECT question, count(*)::int asks, max(created_at) AS last_asked
         FROM conversations
        WHERE tenant_id=$1
          AND handoff=true
          AND created_at >= NOW() - INTERVAL '7 days'
          AND COALESCE(intent,'') <> 'Resolved gap'
        GROUP BY question
        ORDER BY asks DESC, last_asked DESC
        LIMIT 8`,
      [tenant.id],
    );
    const leads = await q(
      `SELECT id, visitor_ref, name, email, phone, message, status, created_at
         FROM leads
        WHERE tenant_id=$1
        ORDER BY created_at DESC
        LIMIT 30`,
      [tenant.id],
    );
    const actionStats = await q(
      `SELECT action_type, count(*)::int total
         FROM action_events
        WHERE tenant_id=$1 AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY action_type ORDER BY total DESC`,
      [tenant.id],
    );
    await ensureTenantActionKeys(tenant);
    const actionRequests = await q(
      `SELECT id,request_type,status,payload,result,delivery_status,source_channel,external_contact_id,created_at,updated_at
         FROM action_requests
        WHERE tenant_id=$1
        ORDER BY created_at DESC
        LIMIT 50`,
      [tenant.id],
    );
    const liveThreads = await q(
      `SELECT ct.id,ct.source_channel,ct.external_contact_id,ct.visitor_ref,ct.mode,ct.status,
              ct.last_activity_at,ct.created_at,
              COALESCE((
                SELECT json_agg(msg ORDER BY msg.created_at)
                FROM (
                  SELECT id,role,message,metadata,created_at
                    FROM chat_messages
                   WHERE thread_id=ct.id
                   ORDER BY created_at DESC
                   LIMIT 24
                ) msg
              ),'[]'::json) AS messages
         FROM chat_threads ct
        WHERE ct.tenant_id=$1
        ORDER BY ct.last_activity_at DESC
        LIMIT 30`,
      [tenant.id],
    );
    const bookingSlots = await q(
      `SELECT id,starts_at,ends_at,status
         FROM booking_slots
        WHERE tenant_id=$1 AND starts_at >= NOW()
        ORDER BY starts_at ASC
        LIMIT 80`,
      [tenant.id],
    );
    let stripeConnect = {
      connected:false,
      chargesEnabled:false,
      detailsSubmitted:false,
      payoutsEnabled:false,
    };
    if (stripe && tenant.stripe_connected_account_id) {
      try {
        const connected = await stripe.accounts.retrieve(tenant.stripe_connected_account_id);
        stripeConnect = {
          connected:true,
          chargesEnabled:Boolean(connected.charges_enabled),
          detailsSubmitted:Boolean(connected.details_submitted),
          payoutsEnabled:Boolean(connected.payouts_enabled),
        };
      } catch {}
    }
    const latestSelfTest = await q(
      `SELECT id, score, total_questions, answerable_questions, gaps, created_at
         FROM self_test_runs WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 1`,
      [tenant.id],
    );
    const truthStats = await q(
      `SELECT count(*)::int total,
              count(*) FILTER (WHERE approved=true)::int approved,
              count(*) FILTER (WHERE verified_at >= NOW() - INTERVAL '90 days')::int fresh,
              max(verified_at) AS last_verified
         FROM knowledge WHERE tenant_id=$1`,
      [tenant.id],
    );
    const referralCode = await ensureReferralCode(req.user.sub);
    let referral = null;
    if (referralCode) {
      const referralUses = await q(
        'SELECT count(*)::int uses FROM referral_redemptions WHERE referrer_user_id=$1 AND stripe_discount_applied=TRUE',
        [req.user.sub],
      );
      const uses = referralUses.rows[0]?.uses || 0;
      referral = {
        code: referralCode,
        uses,
        available: uses === 0,
        shareUrl: `${BASE}/tilaus?plan=monthly&ref=${encodeURIComponent(referralCode)}`,
        discountPercent: 20,
      };
    }

    const a = s.rows[0];
    const total = a.total || 0;
    const tenantSafe = { ...tenant };
    [
      'google_calendar_access_token','google_calendar_refresh_token',
      'shopify_access_token','woo_consumer_key','woo_consumer_secret',
      'meta_app_secret','whatsapp_access_token','instagram_access_token',
      'twilio_auth_token','action_webhook_secret','channels_api_key'
    ].forEach((key) => delete tenantSafe[key]);

    return res.json({
      tenant:tenantSafe,
      referral,
      knowledge: k.rows,
      unanswered: unanswered.rows,
      recentConversations: recent.rows,
      daily: daily.rows,
      gaps: gaps.rows,
      leads: leads.rows,
      actionStats: actionStats.rows,
      actionRequests: actionRequests.rows,
      liveThreads: liveThreads.rows,
      bookingSlots: bookingSlots.rows,
      stripeConnect,
      googleCalendar: {
        connected:Boolean(tenant.google_calendar_refresh_token || tenant.google_calendar_access_token),
        email:tenant.google_calendar_email || '',
        calendarId:tenant.google_calendar_id || 'primary',
      },
      quoteEngine: {
        serviceName: tenant.quote_service_name || '',
        basePrice: Number(tenant.quote_base_price || 0),
        unitPrice: Number(tenant.quote_unit_price || 0),
        minPrice: Number(tenant.quote_min_price || 0),
        vatPercent: Number(tenant.quote_vat_percent || 0),
        unitLabel: tenant.quote_unit_label || 'kpl',
      },
      integrations: {
        webhookUrl: tenant.action_webhook_url || '',
        webhookSecret: tenant.action_webhook_secret || '',
        channelsApiKey: tenant.channels_api_key || '',
      },
      commerce: {
        provider:tenant.ecommerce_provider || '',
        shopifyShopDomain:tenant.shopify_shop_domain || '',
        shopifyConnected:Boolean(tenant.shopify_access_token),
        wooBaseUrl:tenant.woo_base_url || '',
        wooConnected:Boolean(tenant.woo_consumer_key && tenant.woo_consumer_secret),
      },
      metaChannels: {
        graphVersion:tenant.meta_graph_version || 'v24.0',
        verifyToken:tenant.meta_verify_token || '',
        webhookUrl:BASE + '/api/meta/webhook/' + encodeURIComponent(tenant.slug),
        whatsappPhoneNumberId:tenant.whatsapp_phone_number_id || '',
        whatsappConnected:Boolean(tenant.meta_app_secret && tenant.whatsapp_access_token && tenant.whatsapp_phone_number_id),
        instagramAccountId:tenant.instagram_account_id || '',
        instagramConnected:Boolean(tenant.meta_app_secret && tenant.instagram_access_token && tenant.instagram_account_id),
        appSecretConfigured:Boolean(tenant.meta_app_secret),
      },
      voice: {
        accountSid:tenant.twilio_account_sid || '',
        phoneNumber:tenant.twilio_phone_number || '',
        handoffNumber:tenant.voice_handoff_number || '',
        credentialsConfigured:Boolean(tenant.twilio_account_sid && tenant.twilio_auth_token),
        enabled:Boolean(tenant.voice_enabled),
        webhookUrl:BASE + '/api/voice/' + encodeURIComponent(tenant.slug) + '/incoming',
      },
      latestSelfTest: latestSelfTest.rows[0] || null,
      truth: (() => {
        const row = truthStats.rows[0] || {};
        const truthTotal = Number(row.total || 0);
        const approved = Number(row.approved || 0);
        const fresh = Number(row.fresh || 0);
        return {
          total: truthTotal,
          approved,
          fresh,
          score: truthTotal ? Math.round(((approved + fresh) / (truthTotal * 2)) * 100) : 0,
          lastVerified: row.last_verified || null,
        };
      })(),
      stats: {
        conversations: total,
        answeredRate: total ? Math.round((a.answered * 100) / total) : 0,
        handoffRate: total ? Math.round((a.handoffs * 100) / total) : 0,
        last7: a.last7 || 0,
        last30: a.last30 || 0,
        leads: leads.rows.length,
        actions30: actionStats.rows.reduce((sum, x) => sum + Number(x.total || 0), 0),
        estimatedLeadValue: Number(tenant.average_lead_value || 0) * leads.rows.length,
      },
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.post('/api/app/business-profile', auth, subscribed, async (req, res) => {
  const client = await pool.connect();
  try {
    const t = await client.query('SELECT id FROM tenants WHERE owner_user_id=$1', [req.user.sub]);
    if (!t.rowCount) return res.status(404).json({ error: 'Työtilaa ei löytynyt.' });
    const tenantId = t.rows[0].id;
    const websiteRaw = String(req.body.website || '').trim();
    const quoteRaw = String(req.body.quoteRequestUrl || '').trim();
    const bookingRaw = String(req.body.bookingUrl || '').trim();
    const website = websiteRaw ? normalizeWebUrl(websiteRaw, true) : '';
    const quoteRequestUrl = quoteRaw ? normalizeWebUrl(quoteRaw, false) : '';
    const bookingUrl = bookingRaw ? normalizeWebUrl(bookingRaw, false) : '';
    if (websiteRaw && !website) {
      return res.status(400).json({ error: 'Tarkista verkkosivun osoite ja yritä uudelleen.' });
    }
    if (quoteRaw && !quoteRequestUrl) {
      return res.status(400).json({ error: 'Tarjouspyyntölomakkeen linkki ei ole kelvollinen.' });
    }
    if (bookingRaw && !bookingUrl) {
      return res.status(400).json({ error: 'Ajanvarauslinkki ei ole kelvollinen.' });
    }

    const fields = [
      ['Hinnat', req.body.pricing, ['hinta','hinnasto','maksaa','alv']],
      ['Aukioloajat', req.body.hours, ['auki','aukiolo','aukioloajat','milloin']],
      ['Puhelinnumero', req.body.phone, ['puhelin','numero','soittaa','yhteystiedot']],
      ['Sähköposti', req.body.email, ['sähköposti','email','yhteystiedot']],
      ['Palvelut', req.body.services, ['palvelu','palvelut','teette','tarjoatte']],
      ['Toimialue', req.body.serviceArea, ['toimialue','alue','missä','paikkakunta']],
      ['Osoite', req.body.address, ['osoite','sijainti','missä']],
      ['Verkkosivu', website, ['verkkosivu','www','nettisivu']],
      ['Tarjouspyyntölomake', quoteRequestUrl, ['tarjous','tarjouspyyntö','tarjouspyyntölomake','pyydä tarjous','lomake']],
      ['Ajanvarauslinkki', bookingUrl, ['ajanvaraus','varaa','aika','booking']],
      ['Lisätiedot', req.body.notes, ['lisätieto','muuta','huomio']],
      ['Vastaustyyli', req.body.tone, ['tyyli']]
    ];

    await client.query('BEGIN');
    await client.query(
      "DELETE FROM knowledge WHERE tenant_id=$1 AND category='Yrityksen perustiedot'",
      [tenantId]
    );

    for (const [title, value, keywords] of fields) {
      const answer = String(value || '').trim();
      if (!answer) continue;
      await client.query(
        `INSERT INTO knowledge(id,tenant_id,category,title,answer,keywords,source_type,source_url,approved,verified_at)
         VALUES($1,$2,$3,$4,$5,$6,'profile',$7,true,NOW())`,
        [uid(), tenantId, 'Yrityksen perustiedot', title, answer, keywords, website || null]
      );
    }

    await client.query(
      'UPDATE tenants SET contact_phone=$1, contact_email=$2, website=$3, greeting=$4, average_lead_value=$5, updated_at=NOW() WHERE id=$6',
      [
        String(req.body.phone || '').trim() || null,
        String(req.body.email || '').trim() || null,
        website || null,
        String(req.body.greeting || '').trim().slice(0, 220) || 'Hei! Miten voin auttaa?',
        Math.max(0, Number(req.body.averageLeadValue || 0)) || 0,
        tenantId
      ]
    );

    await client.query('COMMIT');
    return res.json({ ok: true });
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('Business profile save failed', e);
    return res.status(500).json({ error: 'Yrityksen tietojen tallennus ei onnistunut.' });
  } finally {
    client.release();
  }
});


app.post('/api/app/import-website', auth, subscribed, async (req, res) => {
  try {
    const website = normalizeWebUrl(req.body.website, false);
    if (!website) return res.status(400).json({ error: 'Lisää ensin verkkosivusi osoite.' });
    const bundle = await fetchWebsiteBundle(website, 4);
    const text = bundle.text;
    const finalUrl = bundle.finalUrl;
    if (text.length < 80) return res.status(400).json({ error: 'Verkkosivulta ei löytynyt tarpeeksi luettavaa sisältöä.' });
    if (!openai) return res.status(503).json({ error: 'Automaattinen tuonti ei ole juuri nyt käytettävissä.' });

    const prompt = `Poimi alla olevasta yrityksen verkkosivutekstistä VAIN selvästi sivulla kerrotut tiedot.
Älä päättele, täydennä tai keksi mitään. Palauta ainoastaan validi JSON-objekti ilman markdownia.
Avaimet:
pricing, hours, phone, email, services, serviceArea, address, quoteRequestUrl, bookingUrl, notes.
Kaikki arvot ovat merkkijonoja. Jos tietoa ei löydy varmasti, käytä tyhjää merkkijonoa.
services voi olla yksi pilkuilla eroteltu merkkijono.
quoteRequestUrl ja bookingUrl saavat olla sivutekstissä näkyviä URL-osoitteita TAI alla olevasta saman sivuston linkkilistasta löytyviä osoitteita.
Suosi täsmällistä ajanvaraus- tai tarjouspyyntölinkkiä etusivun sijaan.

SIVUSTON SISÄISET LINKIT:
${bundle.links.join('\n')}

VERKKOSIVU:
${text}`;

    const rr = await openai.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-5.6-luna',
      input: prompt,
      max_output_tokens: 700,
    });
    const raw = String(rr.output_text || '').trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Tuonnin vastausta ei voitu lukea.');
    const parsed = JSON.parse(match[0]);
    const allowed = ['pricing','hours','phone','email','services','serviceArea','address','quoteRequestUrl','bookingUrl','notes'];
    const profile = {};
    for (const key of allowed) profile[key] = String(parsed[key] || '').trim().slice(0, 4000);
    profile.website = normalizeWebUrl(finalUrl, true) || normalizeWebUrl(website, true);
    return res.json({ ok: true, profile });
  } catch (e) {
    console.error('Website import failed', e);
    return res.status(400).json({ error: e.message || 'Verkkosivun tietojen tuonti epäonnistui.' });
  }
});

app.post('/api/app/unanswered/:id/answer', auth, subscribed, async (req, res) => {
  const client = await pool.connect();
  try {
    const answer = String(req.body.answer || '').trim();
    if (!answer) return res.status(400).json({ error: 'Kirjoita vastaus ensin.' });

    const tenantResult = await client.query('SELECT id FROM tenants WHERE owner_user_id=$1', [req.user.sub]);
    if (!tenantResult.rowCount) return res.status(404).json({ error: 'Työtila puuttuu.' });
    const tenantId = tenantResult.rows[0].id;

    const conversation = await client.query(
      'SELECT id, question FROM conversations WHERE id=$1 AND tenant_id=$2 AND handoff=true',
      [req.params.id, tenantId],
    );
    if (!conversation.rowCount) return res.status(404).json({ error: 'Kysymystä ei löytynyt.' });

    const question = String(conversation.rows[0].question || '').trim();
    const keywords = question
      .toLowerCase()
      .split(/[^a-zA-ZåäöÅÄÖ0-9]+/)
      .map((x) => x.trim())
      .filter((x) => x.length > 2)
      .slice(0, 12);

    await client.query('BEGIN');
    const added = await client.query(
      `INSERT INTO knowledge(id,tenant_id,category,title,answer,keywords,source_type,approved,verified_at)
       VALUES($1,$2,$3,$4,$5,$6,'owner_answer',true,NOW()) RETURNING *`,
      [uid(), tenantId, 'Asiakaskysymykset', question, answer, keywords],
    );
    await client.query(
      "UPDATE conversations SET intent='Resolved gap' WHERE id=$1 AND tenant_id=$2",
      [req.params.id, tenantId],
    );
    await client.query('COMMIT');

    return res.json({ ok: true, knowledge: added.rows[0] });
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('Resolve unanswered failed', e);
    return res.status(500).json({ error: 'Vastauksen tallennus epäonnistui.' });
  } finally {
    client.release();
  }
});

app.post('/api/app/knowledge', auth, subscribed, async (req, res) => {
  try {
    const t = await q('SELECT id FROM tenants WHERE owner_user_id=$1', [req.user.sub]);
    if (!t.rowCount) return res.status(404).json({ error: 'Työtila puuttuu.' });
    const { category = 'Yleinen', title, answer, keywords = '' } = req.body;
    if (!title || !answer) return res.status(400).json({ error: 'Otsikko ja vastaus tarvitaan.' });
    const ks = Array.isArray(keywords)
      ? keywords
      : String(keywords)
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean);
    const r = await q(
      `INSERT INTO knowledge(id,tenant_id,category,title,answer,keywords,source_type,approved,verified_at)
       VALUES($1,$2,$3,$4,$5,$6,'manual',true,NOW()) RETURNING *`,
      [uid(), t.rows[0].id, category, title, answer, ks],
    );
    return res.json(r.rows[0]);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});


app.post('/api/app/unanswered/:id/suggest', auth, subscribed, async (req, res) => {
  try {
    if (!openai) return res.status(503).json({ error: 'AI-ehdotus ei ole juuri nyt käytettävissä.' });
    const tenantResult = await q('SELECT * FROM tenants WHERE owner_user_id=$1', [req.user.sub]);
    if (!tenantResult.rowCount) return res.status(404).json({ error: 'Työtila puuttuu.' });
    const tenant = tenantResult.rows[0];
    if (!tenant.website) return res.status(400).json({ error: 'Lisää ensin yrityksen verkkosivu Yrityksen tiedot -osiossa.' });

    const conversation = await q(
      'SELECT question FROM conversations WHERE id=$1 AND tenant_id=$2 AND handoff=true',
      [req.params.id, tenant.id],
    );
    if (!conversation.rowCount) return res.status(404).json({ error: 'Kysymystä ei löytynyt.' });

    const bundle = await fetchWebsiteBundle(tenant.website, 4);
    const pageText = bundle.text.slice(0, 36000);
    const question = String(conversation.rows[0].question || '').trim();
    const prompt = 'Etsi yrityksen verkkosivutekstistä vastaus asiakkaan kysymykseen. ' +
      'Käytä vain tekstissä selvästi kerrottuja faktoja. Älä päättele tai keksi. ' +
      'Palauta vain JSON muodossa {"found":true/false,"answer":"..."}. ' +
      'Jos varmaa vastausta ei ole, found=false ja answer tyhjä.\n\nKYSYMYS:\n' + question +
      '\n\nVERKKOSIVUN TEKSTI:\n' + pageText;

    const rr = await openai.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-5.6-luna',
      input: prompt,
      max_output_tokens: 350,
    });
    const raw = String(rr.output_text || '').trim();
    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = match ? JSON.parse(match[0]) : { found:false, answer:'' };
    const answer = String(parsed.answer || '').trim().slice(0, 1800);
    return res.json({
      found: Boolean(parsed.found && answer),
      answer: parsed.found ? answer : '',
      sourceUrl: tenant.website,
    });
  } catch (e) {
    console.error('Gap suggestion failed', e);
    return res.status(400).json({ error: e.message || 'Vastausta ei voitu ehdottaa.' });
  }
});

app.post('/api/app/self-test', auth, subscribed, async (req, res) => {
  try {
    if (!openai) return res.status(503).json({ error: 'Self-test ei ole juuri nyt käytettävissä.' });
    const tr = await q('SELECT * FROM tenants WHERE owner_user_id=$1', [req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error: 'Työtila puuttuu.' });
    const tenant = tr.rows[0];
    const kr = await q(
      'SELECT title,answer,category FROM knowledge WHERE tenant_id=$1 AND approved=true ORDER BY updated_at DESC LIMIT 80',
      [tenant.id],
    );
    if (!kr.rowCount) return res.status(400).json({ error: 'Lisää ensin yrityksen tietoja ja vastauksia.' });

    const sourceText = kr.rows
      .map((x, i) => '[' + (i + 1) + '] ' + x.title + ': ' + x.answer)
      .join('\n')
      .slice(0, 28000);

    const prompt = 'Toimit yrityksen asiakaspalvelubotin laadun testaajana. ' +
      'Luo 12 realistista ja erilaista asiakaskysymystä. Arvioi jokaiselle, pystyykö hyväksytty tietopohja vastaamaan varmasti. ' +
      'Älä oleta tietoa tietopohjan ulkopuolelta. Palauta vain JSON: ' +
      '{"questions":[{"question":"...","answerable":true,"reason":"lyhyt syy"}]}' +
      '\n\nYRITYS: ' + tenant.name +
      '\nTOIMIALA: ' + (tenant.industry || 'Palveluyritys') +
      '\n\nHYVÄKSYTTY TIETOPOHJA:\n' + sourceText;

    const rr = await openai.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-5.6-luna',
      input: prompt,
      max_output_tokens: 1400,
    });
    const raw = String(rr.output_text || '').trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Self-testin tulosta ei voitu lukea.');
    const parsed = JSON.parse(match[0]);
    const questions = (Array.isArray(parsed.questions) ? parsed.questions : [])
      .slice(0, 12)
      .map((x) => ({
        question: String(x.question || '').trim().slice(0, 500),
        answerable: Boolean(x.answerable),
        reason: String(x.reason || '').trim().slice(0, 500),
      }))
      .filter((x) => x.question);
    if (!questions.length) throw new Error('Self-test ei tuottanut testikysymyksiä.');

    const answerable = questions.filter((x) => x.answerable).length;
    const score = Math.round((answerable / questions.length) * 100);
    const gaps = questions.filter((x) => !x.answerable);
    const saved = await q(
      `INSERT INTO self_test_runs(id,tenant_id,score,total_questions,answerable_questions,gaps)
       VALUES($1,$2,$3,$4,$5,$6::jsonb)
       RETURNING id,score,total_questions,answerable_questions,gaps,created_at`,
      [uid(), tenant.id, score, questions.length, answerable, JSON.stringify(gaps)],
    );
    return res.json({ ...saved.rows[0], questions });
  } catch (e) {
    console.error('Self-test failed', e);
    return res.status(500).json({ error: e.message || 'Self-test epäonnistui.' });
  }
});



async function getGoogleCalendarAccessToken(tenant) {
  if (!tenant?.google_calendar_refresh_token && !tenant?.google_calendar_access_token) return '';

  const existing = decryptSecret(tenant.google_calendar_access_token);
  const expiresAt = tenant.google_calendar_token_expires_at
    ? new Date(tenant.google_calendar_token_expires_at).getTime()
    : 0;
  if (existing && expiresAt > Date.now() + 60000) return existing;

  const refreshToken = decryptSecret(tenant.google_calendar_refresh_token);
  if (!refreshToken) return existing;

  const cfg = oauthConfig('google');
  if (!cfg.configured) return '';

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method:'POST',
    headers:{ 'Content-Type':'application/x-www-form-urlencoded' },
    body:new URLSearchParams({
      client_id:cfg.clientId,
      client_secret:cfg.clientSecret,
      refresh_token:refreshToken,
      grant_type:'refresh_token',
    }),
  });
  if (!response.ok) throw new Error('Google Calendar token refresh failed');
  const token = await response.json();
  const accessToken = String(token.access_token || '');
  if (!accessToken) throw new Error('Google Calendar access token missing');
  const expires = new Date(Date.now() + Number(token.expires_in || 3600) * 1000);

  await q(
    `UPDATE tenants
        SET google_calendar_access_token=$1,
            google_calendar_token_expires_at=$2,
            updated_at=NOW()
      WHERE id=$3`,
    [encryptSecret(accessToken),expires,tenant.id],
  );
  tenant.google_calendar_access_token = encryptSecret(accessToken);
  tenant.google_calendar_token_expires_at = expires;
  return accessToken;
}

async function googleCalendarEvents(tenant, timeMin, timeMax) {
  if (!tenant?.google_calendar_refresh_token && !tenant?.google_calendar_access_token) return [];
  const token = await getGoogleCalendarAccessToken(tenant);
  if (!token) return [];
  const calendarId = tenant.google_calendar_id || 'primary';
  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/' + encodeURIComponent(calendarId) + '/events');
  url.search = new URLSearchParams({
    timeMin:new Date(timeMin).toISOString(),
    timeMax:new Date(timeMax).toISOString(),
    singleEvents:'true',
    orderBy:'startTime',
    maxResults:'250',
  }).toString();

  const response = await fetch(url, {
    headers:{ Authorization:'Bearer ' + token },
  });
  if (!response.ok) throw new Error('Google Calendar events fetch failed');
  const data = await response.json();
  return (Array.isArray(data.items) ? data.items : [])
    .filter((event) => event.status !== 'cancelled' && event.start?.dateTime && event.end?.dateTime)
    .map((event) => ({
      id:event.id,
      start:new Date(event.start.dateTime),
      end:new Date(event.end.dateTime),
    }))
    .filter((event) => Number.isFinite(event.start.getTime()) && Number.isFinite(event.end.getTime()));
}

async function googleCalendarHasConflict(tenant, start, end) {
  if (!tenant?.google_calendar_refresh_token && !tenant?.google_calendar_access_token) return false;
  const events = await googleCalendarEvents(tenant,start,end);
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  return events.some((event) => event.start.getTime() < b && event.end.getTime() > a);
}

async function createGoogleCalendarBooking(tenant, actionRequest) {
  if (!tenant?.google_calendar_refresh_token && !tenant?.google_calendar_access_token) {
    return { status:'not_configured' };
  }
  const booking = actionRequest?.payload?.booking;
  if (!booking?.startsAt || !booking?.endsAt) return { status:'skipped' };

  const token = await getGoogleCalendarAccessToken(tenant);
  if (!token) return { status:'failed' };
  const calendarId = tenant.google_calendar_id || 'primary';
  const fields = actionRequest.payload?.fields || {};
  const contact = actionContact(fields);
  const attendees = contact.email ? [{ email:contact.email }] : undefined;

  const eventBody = {
    summary:(tenant.name || 'RESPONDO') + ' · ' + (fields.name || 'Asiakas'),
    description:[
      'Varaus luotu RESPONDO AI:n kautta.',
      fields.note ? 'Lisätieto: ' + fields.note : '',
      contact.email ? 'Sähköposti: ' + contact.email : '',
      contact.phone ? 'Puhelin: ' + contact.phone : '',
      actionRequest.payload?.question ? 'Keskustelu: ' + actionRequest.payload.question : '',
    ].filter(Boolean).join('\n'),
    start:{ dateTime:new Date(booking.startsAt).toISOString() },
    end:{ dateTime:new Date(booking.endsAt).toISOString() },
    attendees,
    extendedProperties:{
      private:{
        respondo_action_request_id:actionRequest.id,
        respondo_tenant_id:tenant.id,
      },
    },
  };

  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/' + encodeURIComponent(calendarId) + '/events?sendUpdates=all',
    {
      method:'POST',
      headers:{
        Authorization:'Bearer ' + token,
        'Content-Type':'application/json',
      },
      body:JSON.stringify(eventBody),
    },
  );
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error('Google Calendar event create failed: ' + body.slice(0,200));
  }
  const event = await response.json();
  return {
    status:'synced',
    eventId:event.id || '',
    htmlLink:event.htmlLink || '',
  };
}


function safeEqualText(a,b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  return left.length === right.length && crypto.timingSafeEqual(left,right);
}

function xmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&apos;');
}

function normalizePhone(value) {
  return String(value || '').trim().replace(/[^+\d]/g,'').slice(0,32);
}

async function shopifyGraphql(tenant, query, variables = {}) {
  const shop = String(tenant.shopify_shop_domain || '').trim().toLowerCase()
    .replace(/^https?:\/\//,'')
    .replace(/\/$/,'');
  const token = decryptSecret(tenant.shopify_access_token);
  if (!shop || !token) throw new Error('Shopify-yhteyttä ei ole määritetty.');
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)) {
    throw new Error('Shopify-kaupan osoite ei ole kelvollinen.');
  }
  const response = await fetch('https://' + shop + '/admin/api/2026-07/graphql.json', {
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      'X-Shopify-Access-Token':token,
    },
    body:JSON.stringify({ query, variables }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.errors) {
    const message = data?.errors?.[0]?.message || 'Shopify API -kutsu epäonnistui.';
    throw new Error(message);
  }
  return data.data || {};
}

async function lookupShopifyOrder(tenant, orderNumber, email) {
  const number = String(orderNumber || '').trim().replace(/^#/,'').slice(0,120);
  const customerEmail = cleanEmail(email);
  const search = ['name:#' + number, customerEmail ? 'email:' + customerEmail : ''].filter(Boolean).join(' ');
  const data = await shopifyGraphql(tenant,`
    query RespondoOrderLookup($query:String!) {
      orders(first:10, query:$query, sortKey:CREATED_AT, reverse:true) {
        nodes {
          id
          name
          email
          processedAt
          displayFinancialStatus
          displayFulfillmentStatus
          currentTotalPriceSet { shopMoney { amount currencyCode } }
          fulfillments {
            status
            trackingInfo { company number url }
          }
        }
      }
    }`,{ query:search });
  const nodes = data?.orders?.nodes || [];
  const match = nodes.find((order) => {
    const sameNumber = String(order.name || '').replace(/^#/,'') === number;
    const sameEmail = cleanEmail(order.email) === customerEmail;
    return sameNumber && sameEmail;
  });
  if (!match) return null;
  const money = match.currentTotalPriceSet?.shopMoney || {};
  const tracking = (match.fulfillments || []).flatMap((x) => x.trackingInfo || []).filter(Boolean);
  return {
    provider:'shopify',
    orderNumber:match.name,
    financialStatus:match.displayFinancialStatus || '',
    fulfillmentStatus:match.displayFulfillmentStatus || '',
    processedAt:match.processedAt || null,
    amount:money.amount || '',
    currency:money.currencyCode || '',
    tracking:tracking.slice(0,5),
  };
}

async function wooApi(tenant, pathName, params = {}) {
  const rawBase = String(tenant.woo_base_url || '').trim();
  const key = decryptSecret(tenant.woo_consumer_key);
  const secret = decryptSecret(tenant.woo_consumer_secret);
  if (!rawBase || !key || !secret) throw new Error('WooCommerce-yhteyttä ei ole määritetty.');
  const base = await assertPublicHttpUrl(rawBase);
  if (base.protocol !== 'https:') throw new Error('WooCommerce-kaupan pitää käyttää HTTPS-yhteyttä.');
  const url = new URL('/wp-json/wc/v3/' + String(pathName || '').replace(/^\/+/,''),base.origin);
  Object.entries(params).forEach(([k,v]) => {
    if (v !== undefined && v !== null && String(v) !== '') url.searchParams.set(k,String(v));
  });
  const response = await fetch(url,{
    headers:{
      Authorization:'Basic ' + Buffer.from(key + ':' + secret).toString('base64'),
      'User-Agent':'RESPONDO-AI/2.0',
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || 'WooCommerce API -kutsu epäonnistui.');
  return data;
}

async function lookupWooOrder(tenant, orderNumber, email) {
  const number = String(orderNumber || '').trim().replace(/^#/,'').slice(0,120);
  const customerEmail = cleanEmail(email);
  const orders = await wooApi(tenant,'orders',{
    search:number,
    per_page:20,
    orderby:'date',
    order:'desc',
  });
  const match = (Array.isArray(orders) ? orders : []).find((order) => {
    const sameNumber = String(order.number || order.id || '') === number;
    const sameEmail = cleanEmail(order.billing?.email) === customerEmail;
    return sameNumber && sameEmail;
  });
  if (!match) return null;
  return {
    provider:'woocommerce',
    orderNumber:String(match.number || match.id || number),
    financialStatus:String(match.status || ''),
    fulfillmentStatus:String(match.status || ''),
    processedAt:match.date_created_gmt || match.date_created || null,
    amount:String(match.total || ''),
    currency:String(match.currency || ''),
    tracking:[],
  };
}

async function lookupEcommerceOrder(tenant, orderNumber, email) {
  const provider = String(tenant.ecommerce_provider || '').trim();
  if (provider === 'shopify') return lookupShopifyOrder(tenant,orderNumber,email);
  if (provider === 'woocommerce') return lookupWooOrder(tenant,orderNumber,email);
  return null;
}

function orderStatusText(order, lang = 'fi') {
  if (!order) {
    return lang === 'en'
      ? 'I could not find an order matching that order number and email.'
      : 'Tilausta ei löytynyt tällä tilausnumerolla ja sähköpostilla.';
  }
  const tracking = Array.isArray(order.tracking) && order.tracking.length
    ? order.tracking.map((x) => x.url || x.number).filter(Boolean).join(', ')
    : '';
  if (lang === 'en') {
    return [
      'Order ' + order.orderNumber + ' was found.',
      order.fulfillmentStatus ? 'Fulfillment: ' + order.fulfillmentStatus + '.' : '',
      order.financialStatus ? 'Payment: ' + order.financialStatus + '.' : '',
      tracking ? 'Tracking: ' + tracking : '',
    ].filter(Boolean).join(' ');
  }
  return [
    'Tilaus ' + order.orderNumber + ' löytyi.',
    order.fulfillmentStatus ? 'Toimitus: ' + order.fulfillmentStatus + '.' : '',
    order.financialStatus ? 'Maksu: ' + order.financialStatus + '.' : '',
    tracking ? 'Seuranta: ' + tracking : '',
  ].filter(Boolean).join(' ');
}

async function getOrCreateThread(tenantId, sourceChannel, externalContactId, visitorRef = null) {
  const channel = String(sourceChannel || 'website').slice(0,40);
  const contact = String(externalContactId || visitorRef || '').slice(0,220);
  if (!contact) return null;
  const existing = await q(
    `SELECT * FROM chat_threads
      WHERE tenant_id=$1 AND source_channel=$2 AND external_contact_id=$3
      LIMIT 1`,
    [tenantId,channel,contact],
  );
  if (existing.rowCount) return existing.rows[0];
  const created = await q(
    `INSERT INTO chat_threads(id,tenant_id,source_channel,external_contact_id,visitor_ref,mode,status,last_activity_at)
     VALUES($1,$2,$3,$4,$5,'ai','open',NOW())
     ON CONFLICT(tenant_id,source_channel,external_contact_id)
     DO UPDATE SET last_activity_at=NOW()
     RETURNING *`,
    [uid(),tenantId,channel,contact,visitorRef || contact],
  );
  return created.rows[0];
}

async function appendChatMessage({
  tenantId, threadId, sourceChannel, externalContactId, visitorRef,
  role, text, metadata = {},
}) {
  const row = await q(
    `INSERT INTO chat_messages(
       id,tenant_id,thread_id,source_channel,external_contact_id,visitor_ref,role,message,metadata
     ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
     RETURNING *`,
    [
      uid(),tenantId,threadId || null,String(sourceChannel || 'website').slice(0,40),
      String(externalContactId || visitorRef || '').slice(0,220) || null,
      String(visitorRef || '').slice(0,160) || null,
      String(role || 'user').slice(0,30),String(text || '').slice(0,4000),
      JSON.stringify(metadata || {}),
    ],
  );
  if (threadId) {
    await q('UPDATE chat_threads SET last_activity_at=NOW(),updated_at=NOW() WHERE id=$1',[threadId]);
  }
  return row.rows[0];
}

async function sendMetaMessage(tenant, channel, recipientId, text) {
  const version = String(tenant.meta_graph_version || 'v24.0').trim() || 'v24.0';
  const message = String(text || '').trim().slice(0,1800);
  if (!message) return { ok:false };

  if (channel === 'whatsapp') {
    const token = decryptSecret(tenant.whatsapp_access_token);
    const phoneId = String(tenant.whatsapp_phone_number_id || '').trim();
    if (!token || !phoneId) throw new Error('WhatsApp-yhteyttä ei ole määritetty.');
    const response = await fetch(
      'https://graph.facebook.com/' + encodeURIComponent(version) + '/' + encodeURIComponent(phoneId) + '/messages',
      {
        method:'POST',
        headers:{ Authorization:'Bearer ' + token,'Content-Type':'application/json' },
        body:JSON.stringify({
          messaging_product:'whatsapp',
          to:recipientId,
          type:'text',
          text:{ body:message },
        }),
      },
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error?.message || 'WhatsApp-viestin lähetys epäonnistui.');
    return { ok:true,data };
  }

  if (channel === 'instagram') {
    const token = decryptSecret(tenant.instagram_access_token);
    const igId = String(tenant.instagram_account_id || '').trim();
    if (!token || !igId) throw new Error('Instagram-yhteyttä ei ole määritetty.');
    const response = await fetch(
      'https://graph.instagram.com/' + encodeURIComponent(version) + '/' + encodeURIComponent(igId) + '/messages',
      {
        method:'POST',
        headers:{ Authorization:'Bearer ' + token,'Content-Type':'application/json' },
        body:JSON.stringify({
          recipient:{ id:recipientId },
          message:{ text:message },
        }),
      },
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error?.message || 'Instagram-viestin lähetys epäonnistui.');
    return { ok:true,data };
  }

  return { ok:false };
}

async function processExternalChannelMessage(tenant, channel, contactId, message, lang = 'fi') {
  const thread = await getOrCreateThread(tenant.id,channel,contactId,contactId);
  await appendChatMessage({
    tenantId:tenant.id,threadId:thread?.id,sourceChannel:channel,
    externalContactId:contactId,visitorRef:contactId,role:'user',text:message,
  });

  if (thread?.mode === 'human') {
    return { humanTakeover:true,answer:'' };
  }

  const kr = await q(
    'SELECT * FROM knowledge WHERE tenant_id=$1 AND approved=true ORDER BY updated_at DESC,created_at DESC',
    [tenant.id],
  );
  const hr = await q(
    `SELECT role,message
       FROM chat_messages
      WHERE tenant_id=$1 AND thread_id=$2
      ORDER BY created_at DESC LIMIT 12`,
    [tenant.id,thread?.id],
  );
  const historyRows = hr.rows.reverse();
  const history = [];
  for (let i=0;i<historyRows.length;i+=2) {
    const user = historyRows[i];
    const assistant = historyRows[i+1];
    if (user?.role === 'user') {
      history.push({ question:user.message,answer:assistant?.message || '',handoff:false });
    }
  }

  const result = await generateGroundedAnswer({
    companyName:tenant.name,rows:kr.rows,message,history,lang,pageContext:{},
  });
  let answer = result.answer;
  if (result.handoff) {
    answer = lang === 'en'
      ? 'I do not have a verified answer yet. A person from the company needs to handle this.'
      : 'Tähän ei löytynyt vielä varmennettua vastausta. Yrityksen henkilön pitää käsitellä tämä.';
  }

  await appendChatMessage({
    tenantId:tenant.id,threadId:thread?.id,sourceChannel:channel,
    externalContactId:contactId,visitorRef:contactId,role:'assistant',text:answer,
    metadata:{ handoff:result.handoff,intent:result.intent,sourceIds:result.sourceIds },
  });
  await q(
    `INSERT INTO conversations(id,tenant_id,question,answer,intent,confidence,source_ids,handoff,visitor_ref,source_channel,external_contact_id)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [uid(),tenant.id,message,answer,result.intent,result.confidence,result.sourceIds,result.handoff,contactId,channel,contactId],
  );
  return {
    answer,handoff:result.handoff,
    verified:!result.handoff && Array.isArray(result.sourceIds) && result.sourceIds.length>0,
    intent:result.intent,actions:chatActions(kr.rows,message,result.handoff,lang),
  };
}

function twilioSignatureValid(req, tenant, pathSuffix = '') {
  const authToken = decryptSecret(tenant.twilio_auth_token);
  if (!authToken) return false;
  const provided = String(req.headers['x-twilio-signature'] || '');
  if (!provided) return false;
  const url = BASE + pathSuffix;
  const params = req.body && typeof req.body === 'object' ? req.body : {};
  const data = url + Object.keys(params).sort().map((key) => key + String(params[key] ?? '')).join('');
  const expected = crypto.createHmac('sha1',authToken).update(data).digest('base64');
  return safeEqualText(expected,provided);
}

async function twilioApi(tenant, method, pathName, body = null) {
  const sid = String(tenant.twilio_account_sid || '').trim();
  const token = decryptSecret(tenant.twilio_auth_token);
  if (!sid || !token) throw new Error('Twilio-yhteyttä ei ole määritetty.');
  const response = await fetch('https://api.twilio.com/2010-04-01' + pathName,{
    method,
    headers:{
      Authorization:'Basic ' + Buffer.from(sid + ':' + token).toString('base64'),
      ...(body ? {'Content-Type':'application/x-www-form-urlencoded'} : {}),
    },
    body:body ? new URLSearchParams(body).toString() : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || 'Twilio API -kutsu epäonnistui.');
  return data;
}

function cleanActionFields(type, input = {}) {
  const src = input && typeof input === 'object' ? input : {};
  const take = (key, max = 600) => String(src[key] || '').trim().slice(0, max);
  if (type === 'quote') {
    return {
      name: take('name',120),
      contact: take('contact',220),
      details: take('details',1800),
      budget: take('budget',120),
    };
  }
  if (type === 'booking') {
    return {
      name: take('name',120),
      contact: take('contact',220),
      date: take('date',40),
      time: take('time',40),
      note: take('note',1000),
    };
  }
  if (type === 'order_status') {
    return {
      orderNumber: take('orderNumber',120),
      email: cleanEmail(src.email).slice(0,220),
    };
  }
  return {
    name: take('name',120),
    contact: take('contact',220),
    note: take('note',1000),
  };
}

function actionContact(fields = {}) {
  const contact = String(fields.contact || '').trim();
  return {
    email: contact.includes('@') ? cleanEmail(contact).slice(0,220) : cleanEmail(fields.email).slice(0,220),
    phone: contact && !contact.includes('@') ? contact.slice(0,80) : '',
  };
}

async function ensureTenantActionKeys(tenant) {
  if (!tenant) return tenant;
  const updates = [];
  const values = [];
  let n = 1;
  if (!tenant.action_webhook_secret) {
    tenant.action_webhook_secret = crypto.randomBytes(24).toString('hex');
    updates.push('action_webhook_secret=$' + n++);
    values.push(tenant.action_webhook_secret);
  }
  if (!tenant.channels_api_key) {
    tenant.channels_api_key = 'rsp_ch_' + crypto.randomBytes(24).toString('hex');
    updates.push('channels_api_key=
    values.push(tenant.id);
    await q('UPDATE tenants SET ' + updates.join(',') + ',updated_at=NOW() WHERE id=$' + n, values);
  }
  return tenant;
}

async function dispatchActionWebhook(tenant, actionRequest) {
  if (!tenant?.action_webhook_url) return { status:'not_configured', result:null };
  const url = await assertPublicHttpUrl(tenant.action_webhook_url);
  const payload = JSON.stringify({
    event: 'respondo.action.created',
    tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name },
    action: actionRequest,
  });
  const signature = crypto
    .createHmac('sha256', tenant.action_webhook_secret || '')
    .update(payload)
    .digest('hex');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {
      method:'POST',
      redirect:'manual',
      signal:controller.signal,
      headers:{
        'content-type':'application/json',
        'user-agent':'RESPONDO-Actions/2.0',
        'x-respondo-signature':'sha256=' + signature,
      },
      body:payload,
    });
    const raw = (await response.text()).slice(0,12000);
    let parsed = null;
    try { parsed = raw ? JSON.parse(raw) : null; } catch { parsed = raw ? { message:raw.slice(0,1000) } : null; }
    return { status: response.ok ? 'delivered' : 'failed', result: parsed, httpStatus:response.status };
  } finally {
    clearTimeout(timer);
  }
}

async function validateWidgetActionRequest(req, tenant, body) {
  const origin = requestOrigin(req);
  const baseHost = normalizeHost(BASE);
  const external = Boolean(origin && normalizeHost(origin.hostname) !== baseHost);
  if (!external) return true;
  if (!widgetOriginAllowed(req, tenant)) return false;
  try {
    const token = jwt.verify(String(body.widgetToken || ''), JWT);
    return token.kind === 'widget' && token.slug === tenant.slug && token.host === normalizeHost(origin.hostname);
  } catch {
    return false;
  }
}

async function publicTenant(slugValue) {
  return q(
    `SELECT t.*
       FROM tenants t
       JOIN users u ON u.id=t.owner_user_id
      WHERE t.slug=$1
        AND t.active=true
        AND u.status='active'
        AND u.subscription_status IN ('active','trialing')`,
    [slugValue],
  );
}


app.get('/api/public/:slug/widget-token', async (req, res) => {
  try {
    const tr = await publicTenant(req.params.slug);
    if (!tr.rowCount) return res.status(404).json({ error: 'Yritystä ei löytynyt.' });
    const tenant = tr.rows[0];

    if (!tenant.website) {
      return res.status(403).json({ error: 'Widgetille ei ole vielä määritetty verkkosivua.' });
    }
    if (!widgetOriginAllowed(req, tenant)) {
      return res.status(403).json({ error: 'Tämä RESPONDO AI -lisenssi on sidottu toiseen verkkosivuun.' });
    }

    setWidgetCors(req, res);
    const origin = requestOrigin(req);
    const token = jwt.sign(
      {
        kind: 'widget',
        slug: tenant.slug,
        host: normalizeHost(origin.hostname),
      },
      JWT,
      { expiresIn: '12h' }
    );
    const lang = req.query.lang === 'en' ? 'en' : 'fi';
    const kr = await q('SELECT title, answer FROM knowledge WHERE tenant_id=$1 AND approved=true', [tenant.id]);
    const available = new Set(kr.rows.map((x) => normalizeSearchText(x.title)));
    const quickReplies = [
      available.has('hinnat') && (lang === 'en' ? 'Pricing' : 'Hinnat'),
      available.has('aukioloajat') && (lang === 'en' ? 'Opening hours' : 'Aukioloajat'),
      available.has('palvelut') && (lang === 'en' ? 'Services' : 'Palvelut'),
      available.has('tarjouspyyntolomake') && (lang === 'en' ? 'Request a quote' : 'Pyydä tarjous'),
    ].filter(Boolean).slice(0, 3);

    return res.json({
      token,
      name: tenant.name,
      greeting: lang === 'en' ? 'Hi! How can I help?' : tenant.greeting,
      accent: tenant.accent,
      quickReplies,
    });
  } catch (e) {
    console.error('Widget token failed', e);
    return res.status(500).json({ error: 'Chatin käynnistäminen ei onnistunut.' });
  }
});


app.get('/api/public/:slug', async (req, res) => {
  try {
    const r = await publicTenant(req.params.slug);
    if (!r.rowCount) return res.status(404).json({ error: 'Yritystä ei löytynyt.' });
    const t = r.rows[0];
    return res.json({
      slug: t.slug,
      name: t.name,
      greeting: t.greeting,
      handoff_message: t.handoff_message,
      accent: t.accent,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.post('/api/public/demo-chat', demoChatLimiter, async (req, res) => {
  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    body = body || {};
    const lang = body.lang === 'en' ? 'en' : 'fi';
    const message = String(body.message || '').trim().slice(0, 1200);
    if (!message) return res.status(400).json({ error: lang === 'en' ? 'Type a question.' : 'Kirjoita kysymys.' });
    const profile = body.profile && typeof body.profile === 'object' ? body.profile : {};
    const rows = buildProfileKnowledge(profile).slice(0, 60);
    const history = Array.isArray(body.history) ? body.history.slice(-6) : [];
    const result = await generateGroundedAnswer({
      companyName: String(profile.companyName || 'yrityksen').slice(0, 120),
      rows,
      message,
      history,
      lang,
    });
    const handoffAnswer = lang === 'en'
      ? 'I cannot find a reliable answer to this from the provided company information. Add the answer to the knowledge base and the bot will know it next time.'
      : 'Tätä tietoa ei löytynyt yrityksen tiedoista. Lisää oikea vastaus kerran, niin Respondo osaa vastata siihen jatkossa.';
    return res.json({
      answer: result.handoff ? handoffAnswer : result.answer,
      handoff: result.handoff,
      confidence: result.confidence,
      intent: result.intent,
      actions: chatActions(rows, message, result.handoff, lang),
    });
  } catch (e) {
    console.error('Demo chat failed', e);
    return res.status(500).json({ error: 'Vastausta ei saatu juuri nyt. Yritä hetken päästä uudelleen.' });
  }
});

app.post('/api/public/:slug/lead', publicChatLimiter, async (req, res) => {
  try {
    const tr = await publicTenant(req.params.slug);
    if (!tr.rowCount) return res.status(404).json({ error: 'Yritystä ei löytynyt.' });
    const tenant = tr.rows[0];
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    body = body || {};
    const lang = body.lang === 'en' ? 'en' : 'fi';

    const origin = requestOrigin(req);
    const baseHost = normalizeHost(BASE);
    const external = Boolean(origin && normalizeHost(origin.hostname) !== baseHost);
    if (external) {
      if (!widgetOriginAllowed(req, tenant)) return res.status(403).json({ error: 'Chat ei ole käytössä tällä verkkosivulla.' });
      try {
        const token = jwt.verify(String(body.widgetToken || ''), JWT);
        if (token.kind !== 'widget' || token.slug !== tenant.slug || token.host !== normalizeHost(origin.hostname)) throw new Error('Invalid token');
      } catch {
        return res.status(403).json({ error: 'Chat ei ole käytössä tällä verkkosivulla.' });
      }
      setWidgetCors(req, res);
    }

    const name = String(body.name || '').trim().slice(0, 120);
    const email = cleanEmail(body.email).slice(0, 220);
    const phone = String(body.phone || '').trim().slice(0, 80);
    const message = String(body.message || '').trim().slice(0, 1200);
    if (!email && !phone) return res.status(400).json({ error: 'Anna sähköposti tai puhelinnumero.' });

    await q(
      'INSERT INTO leads(id,tenant_id,visitor_ref,name,email,phone,message) VALUES($1,$2,$3,$4,$5,$6,$7)',
      [uid(), tenant.id, String(body.visitorRef || '').slice(0, 160) || null, name || null, email || null, phone || null, message || null],
    );
    return res.json({ ok: true });
  } catch (e) {
    console.error('Lead capture failed', e);
    return res.status(500).json({ error: 'Yhteystietojen lähetys epäonnistui.' });
  }
});


app.get('/api/public/:slug/live', publicChatLimiter, async (req,res) => {
  try {
    const tr = await publicTenant(req.params.slug);
    if (!tr.rowCount) return res.status(404).json({ error:'Yritystä ei löytynyt.' });
    const tenant = tr.rows[0];
    const origin = requestOrigin(req);
    const baseHost = normalizeHost(BASE);
    const external = Boolean(origin && normalizeHost(origin.hostname) !== baseHost);
    if (external) {
      if (!widgetOriginAllowed(req,tenant)) return res.status(403).json({ error:'Chat ei ole käytössä tällä verkkosivulla.' });
      try {
        const token = jwt.verify(String(req.query.widgetToken || ''),JWT);
        if (token.kind !== 'widget' || token.slug !== tenant.slug || token.host !== normalizeHost(origin.hostname)) throw new Error('Invalid token');
      } catch {
        return res.status(403).json({ error:'Chat ei ole käytössä tällä verkkosivulla.' });
      }
      setWidgetCors(req,res);
    }

    const visitorRef = String(req.query.visitorRef || '').trim().slice(0,160);
    const after = String(req.query.after || '').trim();
    if (!visitorRef) return res.json({ mode:'ai',messages:[] });

    const threadResult = await q(
      `SELECT * FROM chat_threads
        WHERE tenant_id=$1 AND source_channel='website' AND external_contact_id=$2
        LIMIT 1`,
      [tenant.id,visitorRef],
    );
    if (!threadResult.rowCount) return res.json({ mode:'ai',messages:[] });
    const thread = threadResult.rows[0];

    const params=[tenant.id,thread.id];
    let whereAfter='';
    if (after && !Number.isNaN(new Date(after).getTime())) {
      params.push(new Date(after).toISOString());
      whereAfter=' AND created_at > $3';
    }
    const messages = await q(
      `SELECT id,role,message,created_at
         FROM chat_messages
        WHERE tenant_id=$1 AND thread_id=$2
          AND role='human'${whereAfter}
        ORDER BY created_at ASC
        LIMIT 50`,
      params,
    );
    return res.json({ mode:thread.mode,messages:messages.rows });
  } catch (e) {
    console.error('Live poll failed',e);
    return res.status(500).json({ error:'Live-keskustelua ei saatu.' });
  }
});

app.post('/api/public/:slug/chat', publicChatLimiter, async (req, res) => {
  try {
    const tr = await publicTenant(req.params.slug);
    if (!tr.rowCount) return res.status(404).json({ error: 'Yritystä ei löytynyt.' });
    const t = tr.rows[0];
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    body = body || {};
    const lang = body.lang === 'en' ? 'en' : 'fi';

    const origin = requestOrigin(req);
    const baseHost = normalizeHost(BASE);
    const externalWidgetRequest = Boolean(origin && normalizeHost(origin.hostname) !== baseHost);

    if (externalWidgetRequest) {
      if (!widgetOriginAllowed(req, t)) {
        return res.status(403).json({ error: 'Tämä RESPONDO AI -lisenssi on sidottu toiseen verkkosivuun.' });
      }
      try {
        const token = jwt.verify(String(body.widgetToken || ''), JWT);
        if (
          token.kind !== 'widget' ||
          token.slug !== t.slug ||
          token.host !== normalizeHost(origin.hostname)
        ) {
          throw new Error('Invalid widget token');
        }
      } catch {
        return res.status(403).json({ error: 'Chat ei ole käytössä tällä verkkosivulla.' });
      }
      setWidgetCors(req, res);
    }

    const message = String(body.message || '').trim().slice(0, 1200);
    if (!message) return res.status(400).json({ error: lang === 'en' ? 'Type a question.' : 'Kirjoita kysymys.' });
    const visitorRef = String(body.visitorRef || '').trim().slice(0, 160);
    const thread = visitorRef ? await getOrCreateThread(t.id,'website',visitorRef,visitorRef) : null;
    if (thread) {
      await appendChatMessage({
        tenantId:t.id,threadId:thread.id,sourceChannel:'website',
        externalContactId:visitorRef,visitorRef,role:'user',text:message,
        metadata:{ pageContext:body.pageContext || {} },
      });
      if (thread.mode === 'human') {
        const humanMessage = lang === 'en'
          ? 'Your message was sent to a person from the company.'
          : 'Viestisi lähetettiin yrityksen asiakaspalvelijalle.';
        await q(
          `INSERT INTO conversations(id,tenant_id,question,answer,intent,confidence,source_ids,handoff,visitor_ref,page_url,page_title,source_channel,external_contact_id)
           VALUES($1,$2,$3,$4,'Live takeover',1,'{}',true,$5,$6,$7,'website',$8)`,
          [
            uid(),t.id,message,humanMessage,visitorRef || null,
            String(body.pageContext?.url || '').slice(0,1000) || null,
            String(body.pageContext?.title || '').slice(0,300) || null,
            visitorRef || null,
          ],
        );
        return res.json({
          answer:humanMessage,handoff:true,humanTakeover:true,verified:false,
          actions:[],canLeaveContact:false,
        });
      }
    }

    const kr = await q('SELECT * FROM knowledge WHERE tenant_id=$1 AND approved=true ORDER BY updated_at DESC, created_at DESC', [t.id]);
    let history = [];
    if (visitorRef) {
      const hr = await q(
        `SELECT question, answer, handoff
           FROM conversations
          WHERE tenant_id=$1 AND visitor_ref=$2
          ORDER BY created_at DESC
          LIMIT 6`,
        [t.id, visitorRef],
      );
      history = hr.rows.reverse();
    }

    const result = await generateGroundedAnswer({
      companyName: t.name,
      rows: kr.rows,
      message,
      history,
      lang,
      pageContext: body.pageContext && typeof body.pageContext === 'object' ? body.pageContext : {},
    });

    let answer = result.answer;
    if (result.handoff) {
      const hasContact = knowledgeValue(kr.rows, 'Puhelinnumero') || knowledgeValue(kr.rows, 'Sähköposti') || knowledgeValue(kr.rows, 'Tarjouspyyntölomake');
      answer = lang === 'en'
        ? (hasContact
          ? 'I cannot find a reliable answer to this in the company information. You can leave your contact details and the company can get back to you.'
          : 'I cannot find a reliable answer to this yet. The company can add this information later.')
        : (hasContact
          ? 'Tätä tietoa ei löytynyt yrityksen tiedoista. Voit jättää yhteystietosi, niin joku yrityksestä voi ottaa sinuun yhteyttä.'
          : (t.handoff_message || 'Tätä tietoa ei löytynyt vielä. Yritys voi lisätä oikean vastauksen myöhemmin.'));
    }

    const actions = chatActions(kr.rows, message, result.handoff, lang);
    if (thread) {
      await appendChatMessage({
        tenantId:t.id,threadId:thread.id,sourceChannel:'website',
        externalContactId:visitorRef,visitorRef,role:'assistant',text:answer,
        metadata:{ handoff:result.handoff,intent:result.intent,verified:!result.handoff },
      });
    }
    await q(
      `INSERT INTO conversations(id,tenant_id,question,answer,intent,confidence,source_ids,handoff,visitor_ref,page_url,page_title,source_channel,external_contact_id)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'website',$12)`,
      [
        uid(), t.id, message, answer, result.intent, result.confidence, result.sourceIds, result.handoff,
        visitorRef || null,
        String(body.pageContext?.url || '').slice(0, 1000) || null,
        String(body.pageContext?.title || '').slice(0, 300) || null,
        visitorRef || null,
      ],
    );

    return res.json({
      answer,
      handoff: result.handoff,
      confidence: result.confidence,
      intent: result.intent,
      sourceIds: result.sourceIds,
      verified: !result.handoff && Array.isArray(result.sourceIds) && result.sourceIds.length > 0,
      actions,
      canLeaveContact: result.handoff,
    });
  } catch (e) {
    console.error('Chat failed', e);
    return res.status(500).json({ error: 'Vastausta ei saatu juuri nyt.' });
  }
});




app.get('/api/public/:slug/booking-slots', publicChatLimiter, async (req,res) => {
  try {
    const tr = await publicTenant(req.params.slug);
    if (!tr.rowCount) return res.status(404).json({ error:'Yritystä ei löytynyt.' });
    const tenant = tr.rows[0];

    const origin = requestOrigin(req);
    const baseHost = normalizeHost(BASE);
    const external = Boolean(origin && normalizeHost(origin.hostname) !== baseHost);
    if (external) {
      if (!widgetOriginAllowed(req,tenant)) return res.status(403).json({ error:'Chat ei ole käytössä tällä verkkosivulla.' });
      try {
        const token = jwt.verify(String(req.query.widgetToken || ''),JWT);
        if (token.kind !== 'widget' || token.slug !== tenant.slug || token.host !== normalizeHost(origin.hostname)) throw new Error('Invalid token');
      } catch {
        return res.status(403).json({ error:'Chat ei ole käytössä tällä verkkosivulla.' });
      }
      setWidgetCors(req,res);
    }

    const rows = await q(
      `SELECT id,starts_at,ends_at
         FROM booking_slots
        WHERE tenant_id=$1 AND status='open' AND starts_at >= NOW()
        ORDER BY starts_at ASC
        LIMIT 40`,
      [tenant.id],
    );

    let slots = rows.rows;
    if (slots.length && (tenant.google_calendar_refresh_token || tenant.google_calendar_access_token)) {
      try {
        const events = await googleCalendarEvents(
          tenant,
          slots[0].starts_at,
          slots[slots.length - 1].ends_at,
        );
        slots = slots.filter((slot) => {
          const start = new Date(slot.starts_at).getTime();
          const end = new Date(slot.ends_at).getTime();
          return !events.some((event) => event.start.getTime() < end && event.end.getTime() > start);
        });
      } catch (e) {
        console.error('Google Calendar availability filter failed',e);
      }
    }

    return res.json({ slots });
  } catch {
    return res.status(500).json({ error:'Vapaita aikoja ei saatu.' });
  }
});

app.get('/api/public/payment/verify', async (req,res) => {
  try {
    if (!stripe) return res.status(503).json({ error:'Stripe ei ole käytettävissä.' });
    const actionId = String(req.query.action || '').trim();
    const sessionId = String(req.query.session_id || '').trim();
    if (!actionId || !sessionId) return res.status(400).json({ error:'Maksutiedot puuttuvat.' });

    const rr = await q(
      `SELECT ar.id,ar.tenant_id,ar.request_type,ar.result,t.name,t.stripe_connected_account_id
         FROM action_requests ar
         JOIN tenants t ON t.id=ar.tenant_id
        WHERE ar.id=$1`,
      [actionId],
    );
    if (!rr.rowCount || rr.rows[0].request_type !== 'quote') return res.status(404).json({ error:'Tarjousta ei löytynyt.' });
    const row = rr.rows[0];
    if (!row.stripe_connected_account_id) return res.status(400).json({ error:'Maksutiliä ei löytynyt.' });

    const session = await stripe.checkout.sessions.retrieve(
      sessionId,
      {},
      { stripeAccount:row.stripe_connected_account_id },
    );
    if (session.client_reference_id !== actionId) return res.status(400).json({ error:'Maksu ei vastaa tarjousta.' });

    const paid = session.payment_status === 'paid';
    if (paid) {
      await q(
        `UPDATE action_requests
            SET status='done',
                result=COALESCE(result,'{}'::jsonb) || $1::jsonb,
                updated_at=NOW()
          WHERE id=$2`,
        [JSON.stringify({ paid:true,paidAt:new Date().toISOString(),checkoutSessionId:session.id }),actionId],
      );
    }
    return res.json({
      paid,
      companyName:row.name,
      amountTotal:Number(session.amount_total || 0),
      currency:String(session.currency || 'eur').toUpperCase(),
    });
  } catch (e) {
    console.error('Payment verification failed',e);
    return res.status(400).json({ error:'Maksua ei voitu vahvistaa.' });
  }
});

app.post('/api/public/:slug/action-request', publicChatLimiter, async (req, res) => {
  try {
    const tr = await publicTenant(req.params.slug);
    if (!tr.rowCount) return res.status(404).json({ error:'Yritystä ei löytynyt.' });
    const tenant = await ensureTenantActionKeys(tr.rows[0]);

    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    body = body || {};
    if (!(await validateWidgetActionRequest(req, tenant, body))) {
      return res.status(403).json({ error:'Chat ei ole käytössä tällä verkkosivulla.' });
    }
    setWidgetCors(req,res);

    const type = String(body.type || '').trim();
    if (!['quote','booking','order_status','callback'].includes(type)) {
      return res.status(400).json({ error:'Tuntematon toiminto.' });
    }

    const fields = cleanActionFields(type, body.fields);
    if (type === 'booking') {
      fields.slotId = String(body.fields?.slotId || '').trim().slice(0,80);
    }
    if (type === 'quote') {
      fields.quantity = Math.max(0, Number(body.fields?.quantity || 0));
    }
    if (type === 'quote' && !fields.contact) return res.status(400).json({ error:'Anna sähköposti tai puhelinnumero.' });
    if (type === 'booking' && (!fields.contact || !fields.slotId)) return res.status(400).json({ error:'Valitse vapaa aika ja anna yhteystieto.' });
    if (type === 'order_status' && (!fields.orderNumber || !fields.email)) return res.status(400).json({ error:'Anna tilausnumero ja tilauksessa käytetty sähköposti.' });

    const id = uid();
    const visitorRef = String(body.visitorRef || '').slice(0,160) || null;
    const sourceChannel = String(body.sourceChannel || 'website').trim().slice(0,40) || 'website';
    const externalContactId = String(body.externalContactId || '').trim().slice(0,220) || null;
    const pageUrl = String(body.pageContext?.url || '').slice(0,1000) || null;
    const payload = {
      fields,
      question: String(body.question || '').trim().slice(0,1200),
      pageUrl,
      pageTitle: String(body.pageContext?.title || '').slice(0,300) || null,
    };
    let computedQuote = null;
    let bookedSlot = null;
    let ecommerceOrder = null;
    let ecommerceLookupAttempted = false;

    if (type === 'order_status' && tenant.ecommerce_provider) {
      ecommerceLookupAttempted = true;
      try {
        ecommerceOrder = await lookupEcommerceOrder(tenant,fields.orderNumber,fields.email);
      } catch (e) {
        console.error('Native ecommerce lookup failed',e);
        return res.status(502).json({ error:'Tilaustietoja ei saatu verkkokaupasta juuri nyt. Yritä hetken päästä uudelleen.' });
      }
    }

    if (type === 'quote') {
      const base = Number(tenant.quote_base_price || 0);
      const perUnit = Number(tenant.quote_unit_price || 0);
      const minimum = Number(tenant.quote_min_price || 0);
      const vatPercent = Number(tenant.quote_vat_percent || 0);
      const quantity = Number(fields.quantity || 0);
      if (base > 0 || perUnit > 0 || minimum > 0) {
        const net = Math.max(minimum, base + (perUnit * quantity));
        const vat = net * (vatPercent / 100);
        const total = net + vat;
        computedQuote = {
          serviceName:tenant.quote_service_name || 'Tarjous',
          unitLabel:tenant.quote_unit_label || 'kpl',
          quantity,
          net:Number(net.toFixed(2)),
          vatPercent,
          vat:Number(vat.toFixed(2)),
          total:Number(total.toFixed(2)),
          totalCents:Math.max(50,Math.round(total * 100)),
          currency:'EUR',
        };
      }
    }

    if (type === 'booking') {
      const previewSlot = await q(
        `SELECT id,starts_at,ends_at,status
           FROM booking_slots
          WHERE id=$1 AND tenant_id=$2`,
        [fields.slotId,tenant.id],
      );
      if (!previewSlot.rowCount || previewSlot.rows[0].status !== 'open') {
        return res.status(409).json({ error:'Tämä aika ei ole enää vapaa. Valitse toinen aika.' });
      }

      if (tenant.google_calendar_refresh_token || tenant.google_calendar_access_token) {
        try {
          const conflict = await googleCalendarHasConflict(
            tenant,
            previewSlot.rows[0].starts_at,
            previewSlot.rows[0].ends_at,
          );
          if (conflict) {
            return res.status(409).json({ error:'Tämä aika on varattu Google Kalenterissa. Valitse toinen aika.' });
          }
        } catch (e) {
          console.error('Google Calendar conflict check failed',e);
          return res.status(503).json({ error:'Kalenterin vapautta ei voitu juuri nyt varmistaa. Yritä hetken päästä uudelleen.' });
        }
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const sr = await client.query(
          `SELECT id,starts_at,ends_at,status
             FROM booking_slots
            WHERE id=$1 AND tenant_id=$2
            FOR UPDATE`,
          [fields.slotId,tenant.id],
        );
        if (!sr.rowCount || sr.rows[0].status !== 'open' || new Date(sr.rows[0].starts_at).getTime() < Date.now()) {
          await client.query('ROLLBACK');
          return res.status(409).json({ error:'Tämä aika ei ole enää vapaa. Valitse toinen aika.' });
        }
        bookedSlot = sr.rows[0];
        await client.query(
          `UPDATE booking_slots SET status='booked' WHERE id=$1 AND tenant_id=$2`,
          [fields.slotId,tenant.id],
        );
        await client.query('COMMIT');
      } catch (e) {
        try { await client.query('ROLLBACK'); } catch {}
        throw e;
      } finally {
        client.release();
      }
      payload.booking = {
        slotId:bookedSlot.id,
        startsAt:bookedSlot.starts_at,
        endsAt:bookedSlot.ends_at,
      };
    }

    await q(
      `INSERT INTO action_requests(id,tenant_id,visitor_ref,request_type,status,payload,result,source_channel,external_contact_id)
       VALUES($1,$2,$3,$4,'new',$5::jsonb,$6::jsonb,$7,$8)`,
      [id,tenant.id,visitorRef,type,JSON.stringify(payload),JSON.stringify({
        ...(computedQuote ? { quote:computedQuote } : {}),
        ...(ecommerceLookupAttempted ? { orderStatus:ecommerceOrder,orderLookupProvider:tenant.ecommerce_provider } : {}),
      }),sourceChannel,externalContactId],
    );

    if (['quote','booking','callback'].includes(type)) {
      const contact = actionContact(fields);
      await q(
        `INSERT INTO leads(id,tenant_id,visitor_ref,name,email,phone,message,status)
         VALUES($1,$2,$3,$4,$5,$6,$7,'new')`,
        [
          uid(),tenant.id,visitorRef,
          String(fields.name || '').slice(0,120) || null,
          contact.email || null,
          contact.phone || null,
          String(fields.details || fields.note || payload.question || '').slice(0,1200) || null,
        ],
      );
    }

    const actionRequest = {
      id,
      type,
      status:'new',
      sourceChannel,
      externalContactId,
      visitorRef,
      payload,
      createdAt:new Date().toISOString(),
    };

    let calendarSync = { status:'not_configured' };
    if (type === 'booking') {
      try {
        calendarSync = await createGoogleCalendarBooking(tenant,actionRequest);
      } catch (e) {
        console.error('Google Calendar booking sync failed',e);
        calendarSync = { status:'failed', error:String(e?.message || 'Calendar sync failed').slice(0,300) };
      }
      await q(
        `UPDATE action_requests
            SET result=COALESCE(result,'{}'::jsonb) || $1::jsonb,updated_at=NOW()
          WHERE id=$2`,
        [JSON.stringify({ calendarSync }),id],
      );
    }

    let delivery = { status:'not_configured', result:null };
    try {
      delivery = await dispatchActionWebhook(tenant, actionRequest);
    } catch (e) {
      console.error('Action webhook delivery failed', e);
      delivery = { status:'failed', result:{ error:String(e?.message || 'Webhook failed').slice(0,500) } };
    }

    await q(
      `UPDATE action_requests
          SET delivery_status=$1,
              result=COALESCE(result,'{}'::jsonb) || $2::jsonb,
              updated_at=NOW()
        WHERE id=$3 AND tenant_id=$4`,
      [delivery.status,JSON.stringify({ webhook:delivery.result || {} }),id,tenant.id],
    );

    await q(
      `INSERT INTO action_events(id,tenant_id,visitor_ref,action_type,label,target,page_url)
       VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [uid(),tenant.id,visitorRef,type,'submitted',null,pageUrl],
    );

    const nativeOrderMessage = ecommerceLookupAttempted
      ? orderStatusText(ecommerceOrder,body.lang === 'en' ? 'en' : 'fi')
      : '';
    const customerMessage = String(
      nativeOrderMessage ||
      delivery.result?.customerMessage ||
      delivery.result?.message ||
      ''
    ).trim().slice(0,1200);

    let checkoutUrl = '';
    let paymentAvailable = false;
    if (type === 'quote' && computedQuote && stripe && tenant.stripe_connected_account_id) {
      try {
        const connected = await stripe.accounts.retrieve(tenant.stripe_connected_account_id);
        paymentAvailable = Boolean(connected.charges_enabled);
        if (paymentAvailable) {
          const checkout = await stripe.checkout.sessions.create(
            {
              mode:'payment',
              client_reference_id:id,
              customer_email:actionContact(fields).email || undefined,
              line_items:[{
                price_data:{
                  currency:'eur',
                  product_data:{
                    name:computedQuote.serviceName || ('Tarjous · ' + tenant.name),
                    description:payload.question ? payload.question.slice(0,450) : undefined,
                  },
                  unit_amount:computedQuote.totalCents,
                },
                quantity:1,
              }],
              metadata:{
                respondo_action_request_id:id,
                respondo_tenant_id:tenant.id,
              },
              success_url:BASE + '/maksu-valmis?action=' + encodeURIComponent(id) + '&session_id={CHECKOUT_SESSION_ID}',
              cancel_url:pageUrl || tenant.website || BASE,
            },
            { stripeAccount:tenant.stripe_connected_account_id },
          );
          checkoutUrl = checkout.url || '';
          await q(
            `UPDATE action_requests
                SET result=COALESCE(result,'{}'::jsonb) || $1::jsonb,updated_at=NOW()
              WHERE id=$2`,
            [JSON.stringify({ checkoutSessionId:checkout.id }),id],
          );
        }
      } catch (e) {
        console.error('Connected Stripe Checkout failed',e);
      }
    }

    return res.json({
      ok:true,
      id,
      status:'new',
      deliveryStatus:delivery.status,
      quote:computedQuote,
      orderStatus:ecommerceOrder,
      booking:bookedSlot ? {
        startsAt:bookedSlot.starts_at,
        endsAt:bookedSlot.ends_at,
      } : null,
      calendarSync,
      paymentAvailable,
      checkoutUrl,
      customerMessage: customerMessage || (
        type === 'booking' ? 'Ajanvarauspyyntösi on vastaanotettu.' :
        type === 'quote' ? 'Tarjouspyyntösi on vastaanotettu.' :
        type === 'order_status' ? 'Tilaustietojen tarkistuspyyntö on vastaanotettu.' :
        'Yhteydenottopyyntösi on vastaanotettu.'
      ),
    });
  } catch (e) {
    console.error('Action request failed', e);
    return res.status(500).json({ error:'Toiminnon lähetys epäonnistui.' });
  }
});


app.post('/api/app/quote-engine', auth, subscribed, async (req,res) => {
  try {
    const tr = await q('SELECT id FROM tenants WHERE owner_user_id=$1',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const basePrice = Math.max(0, Number(req.body.basePrice || 0));
    const unitPrice = Math.max(0, Number(req.body.unitPrice || 0));
    const minPrice = Math.max(0, Number(req.body.minPrice || 0));
    const vatPercent = Math.min(30, Math.max(0, Number(req.body.vatPercent || 0)));
    const serviceName = String(req.body.serviceName || '').trim().slice(0,120);
    const unitLabel = String(req.body.unitLabel || 'kpl').trim().slice(0,40) || 'kpl';

    await q(
      `UPDATE tenants
          SET quote_service_name=$1,quote_base_price=$2,quote_unit_price=$3,
              quote_min_price=$4,quote_vat_percent=$5,quote_unit_label=$6,updated_at=NOW()
        WHERE id=$7`,
      [serviceName,basePrice,unitPrice,minPrice,vatPercent,unitLabel,tr.rows[0].id],
    );
    return res.json({ ok:true });
  } catch (e) {
    return res.status(400).json({ error:e.message || 'Hintalaskuria ei voitu tallentaa.' });
  }
});

app.post('/api/app/booking-slots/generate', auth, subscribed, async (req,res) => {
  const client = await pool.connect();
  try {
    const tr = await client.query('SELECT id FROM tenants WHERE owner_user_id=$1',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const tenantId = tr.rows[0].id;
    const slots = (Array.isArray(req.body.slots) ? req.body.slots : []).slice(0,300);
    if (!slots.length) return res.status(400).json({ error:'Luo vähintään yksi vapaa aika.' });

    await client.query('BEGIN');
    let saved = 0;
    for (const slot of slots) {
      const start = new Date(slot.start);
      const end = new Date(slot.end);
      if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) continue;
      if (start.getTime() < Date.now() - 60000) continue;
      const inserted = await client.query(
        `INSERT INTO booking_slots(id,tenant_id,starts_at,ends_at,status)
         VALUES($1,$2,$3,$4,'open')
         ON CONFLICT(tenant_id,starts_at) DO NOTHING
         RETURNING id`,
        [uid(),tenantId,start.toISOString(),end.toISOString()],
      );
      saved += inserted.rowCount;
    }
    await client.query('COMMIT');
    return res.json({ ok:true,saved });
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    return res.status(400).json({ error:e.message || 'Vapaita aikoja ei voitu luoda.' });
  } finally {
    client.release();
  }
});

app.delete('/api/app/booking-slots/:id', auth, subscribed, async (req,res) => {
  try {
    const tr = await q('SELECT id FROM tenants WHERE owner_user_id=$1',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const removed = await q(
      `DELETE FROM booking_slots
        WHERE id=$1 AND tenant_id=$2 AND status='open'
        RETURNING id`,
      [req.params.id,tr.rows[0].id],
    );
    if (!removed.rowCount) return res.status(400).json({ error:'Aikaa ei voitu poistaa.' });
    return res.json({ ok:true });
  } catch {
    return res.status(500).json({ error:'Aikaa ei voitu poistaa.' });
  }
});

app.post('/api/app/stripe-connect/onboard', auth, subscribed, async (req,res) => {
  try {
    if (!stripe) return res.status(503).json({ error:'Stripe ei ole käytettävissä.' });
    const tr = await q('SELECT * FROM tenants WHERE owner_user_id=$1',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const tenant = tr.rows[0];
    let accountId = tenant.stripe_connected_account_id;
    if (!accountId) {
      const country = String(req.body.country || 'FI').trim().toUpperCase().slice(0,2) || 'FI';
      const account = await stripe.accounts.create({
        type:'express',
        country,
        capabilities:{
          card_payments:{ requested:true },
          transfers:{ requested:true },
        },
        business_profile:{
          name:tenant.name,
          url:tenant.website || undefined,
        },
        metadata:{ tenant_id:tenant.id, tenant_slug:tenant.slug },
      });
      accountId = account.id;
      await q(
        'UPDATE tenants SET stripe_connected_account_id=$1,updated_at=NOW() WHERE id=$2',
        [accountId,tenant.id],
      );
    }

    const link = await stripe.accountLinks.create({
      account:accountId,
      refresh_url:BASE + '/app?section=automation&stripe=refresh',
      return_url:BASE + '/app?section=automation&stripe=return',
      type:'account_onboarding',
    });
    return res.json({ url:link.url });
  } catch (e) {
    console.error('Stripe Connect onboarding failed', e);
    return res.status(400).json({ error:e.message || 'Stripe-yhdistämistä ei voitu aloittaa.' });
  }
});

app.post('/api/app/integrations', auth, subscribed, async (req,res) => {
  try {
    const tr = await q('SELECT * FROM tenants WHERE owner_user_id=$1',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const tenant = await ensureTenantActionKeys(tr.rows[0]);
    const raw = String(req.body.webhookUrl || '').trim();
    let url = '';
    if (raw) {
      const parsed = await assertPublicHttpUrl(raw);
      if (parsed.protocol !== 'https:') return res.status(400).json({ error:'Webhookin pitää käyttää HTTPS-yhteyttä.' });
      url = parsed.toString();
    }
    await q('UPDATE tenants SET action_webhook_url=$1,updated_at=NOW() WHERE id=$2',[url || null,tenant.id]);
    return res.json({
      ok:true,
      webhookUrl:url,
      webhookSecret:tenant.action_webhook_secret,
      channelsApiKey:tenant.channels_api_key,
    });
  } catch (e) {
    return res.status(400).json({ error:e.message || 'Integraation tallennus epäonnistui.' });
  }
});

app.post('/api/app/integrations/test', auth, subscribed, async (req,res) => {
  try {
    const tr = await q('SELECT * FROM tenants WHERE owner_user_id=$1',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const tenant = await ensureTenantActionKeys(tr.rows[0]);
    if (!tenant.action_webhook_url) return res.status(400).json({ error:'Lisää webhook-osoite ensin.' });
    const delivery = await dispatchActionWebhook(tenant,{
      id:'test_' + Date.now(),
      type:'test',
      status:'test',
      sourceChannel:'dashboard',
      payload:{ message:'RESPONDO Actions 2.0 test' },
      createdAt:new Date().toISOString(),
    });
    if (delivery.status !== 'delivered') return res.status(400).json({ error:'Webhook ei vastannut onnistuneesti.' });
    return res.json({ ok:true,httpStatus:delivery.httpStatus || 200 });
  } catch (e) {
    return res.status(400).json({ error:e.message || 'Webhook-testi epäonnistui.' });
  }
});

app.post('/api/app/action-requests/:id/status', auth, subscribed, async (req,res) => {
  try {
    const status = ['new','in_progress','done'].includes(String(req.body.status)) ? String(req.body.status) : 'done';
    const tr = await q('SELECT id FROM tenants WHERE owner_user_id=$1',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const updated = await q(
      'UPDATE action_requests SET status=$1,updated_at=NOW() WHERE id=$2 AND tenant_id=$3 RETURNING id,status',
      [status,req.params.id,tr.rows[0].id],
    );
    if (!updated.rowCount) return res.status(404).json({ error:'Pyyntöä ei löytynyt.' });
    return res.json(updated.rows[0]);
  } catch (e) {
    return res.status(500).json({ error:'Tilaa ei voitu päivittää.' });
  }
});


app.post('/api/app/commerce', auth, subscribed, async (req,res) => {
  try {
    const tr = await q('SELECT * FROM tenants WHERE owner_user_id=$1',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const tenant = tr.rows[0];
    const provider = ['shopify','woocommerce',''].includes(String(req.body.provider || ''))
      ? String(req.body.provider || '')
      : '';

    let shop = String(req.body.shopifyShopDomain || '').trim().toLowerCase()
      .replace(/^https?:\/\//,'').replace(/\/$/,'');
    if (shop && !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)) {
      return res.status(400).json({ error:'Shopify-osoitteen pitää olla muodossa kauppa.myshopify.com.' });
    }

    let wooBase = String(req.body.wooBaseUrl || '').trim();
    if (wooBase) {
      const parsed = await assertPublicHttpUrl(wooBase);
      if (parsed.protocol !== 'https:') return res.status(400).json({ error:'WooCommerce-kaupan pitää käyttää HTTPS-yhteyttä.' });
      wooBase = parsed.origin;
    }

    const shopToken = String(req.body.shopifyAccessToken || '').trim();
    const wooKey = String(req.body.wooConsumerKey || '').trim();
    const wooSecret = String(req.body.wooConsumerSecret || '').trim();

    await q(
      `UPDATE tenants SET
         ecommerce_provider=$1,
         shopify_shop_domain=$2,
         shopify_access_token=$3,
         woo_base_url=$4,
         woo_consumer_key=$5,
         woo_consumer_secret=$6,
         updated_at=NOW()
       WHERE id=$7`,
      [
        provider || null,
        shop || null,
        shopToken ? encryptSecret(shopToken) : tenant.shopify_access_token,
        wooBase || null,
        wooKey ? encryptSecret(wooKey) : tenant.woo_consumer_key,
        wooSecret ? encryptSecret(wooSecret) : tenant.woo_consumer_secret,
        tenant.id,
      ],
    );
    return res.json({ ok:true });
  } catch (e) {
    return res.status(400).json({ error:e.message || 'Verkkokauppayhteyttä ei voitu tallentaa.' });
  }
});

app.post('/api/app/commerce/test', auth, subscribed, async (req,res) => {
  try {
    const tr = await q('SELECT * FROM tenants WHERE owner_user_id=$1',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const tenant = tr.rows[0];
    if (tenant.ecommerce_provider === 'shopify') {
      const data = await shopifyGraphql(tenant,'query RespondoShopTest { shop { name } }');
      return res.json({ ok:true,provider:'shopify',name:data?.shop?.name || tenant.shopify_shop_domain });
    }
    if (tenant.ecommerce_provider === 'woocommerce') {
      const orders = await wooApi(tenant,'orders',{ per_page:1 });
      return res.json({ ok:true,provider:'woocommerce',sampleCount:Array.isArray(orders) ? orders.length : 0 });
    }
    return res.status(400).json({ error:'Valitse Shopify tai WooCommerce ensin.' });
  } catch (e) {
    return res.status(400).json({ error:e.message || 'Yhteystesti epäonnistui.' });
  }
});

app.post('/api/app/meta-channels', auth, subscribed, async (req,res) => {
  try {
    const tr = await q('SELECT * FROM tenants WHERE owner_user_id=$1',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const tenant = await ensureTenantActionKeys(tr.rows[0]);
    const versionRaw = String(req.body.graphVersion || 'v24.0').trim();
    const graphVersion = /^v\d+\.\d+$/.test(versionRaw) ? versionRaw : 'v24.0';
    const appSecret = String(req.body.appSecret || '').trim();
    const waToken = String(req.body.whatsappAccessToken || '').trim();
    const igToken = String(req.body.instagramAccessToken || '').trim();
    const waId = String(req.body.whatsappPhoneNumberId || '').trim().slice(0,120);
    const igId = String(req.body.instagramAccountId || '').trim().slice(0,120);
    if ((waToken || waId || igToken || igId) && !(appSecret || tenant.meta_app_secret)) {
      return res.status(400).json({ error:'Meta App Secret tarvitaan webhook-viestien allekirjoituksen tarkistamiseen.' });
    }

    await q(
      `UPDATE tenants SET
         meta_graph_version=$1,
         meta_app_secret=$2,
         whatsapp_phone_number_id=$3,
         whatsapp_access_token=$4,
         instagram_account_id=$5,
         instagram_access_token=$6,
         updated_at=NOW()
       WHERE id=$7`,
      [
        graphVersion,
        appSecret ? encryptSecret(appSecret) : tenant.meta_app_secret,
        waId || null,
        waToken ? encryptSecret(waToken) : tenant.whatsapp_access_token,
        igId || null,
        igToken ? encryptSecret(igToken) : tenant.instagram_access_token,
        tenant.id,
      ],
    );
    return res.json({
      ok:true,
      verifyToken:tenant.meta_verify_token,
      webhookUrl:BASE + '/api/meta/webhook/' + encodeURIComponent(tenant.slug),
    });
  } catch (e) {
    return res.status(400).json({ error:e.message || 'Meta-kanavia ei voitu tallentaa.' });
  }
});

app.post('/api/app/meta-channels/test', auth, subscribed, async (req,res) => {
  try {
    const tr = await q('SELECT * FROM tenants WHERE owner_user_id=$1',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const tenant = tr.rows[0];
    const version = tenant.meta_graph_version || 'v24.0';
    const results = {};

    if (tenant.whatsapp_access_token && tenant.whatsapp_phone_number_id) {
      const response = await fetch(
        'https://graph.facebook.com/' + encodeURIComponent(version) + '/' + encodeURIComponent(tenant.whatsapp_phone_number_id) + '?fields=display_phone_number,verified_name',
        { headers:{ Authorization:'Bearer ' + decryptSecret(tenant.whatsapp_access_token) } },
      );
      const data = await response.json().catch(() => ({}));
      results.whatsapp = response.ok ? { ok:true,name:data.verified_name || '',phone:data.display_phone_number || '' } : { ok:false,error:data?.error?.message || 'Test failed' };
    }

    if (tenant.instagram_access_token && tenant.instagram_account_id) {
      const response = await fetch(
        'https://graph.instagram.com/' + encodeURIComponent(version) + '/' + encodeURIComponent(tenant.instagram_account_id) + '?fields=id,username',
        { headers:{ Authorization:'Bearer ' + decryptSecret(tenant.instagram_access_token) } },
      );
      const data = await response.json().catch(() => ({}));
      results.instagram = response.ok ? { ok:true,username:data.username || '' } : { ok:false,error:data?.error?.message || 'Test failed' };
    }

    if (!Object.keys(results).length) return res.status(400).json({ error:'Lisää vähintään yhden kanavan tunnukset ensin.' });
    return res.json({ ok:Object.values(results).every((x) => x.ok),results });
  } catch (e) {
    return res.status(400).json({ error:e.message || 'Meta-yhteystesti epäonnistui.' });
  }
});

app.post('/api/app/voice', auth, subscribed, async (req,res) => {
  try {
    const tr = await q('SELECT * FROM tenants WHERE owner_user_id=$1',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const tenant = tr.rows[0];
    const authToken = String(req.body.authToken || '').trim();
    const accountSid = String(req.body.accountSid || '').trim().slice(0,80);
    const phoneNumber = normalizePhone(req.body.phoneNumber);
    const handoffNumber = normalizePhone(req.body.handoffNumber);
    const enabled = Boolean(req.body.enabled);

    await q(
      `UPDATE tenants SET twilio_account_sid=$1,twilio_auth_token=$2,twilio_phone_number=$3,
         voice_handoff_number=$4,voice_enabled=$5,updated_at=NOW() WHERE id=$6`,
      [
        accountSid || null,
        authToken ? encryptSecret(authToken) : tenant.twilio_auth_token,
        phoneNumber || null,
        handoffNumber || null,
        enabled,
        tenant.id,
      ],
    );
    return res.json({ ok:true,webhookUrl:BASE + '/api/voice/' + encodeURIComponent(tenant.slug) + '/incoming' });
  } catch (e) {
    return res.status(400).json({ error:e.message || 'Puhelinagentin asetuksia ei voitu tallentaa.' });
  }
});

app.post('/api/app/voice/test', auth, subscribed, async (req,res) => {
  try {
    const tr = await q('SELECT * FROM tenants WHERE owner_user_id=$1',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const tenant = tr.rows[0];
    if (!tenant.twilio_account_sid || !tenant.twilio_auth_token) return res.status(400).json({ error:'Lisää Twilio-tunnukset ensin.' });
    const data = await twilioApi(tenant,'GET','/Accounts/' + encodeURIComponent(tenant.twilio_account_sid) + '.json');
    return res.json({ ok:true,status:data.status || 'active',name:data.friendly_name || '' });
  } catch (e) {
    return res.status(400).json({ error:e.message || 'Twilio-yhteystesti epäonnistui.' });
  }
});

app.post('/api/app/voice/configure-number', auth, subscribed, async (req,res) => {
  try {
    const tr = await q('SELECT * FROM tenants WHERE owner_user_id=$1',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const tenant = tr.rows[0];
    const number = normalizePhone(tenant.twilio_phone_number);
    if (!number) return res.status(400).json({ error:'Lisää Twilio-puhelinnumero ensin.' });

    const list = await twilioApi(
      tenant,'GET',
      '/Accounts/' + encodeURIComponent(tenant.twilio_account_sid) + '/IncomingPhoneNumbers.json?PhoneNumber=' + encodeURIComponent(number),
    );
    const found = (list.incoming_phone_numbers || []).find((x) => normalizePhone(x.phone_number) === number);
    if (!found?.sid) return res.status(404).json({ error:'Puhelinnumeroa ei löytynyt tältä Twilio-tililtä.' });

    await twilioApi(
      tenant,'POST',
      '/Accounts/' + encodeURIComponent(tenant.twilio_account_sid) + '/IncomingPhoneNumbers/' + encodeURIComponent(found.sid) + '.json',
      {
        VoiceUrl:BASE + '/api/voice/' + encodeURIComponent(tenant.slug) + '/incoming',
        VoiceMethod:'POST',
      },
    );
    await q('UPDATE tenants SET voice_enabled=TRUE,updated_at=NOW() WHERE id=$1',[tenant.id]);
    return res.json({ ok:true,webhookUrl:BASE + '/api/voice/' + encodeURIComponent(tenant.slug) + '/incoming' });
  } catch (e) {
    return res.status(400).json({ error:e.message || 'Twilio-numeroa ei voitu aktivoida.' });
  }
});

app.post('/api/app/live/:id/mode', auth, subscribed, async (req,res) => {
  try {
    const tr = await q('SELECT id FROM tenants WHERE owner_user_id=$1',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const mode = req.body.mode === 'human' ? 'human' : 'ai';
    const rr = await q(
      `UPDATE chat_threads SET mode=$1,status='open',updated_at=NOW()
        WHERE id=$2 AND tenant_id=$3 RETURNING *`,
      [mode,req.params.id,tr.rows[0].id],
    );
    if (!rr.rowCount) return res.status(404).json({ error:'Keskustelua ei löytynyt.' });
    return res.json(rr.rows[0]);
  } catch {
    return res.status(500).json({ error:'Keskustelua ei voitu päivittää.' });
  }
});

app.post('/api/app/live/:id/reply', auth, subscribed, async (req,res) => {
  try {
    const text = String(req.body.message || '').trim().slice(0,4000);
    if (!text) return res.status(400).json({ error:'Kirjoita viesti.' });
    const tr = await q('SELECT * FROM tenants WHERE owner_user_id=$1',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const tenant = tr.rows[0];
    const rr = await q(
      'SELECT * FROM chat_threads WHERE id=$1 AND tenant_id=$2',
      [req.params.id,tenant.id],
    );
    if (!rr.rowCount) return res.status(404).json({ error:'Keskustelua ei löytynyt.' });
    const thread = rr.rows[0];
    await q("UPDATE chat_threads SET mode='human',status='open',updated_at=NOW() WHERE id=$1",[thread.id]);
    const message = await appendChatMessage({
      tenantId:tenant.id,threadId:thread.id,sourceChannel:thread.source_channel,
      externalContactId:thread.external_contact_id,visitorRef:thread.visitor_ref,
      role:'human',text,
    });
    if (['whatsapp','instagram'].includes(thread.source_channel)) {
      await sendMetaMessage(tenant,thread.source_channel,thread.external_contact_id,text);
    }
    return res.json({ ok:true,message });
  } catch (e) {
    return res.status(400).json({ error:e.message || 'Viestiä ei voitu lähettää.' });
  }
});

app.post('/api/channel/:slug/message', async (req,res) => {
  try {
    const tr = await publicTenant(req.params.slug);
    if (!tr.rowCount) return res.status(404).json({ error:'Yritystä ei löytynyt.' });
    const tenant = await ensureTenantActionKeys(tr.rows[0]);
    const authHeader = String(req.headers.authorization || '');
    if (authHeader !== 'Bearer ' + tenant.channels_api_key) {
      return res.status(401).json({ error:'Virheellinen Channels API -avain.' });
    }

    const channel = String(req.body.channel || 'api').trim().toLowerCase().slice(0,40);
    if (!['api','email','whatsapp','instagram','messenger','sms','phone'].includes(channel)) {
      return res.status(400).json({ error:'Tuntematon kanava.' });
    }
    const contactId = String(req.body.contactId || '').trim().slice(0,220);
    const message = String(req.body.message || '').trim().slice(0,1200);
    const lang = req.body.lang === 'en' ? 'en' : 'fi';
    if (!contactId || !message) return res.status(400).json({ error:'contactId ja message tarvitaan.' });

    const result = await processExternalChannelMessage(tenant,channel,contactId,message,lang);
    return res.json(result);
  } catch (e) {
    console.error('Channels API failed',e);
    return res.status(500).json({ error:'Kanavaviestiä ei voitu käsitellä.' });
  }
});


app.get('/api/meta/webhook/:slug', async (req,res) => {
  try {
    const tr = await publicTenant(req.params.slug);
    if (!tr.rowCount) return res.sendStatus(404);
    const tenant = await ensureTenantActionKeys(tr.rows[0]);
    const mode = String(req.query['hub.mode'] || '');
    const verifyToken = String(req.query['hub.verify_token'] || '');
    const challenge = String(req.query['hub.challenge'] || '');
    if (mode === 'subscribe' && safeEqualText(verifyToken,tenant.meta_verify_token)) {
      return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
  } catch {
    return res.sendStatus(500);
  }
});

app.post('/api/meta/webhook/:slug', async (req,res) => {
  try {
    const tr = await publicTenant(req.params.slug);
    if (!tr.rowCount) return res.sendStatus(404);
    const tenant = tr.rows[0];

    if (!tenant.meta_app_secret) return res.sendStatus(503);
    if (tenant.meta_app_secret) {
      const provided = String(req.headers['x-hub-signature-256'] || '');
      const raw = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
      const expected = 'sha256=' + crypto
        .createHmac('sha256',decryptSecret(tenant.meta_app_secret))
        .update(raw)
        .digest('hex');
      if (!safeEqualText(provided,expected)) return res.sendStatus(403);
    }

    const body = req.body || {};
    const work = [];

    for (const entry of (Array.isArray(body.entry) ? body.entry : [])) {
      // WhatsApp Cloud API.
      for (const change of (Array.isArray(entry.changes) ? entry.changes : [])) {
        const value = change?.value || {};
        for (const msg of (Array.isArray(value.messages) ? value.messages : [])) {
          if (msg?.type !== 'text' || !msg?.text?.body || !msg?.from) continue;
          work.push((async () => {
            const result = await processExternalChannelMessage(
              tenant,'whatsapp',String(msg.from),String(msg.text.body),'fi',
            );
            if (result.answer && !result.humanTakeover) {
              await sendMetaMessage(tenant,'whatsapp',String(msg.from),result.answer);
            }
          })());
        }
      }

      // Instagram Messaging webhook.
      for (const event of (Array.isArray(entry.messaging) ? entry.messaging : [])) {
        if (event?.message?.is_echo || !event?.message?.text || !event?.sender?.id) continue;
        work.push((async () => {
          const result = await processExternalChannelMessage(
            tenant,'instagram',String(event.sender.id),String(event.message.text),'fi',
          );
          if (result.answer && !result.humanTakeover) {
            await sendMetaMessage(tenant,'instagram',String(event.sender.id),result.answer);
          }
        })());
      }
    }

    await Promise.allSettled(work);
    return res.status(200).send('EVENT_RECEIVED');
  } catch (e) {
    console.error('Meta webhook failed',e);
    return res.sendStatus(500);
  }
});

function voiceGatherTwiml(slug,prompt) {
  const action = BASE + '/api/voice/' + encodeURIComponent(slug) + '/respond';
  return '<?xml version="1.0" encoding="UTF-8"?>' +
    '<Response>' +
      '<Gather input="speech" action="' + xmlEscape(action) + '" method="POST" language="fi-FI" speechTimeout="auto" actionOnEmptyResult="true">' +
        '<Say language="fi-FI">' + xmlEscape(prompt) + '</Say>' +
      '</Gather>' +
      '<Redirect method="POST">' + xmlEscape(BASE + '/api/voice/' + encodeURIComponent(slug) + '/incoming') + '</Redirect>' +
    '</Response>';
}

app.post('/api/voice/:slug/incoming', async (req,res) => {
  try {
    const tr = await publicTenant(req.params.slug);
    if (!tr.rowCount) return res.sendStatus(404);
    const tenant = tr.rows[0];
    if (!tenant.voice_enabled) return res.status(403).type('text/xml').send('<Response><Say>Palvelu ei ole käytössä.</Say></Response>');
    if (!twilioSignatureValid(req,tenant,'/api/voice/' + encodeURIComponent(tenant.slug) + '/incoming')) {
      return res.sendStatus(403);
    }
    const greeting = tenant.greeting || 'Hei! Olet yhteydessä yrityksen asiakaspalveluun. Miten voin auttaa?';
    return res.type('text/xml').send(voiceGatherTwiml(tenant.slug,greeting));
  } catch (e) {
    console.error('Voice incoming failed',e);
    return res.status(500).type('text/xml').send('<Response><Say>Palvelussa tapahtui virhe.</Say></Response>');
  }
});

app.post('/api/voice/:slug/respond', async (req,res) => {
  try {
    const tr = await publicTenant(req.params.slug);
    if (!tr.rowCount) return res.sendStatus(404);
    const tenant = tr.rows[0];
    if (!tenant.voice_enabled) return res.sendStatus(403);
    if (!twilioSignatureValid(req,tenant,'/api/voice/' + encodeURIComponent(tenant.slug) + '/respond')) {
      return res.sendStatus(403);
    }

    const speech = String(req.body.SpeechResult || '').trim().slice(0,1200);
    const callSid = String(req.body.CallSid || req.body.From || '').trim().slice(0,220);
    if (!speech) {
      return res.type('text/xml').send(voiceGatherTwiml(tenant.slug,'En kuullut vastausta. Voitko sanoa asian uudelleen?'));
    }

    const wantsHuman = /ihminen|asiakaspalvelija|henkilö|human|person|operator/i.test(speech);
    if (wantsHuman && tenant.voice_handoff_number) {
      return res.type('text/xml').send(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Say language="fi-FI">Yhdistän sinut asiakaspalvelijalle.</Say><Dial>' +
        xmlEscape(tenant.voice_handoff_number) +
        '</Dial></Response>',
      );
    }

    const result = await processExternalChannelMessage(tenant,'phone',callSid || uid(),speech,'fi');
    if ((result.handoff || result.humanTakeover) && tenant.voice_handoff_number) {
      return res.type('text/xml').send(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Say language="fi-FI">Tarvitaan ihminen avuksi. Yhdistän puhelun.</Say><Dial>' +
        xmlEscape(tenant.voice_handoff_number) +
        '</Dial></Response>',
      );
    }

    const answer = result.answer || 'Tarvitsen tähän yrityksen henkilön apua. Voit jättää yhteydenottopyynnön verkkosivulla.';
    return res.type('text/xml').send(voiceGatherTwiml(tenant.slug,answer + ' Voinko auttaa vielä jossain muussa?'));
  } catch (e) {
    console.error('Voice respond failed',e);
    return res.status(500).type('text/xml').send('<Response><Say language="fi-FI">Palvelussa tapahtui virhe. Yritä myöhemmin uudelleen.</Say></Response>');
  }
});

app.post('/api/public/:slug/action-event', publicChatLimiter, async (req, res) => {
  try {
    const tr = await publicTenant(req.params.slug);
    if (!tr.rowCount) return res.status(404).json({ error: 'Yritystä ei löytynyt.' });
    const tenant = tr.rows[0];
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    body = body || {};

    const origin = requestOrigin(req);
    const baseHost = normalizeHost(BASE);
    const external = Boolean(origin && normalizeHost(origin.hostname) !== baseHost);
    if (external) {
      if (!widgetOriginAllowed(req, tenant)) return res.status(403).json({ error: 'Chat ei ole käytössä tällä verkkosivulla.' });
      try {
        const token = jwt.verify(String(body.widgetToken || ''), JWT);
        if (token.kind !== 'widget' || token.slug !== tenant.slug || token.host !== normalizeHost(origin.hostname)) throw new Error('Invalid token');
      } catch {
        return res.status(403).json({ error: 'Chat ei ole käytössä tällä verkkosivulla.' });
      }
      setWidgetCors(req, res);
    }

    const actionType = String(body.actionType || '').trim().slice(0, 40);
    if (!['quote','booking','order_status','phone','email','link','callback'].includes(actionType)) {
      return res.status(400).json({ error: 'Tuntematon toiminto.' });
    }

    await q(
      `INSERT INTO action_events(id,tenant_id,visitor_ref,action_type,label,target,page_url)
       VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [
        uid(),
        tenant.id,
        String(body.visitorRef || '').slice(0,160) || null,
        actionType,
        String(body.label || '').slice(0,120) || null,
        String(body.target || '').slice(0,1000) || null,
        String(body.pageContext?.url || '').slice(0,1000) || null,
      ],
    );
    return res.json({ ok:true });
  } catch (e) {
    console.error('Action event failed', e);
    return res.status(500).json({ error:'Toiminnon seuranta epäonnistui.' });
  }
});

app.post('/api/billing/portal', auth, async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe ei ole vielä kytketty.' });
    const r = await q('SELECT stripe_customer_id FROM users WHERE id=$1', [req.user.sub]);
    if (!r.rows[0]?.stripe_customer_id) {
      return res.status(400).json({ error: 'Asiakkaan Stripe-tilausta ei löytynyt.' });
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: r.rows[0].stripe_customer_id,
      return_url: `${BASE}/app`,
    });
    return res.json({ url: session.url });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.post('/api/billing/cancel', auth, async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe ei ole vielä kytketty.' });
    const r = await q('SELECT stripe_subscription_id FROM users WHERE id=$1', [req.user.sub]);
    const id = r.rows[0]?.stripe_subscription_id;
    if (!id) return res.status(400).json({ error: 'Tilausta ei löytynyt.' });
    await stripe.subscriptions.update(id, { cancel_at_period_end: true });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/')) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  next();
});

async function ensureRuntimeSchema() {
  if (!pool) return;

  await q('ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan TEXT');
  await q('ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code TEXT');
  await q(`CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await q(
    "INSERT INTO app_settings(key,value) VALUES('owner_test_plan_enabled','true') ON CONFLICT(key) DO NOTHING"
  );
  await q('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code) WHERE referral_code IS NOT NULL');
  await q(`CREATE TABLE IF NOT EXISTS referral_redemptions (
    id UUID PRIMARY KEY,
    referrer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    stripe_discount_applied BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await q('CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referral_redemptions(referrer_user_id, created_at DESC)');

  await q(`CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    visitor_ref TEXT,
    name TEXT,
    email TEXT,
    phone TEXT,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await q('CREATE INDEX IF NOT EXISTS idx_leads_tenant_created ON leads(tenant_id, created_at DESC)');
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS average_lead_value NUMERIC(12,2) NOT NULL DEFAULT 0");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS action_webhook_url TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS action_webhook_secret TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS channels_api_key TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_connected_account_id TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS quote_service_name TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS quote_base_price NUMERIC(12,2) NOT NULL DEFAULT 0");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS quote_unit_price NUMERIC(12,2) NOT NULL DEFAULT 0");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS quote_min_price NUMERIC(12,2) NOT NULL DEFAULT 0");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS quote_vat_percent NUMERIC(6,2) NOT NULL DEFAULT 0");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS quote_unit_label TEXT NOT NULL DEFAULT 'kpl'");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS google_calendar_access_token TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS google_calendar_refresh_token TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS google_calendar_token_expires_at TIMESTAMPTZ");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS google_calendar_email TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS google_calendar_id TEXT NOT NULL DEFAULT 'primary'");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ecommerce_provider TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS shopify_shop_domain TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS shopify_access_token TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS woo_base_url TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS woo_consumer_key TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS woo_consumer_secret TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS meta_graph_version TEXT NOT NULL DEFAULT 'v24.0'");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS meta_verify_token TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS meta_app_secret TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS whatsapp_phone_number_id TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS whatsapp_access_token TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS instagram_account_id TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS instagram_access_token TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS twilio_account_sid TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS twilio_auth_token TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS twilio_phone_number TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS voice_handoff_number TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS voice_enabled BOOLEAN NOT NULL DEFAULT FALSE");




  await q("ALTER TABLE knowledge ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'manual'");
  await q("ALTER TABLE knowledge ADD COLUMN IF NOT EXISTS source_url TEXT");
  await q("ALTER TABLE knowledge ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT TRUE");
  await q("ALTER TABLE knowledge ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()");
  await q("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS page_url TEXT");
  await q("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS page_title TEXT");
  await q("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS source_channel TEXT NOT NULL DEFAULT 'website'");
  await q("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS external_contact_id TEXT");

  await q(`CREATE TABLE IF NOT EXISTS action_events (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    visitor_ref TEXT,
    action_type TEXT NOT NULL,
    label TEXT,
    target TEXT,
    page_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await q('CREATE INDEX IF NOT EXISTS idx_action_events_tenant_created ON action_events(tenant_id, created_at DESC)');
  await q(`CREATE TABLE IF NOT EXISTS self_test_runs (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    answerable_questions INTEGER NOT NULL,
    gaps JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await q('CREATE INDEX IF NOT EXISTS idx_self_test_tenant_created ON self_test_runs(tenant_id, created_at DESC)');
  await q(`CREATE TABLE IF NOT EXISTS action_requests (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    visitor_ref TEXT,
    request_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    result JSONB NOT NULL DEFAULT '{}'::jsonb,
    delivery_status TEXT NOT NULL DEFAULT 'not_configured',
    source_channel TEXT NOT NULL DEFAULT 'website',
    external_contact_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await q('CREATE INDEX IF NOT EXISTS idx_action_requests_tenant_created ON action_requests(tenant_id, created_at DESC)');
  await q(`CREATE TABLE IF NOT EXISTS booking_slots (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id,starts_at)
  )`);
  await q('CREATE INDEX IF NOT EXISTS idx_booking_slots_tenant_start ON booking_slots(tenant_id, starts_at)');
  await q(`CREATE TABLE IF NOT EXISTS chat_threads (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    source_channel TEXT NOT NULL DEFAULT 'website',
    external_contact_id TEXT NOT NULL,
    visitor_ref TEXT,
    mode TEXT NOT NULL DEFAULT 'ai',
    status TEXT NOT NULL DEFAULT 'open',
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id,source_channel,external_contact_id)
  )`);
  await q('CREATE INDEX IF NOT EXISTS idx_chat_threads_tenant_activity ON chat_threads(tenant_id,last_activity_at DESC)');
  await q(`CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    thread_id UUID REFERENCES chat_threads(id) ON DELETE CASCADE,
    source_channel TEXT NOT NULL DEFAULT 'website',
    external_contact_id TEXT,
    visitor_ref TEXT,
    role TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await q('CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_created ON chat_messages(thread_id,created_at ASC)');



  await q("ALTER TABLE tenants ALTER COLUMN accent SET DEFAULT '#111113'");
  await q("UPDATE tenants SET accent='#111113' WHERE accent='#3157ff'");
}

async function start() {
  try {
    await ensureRuntimeSchema();
    try {
      await backfillOwnerTestReceiptOnce();
    } catch (e) {
      console.error('Owner test receipt backfill failed', e);
    }
  } catch (e) {
    console.error('Runtime schema check failed', e);
  }
  app.listen(PORT, () => console.log(`RESPONDO AI listening on ${PORT}`));
}

start();
 + n++);
    values.push(tenant.channels_api_key);
  }
  if (!tenant.meta_verify_token) {
    tenant.meta_verify_token = 'rsp_meta_' + crypto.randomBytes(18).toString('hex');
    updates.push('meta_verify_token=
    values.push(tenant.id);
    await q('UPDATE tenants SET ' + updates.join(',') + ',updated_at=NOW() WHERE id=$' + n, values);
  }
  return tenant;
}

async function dispatchActionWebhook(tenant, actionRequest) {
  if (!tenant?.action_webhook_url) return { status:'not_configured', result:null };
  const url = await assertPublicHttpUrl(tenant.action_webhook_url);
  const payload = JSON.stringify({
    event: 'respondo.action.created',
    tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name },
    action: actionRequest,
  });
  const signature = crypto
    .createHmac('sha256', tenant.action_webhook_secret || '')
    .update(payload)
    .digest('hex');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {
      method:'POST',
      redirect:'manual',
      signal:controller.signal,
      headers:{
        'content-type':'application/json',
        'user-agent':'RESPONDO-Actions/2.0',
        'x-respondo-signature':'sha256=' + signature,
      },
      body:payload,
    });
    const raw = (await response.text()).slice(0,12000);
    let parsed = null;
    try { parsed = raw ? JSON.parse(raw) : null; } catch { parsed = raw ? { message:raw.slice(0,1000) } : null; }
    return { status: response.ok ? 'delivered' : 'failed', result: parsed, httpStatus:response.status };
  } finally {
    clearTimeout(timer);
  }
}

async function validateWidgetActionRequest(req, tenant, body) {
  const origin = requestOrigin(req);
  const baseHost = normalizeHost(BASE);
  const external = Boolean(origin && normalizeHost(origin.hostname) !== baseHost);
  if (!external) return true;
  if (!widgetOriginAllowed(req, tenant)) return false;
  try {
    const token = jwt.verify(String(body.widgetToken || ''), JWT);
    return token.kind === 'widget' && token.slug === tenant.slug && token.host === normalizeHost(origin.hostname);
  } catch {
    return false;
  }
}

async function publicTenant(slugValue) {
  return q(
    `SELECT t.*
       FROM tenants t
       JOIN users u ON u.id=t.owner_user_id
      WHERE t.slug=$1
        AND t.active=true
        AND u.status='active'
        AND u.subscription_status IN ('active','trialing')`,
    [slugValue],
  );
}


app.get('/api/public/:slug/widget-token', async (req, res) => {
  try {
    const tr = await publicTenant(req.params.slug);
    if (!tr.rowCount) return res.status(404).json({ error: 'Yritystä ei löytynyt.' });
    const tenant = tr.rows[0];

    if (!tenant.website) {
      return res.status(403).json({ error: 'Widgetille ei ole vielä määritetty verkkosivua.' });
    }
    if (!widgetOriginAllowed(req, tenant)) {
      return res.status(403).json({ error: 'Tämä RESPONDO AI -lisenssi on sidottu toiseen verkkosivuun.' });
    }

    setWidgetCors(req, res);
    const origin = requestOrigin(req);
    const token = jwt.sign(
      {
        kind: 'widget',
        slug: tenant.slug,
        host: normalizeHost(origin.hostname),
      },
      JWT,
      { expiresIn: '12h' }
    );
    const lang = req.query.lang === 'en' ? 'en' : 'fi';
    const kr = await q('SELECT title, answer FROM knowledge WHERE tenant_id=$1 AND approved=true', [tenant.id]);
    const available = new Set(kr.rows.map((x) => normalizeSearchText(x.title)));
    const quickReplies = [
      available.has('hinnat') && (lang === 'en' ? 'Pricing' : 'Hinnat'),
      available.has('aukioloajat') && (lang === 'en' ? 'Opening hours' : 'Aukioloajat'),
      available.has('palvelut') && (lang === 'en' ? 'Services' : 'Palvelut'),
      available.has('tarjouspyyntolomake') && (lang === 'en' ? 'Request a quote' : 'Pyydä tarjous'),
    ].filter(Boolean).slice(0, 3);

    return res.json({
      token,
      name: tenant.name,
      greeting: lang === 'en' ? 'Hi! How can I help?' : tenant.greeting,
      accent: tenant.accent,
      quickReplies,
    });
  } catch (e) {
    console.error('Widget token failed', e);
    return res.status(500).json({ error: 'Chatin käynnistäminen ei onnistunut.' });
  }
});


app.get('/api/public/:slug', async (req, res) => {
  try {
    const r = await publicTenant(req.params.slug);
    if (!r.rowCount) return res.status(404).json({ error: 'Yritystä ei löytynyt.' });
    const t = r.rows[0];
    return res.json({
      slug: t.slug,
      name: t.name,
      greeting: t.greeting,
      handoff_message: t.handoff_message,
      accent: t.accent,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.post('/api/public/demo-chat', demoChatLimiter, async (req, res) => {
  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    body = body || {};
    const lang = body.lang === 'en' ? 'en' : 'fi';
    const message = String(body.message || '').trim().slice(0, 1200);
    if (!message) return res.status(400).json({ error: lang === 'en' ? 'Type a question.' : 'Kirjoita kysymys.' });
    const profile = body.profile && typeof body.profile === 'object' ? body.profile : {};
    const rows = buildProfileKnowledge(profile).slice(0, 60);
    const history = Array.isArray(body.history) ? body.history.slice(-6) : [];
    const result = await generateGroundedAnswer({
      companyName: String(profile.companyName || 'yrityksen').slice(0, 120),
      rows,
      message,
      history,
      lang,
    });
    const handoffAnswer = lang === 'en'
      ? 'I cannot find a reliable answer to this from the provided company information. Add the answer to the knowledge base and the bot will know it next time.'
      : 'Tätä tietoa ei löytynyt yrityksen tiedoista. Lisää oikea vastaus kerran, niin Respondo osaa vastata siihen jatkossa.';
    return res.json({
      answer: result.handoff ? handoffAnswer : result.answer,
      handoff: result.handoff,
      confidence: result.confidence,
      intent: result.intent,
      actions: chatActions(rows, message, result.handoff, lang),
    });
  } catch (e) {
    console.error('Demo chat failed', e);
    return res.status(500).json({ error: 'Vastausta ei saatu juuri nyt. Yritä hetken päästä uudelleen.' });
  }
});

app.post('/api/public/:slug/lead', publicChatLimiter, async (req, res) => {
  try {
    const tr = await publicTenant(req.params.slug);
    if (!tr.rowCount) return res.status(404).json({ error: 'Yritystä ei löytynyt.' });
    const tenant = tr.rows[0];
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    body = body || {};
    const lang = body.lang === 'en' ? 'en' : 'fi';

    const origin = requestOrigin(req);
    const baseHost = normalizeHost(BASE);
    const external = Boolean(origin && normalizeHost(origin.hostname) !== baseHost);
    if (external) {
      if (!widgetOriginAllowed(req, tenant)) return res.status(403).json({ error: 'Chat ei ole käytössä tällä verkkosivulla.' });
      try {
        const token = jwt.verify(String(body.widgetToken || ''), JWT);
        if (token.kind !== 'widget' || token.slug !== tenant.slug || token.host !== normalizeHost(origin.hostname)) throw new Error('Invalid token');
      } catch {
        return res.status(403).json({ error: 'Chat ei ole käytössä tällä verkkosivulla.' });
      }
      setWidgetCors(req, res);
    }

    const name = String(body.name || '').trim().slice(0, 120);
    const email = cleanEmail(body.email).slice(0, 220);
    const phone = String(body.phone || '').trim().slice(0, 80);
    const message = String(body.message || '').trim().slice(0, 1200);
    if (!email && !phone) return res.status(400).json({ error: 'Anna sähköposti tai puhelinnumero.' });

    await q(
      'INSERT INTO leads(id,tenant_id,visitor_ref,name,email,phone,message) VALUES($1,$2,$3,$4,$5,$6,$7)',
      [uid(), tenant.id, String(body.visitorRef || '').slice(0, 160) || null, name || null, email || null, phone || null, message || null],
    );
    return res.json({ ok: true });
  } catch (e) {
    console.error('Lead capture failed', e);
    return res.status(500).json({ error: 'Yhteystietojen lähetys epäonnistui.' });
  }
});

app.post('/api/public/:slug/chat', publicChatLimiter, async (req, res) => {
  try {
    const tr = await publicTenant(req.params.slug);
    if (!tr.rowCount) return res.status(404).json({ error: 'Yritystä ei löytynyt.' });
    const t = tr.rows[0];
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    body = body || {};
    const lang = body.lang === 'en' ? 'en' : 'fi';

    const origin = requestOrigin(req);
    const baseHost = normalizeHost(BASE);
    const externalWidgetRequest = Boolean(origin && normalizeHost(origin.hostname) !== baseHost);

    if (externalWidgetRequest) {
      if (!widgetOriginAllowed(req, t)) {
        return res.status(403).json({ error: 'Tämä RESPONDO AI -lisenssi on sidottu toiseen verkkosivuun.' });
      }
      try {
        const token = jwt.verify(String(body.widgetToken || ''), JWT);
        if (
          token.kind !== 'widget' ||
          token.slug !== t.slug ||
          token.host !== normalizeHost(origin.hostname)
        ) {
          throw new Error('Invalid widget token');
        }
      } catch {
        return res.status(403).json({ error: 'Chat ei ole käytössä tällä verkkosivulla.' });
      }
      setWidgetCors(req, res);
    }

    const message = String(body.message || '').trim().slice(0, 1200);
    if (!message) return res.status(400).json({ error: lang === 'en' ? 'Type a question.' : 'Kirjoita kysymys.' });
    const visitorRef = String(body.visitorRef || '').trim().slice(0, 160);

    const kr = await q('SELECT * FROM knowledge WHERE tenant_id=$1 AND approved=true ORDER BY updated_at DESC, created_at DESC', [t.id]);
    let history = [];
    if (visitorRef) {
      const hr = await q(
        `SELECT question, answer, handoff
           FROM conversations
          WHERE tenant_id=$1 AND visitor_ref=$2
          ORDER BY created_at DESC
          LIMIT 6`,
        [t.id, visitorRef],
      );
      history = hr.rows.reverse();
    }

    const result = await generateGroundedAnswer({
      companyName: t.name,
      rows: kr.rows,
      message,
      history,
      lang,
      pageContext: body.pageContext && typeof body.pageContext === 'object' ? body.pageContext : {},
    });

    let answer = result.answer;
    if (result.handoff) {
      const hasContact = knowledgeValue(kr.rows, 'Puhelinnumero') || knowledgeValue(kr.rows, 'Sähköposti') || knowledgeValue(kr.rows, 'Tarjouspyyntölomake');
      answer = lang === 'en'
        ? (hasContact
          ? 'I cannot find a reliable answer to this in the company information. You can leave your contact details and the company can get back to you.'
          : 'I cannot find a reliable answer to this yet. The company can add this information later.')
        : (hasContact
          ? 'Tätä tietoa ei löytynyt yrityksen tiedoista. Voit jättää yhteystietosi, niin joku yrityksestä voi ottaa sinuun yhteyttä.'
          : (t.handoff_message || 'Tätä tietoa ei löytynyt vielä. Yritys voi lisätä oikean vastauksen myöhemmin.'));
    }

    const actions = chatActions(kr.rows, message, result.handoff, lang);
    await q(
      `INSERT INTO conversations(id,tenant_id,question,answer,intent,confidence,source_ids,handoff,visitor_ref,page_url,page_title)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        uid(), t.id, message, answer, result.intent, result.confidence, result.sourceIds, result.handoff,
        visitorRef || null,
        String(body.pageContext?.url || '').slice(0, 1000) || null,
        String(body.pageContext?.title || '').slice(0, 300) || null,
      ],
    );

    return res.json({
      answer,
      handoff: result.handoff,
      confidence: result.confidence,
      intent: result.intent,
      sourceIds: result.sourceIds,
      verified: !result.handoff && Array.isArray(result.sourceIds) && result.sourceIds.length > 0,
      actions,
      canLeaveContact: result.handoff,
    });
  } catch (e) {
    console.error('Chat failed', e);
    return res.status(500).json({ error: 'Vastausta ei saatu juuri nyt.' });
  }
});




app.get('/api/public/:slug/booking-slots', publicChatLimiter, async (req,res) => {
  try {
    const tr = await publicTenant(req.params.slug);
    if (!tr.rowCount) return res.status(404).json({ error:'Yritystä ei löytynyt.' });
    const tenant = tr.rows[0];

    const origin = requestOrigin(req);
    const baseHost = normalizeHost(BASE);
    const external = Boolean(origin && normalizeHost(origin.hostname) !== baseHost);
    if (external) {
      if (!widgetOriginAllowed(req,tenant)) return res.status(403).json({ error:'Chat ei ole käytössä tällä verkkosivulla.' });
      try {
        const token = jwt.verify(String(req.query.widgetToken || ''),JWT);
        if (token.kind !== 'widget' || token.slug !== tenant.slug || token.host !== normalizeHost(origin.hostname)) throw new Error('Invalid token');
      } catch {
        return res.status(403).json({ error:'Chat ei ole käytössä tällä verkkosivulla.' });
      }
      setWidgetCors(req,res);
    }

    const rows = await q(
      `SELECT id,starts_at,ends_at
         FROM booking_slots
        WHERE tenant_id=$1 AND status='open' AND starts_at >= NOW()
        ORDER BY starts_at ASC
        LIMIT 40`,
      [tenant.id],
    );

    let slots = rows.rows;
    if (slots.length && (tenant.google_calendar_refresh_token || tenant.google_calendar_access_token)) {
      try {
        const events = await googleCalendarEvents(
          tenant,
          slots[0].starts_at,
          slots[slots.length - 1].ends_at,
        );
        slots = slots.filter((slot) => {
          const start = new Date(slot.starts_at).getTime();
          const end = new Date(slot.ends_at).getTime();
          return !events.some((event) => event.start.getTime() < end && event.end.getTime() > start);
        });
      } catch (e) {
        console.error('Google Calendar availability filter failed',e);
      }
    }

    return res.json({ slots });
  } catch {
    return res.status(500).json({ error:'Vapaita aikoja ei saatu.' });
  }
});

app.get('/api/public/payment/verify', async (req,res) => {
  try {
    if (!stripe) return res.status(503).json({ error:'Stripe ei ole käytettävissä.' });
    const actionId = String(req.query.action || '').trim();
    const sessionId = String(req.query.session_id || '').trim();
    if (!actionId || !sessionId) return res.status(400).json({ error:'Maksutiedot puuttuvat.' });

    const rr = await q(
      `SELECT ar.id,ar.tenant_id,ar.request_type,ar.result,t.name,t.stripe_connected_account_id
         FROM action_requests ar
         JOIN tenants t ON t.id=ar.tenant_id
        WHERE ar.id=$1`,
      [actionId],
    );
    if (!rr.rowCount || rr.rows[0].request_type !== 'quote') return res.status(404).json({ error:'Tarjousta ei löytynyt.' });
    const row = rr.rows[0];
    if (!row.stripe_connected_account_id) return res.status(400).json({ error:'Maksutiliä ei löytynyt.' });

    const session = await stripe.checkout.sessions.retrieve(
      sessionId,
      {},
      { stripeAccount:row.stripe_connected_account_id },
    );
    if (session.client_reference_id !== actionId) return res.status(400).json({ error:'Maksu ei vastaa tarjousta.' });

    const paid = session.payment_status === 'paid';
    if (paid) {
      await q(
        `UPDATE action_requests
            SET status='done',
                result=COALESCE(result,'{}'::jsonb) || $1::jsonb,
                updated_at=NOW()
          WHERE id=$2`,
        [JSON.stringify({ paid:true,paidAt:new Date().toISOString(),checkoutSessionId:session.id }),actionId],
      );
    }
    return res.json({
      paid,
      companyName:row.name,
      amountTotal:Number(session.amount_total || 0),
      currency:String(session.currency || 'eur').toUpperCase(),
    });
  } catch (e) {
    console.error('Payment verification failed',e);
    return res.status(400).json({ error:'Maksua ei voitu vahvistaa.' });
  }
});

app.post('/api/public/:slug/action-request', publicChatLimiter, async (req, res) => {
  try {
    const tr = await publicTenant(req.params.slug);
    if (!tr.rowCount) return res.status(404).json({ error:'Yritystä ei löytynyt.' });
    const tenant = await ensureTenantActionKeys(tr.rows[0]);

    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    body = body || {};
    if (!(await validateWidgetActionRequest(req, tenant, body))) {
      return res.status(403).json({ error:'Chat ei ole käytössä tällä verkkosivulla.' });
    }
    setWidgetCors(req,res);

    const type = String(body.type || '').trim();
    if (!['quote','booking','order_status','callback'].includes(type)) {
      return res.status(400).json({ error:'Tuntematon toiminto.' });
    }

    const fields = cleanActionFields(type, body.fields);
    if (type === 'booking') {
      fields.slotId = String(body.fields?.slotId || '').trim().slice(0,80);
    }
    if (type === 'quote') {
      fields.quantity = Math.max(0, Number(body.fields?.quantity || 0));
    }
    if (type === 'quote' && !fields.contact) return res.status(400).json({ error:'Anna sähköposti tai puhelinnumero.' });
    if (type === 'booking' && (!fields.contact || !fields.slotId)) return res.status(400).json({ error:'Valitse vapaa aika ja anna yhteystieto.' });
    if (type === 'order_status' && (!fields.orderNumber || !fields.email)) return res.status(400).json({ error:'Anna tilausnumero ja tilauksessa käytetty sähköposti.' });

    const id = uid();
    const visitorRef = String(body.visitorRef || '').slice(0,160) || null;
    const sourceChannel = String(body.sourceChannel || 'website').trim().slice(0,40) || 'website';
    const externalContactId = String(body.externalContactId || '').trim().slice(0,220) || null;
    const pageUrl = String(body.pageContext?.url || '').slice(0,1000) || null;
    const payload = {
      fields,
      question: String(body.question || '').trim().slice(0,1200),
      pageUrl,
      pageTitle: String(body.pageContext?.title || '').slice(0,300) || null,
    };
    let computedQuote = null;
    let bookedSlot = null;

    if (type === 'quote') {
      const base = Number(tenant.quote_base_price || 0);
      const perUnit = Number(tenant.quote_unit_price || 0);
      const minimum = Number(tenant.quote_min_price || 0);
      const vatPercent = Number(tenant.quote_vat_percent || 0);
      const quantity = Number(fields.quantity || 0);
      if (base > 0 || perUnit > 0 || minimum > 0) {
        const net = Math.max(minimum, base + (perUnit * quantity));
        const vat = net * (vatPercent / 100);
        const total = net + vat;
        computedQuote = {
          serviceName:tenant.quote_service_name || 'Tarjous',
          unitLabel:tenant.quote_unit_label || 'kpl',
          quantity,
          net:Number(net.toFixed(2)),
          vatPercent,
          vat:Number(vat.toFixed(2)),
          total:Number(total.toFixed(2)),
          totalCents:Math.max(50,Math.round(total * 100)),
          currency:'EUR',
        };
      }
    }

    if (type === 'booking') {
      const previewSlot = await q(
        `SELECT id,starts_at,ends_at,status
           FROM booking_slots
          WHERE id=$1 AND tenant_id=$2`,
        [fields.slotId,tenant.id],
      );
      if (!previewSlot.rowCount || previewSlot.rows[0].status !== 'open') {
        return res.status(409).json({ error:'Tämä aika ei ole enää vapaa. Valitse toinen aika.' });
      }

      if (tenant.google_calendar_refresh_token || tenant.google_calendar_access_token) {
        try {
          const conflict = await googleCalendarHasConflict(
            tenant,
            previewSlot.rows[0].starts_at,
            previewSlot.rows[0].ends_at,
          );
          if (conflict) {
            return res.status(409).json({ error:'Tämä aika on varattu Google Kalenterissa. Valitse toinen aika.' });
          }
        } catch (e) {
          console.error('Google Calendar conflict check failed',e);
          return res.status(503).json({ error:'Kalenterin vapautta ei voitu juuri nyt varmistaa. Yritä hetken päästä uudelleen.' });
        }
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const sr = await client.query(
          `SELECT id,starts_at,ends_at,status
             FROM booking_slots
            WHERE id=$1 AND tenant_id=$2
            FOR UPDATE`,
          [fields.slotId,tenant.id],
        );
        if (!sr.rowCount || sr.rows[0].status !== 'open' || new Date(sr.rows[0].starts_at).getTime() < Date.now()) {
          await client.query('ROLLBACK');
          return res.status(409).json({ error:'Tämä aika ei ole enää vapaa. Valitse toinen aika.' });
        }
        bookedSlot = sr.rows[0];
        await client.query(
          `UPDATE booking_slots SET status='booked' WHERE id=$1 AND tenant_id=$2`,
          [fields.slotId,tenant.id],
        );
        await client.query('COMMIT');
      } catch (e) {
        try { await client.query('ROLLBACK'); } catch {}
        throw e;
      } finally {
        client.release();
      }
      payload.booking = {
        slotId:bookedSlot.id,
        startsAt:bookedSlot.starts_at,
        endsAt:bookedSlot.ends_at,
      };
    }

    await q(
      `INSERT INTO action_requests(id,tenant_id,visitor_ref,request_type,status,payload,result,source_channel,external_contact_id)
       VALUES($1,$2,$3,$4,'new',$5::jsonb,$6::jsonb,$7,$8)`,
      [id,tenant.id,visitorRef,type,JSON.stringify(payload),JSON.stringify(computedQuote ? { quote:computedQuote } : {}),sourceChannel,externalContactId],
    );

    if (['quote','booking','callback'].includes(type)) {
      const contact = actionContact(fields);
      await q(
        `INSERT INTO leads(id,tenant_id,visitor_ref,name,email,phone,message,status)
         VALUES($1,$2,$3,$4,$5,$6,$7,'new')`,
        [
          uid(),tenant.id,visitorRef,
          String(fields.name || '').slice(0,120) || null,
          contact.email || null,
          contact.phone || null,
          String(fields.details || fields.note || payload.question || '').slice(0,1200) || null,
        ],
      );
    }

    const actionRequest = {
      id,
      type,
      status:'new',
      sourceChannel,
      externalContactId,
      visitorRef,
      payload,
      createdAt:new Date().toISOString(),
    };

    let calendarSync = { status:'not_configured' };
    if (type === 'booking') {
      try {
        calendarSync = await createGoogleCalendarBooking(tenant,actionRequest);
      } catch (e) {
        console.error('Google Calendar booking sync failed',e);
        calendarSync = { status:'failed', error:String(e?.message || 'Calendar sync failed').slice(0,300) };
      }
      await q(
        `UPDATE action_requests
            SET result=COALESCE(result,'{}'::jsonb) || $1::jsonb,updated_at=NOW()
          WHERE id=$2`,
        [JSON.stringify({ calendarSync }),id],
      );
    }

    let delivery = { status:'not_configured', result:null };
    try {
      delivery = await dispatchActionWebhook(tenant, actionRequest);
    } catch (e) {
      console.error('Action webhook delivery failed', e);
      delivery = { status:'failed', result:{ error:String(e?.message || 'Webhook failed').slice(0,500) } };
    }

    await q(
      `UPDATE action_requests
          SET delivery_status=$1,
              result=COALESCE(result,'{}'::jsonb) || $2::jsonb,
              updated_at=NOW()
        WHERE id=$3 AND tenant_id=$4`,
      [delivery.status,JSON.stringify({ webhook:delivery.result || {} }),id,tenant.id],
    );

    await q(
      `INSERT INTO action_events(id,tenant_id,visitor_ref,action_type,label,target,page_url)
       VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [uid(),tenant.id,visitorRef,type,'submitted',null,pageUrl],
    );

    const customerMessage = String(
      delivery.result?.customerMessage ||
      delivery.result?.message ||
      ''
    ).trim().slice(0,1200);

    let checkoutUrl = '';
    let paymentAvailable = false;
    if (type === 'quote' && computedQuote && stripe && tenant.stripe_connected_account_id) {
      try {
        const connected = await stripe.accounts.retrieve(tenant.stripe_connected_account_id);
        paymentAvailable = Boolean(connected.charges_enabled);
        if (paymentAvailable) {
          const checkout = await stripe.checkout.sessions.create(
            {
              mode:'payment',
              client_reference_id:id,
              customer_email:actionContact(fields).email || undefined,
              line_items:[{
                price_data:{
                  currency:'eur',
                  product_data:{
                    name:computedQuote.serviceName || ('Tarjous · ' + tenant.name),
                    description:payload.question ? payload.question.slice(0,450) : undefined,
                  },
                  unit_amount:computedQuote.totalCents,
                },
                quantity:1,
              }],
              metadata:{
                respondo_action_request_id:id,
                respondo_tenant_id:tenant.id,
              },
              success_url:BASE + '/maksu-valmis?action=' + encodeURIComponent(id) + '&session_id={CHECKOUT_SESSION_ID}',
              cancel_url:pageUrl || tenant.website || BASE,
            },
            { stripeAccount:tenant.stripe_connected_account_id },
          );
          checkoutUrl = checkout.url || '';
          await q(
            `UPDATE action_requests
                SET result=COALESCE(result,'{}'::jsonb) || $1::jsonb,updated_at=NOW()
              WHERE id=$2`,
            [JSON.stringify({ checkoutSessionId:checkout.id }),id],
          );
        }
      } catch (e) {
        console.error('Connected Stripe Checkout failed',e);
      }
    }

    return res.json({
      ok:true,
      id,
      status:'new',
      deliveryStatus:delivery.status,
      quote:computedQuote,
      booking:bookedSlot ? {
        startsAt:bookedSlot.starts_at,
        endsAt:bookedSlot.ends_at,
      } : null,
      calendarSync,
      paymentAvailable,
      checkoutUrl,
      customerMessage: customerMessage || (
        type === 'booking' ? 'Ajanvarauspyyntösi on vastaanotettu.' :
        type === 'quote' ? 'Tarjouspyyntösi on vastaanotettu.' :
        type === 'order_status' ? 'Tilaustietojen tarkistuspyyntö on vastaanotettu.' :
        'Yhteydenottopyyntösi on vastaanotettu.'
      ),
    });
  } catch (e) {
    console.error('Action request failed', e);
    return res.status(500).json({ error:'Toiminnon lähetys epäonnistui.' });
  }
});


app.post('/api/app/quote-engine', auth, subscribed, async (req,res) => {
  try {
    const tr = await q('SELECT id FROM tenants WHERE owner_user_id=$1',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const basePrice = Math.max(0, Number(req.body.basePrice || 0));
    const unitPrice = Math.max(0, Number(req.body.unitPrice || 0));
    const minPrice = Math.max(0, Number(req.body.minPrice || 0));
    const vatPercent = Math.min(30, Math.max(0, Number(req.body.vatPercent || 0)));
    const serviceName = String(req.body.serviceName || '').trim().slice(0,120);
    const unitLabel = String(req.body.unitLabel || 'kpl').trim().slice(0,40) || 'kpl';

    await q(
      `UPDATE tenants
          SET quote_service_name=$1,quote_base_price=$2,quote_unit_price=$3,
              quote_min_price=$4,quote_vat_percent=$5,quote_unit_label=$6,updated_at=NOW()
        WHERE id=$7`,
      [serviceName,basePrice,unitPrice,minPrice,vatPercent,unitLabel,tr.rows[0].id],
    );
    return res.json({ ok:true });
  } catch (e) {
    return res.status(400).json({ error:e.message || 'Hintalaskuria ei voitu tallentaa.' });
  }
});

app.post('/api/app/booking-slots/generate', auth, subscribed, async (req,res) => {
  const client = await pool.connect();
  try {
    const tr = await client.query('SELECT id FROM tenants WHERE owner_user_id=$1',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const tenantId = tr.rows[0].id;
    const slots = (Array.isArray(req.body.slots) ? req.body.slots : []).slice(0,300);
    if (!slots.length) return res.status(400).json({ error:'Luo vähintään yksi vapaa aika.' });

    await client.query('BEGIN');
    let saved = 0;
    for (const slot of slots) {
      const start = new Date(slot.start);
      const end = new Date(slot.end);
      if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) continue;
      if (start.getTime() < Date.now() - 60000) continue;
      const inserted = await client.query(
        `INSERT INTO booking_slots(id,tenant_id,starts_at,ends_at,status)
         VALUES($1,$2,$3,$4,'open')
         ON CONFLICT(tenant_id,starts_at) DO NOTHING
         RETURNING id`,
        [uid(),tenantId,start.toISOString(),end.toISOString()],
      );
      saved += inserted.rowCount;
    }
    await client.query('COMMIT');
    return res.json({ ok:true,saved });
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    return res.status(400).json({ error:e.message || 'Vapaita aikoja ei voitu luoda.' });
  } finally {
    client.release();
  }
});

app.delete('/api/app/booking-slots/:id', auth, subscribed, async (req,res) => {
  try {
    const tr = await q('SELECT id FROM tenants WHERE owner_user_id=$1',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const removed = await q(
      `DELETE FROM booking_slots
        WHERE id=$1 AND tenant_id=$2 AND status='open'
        RETURNING id`,
      [req.params.id,tr.rows[0].id],
    );
    if (!removed.rowCount) return res.status(400).json({ error:'Aikaa ei voitu poistaa.' });
    return res.json({ ok:true });
  } catch {
    return res.status(500).json({ error:'Aikaa ei voitu poistaa.' });
  }
});

app.post('/api/app/stripe-connect/onboard', auth, subscribed, async (req,res) => {
  try {
    if (!stripe) return res.status(503).json({ error:'Stripe ei ole käytettävissä.' });
    const tr = await q('SELECT * FROM tenants WHERE owner_user_id=$1',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const tenant = tr.rows[0];
    let accountId = tenant.stripe_connected_account_id;
    if (!accountId) {
      const country = String(req.body.country || 'FI').trim().toUpperCase().slice(0,2) || 'FI';
      const account = await stripe.accounts.create({
        type:'express',
        country,
        capabilities:{
          card_payments:{ requested:true },
          transfers:{ requested:true },
        },
        business_profile:{
          name:tenant.name,
          url:tenant.website || undefined,
        },
        metadata:{ tenant_id:tenant.id, tenant_slug:tenant.slug },
      });
      accountId = account.id;
      await q(
        'UPDATE tenants SET stripe_connected_account_id=$1,updated_at=NOW() WHERE id=$2',
        [accountId,tenant.id],
      );
    }

    const link = await stripe.accountLinks.create({
      account:accountId,
      refresh_url:BASE + '/app?section=automation&stripe=refresh',
      return_url:BASE + '/app?section=automation&stripe=return',
      type:'account_onboarding',
    });
    return res.json({ url:link.url });
  } catch (e) {
    console.error('Stripe Connect onboarding failed', e);
    return res.status(400).json({ error:e.message || 'Stripe-yhdistämistä ei voitu aloittaa.' });
  }
});

app.post('/api/app/integrations', auth, subscribed, async (req,res) => {
  try {
    const tr = await q('SELECT * FROM tenants WHERE owner_user_id=$1',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const tenant = await ensureTenantActionKeys(tr.rows[0]);
    const raw = String(req.body.webhookUrl || '').trim();
    let url = '';
    if (raw) {
      const parsed = await assertPublicHttpUrl(raw);
      if (parsed.protocol !== 'https:') return res.status(400).json({ error:'Webhookin pitää käyttää HTTPS-yhteyttä.' });
      url = parsed.toString();
    }
    await q('UPDATE tenants SET action_webhook_url=$1,updated_at=NOW() WHERE id=$2',[url || null,tenant.id]);
    return res.json({
      ok:true,
      webhookUrl:url,
      webhookSecret:tenant.action_webhook_secret,
      channelsApiKey:tenant.channels_api_key,
    });
  } catch (e) {
    return res.status(400).json({ error:e.message || 'Integraation tallennus epäonnistui.' });
  }
});

app.post('/api/app/integrations/test', auth, subscribed, async (req,res) => {
  try {
    const tr = await q('SELECT * FROM tenants WHERE owner_user_id=$1',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const tenant = await ensureTenantActionKeys(tr.rows[0]);
    if (!tenant.action_webhook_url) return res.status(400).json({ error:'Lisää webhook-osoite ensin.' });
    const delivery = await dispatchActionWebhook(tenant,{
      id:'test_' + Date.now(),
      type:'test',
      status:'test',
      sourceChannel:'dashboard',
      payload:{ message:'RESPONDO Actions 2.0 test' },
      createdAt:new Date().toISOString(),
    });
    if (delivery.status !== 'delivered') return res.status(400).json({ error:'Webhook ei vastannut onnistuneesti.' });
    return res.json({ ok:true,httpStatus:delivery.httpStatus || 200 });
  } catch (e) {
    return res.status(400).json({ error:e.message || 'Webhook-testi epäonnistui.' });
  }
});

app.post('/api/app/action-requests/:id/status', auth, subscribed, async (req,res) => {
  try {
    const status = ['new','in_progress','done'].includes(String(req.body.status)) ? String(req.body.status) : 'done';
    const tr = await q('SELECT id FROM tenants WHERE owner_user_id=$1',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const updated = await q(
      'UPDATE action_requests SET status=$1,updated_at=NOW() WHERE id=$2 AND tenant_id=$3 RETURNING id,status',
      [status,req.params.id,tr.rows[0].id],
    );
    if (!updated.rowCount) return res.status(404).json({ error:'Pyyntöä ei löytynyt.' });
    return res.json(updated.rows[0]);
  } catch (e) {
    return res.status(500).json({ error:'Tilaa ei voitu päivittää.' });
  }
});

app.post('/api/channel/:slug/message', async (req,res) => {
  try {
    const tr = await publicTenant(req.params.slug);
    if (!tr.rowCount) return res.status(404).json({ error:'Yritystä ei löytynyt.' });
    const tenant = await ensureTenantActionKeys(tr.rows[0]);
    const authHeader = String(req.headers.authorization || '');
    if (authHeader !== 'Bearer ' + tenant.channels_api_key) return res.status(401).json({ error:'Virheellinen Channels API -avain.' });

    const channel = String(req.body.channel || 'api').trim().toLowerCase().slice(0,40);
    if (!['api','email','whatsapp','instagram','messenger','sms'].includes(channel)) {
      return res.status(400).json({ error:'Tuntematon kanava.' });
    }
    const contactId = String(req.body.contactId || '').trim().slice(0,220);
    const message = String(req.body.message || '').trim().slice(0,1200);
    const lang = req.body.lang === 'en' ? 'en' : 'fi';
    if (!contactId || !message) return res.status(400).json({ error:'contactId ja message tarvitaan.' });

    const kr = await q('SELECT * FROM knowledge WHERE tenant_id=$1 AND approved=true ORDER BY updated_at DESC,created_at DESC',[tenant.id]);
    const hr = await q(
      `SELECT question,answer,handoff
         FROM conversations
        WHERE tenant_id=$1 AND source_channel=$2 AND external_contact_id=$3
        ORDER BY created_at DESC LIMIT 6`,
      [tenant.id,channel,contactId],
    );
    const history = hr.rows.reverse();
    const result = await generateGroundedAnswer({
      companyName:tenant.name,
      rows:kr.rows,
      message,
      history,
      lang,
      pageContext:{},
    });
    let answer = result.answer;
    if (result.handoff) {
      answer = lang === 'en'
        ? 'I do not have a verified answer yet. A person from the company needs to handle this.'
        : 'Tähän ei löytynyt vielä varmennettua vastausta. Yrityksen henkilön pitää käsitellä tämä.';
    }
    const actions = chatActions(kr.rows,message,result.handoff,lang);
    await q(
      `INSERT INTO conversations(id,tenant_id,question,answer,intent,confidence,source_ids,handoff,visitor_ref,source_channel,external_contact_id)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [uid(),tenant.id,message,answer,result.intent,result.confidence,result.sourceIds,result.handoff,contactId,channel,contactId],
    );
    return res.json({
      answer,
      handoff:result.handoff,
      verified:!result.handoff && Array.isArray(result.sourceIds) && result.sourceIds.length>0,
      intent:result.intent,
      actions,
    });
  } catch (e) {
    console.error('Channels API failed', e);
    return res.status(500).json({ error:'Kanavaviestiä ei voitu käsitellä.' });
  }
});

app.post('/api/public/:slug/action-event', publicChatLimiter, async (req, res) => {
  try {
    const tr = await publicTenant(req.params.slug);
    if (!tr.rowCount) return res.status(404).json({ error: 'Yritystä ei löytynyt.' });
    const tenant = tr.rows[0];
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    body = body || {};

    const origin = requestOrigin(req);
    const baseHost = normalizeHost(BASE);
    const external = Boolean(origin && normalizeHost(origin.hostname) !== baseHost);
    if (external) {
      if (!widgetOriginAllowed(req, tenant)) return res.status(403).json({ error: 'Chat ei ole käytössä tällä verkkosivulla.' });
      try {
        const token = jwt.verify(String(body.widgetToken || ''), JWT);
        if (token.kind !== 'widget' || token.slug !== tenant.slug || token.host !== normalizeHost(origin.hostname)) throw new Error('Invalid token');
      } catch {
        return res.status(403).json({ error: 'Chat ei ole käytössä tällä verkkosivulla.' });
      }
      setWidgetCors(req, res);
    }

    const actionType = String(body.actionType || '').trim().slice(0, 40);
    if (!['quote','booking','order_status','phone','email','link','callback'].includes(actionType)) {
      return res.status(400).json({ error: 'Tuntematon toiminto.' });
    }

    await q(
      `INSERT INTO action_events(id,tenant_id,visitor_ref,action_type,label,target,page_url)
       VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [
        uid(),
        tenant.id,
        String(body.visitorRef || '').slice(0,160) || null,
        actionType,
        String(body.label || '').slice(0,120) || null,
        String(body.target || '').slice(0,1000) || null,
        String(body.pageContext?.url || '').slice(0,1000) || null,
      ],
    );
    return res.json({ ok:true });
  } catch (e) {
    console.error('Action event failed', e);
    return res.status(500).json({ error:'Toiminnon seuranta epäonnistui.' });
  }
});

app.post('/api/billing/portal', auth, async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe ei ole vielä kytketty.' });
    const r = await q('SELECT stripe_customer_id FROM users WHERE id=$1', [req.user.sub]);
    if (!r.rows[0]?.stripe_customer_id) {
      return res.status(400).json({ error: 'Asiakkaan Stripe-tilausta ei löytynyt.' });
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: r.rows[0].stripe_customer_id,
      return_url: `${BASE}/app`,
    });
    return res.json({ url: session.url });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.post('/api/billing/cancel', auth, async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe ei ole vielä kytketty.' });
    const r = await q('SELECT stripe_subscription_id FROM users WHERE id=$1', [req.user.sub]);
    const id = r.rows[0]?.stripe_subscription_id;
    if (!id) return res.status(400).json({ error: 'Tilausta ei löytynyt.' });
    await stripe.subscriptions.update(id, { cancel_at_period_end: true });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/')) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  next();
});

async function ensureRuntimeSchema() {
  if (!pool) return;

  await q('ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan TEXT');
  await q('ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code TEXT');
  await q(`CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await q(
    "INSERT INTO app_settings(key,value) VALUES('owner_test_plan_enabled','true') ON CONFLICT(key) DO NOTHING"
  );
  await q('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code) WHERE referral_code IS NOT NULL');
  await q(`CREATE TABLE IF NOT EXISTS referral_redemptions (
    id UUID PRIMARY KEY,
    referrer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    stripe_discount_applied BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await q('CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referral_redemptions(referrer_user_id, created_at DESC)');

  await q(`CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    visitor_ref TEXT,
    name TEXT,
    email TEXT,
    phone TEXT,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await q('CREATE INDEX IF NOT EXISTS idx_leads_tenant_created ON leads(tenant_id, created_at DESC)');
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS average_lead_value NUMERIC(12,2) NOT NULL DEFAULT 0");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS action_webhook_url TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS action_webhook_secret TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS channels_api_key TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_connected_account_id TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS quote_service_name TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS quote_base_price NUMERIC(12,2) NOT NULL DEFAULT 0");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS quote_unit_price NUMERIC(12,2) NOT NULL DEFAULT 0");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS quote_min_price NUMERIC(12,2) NOT NULL DEFAULT 0");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS quote_vat_percent NUMERIC(6,2) NOT NULL DEFAULT 0");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS quote_unit_label TEXT NOT NULL DEFAULT 'kpl'");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS google_calendar_access_token TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS google_calendar_refresh_token TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS google_calendar_token_expires_at TIMESTAMPTZ");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS google_calendar_email TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS google_calendar_id TEXT NOT NULL DEFAULT 'primary'");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ecommerce_provider TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS shopify_shop_domain TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS shopify_access_token TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS woo_base_url TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS woo_consumer_key TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS woo_consumer_secret TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS meta_graph_version TEXT NOT NULL DEFAULT 'v24.0'");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS meta_verify_token TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS meta_app_secret TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS whatsapp_phone_number_id TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS whatsapp_access_token TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS instagram_account_id TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS instagram_access_token TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS twilio_account_sid TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS twilio_auth_token TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS twilio_phone_number TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS voice_handoff_number TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS voice_enabled BOOLEAN NOT NULL DEFAULT FALSE");




  await q("ALTER TABLE knowledge ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'manual'");
  await q("ALTER TABLE knowledge ADD COLUMN IF NOT EXISTS source_url TEXT");
  await q("ALTER TABLE knowledge ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT TRUE");
  await q("ALTER TABLE knowledge ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()");
  await q("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS page_url TEXT");
  await q("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS page_title TEXT");
  await q("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS source_channel TEXT NOT NULL DEFAULT 'website'");
  await q("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS external_contact_id TEXT");

  await q(`CREATE TABLE IF NOT EXISTS action_events (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    visitor_ref TEXT,
    action_type TEXT NOT NULL,
    label TEXT,
    target TEXT,
    page_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await q('CREATE INDEX IF NOT EXISTS idx_action_events_tenant_created ON action_events(tenant_id, created_at DESC)');
  await q(`CREATE TABLE IF NOT EXISTS self_test_runs (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    answerable_questions INTEGER NOT NULL,
    gaps JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await q('CREATE INDEX IF NOT EXISTS idx_self_test_tenant_created ON self_test_runs(tenant_id, created_at DESC)');
  await q(`CREATE TABLE IF NOT EXISTS action_requests (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    visitor_ref TEXT,
    request_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    result JSONB NOT NULL DEFAULT '{}'::jsonb,
    delivery_status TEXT NOT NULL DEFAULT 'not_configured',
    source_channel TEXT NOT NULL DEFAULT 'website',
    external_contact_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await q('CREATE INDEX IF NOT EXISTS idx_action_requests_tenant_created ON action_requests(tenant_id, created_at DESC)');
  await q(`CREATE TABLE IF NOT EXISTS booking_slots (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id,starts_at)
  )`);
  await q('CREATE INDEX IF NOT EXISTS idx_booking_slots_tenant_start ON booking_slots(tenant_id, starts_at)');
  await q(`CREATE TABLE IF NOT EXISTS chat_threads (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    source_channel TEXT NOT NULL DEFAULT 'website',
    external_contact_id TEXT NOT NULL,
    visitor_ref TEXT,
    mode TEXT NOT NULL DEFAULT 'ai',
    status TEXT NOT NULL DEFAULT 'open',
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id,source_channel,external_contact_id)
  )`);
  await q('CREATE INDEX IF NOT EXISTS idx_chat_threads_tenant_activity ON chat_threads(tenant_id,last_activity_at DESC)');
  await q(`CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    thread_id UUID REFERENCES chat_threads(id) ON DELETE CASCADE,
    source_channel TEXT NOT NULL DEFAULT 'website',
    external_contact_id TEXT,
    visitor_ref TEXT,
    role TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await q('CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_created ON chat_messages(thread_id,created_at ASC)');



  await q("ALTER TABLE tenants ALTER COLUMN accent SET DEFAULT '#111113'");
  await q("UPDATE tenants SET accent='#111113' WHERE accent='#3157ff'");
}

async function start() {
  try {
    await ensureRuntimeSchema();
    try {
      await backfillOwnerTestReceiptOnce();
    } catch (e) {
      console.error('Owner test receipt backfill failed', e);
    }
  } catch (e) {
    console.error('Runtime schema check failed', e);
  }
  app.listen(PORT, () => console.log(`RESPONDO AI listening on ${PORT}`));
}

start();
 + n++);
    values.push(tenant.meta_verify_token);
  }
  if (updates.length) {
    values.push(tenant.id);
    await q('UPDATE tenants SET ' + updates.join(',') + ',updated_at=NOW() WHERE id=$' + n, values);
  }
  return tenant;
}

async function dispatchActionWebhook(tenant, actionRequest) {
  if (!tenant?.action_webhook_url) return { status:'not_configured', result:null };
  const url = await assertPublicHttpUrl(tenant.action_webhook_url);
  const payload = JSON.stringify({
    event: 'respondo.action.created',
    tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name },
    action: actionRequest,
  });
  const signature = crypto
    .createHmac('sha256', tenant.action_webhook_secret || '')
    .update(payload)
    .digest('hex');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {
      method:'POST',
      redirect:'manual',
      signal:controller.signal,
      headers:{
        'content-type':'application/json',
        'user-agent':'RESPONDO-Actions/2.0',
        'x-respondo-signature':'sha256=' + signature,
      },
      body:payload,
    });
    const raw = (await response.text()).slice(0,12000);
    let parsed = null;
    try { parsed = raw ? JSON.parse(raw) : null; } catch { parsed = raw ? { message:raw.slice(0,1000) } : null; }
    return { status: response.ok ? 'delivered' : 'failed', result: parsed, httpStatus:response.status };
  } finally {
    clearTimeout(timer);
  }
}

async function validateWidgetActionRequest(req, tenant, body) {
  const origin = requestOrigin(req);
  const baseHost = normalizeHost(BASE);
  const external = Boolean(origin && normalizeHost(origin.hostname) !== baseHost);
  if (!external) return true;
  if (!widgetOriginAllowed(req, tenant)) return false;
  try {
    const token = jwt.verify(String(body.widgetToken || ''), JWT);
    return token.kind === 'widget' && token.slug === tenant.slug && token.host === normalizeHost(origin.hostname);
  } catch {
    return false;
  }
}

async function publicTenant(slugValue) {
  return q(
    `SELECT t.*
       FROM tenants t
       JOIN users u ON u.id=t.owner_user_id
      WHERE t.slug=$1
        AND t.active=true
        AND u.status='active'
        AND u.subscription_status IN ('active','trialing')`,
    [slugValue],
  );
}


app.get('/api/public/:slug/widget-token', async (req, res) => {
  try {
    const tr = await publicTenant(req.params.slug);
    if (!tr.rowCount) return res.status(404).json({ error: 'Yritystä ei löytynyt.' });
    const tenant = tr.rows[0];

    if (!tenant.website) {
      return res.status(403).json({ error: 'Widgetille ei ole vielä määritetty verkkosivua.' });
    }
    if (!widgetOriginAllowed(req, tenant)) {
      return res.status(403).json({ error: 'Tämä RESPONDO AI -lisenssi on sidottu toiseen verkkosivuun.' });
    }

    setWidgetCors(req, res);
    const origin = requestOrigin(req);
    const token = jwt.sign(
      {
        kind: 'widget',
        slug: tenant.slug,
        host: normalizeHost(origin.hostname),
      },
      JWT,
      { expiresIn: '12h' }
    );
    const lang = req.query.lang === 'en' ? 'en' : 'fi';
    const kr = await q('SELECT title, answer FROM knowledge WHERE tenant_id=$1 AND approved=true', [tenant.id]);
    const available = new Set(kr.rows.map((x) => normalizeSearchText(x.title)));
    const quickReplies = [
      available.has('hinnat') && (lang === 'en' ? 'Pricing' : 'Hinnat'),
      available.has('aukioloajat') && (lang === 'en' ? 'Opening hours' : 'Aukioloajat'),
      available.has('palvelut') && (lang === 'en' ? 'Services' : 'Palvelut'),
      available.has('tarjouspyyntolomake') && (lang === 'en' ? 'Request a quote' : 'Pyydä tarjous'),
    ].filter(Boolean).slice(0, 3);

    return res.json({
      token,
      name: tenant.name,
      greeting: lang === 'en' ? 'Hi! How can I help?' : tenant.greeting,
      accent: tenant.accent,
      quickReplies,
    });
  } catch (e) {
    console.error('Widget token failed', e);
    return res.status(500).json({ error: 'Chatin käynnistäminen ei onnistunut.' });
  }
});


app.get('/api/public/:slug', async (req, res) => {
  try {
    const r = await publicTenant(req.params.slug);
    if (!r.rowCount) return res.status(404).json({ error: 'Yritystä ei löytynyt.' });
    const t = r.rows[0];
    return res.json({
      slug: t.slug,
      name: t.name,
      greeting: t.greeting,
      handoff_message: t.handoff_message,
      accent: t.accent,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.post('/api/public/demo-chat', demoChatLimiter, async (req, res) => {
  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    body = body || {};
    const lang = body.lang === 'en' ? 'en' : 'fi';
    const message = String(body.message || '').trim().slice(0, 1200);
    if (!message) return res.status(400).json({ error: lang === 'en' ? 'Type a question.' : 'Kirjoita kysymys.' });
    const profile = body.profile && typeof body.profile === 'object' ? body.profile : {};
    const rows = buildProfileKnowledge(profile).slice(0, 60);
    const history = Array.isArray(body.history) ? body.history.slice(-6) : [];
    const result = await generateGroundedAnswer({
      companyName: String(profile.companyName || 'yrityksen').slice(0, 120),
      rows,
      message,
      history,
      lang,
    });
    const handoffAnswer = lang === 'en'
      ? 'I cannot find a reliable answer to this from the provided company information. Add the answer to the knowledge base and the bot will know it next time.'
      : 'Tätä tietoa ei löytynyt yrityksen tiedoista. Lisää oikea vastaus kerran, niin Respondo osaa vastata siihen jatkossa.';
    return res.json({
      answer: result.handoff ? handoffAnswer : result.answer,
      handoff: result.handoff,
      confidence: result.confidence,
      intent: result.intent,
      actions: chatActions(rows, message, result.handoff, lang),
    });
  } catch (e) {
    console.error('Demo chat failed', e);
    return res.status(500).json({ error: 'Vastausta ei saatu juuri nyt. Yritä hetken päästä uudelleen.' });
  }
});

app.post('/api/public/:slug/lead', publicChatLimiter, async (req, res) => {
  try {
    const tr = await publicTenant(req.params.slug);
    if (!tr.rowCount) return res.status(404).json({ error: 'Yritystä ei löytynyt.' });
    const tenant = tr.rows[0];
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    body = body || {};
    const lang = body.lang === 'en' ? 'en' : 'fi';

    const origin = requestOrigin(req);
    const baseHost = normalizeHost(BASE);
    const external = Boolean(origin && normalizeHost(origin.hostname) !== baseHost);
    if (external) {
      if (!widgetOriginAllowed(req, tenant)) return res.status(403).json({ error: 'Chat ei ole käytössä tällä verkkosivulla.' });
      try {
        const token = jwt.verify(String(body.widgetToken || ''), JWT);
        if (token.kind !== 'widget' || token.slug !== tenant.slug || token.host !== normalizeHost(origin.hostname)) throw new Error('Invalid token');
      } catch {
        return res.status(403).json({ error: 'Chat ei ole käytössä tällä verkkosivulla.' });
      }
      setWidgetCors(req, res);
    }

    const name = String(body.name || '').trim().slice(0, 120);
    const email = cleanEmail(body.email).slice(0, 220);
    const phone = String(body.phone || '').trim().slice(0, 80);
    const message = String(body.message || '').trim().slice(0, 1200);
    if (!email && !phone) return res.status(400).json({ error: 'Anna sähköposti tai puhelinnumero.' });

    await q(
      'INSERT INTO leads(id,tenant_id,visitor_ref,name,email,phone,message) VALUES($1,$2,$3,$4,$5,$6,$7)',
      [uid(), tenant.id, String(body.visitorRef || '').slice(0, 160) || null, name || null, email || null, phone || null, message || null],
    );
    return res.json({ ok: true });
  } catch (e) {
    console.error('Lead capture failed', e);
    return res.status(500).json({ error: 'Yhteystietojen lähetys epäonnistui.' });
  }
});

app.post('/api/public/:slug/chat', publicChatLimiter, async (req, res) => {
  try {
    const tr = await publicTenant(req.params.slug);
    if (!tr.rowCount) return res.status(404).json({ error: 'Yritystä ei löytynyt.' });
    const t = tr.rows[0];
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    body = body || {};
    const lang = body.lang === 'en' ? 'en' : 'fi';

    const origin = requestOrigin(req);
    const baseHost = normalizeHost(BASE);
    const externalWidgetRequest = Boolean(origin && normalizeHost(origin.hostname) !== baseHost);

    if (externalWidgetRequest) {
      if (!widgetOriginAllowed(req, t)) {
        return res.status(403).json({ error: 'Tämä RESPONDO AI -lisenssi on sidottu toiseen verkkosivuun.' });
      }
      try {
        const token = jwt.verify(String(body.widgetToken || ''), JWT);
        if (
          token.kind !== 'widget' ||
          token.slug !== t.slug ||
          token.host !== normalizeHost(origin.hostname)
        ) {
          throw new Error('Invalid widget token');
        }
      } catch {
        return res.status(403).json({ error: 'Chat ei ole käytössä tällä verkkosivulla.' });
      }
      setWidgetCors(req, res);
    }

    const message = String(body.message || '').trim().slice(0, 1200);
    if (!message) return res.status(400).json({ error: lang === 'en' ? 'Type a question.' : 'Kirjoita kysymys.' });
    const visitorRef = String(body.visitorRef || '').trim().slice(0, 160);

    const kr = await q('SELECT * FROM knowledge WHERE tenant_id=$1 AND approved=true ORDER BY updated_at DESC, created_at DESC', [t.id]);
    let history = [];
    if (visitorRef) {
      const hr = await q(
        `SELECT question, answer, handoff
           FROM conversations
          WHERE tenant_id=$1 AND visitor_ref=$2
          ORDER BY created_at DESC
          LIMIT 6`,
        [t.id, visitorRef],
      );
      history = hr.rows.reverse();
    }

    const result = await generateGroundedAnswer({
      companyName: t.name,
      rows: kr.rows,
      message,
      history,
      lang,
      pageContext: body.pageContext && typeof body.pageContext === 'object' ? body.pageContext : {},
    });

    let answer = result.answer;
    if (result.handoff) {
      const hasContact = knowledgeValue(kr.rows, 'Puhelinnumero') || knowledgeValue(kr.rows, 'Sähköposti') || knowledgeValue(kr.rows, 'Tarjouspyyntölomake');
      answer = lang === 'en'
        ? (hasContact
          ? 'I cannot find a reliable answer to this in the company information. You can leave your contact details and the company can get back to you.'
          : 'I cannot find a reliable answer to this yet. The company can add this information later.')
        : (hasContact
          ? 'Tätä tietoa ei löytynyt yrityksen tiedoista. Voit jättää yhteystietosi, niin joku yrityksestä voi ottaa sinuun yhteyttä.'
          : (t.handoff_message || 'Tätä tietoa ei löytynyt vielä. Yritys voi lisätä oikean vastauksen myöhemmin.'));
    }

    const actions = chatActions(kr.rows, message, result.handoff, lang);
    await q(
      `INSERT INTO conversations(id,tenant_id,question,answer,intent,confidence,source_ids,handoff,visitor_ref,page_url,page_title)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        uid(), t.id, message, answer, result.intent, result.confidence, result.sourceIds, result.handoff,
        visitorRef || null,
        String(body.pageContext?.url || '').slice(0, 1000) || null,
        String(body.pageContext?.title || '').slice(0, 300) || null,
      ],
    );

    return res.json({
      answer,
      handoff: result.handoff,
      confidence: result.confidence,
      intent: result.intent,
      sourceIds: result.sourceIds,
      verified: !result.handoff && Array.isArray(result.sourceIds) && result.sourceIds.length > 0,
      actions,
      canLeaveContact: result.handoff,
    });
  } catch (e) {
    console.error('Chat failed', e);
    return res.status(500).json({ error: 'Vastausta ei saatu juuri nyt.' });
  }
});




app.get('/api/public/:slug/booking-slots', publicChatLimiter, async (req,res) => {
  try {
    const tr = await publicTenant(req.params.slug);
    if (!tr.rowCount) return res.status(404).json({ error:'Yritystä ei löytynyt.' });
    const tenant = tr.rows[0];

    const origin = requestOrigin(req);
    const baseHost = normalizeHost(BASE);
    const external = Boolean(origin && normalizeHost(origin.hostname) !== baseHost);
    if (external) {
      if (!widgetOriginAllowed(req,tenant)) return res.status(403).json({ error:'Chat ei ole käytössä tällä verkkosivulla.' });
      try {
        const token = jwt.verify(String(req.query.widgetToken || ''),JWT);
        if (token.kind !== 'widget' || token.slug !== tenant.slug || token.host !== normalizeHost(origin.hostname)) throw new Error('Invalid token');
      } catch {
        return res.status(403).json({ error:'Chat ei ole käytössä tällä verkkosivulla.' });
      }
      setWidgetCors(req,res);
    }

    const rows = await q(
      `SELECT id,starts_at,ends_at
         FROM booking_slots
        WHERE tenant_id=$1 AND status='open' AND starts_at >= NOW()
        ORDER BY starts_at ASC
        LIMIT 40`,
      [tenant.id],
    );

    let slots = rows.rows;
    if (slots.length && (tenant.google_calendar_refresh_token || tenant.google_calendar_access_token)) {
      try {
        const events = await googleCalendarEvents(
          tenant,
          slots[0].starts_at,
          slots[slots.length - 1].ends_at,
        );
        slots = slots.filter((slot) => {
          const start = new Date(slot.starts_at).getTime();
          const end = new Date(slot.ends_at).getTime();
          return !events.some((event) => event.start.getTime() < end && event.end.getTime() > start);
        });
      } catch (e) {
        console.error('Google Calendar availability filter failed',e);
      }
    }

    return res.json({ slots });
  } catch {
    return res.status(500).json({ error:'Vapaita aikoja ei saatu.' });
  }
});

app.get('/api/public/payment/verify', async (req,res) => {
  try {
    if (!stripe) return res.status(503).json({ error:'Stripe ei ole käytettävissä.' });
    const actionId = String(req.query.action || '').trim();
    const sessionId = String(req.query.session_id || '').trim();
    if (!actionId || !sessionId) return res.status(400).json({ error:'Maksutiedot puuttuvat.' });

    const rr = await q(
      `SELECT ar.id,ar.tenant_id,ar.request_type,ar.result,t.name,t.stripe_connected_account_id
         FROM action_requests ar
         JOIN tenants t ON t.id=ar.tenant_id
        WHERE ar.id=$1`,
      [actionId],
    );
    if (!rr.rowCount || rr.rows[0].request_type !== 'quote') return res.status(404).json({ error:'Tarjousta ei löytynyt.' });
    const row = rr.rows[0];
    if (!row.stripe_connected_account_id) return res.status(400).json({ error:'Maksutiliä ei löytynyt.' });

    const session = await stripe.checkout.sessions.retrieve(
      sessionId,
      {},
      { stripeAccount:row.stripe_connected_account_id },
    );
    if (session.client_reference_id !== actionId) return res.status(400).json({ error:'Maksu ei vastaa tarjousta.' });

    const paid = session.payment_status === 'paid';
    if (paid) {
      await q(
        `UPDATE action_requests
            SET status='done',
                result=COALESCE(result,'{}'::jsonb) || $1::jsonb,
                updated_at=NOW()
          WHERE id=$2`,
        [JSON.stringify({ paid:true,paidAt:new Date().toISOString(),checkoutSessionId:session.id }),actionId],
      );
    }
    return res.json({
      paid,
      companyName:row.name,
      amountTotal:Number(session.amount_total || 0),
      currency:String(session.currency || 'eur').toUpperCase(),
    });
  } catch (e) {
    console.error('Payment verification failed',e);
    return res.status(400).json({ error:'Maksua ei voitu vahvistaa.' });
  }
});

app.post('/api/public/:slug/action-request', publicChatLimiter, async (req, res) => {
  try {
    const tr = await publicTenant(req.params.slug);
    if (!tr.rowCount) return res.status(404).json({ error:'Yritystä ei löytynyt.' });
    const tenant = await ensureTenantActionKeys(tr.rows[0]);

    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    body = body || {};
    if (!(await validateWidgetActionRequest(req, tenant, body))) {
      return res.status(403).json({ error:'Chat ei ole käytössä tällä verkkosivulla.' });
    }
    setWidgetCors(req,res);

    const type = String(body.type || '').trim();
    if (!['quote','booking','order_status','callback'].includes(type)) {
      return res.status(400).json({ error:'Tuntematon toiminto.' });
    }

    const fields = cleanActionFields(type, body.fields);
    if (type === 'booking') {
      fields.slotId = String(body.fields?.slotId || '').trim().slice(0,80);
    }
    if (type === 'quote') {
      fields.quantity = Math.max(0, Number(body.fields?.quantity || 0));
    }
    if (type === 'quote' && !fields.contact) return res.status(400).json({ error:'Anna sähköposti tai puhelinnumero.' });
    if (type === 'booking' && (!fields.contact || !fields.slotId)) return res.status(400).json({ error:'Valitse vapaa aika ja anna yhteystieto.' });
    if (type === 'order_status' && (!fields.orderNumber || !fields.email)) return res.status(400).json({ error:'Anna tilausnumero ja tilauksessa käytetty sähköposti.' });

    const id = uid();
    const visitorRef = String(body.visitorRef || '').slice(0,160) || null;
    const sourceChannel = String(body.sourceChannel || 'website').trim().slice(0,40) || 'website';
    const externalContactId = String(body.externalContactId || '').trim().slice(0,220) || null;
    const pageUrl = String(body.pageContext?.url || '').slice(0,1000) || null;
    const payload = {
      fields,
      question: String(body.question || '').trim().slice(0,1200),
      pageUrl,
      pageTitle: String(body.pageContext?.title || '').slice(0,300) || null,
    };
    let computedQuote = null;
    let bookedSlot = null;

    if (type === 'quote') {
      const base = Number(tenant.quote_base_price || 0);
      const perUnit = Number(tenant.quote_unit_price || 0);
      const minimum = Number(tenant.quote_min_price || 0);
      const vatPercent = Number(tenant.quote_vat_percent || 0);
      const quantity = Number(fields.quantity || 0);
      if (base > 0 || perUnit > 0 || minimum > 0) {
        const net = Math.max(minimum, base + (perUnit * quantity));
        const vat = net * (vatPercent / 100);
        const total = net + vat;
        computedQuote = {
          serviceName:tenant.quote_service_name || 'Tarjous',
          unitLabel:tenant.quote_unit_label || 'kpl',
          quantity,
          net:Number(net.toFixed(2)),
          vatPercent,
          vat:Number(vat.toFixed(2)),
          total:Number(total.toFixed(2)),
          totalCents:Math.max(50,Math.round(total * 100)),
          currency:'EUR',
        };
      }
    }

    if (type === 'booking') {
      const previewSlot = await q(
        `SELECT id,starts_at,ends_at,status
           FROM booking_slots
          WHERE id=$1 AND tenant_id=$2`,
        [fields.slotId,tenant.id],
      );
      if (!previewSlot.rowCount || previewSlot.rows[0].status !== 'open') {
        return res.status(409).json({ error:'Tämä aika ei ole enää vapaa. Valitse toinen aika.' });
      }

      if (tenant.google_calendar_refresh_token || tenant.google_calendar_access_token) {
        try {
          const conflict = await googleCalendarHasConflict(
            tenant,
            previewSlot.rows[0].starts_at,
            previewSlot.rows[0].ends_at,
          );
          if (conflict) {
            return res.status(409).json({ error:'Tämä aika on varattu Google Kalenterissa. Valitse toinen aika.' });
          }
        } catch (e) {
          console.error('Google Calendar conflict check failed',e);
          return res.status(503).json({ error:'Kalenterin vapautta ei voitu juuri nyt varmistaa. Yritä hetken päästä uudelleen.' });
        }
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const sr = await client.query(
          `SELECT id,starts_at,ends_at,status
             FROM booking_slots
            WHERE id=$1 AND tenant_id=$2
            FOR UPDATE`,
          [fields.slotId,tenant.id],
        );
        if (!sr.rowCount || sr.rows[0].status !== 'open' || new Date(sr.rows[0].starts_at).getTime() < Date.now()) {
          await client.query('ROLLBACK');
          return res.status(409).json({ error:'Tämä aika ei ole enää vapaa. Valitse toinen aika.' });
        }
        bookedSlot = sr.rows[0];
        await client.query(
          `UPDATE booking_slots SET status='booked' WHERE id=$1 AND tenant_id=$2`,
          [fields.slotId,tenant.id],
        );
        await client.query('COMMIT');
      } catch (e) {
        try { await client.query('ROLLBACK'); } catch {}
        throw e;
      } finally {
        client.release();
      }
      payload.booking = {
        slotId:bookedSlot.id,
        startsAt:bookedSlot.starts_at,
        endsAt:bookedSlot.ends_at,
      };
    }

    await q(
      `INSERT INTO action_requests(id,tenant_id,visitor_ref,request_type,status,payload,result,source_channel,external_contact_id)
       VALUES($1,$2,$3,$4,'new',$5::jsonb,$6::jsonb,$7,$8)`,
      [id,tenant.id,visitorRef,type,JSON.stringify(payload),JSON.stringify(computedQuote ? { quote:computedQuote } : {}),sourceChannel,externalContactId],
    );

    if (['quote','booking','callback'].includes(type)) {
      const contact = actionContact(fields);
      await q(
        `INSERT INTO leads(id,tenant_id,visitor_ref,name,email,phone,message,status)
         VALUES($1,$2,$3,$4,$5,$6,$7,'new')`,
        [
          uid(),tenant.id,visitorRef,
          String(fields.name || '').slice(0,120) || null,
          contact.email || null,
          contact.phone || null,
          String(fields.details || fields.note || payload.question || '').slice(0,1200) || null,
        ],
      );
    }

    const actionRequest = {
      id,
      type,
      status:'new',
      sourceChannel,
      externalContactId,
      visitorRef,
      payload,
      createdAt:new Date().toISOString(),
    };

    let calendarSync = { status:'not_configured' };
    if (type === 'booking') {
      try {
        calendarSync = await createGoogleCalendarBooking(tenant,actionRequest);
      } catch (e) {
        console.error('Google Calendar booking sync failed',e);
        calendarSync = { status:'failed', error:String(e?.message || 'Calendar sync failed').slice(0,300) };
      }
      await q(
        `UPDATE action_requests
            SET result=COALESCE(result,'{}'::jsonb) || $1::jsonb,updated_at=NOW()
          WHERE id=$2`,
        [JSON.stringify({ calendarSync }),id],
      );
    }

    let delivery = { status:'not_configured', result:null };
    try {
      delivery = await dispatchActionWebhook(tenant, actionRequest);
    } catch (e) {
      console.error('Action webhook delivery failed', e);
      delivery = { status:'failed', result:{ error:String(e?.message || 'Webhook failed').slice(0,500) } };
    }

    await q(
      `UPDATE action_requests
          SET delivery_status=$1,
              result=COALESCE(result,'{}'::jsonb) || $2::jsonb,
              updated_at=NOW()
        WHERE id=$3 AND tenant_id=$4`,
      [delivery.status,JSON.stringify({ webhook:delivery.result || {} }),id,tenant.id],
    );

    await q(
      `INSERT INTO action_events(id,tenant_id,visitor_ref,action_type,label,target,page_url)
       VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [uid(),tenant.id,visitorRef,type,'submitted',null,pageUrl],
    );

    const customerMessage = String(
      delivery.result?.customerMessage ||
      delivery.result?.message ||
      ''
    ).trim().slice(0,1200);

    let checkoutUrl = '';
    let paymentAvailable = false;
    if (type === 'quote' && computedQuote && stripe && tenant.stripe_connected_account_id) {
      try {
        const connected = await stripe.accounts.retrieve(tenant.stripe_connected_account_id);
        paymentAvailable = Boolean(connected.charges_enabled);
        if (paymentAvailable) {
          const checkout = await stripe.checkout.sessions.create(
            {
              mode:'payment',
              client_reference_id:id,
              customer_email:actionContact(fields).email || undefined,
              line_items:[{
                price_data:{
                  currency:'eur',
                  product_data:{
                    name:computedQuote.serviceName || ('Tarjous · ' + tenant.name),
                    description:payload.question ? payload.question.slice(0,450) : undefined,
                  },
                  unit_amount:computedQuote.totalCents,
                },
                quantity:1,
              }],
              metadata:{
                respondo_action_request_id:id,
                respondo_tenant_id:tenant.id,
              },
              success_url:BASE + '/maksu-valmis?action=' + encodeURIComponent(id) + '&session_id={CHECKOUT_SESSION_ID}',
              cancel_url:pageUrl || tenant.website || BASE,
            },
            { stripeAccount:tenant.stripe_connected_account_id },
          );
          checkoutUrl = checkout.url || '';
          await q(
            `UPDATE action_requests
                SET result=COALESCE(result,'{}'::jsonb) || $1::jsonb,updated_at=NOW()
              WHERE id=$2`,
            [JSON.stringify({ checkoutSessionId:checkout.id }),id],
          );
        }
      } catch (e) {
        console.error('Connected Stripe Checkout failed',e);
      }
    }

    return res.json({
      ok:true,
      id,
      status:'new',
      deliveryStatus:delivery.status,
      quote:computedQuote,
      booking:bookedSlot ? {
        startsAt:bookedSlot.starts_at,
        endsAt:bookedSlot.ends_at,
      } : null,
      calendarSync,
      paymentAvailable,
      checkoutUrl,
      customerMessage: customerMessage || (
        type === 'booking' ? 'Ajanvarauspyyntösi on vastaanotettu.' :
        type === 'quote' ? 'Tarjouspyyntösi on vastaanotettu.' :
        type === 'order_status' ? 'Tilaustietojen tarkistuspyyntö on vastaanotettu.' :
        'Yhteydenottopyyntösi on vastaanotettu.'
      ),
    });
  } catch (e) {
    console.error('Action request failed', e);
    return res.status(500).json({ error:'Toiminnon lähetys epäonnistui.' });
  }
});


app.post('/api/app/quote-engine', auth, subscribed, async (req,res) => {
  try {
    const tr = await q('SELECT id FROM tenants WHERE owner_user_id=$1',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const basePrice = Math.max(0, Number(req.body.basePrice || 0));
    const unitPrice = Math.max(0, Number(req.body.unitPrice || 0));
    const minPrice = Math.max(0, Number(req.body.minPrice || 0));
    const vatPercent = Math.min(30, Math.max(0, Number(req.body.vatPercent || 0)));
    const serviceName = String(req.body.serviceName || '').trim().slice(0,120);
    const unitLabel = String(req.body.unitLabel || 'kpl').trim().slice(0,40) || 'kpl';

    await q(
      `UPDATE tenants
          SET quote_service_name=$1,quote_base_price=$2,quote_unit_price=$3,
              quote_min_price=$4,quote_vat_percent=$5,quote_unit_label=$6,updated_at=NOW()
        WHERE id=$7`,
      [serviceName,basePrice,unitPrice,minPrice,vatPercent,unitLabel,tr.rows[0].id],
    );
    return res.json({ ok:true });
  } catch (e) {
    return res.status(400).json({ error:e.message || 'Hintalaskuria ei voitu tallentaa.' });
  }
});

app.post('/api/app/booking-slots/generate', auth, subscribed, async (req,res) => {
  const client = await pool.connect();
  try {
    const tr = await client.query('SELECT id FROM tenants WHERE owner_user_id=$1',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const tenantId = tr.rows[0].id;
    const slots = (Array.isArray(req.body.slots) ? req.body.slots : []).slice(0,300);
    if (!slots.length) return res.status(400).json({ error:'Luo vähintään yksi vapaa aika.' });

    await client.query('BEGIN');
    let saved = 0;
    for (const slot of slots) {
      const start = new Date(slot.start);
      const end = new Date(slot.end);
      if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) continue;
      if (start.getTime() < Date.now() - 60000) continue;
      const inserted = await client.query(
        `INSERT INTO booking_slots(id,tenant_id,starts_at,ends_at,status)
         VALUES($1,$2,$3,$4,'open')
         ON CONFLICT(tenant_id,starts_at) DO NOTHING
         RETURNING id`,
        [uid(),tenantId,start.toISOString(),end.toISOString()],
      );
      saved += inserted.rowCount;
    }
    await client.query('COMMIT');
    return res.json({ ok:true,saved });
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    return res.status(400).json({ error:e.message || 'Vapaita aikoja ei voitu luoda.' });
  } finally {
    client.release();
  }
});

app.delete('/api/app/booking-slots/:id', auth, subscribed, async (req,res) => {
  try {
    const tr = await q('SELECT id FROM tenants WHERE owner_user_id=$1',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const removed = await q(
      `DELETE FROM booking_slots
        WHERE id=$1 AND tenant_id=$2 AND status='open'
        RETURNING id`,
      [req.params.id,tr.rows[0].id],
    );
    if (!removed.rowCount) return res.status(400).json({ error:'Aikaa ei voitu poistaa.' });
    return res.json({ ok:true });
  } catch {
    return res.status(500).json({ error:'Aikaa ei voitu poistaa.' });
  }
});

app.post('/api/app/stripe-connect/onboard', auth, subscribed, async (req,res) => {
  try {
    if (!stripe) return res.status(503).json({ error:'Stripe ei ole käytettävissä.' });
    const tr = await q('SELECT * FROM tenants WHERE owner_user_id=$1',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const tenant = tr.rows[0];
    let accountId = tenant.stripe_connected_account_id;
    if (!accountId) {
      const country = String(req.body.country || 'FI').trim().toUpperCase().slice(0,2) || 'FI';
      const account = await stripe.accounts.create({
        type:'express',
        country,
        capabilities:{
          card_payments:{ requested:true },
          transfers:{ requested:true },
        },
        business_profile:{
          name:tenant.name,
          url:tenant.website || undefined,
        },
        metadata:{ tenant_id:tenant.id, tenant_slug:tenant.slug },
      });
      accountId = account.id;
      await q(
        'UPDATE tenants SET stripe_connected_account_id=$1,updated_at=NOW() WHERE id=$2',
        [accountId,tenant.id],
      );
    }

    const link = await stripe.accountLinks.create({
      account:accountId,
      refresh_url:BASE + '/app?section=automation&stripe=refresh',
      return_url:BASE + '/app?section=automation&stripe=return',
      type:'account_onboarding',
    });
    return res.json({ url:link.url });
  } catch (e) {
    console.error('Stripe Connect onboarding failed', e);
    return res.status(400).json({ error:e.message || 'Stripe-yhdistämistä ei voitu aloittaa.' });
  }
});

app.post('/api/app/integrations', auth, subscribed, async (req,res) => {
  try {
    const tr = await q('SELECT * FROM tenants WHERE owner_user_id=$1',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const tenant = await ensureTenantActionKeys(tr.rows[0]);
    const raw = String(req.body.webhookUrl || '').trim();
    let url = '';
    if (raw) {
      const parsed = await assertPublicHttpUrl(raw);
      if (parsed.protocol !== 'https:') return res.status(400).json({ error:'Webhookin pitää käyttää HTTPS-yhteyttä.' });
      url = parsed.toString();
    }
    await q('UPDATE tenants SET action_webhook_url=$1,updated_at=NOW() WHERE id=$2',[url || null,tenant.id]);
    return res.json({
      ok:true,
      webhookUrl:url,
      webhookSecret:tenant.action_webhook_secret,
      channelsApiKey:tenant.channels_api_key,
    });
  } catch (e) {
    return res.status(400).json({ error:e.message || 'Integraation tallennus epäonnistui.' });
  }
});

app.post('/api/app/integrations/test', auth, subscribed, async (req,res) => {
  try {
    const tr = await q('SELECT * FROM tenants WHERE owner_user_id=$1',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const tenant = await ensureTenantActionKeys(tr.rows[0]);
    if (!tenant.action_webhook_url) return res.status(400).json({ error:'Lisää webhook-osoite ensin.' });
    const delivery = await dispatchActionWebhook(tenant,{
      id:'test_' + Date.now(),
      type:'test',
      status:'test',
      sourceChannel:'dashboard',
      payload:{ message:'RESPONDO Actions 2.0 test' },
      createdAt:new Date().toISOString(),
    });
    if (delivery.status !== 'delivered') return res.status(400).json({ error:'Webhook ei vastannut onnistuneesti.' });
    return res.json({ ok:true,httpStatus:delivery.httpStatus || 200 });
  } catch (e) {
    return res.status(400).json({ error:e.message || 'Webhook-testi epäonnistui.' });
  }
});

app.post('/api/app/action-requests/:id/status', auth, subscribed, async (req,res) => {
  try {
    const status = ['new','in_progress','done'].includes(String(req.body.status)) ? String(req.body.status) : 'done';
    const tr = await q('SELECT id FROM tenants WHERE owner_user_id=$1',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const updated = await q(
      'UPDATE action_requests SET status=$1,updated_at=NOW() WHERE id=$2 AND tenant_id=$3 RETURNING id,status',
      [status,req.params.id,tr.rows[0].id],
    );
    if (!updated.rowCount) return res.status(404).json({ error:'Pyyntöä ei löytynyt.' });
    return res.json(updated.rows[0]);
  } catch (e) {
    return res.status(500).json({ error:'Tilaa ei voitu päivittää.' });
  }
});

app.post('/api/channel/:slug/message', async (req,res) => {
  try {
    const tr = await publicTenant(req.params.slug);
    if (!tr.rowCount) return res.status(404).json({ error:'Yritystä ei löytynyt.' });
    const tenant = await ensureTenantActionKeys(tr.rows[0]);
    const authHeader = String(req.headers.authorization || '');
    if (authHeader !== 'Bearer ' + tenant.channels_api_key) return res.status(401).json({ error:'Virheellinen Channels API -avain.' });

    const channel = String(req.body.channel || 'api').trim().toLowerCase().slice(0,40);
    if (!['api','email','whatsapp','instagram','messenger','sms'].includes(channel)) {
      return res.status(400).json({ error:'Tuntematon kanava.' });
    }
    const contactId = String(req.body.contactId || '').trim().slice(0,220);
    const message = String(req.body.message || '').trim().slice(0,1200);
    const lang = req.body.lang === 'en' ? 'en' : 'fi';
    if (!contactId || !message) return res.status(400).json({ error:'contactId ja message tarvitaan.' });

    const kr = await q('SELECT * FROM knowledge WHERE tenant_id=$1 AND approved=true ORDER BY updated_at DESC,created_at DESC',[tenant.id]);
    const hr = await q(
      `SELECT question,answer,handoff
         FROM conversations
        WHERE tenant_id=$1 AND source_channel=$2 AND external_contact_id=$3
        ORDER BY created_at DESC LIMIT 6`,
      [tenant.id,channel,contactId],
    );
    const history = hr.rows.reverse();
    const result = await generateGroundedAnswer({
      companyName:tenant.name,
      rows:kr.rows,
      message,
      history,
      lang,
      pageContext:{},
    });
    let answer = result.answer;
    if (result.handoff) {
      answer = lang === 'en'
        ? 'I do not have a verified answer yet. A person from the company needs to handle this.'
        : 'Tähän ei löytynyt vielä varmennettua vastausta. Yrityksen henkilön pitää käsitellä tämä.';
    }
    const actions = chatActions(kr.rows,message,result.handoff,lang);
    await q(
      `INSERT INTO conversations(id,tenant_id,question,answer,intent,confidence,source_ids,handoff,visitor_ref,source_channel,external_contact_id)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [uid(),tenant.id,message,answer,result.intent,result.confidence,result.sourceIds,result.handoff,contactId,channel,contactId],
    );
    return res.json({
      answer,
      handoff:result.handoff,
      verified:!result.handoff && Array.isArray(result.sourceIds) && result.sourceIds.length>0,
      intent:result.intent,
      actions,
    });
  } catch (e) {
    console.error('Channels API failed', e);
    return res.status(500).json({ error:'Kanavaviestiä ei voitu käsitellä.' });
  }
});

app.post('/api/public/:slug/action-event', publicChatLimiter, async (req, res) => {
  try {
    const tr = await publicTenant(req.params.slug);
    if (!tr.rowCount) return res.status(404).json({ error: 'Yritystä ei löytynyt.' });
    const tenant = tr.rows[0];
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    body = body || {};

    const origin = requestOrigin(req);
    const baseHost = normalizeHost(BASE);
    const external = Boolean(origin && normalizeHost(origin.hostname) !== baseHost);
    if (external) {
      if (!widgetOriginAllowed(req, tenant)) return res.status(403).json({ error: 'Chat ei ole käytössä tällä verkkosivulla.' });
      try {
        const token = jwt.verify(String(body.widgetToken || ''), JWT);
        if (token.kind !== 'widget' || token.slug !== tenant.slug || token.host !== normalizeHost(origin.hostname)) throw new Error('Invalid token');
      } catch {
        return res.status(403).json({ error: 'Chat ei ole käytössä tällä verkkosivulla.' });
      }
      setWidgetCors(req, res);
    }

    const actionType = String(body.actionType || '').trim().slice(0, 40);
    if (!['quote','booking','order_status','phone','email','link','callback'].includes(actionType)) {
      return res.status(400).json({ error: 'Tuntematon toiminto.' });
    }

    await q(
      `INSERT INTO action_events(id,tenant_id,visitor_ref,action_type,label,target,page_url)
       VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [
        uid(),
        tenant.id,
        String(body.visitorRef || '').slice(0,160) || null,
        actionType,
        String(body.label || '').slice(0,120) || null,
        String(body.target || '').slice(0,1000) || null,
        String(body.pageContext?.url || '').slice(0,1000) || null,
      ],
    );
    return res.json({ ok:true });
  } catch (e) {
    console.error('Action event failed', e);
    return res.status(500).json({ error:'Toiminnon seuranta epäonnistui.' });
  }
});

app.post('/api/billing/portal', auth, async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe ei ole vielä kytketty.' });
    const r = await q('SELECT stripe_customer_id FROM users WHERE id=$1', [req.user.sub]);
    if (!r.rows[0]?.stripe_customer_id) {
      return res.status(400).json({ error: 'Asiakkaan Stripe-tilausta ei löytynyt.' });
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: r.rows[0].stripe_customer_id,
      return_url: `${BASE}/app`,
    });
    return res.json({ url: session.url });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.post('/api/billing/cancel', auth, async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe ei ole vielä kytketty.' });
    const r = await q('SELECT stripe_subscription_id FROM users WHERE id=$1', [req.user.sub]);
    const id = r.rows[0]?.stripe_subscription_id;
    if (!id) return res.status(400).json({ error: 'Tilausta ei löytynyt.' });
    await stripe.subscriptions.update(id, { cancel_at_period_end: true });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/')) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  next();
});

async function ensureRuntimeSchema() {
  if (!pool) return;

  await q('ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan TEXT');
  await q('ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code TEXT');
  await q(`CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await q(
    "INSERT INTO app_settings(key,value) VALUES('owner_test_plan_enabled','true') ON CONFLICT(key) DO NOTHING"
  );
  await q('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code) WHERE referral_code IS NOT NULL');
  await q(`CREATE TABLE IF NOT EXISTS referral_redemptions (
    id UUID PRIMARY KEY,
    referrer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    stripe_discount_applied BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await q('CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referral_redemptions(referrer_user_id, created_at DESC)');

  await q(`CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    visitor_ref TEXT,
    name TEXT,
    email TEXT,
    phone TEXT,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await q('CREATE INDEX IF NOT EXISTS idx_leads_tenant_created ON leads(tenant_id, created_at DESC)');
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS average_lead_value NUMERIC(12,2) NOT NULL DEFAULT 0");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS action_webhook_url TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS action_webhook_secret TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS channels_api_key TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_connected_account_id TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS quote_service_name TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS quote_base_price NUMERIC(12,2) NOT NULL DEFAULT 0");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS quote_unit_price NUMERIC(12,2) NOT NULL DEFAULT 0");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS quote_min_price NUMERIC(12,2) NOT NULL DEFAULT 0");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS quote_vat_percent NUMERIC(6,2) NOT NULL DEFAULT 0");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS quote_unit_label TEXT NOT NULL DEFAULT 'kpl'");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS google_calendar_access_token TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS google_calendar_refresh_token TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS google_calendar_token_expires_at TIMESTAMPTZ");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS google_calendar_email TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS google_calendar_id TEXT NOT NULL DEFAULT 'primary'");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ecommerce_provider TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS shopify_shop_domain TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS shopify_access_token TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS woo_base_url TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS woo_consumer_key TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS woo_consumer_secret TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS meta_graph_version TEXT NOT NULL DEFAULT 'v24.0'");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS meta_verify_token TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS meta_app_secret TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS whatsapp_phone_number_id TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS whatsapp_access_token TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS instagram_account_id TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS instagram_access_token TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS twilio_account_sid TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS twilio_auth_token TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS twilio_phone_number TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS voice_handoff_number TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS voice_enabled BOOLEAN NOT NULL DEFAULT FALSE");




  await q("ALTER TABLE knowledge ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'manual'");
  await q("ALTER TABLE knowledge ADD COLUMN IF NOT EXISTS source_url TEXT");
  await q("ALTER TABLE knowledge ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT TRUE");
  await q("ALTER TABLE knowledge ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()");
  await q("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS page_url TEXT");
  await q("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS page_title TEXT");
  await q("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS source_channel TEXT NOT NULL DEFAULT 'website'");
  await q("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS external_contact_id TEXT");

  await q(`CREATE TABLE IF NOT EXISTS action_events (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    visitor_ref TEXT,
    action_type TEXT NOT NULL,
    label TEXT,
    target TEXT,
    page_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await q('CREATE INDEX IF NOT EXISTS idx_action_events_tenant_created ON action_events(tenant_id, created_at DESC)');
  await q(`CREATE TABLE IF NOT EXISTS self_test_runs (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    answerable_questions INTEGER NOT NULL,
    gaps JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await q('CREATE INDEX IF NOT EXISTS idx_self_test_tenant_created ON self_test_runs(tenant_id, created_at DESC)');
  await q(`CREATE TABLE IF NOT EXISTS action_requests (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    visitor_ref TEXT,
    request_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    result JSONB NOT NULL DEFAULT '{}'::jsonb,
    delivery_status TEXT NOT NULL DEFAULT 'not_configured',
    source_channel TEXT NOT NULL DEFAULT 'website',
    external_contact_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await q('CREATE INDEX IF NOT EXISTS idx_action_requests_tenant_created ON action_requests(tenant_id, created_at DESC)');
  await q(`CREATE TABLE IF NOT EXISTS booking_slots (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id,starts_at)
  )`);
  await q('CREATE INDEX IF NOT EXISTS idx_booking_slots_tenant_start ON booking_slots(tenant_id, starts_at)');
  await q(`CREATE TABLE IF NOT EXISTS chat_threads (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    source_channel TEXT NOT NULL DEFAULT 'website',
    external_contact_id TEXT NOT NULL,
    visitor_ref TEXT,
    mode TEXT NOT NULL DEFAULT 'ai',
    status TEXT NOT NULL DEFAULT 'open',
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id,source_channel,external_contact_id)
  )`);
  await q('CREATE INDEX IF NOT EXISTS idx_chat_threads_tenant_activity ON chat_threads(tenant_id,last_activity_at DESC)');
  await q(`CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    thread_id UUID REFERENCES chat_threads(id) ON DELETE CASCADE,
    source_channel TEXT NOT NULL DEFAULT 'website',
    external_contact_id TEXT,
    visitor_ref TEXT,
    role TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await q('CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_created ON chat_messages(thread_id,created_at ASC)');



  await q("ALTER TABLE tenants ALTER COLUMN accent SET DEFAULT '#111113'");
  await q("UPDATE tenants SET accent='#111113' WHERE accent='#3157ff'");
}

async function start() {
  try {
    await ensureRuntimeSchema();
    try {
      await backfillOwnerTestReceiptOnce();
    } catch (e) {
      console.error('Owner test receipt backfill failed', e);
    }
  } catch (e) {
    console.error('Runtime schema check failed', e);
  }
  app.listen(PORT, () => console.log(`RESPONDO AI listening on ${PORT}`));
}

start();
