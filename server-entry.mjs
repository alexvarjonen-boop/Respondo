import pg from 'pg';

const isProduction = process.env.NODE_ENV === 'production';
const ssl = isProduction ? { rejectUnauthorized: false } : undefined;

async function clearLegacyPaidChannelState() {
  if (!process.env.DATABASE_URL) return;
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl });
  try {
    try {
      await pool.query(`
        UPDATE tenants
           SET twilio_account_sid=NULL,
               twilio_auth_token=NULL,
               twilio_phone_number=NULL,
               voice_handoff_number=NULL,
               voice_enabled=FALSE,
               missed_call_sms_enabled=FALSE
         WHERE twilio_account_sid IS NOT NULL
            OR twilio_auth_token IS NOT NULL
            OR twilio_phone_number IS NOT NULL
            OR voice_handoff_number IS NOT NULL
            OR voice_enabled=TRUE
            OR missed_call_sms_enabled=TRUE
      `);
      await pool.query('DELETE FROM missed_call_sms_events');
    } catch (error) {
      if (!['42703','42P01'].includes(String(error?.code || ''))) throw error;
    }

    try {
      await pool.query(`
        UPDATE tenants
           SET meta_app_secret=NULL,
               whatsapp_phone_number_id=NULL,
               whatsapp_access_token=NULL,
               instagram_account_id=NULL,
               instagram_access_token=NULL
         WHERE meta_app_secret IS NOT NULL
            OR whatsapp_phone_number_id IS NOT NULL
            OR whatsapp_access_token IS NOT NULL
            OR instagram_account_id IS NOT NULL
            OR instagram_access_token IS NOT NULL
      `);
    } catch (error) {
      if (!['42703','42P01'].includes(String(error?.code || ''))) throw error;
    }
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
