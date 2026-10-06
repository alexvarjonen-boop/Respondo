import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server = await readFile(new URL('../server.mjs', import.meta.url), 'utf8');

test('runtime schema preserves Supabase Data API hardening', () => {
  assert.match(server, /SET search_path = public, pg_temp/);
  assert.match(server, /ALTER TABLE public\.demo_website_imports ENABLE ROW LEVEL SECURITY/);
  assert.match(server, /REVOKE ALL PRIVILEGES ON TABLE public\.demo_website_imports FROM anon/);
  assert.match(server, /REVOKE ALL PRIVILEGES ON TABLE public\.demo_website_imports FROM authenticated/);
  assert.match(server, /REVOKE EXECUTE ON FUNCTION public\.active_tenant_for_user\(UUID\) FROM anon/);
  assert.match(server, /REVOKE EXECUTE ON FUNCTION public\.active_tenant_for_user\(UUID\) FROM authenticated/);
  assert.match(server, /ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated/);
  assert.match(server, /ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated/);
  assert.match(server, /ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated/);
  assert.equal(server.includes("await q(`DO $$\n"), true);
  assert.equal(server.includes("\n  $$`);"), true);
  assert.equal(server.includes("await q(`DO $\n"), false);
});

test('runtime schema keeps indexes for important foreign keys', () => {
  assert.match(server, /idx_chat_messages_tenant_id ON chat_messages\(tenant_id\)/);
  assert.match(server, /idx_chat_threads_assigned_agent_id ON chat_threads\(assigned_agent_id\)/);
});
