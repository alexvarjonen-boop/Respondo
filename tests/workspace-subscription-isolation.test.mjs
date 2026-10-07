import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server = await readFile(new URL('../server.mjs', import.meta.url), 'utf8');

test('workspace access never inherits another workspace subscription through the owner', () => {
  assert.doesNotMatch(
    server,
    /COALESCE\(t\.subscription_status,u\.subscription_status\) IN \('active','trialing'\)/,
  );
  assert.match(
    server,
    /WHERE t\.slug=\$1[\s\S]*AND t\.subscription_status IN \('active','trialing'\)/,
  );
  assert.match(
    server,
    /COALESCE\(t\.subscription_cancel_at_period_end,false\)=false[\s\S]*t\.current_period_end/,
  );
});

test('legacy migration may backfill the first tenant but runtime access is tenant-scoped', () => {
  assert.match(
    server,
    /subscription_status=COALESCE\(t\.subscription_status,u\.subscription_status\)/,
  );
  assert.match(
    server,
    /SELECT u\.status,[\s\S]*t\.subscription_status AS subscription_status/,
  );
});

test('homepage does not inject a second tenant widget over the site assistant', () => {
  assert.doesNotMatch(server,/Homepage owner widget injection failed/);
  assert.doesNotMatch(server,/html = html\.replace\('<\\/body>', widgetHtml \+ '\\\\n<\\/body>'\)/);
});


test('additional workspace checkout is never cancelled by the duplicate signup guard', () => {
  assert.match(
    server,
    /session\.metadata\?\.additional_workspace !== '1'[\s\S]*target\.user\.stripe_subscription_id !== incomingSubscriptionId[\s\S]*stripe\.subscriptions\.cancel\(incomingSubscriptionId\)/,
  );
});

test('first-party public assistant uses tenant subscription state', () => {
  const start=server.indexOf("app.post('/api/public/respondo-assistant/chat'");
  const end=server.indexOf("app.post('/api/public/:slug/chat'",start);
  const block=server.slice(start,end);
  assert.match(block,/t\.subscription_status IN \('active','trialing'\)/);
  assert.match(block,/COALESCE\(t\.subscription_cancel_at_period_end,false\)=false/);
  assert.doesNotMatch(block,/u\.subscription_status IN \('active','trialing'\)/);
});
