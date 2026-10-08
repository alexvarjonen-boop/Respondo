import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server = fs.readFileSync(new URL('../server.mjs', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../public/styles.css', import.meta.url), 'utf8');

test('company deletion is authenticated, tenant-scoped, password-confirmed and rate-limited', () => {
  assert.match(server, /app\.delete\('\/api\/app\/workspaces\/:tenantId', auth, ownerOnly, loginLimiter,/);
  const route = server.split("app.delete('/api/app/workspaces/:tenantId'")[1].split("app.delete('/api/app/account'")[0];
  assert.match(route, /verifyDeletionPassword\(client,req\.user\.sub,'',password,false\)/);
  assert.match(route, /FROM tenants WHERE id=\$1 AND owner_user_id=\$2 FOR UPDATE/);
  assert.match(route, /WHERE stripe_subscription_id=\$1 AND id<>\$2/);
  assert.match(route, /cancelOwnedSubscriptionsForDeletion\(\[subscriptionId\],user\.stripe_customer_id\)/);
  assert.match(route, /DELETE FROM tenants WHERE id=\$1 AND owner_user_id=\$2/);
  assert.ok(route.indexOf('cancelOwnedSubscriptionsForDeletion') < route.indexOf('DELETE FROM tenants'));
  assert.match(route, /active_tenant_id=\$1/);
});

test('full account deletion requires matching email and password and cancels every subscription first', () => {
  assert.match(server, /app\.delete\('\/api\/app\/account', auth, ownerOnly, loginLimiter,/);
  assert.match(server, /cleanEmail\(email\)!==cleanEmail\(user\.email\)/);
  assert.match(server, /bcrypt\.compare\(password,user\.password_hash\)/);
  const route = server.split("app.delete('/api/app/account'")[1].split("app.post('/api/app/workspaces/switch'")[0];
  assert.match(route, /\[user\.stripe_subscription_id,\.\.\.rr\.rows\.map\(x=>x\.stripe_subscription_id\)\]/);
  assert.match(route, /cancelOwnedSubscriptionsForDeletion\(subscriptions,user\.stripe_customer_id\)/);
  assert.match(route, /DELETE FROM users WHERE id=\$1/);
  assert.ok(route.indexOf('cancelOwnedSubscriptionsForDeletion') < route.indexOf('DELETE FROM users'));
  assert.match(route, /res\.clearCookie\(COOKIE/);
});

test('Stripe cancellation rejects an unexpected billing customer and a missing Stripe connection', () => {
  assert.match(server, /if\(!stripe\) throw new Error\('Stripe is unavailable/);
  assert.match(server, /ownerCustomer!==customerId/);
  assert.match(server, /if\(subscription\.status!=='canceled'\)/);
  assert.match(server, /stripe\.subscriptions\.cancel\(subscriptionId\)/);
  assert.match(server, /await client\.query\('ROLLBACK'\)/);
});

test('company trash buttons and account deletion both require explicit confirmation', () => {
  assert.match(app, /class="workspace-delete-trigger"/);
  assert.match(app, /workspace-delete-trigger"[\s\S]{0,430}aria-label=/);
  assert.match(app, /id="deleteAccountTrigger"/);
  assert.match(app, /id="deleteConfirmForm"/);
  assert.match(app, /id="deleteEmailField"/);
  assert.match(app, /name="email" type="email"/);
  assert.match(app, /name="password" type="password" autocomplete="current-password"/);
  assert.match(app, /\/api\/app\/workspaces\/.*encodeURIComponent\(target\.tenantId\)/);
  assert.match(app, /target\.kind==='account'/);
  assert.match(app, /dashboardWithoutCompany\(me,all\)/);
  assert.match(css, /\.workspace-delete-trigger\{[\s\S]{0,350}background:#fff0df/);
  assert.match(css, /\.deletion-modal\[hidden\]/);
});
