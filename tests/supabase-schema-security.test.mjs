import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server = await readFile(new URL('../server.mjs', import.meta.url), 'utf8');
const schema = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');

test('runtime schema preserves Supabase Data API hardening', () => {
  assert.match(server, /SET search_path = public, pg_temp/);
  assert.match(server, /ALTER TABLE public\.demo_website_imports ENABLE ROW LEVEL SECURITY/);
  assert.match(server, /REVOKE ALL PRIVILEGES ON TABLE public\.demo_website_imports FROM anon/);
  assert.match(server, /REVOKE ALL PRIVILEGES ON TABLE public\.demo_website_imports FROM authenticated/);
  assert.match(server, /REVOKE EXECUTE ON FUNCTION public\.active_tenant_for_user\(UUID\) FROM anon/);
  assert.match(server, /REVOKE EXECUTE ON FUNCTION public\.active_tenant_for_user\(UUID\) FROM authenticated/);
  assert.match(server, /ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public[\s\S]*REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM anon, authenticated, service_role/);
  assert.match(server, /ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public[\s\S]*REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated, service_role/);
  assert.match(server, /ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public[\s\S]*REVOKE USAGE, SELECT ON SEQUENCES FROM anon, authenticated, service_role/);
  assert.match(server, /ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public[\s\S]*REVOKE EXECUTE ON FUNCTIONS FROM public/);
  assert.equal(server.includes("EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public"), false);
});

test('runtime schema keeps indexes for important foreign keys', () => {
  assert.match(server, /idx_chat_messages_tenant_id ON chat_messages\(tenant_id\)/);
  assert.match(server, /idx_chat_threads_assigned_agent_id ON chat_threads\(assigned_agent_id\)/);
});


test('baseline schema excludes retired paid channels and denies Supabase API roles', () => {
  for (const marker of [
    'twilio_account_sid','twilio_auth_token','twilio_phone_number',
    'meta_app_secret','meta_verify_token','whatsapp_access_token',
    'instagram_access_token','voice_enabled','missed_call_sms_enabled',
    'CREATE TABLE IF NOT EXISTS missed_call_sms_events'
  ]) {
    assert.equal(schema.includes(marker),false,'Retired paid-channel schema returned: '+marker);
  }
  assert.match(schema,/REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public/);
  assert.match(schema,/REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public/);
  assert.match(schema,/REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public/);
  assert.match(schema,/ARRAY\['anon','authenticated','service_role'\]/);
});
