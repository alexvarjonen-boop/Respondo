import pg from 'pg';

const isProduction = process.env.NODE_ENV === 'production';
const ssl = isProduction ? { rejectUnauthorized: false } : undefined;

async function clearLegacyPaidChannelState() {
  if (!process.env.DATABASE_URL) return;
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl });
  try {
    // Old paid-channel columns may still exist in databases upgraded from older
    // Respondo versions. Inspect the schema first so startup never references a
    // column or table that has already been removed.
    const nullableResetSql = new Map([
      ['twilio_account_sid', 'twilio_account_sid=NULL'],
      ['twilio_auth_token', 'twilio_auth_token=NULL'],
      ['twilio_phone_number', 'twilio_phone_number=NULL'],
      ['voice_business_number', 'voice_business_number=NULL'],
      ['voice_greeting', 'voice_greeting=NULL'],
      ['voice_handoff_number', 'voice_handoff_number=NULL'],
      ['meta_app_secret', 'meta_app_secret=NULL'],
      ['meta_verify_token', 'meta_verify_token=NULL'],
      ['whatsapp_phone_number_id', 'whatsapp_phone_number_id=NULL'],
      ['whatsapp_access_token', 'whatsapp_access_token=NULL'],
      ['instagram_account_id', 'instagram_account_id=NULL'],
      ['instagram_access_token', 'instagram_access_token=NULL'],
    ]);
    const booleanResetSql = new Map([
      ['voice_enabled', 'voice_enabled=FALSE'],
      ['missed_call_sms_enabled', 'missed_call_sms_enabled=FALSE'],
    ]);
    const legacyColumns = [...nullableResetSql.keys(), ...booleanResetSql.keys()];

    const existingColumns = await pool.query(
      `SELECT column_name
         FROM information_schema.columns
        WHERE table_schema='public'
          AND table_name='tenants'
          AND column_name = ANY($1::text[])`,
      [legacyColumns],
    );
    const existing = new Set(existingColumns.rows.map((row) => String(row.column_name || '')));
    const assignments = [
      ...[...nullableResetSql].filter(([name]) => existing.has(name)).map(([,sql]) => sql),
      ...[...booleanResetSql].filter(([name]) => existing.has(name)).map(([,sql]) => sql),
    ];

    if (assignments.length) {
      const dirtyPredicates = [
        ...[...nullableResetSql].filter(([name]) => existing.has(name)).map(([name]) => name + ' IS NOT NULL'),
        ...[...booleanResetSql].filter(([name]) => existing.has(name)).map(([name]) => name + '=TRUE'),
      ];
      await pool.query(
        'UPDATE tenants SET ' + assignments.join(', ') +
        (dirtyPredicates.length ? ' WHERE ' + dirtyPredicates.join(' OR ') : ''),
      );
    }

    const legacySmsTable = await pool.query(
      "SELECT to_regclass('public.missed_call_sms_events') AS relation_name",
    );
    if (legacySmsTable.rows[0]?.relation_name) {
      await pool.query('DELETE FROM missed_call_sms_events');
    }
    // This table tracks which accounts have already received their welcome
    // email. Unlike the rest of our runtime tables it is created lazily by
    // server.mjs, so explicitly harden it for Supabase Data API users too.
    await pool.query(`CREATE TABLE IF NOT EXISTS public.signup_welcome_emails (
      user_id TEXT PRIMARY KEY,
      sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    await pool.query('ALTER TABLE public.signup_welcome_emails ENABLE ROW LEVEL SECURITY');
    await pool.query('REVOKE ALL PRIVILEGES ON TABLE public.signup_welcome_emails FROM anon, authenticated, service_role');
    // Requests for paid hands-on bot setup contain customer/company details.
    // Keep them server-only, even when the Supabase Data API is enabled.
    await pool.query(`CREATE TABLE IF NOT EXISTS public.setup_service_requests (
      session_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      website_url TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'received',
      customer_emailed_at TIMESTAMPTZ,
      owner_emailed_at TIMESTAMPTZ,
      ready_emailed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    await pool.query('ALTER TABLE public.setup_service_requests ENABLE ROW LEVEL SECURITY');
    await pool.query('REVOKE ALL PRIVILEGES ON TABLE public.setup_service_requests FROM anon, authenticated, service_role');
  } finally {
    await pool.end();
  }
}

await clearLegacyPaidChannelState();

const originalPoolQuery = pg.Pool.prototype.query;
pg.Pool.prototype.query = function(query, ...args) {
  const sql = typeof query === 'string' ? query : String(query?.text || '');
  const writesRemovedPaidChannelState =
    /^\s*UPDATE\s+tenants\s+SET\b/i.test(sql) &&
    /\b(?:twilio_|voice_|missed_call_|meta_|whatsapp_|instagram_)/i.test(sql);
  const writesRemovedSmsEvents =
    /^\s*(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+missed_call_sms_events\b/i.test(sql);
  if (writesRemovedPaidChannelState || writesRemovedSmsEvents) {
    return Promise.reject(new Error('Removed paid messaging/voice integrations cannot be enabled in production.'));
  }
  return originalPoolQuery.call(this, query, ...args);
};

const blockedPaidApiHosts = new Set([
  'api.twilio.com',
  'graph.facebook.com',
  'graph.instagram.com',
  'api.openai.com',
]);

const nativeFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = async (input, init) => {
  const raw = typeof input === 'string' ? input : String(input?.url || input || '');
  let url = null;
  try { url = new URL(raw); } catch {}
  if (url && blockedPaidApiHosts.has(url.hostname.toLowerCase())) {
    throw new Error('Direct calls to removed paid API integrations are disabled in production.');
  }
  return nativeFetch(input, init);
};

await import('./server.mjs');
