import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const start=server.indexOf('function ownerFreeSetupCheckoutLineItem(plan)');
const end=server.indexOf('function planFromStripePriceId(priceId)',start);
assert.ok(start>0 && end>start,'zero-price item exists after regular checkout lookup');
const method=server.slice(start,end);
const factory=new Function('CURRENT_PRICE_CENTS','CURRENT_PRODUCT_NAMES',
  method+'; return ownerFreeSetupCheckoutLineItem;');
const priceForPlan=factory(
  {basic_monthly:4900,advanced_monthly:12900,business_monthly:14900,
    basic_yearly:46800,advanced_yearly:142800,business_yearly:166800},
  {basic_monthly:'Advanced',advanced_monthly:'Premium',business_monthly:'Enterprise',
    basic_yearly:'Advanced (annual)',advanced_yearly:'Premium (annual)',business_yearly:'Enterprise (annual)'});

test('owner free code creates an immutable €0 recurring line item, and an independently zero-priced setup line for founders',()=>{
  for(const plan of ['basic_monthly','advanced_monthly','business_monthly',
   'basic_yearly','advanced_yearly','business_yearly']){
    const line=priceForPlan(plan);
    assert.equal(line.price_data.currency,'eur');
    assert.equal(line.price_data.unit_amount,0);
    assert.equal(line.price_data.recurring.interval,plan.endsWith('_yearly')?'year':'month');
    assert.equal(line.price_data.recurring.interval_count,1);
    assert.equal(line.quantity,1);
  }
  assert.throws(()=>priceForPlan('owner_test'),/ei ole voimassa/);
  assert.throws(()=>priceForPlan('unknown'),/ei ole voimassa/);
  assert.doesNotMatch(method,/stripe\.coupons|discounts:/);
  const normalSetup=server.slice(server.indexOf('function setupServiceCheckoutLineItem()'),start);
  assert.match(normalSetup,/unit_amount:ownerFree \? 0 : SETUP_SERVICE_PRICE_CENTS/);
  assert.match(server,/const SETUP_SERVICE_PRICE_CENTS = 19900/);
});

test('new customer: free promo setup waits for Checkout and costs zero',()=>{
  const code=server.slice(server.indexOf("app.post('/api/auth/start-checkout'"),server.indexOf("app.get('/api/auth/checkout-success'"));
  assert.match(code,/const freeReferral = isFreeReferralCode\(referralCode\)/);
  assert.doesNotMatch(code,/setupService && \(freeReferral \|\| normalizedPlan === 'owner_test'\)/);
  assert.match(code,/setupService && normalizedPlan === 'owner_test'/);
  assert.match(code,/\(!freeReferral \|\| setupService\) && !stripe/);
  assert.match(code,/setupService \? ownerFreeSetupCheckoutLineItem\(normalizedPlan\) : null/);
  assert.match(code,/const initialStatus = freeReferral && !setupService \? 'active' : 'pending'/);
  assert.match(code,/const initialSubscriptionStatus = freeReferral && !setupService \? 'active' : null/);
  assert.match(code,/if \(freeReferral && !setupService\) \{/);
  assert.match(code,/line_items:setupService \? \[checkoutLineItem,setupServiceCheckoutLineItem\(freeReferral\)\] : \[checkoutLineItem\]/);
  assert.match(code,/trial_period_days|assistedSetupCheckoutTrial\(setupService\)/);
  assert.equal((code.match(/owner_promo_zero_recurring:'1',owner_promo_zero_setup:'1'/g)||[]).length,2);
  assert.match(code,/payment_method_collection:freeReferral && setupService \? 'if_required' : 'always'/);
  assert.match(code,/allow_promotion_codes: false/);
});

test('existing customer: founder setup costs zero, without premature activation',()=>{
  const code=server.slice(server.indexOf("app.post('/api/app/workspaces/checkout'"),
   server.indexOf('// These internal operations are restricted to the account configured as OWNER_EMAIL'));
  assert.match(code,/if\(setupService && plan==='owner_test'\)/);
  assert.doesNotMatch(code,/setupService && \(freeReferral \|\| plan==='owner_test'\)/);
  assert.match(code,/\(!freeReferral \|\| setupService\) && !stripe/);
  assert.match(code,/if \(!freeReferral \|\| setupService\) \{/);
  assert.match(code,/checkoutLineItem=freeReferral \? ownerFreeSetupCheckoutLineItem\(plan\)/);
  assert.match(code,/if\(freeReferral && !setupService\)\{/);
  assert.match(code,/line_items:setupService \? \[checkoutLineItem,setupServiceCheckoutLineItem\(freeReferral\)\] : \[checkoutLineItem\]/);
  assert.match(code,/assistedSetupCheckoutTrial\(setupService\)/);
  assert.equal((code.match(/owner_promo_zero_recurring:'1',owner_promo_zero_setup:'1'/g)||[]).length,2);
  assert.match(code,/payment_method_collection:freeReferral && setupService \? 'if_required' : 'always'/);
  assert.match(code,/if\(referralCode && !freeReferral\)\{/);
  assert.match(code,/allow_promotion_codes:false/);
});

test('normal 20% customer referral remains separate from free founder promo',()=>{
  assert.match(server,/if \(referralCode && !freeReferral\) \{/);
  assert.match(server,/applyReferralDiscountIfEligible\(userId, subscriptionId/);
  assert.match(server,/percent_off: 20,\s*duration: 'once'/);
  assert.match(server,/const FREE_REFERRAL_CODE = normalizeReferralCode\(process\.env\.OWNER_FREE_CODE \|\| ''\)/);
  assert.match(server,/if\(referralCode && !freeReferral && !planAllowsReferral\(plan\)\)/);
});
