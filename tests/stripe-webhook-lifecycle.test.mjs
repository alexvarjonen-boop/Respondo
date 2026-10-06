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
  assert.match(server, /active=CASE WHEN \$1 IN \('active','trialing'\) THEN TRUE ELSE FALSE END/);
});

test('invoice subscription lookup supports both current and legacy Stripe shapes', () => {
  assert.match(server, /invoice\?\.parent\?\.subscription_details\?\.subscription/);
  assert.match(server, /invoice\?\.subscription/);
});
