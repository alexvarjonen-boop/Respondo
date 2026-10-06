import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server = await readFile(new URL('../server.mjs', import.meta.url), 'utf8');

test('integration encryption key is separated from session signing with legacy decrypt fallback', () => {
  assert.match(server, /process\.env\.DATA_ENCRYPTION_KEY/);
  assert.match(server, /DATA_ENCRYPTION_SECRET \|\| JWT/);
  assert.match(server, /LEGACY_SECRET_KEY = crypto\.createHash\('sha256'\)\.update\(JWT\)\.digest\(\)/);
  assert.match(server, /decryptSecretWithKey\(text, SECRET_KEY\)/);
  assert.match(server, /decryptSecretWithKey\(text, LEGACY_SECRET_KEY\)/);
});

test('tenant administration APIs explicitly reject agent sessions', () => {
  const signatures = [
    "app.post('/api/app/business-profile', auth, ownerOnly, subscribed,",
    "app.post('/api/app/business-email', auth, ownerOnly, subscribed,",
    "app.post('/api/app/import-website/start', auth, ownerOnly, subscribed,",
    "app.get('/api/app/import-website/status/:jobId', auth, ownerOnly, subscribed,",
    "app.post('/api/app/import-website', auth, ownerOnly, subscribed,",
    "app.post('/api/app/import-website/approve', auth, ownerOnly, subscribed,",
    "app.post('/api/app/unanswered/:id/answer', auth, ownerOnly, subscribed,",
    "app.post('/api/app/knowledge', auth, ownerOnly, subscribed,",
    "app.put('/api/app/knowledge/:id', auth, ownerOnly, subscribed,",
    "app.delete('/api/app/knowledge/:id', auth, ownerOnly, subscribed,",
    "app.post('/api/app/knowledge/:id/quick-reply', auth, ownerOnly, subscribed,",
    "app.post('/api/app/booking-slots/generate', auth, ownerOnly, subscribed,",
    "app.delete('/api/app/booking-slots/:id', auth, ownerOnly, subscribed,",
    "app.post('/api/app/action-requests/:id/status', auth, ownerOnly, subscribed,",
  ];
  for (const signature of signatures) assert.ok(server.includes(signature), signature);
});


test('internal 500 errors are never returned verbatim to clients', () => {
  assert.doesNotMatch(server, /res\.status\(500\)\.json\(\{\s*error\s*:\s*(?:e|err|error)\.message\s*\}\)/);
  assert.doesNotMatch(server, /status\(500\)[^\n]{0,160}(?:e|err|error)\.message/);
});


test('Google Calendar account controls are owner-only', () => {
  assert.match(server, /app\.get\('\/api\/app\/google-calendar\/start', auth, ownerOnly, subscribed/);
  assert.match(server, /app\.post\('\/api\/app\/google-calendar\/disconnect', auth, ownerOnly, subscribed/);
});


test('content security policy is enabled without blocking the cross-origin widget script', () => {
  assert.doesNotMatch(server, /contentSecurityPolicy:\s*false/);
  assert.match(server, /frameAncestors:\["'none'"\]/);
  assert.match(server, /objectSrc:\["'none'"\]/);
  assert.match(server, /scriptSrc:\["'self'","'unsafe-inline'"\]/);
  assert.match(server, /crossOriginResourcePolicy:\{ policy:'cross-origin' \}/);
});

test('staff sessions stop when the owning workspace loses access', () => {
  const authStart=server.indexOf('async function auth');
  const ownerOnlyStart=server.indexOf('function ownerOnly',authStart);
  const authBlock=server.slice(authStart,ownerOnlyStart);
  assert.match(authBlock,/JOIN tenants t ON t\.id=sa\.tenant_id/);
  assert.match(authBlock,/JOIN users u ON u\.id=t\.owner_user_id/);
  assert.match(authBlock,/u\.status='active'/);
  assert.match(authBlock,/t\.active=true/);
  assert.match(authBlock,/t\.subscription_status IN \('active','trialing'\)/);
  assert.match(authBlock,/t\.current_period_end > NOW\(\)/);

  const loginStart=server.indexOf("app.post('/api/auth/agent-login'");
  const loginEnd=server.indexOf("app.post('/api/auth/login'",loginStart);
  const loginBlock=server.slice(loginStart,loginEnd);
  assert.match(loginBlock,/u\.status='active'/);
  assert.match(loginBlock,/t\.subscription_status IN \('active','trialing'\)/);
  assert.match(loginBlock,/t\.current_period_end > NOW\(\)/);
});

test('owner subscribed middleware selects only a currently usable workspace', () => {
  const start=server.indexOf('async function subscribed');
  const end=server.indexOf('const OAUTH_PROFILE_COOKIE',start);
  const block=server.slice(start,end);
  assert.match(block,/t\.active AS tenant_active/);
  assert.match(block,/activeTenantAllowed/);
  assert.match(block,/active=true/);
  assert.match(block,/subscription_status IN \('active','trialing'\)/);
  assert.match(block,/current_period_end > NOW\(\)/);
});


test('connected checkout cancel URL cannot be redirected off the tenant website', () => {
  assert.match(server,/function safeTenantReturnUrl\(value, tenant\)/);
  assert.match(server,/normalizeHost\(url\.hostname\) !== tenantHost/);
  assert.match(server,/cancel_url:safeTenantReturnUrl\(pageUrl,tenant\)/);
  assert.doesNotMatch(server,/cancel_url:pageUrl \|\| tenant\.website \|\| BASE/);
});


test('calendar OAuth state is bound to the selected tenant', () => {
  assert.match(server,/flow:'calendar',[\s\S]{0,180}userId:req\.user\.sub,[\s\S]{0,100}tenantId:activeTenant\.rows\[0\]\.id/);
  assert.match(server,/const tenantId=String\(statePayload\.tenantId \|\| ''\)/);
  assert.match(server,/SELECT \* FROM tenants WHERE owner_user_id=\$1 AND id=\$2/);
  assert.doesNotMatch(server,/statePayload\.flow === 'calendar'[\s\S]{0,1100}id=active_tenant_for_user\(\$1\)/);
});

test('live takeover cannot outlive the workspace subscription', () => {
  const start=server.indexOf("app.post('/api/app/live/:id/mode'");
  const end=server.indexOf("app.post('/api/channel/:slug/message'",start);
  const block=server.slice(start,end);
  assert.ok((block.match(/u\.status='active'/g)||[]).length >= 4);
  assert.ok((block.match(/t\.subscription_status IN \('active','trialing'\)/g)||[]).length >= 4);
  assert.ok((block.match(/t\.current_period_end > NOW\(\)/g)||[]).length >= 4);
  assert.match(block,/WHERE id=\$2 AND tenant_id=\$3 RETURNING \*/);
  assert.match(block,/WHERE id=\$1 AND tenant_id=\$2/);
});
