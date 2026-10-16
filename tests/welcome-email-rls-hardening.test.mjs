import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const entry = await readFile(new URL('../server-entry.mjs', import.meta.url), 'utf8');
const schema = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');
const source = await readFile(new URL('../server.mjs', import.meta.url), 'utf8');

test('welcome-email ledger is created and protected before production starts', () => {
  const start = entry.indexOf('await clearLegacyPaidChannelState()');
  const importServer = entry.indexOf("await import('./server.mjs')");
  assert.ok(start >= 0 && importServer > start);
  const creation = entry.indexOf('CREATE TABLE IF NOT EXISTS public.signup_welcome_emails');
  const rls = entry.indexOf('ALTER TABLE public.signup_welcome_emails ENABLE ROW LEVEL SECURITY');
  const revoke = entry.indexOf('REVOKE ALL PRIVILEGES ON TABLE public.signup_welcome_emails FROM anon, authenticated, service_role');
  assert.ok(creation >= 0 && rls > creation && revoke > rls);
  assert.match(entry, /await pool\.end\(\)/);
});

test('baseline schema enforces RLS on the welcome-email table', () => {
  assert.match(schema, /CREATE TABLE IF NOT EXISTS signup_welcome_emails/);
  assert.match(schema, /ALTER TABLE public\.signup_welcome_emails ENABLE ROW LEVEL SECURITY/);
  assert.match(schema, /REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public/);
});

test('existing welcome-email deduplication and retry semantics are unchanged', () => {
  assert.match(source, /INSERT INTO signup_welcome_emails\(user_id\)/);
  assert.match(source, /ON CONFLICT \(user_id\) DO NOTHING RETURNING user_id/);
  assert.match(source, /DELETE FROM signup_welcome_emails WHERE user_id=\$1/);
});
