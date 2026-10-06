import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server = fs.readFileSync(new URL('../server.mjs', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('public widget APIs do not trust missing Origin or Referer', () => {
  assert.match(server, /const external = !origin \|\| normalizeHost\(origin\.hostname\) !== baseHost;/);
  assert.match(server, /const externalWidgetRequest = !origin \|\| normalizeHost\(origin\.hostname\) !== baseHost;/);
  assert.doesNotMatch(server, /const external = Boolean\(origin && normalizeHost\(origin\.hostname\) !== baseHost\);/);
});

test('public tenant access follows the workspace subscription', () => {
  assert.match(server, /COALESCE\(t\.subscription_status,u\.subscription_status\) IN \('active','trialing'\)/);
  assert.match(server, /COALESCE\(t\.current_period_end,u\.current_period_end\) > NOW\(\)/);
});

test('website imports are pinned against DNS rebinding and scoped to the active tenant', () => {
  assert.match(server, /function pinnedPublicRequest\(/);
  assert.match(server, /lookup\(_hostname, _options, callback\)/);
  assert.match(server, /job=\{id:jobId,userId:req\.user\.sub,tenantId,website,status:'running'/);
  assert.match(server, /job\.tenantId!==tenantId/);
});

test('agent live takeover resolves the agent tenant instead of owner_user_id=agent id', () => {
  assert.match(server, /req\.user\.role === 'agent'[\s\S]{0,500}SELECT t\.\* FROM tenants t JOIN users u ON u\.id=t\.owner_user_id WHERE t\.id=\$1/);
  assert.match(server, /ct\.assigned_agent_id=\$3 AND t\.active=true/);
});

test('free checkout bypass is never hardcoded in source', () => {
  assert.match(server, /process\.env\.OWNER_FREE_CODE/);
  assert.doesNotMatch(server, /const FREE_REFERRAL_CODE = ['"][A-Z0-9-]+['"]/);
});

test('production start path enables the paid-service safety guard', () => {
  assert.equal(pkg.scripts.start, 'node server-entry.mjs');
});

test('signup checkout can recover a recreated pending account without losing a completed Stripe session', () => {
  assert.match(server, /async function resolveSignupCheckoutTarget\(session\)/);
  assert.match(server, /Recovered checkout for recreated pending account/);
  assert.match(server, /Duplicate signup subscription cancellation failed/);
});
