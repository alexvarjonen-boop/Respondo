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
