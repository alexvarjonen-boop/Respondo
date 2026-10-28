import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createFirecrawlCreditGuard, firecrawlReserveCredits,
} from '../firecrawl-fallback.mjs';

const env = {
  FIRECRAWL_ENABLED: 'true',
  FIRECRAWL_API_KEY: 'fc-test-key',
};
const usage = (count) => ({
  ok: true,
  json: async () => ({ success: true, data: { remainingCredits: count } }),
});

test('credit guard defaults to a 50-credit reserve, with safe configuration bounds', () => {
  assert.equal(firecrawlReserveCredits({}), 50);
  assert.equal(firecrawlReserveCredits({ FIRECRAWL_RESERVE_CREDITS: '60' }), 60);
  assert.equal(firecrawlReserveCredits({ FIRECRAWL_RESERVE_CREDITS: 'bad' }), 50);
  assert.equal(firecrawlReserveCredits({ FIRECRAWL_RESERVE_CREDITS: '-10' }), 0);
  assert.equal(firecrawlReserveCredits({ FIRECRAWL_RESERVE_CREDITS: '1000000' }), 10000);
});

test('never contacts Firecrawl when disabled or when key is absent', async () => {
  let requests = 0;
  const guard = createFirecrawlCreditGuard({
    fetchImpl: async () => { requests++; throw new Error('unexpected request'); },
  });
  assert.equal(await guard({ ...env, FIRECRAWL_ENABLED: 'false' }), false);
  assert.equal(await guard({ FIRECRAWL_ENABLED: 'true' }), false);
  assert.equal(requests, 0);
});

test('checks the read-only quota endpoint and reserves credits against burst imports', async () => {
  let requests = 0;
  const guard = createFirecrawlCreditGuard({
    now: () => 1000,
    fetchImpl: async (url, opts) => {
      requests++;
      assert.equal(url, 'https://api.firecrawl.dev/v2/team/credit-usage');
      assert.equal(opts.method, 'GET');
      assert.equal(opts.headers.Authorization, 'Bearer fc-test-key');
      assert.equal(opts.headers.Accept, 'application/json');
      return usage(53);
    },
  });
  const attempts = await Promise.all(Array.from({ length: 10 }, () => guard(env)));
  assert.deepEqual(attempts.filter(Boolean).length, 3);
  assert.equal(requests, 1); // concurrent requests share one check
});

test('pauses at the reserve threshold and automatically resumes after renewal', async () => {
  let now = 1000;
  let checks = 0;
  const guard = createFirecrawlCreditGuard({
    now: () => now, healthyCacheMs: 100, pausedRetryMs: 500,
    fetchImpl: async () => usage(++checks === 1 ? 50 : 52),
  });
  assert.equal(await guard(env), false);
  now += 499;
  assert.equal(await guard(env), false);
  assert.equal(checks, 1);
  now += 2;
  assert.equal(await guard(env), true);
  assert.equal(await guard(env), true);
  assert.equal(await guard(env), false);
  assert.equal(checks, 2);
});

test('invalid, unauthenticated or unavailable balance fails closed; later checks recover', async () => {
  let now = 1000;
  let checks = 0;
  const guard = createFirecrawlCreditGuard({
    now: () => now, errorRetryMs: 500,
    fetchImpl: async () => {
      checks++;
      if (checks === 1) return { ok: false, status: 401 };
      if (checks === 2) return { ok: true, json: async () => ({ success: true, data: { remainingCredits: '100' } }) };
      return usage(80);
    },
  });
  assert.equal(await guard(env), false);
  now += 501;
  assert.equal(await guard(env), false);
  now += 501;
  assert.equal(await guard(env), true);
  assert.equal(checks, 3);
});

test('transient network errors do not block the native importer and retry later', async () => {
  let now = 1000;
  let calls = 0;
  const guard = createFirecrawlCreditGuard({
    now: () => now, errorRetryMs: 500,
    fetchImpl: async () => {
      calls++;
      if (calls === 1) throw new Error('temporary outage');
      return usage(80);
    },
  });
  assert.equal(await guard(env), false);
  now += 501;
  assert.equal(await guard(env), true);
  assert.equal(calls, 2);
});
