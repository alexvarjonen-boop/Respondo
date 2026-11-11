import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const start=server.indexOf("const US_FIRST_YEAR_CAMPAIGN_CODE = 'US20YEAR';");
const end=server.indexOf("const FREE_REFERRAL_CODE =",start);
assert.ok(start>0 && end>start);
const src=server.slice(start,end);
const promoId='promo_1UaYwqV05brJ7mTPYIVaciD1';
const eligible=new Set(['prod_VRMDqWr2kAow8M','prod_VRMEf8AWTzx8eu','prod_VRMEB6TmV771gr']);

function harness(productId) {
  return vm.runInNewContext(src+'\n({isUSFirstYearCampaign,usFirstYearCheckoutDiscounts,assertUSFirstYearCheckoutPrice})',{
    normalizeReferralCode:x=>String(x||'').trim().toUpperCase(),
    stripe:{prices:{retrieve:async()=>({product:productId})}}
  });
}
test('campaign code is exact and does not turn on generic Stripe coupons',()=>{
  const c=harness('prod_VRMDqWr2kAow8M');
  assert.equal(c.isUSFirstYearCampaign(' us20year '),true);
  assert.equal(c.isUSFirstYearCampaign('CEO100'),false);
  assert.equal(c.isUSFirstYearCampaign(''),false);
  assert.deepEqual(JSON.parse(JSON.stringify(c.usFirstYearCheckoutDiscounts(true))),{discounts:[{promotion_code:promoId}]});
  assert.deepEqual(JSON.parse(JSON.stringify(c.usFirstYearCheckoutDiscounts(false))),{});
  assert.equal((server.match(/allow_promotion_codes:\s*false/g)||[]).length,2);
  assert.equal((server.match(/usFirstYearCheckoutDiscounts\(usFirstYearCampaign\)/g)||[]).length,2);
});
test('only current three Stripe SaaS products qualify, not inline or setup prices',async()=>{
  for(const id of eligible) await harness(id).assertUSFirstYearCheckoutPrice({price:'price_eligible'});
  await assert.rejects(harness('prod_other').assertUSFirstYearCheckoutPrice({price:'price_other'}),/not eligible/);
  await assert.rejects(harness('prod_other').assertUSFirstYearCheckoutPrice({price_data:{unit_amount:19900}}),/saved Stripe subscription price/);
});
test('signup and added-workspace flows skip one-month referral restrictions for this code',()=>{
  assert.match(server,/!freeReferral && !usFirstYearCampaign && !planAllowsReferral\(normalizedPlan\)/);
  assert.match(server,/!freeReferral && !usFirstYearCampaign && !planAllowsReferral\(plan\)/);
  assert.equal((server.match(/if\s*\(referralCode && !freeReferral && !usFirstYearCampaign\)/g)||[]).length,2);
  assert.match(server,/checkoutCountry\.country !== 'US' \|\| normalizedPlan === 'owner_test'/);
  assert.match(server,/checkoutCountry\.country!=='US' \|\| plan==='owner_test'/);
  assert.match(app,/value="\$\{esc\(referralCode\)\}"/);
  // Private campaign codes must not be discoverable in generic public JavaScript.
  assert.doesNotMatch(app,/US20YEAR/);
  assert.match(app,/if \(referral\) params\.set\('ref', referral\)/);
  assert.match(app,/if \(selectedReferral\) url\.searchParams\.set\('ref', selectedReferral\)/);
});
