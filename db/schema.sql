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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY,
  owner_user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
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
  meta_graph_version TEXT NOT NULL DEFAULT 'v24.0',
  meta_verify_token TEXT,
  meta_app_secret TEXT,
  whatsapp_phone_number_id TEXT,
  whatsapp_access_token TEXT,
  instagram_account_id TEXT,
  instagram_access_token TEXT,
  twilio_account_sid TEXT,
  twilio_auth_token TEXT,
  twilio_phone_number TEXT,
  voice_handoff_number TEXT,
  voice_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  missed_call_sms_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  missed_call_sms_message TEXT NOT NULL DEFAULT 'Hei! Emme juuri nyt pystyneet vastaamaan puheluusi. Voit vastata tähän viestiin, niin RESPONDO AI auttaa heti.',
  missed_call_sms_mode TEXT NOT NULL DEFAULT 'immediate',
  missed_call_after_start TEXT NOT NULL DEFAULT '17:00',
  missed_call_after_end TEXT NOT NULL DEFAULT '08:00',
  missed_call_timezone TEXT NOT NULL DEFAULT 'Europe/Helsinki',
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

CREATE TABLE IF NOT EXISTS missed_call_sms_events (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  call_sid TEXT NOT NULL,
  phone TEXT,
  call_status TEXT,
  delivery_status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id,call_sid)
);
CREATE INDEX IF NOT EXISTS idx_missed_call_sms_tenant_created
  ON missed_call_sms_events(tenant_id,created_at DESC);
