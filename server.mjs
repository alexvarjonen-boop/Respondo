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
    if (!action?.url || actions.some((x) => x.url === action.url)) return;
    actions.push(action);
  };

  if (booking && /ajanvaraus|varaa|aika|ajan|booking|appointment/.test(q)) {
    push({ type: 'booking', label: actionLang === 'en' ? 'Book a time' : 'Varaa aika', url: booking });
  }
  if (quote && (handoff || /tarjous|hinta|arvio|kustannus/.test(q))) {
    push({ type: 'quote', label: actionLang === 'en' ? 'Request a quote' : 'Pyydä tarjous', url: quote });
  }
  if (phone && (handoff || /puhelin|soita|soittaa|yhteys/.test(q))) {
    push({ type: 'phone', label: actionLang === 'en' ? 'Call' : 'Soita', url: 'tel:' + phone.replace(/\s+/g, '') });
  }
  if (email && (handoff || /sahkoposti|sähköposti|email|meili|yhteys/.test(q))) {
    push({ type: 'email', label: actionLang === 'en' ? 'Send email' : 'Lähetä sähköposti', url: 'mailto:' + email });
  }
  return actions.slice(0, 3);
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
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(express.text({ type: 'text/plain', limit: '20kb' }));
app.use(rateLimit({ windowMs: 60000, limit: 180, standardHeaders: true, legacyHeaders: false }));
app.use(express.static(path.join(__dirname, 'public')));

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
  if (!code) return res.redirect('/kirjaudu?oauth_error=failed&provider=google');
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
    return res.json({
      tenant,
      referral,
      knowledge: k.rows,
      unanswered: unanswered.rows,
      recentConversations: recent.rows,
      daily: daily.rows,
      gaps: gaps.rows,
      leads: leads.rows,
      actionStats: actionStats.rows,
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
    const { html, finalUrl } = await fetchPublicHtml(website);
    const text = htmlToReadableText(html).slice(0, 26000);
    if (text.length < 80) return res.status(400).json({ error: 'Verkkosivulta ei löytynyt tarpeeksi luettavaa sisältöä.' });
    if (!openai) return res.status(503).json({ error: 'Automaattinen tuonti ei ole juuri nyt käytettävissä.' });

    const prompt = `Poimi alla olevasta yrityksen verkkosivutekstistä VAIN selvästi sivulla kerrotut tiedot.
Älä päättele, täydennä tai keksi mitään. Palauta ainoastaan validi JSON-objekti ilman markdownia.
Avaimet:
pricing, hours, phone, email, services, serviceArea, address, quoteRequestUrl, bookingUrl, notes.
Kaikki arvot ovat merkkijonoja. Jos tietoa ei löydy varmasti, käytä tyhjää merkkijonoa.
services voi olla yksi pilkuilla eroteltu merkkijono. quoteRequestUrl ja bookingUrl saavat olla vain tekstissä näkyviä URL-osoitteita.

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

    const fetched = await fetchPublicHtml(tenant.website);
    const pageText = htmlToReadableText(fetched.html).slice(0, 30000);
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
      actions,
      canLeaveContact: result.handoff,
    });
  } catch (e) {
    console.error('Chat failed', e);
    return res.status(500).json({ error: 'Vastausta ei saatu juuri nyt.' });
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
    if (!['quote','booking','phone','email','link'].includes(actionType)) {
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
  await q("ALTER TABLE knowledge ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'manual'");
  await q("ALTER TABLE knowledge ADD COLUMN IF NOT EXISTS source_url TEXT");
  await q("ALTER TABLE knowledge ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT TRUE");
  await q("ALTER TABLE knowledge ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()");
  await q("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS page_url TEXT");
  await q("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS page_title TEXT");
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
