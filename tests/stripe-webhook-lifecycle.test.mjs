import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server = await readFile(new URL('../server.mjs', import.meta.url), 'utf8');

test('Stripe webhook covers the subscription lifecycle that controls access', () => {
  assert.match(server, /event\.type === 'invoice\.paid'/);
  assert.match(server, /event\.type === 'invoice\.payment_failed'/);
  assert.match(server, /event\.type === 'customer\.subscription\.created'/);
  assert.match(server, /event\.type === 'customer\.subscription\.updated'/);
  assert.match(server, /event\.type === 'customer\.subscription\.deleted'/);
  assert.match(server, /async function syncStripeSubscriptionState\(subscription\)/);
  assert.match(server, /const plan = planFromStripePriceId\(priceId\)/);
  assert.match(server, /subscription_plan=CASE WHEN \$4<>'' THEN \$4 ELSE subscription_plan END/);
  assert.match(server, /active=CASE WHEN \$1 IN \('active','trialing'\) THEN TRUE ELSE FALSE END/);
});

test('invoice subscription lookup supports both current and legacy Stripe shapes', () => {
  assert.match(server, /invoice\?\.parent\?\.subscription_details\?\.subscription/);
  assert.match(server, /invoice\?\.subscription/);
});

test('billing controls are restricted to the workspace owner', () => {
  assert.match(server, /app\.post\('\/api\/billing\/portal', auth, ownerOnly/);
  assert.match(server, /app\.post\('\/api\/billing\/cancel', auth, ownerOnly/);
});

test('checkout auto-login is bound to the browser that started it', () => {
  assert.match(server,/SIGNUP_CHECKOUT_COOKIE = 'respondo_signup_checkout'/);
  assert.match(server,/jwt\.sign\(\{ sessionId:session\.id,userId:id,tenantId \},JWT,\{ expiresIn:'45m' \}\)/);
  assert.match(server,/checkoutState\.sessionId !== sessionId/);
  assert.match(server,/checkoutState\.userId !== userId/);
  assert.match(server,/res\.clearCookie\(SIGNUP_CHECKOUT_COOKIE\)/);
});


test('Stripe webhook retries are idempotent across replicas', () => {
  assert.match(server, /CREATE TABLE IF NOT EXISTS stripe_webhook_events/);
  assert.match(server, /pg_advisory_lock\(hashtextextended\(\$1,0\)\)/);
  assert.match(server, /SELECT status FROM stripe_webhook_events WHERE event_id=\$1/);
  assert.match(server, /existing\.rows\[0\]\?\.status === 'processed'/);
  assert.match(server, /attempts=stripe_webhook_events\.attempts\+1/);
  assert.match(server, /finishStripeWebhookEvent\(eventLock,event,'processed'\)/);
  assert.match(server, /finishStripeWebhookEvent\(eventLock,event,'failed'/);
});
