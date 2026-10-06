import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server = await readFile(new URL('../server.mjs', import.meta.url), 'utf8');
const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');

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
