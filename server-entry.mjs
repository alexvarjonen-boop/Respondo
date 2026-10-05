import pg from 'pg';

const isProduction = process.env.NODE_ENV === 'production';
const ssl = isProduction ? { rejectUnauthorized: false } : undefined;

async function clearLegacyTwilioState() {
  if (!process.env.DATABASE_URL) return;
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl });
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
  } finally {
    await pool.end();
  }
}

await clearLegacyTwilioState();

const originalPoolQuery = pg.Pool.prototype.query;
pg.Pool.prototype.query = function(query, ...args) {
  const sql = typeof query === 'string' ? query : String(query?.text || '');
  const writesLegacyVoiceState =
    /^\s*UPDATE\s+tenants\s+SET\s+(?:twilio_|voice_|missed_call_)/i.test(sql) ||
    /^\s*(?:INSERT\s+INTO|UPDATE)\s+missed_call_sms_events\b/i.test(sql);
  if (writesLegacyVoiceState) {
    return Promise.reject(new Error('Twilio voice/SMS has been removed from Respondo.'));
  }
  return originalPoolQuery.call(this, query, ...args);
};

const nativeFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = async (input, init) => {
  const raw = typeof input === 'string' ? input : String(input?.url || input || '');
  let url = null;
  try { url = new URL(raw); } catch {}
  if (url?.hostname === 'api.twilio.com') {
    throw new Error('Twilio voice/SMS has been removed from Respondo.');
  }
  return nativeFetch(input, init);
};

await import('./server.mjs');
