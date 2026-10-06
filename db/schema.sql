CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  company_name TEXT NOT NULL,
  business_id TEXT,
  role TEXT NOT NULL DEFAULT 'owner',
  status TEXT NOT NULL DEFAULT 'pending',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT,
  subscription_plan TEXT,
  referral_code TEXT UNIQUE,
  current_period_end TIMESTAMPTZ,
  active_tenant_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY,
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  business_id TEXT,
  industry TEXT NOT NULL DEFAULT 'Palveluyritys',
  website TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  greeting TEXT NOT NULL DEFAULT 'Hei! Miten voin auttaa?',
  bot_name TEXT NOT NULL DEFAULT 'RESPONDO AI',
  bot_avatar TEXT NOT NULL DEFAULT 'robot-1',
  handoff_message TEXT NOT NULL DEFAULT 'En halua arvata. Ohjaan tämän ihmiselle vastattavaksi.',
  accent TEXT NOT NULL DEFAULT '#111113',
  average_lead_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  action_webhook_url TEXT,
  action_webhook_secret TEXT,
  channels_api_key TEXT,
  stripe_connected_account_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT,
  subscription_plan TEXT,
  current_period_end TIMESTAMPTZ,
  subscription_cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  quote_service_name TEXT,
  quote_base_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  quote_unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  quote_min_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  quote_vat_percent NUMERIC(6,2) NOT NULL DEFAULT 0,
  quote_unit_label TEXT NOT NULL DEFAULT 'kpl',
  google_calendar_access_token TEXT,
  google_calendar_refresh_token TEXT,
  google_calendar_token_expires_at TIMESTAMPTZ,
  google_calendar_email TEXT,
  google_calendar_id TEXT NOT NULL DEFAULT 'primary',
  ecommerce_provider TEXT,
  shopify_shop_domain TEXT,
  shopify_access_token TEXT,
  woo_base_url TEXT,
  woo_consumer_key TEXT,
  woo_consumer_secret TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS knowledge (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'Yleinen',
  title TEXT NOT NULL,
  answer TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  source_type TEXT NOT NULL DEFAULT 'manual',
  source_url TEXT,
  approved BOOLEAN NOT NULL DEFAULT TRUE,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  quick_reply_order SMALLINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  intent TEXT,
  confidence NUMERIC(4,3),
  source_ids UUID[] NOT NULL DEFAULT '{}',
  handoff BOOLEAN NOT NULL DEFAULT FALSE,
  visitor_ref TEXT,
  page_url TEXT,
  page_title TEXT,
  source_channel TEXT NOT NULL DEFAULT 'website',
  external_contact_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_tenant ON knowledge(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_quick_reply_slot ON knowledge(tenant_id, quick_reply_order) WHERE quick_reply_order IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_created ON conversations(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code) WHERE referral_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO app_settings(key,value)
VALUES('owner_test_plan_enabled','true')
ON CONFLICT(key) DO NOTHING;

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_updated
  ON stripe_webhook_events(updated_at DESC);
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS referral_redemptions (
  id UUID PRIMARY KEY,
  referrer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  stripe_discount_applied BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referral_redemptions(referrer_user_id, created_at DESC);


CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  visitor_ref TEXT,
  name TEXT,
  email TEXT,
  phone TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_tenant_created ON leads(tenant_id, created_at DESC);


CREATE TABLE IF NOT EXISTS action_events (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  visitor_ref TEXT,
  action_type TEXT NOT NULL,
  label TEXT,
  target TEXT,
  page_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_action_events_tenant_created ON action_events(tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS self_test_runs (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  answerable_questions INTEGER NOT NULL,
  gaps JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_self_test_tenant_created ON self_test_runs(tenant_id, created_at DESC);


CREATE TABLE IF NOT EXISTS action_requests (
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
);
CREATE INDEX IF NOT EXISTS idx_action_requests_tenant_created
  ON action_requests(tenant_id, created_at DESC);


CREATE TABLE IF NOT EXISTS booking_slots (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id,starts_at)
);
CREATE INDEX IF NOT EXISTS idx_booking_slots_tenant_start
  ON booking_slots(tenant_id, starts_at);


CREATE TABLE IF NOT EXISTS chat_threads (
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
);
CREATE INDEX IF NOT EXISTS idx_chat_threads_tenant_activity
  ON chat_threads(tenant_id,last_activity_at DESC);

CREATE TABLE IF NOT EXISTS chat_messages (
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
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_created
  ON chat_messages(thread_id,created_at ASC);


-- Respondo is accessed through the application backend, not directly through
-- Supabase Data API roles. Existing tables are explicitly deny-by-default so a
-- future Supabase setting cannot accidentally expose tenant/customer data.
DO $$
DECLARE
  api_role TEXT;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon','authenticated','service_role']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=api_role) THEN
      EXECUTE format('REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM %I',api_role);
      EXECUTE format('REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM %I',api_role);
      EXECUTE format('REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM %I',api_role);
    END IF;
  END LOOP;
END
$$;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE USAGE, SELECT ON SEQUENCES FROM anon, authenticated, service_role;
