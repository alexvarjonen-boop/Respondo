import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server = await readFile(new URL('../server.mjs', import.meta.url), 'utf8');
const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
const entry = await readFile(new URL('../server-entry.mjs', import.meta.url), 'utf8');

test('production backend has no direct Twilio, Meta messaging or OpenAI API integration', () => {
  const forbidden = [
    'https://api.twilio.com',
    'https://graph.facebook.com',
    'api.openai.com',
    'OPENAI_API_KEY',
    "app.post('/api/app/voice",
    "app.post('/api/app/meta-channels",
    "app.get('/api/meta/webhook/:slug'",
    "app.post('/api/meta/webhook/:slug'",
    "app.post('/api/voice/:slug",
    "app.post('/api/sms/:slug/incoming'",
    'sendTwilioSms(',
    'sendMetaMessage(',
  ];
  for (const marker of forbidden) {
    assert.equal(server.includes(marker), false, `Unexpected paid integration marker: ${marker}`);
  }
});

test('backend does not generate removed Meta or Twilio credentials at runtime', () => {
  for (const marker of [
    "tenant.meta_verify_token = 'rsp_meta_'",
    'tenant.meta_app_secret =',
    'tenant.whatsapp_access_token =',
    'tenant.instagram_access_token =',
    'tenant.twilio_auth_token =',
  ]) {
    assert.equal(server.includes(marker), false, `Unexpected removed-channel credential generation: ${marker}`);
  }
});

test('backend does not recreate removed paid-channel database schema', () => {
  const forbidden = [
    'ADD COLUMN IF NOT EXISTS twilio_',
    'ADD COLUMN IF NOT EXISTS meta_',
    'ADD COLUMN IF NOT EXISTS whatsapp_',
    'ADD COLUMN IF NOT EXISTS instagram_',
    'ADD COLUMN IF NOT EXISTS voice_',
    'ADD COLUMN IF NOT EXISTS missed_call_',
    'CREATE TABLE IF NOT EXISTS missed_call_sms_events',
  ];
  for (const marker of forbidden) {
    assert.equal(server.includes(marker), false, `Unexpected removed paid-channel schema marker: ${marker}`);
  }
});


test('dashboard has no dormant paid-channel controls', () => {
  const forbidden = [
    "$('#metaChannelsForm')",
    "$('#voiceAgentForm')",
    "$('#testVoiceAgent')",
    "$('#testMissedCallSms')",
    "$('#configureVoiceNumber')",
    'Twilio-yhteys toimii',
    'Twilio-numero ohjaa',
  ];
  for (const marker of forbidden) {
    assert.equal(app.includes(marker), false, `Unexpected dormant paid-channel UI marker: ${marker}`);
  }
});


test('production safety guard blocks removed paid API hosts and stale credentials', () => {
  for (const marker of [
    "'api.twilio.com'",
    "'graph.facebook.com'",
    "'graph.instagram.com'",
    "'api.openai.com'",
    'meta_app_secret=NULL',
    'whatsapp_access_token=NULL',
    'instagram_access_token=NULL',
  ]) {
    assert.equal(entry.includes(marker), true, `Missing paid-service safety marker: ${marker}`);
  }
});


test('legacy paid-channel cleanup is schema-aware and does not query a removed table blindly', () => {
  assert.match(entry, /information_schema\.columns/);
  assert.match(entry, /column_name = ANY\(\$1::text\[\]\)/);
  assert.match(entry, /to_regclass\('public\.missed_call_sms_events'\)/);
  assert.match(
    entry,
    /if \(legacySmsTable\.rows\[0\]\?\.relation_name\) \{\s*await pool\.query\('DELETE FROM missed_call_sms_events'\);\s*\}/,
  );
  assert.match(entry, /writesRemovedPaidChannelState/);
  assert.match(entry, /writesRemovedSmsEvents/);
});
