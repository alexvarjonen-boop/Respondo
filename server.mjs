import { extractBusinessDocument, essentialWebsiteCandidates, essentialWebsiteProfile, usableWebsiteRow } from './website-knowledge.mjs';
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
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
const PORT = Number(process.env.PORT || 3000);
const BASE = (process.env.BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');

const pool = process.env.DATABASE_URL
  ? new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    })
  : null;
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const JWT = process.env.JWT_SECRET || crypto.randomBytes(48).toString('hex');
const COOKIE = 'respondo_session';

const q = (text, params = []) => {
  if (!pool) throw new Error('Tietokantaa ei ole vielä yhdistetty.');
  return pool.query(text, params);
};
const uid = () => crypto.randomUUID();
const cleanEmail = (value) => String(value || '').trim().toLowerCase();

function cleanBotName(value) {
  return String(value || '').replace(/[<>]/g,'').trim().slice(0,40) || 'RESPONDO AI';
}

function cleanBotAvatar(value) {
  const raw = String(value || '').trim();
  if (/^robot-(?:[1-9]|10)$/.test(raw)) return raw;
  const match = raw.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return 'robot-1';
  if (raw.length > 520000) return 'robot-1';
  try {
    const bytes = Buffer.from(match[2],'base64');
    if (!bytes.length || bytes.length > 360000) return 'robot-1';
    return raw;
  } catch {
    return 'robot-1';
  }
}

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
  'me','minä','mina','sinä','sina','se','sen','sitä','sita','myös','myos','vielä','viela','entä','enta',
  'the','a','an','and','or','is','are','do','does','you','your','we','our','what','which','where','when','how',
  'och','eller','ar','är','ni','er','ert','vad','vilka','var','nar','när','hur','det','den','som',
  'this','that','these','those'
].map(word => normalizeSearchText(word)));

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

function knowledgeTopic(value) {
  const t=normalizeSearchText(value);
  if (/^hinnat\b|hinta|hinnoittelu|price|pricing|cost|pris|kostnad/.test(t)) return 'pricing';
  if (/tarjouspyynt|quote|estimate|offert/.test(t)) return 'quote';
  // Keep actual services separate from retail products. Previously both mapped to
  // "services", so "Mitä palveluja teette?" could rank an unrelated product card.
  if(/palvelu|service|services|tjanst|tjänst|tarjoa|erbjud|huolto|pesu|pesut|siistim|raivaus|maalaust|leikkaus|poisvienti|puhdist/.test(t)) return 'services';
  if(/tuote|product|valikoima|selection|sortiment|myy|sell|sku|tuotenumero/.test(t)) return 'products';
  if(/hinta|hinnoittelu|price|pricing|cost|pris|kostnad/.test(t)) return 'pricing';
  if(/auki|opening|hours|oppet|öppet|oppettid/.test(t)) return 'hours';
  if(/toimit|shipping|delivery|nouto|pickup|leverans/.test(t)) return 'delivery';
  if(/palaut|return|refund|vaihto|retur/.test(t)) return 'returns';
  if(/myymala|myymälä|store|location|butik/.test(t)) return 'stores';
  if(/yhteys|contact|puhelin|phone|email|sahkoposti|sähköposti|kontakt|telefon|e-post/.test(t)) return 'contact';
  if(/takuu|warranty|garanti/.test(t)) return 'warranty';
  if(/ajanvaraus|ajanvarauslinkki|booking|appointment|boka|bokning|tidsbokning/.test(t)) return 'booking';
  return '';
}
function queryTopic(query) {
  const q=normalizeSearchText(query);
  if (/tarjou[sk]|quote|estimate|offert/.test(q)) return 'quote';
  if (/osoite|address|adress|sijainti/.test(q)) return 'contact';
  if (!/hinta|maksaa|price|cost|pris|kostar|auki|hours|open|oppet/.test(q) && /mita teette|mitä teette|mita tarjoatte|mitä tarjoatte|mita palvel|mitä palvel|what do you (?:do|offer)|services|vad gor ni|vad gör ni|vad erbjuder|vilka tjänster|vilka tjanster|tjanster|tjänster/.test(q)) return 'services';
  if(/mita myytte|mitä myytte|mita teilta saa|mitä teiltä saa|valikoima|tuotteita|products|what do you sell|what products|vad säljer|vad saljer|sortiment/.test(q)) return 'products';
  if(/hinta|maksaa|hinnoittelu|price|pricing|cost|pris|kostar/.test(q)) return 'pricing';
  if(/auki|aukiolo|opening|hours|open|oppet|öppet|oppettid/.test(q)) return 'hours';
  if(/toimit|shipping|delivery|nouto|pickup|leverans/.test(q)) return 'delivery';
  if(/palaut|return|refund|vaihto|retur/.test(q)) return 'returns';
  if(/myymala|myymälä|myymalat|myymälät|store|stores|butik/.test(q)) return 'stores';
  if(/yhteys|contact|puhelin|phone|email|sahkoposti|sähköposti|kontakt|telefon|e-post/.test(q)) return 'contact';
  if(/takuu|warranty|garanti/.test(q)) return 'warranty';
  if(/ajanvaraus|varaa aika|varata ajan|ajan vara|booking|appointment|boka|bokning|tidsbokning/.test(q)) return 'booking';
  return '';
}
function expandSearchConcepts(value) {
  let text=' '+normalizeSearchText(value)+' ';
  const groups=[
    ['palvelu','palvelut','teette','tarjoatte','tarjoa','service','services','offer','offering','tjanst','tjanster','erbjuder'],
    ['tuote','tuotteet','myytte','myy','valikoima','product','products','sell','selection','range','produkt','produkter','saljer','sortiment'],
    ['hinta','hinnat','maksaa','hinnoittelu','price','prices','pricing','cost','pris','priser','kostar'],
    ['auki','aukiolo','aukioloajat','opening','hours','open','oppet','oppettider'],
    ['osoite','sijainti','missä','missa','address','location','where','adress','var'],
    ['yhteys','puhelin','sahkoposti','sähköposti','contact','phone','email','kontakt','telefon','e-post'],
    ['toimitus','toimitukset','nouto','shipping','delivery','pickup','leverans','avhamtning'],
    ['palautus','palautukset','vaihto','return','returns','refund','retur','byte'],
    ['takuu','warranty','guarantee','garanti'],
    ['yritys','meista','meistä','company','business','about','foretag','företag','om oss']
  ];
  for(const group of groups){
    if(group.some((word)=>text.includes(' '+normalizeSearchText(word)+' '))) text+=' '+group.join(' ');
  }
  return text.trim();
}

function genericCompanyQuestion(value) {
  const q=normalizeSearchText(value);
  return /kerro.*(?:yrityks|teist)|mita teette|mita tarjoatte|mita myytte|mita teilta saa|millainen yritys|what do you do|what do you offer|what do you sell|tell me about|what kind of (?:company|business)|vad gor ni|vad erbjuder ni|vad saljer ni|beratta om/.test(q);
}

// Respond with one grounded service description instead of stitching together
// several imported paragraphs, which often repeat marketing copy.
function briefServiceAnswer(selected) {
  const candidates = [];
  const seen = new Set();
  for (const row of selected) {
    if (knowledgeTopic(String(row.title||'')+' '+String(row.category||'')+' '+String(row.keywords||'')) !== 'services') continue;
    const raw = String(row.answer||'').replace(/\s+/g,' ').trim()
      .replace(/^(?:palvelumme|palvelut|services|tjänster)\s*[:–—-]\s*/i,'');
    for (const sentence of raw.split(/(?<=[.!?])\s+/)) {
      const text=sentence.trim();
      if (text.length<22 || text.length>260) continue;
      if (!/(?:tarjoamme|teemme|palvelui|palveluj|palvelut|pesu|siivou|raiva|maala|huolto|asennu|korjau|kuljet|muutto|we offer|we provide|our services|vi erbjuder|våra tjänster)/i.test(text)) continue;
      if (/(?:varaa|ota yhteyt|contact us|book now|lue lisää|read more|tutustu)/i.test(text)) continue;
      const key=normalizeSearchText(text);
      if (seen.has(key)) continue;
      seen.add(key);
      const score=(/^(?:tarjoamme|teemme|we offer|we provide|vi erbjuder)\b/i.test(text)?40:0)
        + (/(?:ikkunanpes|siivou|raivau|maala|huolto|asennu|korjau|kuljet|muutto)/i.test(text)?20:0)
        + (text.length<=165?10:0)
        - (/(?:helppo|nopea palvelu|luotettavasti|ammattitaitoisesti)/i.test(text)?8:0);
      candidates.push({text,score});
    }
  }
  candidates.sort((a,b)=>b.score-a.score);
  const best=candidates[0]?.text||'';
  return best ? best.replace(/[.!?]+$/,'')+'.' : '';
}

function composeKnowledgeAnswer(selected, query) {
  const topic=queryTopic(query);
  const pieces=[];
  for(const row of selected){
    const rowTopic=knowledgeTopic(String(row.title||'')+' '+String(row.category||'')+' '+String(row.keywords||''));
    if(topic && rowTopic && rowTopic!==topic) continue;
    const text=conciseKnowledgeAnswer(row,query);
    if(!text) continue;
    const normalized=normalizeSearchText(text);
    if(pieces.some((x)=>normalizeSearchText(x).includes(normalized.slice(0,90))||normalized.includes(normalizeSearchText(x).slice(0,90)))) continue;
    pieces.push(text);
    if(pieces.length>=3) break;
  }
  let answer=pieces.join(' ').replace(/\s+/g,' ').trim();
  if(answer.length>520) answer=answer.slice(0,517).replace(/\s+\S*$/,'')+'…';
  return answer;
}

function scoreKnowledgeRow(row, query) {
  const q=expandSearchConcepts(query), qTokens=searchTokens(q);
  const title=normalizeSearchText(row.title), answer=normalizeSearchText(row.answer);
  const category=normalizeSearchText(row.category||'');
  const keywordText=normalizeSearchText((row.keywords||[]).join(' '));
  let score=0;
  if(title && q.includes(title)) score+=14;
  for(const rawKeyword of row.keywords||[]){
    const kw=normalizeSearchText(rawKeyword);
    if(kw && (q.includes(kw)||kw.includes(q))) score+=9;
  }
  const titleTokens=new Set(searchTokens(title)), answerTokens=new Set(searchTokens(answer)), keywordTokens=new Set(searchTokens(keywordText));
  for(const token of qTokens){
    if(titleTokens.has(token)) score+=5;
    if(keywordTokens.has(token)) score+=5;
    if(answerTokens.has(token)) score+=1.2;
    const stem=token.slice(0,Math.min(6,token.length));
    if(stem.length>=4){
      if([...titleTokens].some(x=>x.startsWith(stem))) score+=2;
      if([...keywordTokens].some(x=>x.startsWith(stem))) score+=2;
    }
  }
  const wanted=queryTopic(query);
  const rowTopic=knowledgeTopic(title+' '+category+' '+keywordText+' '+String(row.source_url||''));
  if(wanted && rowTopic===wanted) score+=30;
  else if(wanted && rowTopic && rowTopic!==wanted) score-=8;
  if(/terms of service|privacy policy|kayttoeh|käyttöeh|tietosuoja|cookie policy/.test(answer)) score-=60;
  return score;
}

function selectRelevantKnowledge(rows, query, limit = 6) {
  const q = normalizeSearchText(query);
  const wantedTopic = queryTopic(query);
  // A service-specific price question must not return the price of an unrelated
  // service just because both price rows share the category/keywords 'Hinnat'.
  const priceSubjects = wantedTopic === 'pricing' ? searchTokens(query).filter(word =>
    word.length >= 4 && !/^(?:hinn|hint|maks|kustann|palvel|service|price|pricing|cost|much$|per$|hour|tunt|euro|eur$|pris|kost|vilken|mycket$|paljon|alka|from$|starting|does$|finns$|teetteko$)/.test(word)
  ) : [];
  const legalQuery = /tietosuoja|privacy|käyttöeh|kayttoeh|terms|ehto|cookie|eväste|evaste|gdpr/.test(q);
  return rows
    .filter(usableWebsiteRow)
    .filter((x) => normalizeSearchText(x.title) !== 'vastaustyyli')
    .filter((x) => !importedKnowledgeJunk(String(x.title||'')+' '+String(x.answer||'')))
    .filter((x) => {
      if (legalQuery) return true;
      const hay = normalizeSearchText(String(x.title||'')+' '+String(x.category||'')+' '+String(x.source_url||x.sourceUrl||'')+' '+String(x.answer||'').slice(0,700));
      return !/terms of service|privacy policy|tietosuoja|kayttoeh|käyttöeh|cookie policy|evaste|eväste|legal notice/.test(hay);
    })
    .filter((x) => {
      const wanted=wantedTopic;
      if(!wanted) return true;
      const rowTopic=knowledgeTopic(String(x.title||'')+' '+String(x.category||'')+' '+String(x.keywords||'')+' '+String(x.source_url||x.sourceUrl||''));
      // For explicit intents, a row classified as another intent must never be used
      // merely because a few generic words overlap.
      if(rowTopic && rowTopic!==wanted) return false;
      if(wanted==='pricing' && priceSubjects.length) {
        const evidence=searchTokens(String(x.title||'')+' '+String(x.answer||''));
        return priceSubjects.some(subject => evidence.some(token => token.slice(0,6)===subject.slice(0,6)));
      }
      return true;
    })
    .map((x) => ({ ...x, _score: scoreKnowledgeRow(x, query) }))
    .filter((x) => x._score >= 2)
    .sort((a, b) => b._score - a._score)
    .slice(0, limit);
}


function knowledgeValue(rows, title) {
  const wanted = normalizeSearchText(title);
  const matches = rows.filter((x) => normalizeSearchText(x.title) === wanted);
  // Prefer explicit profile/demo values over older imported/saved rows. This is
  // especially important in dashboard preview where the form value must win.
  const row = matches.find((x) => String(x.id || '').startsWith('demo-')) || matches[0];
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
  if (/tilausnumero|tilaukseni|tilauksen tila|order status|where is my order|seuranta|orderstatus|var är min beställning|var ar min bestallning/.test(q)) return 'Tilauksen tila';
  if (/ajanvaraus|varaa aika|ajan vara|booking|appointment|boka|bokning|tidsbokning/.test(q)) return 'Ajanvaraus';
  if (/tarjou[sk]|arvio|quote|estimate|offert|prisforslag|prisförslag/.test(q)) return 'Tarjouspyyntö';
  if (/hinta|maksaa|hinnoittelu|kustannus|price|cost|pricing|pris|kostar|kostnad/.test(q)) return 'Hinta';
  if (/auki|lauantai|sunnuntai|viikonloppu|kello|opening|open|hours|öppet|oppet|öppettider|oppettider/.test(q)) return 'Aukioloajat';
  if (/puhelin|sahkoposti|sähköposti|yhteys|yhteytta|yhteyttä|yhteystiedot|ottaa yhteytta|ottaa yhteyttä|soittaa|phone|email|contact|contact us|get in touch|telefon|e-post|kontakt|kontakta|ringa/.test(q)) return 'Yhteystiedot';
  if (/missä|missa|osoite|toimialue|alue|where|address|location|adress|område|omrade/.test(q)) return 'Sijainti';
  if (/palvelu|teette|tarjoatte|onnistuuko|tuote|valikoima|mitä teiltä saa|mita teilta saa|service|services|offer|product|selection|sell|tjänst|tjanst|tjänster|tjanster|erbjuder/.test(q)) return 'Palvelut';
  return 'Asiakaskysymys';
}

