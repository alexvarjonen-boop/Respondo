import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server = await readFile(new URL('../server.mjs', import.meta.url), 'utf8');

test('owner free code is reusable and separate from normal referral limits', () => {
  assert.match(server,/const FREE_REFERRAL_CODE = normalizeReferralCode\(process\.env\.OWNER_FREE_CODE \|\| ''\)/);
  assert.match(server,/async function consumeOwnerFreeCode\(_client, value\)[\s\S]{0,260}return isFreeReferralCode\(value\)/);
  assert.doesNotMatch(server,/owner_free_code_used_sha256/);
  assert.doesNotMatch(server,/Tämä kertakäyttöinen ilmaiskoodi on jo käytetty/);
  assert.match(server,/referralCode && !freeReferral && !planAllowsReferral\(normalizedPlan\)/);
  assert.match(server,/referralCode && !freeReferral && !planAllowsReferral\(plan\)/);
});

test('normal customer referral codes remain one-use monthly referrals', () => {
  assert.match(server,/function planAllowsReferral\(value\)/);
  assert.match(server,/referrer_user_id=\$1 AND stripe_discount_applied=TRUE LIMIT 1/);
  assert.match(server,/Tämä suosittelukoodi on jo käytetty/);
});
