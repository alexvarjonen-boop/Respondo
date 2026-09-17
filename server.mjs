import express from 'express';
import path from 'path';
import crypto from 'crypto';
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
app.use(rateLimit({ windowMs: 60000, limit: 180, standardHeaders: true, legacyHeaders: false }));
app.use(express.static(path.join(__dirname, 'public')));

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

app.get('/api/public/config', (req, res) =>
  res.json({
    brand: 'RESPONDO AI',
    supportEmail: process.env.SUPPORT_EMAIL || 'alexvarjonen@gmail.com',
    trialDays: 3,
    monthlyNet: 49,
    yearlyNet: 549,
  }),
);

app.post('/api/auth/start-checkout', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Tietokantaa ei ole yhdistetty.' });
  if (!stripe) return res.status(503).json({ error: 'Stripe-maksuja ei ole yhdistetty.' });

  const { fullName, companyName, businessId, password, plan, acceptedTerms } = req.body;
  const email = cleanEmail(req.body.email);
  if (!acceptedTerms || !email || !companyName || !password || password.length < 10) {
    return res.status(400).json({
      error: 'Täytä kaikki pakolliset tiedot. Salasanan on oltava vähintään 10 merkkiä.',
    });
  }

  const price = plan === 'yearly' ? process.env.STRIPE_YEARLY_PRICE_ID : process.env.STRIPE_MONTHLY_PRICE_ID;
  if (!price) return res.status(503).json({ error: 'Stripe-hintaa ei ole määritetty.' });

  try {
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
    const hash = await bcrypt.hash(password, 12);
    const client = await pool.connect();
    let session;

    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO users(id,email,password_hash,full_name,company_name,business_id,status)
         VALUES($1,$2,$3,$4,$5,$6,'pending')`,
        [id, email, hash, fullName || '', companyName, businessId || null],
      );

      let tenantSlug = slug(companyName);
      const slugExists = await client.query('SELECT 1 FROM tenants WHERE slug=$1', [tenantSlug]);
      if (slugExists.rowCount) tenantSlug = `${tenantSlug}-${crypto.randomBytes(3).toString('hex')}`;

      await client.query(
        `INSERT INTO tenants(id,owner_user_id,slug,name,contact_email)
         VALUES($1,$2,$3,$4,$5)`,
        [uid(), id, tenantSlug, companyName, email],
      );

      session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer_email: email,
        line_items: [{ price, quantity: 1 }],
        subscription_data: { trial_period_days: 3, metadata: { user_id: id } },
        tax_id_collection: { enabled: true },
        billing_address_collection: 'required',
        allow_promotion_codes: false,
        success_url: `${BASE}/app?checkout=success`,
        cancel_url: `${BASE}/tilaus?cancelled=1`,
        metadata: { user_id: id, plan: plan === 'yearly' ? 'yearly' : 'monthly' },
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
    return res.status(500).json({ error: 'Tilauksen aloitus epäonnistui.' });
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
              count(*) FILTER(WHERE handoff=true)::int handoffs
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
        LIMIT 20`,
      [tenant.id],
    );
    const a = s.rows[0];
    const total = a.total || 0;
    return res.json({
      tenant,
      knowledge: k.rows,
      unanswered: unanswered.rows,
      stats: {
        conversations: total,
        answeredRate: total ? Math.round((a.answered * 100) / total) : 0,
        handoffRate: total ? Math.round((a.handoffs * 100) / total) : 0,
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

    const fields = [
      ['Hinnat', req.body.pricing, ['hinta','hinnasto','maksaa','alv']],
      ['Aukioloajat', req.body.hours, ['auki','aukiolo','aukioloajat','milloin']],
      ['Puhelinnumero', req.body.phone, ['puhelin','numero','soittaa','yhteystiedot']],
      ['Sähköposti', req.body.email, ['sähköposti','email','yhteystiedot']],
      ['Palvelut', req.body.services, ['palvelu','palvelut','teette','tarjoatte']],
      ['Toimialue', req.body.serviceArea, ['toimialue','alue','missä','paikkakunta']],
      ['Osoite', req.body.address, ['osoite','sijainti','missä']],
      ['Verkkosivu', req.body.website, ['verkkosivu','www','nettisivu']],
      ['Lisätiedot', req.body.notes, ['lisätieto','muuta','huomio']]
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
        'INSERT INTO knowledge(id,tenant_id,category,title,answer,keywords) VALUES($1,$2,$3,$4,$5,$6)',
        [uid(), tenantId, 'Yrityksen perustiedot', title, answer, keywords]
      );
    }

    await client.query(
      'UPDATE tenants SET contact_phone=$1, contact_email=$2, website=$3, updated_at=NOW() WHERE id=$4',
      [
        String(req.body.phone || '').trim() || null,
        String(req.body.email || '').trim() || null,
        String(req.body.website || '').trim() || null,
        tenantId
      ]
    );

    await client.query('COMMIT');
    return res.json({ ok: true });
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('Business profile save failed', e);
    return res.status(500).json({ error: 'Yrityksen tietojen tallennus epäonnistui.' });
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
      'INSERT INTO knowledge(id,tenant_id,category,title,answer,keywords) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',
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
      'INSERT INTO knowledge(id,tenant_id,category,title,answer,keywords) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',
      [uid(), t.rows[0].id, category, title, answer, ks],
    );
    return res.json(r.rows[0]);
  } catch (e) {
    return res.status(500).json({ error: e.message });
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

app.post('/api/public/:slug/chat', async (req, res) => {
  try {
    const tr = await publicTenant(req.params.slug);
    if (!tr.rowCount) return res.status(404).json({ error: 'Yritystä ei löytynyt.' });
    const t = tr.rows[0];
    const kr = await q('SELECT * FROM knowledge WHERE tenant_id=$1 ORDER BY created_at ASC', [t.id]);
    const message = String(req.body.message || '').trim();
    if (!message) return res.status(400).json({ error: 'Kirjoita kysymys.' });

    let answer = t.handoff_message;
    let handoff = true;
    let intent = 'Tuntematon';
    let confidence = 0.25;
    let sources = [];

    if (openai && kr.rows.length) {
      const knowledge = kr.rows
        .map((x, i) => `[${i + 1}] ${x.category} | ${x.title}\n${x.answer}`)
        .join('\n\n');
      const prompt = `Olet ${t.name}-yrityksen asiakaspalvelija. Vastaa VAIN alla olevan hyväksytyn tietopohjan perusteella. Jos vastausta ei löydy varmasti, vastaa täsmälleen: HANDOFF. Älä keksi mitään.\n\nTIETOPOHJA:\n${knowledge}\n\nKYSYMYS: ${message}`;
      const rr = await openai.responses.create({
        model: process.env.OPENAI_MODEL || 'gpt-5.6-luna',
        input: prompt,
        max_output_tokens: 220,
      });
      const text = (rr.output_text || '').trim();
      if (text && text !== 'HANDOFF') {
        answer = text;
        handoff = false;
        confidence = 0.93;
        intent = 'Tietopohjakysymys';
        sources = kr.rows.map((x) => x.id);
      }
    } else {
      const norm = message.toLowerCase();
      const hit = kr.rows.find((x) =>
        [x.title, ...(x.keywords || [])].some((k) => norm.includes(String(k).toLowerCase())),
      );
      if (hit) {
        answer = hit.answer;
        handoff = false;
        confidence = 0.85;
        intent = hit.title;
        sources = [hit.id];
      }
    }

    await q(
      'INSERT INTO conversations(id,tenant_id,question,answer,intent,confidence,source_ids,handoff,visitor_ref) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [uid(), t.id, message, answer, intent, confidence, sources, handoff, req.body.visitorRef || null],
    );
    return res.json({ answer, handoff, confidence, intent });
  } catch (e) {
    console.error('Chat failed', e);
    return res.status(500).json({ error: 'Vastaaminen epäonnistui.' });
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

app.listen(PORT, () => console.log(`RESPONDO AI listening on ${PORT}`));