function chatActions(rows, message, handoff = false, lang = 'fi') {
  const actionLang = ['fi','sv','en'].includes(String(lang || '').toLowerCase()) ? String(lang).toLowerCase() : 'fi';
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

  if (/puhelin|sahkoposti|yhteys|yhteytta|yhteystiedot|ottaa yhteytta|soittaa|phone|email|contact|get in touch|telefon|e-post|kontakt|kontakta|ringa/.test(q)) {
    if (phone) push({ type: 'contact', mode: 'phone', label: actionLang === 'en' ? 'Call us' : actionLang === 'sv' ? 'Ring oss' : 'Soita', url: 'tel:' + phone.replace(/\s+/g,'') });
    if (email) push({ type: 'contact', mode: 'email', label: actionLang === 'en' ? 'Send email' : actionLang === 'sv' ? 'Skicka e-post' : 'Lähetä sähköposti', url: 'mailto:' + email });
    if (!phone && !email) push({ type: 'contact', mode: 'contact_form', label: actionLang === 'en' ? 'Leave your contact details' : actionLang === 'sv' ? 'Lämna dina kontaktuppgifter' : 'Jätä yhteystiedot' });
  }

  if (/tilausnumero|tilaukseni|tilauksen tila|seuranta|order status|where is my order|orderstatus|var är min beställning|var ar min bestallning/.test(q)) {
    push({ type: 'order_status', mode: 'order_form', label: actionLang === 'en' ? 'Check order status' : actionLang === 'sv' ? 'Kontrollera orderstatus' : 'Tarkista tilauksen tila' });
  }

  if (/ajanvaraus|varaa|aika|ajan|booking|appointment|boka|bokning|tidsbokning/.test(q)) {
    push({ type: 'booking', mode: 'booking_form', label: actionLang === 'en' ? 'Book a time' : actionLang === 'sv' ? 'Boka tid' : 'Varaa aika' });
    if (booking) push({ type: 'booking', label: actionLang === 'en' ? 'Open calendar' : actionLang === 'sv' ? 'Öppna bokningen' : 'Avaa ajanvaraus', url: booking });
  }

  if (/tarjou[sk]|hinta-arvio|arvio|kustannusarvio|quote|estimate|offert|prisförslag|prisforslag/.test(q)) {
    if (!quote) push({ type: 'quote', mode: 'quote_form', label: actionLang === 'en' ? 'Request a quote' : actionLang === 'sv' ? 'Begär offert' : 'Pyydä tarjous' });
    if (quote) push({ type: 'quote', label: actionLang === 'en' ? 'Open quote form' : actionLang === 'sv' ? 'Öppna offertformuläret' : 'Avaa tarjouslomake', url: quote });
  }

  if (/soittakaa|ottakaa yhteytta|ottakaa yhteyttä|yhteydenotto|call me|contact me|ring mig|kontakta mig/.test(q)) {
    push({ type: 'callback', mode: 'lead', label: actionLang === 'en' ? 'Request a callback' : actionLang === 'sv' ? 'Be om kontakt' : 'Pyydä yhteydenottoa' });
  }

  if (phone && (handoff || /puhelin|soita|soittaa|yhteys|phone|call|telefon|ringa|kontakt/.test(q))) {
    push({ type: 'phone', label: actionLang === 'en' ? 'Call' : actionLang === 'sv' ? 'Ring' : 'Soita', url: 'tel:' + phone.replace(/\s+/g, '') });
  }
  if (email && (handoff || /sahkoposti|sähköposti|email|e-mail|meili|yhteys|e-post|contact|kontakt/.test(q))) {
    push({ type: 'email', label: actionLang === 'en' ? 'Send email' : actionLang === 'sv' ? 'Skicka e-post' : 'Lähetä sähköposti', url: 'mailto:' + email });
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

async function fetchPublicResource(value, acceptedTypes, maxBytes = 2_000_000) {
  let url = await assertPublicHttpUrl(value);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    for (let redirects = 0; redirects < 4; redirects++) {
      const response = await fetch(url, {redirect:'manual',signal:controller.signal,headers:{'User-Agent':'RESPONDO-Website-Importer/2.0'}});
      if ([301,302,303,307,308].includes(response.status)) {
        const location = response.headers.get('location');
        await response.body?.cancel();
        if (!location) throw new Error('Verkkosivun uudelleenohjaus epäonnistui.');
        url = await assertPublicHttpUrl(new URL(location,url).href);
        continue;
      }
      if (!response.ok) { await response.body?.cancel(); throw new Error('Verkkosivua ei saatu luettua.'); }
      const type = String(response.headers.get('content-type') || '').toLowerCase();
      if (!acceptedTypes.some(x=>type.includes(x)) || Number(response.headers.get('content-length')||0)>maxBytes) {
        await response.body?.cancel(); throw new Error('Verkkosivun sisältöä ei voitu lukea.');
      }
      const reader=response.body?.getReader();
      if (!reader) throw new Error('Verkkosivun sisältö puuttuu.');
      const chunks=[]; let total=0;
      try {
        while (true) {
          const {done,value}=await reader.read();
          if (done) break;
          total+=value.byteLength;
          if (total>maxBytes) { await reader.cancel(); throw new Error('Verkkosivu on liian suuri automaattiseen tuontiin.'); }
          chunks.push(Buffer.from(value));
        }
      } finally { reader.releaseLock(); }
      return {text:Buffer.concat(chunks,total).toString('utf8'),finalUrl:url.href};
    }
    throw new Error('Verkkosivulla on liikaa uudelleenohjauksia.');
  } finally { clearTimeout(timer); }
}
async function fetchPublicHtml(value) {
  const result=await fetchPublicResource(value,['text/html','application/xhtml+xml']);
  return {html:result.text,finalUrl:result.finalUrl};
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

async function fetchPublicText(value, acceptedTypes = ['text/plain']) {
  try { return (await fetchPublicResource(value,acceptedTypes)).text; } catch { return ''; }
}

async function discoverSitemapUrls(baseUrl, limit = 120) {
  const base = new URL(baseUrl);
  const visited = new Set();
  const deadline = Date.now()+12000;
  const candidates = [new URL('/sitemap.xml',base).toString(), new URL('/sitemap_index.xml',base).toString()];
  const robots = await fetchPublicText(new URL('/robots.txt',base).toString(), ['text/plain']);
  for (const match of robots.matchAll(/^\s*Sitemap:\s*(\S+)/gim)) candidates.push(match[1]);
  const found = new Set();
  const sitemapQueue = [...new Set(candidates)].slice(0,8);
  while (sitemapQueue.length && found.size < limit && visited.size < 5 && Date.now()<deadline) {
    const mapUrl = sitemapQueue.shift();
    if (visited.has(mapUrl)) continue;
    visited.add(mapUrl);
    const xml = await fetchPublicText(mapUrl,['xml','text/plain']);
    if (!xml) continue;
    for (const m of xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)) {
      const raw = String(m[1]||'').replace(/&amp;/g,'&').trim();
      try {
        const u = new URL(raw,base);
        if (u.hostname.toLowerCase() !== base.hostname.toLowerCase()) continue;
        if (/\.xml(?:$|\?)/i.test(u.pathname)) {
          if (sitemapQueue.length < 20) sitemapQueue.push(u.toString());
          continue;
        }
        if (!/\.(pdf|jpg|jpeg|png|gif|svg|webp|zip|docx?|xlsx?)$/i.test(u.pathname)) found.add(u.toString());
      } catch {}
      if (found.size >= limit) break;
    }
  }
  return [...found];
}

function extractSameSiteScriptUrls(html, baseUrl) {
  const out=[]; const seen=new Set(); let base;
  try { base=new URL(baseUrl); } catch { return out; }
  for(const m of String(html||'').matchAll(/<script[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi)){
    try{
      const u=new URL(String(m[1]||'').replace(/&amp;/gi,'&'),base);
      if(u.hostname.toLowerCase()!==base.hostname.toLowerCase()) continue;
      if(!/\.m?js(?:$|\?)/i.test(u.pathname+u.search)) continue;
      const key=u.toString(); if(seen.has(key)) continue; seen.add(key); out.push(key);
    }catch{}
  }
  return out.slice(0,12);
}

function javascriptToReadableText(source) {
  const values=[]; const seen=new Set();
  // Extract human-facing string literals without executing third-party JavaScript.
  const re=/(["'`])((?:\\.|(?!\1)[\s\S]){3,500}?)\1/g;
  let m;
  while((m=re.exec(String(source||''))) && values.length<2500){
    let value=String(m[2]||'')
      .replace(/\\n/g,' ').replace(/\\t/g,' ').replace(/\\(["'`\\])/g,'$1')
      .replace(/\$\{[^}]{0,180}\}/g,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
    if(value.length<8 || value.length>420) continue;
    if(/^(?:https?:|\/|#|\.|[a-z0-9_-]+\.(?:js|css|png|svg|webp))/.test(value.toLowerCase())) continue;
    if(!/[A-Za-zÀ-ž]/.test(value)) continue;
    // Keep strings likely to be customer-facing copy, especially prices, trial terms and sentences.
    if(!(/[€$£]|\b\d+[,.]?\d*\s*(?:€|eur|%|päiv|day|dag|kk|month|mån|vuosi|year|år)\b/i.test(value) || /[.!?]/.test(value) || value.split(/\s+/).length>=3)) continue;
    const key=normalizeSearchText(value); if(!key||seen.has(key)) continue; seen.add(key); values.push(value);
  }
  return values.join('\n');
}

async function fetchClientRenderedSourceText(html, pageUrl) {
  const docs=[];
  for(const scriptUrl of extractSameSiteScriptUrls(html,pageUrl)){
    const js=await fetchPublicText(scriptUrl,['javascript','text/plain']);
    if(!js) continue;
    const text=javascriptToReadableText(js).slice(0,45000);
    if(text.length>=30) docs.push({url:scriptUrl,text});
  }
  return docs;
}

async function fetchWebsiteBundle(value, maxPages = 10000, timeBudgetMs = 65000, onProgress = null) {
  const crawlStartedAt = Date.now();
  const first = await fetchPublicHtml(value);
  const base = new URL(first.finalUrl);
  const pages = [];
  const queued = new Set();
  const queue = [];
  const usefulPath = url => !/privacy|terms|tietosuoja|kayttoeh|cookie|arvostel|reviews|testimonial|blog|uutis|news|cart|checkout|login|register|wp-admin|\.(?:js|css|mp4|mp3|woff2?)$/i.test(new URL(url).pathname);
  const priority = url => /tarjous|quote|offert|hinta|price|pris|palvel|service|tjanst|yhtey|contact|kontakt|auki|hours|oppet/i.test(normalizeSearchText(url)) ? 100 : 0;

  const enqueue = (html, pageUrl) => {
    for (const link of extractSameSiteLinks(html, pageUrl)) {
      let u;
      try { u = new URL(link); } catch { continue; }
      if (u.hostname.toLowerCase() !== base.hostname.toLowerCase() || !usefulPath(u.href)) continue;
      const key = u.origin + u.pathname.replace(/\/$/, '') + u.search;
      if (queued.has(key) || pages.some((x) => x.key === key)) continue;
      queued.add(key);
      const p = normalizeSearchText(u.pathname + ' ' + u.search);
      let score = priority(u.href);
      if (/faq|ukk|kysym|help|ohje|support/.test(p)) score += 18;
      if (/toimit|delivery|shipping|nouto|pickup/.test(p)) score += 16;
      if (/palaut|return|refund|vaihto/.test(p)) score += 16;
      if (/myymala|myymälä|store|shop|location/.test(p)) score += 15;
      if (/ajanvaraus|booking|appointment/.test(p)) score += 14;
      if (/tarjous|quote|request/.test(p)) score += 13;
      if (/hinta|price|pricing/.test(p)) score += 12;
      if (/palvelu|service/.test(p)) score += 11;
      if (/yhteys|contact/.test(p)) score += 10;
      if (/takuu|warranty|maksu|payment|kanta|loyal/.test(p)) score += 9;
      if (/meista|about/.test(p)) score += 5;
      queue.push({ url:u.toString(), score });
    }
    queue.sort((a,b) => b.score - a.score);
  };

  queued.add(first.finalUrl);
  pages.push({ url:first.finalUrl, key:first.finalUrl.replace(/\/$/, ''), document:extractBusinessDocument(first.html,first.finalUrl) });
  enqueue(first.html, first.finalUrl);

  // Sitemaps expose pages that client-rendered navigation may not reveal in raw HTML.
  let sitemapUrls = [];
  try { sitemapUrls = await discoverSitemapUrls(first.finalUrl, 10000); } catch (e) { console.warn('Sitemap discovery skipped', e?.message || e); }
  for (const link of sitemapUrls) {
    let u;
    try { u = new URL(link); } catch { continue; }
    if (!usefulPath(u.href)) continue;
    const key = u.origin + u.pathname.replace(/\/$/, '') + u.search;
    if (queued.has(key) || pages.some((x) => x.key === key)) continue;
    queued.add(key);
    const p = normalizeSearchText(u.pathname + ' ' + u.search);
    let score = 4 + priority(u.href);
    if (/faq|ukk|kysym|help|ohje|support/.test(p)) score += 18;
    if (/toimit|delivery|shipping|nouto|pickup|palaut|return|refund|vaihto/.test(p)) score += 16;
    if (/myymala|myymälä|store|shop|location/.test(p)) score += 15;
    if (/hinta|price|pricing|palvelu|service|yhteys|contact/.test(p)) score += 12;
    queue.push({url:u.toString(),score});
  }
  queue.sort((a,b)=>b.score-a.score);
  const totalTarget = Math.max(1, Math.min(maxPages, pages.length + queue.length));
  if (onProgress) onProgress({scanned:pages.length,total:totalTarget});

  while (queue.length && pages.length < maxPages) {
    if (Date.now() - crawlStartedAt > timeBudgetMs) break;
    const next = queue.shift();
    if (!next || pages.some((x) => x.url === next.url)) continue;
    try {
      const page = await fetchPublicHtml(next.url);
      const resolved = new URL(page.finalUrl);
      if (resolved.hostname.toLowerCase() !== base.hostname.toLowerCase()) continue;
      const key = resolved.origin + resolved.pathname.replace(/\/$/, '') + resolved.search;
      if (pages.some((x) => x.key === key)) continue;
      pages.push({ url:page.finalUrl, key, document:extractBusinessDocument(page.html,page.finalUrl) });
      enqueue(page.html, page.finalUrl);
      if (onProgress) onProgress({scanned:pages.length,total:Math.max(totalTarget,Math.min(maxPages,pages.length+queue.length))});
    } catch {}
  }

  const pageDocuments = pages.map((page) => ({
    url:page.url,
    ...page.document,
  })).filter((page) => page.text.length > 0 || page.links.length > 0);

  // SPA/client-rendered sites often keep their visible copy in same-origin JS bundles.
  // Read strings from those bundles without executing them so prices, trial terms and
  // other customer-facing facts are available to the importer.
  // Do not ingest JavaScript bundle literals as business facts. They contain UI copy,
  // translations and source-code fragments and are not trustworthy customer knowledge.

  const text = pageDocuments
    .map((page) => 'SIVU: ' + page.url + '\n' + page.text)
    .join('\n\n---\n\n')
    .slice(0, 900000);

  return {
    finalUrl:first.finalUrl,
    text,
    pageDocuments,
    pages:pageDocuments.map((x) => x.url),
    links:[...new Set(pageDocuments.flatMap(doc => doc.links.map(link => link.url)))].slice(0, 10000),
  };
}

function importedKnowledgeJunk(value) {
  const raw = String(value || '').replace(/\s+/g, ' ').trim();
  const text = normalizeSearchText(raw);
  if (!text) return true;
  // Never let navigation, widgets, product-card chrome or source-code fragments
  // become customer knowledge. These strings are common on retailer/CMS pages.
  if (/(cookie|evasteaset|privacy policy|tietosuojaseloste|terms of service|kayttoehdot|copyright|kaikki oikeudet pidatetaan|hyvaksy evaste|all rights reserved|localstorage|sessionstorage|queryselector|addeventlistener|json stringify|json parse|supported includes)/.test(text)) return true;
  if (/(skip to content|toggle nav|toggle navigation|ved[aä] liukus[aä][aä]dint[aä]|n[aä]hd[aä]ksesi muutos|katso video ty[oö]n etenemisest[aä]|arvostelut?\s*\(\s*\)|lis[aä][aä] ostoskoriin|add to cart|tuotenumero\s*[:#]?|product code\s*[:#]?|sku\s*[:#]?|varaa aika\s+ota yhteytt[aä]|helppo ja nopea palvelu\s+varaa aika)/i.test(raw)) return true;
  if (/(const |let |var |function |document |window |=>|webpack|sourceMappingURL)/i.test(raw)) return true;
  // A long run of menu/category labels without sentence punctuation is not a fact.
  const words = text.split(' ').filter(Boolean);
  if (words.length >= 12 && !/[.!?]/.test(raw) && /(?:tuotteet|myymalat|myymälät|kampanja|nav|menu|kategori|category)/i.test(raw)) return true;
  return false;
}

function importedKnowledgeQuality(item) {
  const title = String(item?.title || '').trim();
  const answer = String(item?.answer || '').replace(/\s+/g,' ').trim();
  if (!title || !answer || importedKnowledgeJunk(title + ' ' + answer)) return -1000;
  let score = 0;
  const topic = knowledgeTopic(String(item?.category || '') + ' ' + title + ' ' + answer.slice(0,500));
  if (topic) score += 25;
  if (/[€$£]|\b\d+[,.]?\d*\s*(?:eur|%|paiv|day|dag|kk|month|vuosi|year)\b/i.test(answer)) score += 7;
  if (answer.length >= 70 && answer.length <= 700) score += 8;
  if (title.length >= 12 && title.length <= 100) score += 4;
  if (/^(?:respondo ai|etusivu|home|homepage)(?:\s*[-|–—:]|$)/i.test(title)) score -= 35;
  if (/^(?:respondo ai|etusivu|home|homepage)(?:\s*[-|–—:]|$)/i.test(answer)) score -= 25;
  if (/^(?:menu|navigation|skip to|kirjaudu|login|sign in|rekisteroidy|register)\b/i.test(answer)) score -= 25;
  return score;
}

function websiteKnowledgeCandidates(bundle) {
  return essentialWebsiteCandidates(bundle);
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
  for (const fact of Array.isArray(profile.customFacts) ? profile.customFacts.slice(0, 1000) : []) {
    add(String(fact?.key || '').slice(0, 180), String(fact?.answer || '').slice(0, 1500), searchTokens(fact?.key || '').slice(0, 12));
  }
  return rows;
}

const freeTranslationCache = new Map();

async function translateTextFree(text, lang, sourceLang = 'auto') {
  const target = ['fi','sv','en'].includes(String(lang || '').toLowerCase()) ? String(lang).toLowerCase() : 'fi';
  const source = ['fi','sv','en','auto'].includes(String(sourceLang || '').toLowerCase()) ? String(sourceLang).toLowerCase() : 'auto';
  const input = String(text || '').trim();
  if (!input) return '';
  if (source === target) return input;

  const key = source + '>' + target + ':' + input;
  if (freeTranslationCache.has(key)) return freeTranslationCache.get(key);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5500);
  try {
    const url = new URL('https://translate.googleapis.com/translate_a/single');
    url.search = new URLSearchParams({
      client: 'gtx',
      sl: source,
      tl: target,
      dt: 't',
      q: input.slice(0, 5000),
    }).toString();

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const payload = await response.json();
    const translated = Array.isArray(payload?.[0])
      ? payload[0].map((part) => Array.isArray(part) ? String(part[0] || '') : '').join('').trim()
      : '';
    if (!translated) throw new Error('Empty translation');

    freeTranslationCache.set(key, translated);
    if (freeTranslationCache.size > 2500) {
      [...freeTranslationCache.keys()].slice(0, 500).forEach((cacheKey) => freeTranslationCache.delete(cacheKey));
    }
    return translated;
  } catch (e) {
    console.warn('Free translation failed', target, e?.message || e);
    return '';
  } finally {
    clearTimeout(timer);
  }
}

async function forceAnswerLanguage(answer, lang) {
  const target = ['fi','sv','en'].includes(String(lang || '').toLowerCase()) ? String(lang).toLowerCase() : 'fi';
  const text = String(answer || '').trim();
  if (!text) return text;
  // Never send URLs through machine translation. Translators can turn URL path
  // segments such as /contact-us into translated prose and break the link.
  const urls = [];
  const protectedText = text.replace(/https?:\/\/[^\s<>"']+/gi, (url) => {
    const token = 'RESPONDOURLTOKEN' + urls.length + 'X';
    urls.push(url);
    return token;
  });
  return translateTextFree(protectedText, target, 'auto').then((translated) => {
    if (!translated) return translated;
    return translated.replace(/RESPONDOURLTOKEN(\d+)X/gi, (_, index) => urls[Number(index)] || '');
  });
}

function specificServiceConfirmation(query, rows) {
  const q = normalizeSearchText(query);
  const m = q.match(/^(teetteko|pesetteko|leikkaatteko|maalaatteko|raivaatteko|puhdistatteko|huollatteko|asennatteko|korjaatteko|vietteko)\s+(.+)$/);
  if (!m) return '';
  const verbs = {teetteko:['teemme',''],pesetteko:['pesemme','pes'],leikkaatteko:['leikkaamme','leikka'],maalaatteko:['maalaamme','maal'],raivaatteko:['raivaamme','raiva'],puhdistatteko:['puhdistamme','puhdist'],huollatteko:['huollamme','huol'],asennatteko:['asennamme','asenn'],korjaatteko:['korjaamme','korja'],vietteko:['viemme','poisvienti|kuljet|viemme']};
  const [verb, action] = verbs[m[1]];
  const tokens = m[2].split(' ').filter(x => !['myos','ja','seka','pois','te','teilla'].includes(x));
  if (!tokens.length || tokens.some(x => /ilmai|tanaan|huomen|heti|tunnissa|viikonlopp|yo|aina|kaikki|koko/.test(x) || /\d/.test(x))) return '';
  const stem = token => token.replace(/(?:uja|yja|oja|eja|ia|ja|jen|ssa|sta|lla|lle|ksi|tta|t|n)$/,'');
  const stems = tokens.map(stem);
  if (stems.some(x => x.length < 4)) return '';
  const support = rows.filter(usableWebsiteRow).find(row => {
    const text = normalizeSearchText(row.answer);
    if (/\b(?:ei|emme|eivat|not|don't|inte|aldrig)\b/.test(text)) return false;
    if (knowledgeTopic(row.category+' '+row.title) !== 'services') return false;
    return stems.every(x => text.includes(x)) && (!action || new RegExp(action).test(text));
  });
  if (!support) return '';
  const phrase = String(query).trim().replace(/^\S+\s+/,'').replace(/[?!.]+$/,'').toLowerCase();
  return 'Kyllä, '+verb+' '+phrase+'.';
}

// Short Finnish service follow-ups must be answered from service-specific evidence,
// not by concatenating the previous question with an unrelated imported paragraph.
function finnishServiceStem(word) {
  return normalizeSearchText(word).replace(/[^a-z]/g,'')
    .replace(/(?:oista|eista|uista|yista|oissa|eissa|uissa|yissa|ojen|oita|eita|uita|yita|eja|oja|uja|yja|ien|jen|ita|ista|issa|illa|ille|ssa|sta|lla|lle|ksi|ja|it|n|t)$/,'');
}

function groundedFinnishServiceReply(message, history, rows) {
  const q=normalizeSearchText(message);
  const direct=q.match(/^(teetteko|pesetteko|puhdistatteko|huollatteko|asennatteko|maalaatteko|korjaatteko|raivaatteko|vietteko)\s+([a-z-]+)$/);
  const follow=q.match(/^(?:enta|mites|ja)\s+([a-z-]+)$/);
  const order=q.match(/^voiko\s+teilta\s+tilata\s+([a-z]+(?:\s+[a-z]+){0,2})$/);
  if (!direct && !follow && !order) return null;
  // Never interpret timing, price, a discount, or multiple requested services
  // as a simple positive service confirmation.
  if (queryTopic(message) && !direct && !order) return null;

  const approved=rows.filter(row=>{
    if (!usableWebsiteRow(row)) return false;
    const meta=normalizeSearchText(String(row.category||'')+' '+String(row.title||''));
    if (/arvost|review|testimonial|asiakaskokem/.test(meta)) return false;
    if (importedKnowledgeJunk(String(row.title||'')+' '+String(row.answer||''))) return false;
    return knowledgeTopic(String(row.category||'')+' '+String(row.title||''))==='services';
  });

  if (order) {
    const subject=order[1].trim();
    const words=searchTokens(subject);
    const found=words.length>=1 && words.length<=3 && approved.find(row=>{
      // An explicit, approved service name is proof that the service can be
      // requested. Similar text in a generic marketing paragraph is not.
      const title=searchTokens(row.title);
      return words.every(w=>title.some(t=>t.slice(0,Math.min(6,t.length))===w.slice(0,Math.min(6,w.length))));
    });
    if (!found) return {supported:false};
    const requested=String(message).trim().replace(/^voiko\s+teilt[aä]\s+tilata\s+/i,'').replace(/[?!.]+$/,'').toLowerCase();
    return {supported:true,answer:'Kyllä, voit tilata meiltä '+requested+'.',evidence:[found]};
  }

  let verb=direct?.[1] || '';
  if (follow) {
    // Only carry the previous *service action* across a chain of adjacent
    // follow-ups. A contact, price, or unrelated question breaks the chain.
    for (const event of history.slice(-4).reverse()) {
      const previous=normalizeSearchText(event.question||event.user||'');
      const match=previous.match(/^(teetteko|pesetteko|puhdistatteko|huollatteko|asennatteko|maalaatteko|korjaatteko|raivaatteko|vietteko)\b/);
      if (match) {verb=match[1];break;}
      if (!/^(?:enta|mites|ja)\s+[a-z-]+$/.test(previous)) break;
    }
    if (!verb) return {supported:false};
  }

  const noun=direct?.[2]||follow?.[1];
  const root=finnishServiceStem(noun);
  if (root.length<4 || /^(?:hinta|hinnat|ilmainen|huomenna|tanaan|lauantai|sunnuntai)$/.test(noun)) return {supported:false};

  const candidates=[];
  for (const row of approved) {
    // Check the same service clause, not an unrelated action elsewhere in
    // the company's description (e.g. "install gutters and wash roofs").
    const clauses=String(row.answer||'').split(/(?<=[.!?;])\s+|\s+(?:sekä|ja)\s+|[&;]/i);
    for (const clause of clauses) {
      const text=normalizeSearchText(clause);
      if (/\b(?:ei|emme|eivat|not|inte|aldrig)\b/.test(text)) continue;
      const words=text.split(/[\s-]+/).filter(Boolean);
      let qualifiedNoun='';
      const nounFound=words.some(word=>{
        const evidenceStem=finnishServiceStem(word);
        if (evidenceStem===root) return true;
        if (root.length>=5 && evidenceStem.startsWith(root) &&
            /^(?:an?|en?)(?:pes|puhdist|huolto|asenn|maala)/.test(evidenceStem.slice(root.length))) return true;
        // A broad roof question can be supported by a narrower, explicitly
        // listed roof type, but the reply must name that subtype rather than
        // claiming that every roof material is covered.
        if (root==='katt' && evidenceStem.length>root.length+2 &&
            evidenceStem.endsWith(root) && /^[a-z]{3,}katto(?:ja|jen)$/.test(word)) {
          qualifiedNoun=word.replace(/kattojen$/,'kattoja');
          return true;
        }
        return false;
      });
      if (!nounFound) continue;
      const cleaning= /puhdist|pesu|pese|pesem|siivou/.test(text);
      const transport=/poisvien|kuljet|noud|kierraty/.test(text);
      const type=/puhdist/.test(text)?'puhdistamme':
        /pesu|pese|pesem/.test(text)?'pesemme':
        /siivou/.test(text)?'siivoamme':
        /asenn/.test(text)?'asennamme':
        /maal/.test(text)?'maalaamme':
        /korj/.test(text)?'korjaamme':
        /raiva/.test(text)?'raivaamme':
        /huol/.test(text)?'huollamme':
        transport?'viemme':
        /rakenn/.test(text)?'rakennamme':'';
      if (!type) continue;
      if (['pesetteko','puhdistatteko'].includes(verb) && !cleaning) continue;
      if (verb==='vietteko' && !transport) continue;
      if (verb==='asennatteko' && type!=='asennamme') continue;
      if (verb==='maalaatteko' && type!=='maalaamme') continue;
      if (verb==='korjaatteko' && type!=='korjaamme') continue;
      if (verb==='raivaatteko' && type!=='raivaamme') continue;
      if (verb==='huollatteko' && type!=='huollamme') continue;
      candidates.push({row,type,qualifiedNoun});
    }
  }
  const found=candidates[0];
  if (!found) return {supported:false};
  const phrase=String(message).trim()
    .replace(/^(?:teettekö|pesettekö|puhdistatteko|huollatteko|asennatteko|maalaatteko|korjaatteko|raivaatteko|viettekö|entä|mites|ja)\s+/i,'')
    .replace(/[?!.]+$/,'').toLowerCase();
  const answerVerb=verb==='teetteko' && /(?:pesu|puhdist|siivou|asennus|huolto|maalaus|korjaus|raivaus)/.test(noun) ? 'teemme' : found.type;
  return {supported:true,answer:'Kyllä, '+answerVerb+(follow?' myös':'')+' '+(found.qualifiedNoun||phrase)+'.',evidence:[found.row]};
}

// A customer may request two or more different services in one sentence.
// Resolve each service against independent, approved evidence. A generic
// snippet matching just one service must never answer the whole question.
function combinedFinnishServiceRequest(message, rows) {
  const q=normalizeSearchText(message);
  const match=q.match(/^(?:voiko\s+teilta\s+tilata|voinko\s+teilta\s+tilata|saako\s+teilta|onnistuuko|teetteko)\s+(.+)$/);
  if (!match || /(?:ilmais|tanaan|huomen|samalla\s+kaynnilla|yhdella\s+kaynnilla|samaan\s+aikaan|viikonlopp|paljonko|hinta|maksaa)/.test(q)) return null;
  const parts=match[1].split(/\s+(?:ja|seka)\s+|\s*,\s*|\s*&\s*/).map(s=>s.trim()).filter(Boolean);
  if (parts.length<2 || parts.length>4 || parts.some(part=>part.length<4 || part.length>75)) return null;
  const actionPatterns=[
    {kind:'puhdist',rx:/puhdist/,match:/puhdist/},
    {kind:'pes',rx:/pesu|pesun|pesua|pesuja|pesut|pese|pesem/,match:/pesu|pese|pesem/},
    {kind:'siivou',rx:/siivou/,match:/siivou/},
    {kind:'huol',rx:/huol/,match:/huol/},
    {kind:'asenn',rx:/asenn/,match:/asenn/},
    {kind:'maal',rx:/maalau|maala/,match:/maalau|maala/},
    {kind:'raiva',rx:/raivau|raiva/,match:/raivau|raiva/},
    {kind:'korja',rx:/korjau|korja/,match:/korjau|korja/},
    {kind:'kuljet',rx:/kuljet/,match:/kuljet/},
    {kind:'poisvien',rx:/poisvien|poisvient/,match:/poisvien|poisvient|kuljet|noud/}
  ];
  const requirements=parts.map(part=>{
    const words=part.split(/[\s-]+/).filter(Boolean);
    // "rännien puhdistuksen": rännien is the service subject, not
    // some other item that happens to be cleaned in the same paragraph.
    const explicitAction=actionPatterns.find(action=>words.some(word=>action.rx.test(word)));
    const inferredAction=explicitAction ||
      (/^pesetteko\b/.test(q) ? actionPatterns[1] : null);
    const subjects=words.length===1?words:
      words.filter(word=>!actionPatterns.some(action=>action.rx.test(word)));
    return {part,subjects,action:inferredAction};
  });
  if (requirements.some(item=>!item.action || !item.subjects.length)) return null;
  const approved=rows.filter(row=>{
    if (!usableWebsiteRow(row)) return false;
    const meta=normalizeSearchText(String(row.category||'')+' '+String(row.title||''));
    return knowledgeTopic(meta)==='services' &&
      !/arvost|review|testimonial|asiakaskokem/.test(meta) &&
      !importedKnowledgeJunk(String(row.title||'')+' '+String(row.answer||'')) &&
      !/\b(?:emme|ei|eivat|not|inte|aldrig)\b/.test(normalizeSearchText(String(row.answer||'')));
  });
  const findings=requirements.map(requirement=>{
    const queryStems=requirement.subjects.map(finnishServiceStem);
    const matchesSubject=text=>{
      const evidence=normalizeSearchText(text).split(/[\s-]+/).filter(Boolean).map(finnishServiceStem);
      return queryStems.every(stem=>stem.length>=4 && evidence.includes(stem));
    };
    return approved.find(row=>{
      // A precisely named, approved service row can establish availability.
      // A vague heading like "Palvelumme" never can.
      const title=String(row.title||'');
      if (matchesSubject(title) && requirement.action.match.test(normalizeSearchText(title))) return true;
      // Check action and subject within the same service clause. In
      // "install gutters and wash roofs", neither gutter washing nor roof
      // installation is supported by that row.
      return String(row.answer||'')
        .split(/(?<=[.!?;])\s+|\s+(?:ja|sekä)\s+|[,;&]/i)
        .some(clause=>matchesSubject(clause) && requirement.action.match.test(normalizeSearchText(clause)));
    });
  });
  // An answer that confirms the entire request needs proof for every part.
  if (findings.some(found=>!found)) return {supported:false};
  const sourceRows=[...new Map(findings.map(row=>[row.id||row.title,row])).values()];
  const requested=String(message).trim()
    .replace(/^(?:voiko\s+teilt[aä]\s+tilata|voinko\s+teilt[aä]\s+tilata|saako\s+teilt[aä]|onnistuuko|teettekö)\s+/i,'')
    .replace(/[?!.]+$/,'').trim();
  const terms=requested.split(/\s+(?:ja|sekä)\s+|\s*,\s*|\s*&\s*/i).map(s=>s.trim());
  const display=terms.length===2?'sekä '+terms[0]+' että '+terms[1] :
    terms.slice(0,-1).join(', ')+' ja '+terms.at(-1);
  return {
    supported:true,
    answer: /^(?:voiko|voinko|saako)/.test(q)
      ? 'Kyllä, voit tilata meiltä '+display+'.'
      : 'Kyllä, tarjoamme molemmat palvelut: '+display+'.',
    evidence:sourceRows
  };
}

function naturalServiceAnswer(rows) {
  const found = [];
  const add = (value) => {
    let s=String(value||'').replace(/\s+/g,' ').trim()
      .replace(/^(?:palvelut?|services?|tjänster?)\s*[-–—:]?\s*/i,'')
      .replace(/\s*\|.*$/,'').trim();
    if(!s || s.length<4 || s.length>55) return;
    if(/yhteystiedot|varaa aika|pyydä tarjous|tietoa meistä|mitä teemme|palvelumme|varsinais-suomi|turku|skip|toggle|menu|nav/i.test(s)) return;
    const key=normalizeSearchText(s);
    if(!found.some(x=>normalizeSearchText(x)===key)) found.push(s);
  };
  for(const row of rows||[]){
    const raw=String(row?.answer||'').replace(/\s+/g,' ').trim();
    const title=String(row?.title||'').trim();
    // Page headings such as "Palvelut – Ikkunanpesu, Kattopesut, Maalaus & Raivaus | Yritys"
    // are useful, but navigation text after the title is not.
    const heading=(title+' '+raw.slice(0,180)).match(/palvelut?\s*[-–—:]\s*([^|.]{4,140})/i);
    if(heading){
      heading[1].split(/\s*(?:,|&| ja )\s*/i).forEach(add);
    }
    // Pick concrete service phrases from normal prose. Keep this deliberately
    // conservative so CTA/navigation words never become part of the answer.
    const serviceRe=/\b([A-ZÅÄÖa-zåäö][A-ZÅÄÖa-zåäö-]*(?:n|jen)?\s+(?:pesu(?:t|ja)?|siistiminen|raivaus(?:työt|töitä)?|maalaus(?:työt|töitä)?|huolto(?:työt|a)?|puhdistus(?:työt|ta)?|leikkaus|poisvienti))\b/gi;
    let m;
    while((m=serviceRe.exec(raw))!==null) add(m[1]);
  }
  if(!found.length) return '';
  const items=found.slice(0,8);
  if(items.length===1) return 'Teemme '+items[0]+'.';
  return 'Teemme '+items.slice(0,-1).join(', ')+' ja '+items[items.length-1]+'.';
}

function conciseKnowledgeAnswer(row, query) {
  let raw=String(row?.answer||'').replace(/\s+/g,' ').trim();
  if(!raw || importedKnowledgeJunk(raw) || !usableWebsiteRow(row)) return '';
  if (['Hinnat','Aukioloajat','Puhelinnumero','Sähköposti','Osoite','Tarjouspyyntölomake'].includes(row.title) || ['Hinnat','Aukioloajat','Yhteystiedot'].includes(row.category)) return raw;
  const pageTitleLike = /^(?:respondo ai|etusivu|home|homepage)(?:\s*[-|–—:]|$)/i;
  if(pageTitleLike.test(raw)) {
    const parts=(raw.match(/[^.!?]+[.!?]?/g)||[]).map(x=>x.trim()).filter(Boolean);
    while(parts.length && pageTitleLike.test(parts[0])) parts.shift();
    raw=parts.join(' ').trim();
  }
  if(!raw) return '';
  // Remove common navigation/heading debris left by website extraction.
  raw=raw.replace(/^(?:palvelut?|services?|tjänster?)\s+(?:palvelut?|services?|tjänster?)\s+/i,'')
    .replace(/^(?:mitä teemme|what we do|vad vi gör)\s+/i,'')
    .replace(/\b(?:katso palvelut|view services|lue lisää|read more)\b\.?/gi,'')
    .replace(/\s+/g,' ').trim();
  const qTokens=new Set(searchTokens(query));
  const sentences=(raw.match(/[^.!?]+[.!?]?/g)||[raw])
    .map(x=>x.trim()).filter(x=>x.length>=12)
    .filter(x=>!/^(?:terms of service|privacy policy|käyttöehdot|tietosuojaseloste|cookie)/i.test(x));
  const ranked=sentences.map((sentence,index)=>{
    const tokens=searchTokens(sentence); let score=0;
    for(const token of tokens) if(qTokens.has(token)) score+=5;
    if(/[€$£]|\b\d+[,.]?\d*\s*(?:€|eur|%|päiv|day|dag|kk|month|mån|vuosi|year|år)\b/i.test(sentence)) score+=1;
    return {sentence,index,score};
  }).sort((a,b)=>b.score-a.score||a.index-b.index);
  const best=ranked.filter(x=>x.score>0).slice(0,2);
  const chosen=(best.length?best:ranked.slice(0,2)).sort((a,b)=>a.index-b.index).map(x=>x.sentence);
  let answer=chosen.join(' ').replace(/\b([A-Za-zÀ-ž]{3,})\s+\1\b/gi,'$1').replace(/\s+/g,' ').trim();
  if(answer.length>340) answer=answer.slice(0,337).replace(/\s+\S*$/,'')+'…';
  return answer;
}

async function generateGroundedAnswer({ companyName, rows, message, history = [], lang = 'fi', pageContext = {} }) {
  const responseLang = ['fi','sv','en'].includes(String(lang || '').toLowerCase()) ? String(lang).toLowerCase() : 'fi';
  rows = (rows || []).filter(usableWebsiteRow);
  const cleanMessage = String(message || '').trim();
  if (!cleanMessage) return { answer: '', handoff: true, confidence: 0, intent: responseLang === 'en' ? 'Empty' : responseLang === 'sv' ? 'Tom' : 'Tyhjä', sourceIds: [], selected: [] };

  const normalized = normalizeSearchText(cleanMessage);
  if (/^(hei|moi|moikka|hello|hi|hey|terve|hej|hallå|halla)[!. ]*$/.test(normalized)) {
    return { answer: responseLang === 'en' ? 'Hi! How can I help?' : responseLang === 'sv' ? 'Hej! Hur kan jag hjälpa?' : 'Hei! Miten voin auttaa?', handoff: false, confidence: 1, intent: responseLang === 'en' ? 'Greeting' : responseLang === 'sv' ? 'Hälsning' : 'Tervehdys', sourceIds: [], selected: [] };
  }
  if (/^(kiitos|kiitti|thanks|thank you|tack|tack så mycket|tack sa mycket)[!. ]*$/.test(normalized)) {
    return { answer: responseLang === 'en' ? 'You’re welcome! I’m happy to help if you have anything else.' : responseLang === 'sv' ? 'Varsågod! Jag hjälper gärna om du undrar över något mer.' : 'Ole hyvä! Autan mielelläni, jos tulee vielä jotain mieleen.', handoff: false, confidence: 1, intent: responseLang === 'en' ? 'Thanks' : responseLang === 'sv' ? 'Tack' : 'Kiitos', sourceIds: [], selected: [] };
  }

  if (queryTopic(cleanMessage) === 'quote') {
    const quoteRow = rows.find(row => row.title === 'Tarjouspyyntölomake' && normalizeWebUrl(row.answer, false));
    if (quoteRow) return {answer:responseLang === 'en' ? 'You can request a quote using the button below.' : responseLang === 'sv' ? 'Du kan begära offert via knappen nedan.' : 'Voit pyytää tarjouksen alla olevasta painikkeesta.', handoff:false, confidence:1, intent:'Tarjouspyyntö', sourceIds:[quoteRow.id].filter(Boolean), selected:[quoteRow]};
  }

  const priorQuestions = history.slice(-2).map((x) => String(x.question || x.user || '')).filter(Boolean);
  const intent = inferIntent(cleanMessage);
  // Short messages are not automatically follow-ups. Explicit intents such as
  // booking, price, hours and contact must stand on their own; otherwise
  // "Mistä voin varata ajan?" inherits the previous service question.
  const explicitIntent = intent !== 'Asiakaskysymys';
  const contextualLead = /^(enta|entä|ja |mites|miten sitten|siis|se |sen |sita|sitä|what about|and |how about|och |hur är det|hur ar det)/i.test(cleanMessage);
  const needsContext = !explicitIntent && (contextualLead || cleanMessage.length < 22);
  const retrievalQuery = needsContext && priorQuestions.length ? priorQuestions.slice(-1)[0] + ' ' + cleanMessage : cleanMessage;

  // Translate only the search query into Finnish so Finnish knowledge bases can
  // be searched in Swedish/English without a paid model. If the free translator
  // is unavailable, the multilingual alias expansion below still covers the
  // most common business intents.
  let localQuery = retrievalQuery;
  if (responseLang !== 'fi') {
    const translatedQuery = await translateTextFree(retrievalQuery, 'fi', 'auto');
    if (translatedQuery) localQuery += ' ' + translatedQuery;
  }

  let selected = selectRelevantKnowledge(rows, localQuery, 8);


  // Short, contextual service follow-ups need a direct yes/no answer. If there
  // is no approved proof for the exact action, hand off rather than listing
  // unrelated services or inventing a confirmation.
  // Never pass a combined service request to generic retrieval, which can
  // answer from an unrelated row that merely shares marketing keywords.
  const combinedService = responseLang==='fi' ? combinedFinnishServiceRequest(cleanMessage,rows) : null;
  if (combinedService) {
    const evidence=combinedService.evidence||[];
    return combinedService.supported
      ? {answer:combinedService.answer,handoff:false,confidence:0.92,intent:'Palvelut',sourceIds:evidence.map(row=>row.id).filter(Boolean),selected:evidence}
      : {answer:'',handoff:true,confidence:0.2,intent:'Palvelut',sourceIds:[],selected:[]};
  }

  const contextualService = responseLang==='fi'
    ? groundedFinnishServiceReply(cleanMessage,history,rows) : null;
  if (contextualService) {
    const evidence=contextualService.evidence||[];
    return contextualService.supported
      ? {answer:contextualService.answer,handoff:false,confidence:0.92,intent:'Palvelut',sourceIds:evidence.map(row=>row.id).filter(Boolean),selected:evidence}
      : {answer:'',handoff:true,confidence:0.2,intent:'Palvelut',sourceIds:[],selected:[]};
  }

  // Direct service yes/no questions must be resolved against the whole approved
  // knowledge base before generic retrieval can pick a review or unrelated row.
  // Example: "Viettekö romut pois?" should become "Kyllä, viemme romut pois."
  // even when a review containing "vietiin pois" happens to rank highest.
  const directServiceAnswer = responseLang === 'fi' ? specificServiceConfirmation(cleanMessage, rows) : '';
  if (directServiceAnswer) {
    const evidence = rows.filter(row => specificServiceConfirmation(cleanMessage,[row])).slice(0,3);
    return {
      answer: directServiceAnswer,
      handoff: false,
      confidence: 0.92,
      intent: 'Palvelut',
      sourceIds: evidence.map((row)=>row.id).filter(Boolean),
      selected: evidence
    };
  }

  if (responseLang === 'fi' && /^(?:teetteko|pesetteko|leikkaatteko|maalaatteko|raivaatteko|puhdistatteko|huollatteko|asennatteko|korjaatteko|vietteko)\b/.test(normalized)) {
    return {answer:'',handoff:true,confidence:0.2,intent:'Palvelut',sourceIds:[],selected:[]};
  }

  // Broad questions such as "What do you sell?" or "Tell me about the company"
  // should use the approved knowledge base as factual memory instead of requiring
  // an exact pre-written Q&A pair.
  const broadCompanyQuestion =
    queryTopic(localQuery) === 'services' ||
    genericCompanyQuestion(cleanMessage);

  if (!selected.length && broadCompanyQuestion) {
    selected = rows
      .filter((row) => normalizeSearchText(row.title) !== 'vastaustyyli')
      .filter((row) => !importedKnowledgeJunk(String(row.title||'')+' '+String(row.answer||'')))
      .map((row) => ({...row,_score:scoreKnowledgeRow(row, localQuery),_topic:knowledgeTopic(String(row.title||'')+' '+String(row.category||'')+' '+String(row.keywords||'')+' '+String(row.source_url||''))}))
      // "Mitä palveluja teette?" may only summarize rows that are actually
      // classified as services. Never fall back to arbitrary products/UI text.
      .filter((row) => row._topic === 'services')
      .sort((a,b) => Number(b._score||0)-Number(a._score||0))
      .slice(0,8);
  }
  if (!selected.length) {
    return { answer: '', handoff: true, confidence: 0.2, intent, sourceIds: [], selected: [] };
  }

  const top = selected[0];
  const minimumScore = broadCompanyQuestion ? 0 : (intent === 'Asiakaskysymys' ? 5 : 8);
  if (Number(top._score || 0) < minimumScore) {
    return { answer:'', handoff:true, confidence:0.3, intent, sourceIds:[], selected };
  }

  let finalAnswer = '';
  if (broadCompanyQuestion) {
    const usable = selected
      .map((row) => ({row,text:conciseKnowledgeAnswer(row, cleanMessage)}))
      .filter((item) => item.text && !importedKnowledgeJunk(item.text))
      .slice(0,3);
    const unique=[];
    for(const item of usable){
      if(!unique.some((x)=>normalizeSearchText(x).includes(normalizeSearchText(item.text).slice(0,80)))) unique.push(item.text);
    }
    finalAnswer=(queryTopic(localQuery)==='services' ? briefServiceAnswer(selected) : '')
      || composeKnowledgeAnswer(selected,cleanMessage) || unique.join(' ').trim();
    if(finalAnswer.length>520) finalAnswer=finalAnswer.slice(0,517).replace(/\s+\S*$/,'')+'…';
  } else {
    finalAnswer = conciseKnowledgeAnswer(top, cleanMessage);
  }
  if (!finalAnswer) {
    return { answer:'', handoff:true, confidence:0.25, intent, sourceIds:[], selected };
  }
  const sourceLanguage = detectConversationLanguage(finalAnswer, 'fi');
  const localizedAnswer = sourceLanguage === responseLang ? finalAnswer : await forceAnswerLanguage(finalAnswer, responseLang);
  if (localizedAnswer) finalAnswer = localizedAnswer;
  else if (responseLang !== 'fi') return {answer:'',handoff:true,confidence:0.2,intent,sourceIds:[],selected};
  return {
    answer: finalAnswer,
    handoff: false,
    confidence: Math.min(0.94, 0.62 + Number(top._score || 0) * 0.025),
    intent,
    sourceIds: broadCompanyQuestion ? selected.slice(0,3).map((x)=>x.id).filter(Boolean) : (top.id ? [top.id] : []),
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

function ownerOnly(req,res,next) {
  if (req.user?.role === 'agent') return res.status(403).json({ error:'Vain yrityksen pääkäyttäjä voi käyttää tätä toimintoa.' });
  next();
}

function agentOrOwner(req,res,next) {
  if (req.user?.role === 'agent' && !req.user?.tenantId) return res.status(403).json({ error:'Ei käyttöoikeutta.' });
  next();
}

function ownerTrafficOnly(req, res, next) {
  const ownerEmail = cleanEmail(process.env.OWNER_EMAIL || process.env.SUPPORT_EMAIL);
  if (!ownerEmail || cleanEmail(req.user?.email) !== ownerEmail) {
    return res.status(403).json({ error: 'Tämä näkymä on vain Respondo AI:n omistajalle.' });
  }
  next();
}

function trafficVisitorHash(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = forwarded || String(req.socket?.remoteAddress || '');
  const ua = String(req.headers['user-agent'] || '').slice(0, 400);
  return crypto.createHmac('sha256', SECRET_KEY).update(ip + '\n' + ua).digest('hex').slice(0, 40);
}

function trafficReferrerHost(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const host = new URL(raw).hostname.toLowerCase().replace(/^www\./, '');
    return host.slice(0, 240);
  } catch {
    return '';
  }
}

function isLikelyBotUserAgent(value) {
  return /bot|crawler|spider|headless|preview|facebookexternalhit|slurp|bingpreview|uptimerobot|statuscake/i.test(String(value || ''));
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
  if (provider === 'google') {
    return {
      configured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: BASE + '/api/auth/oauth/google/callback',
    };
  }
  if (provider === 'apple') {
    const privateKey = String(process.env.APPLE_PRIVATE_KEY || '').replace(/\\n/g, '\n').trim();
    return {
      configured: Boolean(
        process.env.APPLE_CLIENT_ID &&
        process.env.APPLE_TEAM_ID &&
        process.env.APPLE_KEY_ID &&
        privateKey
      ),
      clientId: String(process.env.APPLE_CLIENT_ID || '').trim(),
      teamId: String(process.env.APPLE_TEAM_ID || '').trim(),
      keyId: String(process.env.APPLE_KEY_ID || '').trim(),
      privateKey,
      redirectUri: BASE + '/api/auth/oauth/apple/callback',
    };
  }
  return { configured: false };
}

let appleJwksCache = { expiresAt: 0, keys: [] };

async function getAppleJwks() {
  if (appleJwksCache.expiresAt > Date.now() && appleJwksCache.keys.length) {
    return appleJwksCache.keys;
  }
  const response = await fetch('https://appleid.apple.com/auth/keys');
  if (!response.ok) throw new Error('Apple signing keys unavailable');
  const data = await response.json();
  const keys = Array.isArray(data.keys) ? data.keys : [];
  if (!keys.length) throw new Error('Apple signing keys missing');
  appleJwksCache = { expiresAt: Date.now() + 6 * 60 * 60 * 1000, keys };
  return keys;
}

function parseJwtPart(value) {
  return JSON.parse(Buffer.from(String(value || ''), 'base64url').toString('utf8'));
}

function appleJwtSegment(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function makeAppleClientSecret(cfg) {
  const now = Math.floor(Date.now() / 1000);
  const header = appleJwtSegment({ alg:'ES256', kid:cfg.keyId, typ:'JWT' });
  const payload = appleJwtSegment({
    iss:cfg.teamId,
    iat:now,
    exp:now + (5 * 60),
    aud:'https://appleid.apple.com',
    sub:cfg.clientId,
  });
  const input = header + '.' + payload;
  const signature = crypto.sign(
    'sha256',
    Buffer.from(input),
    { key:cfg.privateKey, dsaEncoding:'ieee-p1363' },
  ).toString('base64url');
  return input + '.' + signature;
}

async function exchangeAppleCode(code, cfg) {
  const response = await fetch('https://appleid.apple.com/auth/token', {
    method:'POST',
    headers:{ 'Content-Type':'application/x-www-form-urlencoded' },
    body:new URLSearchParams({
      client_id:cfg.clientId,
      client_secret:makeAppleClientSecret(cfg),
      code:String(code || ''),
      grant_type:'authorization_code',
      redirect_uri:cfg.redirectUri,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.id_token) {
    const reason = String(data.error || 'token_exchange_failed');
    throw new Error('Apple token exchange failed: ' + reason);
  }
  return data;
}

async function verifyAppleIdentityToken(idToken, expectedNonce) {
  const parts = String(idToken || '').split('.');
  if (parts.length !== 3) throw new Error('Invalid Apple identity token');
  const header = parseJwtPart(parts[0]);
  const payload = parseJwtPart(parts[1]);
  if (header.alg !== 'RS256' || !header.kid) throw new Error('Invalid Apple token header');

  const keys = await getAppleJwks();
  const jwk = keys.find((key) => key.kid === header.kid && key.kty === 'RSA');
  if (!jwk) throw new Error('Apple signing key not found');

  const publicKey = crypto.createPublicKey({ key:jwk, format:'jwk' });
  const valid = crypto.verify(
    'RSA-SHA256',
    Buffer.from(parts[0] + '.' + parts[1]),
    publicKey,
    Buffer.from(parts[2], 'base64url'),
  );
  if (!valid) throw new Error('Apple token signature invalid');

  const now = Math.floor(Date.now() / 1000);
  const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (payload.iss !== 'https://appleid.apple.com') throw new Error('Apple token issuer invalid');
  if (!audience.includes(process.env.APPLE_CLIENT_ID)) throw new Error('Apple token audience invalid');
  if (!payload.exp || Number(payload.exp) <= now) throw new Error('Apple token expired');
  if (payload.iat && Number(payload.iat) > now + 120) throw new Error('Apple token issued in the future');
  if (expectedNonce && payload.nonce !== expectedNonce) throw new Error('Apple token nonce invalid');
  if (payload.email_verified === false || payload.email_verified === 'false') {
    throw new Error('Apple email not verified');
  }
  return payload;
}

function setOauthState(res, nonce, provider = 'google') {
  const apple = provider === 'apple';
  res.cookie(OAUTH_STATE_COOKIE, nonce, {
    httpOnly: true,
    secure: apple ? true : process.env.NODE_ENV === 'production',
    sameSite: apple ? 'none' : 'lax',
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
      const cancelAtPeriodEnd = Boolean(subscription.cancel_at_period_end);
      await q(
        `UPDATE users
            SET subscription_status=$1,
                status=CASE WHEN $1 IN ('active','trialing') THEN 'active' ELSE 'inactive' END,
                current_period_end=$2,
                subscription_cancel_at_period_end=$3,
                updated_at=NOW()
          WHERE stripe_subscription_id=$4`,
        [subscription.status, periodEnd, cancelAtPeriodEnd, subscription.id],
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

const i18nCache = new Map();
const i18nLimiter = rateLimit({ windowMs: 60 * 1000, limit: 12, standardHeaders:true, legacyHeaders:false });
app.post('/api/i18n/translate', i18nLimiter, async (req,res) => {
  try {
    const lang = ['sv','en'].includes(String(req.body?.lang || '').toLowerCase()) ? String(req.body.lang).toLowerCase() : 'fi';
    const texts = Array.isArray(req.body?.texts) ? req.body.texts.map((x) => String(x || '').trim().slice(0,5000)).filter(Boolean).slice(0,160) : [];
    if (lang === 'fi' || !texts.length) return res.json({ translations:texts });
    const translations = new Array(texts.length);
    const pending = [];
    const pendingIndexes = [];
    texts.forEach((text,index) => {
      const key = lang + ':' + text;
      if (i18nCache.has(key)) translations[index] = i18nCache.get(key);
      else { pending.push(text); pendingIndexes.push(index); }
    });
    if (pending.length) {
      const translatedBatch = await Promise.all(pending.map((text) => translateTextFree(text, lang, 'auto')));
      if (translatedBatch.some((value) => !value)) {
        return res.status(503).json({ error: lang === 'sv' ? 'Översättningstjänsten är tillfälligt otillgänglig.' : 'Translation service is temporarily unavailable.' });
      }
      translatedBatch.forEach((value,i) => {
        const translated = String(value || '').slice(0,8000);
        translations[pendingIndexes[i]] = translated;
        i18nCache.set(lang + ':' + pending[i], translated);
      });
      if (i18nCache.size > 4000) {
        const keys=[...i18nCache.keys()].slice(0,1000); keys.forEach((key)=>i18nCache.delete(key));
      }
    }
    return res.json({ translations });
  } catch (e) {
    console.error('UI translation failed',e);
    return res.status(500).json({ error:'Translation failed' });
  }
});

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



app.post('/api/public/site-visit', async (req, res) => {
  try {
    if (!pool) return res.status(204).end();

    const ua = String(req.headers['user-agent'] || '');
    if (!ua || isLikelyBotUserAgent(ua)) return res.status(204).end();

    try {
      const token = cookies(req)[COOKIE];
      if (token) {
        const session = jwt.verify(token, JWT);
        const ownerEmail = cleanEmail(process.env.OWNER_EMAIL || process.env.SUPPORT_EMAIL);
        if (ownerEmail && cleanEmail(session?.email) === ownerEmail) {
          return res.status(204).end();
        }
      }
    } catch {}

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const visitPath = String(body.path || '/').trim().slice(0, 500) || '/';
    if (/^\/(?:api|app|kirjaudu|traffic(?:\.html)?)(?:\/|$)/i.test(visitPath)) {
      return res.status(204).end();
    }

    const referrer = String(body.referrer || '').trim().slice(0, 1000);
    const visitorHash = trafficVisitorHash(req);
    if (!visitorHash) return res.status(204).end();

    const rawLanguage = String(body.language || '').trim().toLowerCase().split('-')[0];
    const visitLanguage = ['fi','sv','en'].includes(rawLanguage) ? rawLanguage : null;

    if (body.updateLanguage === true && visitLanguage) {
      await q(
        `UPDATE site_visits
            SET language=$1
          WHERE id=(
            SELECT id
              FROM site_visits
             WHERE visitor_hash=$2
               AND path=$3
               AND created_at >= NOW() - INTERVAL '2 hours'
             ORDER BY created_at DESC
             LIMIT 1
          )`,
        [visitLanguage, visitorHash, visitPath],
      );
      return res.status(204).end();
    }

    await q(
      "INSERT INTO site_visits(id,visitor_hash,path,referrer,referrer_host,utm_source,utm_medium,utm_campaign,language) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
      [
        uid(),
        visitorHash,
        visitPath,
        referrer || null,
        trafficReferrerHost(referrer) || null,
        String(body.utmSource || '').trim().slice(0, 120) || null,
        String(body.utmMedium || '').trim().slice(0, 120) || null,
        String(body.utmCampaign || '').trim().slice(0, 180) || null,
        visitLanguage,
      ],
    );
    return res.status(204).end();
  } catch (e) {
    console.error('Site visit tracking failed', e?.message || e);
    return res.status(204).end();
  }
});

app.get('/api/owner/traffic', auth, ownerTrafficOnly, async (req, res) => {
  try {
    const summary = await q(
      "SELECT COUNT(*)::int AS total_views, COUNT(DISTINCT visitor_hash)::int AS total_unique, COUNT(*) FILTER (WHERE created_at >= (CURRENT_DATE AT TIME ZONE 'Europe/Helsinki'))::int AS today_views, COUNT(DISTINCT visitor_hash) FILTER (WHERE created_at >= (CURRENT_DATE AT TIME ZONE 'Europe/Helsinki'))::int AS today_unique, COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS week_views, COUNT(DISTINCT visitor_hash) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS week_unique, COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS month_views, COUNT(DISTINCT visitor_hash) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS month_unique FROM site_visits"
    );

    const daily = await q(
      "SELECT TO_CHAR(created_at AT TIME ZONE 'Europe/Helsinki','YYYY-MM-DD') AS day, COUNT(*)::int AS views, COUNT(DISTINCT visitor_hash)::int AS visitors FROM site_visits WHERE created_at >= NOW() - INTERVAL '30 days' GROUP BY 1 ORDER BY 1 ASC"
    );

    const pages = await q(
      "SELECT path, COUNT(*)::int AS views, COUNT(DISTINCT visitor_hash)::int AS visitors FROM site_visits WHERE created_at >= NOW() - INTERVAL '30 days' GROUP BY path ORDER BY views DESC, path ASC LIMIT 12"
    );

    const sources = await q(
      "SELECT COALESCE(NULLIF(utm_source,''), NULLIF(referrer_host,''), 'Suora') AS source, COUNT(*)::int AS views, COUNT(DISTINCT visitor_hash)::int AS visitors FROM site_visits WHERE created_at >= NOW() - INTERVAL '30 days' GROUP BY 1 ORDER BY views DESC, source ASC LIMIT 12"
    );

    const languages = await q(
      "SELECT COALESCE(NULLIF(language,''),'unknown') AS language, COUNT(*)::int AS views, COUNT(DISTINCT visitor_hash)::int AS visitors FROM site_visits WHERE created_at >= NOW() - INTERVAL '30 days' GROUP BY 1 ORDER BY views DESC, language ASC"
    );

    return res.json({
      summary: summary.rows[0] || {},
      daily: daily.rows,
      pages: pages.rows,
      sources: sources.rows,
      languages: languages.rows,
      generatedAt: new Date().toISOString(),
      note: 'Kävijä on pseudonyymi selain/IP-yhdistelmä. Raakaa IP-osoitetta ei tallenneta.',
    });
  } catch (e) {
    console.error('Owner traffic stats failed', e);
    return res.status(500).json({ error: 'Kävijätilastojen lataaminen epäonnistui.' });
  }
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
  setOauthState(res,nonce,'google');

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
  if (!['google','apple'].includes(provider)) return res.status(404).end();

  const cfg = oauthConfig(provider);
  if (!cfg.configured) {
    return res.redirect(
      '/' + (flow === 'signup' ? 'tilaus' : 'kirjaudu') +
      '?oauth_error=not_configured&provider=' + encodeURIComponent(provider)
    );
  }

  const nonce = crypto.randomBytes(20).toString('hex');
  const state = jwt.sign({ provider, flow, nonce }, JWT, { expiresIn: '10m' });
  setOauthState(res, nonce, provider);

  if (provider === 'apple') {
    const url = new URL('https://appleid.apple.com/auth/authorize');
    url.search = new URLSearchParams({
      client_id: cfg.clientId,
      redirect_uri: cfg.redirectUri,
      response_type: 'code',
      response_mode: 'form_post',
      scope: 'name email',
      state,
      nonce,
    }).toString();
    return res.redirect(url.toString());
  }

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

app.post('/api/auth/oauth/apple/callback', async (req, res) => {
  const state = String(req.body?.state || '');
  const code = String(req.body?.code || '');
  let statePayload;
  try {
    statePayload = jwt.verify(state, JWT);
  } catch {
    return res.redirect('/kirjaudu?oauth_error=state&provider=apple');
  }

  const target = statePayload.flow === 'signup' ? '/tilaus' : '/kirjaudu';
  const stateCookie = cookies(req)[OAUTH_STATE_COOKIE];
  if (
    !stateCookie ||
    statePayload.nonce !== stateCookie ||
    statePayload.provider !== 'apple'
  ) {
    return res.redirect(target + '?oauth_error=state&provider=apple');
  }
  res.clearCookie(OAUTH_STATE_COOKIE);

  if (req.body?.error || !code) {
    return res.redirect(target + '?oauth_error=failed&provider=apple');
  }

  try {
    const cfg = oauthConfig('apple');
    if (!cfg.configured) {
      return res.redirect(target + '?oauth_error=not_configured&provider=apple');
    }
    const token = await exchangeAppleCode(code, cfg);
    const claims = await verifyAppleIdentityToken(token.id_token, statePayload.nonce);
    const email = cleanEmail(claims.email);
    if (!email) throw new Error('Apple email missing');

    let name = '';
    try {
      const rawUser = typeof req.body?.user === 'string' ? JSON.parse(req.body.user) : req.body?.user;
      name = [rawUser?.name?.firstName, rawUser?.name?.lastName].filter(Boolean).join(' ').trim();
    } catch {}

    const profile = {
      provider: 'apple',
      sub: String(claims.sub || ''),
      email,
      name,
    };

    if (statePayload.flow === 'login') {
      const found = await q('SELECT * FROM users WHERE lower(email)=lower($1)', [profile.email]);
      if (!found.rowCount) return res.redirect('/kirjaudu?oauth_error=no_account&provider=apple');
      if (found.rows[0].status === 'pending') return res.redirect('/kirjaudu?oauth_error=pending&provider=apple');
      setSession(res, found.rows[0]);
      return res.redirect('/app');
    }

    setOauthProfile(res, profile);
    return res.redirect('/tilaus?oauth=apple');
  } catch (e) {
    console.error('Apple OAuth failed', e);
    return res.redirect(target + '?oauth_error=failed&provider=apple');
  }
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
    monthlyNet: 49.99,
    yearlyNet: 539.88,
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
  const socialSignup = Boolean(
    oauthProfile &&
    cleanEmail(oauthProfile.email) === email &&
    ['google','apple'].includes(oauthProfile.provider)
  );
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
        `INSERT INTO users(id,email,password_hash,full_name,company_name,business_id,status,subscription_plan,preferred_language)
         VALUES($1,$2,$3,$4,$5,$6,'pending',$7,$8)`,
        [id, email, hash, fullName || '', companyName, businessId || null, normalizedPlan, ['fi','sv','en'].includes(String(req.body.language || '').toLowerCase()) ? String(req.body.language).toLowerCase() : 'fi'],
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

app.post('/api/auth/agent-login', async (req,res) => {
  try {
    const username=String(req.body.username || '').trim().toLowerCase();
    const r=await q('SELECT sa.*,t.name AS company_name FROM support_agents sa JOIN tenants t ON t.id=sa.tenant_id WHERE lower(sa.username)=lower($1)',[username]);
    if (!r.rowCount || !r.rows[0].password_hash || !(await bcrypt.compare(String(req.body.password||''),r.rows[0].password_hash))) {
      return res.status(401).json({ error:'Väärä käyttäjänimi tai salasana.' });
    }
    res.cookie(COOKIE,jwt.sign({ sub:r.rows[0].id,tenantId:r.rows[0].tenant_id,role:'agent',agentId:r.rows[0].id },JWT,{expiresIn:'14d'}),{
      httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',maxAge:1209600000,
    });
    await q("UPDATE support_agents SET status='online',updated_at=NOW() WHERE id=$1",[r.rows[0].id]);
    return res.json({ ok:true,role:'agent',display_name:r.rows[0].display_name,company_name:r.rows[0].company_name });
  } catch(e) { return res.status(500).json({ error:'Kirjautuminen epäonnistui.' }); }
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
    const preferredLanguage = ['fi','sv','en'].includes(String(req.body.language || '').toLowerCase()) ? String(req.body.language).toLowerCase() : (r.rows[0].preferred_language || 'fi');
    await q('UPDATE users SET preferred_language=$1,updated_at=NOW() WHERE id=$2', [preferredLanguage,r.rows[0].id]);
    setSession(res, r.rows[0]);
    return res.json({ ok: true, preferred_language: preferredLanguage });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.post('/api/auth/language', auth, async (req,res) => {
  try {
    const language = String(req.body?.language || '').toLowerCase();
    if (!['fi','sv','en'].includes(language)) return res.status(400).json({ error:'Unsupported language' });
    await q('UPDATE users SET preferred_language=$1,updated_at=NOW() WHERE id=$2',[language,req.user.sub]);
    return res.json({ ok:true, preferred_language:language });
  } catch (e) { return res.status(500).json({ error:e.message }); }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie(COOKIE);
  res.json({ ok: true });
});

app.get('/api/auth/me', auth, async (req, res) => {
  try {
    if (req.user.role === 'agent') {
      const ar=await q(`SELECT sa.id,sa.display_name,sa.avatar,sa.username,sa.status,t.name AS company_name
                           FROM support_agents sa JOIN tenants t ON t.id=sa.tenant_id
                          WHERE sa.id=$1 AND sa.tenant_id=$2`,[req.user.agentId,req.user.tenantId]);
      if (!ar.rowCount) return res.status(404).json({ error:'Profiilia ei löytynyt.' });
      return res.json({ ...ar.rows[0],role:'agent',preferred_language:'fi' });
    }
    const r = await q(
      'SELECT id,email,full_name,company_name,business_id,status,subscription_status,current_period_end,preferred_language FROM users WHERE id=$1',
      [req.user.sub],
    );
    if (!r.rowCount) return res.status(404).json({ error: 'Tiliä ei löytynyt.' });
    return res.json(r.rows[0]);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.post('/api/app/agent/profile', auth, async (req,res) => {
  try {
    if (req.user.role !== 'agent') return res.status(403).json({ error:'Ei käyttöoikeutta.' });
    const displayName=String(req.body.displayName||'').replace(/[<>]/g,'').trim().slice(0,60);
    if (!displayName) return res.status(400).json({ error:'Anna nimi.' });
    let avatar;
    if (Object.prototype.hasOwnProperty.call(req.body||{},'avatar')) {
      const raw=String(req.body.avatar||'').trim();
      avatar=raw ? cleanBotAvatar(raw) : null;
      if (raw && avatar==='robot-1' && !/^robot-1$/.test(raw)) return res.status(400).json({ error:'Profiilikuva ei kelpaa.' });
    }
    const rr=await q(`UPDATE support_agents SET display_name=$1,avatar=COALESCE($2,avatar),updated_at=NOW()
      WHERE id=$3 AND tenant_id=$4 RETURNING id,display_name,avatar,username,status`,
      [displayName,avatar,req.user.agentId,req.user.tenantId]);
    if (!rr.rowCount) return res.status(404).json({ error:'Profiilia ei löytynyt.' });
    return res.json(rr.rows[0]);
  } catch(e){ return res.status(500).json({ error:'Profiilia ei voitu päivittää.' }); }
});

app.post('/api/app/agent/status', auth, async (req,res) => {
  try {
    if (req.user.role !== 'agent') return res.status(403).json({ error:'Ei käyttöoikeutta.' });
    const status=req.body.status==='online'?'online':'offline';
    const rr=await q("UPDATE support_agents SET status=$1,updated_at=NOW() WHERE id=$2 AND tenant_id=$3 RETURNING status",[status,req.user.agentId,req.user.tenantId]);
    if (!rr.rowCount) return res.status(404).json({ error:'Profiilia ei löytynyt.' });
    return res.json(rr.rows[0]);
  } catch(e){ return res.status(500).json({ error:'Tilaa ei voitu päivittää.' }); }
});

app.post('/api/app/support-agents/:id/force-logout', auth, ownerOnly, subscribed, async (req,res) => {
  try {
    const tr=await q('SELECT id FROM tenants WHERE owner_user_id=$1',[req.user.sub]);
    if(!tr.rowCount) return res.status(404).json({error:'Työtilaa ei löytynyt.'});
    const rr=await q("UPDATE support_agents SET status='offline',updated_at=NOW() WHERE id=$1 AND tenant_id=$2 RETURNING id",[req.params.id,tr.rows[0].id]);
    if(!rr.rowCount) return res.status(404).json({error:'Profiilia ei löytynyt.'});
    return res.json({ok:true});
  }catch(e){return res.status(500).json({error:'Uloskirjaus epäonnistui.'});}
});

app.post('/api/app/agent/claim/:id', auth, async (req,res) => {
  try {
    if(req.user.role!=='agent') return res.status(403).json({error:'Ei käyttöoikeutta.'});
    const rr=await q(`UPDATE chat_threads SET assigned_agent_id=$1,mode='human',status='open',updated_at=NOW()
      WHERE id=$2 AND tenant_id=$3 AND assigned_agent_id IS NULL
        AND language = ANY((SELECT languages FROM support_agents WHERE id=$1 AND tenant_id=$3)) RETURNING id`,
      [req.user.agentId,req.params.id,req.user.tenantId]);
    if(!rr.rowCount) return res.status(409).json({error:'Toinen asiakaspalvelija ehti ottaa keskustelun tai se ei ole enää vapaa.'});
    return res.json({ok:true});
  }catch(e){return res.status(500).json({error:'Keskustelua ei voitu ottaa haltuun.'});}
});

app.get('/api/app/agent-dashboard', auth, agentOrOwner, async (req,res) => {
  try {
    if (req.user.role !== 'agent') return res.status(403).json({ error:'Tämä näkymä on asiakaspalvelijoille.' });
    const tenantId=req.user.tenantId, agentId=req.user.agentId;
    const agent=(await q('SELECT id,display_name,avatar,username,languages,status FROM support_agents WHERE id=$1 AND tenant_id=$2',[agentId,tenantId])).rows[0];
    if (!agent) return res.status(404).json({ error:'Profiilia ei löytynyt.' });
    const threads=await q(`SELECT ct.id,ct.source_channel,ct.external_contact_id,ct.visitor_ref,ct.mode,ct.status,ct.last_activity_at,ct.created_at,
      COALESCE(json_agg(json_build_object('id',cm.id,'role',cm.role,'message',cm.message,'created_at',cm.created_at) ORDER BY cm.created_at ASC) FILTER (WHERE cm.id IS NOT NULL),'[]') AS messages
      FROM chat_threads ct LEFT JOIN chat_messages cm ON cm.thread_id=ct.id
      WHERE ct.tenant_id=$1 AND (ct.assigned_agent_id=$2 OR (ct.assigned_agent_id IS NULL AND ct.language = ANY(COALESCE($3::text[],ARRAY['fi']::text[]))))
      GROUP BY ct.id ORDER BY (ct.assigned_agent_id=$2) DESC,ct.last_activity_at DESC LIMIT 80`,[tenantId,agentId,agent.languages||['fi']]);
    return res.json({agent,liveThreads:threads.rows,stats:{
      conversations:threads.rowCount,
      open:threads.rows.filter(x=>x.status==='open').length,
      human:threads.rows.filter(x=>x.mode==='human').length
    }});
  } catch(e){ return res.status(500).json({ error:'Asiakaspalvelunäkymää ei voitu ladata.' }); }
});

app.get('/api/app/dashboard', auth, ownerOnly, subscribed, async (req, res) => {
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
              ct.assigned_agent_id,sa.display_name AS assigned_agent_name,sa.avatar AS assigned_agent_avatar,
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
         LEFT JOIN support_agents sa ON sa.id=ct.assigned_agent_id
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
      supportAgents: (await q(
        `SELECT sa.id,sa.display_name,sa.avatar,sa.username,sa.languages,sa.status,sa.created_at,sa.updated_at,
                COUNT(DISTINCT ct.id)::int AS conversation_count,
                COUNT(DISTINCT ct.id) FILTER (WHERE ct.status='open')::int AS open_conversations,
                COUNT(cm.id) FILTER (WHERE cm.role='human')::int AS replies_sent,
                MAX(ct.last_activity_at) AS last_conversation_at
           FROM support_agents sa
           LEFT JOIN chat_threads ct ON ct.assigned_agent_id=sa.id AND ct.tenant_id=sa.tenant_id
           LEFT JOIN chat_messages cm ON cm.thread_id=ct.id AND cm.tenant_id=sa.tenant_id
          WHERE sa.tenant_id=$1
          GROUP BY sa.id
          ORDER BY sa.created_at ASC`,
        [tenant.id]
      )).rows,
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
        smsWebhookUrl:BASE + '/api/sms/' + encodeURIComponent(tenant.slug) + '/incoming',
        missedCallWebhookUrl:BASE + '/api/voice/' + encodeURIComponent(tenant.slug) + '/missed-call',
        missedCallSmsEnabled:Boolean(tenant.missed_call_sms_enabled),
        missedCallSmsMessage:tenant.missed_call_sms_message || 'Hei! Emme juuri nyt pystyneet vastaamaan puheluusi. Voit vastata tähän viestiin, niin RESPONDO AI auttaa heti.',
        missedCallSmsMode:tenant.missed_call_sms_mode || 'immediate',
        missedCallAfterStart:tenant.missed_call_after_start || '17:00',
        missedCallAfterEnd:tenant.missed_call_after_end || '08:00',
        missedCallTimezone:tenant.missed_call_timezone || 'Europe/Helsinki',
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
      'UPDATE tenants SET contact_phone=$1, contact_email=$2, website=$3, greeting=$4, average_lead_value=$5, bot_name=$6, bot_avatar=$7, updated_at=NOW() WHERE id=$8',
      [
        String(req.body.phone || '').trim() || null,
        String(req.body.email || '').trim() || null,
        website || null,
        String(req.body.greeting || '').trim().slice(0, 220) || 'Hei! Miten voin auttaa?',
        Math.max(0, Number(req.body.averageLeadValue || 0)) || 0,
        cleanBotName(req.body.botName),
        cleanBotAvatar(req.body.botAvatar),
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



function extractFreeWebsiteProfile(bundle) {
  return essentialWebsiteProfile(bundle);
}

const websiteImportJobs = new Map();

app.post('/api/app/import-website/start', auth, subscribed, async (req,res)=>{
  const website=normalizeWebUrl(req.body.website,false);
  if(!website) return res.status(400).json({error:'Lisää ensin verkkosivusi osoite.'});
  for (const [id, old] of websiteImportJobs) if (old.status !== 'running' && Date.now()-old.updatedAt > 10*60*1000) websiteImportJobs.delete(id);
  const active = [...websiteImportJobs.values()].find(job => job.userId === req.user.sub && job.status === 'running');
  if (active) return res.json({ok:true,jobId:active.id});
  if ([...websiteImportJobs.values()].filter(job=>job.status==='running').length >= 4) return res.status(429).json({error:'Haku on ruuhkautunut. Yritä hetken kuluttua uudelleen.'});
  const jobId=uid();
  const job={id:jobId,userId:req.user.sub,website,status:'running',scanned:0,total:1,percent:0,result:null,error:null,updatedAt:Date.now()};
  websiteImportJobs.set(jobId,job);
  res.json({ok:true,jobId});
  (async()=>{
    try{
      // Keep raw HTML memory bounded. 10k URLs may be discovered, but process a safe high-value batch per job.
      const bundle=await fetchWebsiteBundle(website,220,4*60*1000,(p)=>{
        job.scanned=p.scanned; job.total=Math.max(p.total,p.scanned,1);
        job.percent=Math.min(99,Math.round((job.scanned/job.total)*100)); job.updatedAt=Date.now();
      });
      const candidates=websiteKnowledgeCandidates(bundle);
      const detectedProfile=extractFreeWebsiteProfile(bundle);
      job.result={ok:true,profile:detectedProfile,pagesScanned:bundle.pages.length,factsFound:candidates.length,candidates,extraction:'local'};
      job.scanned=bundle.pages.length; job.total=Math.max(job.total,job.scanned); job.percent=100; job.status='done'; job.updatedAt=Date.now();
    }catch(e){job.status='error';job.error=e?.message||'Verkkosivun tietojen tuonti epäonnistui.';job.updatedAt=Date.now();}
  })();
});

app.get('/api/app/import-website/status/:jobId', auth, subscribed, (req,res)=>{
  const job=websiteImportJobs.get(req.params.jobId);
  if(!job||job.userId!==req.user.sub) return res.status(404).json({error:'Hakua ei löytynyt.'});
  res.json({status:job.status,scanned:job.scanned,total:job.total,percent:job.percent,error:job.error,result:job.status==='done'?job.result:null});
  if(job.status!=='running' && Date.now()-job.updatedAt>10*60*1000) websiteImportJobs.delete(job.id);
});

app.post('/api/app/import-website', auth, subscribed, async (req, res) => {
  try {
    const website = normalizeWebUrl(req.body.website, false);
    if (!website) return res.status(400).json({ error: 'Lisää ensin verkkosivusi osoite.' });
    const bundle = await fetchWebsiteBundle(website, 220, 65000);
    const candidates = websiteKnowledgeCandidates(bundle);
    const detectedProfile = extractFreeWebsiteProfile(bundle);
    return res.json({
      ok:true,
      profile:detectedProfile,
      pagesScanned:bundle.pages.length,
      factsFound:candidates.length,
      candidates,
      extraction:'local',
    });
  } catch (e) {
    console.error('Website import failed', e);
    return res.status(400).json({ error: e.message || 'Verkkosivun tietojen tuonti epäonnistui.' });
  }
});

app.post('/api/app/import-website/approve', auth, subscribed, async (req, res) => {
  const client = await pool.connect();
  try {
    const tenantResult = await client.query('SELECT id FROM tenants WHERE owner_user_id=$1', [req.user.sub]);
    if (!tenantResult.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const tenantId = tenantResult.rows[0].id;
    const items = Array.isArray(req.body.items) ? req.body.items.slice(0,1000) : [];
    const tenantWebsite = (await client.query('SELECT website FROM tenants WHERE id=$1',[tenantId])).rows[0]?.website || '';
    if (!items.length) return res.status(400).json({ error:'Valitse vähintään yksi tieto.' });

    await client.query('BEGIN');
    let added = 0;
    for (const item of items) {
      const title = String(item?.title || '').trim().slice(0,180);
      const answer = String(item?.answer || '').trim().slice(0,1600);
      const category = String(item?.category || 'Verkkosivulta tuotu').trim().slice(0,80) || 'Verkkosivulta tuotu';
      const sourceUrl = normalizeWebUrl(item?.sourceUrl, false);
      if (!title || !answer || !sourceUrl) continue;
      const safetyText = normalizeSearchText(title+' '+category+' '+answer.slice(0,900)+' '+sourceUrl);
      if (/terms of service|privacy policy|tietosuoja|kayttoeh|käyttöeh|cookie policy|evaste|eväste|legal notice|all rights reserved|localstorage|sessionstorage|const |let |var |function |\.includes\(|\.getitem\(|\.setitem\(|document\.|window\.|queryselector|addeventlistener|json\.stringify|json\.parse/.test(safetyText)) continue;
      if (!usableWebsiteRow({title,answer,category,source_type:'website'}) || title.length < 3) continue;
      const sourceHost = normalizeHost(sourceUrl);
      if (tenantWebsite && sourceHost !== normalizeHost(tenantWebsite)) continue;
      const keywords = Array.isArray(item?.keywords)
        ? item.keywords.map((x) => String(x).trim()).filter(Boolean).slice(0,14)
        : searchTokens(title + ' ' + answer).slice(0,14);
      const duplicate = await client.query(
        "SELECT id FROM knowledge WHERE tenant_id=$1 AND source_type='website' AND source_url=$2 AND lower(title)=lower($3) AND answer=$4 LIMIT 1",
        [tenantId, sourceUrl, title, answer],
      );
      if (duplicate.rowCount) {
        await client.query(
          'UPDATE knowledge SET category=$1,answer=$2,keywords=$3,source_type=\'website\',source_url=$4,approved=true,verified_at=NOW(),updated_at=NOW() WHERE id=$5',
          [category, answer, keywords, sourceUrl, duplicate.rows[0].id],
        );
      } else {
        await client.query(
          `INSERT INTO knowledge(id,tenant_id,category,title,answer,keywords,source_type,source_url,approved,verified_at)
           VALUES($1,$2,$3,$4,$5,$6,'website',$7,true,NOW())`,
          [uid(),tenantId,category,title,answer,keywords,sourceUrl],
        );
      }
      added++;
    }
    if (!added) { await client.query('ROLLBACK'); return res.status(400).json({error:'Valituista tiedoista ei löytynyt hyväksyttäviä yritystietoja.'}); }
    await client.query('COMMIT');
    return res.json({ok:true,added});
  } catch(e) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('Website knowledge approval failed',e);
    return res.status(500).json({error:'Verkkosivulta löydettyjen tietojen tallennus epäonnistui.'});
  } finally {
    client.release();
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


app.put('/api/app/knowledge/:id', auth, subscribed, async (req, res) => {
  try {
    const t = await q('SELECT id FROM tenants WHERE owner_user_id=$1', [req.user.sub]);
    if (!t.rowCount) return res.status(404).json({ error: 'Työtila puuttuu.' });
    const tenantId = t.rows[0].id;
    const existing = await q('SELECT * FROM knowledge WHERE id=$1 AND tenant_id=$2', [req.params.id, tenantId]);
    if (!existing.rowCount) return res.status(404).json({ error: 'Vastausta ei löytynyt.' });
    if (existing.rows[0].source_type === 'profile') return res.status(400).json({ error: 'Yrityksen perustietoja muokataan Yrityksen tiedot -osiosta.' });

    const category = String(req.body.category ?? existing.rows[0].category ?? 'Yleinen').trim() || 'Yleinen';
    const title = String(req.body.title ?? existing.rows[0].title ?? '').trim();
    const answer = String(req.body.answer ?? existing.rows[0].answer ?? '').trim();
    if (!title || !answer) return res.status(400).json({ error: 'Otsikko ja vastaus tarvitaan.' });
    const rawKeywords = req.body.keywords ?? existing.rows[0].keywords ?? [];
    const keywords = Array.isArray(rawKeywords)
      ? rawKeywords.map((x) => String(x).trim()).filter(Boolean)
      : String(rawKeywords).split(',').map((x) => x.trim()).filter(Boolean);

    const r = await q(
      `UPDATE knowledge
       SET category=$1,title=$2,answer=$3,keywords=$4,approved=true,verified_at=NOW(),updated_at=NOW()
       WHERE id=$5 AND tenant_id=$6 RETURNING *`,
      [category,title,answer,keywords,req.params.id,tenantId],
    );
    return res.json({ ok:true, knowledge:r.rows[0] });
  } catch (e) {
    console.error('Knowledge update failed', e);
    return res.status(500).json({ error: 'Vastauksen muokkaus epäonnistui.' });
  }
});

app.delete('/api/app/knowledge/:id', auth, subscribed, async (req, res) => {
  try {
    const t = await q('SELECT id FROM tenants WHERE owner_user_id=$1', [req.user.sub]);
    if (!t.rowCount) return res.status(404).json({ error: 'Työtila puuttuu.' });
    const tenantId = t.rows[0].id;
    const existing = await q('SELECT source_type FROM knowledge WHERE id=$1 AND tenant_id=$2', [req.params.id, tenantId]);
    if (!existing.rowCount) return res.status(404).json({ error: 'Vastausta ei löytynyt.' });
    if (existing.rows[0].source_type === 'profile') return res.status(400).json({ error: 'Yrityksen perustietoja ei poisteta tästä osiosta.' });
    await q('DELETE FROM knowledge WHERE id=$1 AND tenant_id=$2', [req.params.id, tenantId]);
    return res.json({ ok:true });
  } catch (e) {
    console.error('Knowledge delete failed', e);
    return res.status(500).json({ error: 'Vastauksen poistaminen epäonnistui.' });
  }
});


app.post('/api/app/knowledge/:id/quick-reply', auth, subscribed, async (req, res) => {
  const client = await pool.connect();
  try {
    const featured = req.body?.featured === true;
    await client.query('BEGIN');

    const tr = await client.query(
      'SELECT id FROM tenants WHERE owner_user_id=$1 FOR UPDATE',
      [req.user.sub],
    );
    if (!tr.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Työtila puuttuu.' });
    }
    const tenantId = tr.rows[0].id;

    const item = await client.query(
      'SELECT id,title,source_type,quick_reply_order FROM knowledge WHERE id=$1 AND tenant_id=$2',
      [req.params.id, tenantId],
    );
    if (!item.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Vastausta ei löytynyt.' });
    }
    if (item.rows[0].source_type === 'profile') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Valitse etusivulle oma kysymys–vastaus tietopohjasta.' });
    }

    let quickReplyOrder = item.rows[0].quick_reply_order;
    if (featured) {
      if (!quickReplyOrder) {
        const used = await client.query(
          'SELECT quick_reply_order FROM knowledge WHERE tenant_id=$1 AND quick_reply_order IS NOT NULL ORDER BY quick_reply_order',
          [tenantId],
        );
        const slots = new Set(used.rows.map((x) => Number(x.quick_reply_order)));
        quickReplyOrder = [1,2,3].find((slot) => !slots.has(slot)) || null;
        if (!quickReplyOrder) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Voit valita enintään 3 kysymystä botin etusivulle.' });
        }
        await client.query(
          'UPDATE knowledge SET quick_reply_order=$1,updated_at=NOW() WHERE id=$2 AND tenant_id=$3',
          [quickReplyOrder, req.params.id, tenantId],
        );
      }
    } else if (quickReplyOrder) {
      await client.query(
        'UPDATE knowledge SET quick_reply_order=NULL,updated_at=NOW() WHERE id=$1 AND tenant_id=$2',
        [req.params.id, tenantId],
      );
      quickReplyOrder = null;
    }

    const countResult = await client.query(
      'SELECT count(*)::int AS total FROM knowledge WHERE tenant_id=$1 AND quick_reply_order IS NOT NULL',
      [tenantId],
    );
    await client.query('COMMIT');
    return res.json({
      ok:true,
      featured:Boolean(quickReplyOrder),
      quickReplyOrder,
      selected:Number(countResult.rows[0]?.total || 0),
      max:3,
    });
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('Quick reply update failed', e);
    return res.status(500).json({ error:'Etusivun kysymystä ei voitu päivittää.' });
  } finally {
    client.release();
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
  const l = ['fi','sv','en'].includes(String(lang || '').toLowerCase()) ? String(lang).toLowerCase() : 'fi';
  if (!order) {
    if (l === 'en') return 'I could not find an order matching that order number and email.';
    if (l === 'sv') return 'Jag kunde inte hitta en order med det ordernumret och den e-postadressen.';
    return 'Tilausta ei löytynyt tällä tilausnumerolla ja sähköpostilla.';
  }
  const tracking = Array.isArray(order.tracking) && order.tracking.length
    ? order.tracking.map((x) => x.url || x.number).filter(Boolean).join(', ')
    : '';
  if (l === 'en') return ['Order ' + order.orderNumber + ' was found.',order.fulfillmentStatus ? 'Fulfillment: ' + order.fulfillmentStatus + '.' : '',order.financialStatus ? 'Payment: ' + order.financialStatus + '.' : '',tracking ? 'Tracking: ' + tracking : ''].filter(Boolean).join(' ');
  if (l === 'sv') return ['Order ' + order.orderNumber + ' hittades.',order.fulfillmentStatus ? 'Leveransstatus: ' + order.fulfillmentStatus + '.' : '',order.financialStatus ? 'Betalning: ' + order.financialStatus + '.' : '',tracking ? 'Spårning: ' + tracking : ''].filter(Boolean).join(' ');
  return ['Tilaus ' + order.orderNumber + ' löytyi.',order.fulfillmentStatus ? 'Toimitus: ' + order.fulfillmentStatus + '.' : '',order.financialStatus ? 'Maksu: ' + order.financialStatus + '.' : '',tracking ? 'Seuranta: ' + tracking : ''].filter(Boolean).join(' ');
}

function detectConversationLanguage(text, hinted='') {
  const hint=['fi','sv','en'].includes(String(hinted||'').toLowerCase()) ? String(hinted).toLowerCase() : '';
  const raw=String(text||'').toLowerCase().replace(/[^a-zåäö\s']/g,' ');
  const words=raw.split(/\s+/).filter(Boolean);
  if (!words.length) return hint || 'fi';
  const sets={
    fi:new Set(['ja','on','ei','mitä','mikä','missä','milloin','voiko','voin','haluan','tarvitsen','apua','kiitos','moi','hei','minä','sinä','teillä','hinta','maksaa','ajan','varata','varaus','auki','aukiolo']),
    sv:new Set(['och','är','inte','vad','vilken','var','när','kan','jag','vill','behöver','hjälp','tack','hej','ni','pris','kostar','boka','bokning','öppet','öppettider']),
    en:new Set(['and','is','are','not','what','which','where','when','can','could','i','you','want','need','help','thanks','thank','hello','hi','price','cost','book','booking','open','hours'])
  };
  const score={fi:0,sv:0,en:0};
  for(const w of words) for(const lang of ['fi','sv','en']) if(sets[lang].has(w)) score[lang]++;
  if(/[å]/.test(raw)) score.sv+=2;
  if(/[äö]/.test(raw)) score.fi+=1;
  const best=Object.entries(score).sort((a,b)=>b[1]-a[1])[0];
  return best[1]>0 ? best[0] : (hint || 'fi');
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
  const responseLang = ['fi','sv','en'].includes(String(lang || '').toLowerCase()) ? String(lang).toLowerCase() : 'fi';
  let answer = result.answer;
  let handoff = result.handoff;
  if (handoff) {
    answer = responseLang === 'en'
      ? 'I do not have a verified answer yet. A person from the company needs to handle this.'
      : responseLang === 'sv'
        ? 'Jag har ännu inget verifierat svar. Någon från företaget behöver hantera detta.'
        : 'Tähän ei löytynyt vielä varmennettua vastausta. Yrityksen henkilön pitää käsitellä tämä.';
  }

  await appendChatMessage({
    tenantId:tenant.id,threadId:thread?.id,sourceChannel:channel,
    externalContactId:contactId,visitorRef:contactId,role:'assistant',text:answer,
    metadata:{ handoff,intent:result.intent,sourceIds:result.sourceIds },
  });
  await q(
    `INSERT INTO conversations(id,tenant_id,question,answer,intent,confidence,source_ids,handoff,visitor_ref,source_channel,external_contact_id)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [uid(),tenant.id,message,answer,result.intent,handoff ? Math.min(result.confidence,0.35) : result.confidence,result.sourceIds,handoff,contactId,channel,contactId],
  );
  return {
    answer,handoff,
    verified:!handoff && Array.isArray(result.sourceIds) && result.sourceIds.length>0,
    intent:result.intent,actions:chatActions(kr.rows,message,handoff,responseLang),
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

function normalizeClock(value,fallback) {
  const raw = String(value || '').trim();
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(raw) ? raw : fallback;
}

function normalizeTimeZone(value) {
  const zone = String(value || '').trim() || 'Europe/Helsinki';
  try {
    new Intl.DateTimeFormat('en-US',{ timeZone:zone }).format(new Date());
    return zone;
  } catch {
    return 'Europe/Helsinki';
  }
}

function localClockMinutes(timeZone) {
  const parts = new Intl.DateTimeFormat('en-GB',{
    timeZone:normalizeTimeZone(timeZone),
    hour:'2-digit',
    minute:'2-digit',
    hour12:false,
  }).formatToParts(new Date());
  const hour = Number(parts.find((x) => x.type === 'hour')?.value || 0);
  const minute = Number(parts.find((x) => x.type === 'minute')?.value || 0);
  return hour * 60 + minute;
}

function isInConfiguredAfterHours(tenant) {
  const start = normalizeClock(tenant.missed_call_after_start,'17:00');
  const end = normalizeClock(tenant.missed_call_after_end,'08:00');
  const parse = (clock) => {
    const [h,m] = clock.split(':').map(Number);
    return h * 60 + m;
  };
  const now = localClockMinutes(tenant.missed_call_timezone);
  const a = parse(start);
  const b = parse(end);
  if (a === b) return true;
  return a < b ? (now >= a && now < b) : (now >= a || now < b);
}

async function sendTwilioSms(tenant,to,message) {
  const recipient = normalizePhone(to);
  const from = normalizePhone(tenant.twilio_phone_number);
  const body = String(message || '').trim().slice(0,1500);
  if (!recipient || !from || !body) throw new Error('SMS-viestin tiedot puuttuvat.');
  return twilioApi(
    tenant,
    'POST',
    '/Accounts/' + encodeURIComponent(tenant.twilio_account_sid) + '/Messages.json',
    { To:recipient, From:from, Body:body },
  );
}

async function maybeSendMissedCallSms(tenant,{ to, status, callSid }) {
  const normalizedStatus = String(status || '').trim().toLowerCase();
  const phone = normalizePhone(to);
  const sid = String(callSid || '').trim().slice(0,220);
  if (!tenant.missed_call_sms_enabled || !phone || !sid) return { sent:false, reason:'disabled_or_missing' };
  if (!['no-answer','busy','failed','canceled'].includes(normalizedStatus)) {
    return { sent:false, reason:'not_missed' };
  }
  if (tenant.missed_call_sms_mode === 'after_hours' && !isInConfiguredAfterHours(tenant)) {
    return { sent:false, reason:'outside_schedule' };
  }

  const inserted = await q(
    `INSERT INTO missed_call_sms_events(id,tenant_id,call_sid,phone,call_status,delivery_status)
     VALUES($1,$2,$3,$4,$5,'pending')
     ON CONFLICT(tenant_id,call_sid) DO NOTHING
     RETURNING id`,
    [uid(),tenant.id,sid,phone,normalizedStatus],
  );
  if (!inserted.rowCount) return { sent:false, reason:'duplicate' };

  try {
    const text = String(tenant.missed_call_sms_message || '').trim() ||
      'Hei! Emme juuri nyt pystyneet vastaamaan puheluusi. Voit vastata tähän viestiin, niin RESPONDO AI auttaa heti.';
    const response = await sendTwilioSms(tenant,phone,text);
    await q(
      "UPDATE missed_call_sms_events SET delivery_status='sent',error=NULL WHERE id=$1",
      [inserted.rows[0].id],
    );
    return { sent:true, sid:response.sid || '' };
  } catch (e) {
    await q(
      "UPDATE missed_call_sms_events SET delivery_status='failed',error=$1 WHERE id=$2",
      [String(e?.message || 'SMS failed').slice(0,500),inserted.rows[0].id],
    );
    throw e;
  }
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
    updates.push('channels_api_key=$' + n++);
    values.push(tenant.channels_api_key);
  }
  if (!tenant.meta_verify_token) {
    tenant.meta_verify_token = 'rsp_meta_' + crypto.randomBytes(18).toString('hex');
    updates.push('meta_verify_token=$' + n++);
    values.push(tenant.meta_verify_token);
  }

  if (updates.length) {
    values.push(tenant.id);
    await q(
      'UPDATE tenants SET ' + updates.join(',') + ',updated_at=NOW() WHERE id=$' + n,
      values,
    );
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
        AND u.subscription_status IN ('active','trialing')
        AND (
          COALESCE(u.subscription_cancel_at_period_end,false)=false
          OR u.current_period_end IS NULL
          OR u.current_period_end > NOW()
        )`,
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
    const lang = ['fi','sv','en'].includes(String(req.query.lang || '').toLowerCase()) ? String(req.query.lang).toLowerCase() : 'fi';
    const kr = await q(
      `SELECT title
         FROM knowledge
        WHERE tenant_id=$1
          AND approved=true
          AND quick_reply_order IS NOT NULL
        ORDER BY quick_reply_order ASC
        LIMIT 3`,
      [tenant.id],
    );

    const sourceQuickReplies = kr.rows
      .map((x) => String(x.title || '').trim())
      .filter(Boolean)
      .slice(0, 3);
    const quickReplies = lang === 'fi'
      ? sourceQuickReplies
      : (await Promise.all(sourceQuickReplies.map((title) => forceAnswerLanguage(title, lang)))).filter(Boolean);

    const sourceGreeting = String(tenant.greeting || 'Hei! Miten voin auttaa?').trim();
    const translatedGreeting = lang === 'fi' ? sourceGreeting : await forceAnswerLanguage(sourceGreeting, lang);
    const greeting = translatedGreeting || (lang === 'en'
      ? 'Hi! How can I help?'
      : lang === 'sv'
        ? 'Hej! Hur kan jag hjälpa?'
        : 'Hei! Miten voin auttaa?');

    return res.json({
      token,
      name: tenant.bot_name || 'RESPONDO AI',
      avatar: tenant.bot_avatar || 'robot-1',
      greeting,
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
      bot_name: t.bot_name || 'RESPONDO AI',
      bot_avatar: t.bot_avatar || 'robot-1',
      greeting: t.greeting,
      handoff_message: t.handoff_message,
      accent: t.accent,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.post('/api/public/demo-chat', demoChatLimiter, async (req, res) => {
  let requestLang = 'fi';
  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    body = body || {};
    const lang = ['fi','sv','en'].includes(String(body.lang || '').toLowerCase()) ? String(body.lang).toLowerCase() : 'fi';
    requestLang = lang;
    const message = String(body.message || '').trim().slice(0, 1200);
    if (!message) return res.status(400).json({ error: lang === 'en' ? 'Type a question.' : lang === 'sv' ? 'Skriv en fråga.' : 'Kirjoita kysymys.' });
    const profile = body.profile && typeof body.profile === 'object' ? body.profile : {};
    let rows = buildProfileKnowledge(profile).slice(0, 60);
    // Authenticated dashboard preview must use the tenant's saved knowledge too.
    // Otherwise a normal question such as "Paljonko maksaa?" can accidentally match
    // an unrelated profile field when the pricing field itself is empty.
    try {
      const token = req.cookies?.respondo_session;
      if (token) {
        const session = jwt.verify(token, JWT);
        const tr = await q('SELECT id FROM tenants WHERE owner_user_id=$1',[session.sub]);
        if (tr.rowCount) {
          const kr = await q(
            'SELECT id,category,title,answer,keywords,source_type,source_url FROM knowledge WHERE tenant_id=$1 AND approved=true ORDER BY updated_at DESC,created_at DESC LIMIT 1000',
            [tr.rows[0].id],
          );
          rows = [...kr.rows, ...rows].slice(0, 1100);
        }
      }
    } catch {}
    const history = Array.isArray(body.history) ? body.history.slice(-6) : [];
    const result = await generateGroundedAnswer({
      companyName: String(profile.companyName || 'yrityksen').slice(0, 120),
      rows,
      message,
      history,
      lang,
    });

    const noAnswer = lang === 'en'
      ? 'I cannot find a reliable answer to this from the provided company information. Add the answer to the knowledge base and the bot will know it next time.'
      : lang === 'sv'
        ? 'Jag hittar inget säkert svar på detta i företagets information. Lägg till rätt svar i kunskapsbasen så kan Respondo svara på det nästa gång.'
        : 'Tätä tietoa ei löytynyt yrityksen tiedoista. Lisää oikea vastaus kerran, niin Respondo osaa vastata siihen jatkossa.';
    const translationUnavailable = lang === 'en'
      ? 'I found the relevant company information, but could not translate the answer reliably right now. Please try again in a moment.'
      : lang === 'sv'
        ? 'Jag hittade relevant företagsinformation men kunde inte översätta svaret tillförlitligt just nu. Försök igen om en stund.'
        : noAnswer;

    let handoff = result.handoff;
    let answer = result.answer;
    const actions = chatActions(rows, message, handoff, lang);
    // Action URLs are UI data, not conversational answers. If retrieval picked
    // the booking/quote URL itself as the answer, replace it with natural copy
    // and let the client render the URL only as a clickable action.
    const primaryLinkAction = actions.find((action) => action?.url && /^https?:\/\//i.test(action.url));
    // Contact questions are actions, not scraped navigation prose. Do not let
    // headings such as "Yhteystiedot Pyydä tarjous..." become the chat answer.
    if (!handoff && result.intent === 'Yhteystiedot' && actions.length) {
      answer = lang === 'en' ? 'You can contact us here:'
        : lang === 'sv' ? 'Du kan kontakta oss här:'
        : 'Voit ottaa yhteyttä tästä:';
    }
    if (!handoff && primaryLinkAction && /^https?:\/\/\S+$/i.test(String(answer || '').trim())) {
      answer = result.intent === 'Ajanvaraus'
        ? (lang === 'en' ? 'You can book an appointment here:' : lang === 'sv' ? 'Du kan boka en tid här:' : 'Voit varata ajan tästä:')
        : result.intent === 'Tarjouspyyntö'
          ? (lang === 'en' ? 'You can request a quote here:' : lang === 'sv' ? 'Du kan be om en offert här:' : 'Voit pyytää tarjouksen tästä:')
          : answer;
    }
    if (handoff && !answer) answer = noAnswer;

    return res.json({
      answer,
      handoff,
      confidence: handoff ? Math.min(result.confidence, 0.35) : result.confidence,
      intent: result.intent,
      actions,
    });
  } catch (e) {
    console.error('Demo chat failed', e);
    return res.status(500).json({
      error: requestLang === 'en'
        ? 'The response failed. Please try again in a moment.'
        : requestLang === 'sv'
          ? 'Det gick inte att få ett svar just nu. Försök igen om en stund.'
          : 'Vastausta ei saatu juuri nyt. Yritä hetken päästä uudelleen.'
    });
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
    const lang = ['fi','sv','en'].includes(String(body.lang || '').toLowerCase()) ? String(body.lang).toLowerCase() : 'fi';

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
      `SELECT cm.id,cm.role,cm.message,cm.created_at,
              sa.display_name AS agent_name,sa.avatar AS agent_avatar
         FROM chat_messages cm
         LEFT JOIN support_agents sa ON sa.id = NULLIF(cm.metadata->>'agentId','')::uuid
        WHERE cm.tenant_id=$1 AND cm.thread_id=$2
          AND cm.role='human'${whereAfter.replaceAll('created_at','cm.created_at')}
        ORDER BY cm.created_at ASC
        LIMIT 50`,
      params,
    );
    const assigned = thread.assigned_agent_id
      ? await q('SELECT display_name,avatar,status FROM support_agents WHERE id=$1 AND tenant_id=$2',[thread.assigned_agent_id,tenant.id])
      : { rowCount:0,rows:[] };
    return res.json({ mode:thread.mode,agent:assigned.rowCount ? assigned.rows[0] : null,messages:messages.rows });
  } catch (e) {
    console.error('Live poll failed',e);
    return res.status(500).json({ error:'Live-keskustelua ei saatu.' });
  }
});

app.post('/api/public/:slug/chat', publicChatLimiter, async (req, res) => {
  let requestLang = 'fi';
  try {
    const tr = await publicTenant(req.params.slug);
    if (!tr.rowCount) return res.status(404).json({ error: 'Yritystä ei löytynyt.' });
    const t = tr.rows[0];
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    body = body || {};
    const lang = ['fi','sv','en'].includes(String(body.lang || '').toLowerCase()) ? String(body.lang).toLowerCase() : 'fi';
    requestLang = lang;

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
    if (!message) return res.status(400).json({ error: lang === 'en' ? 'Type a question.' : lang === 'sv' ? 'Skriv en fråga.' : 'Kirjoita kysymys.' });
    const visitorRef = String(body.visitorRef || '').trim().slice(0, 160);
    const detectedLang=detectConversationLanguage(message,lang);
    const thread = visitorRef ? await getOrCreateThread(t.id,'website',visitorRef,visitorRef) : null;
    if (thread && thread.language !== detectedLang && !thread.assigned_agent_id) {
      await q('UPDATE chat_threads SET language=$1,updated_at=NOW() WHERE id=$2 AND tenant_id=$3',[detectedLang,thread.id,t.id]);
      thread.language=detectedLang;
    }
    if (thread) {
      await appendChatMessage({
        tenantId:t.id,threadId:thread.id,sourceChannel:'website',
        externalContactId:visitorRef,visitorRef,role:'user',text:message,
        metadata:{ pageContext:body.pageContext || {} },
      });
      if (thread.mode === 'human') {
        const humanMessage = lang === 'en'
          ? 'Your message was sent to a person from the company.'
          : detectedLang === 'sv'
            ? 'Ditt meddelande skickades till företagets kundtjänst.'
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
      lang: detectedLang,
      pageContext: body.pageContext && typeof body.pageContext === 'object' ? body.pageContext : {},
    });

    const responseLang = detectedLang;
    const noAnswer = responseLang === 'en'
      ? 'I cannot find a reliable answer to this in the company information. Leave your name and phone number or email below, and someone from the company can get back to you.'
      : responseLang === 'sv'
        ? 'Jag hittar inget säkert svar på detta i företagets information. Lämna ditt namn och telefonnummer eller din e-postadress nedan, så kan någon från företaget kontakta dig.'
        : 'Tähän en löydä varmaa vastausta yrityksen tiedoista. Jätä alle nimesi ja puhelinnumerosi tai sähköpostisi, niin yrityksen henkilö voi palata sinulle.';
    const translationUnavailable = responseLang === 'en'
      ? 'I found the relevant company information, but could not translate the answer reliably right now. Leave your contact details below or try again in a moment.'
      : lang === 'sv'
        ? 'Jag hittade relevant företagsinformation men kunde inte översätta svaret tillförlitligt just nu. Lämna dina kontaktuppgifter nedan eller försök igen om en stund.'
        : noAnswer;

    let answer = result.answer;
    let handoff = result.handoff;
    if (handoff) {
      answer = noAnswer;
    }

    const actions = chatActions(kr.rows, message, handoff, responseLang);
    if (thread) {
      await appendChatMessage({
        tenantId:t.id,threadId:thread.id,sourceChannel:'website',
        externalContactId:visitorRef,visitorRef,role:'assistant',text:answer,
        metadata:{ handoff,intent:result.intent,verified:!handoff },
      });
    }
    await q(
      `INSERT INTO conversations(id,tenant_id,question,answer,intent,confidence,source_ids,handoff,visitor_ref,page_url,page_title,source_channel,external_contact_id)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'website',$12)`,
      [
        uid(), t.id, message, answer, result.intent, handoff ? Math.min(result.confidence, 0.35) : result.confidence, result.sourceIds, handoff,
        visitorRef || null,
        String(body.pageContext?.url || '').slice(0, 1000) || null,
        String(body.pageContext?.title || '').slice(0, 300) || null,
        visitorRef || null,
      ],
    );

    return res.json({
      answer,
      handoff,
      confidence: handoff ? Math.min(result.confidence, 0.35) : result.confidence,
      intent: result.intent,
      sourceIds: result.sourceIds,
      verified: !handoff && Array.isArray(result.sourceIds) && result.sourceIds.length > 0,
      actions,
      canLeaveContact: handoff,
    });
  } catch (e) {
    console.error('Chat failed', e);
    return res.status(500).json({
      error: requestLang === 'en'
        ? 'The response failed. Please try again in a moment.'
        : requestLang === 'sv'
          ? 'Det gick inte att få ett svar just nu. Försök igen om en stund.'
          : 'Vastausta ei saatu juuri nyt.'
    });
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
    const actionLang = ['fi','sv','en'].includes(String(body.lang || '').toLowerCase())
      ? String(body.lang).toLowerCase()
      : 'fi';
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
        const sourceServiceName = String(tenant.quote_service_name || 'Tarjous').trim();
        const sourceUnitLabel = String(tenant.quote_unit_label || 'kpl').trim();
        const localizedServiceName = actionLang === 'fi'
          ? sourceServiceName
          : (await forceAnswerLanguage(sourceServiceName, actionLang)) ||
            (actionLang === 'en' ? 'Quote' : 'Offert');
        const localizedUnitLabel = actionLang === 'fi'
          ? sourceUnitLabel
          : (await forceAnswerLanguage(sourceUnitLabel, actionLang)) ||
            (actionLang === 'en' ? 'pcs' : 'st');
        computedQuote = {
          serviceName:localizedServiceName,
          unitLabel:localizedUnitLabel,
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
      ? orderStatusText(ecommerceOrder,actionLang)
      : '';
    const rawDeliveryMessage = String(
      delivery.result?.customerMessage ||
      delivery.result?.message ||
      ''
    ).trim().slice(0,1200);
    const translatedDeliveryMessage = rawDeliveryMessage && actionLang !== 'fi'
      ? await forceAnswerLanguage(rawDeliveryMessage, actionLang)
      : rawDeliveryMessage;
    const customerMessage = String(
      nativeOrderMessage ||
      translatedDeliveryMessage ||
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
                    name:computedQuote.serviceName || ((actionLang === 'en' ? 'Quote' : actionLang === 'sv' ? 'Offert' : 'Tarjous') + ' · ' + tenant.name),
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
              success_url:BASE + '/maksu-valmis?action=' + encodeURIComponent(id) + '&session_id={CHECKOUT_SESSION_ID}&lang=' + encodeURIComponent(actionLang),
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
        actionLang === 'en'
          ? (type === 'booking' ? 'Your booking request has been received.' :
             type === 'quote' ? 'Your quote request has been received.' :
             type === 'order_status' ? 'Your order-status request has been received.' :
             'Your contact request has been received.')
          : actionLang === 'sv'
            ? (type === 'booking' ? 'Din bokningsförfrågan har tagits emot.' :
               type === 'quote' ? 'Din offertförfrågan har tagits emot.' :
               type === 'order_status' ? 'Din förfrågan om orderstatus har tagits emot.' :
               'Din kontaktförfrågan har tagits emot.')
            : (type === 'booking' ? 'Ajanvarauspyyntösi on vastaanotettu.' :
               type === 'quote' ? 'Tarjouspyyntösi on vastaanotettu.' :
               type === 'order_status' ? 'Tilaustietojen tarkistuspyyntö on vastaanotettu.' :
               'Yhteydenottopyyntösi on vastaanotettu.')
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
    const missedCallSmsEnabled = Boolean(req.body.missedCallSmsEnabled);
    const missedCallSmsMessage = String(req.body.missedCallSmsMessage || '').trim().slice(0,1500) ||
      'Hei! Emme juuri nyt pystyneet vastaamaan puheluusi. Voit vastata tähän viestiin, niin RESPONDO AI auttaa heti.';
    const missedCallSmsMode = req.body.missedCallSmsMode === 'after_hours' ? 'after_hours' : 'immediate';
    const missedCallAfterStart = normalizeClock(req.body.missedCallAfterStart,'17:00');
    const missedCallAfterEnd = normalizeClock(req.body.missedCallAfterEnd,'08:00');
    const missedCallTimezone = normalizeTimeZone(req.body.missedCallTimezone);

    await q(
      `UPDATE tenants SET twilio_account_sid=$1,twilio_auth_token=$2,twilio_phone_number=$3,
         voice_handoff_number=$4,voice_enabled=$5,missed_call_sms_enabled=$6,
         missed_call_sms_message=$7,missed_call_sms_mode=$8,missed_call_after_start=$9,
         missed_call_after_end=$10,missed_call_timezone=$11,updated_at=NOW() WHERE id=$12`,
      [
        accountSid || null,
        authToken ? encryptSecret(authToken) : tenant.twilio_auth_token,
        phoneNumber || null,
        handoffNumber || null,
        enabled,
        missedCallSmsEnabled,
        missedCallSmsMessage,
        missedCallSmsMode,
        missedCallAfterStart,
        missedCallAfterEnd,
        missedCallTimezone,
        tenant.id,
      ],
    );
    return res.json({
      ok:true,
      webhookUrl:BASE + '/api/voice/' + encodeURIComponent(tenant.slug) + '/incoming',
      smsWebhookUrl:BASE + '/api/sms/' + encodeURIComponent(tenant.slug) + '/incoming',
      missedCallWebhookUrl:BASE + '/api/voice/' + encodeURIComponent(tenant.slug) + '/missed-call',
    });
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

app.post('/api/app/voice/test-sms', auth, subscribed, async (req,res) => {
  try {
    const tr = await q('SELECT * FROM tenants WHERE owner_user_id=$1',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const tenant = tr.rows[0];
    const to = normalizePhone(req.body.to || tenant.voice_handoff_number);
    if (!to) return res.status(400).json({ error:'Lisää ensin testinumero kohtaan numero ihmiselle siirtoa varten.' });
    if (!tenant.twilio_account_sid || !tenant.twilio_auth_token || !tenant.twilio_phone_number) {
      return res.status(400).json({ error:'Lisää Twilio-tunnukset ja Twilio-numero ensin.' });
    }
    const message = String(tenant.missed_call_sms_message || '').trim() ||
      'Hei! Emme juuri nyt pystyneet vastaamaan puheluusi. Voit vastata tähän viestiin, niin RESPONDO AI auttaa heti.';
    const sent = await sendTwilioSms(tenant,to,message);
    return res.json({ ok:true,sid:sent.sid || '' });
  } catch (e) {
    return res.status(400).json({ error:e.message || 'Testi-SMS:n lähetys epäonnistui.' });
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
        SmsUrl:BASE + '/api/sms/' + encodeURIComponent(tenant.slug) + '/incoming',
        SmsMethod:'POST',
      },
    );
    await q('UPDATE tenants SET voice_enabled=TRUE,updated_at=NOW() WHERE id=$1',[tenant.id]);
    return res.json({
      ok:true,
      webhookUrl:BASE + '/api/voice/' + encodeURIComponent(tenant.slug) + '/incoming',
      smsWebhookUrl:BASE + '/api/sms/' + encodeURIComponent(tenant.slug) + '/incoming',
    });
  } catch (e) {
    return res.status(400).json({ error:e.message || 'Twilio-numeroa ei voitu aktivoida.' });
  }
});

app.post('/api/app/support-agents', auth, subscribed, async (req,res) => {
  try {
    const tr = await q('SELECT id FROM tenants WHERE owner_user_id=$1',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const displayName = String(req.body.displayName || '').replace(/[<>]/g,'').trim().slice(0,60);
    const username = String(req.body.username || '').trim().toLowerCase().replace(/[^a-z0-9._-]/g,'').slice(0,50);
    const password = String(req.body.password || '');
    const languages=[...new Set((Array.isArray(req.body.languages)?req.body.languages:[]).map(x=>String(x).toLowerCase()).filter(x=>['fi','sv','en'].includes(x)))];
    if (!displayName) return res.status(400).json({ error:'Anna asiakaspalvelijan nimi.' });
    if (username.length < 3) return res.status(400).json({ error:'Käyttäjänimen pitää olla vähintään 3 merkkiä.' });
    if (password.length < 10) return res.status(400).json({ error:'Salasanan pitää olla vähintään 10 merkkiä.' });
    if (!languages.length) return res.status(400).json({ error:'Valitse vähintään yksi palvelukieli.' });
    const avatar = cleanBotAvatar(req.body.avatar || '') === 'robot-1' && !String(req.body.avatar || '').startsWith('data:image/') ? null : cleanBotAvatar(req.body.avatar || '');
    const passwordHash = await bcrypt.hash(password, 12);
    const row = await q(
      `INSERT INTO support_agents(id,tenant_id,display_name,avatar,username,password_hash,languages,status) VALUES($1,$2,$3,$4,$5,$6,$7,'offline') RETURNING id,display_name,avatar,username,languages,status,created_at`,
      [uid(),tr.rows[0].id,displayName,avatar,username,passwordHash,languages],
    );
    return res.json(row.rows[0]);
  } catch (e) { return res.status(400).json({ error:e.message || 'Profiilia ei voitu luoda.' }); }
});

app.delete('/api/app/support-agents/:id', auth, subscribed, async (req,res) => {
  try {
    const tr = await q('SELECT id FROM tenants WHERE owner_user_id=$1',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    await q('UPDATE chat_threads SET assigned_agent_id=NULL WHERE tenant_id=$1 AND assigned_agent_id=$2',[tr.rows[0].id,req.params.id]);
    const rr = await q('DELETE FROM support_agents WHERE id=$1 AND tenant_id=$2 RETURNING id',[req.params.id,tr.rows[0].id]);
    if (!rr.rowCount) return res.status(404).json({ error:'Profiilia ei löytynyt.' });
    return res.json({ ok:true });
  } catch { return res.status(500).json({ error:'Profiilia ei voitu poistaa.' }); }
});

app.post('/api/app/support-agents/:id/status', auth, subscribed, async (req,res) => {
  try {
    const tr = await q('SELECT id FROM tenants WHERE owner_user_id=$1',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const status = req.body.status === 'online' ? 'online' : 'offline';
    const rr = await q("UPDATE support_agents SET status=$1,updated_at=NOW() WHERE id=$2 AND tenant_id=$3 RETURNING id,display_name,avatar,status",[status,req.params.id,tr.rows[0].id]);
    if (!rr.rowCount) return res.status(404).json({ error:'Profiilia ei löytynyt.' });
    return res.json(rr.rows[0]);
  } catch { return res.status(500).json({ error:'Tilaa ei voitu päivittää.' }); }
});

app.post('/api/app/live/:id/assign', auth, subscribed, async (req,res) => {
  try {
    const tr = await q('SELECT id FROM tenants WHERE owner_user_id=$1',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const tenantId=tr.rows[0].id;
    const agentId=String(req.body.agentId || '').trim() || null;
    if (agentId) {
      const ar=await q('SELECT id FROM support_agents WHERE id=$1 AND tenant_id=$2',[agentId,tenantId]);
      if (!ar.rowCount) return res.status(404).json({ error:'Profiilia ei löytynyt.' });
    }
    const rr=await q("UPDATE chat_threads SET assigned_agent_id=$1,mode=CASE WHEN $1::uuid IS NULL THEN mode ELSE 'human' END,status='open',updated_at=NOW() WHERE id=$2 AND tenant_id=$3 RETURNING *",[agentId,req.params.id,tenantId]);
    if (!rr.rowCount) return res.status(404).json({ error:'Keskustelua ei löytynyt.' });
    return res.json(rr.rows[0]);
  } catch(e) { return res.status(400).json({ error:e.message || 'Keskustelua ei voitu osoittaa.' }); }
});

app.post('/api/app/live/:id/mode', auth, async (req,res) => {
  if (req.user.role === 'agent') {
    const owned=await q('SELECT id FROM chat_threads WHERE id=$1 AND tenant_id=$2 AND assigned_agent_id=$3',[req.params.id,req.user.tenantId,req.user.agentId]);
    if (!owned.rowCount) return res.status(403).json({ error:'Keskustelua ei ole osoitettu sinulle.' });
  } else {
    const sr=await q('SELECT status,subscription_status FROM users WHERE id=$1',[req.user.sub]);
    if (!sr.rowCount || sr.rows[0].status!=='active' || !['active','trialing'].includes(sr.rows[0].subscription_status)) return res.status(402).json({ error:'Aktiivinen tilaus tarvitaan.' });
  }
  try {
    const tr = req.user.role === 'agent' ? { rowCount:1,rows:[{id:req.user.tenantId}] } : await q('SELECT id FROM tenants WHERE owner_user_id=$1',[req.user.sub]);
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

app.post('/api/app/live/:id/reply', auth, async (req,res) => {
  if (req.user.role === 'agent') {
    const owned=await q('SELECT id FROM chat_threads WHERE id=$1 AND tenant_id=$2 AND assigned_agent_id=$3',[req.params.id,req.user.tenantId,req.user.agentId]);
    if (!owned.rowCount) return res.status(403).json({ error:'Keskustelua ei ole osoitettu sinulle.' });
  } else {
    const sr=await q('SELECT status,subscription_status FROM users WHERE id=$1',[req.user.sub]);
    if (!sr.rowCount || sr.rows[0].status!=='active' || !['active','trialing'].includes(sr.rows[0].subscription_status)) return res.status(402).json({ error:'Aktiivinen tilaus tarvitaan.' });
  }
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
      role:'human',text,metadata: thread.assigned_agent_id ? { agentId:thread.assigned_agent_id } : {},
    });
    if (['whatsapp','instagram'].includes(thread.source_channel)) {
      await sendMetaMessage(tenant,thread.source_channel,thread.external_contact_id,text);
    } else if (thread.source_channel === 'sms') {
      await sendTwilioSms(tenant,thread.external_contact_id,text);
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
    const lang = ['fi','sv','en'].includes(String(req.body.lang || '').toLowerCase())
      ? String(req.body.lang).toLowerCase()
      : 'fi';
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

function voiceHandoffTwiml(tenant,prompt) {
  const action = BASE + '/api/voice/' + encodeURIComponent(tenant.slug) + '/missed-call';
  return '<?xml version="1.0" encoding="UTF-8"?>' +
    '<Response>' +
      '<Say language="fi-FI">' + xmlEscape(prompt) + '</Say>' +
      '<Dial action="' + xmlEscape(action) + '" method="POST" timeout="20">' +
        xmlEscape(tenant.voice_handoff_number) +
      '</Dial>' +
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
        voiceHandoffTwiml(tenant,'Yhdistän sinut asiakaspalvelijalle.'),
      );
    }

    const result = await processExternalChannelMessage(tenant,'phone',callSid || uid(),speech,'fi');
    if ((result.handoff || result.humanTakeover) && tenant.voice_handoff_number) {
      return res.type('text/xml').send(
        voiceHandoffTwiml(tenant,'Tarvitaan ihminen avuksi. Yhdistän puhelun.'),
      );
    }

    const answer = result.answer || 'Tarvitsen tähän yrityksen henkilön apua. Voit jättää yhteydenottopyynnön verkkosivulla.';
    return res.type('text/xml').send(voiceGatherTwiml(tenant.slug,answer + ' Voinko auttaa vielä jossain muussa?'));
  } catch (e) {
    console.error('Voice respond failed',e);
    return res.status(500).type('text/xml').send('<Response><Say language="fi-FI">Palvelussa tapahtui virhe. Yritä myöhemmin uudelleen.</Say></Response>');
  }
});

app.post('/api/voice/:slug/missed-call', async (req,res) => {
  try {
    const tr = await publicTenant(req.params.slug);
    if (!tr.rowCount) return res.sendStatus(404);
    const tenant = tr.rows[0];
    const suffix = '/api/voice/' + encodeURIComponent(tenant.slug) + '/missed-call';
    if (!twilioSignatureValid(req,tenant,suffix)) return res.sendStatus(403);

    const status = String(req.body.DialCallStatus || req.body.CallStatus || '').trim();
    const caller = normalizePhone(req.body.From);
    const callSid = String(req.body.CallSid || req.body.ParentCallSid || '').trim();
    let result = { sent:false };
    try {
      result = await maybeSendMissedCallSms(tenant,{ to:caller,status,callSid });
    } catch (e) {
      console.error('Missed-call SMS failed',e);
    }

    const message = result.sent
      ? '<Say language="fi-FI">Emme saaneet asiakaspalvelijaa kiinni. Lähetimme sinulle tekstiviestin, johon voit vastata.</Say>'
      : '';
    return res.type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response>' + message + '</Response>');
  } catch (e) {
    console.error('Missed-call callback failed',e);
    return res.status(500).type('text/xml').send('<Response></Response>');
  }
});

app.post('/api/sms/:slug/incoming', async (req,res) => {
  try {
    const tr = await publicTenant(req.params.slug);
    if (!tr.rowCount) return res.sendStatus(404);
    const tenant = tr.rows[0];
    const suffix = '/api/sms/' + encodeURIComponent(tenant.slug) + '/incoming';
    if (!twilioSignatureValid(req,tenant,suffix)) return res.sendStatus(403);

    const from = normalizePhone(req.body.From);
    const body = String(req.body.Body || '').trim().slice(0,1200);
    if (!from || !body) {
      return res.type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    }

    const result = await processExternalChannelMessage(tenant,'sms',from,body,'fi');
    if (result.humanTakeover || !result.answer) {
      return res.type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    }
    return res.type('text/xml').send(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Message>' +
      xmlEscape(result.answer) +
      '</Message></Response>',
    );
  } catch (e) {
    console.error('Inbound SMS failed',e);
    return res.status(500).type('text/xml').send('<Response></Response>');
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

    const subscription = await stripe.subscriptions.update(id, { cancel_at_period_end: true });
    const periodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : null;

    await q(
      `UPDATE users
          SET subscription_cancel_at_period_end=true,
              current_period_end=COALESCE($1,current_period_end),
              updated_at=NOW()
        WHERE id=$2`,
      [periodEnd, req.user.sub],
    );

    return res.json({
      ok: true,
      cancelAtPeriodEnd: true,
      currentPeriodEnd: periodEnd ? periodEnd.toISOString() : null,
    });
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
  await q("ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'fi'");
  await q('ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code TEXT');
  await q("ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE");
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
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS bot_name TEXT NOT NULL DEFAULT 'RESPONDO AI'");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS bot_avatar TEXT NOT NULL DEFAULT 'robot-1'");
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
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS missed_call_sms_enabled BOOLEAN NOT NULL DEFAULT FALSE");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS missed_call_sms_message TEXT NOT NULL DEFAULT 'Hei! Emme juuri nyt pystyneet vastaamaan puheluusi. Voit vastata tähän viestiin, niin RESPONDO AI auttaa heti.'");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS missed_call_sms_mode TEXT NOT NULL DEFAULT 'immediate'");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS missed_call_after_start TEXT NOT NULL DEFAULT '17:00'");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS missed_call_after_end TEXT NOT NULL DEFAULT '08:00'");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS missed_call_timezone TEXT NOT NULL DEFAULT 'Europe/Helsinki'");




  await q("ALTER TABLE knowledge ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'manual'");
  await q("ALTER TABLE knowledge ADD COLUMN IF NOT EXISTS source_url TEXT");
  await q("ALTER TABLE knowledge ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT TRUE");
  await q("ALTER TABLE knowledge ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()");
  await q("ALTER TABLE knowledge ADD COLUMN IF NOT EXISTS quick_reply_order SMALLINT");
  await q("CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_quick_reply_slot ON knowledge(tenant_id, quick_reply_order) WHERE quick_reply_order IS NOT NULL");
  await q("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS page_url TEXT");
  await q("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS page_title TEXT");
  await q("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS source_channel TEXT NOT NULL DEFAULT 'website'");
  await q("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS external_contact_id TEXT");

  await q(`CREATE TABLE IF NOT EXISTS site_visits (
    id UUID PRIMARY KEY,
    visitor_hash TEXT NOT NULL,
    path TEXT NOT NULL,
    referrer TEXT,
    referrer_host TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    language TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await q("ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS language TEXT");
  await q('CREATE INDEX IF NOT EXISTS idx_site_visits_created ON site_visits(created_at DESC)');
  await q('CREATE INDEX IF NOT EXISTS idx_site_visits_visitor ON site_visits(visitor_hash, created_at DESC)');

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
  await q(`CREATE TABLE IF NOT EXISTS support_agents (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    avatar TEXT,
    username TEXT,
    password_hash TEXT,
    status TEXT NOT NULL DEFAULT 'offline',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await q('ALTER TABLE support_agents ADD COLUMN IF NOT EXISTS username TEXT');
  await q('ALTER TABLE support_agents ADD COLUMN IF NOT EXISTS password_hash TEXT');
  await q("ALTER TABLE support_agents ADD COLUMN IF NOT EXISTS languages TEXT[] NOT NULL DEFAULT ARRAY['fi']::TEXT[]");
  await q("ALTER TABLE chat_threads ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'fi'");
  await q('CREATE INDEX IF NOT EXISTS idx_support_agents_tenant ON support_agents(tenant_id,created_at ASC)');
  await q('CREATE UNIQUE INDEX IF NOT EXISTS idx_support_agents_username_unique ON support_agents(lower(username)) WHERE username IS NOT NULL');
  await q('ALTER TABLE chat_threads ADD COLUMN IF NOT EXISTS assigned_agent_id UUID REFERENCES support_agents(id) ON DELETE SET NULL');

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
  await q(`CREATE TABLE IF NOT EXISTS missed_call_sms_events (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    call_sid TEXT NOT NULL,
    phone TEXT,
    call_status TEXT,
    delivery_status TEXT NOT NULL DEFAULT 'pending',
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id,call_sid)
  )`);
  await q('CREATE INDEX IF NOT EXISTS idx_missed_call_sms_tenant_created ON missed_call_sms_events(tenant_id,created_at DESC)');



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
    if (process.env.NODE_ENV === 'production') {
      process.exitCode = 1;
      return;
    }
  }
  app.listen(PORT, () => console.log(`RESPONDO AI listening on ${PORT}`));
}

export { app, websiteKnowledgeCandidates, extractFreeWebsiteProfile, selectRelevantKnowledge, conciseKnowledgeAnswer, specificServiceConfirmation, generateGroundedAnswer, chatActions, queryTopic, fetchPublicHtml };
if (process.env.NODE_ENV !== 'test') start();

