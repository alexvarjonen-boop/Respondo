import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = (file) => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const server = read('server.mjs');
const app = read('public/app.js');
const effects = read('public/effects.js');
const html = read('public/index.html');
const guide = read('public/global-resources.mjs');

const plans = [
  ['basic', 'Advanced', 49, 39, 468, 2],
  ['advanced', 'Premium', 129, 119, 1428, 10],
  ['business', 'Enterprise', 149, 139, 1668, 20],
];

test('approved October 14 subscription tiers save exactly 10 EUR per month on every annual plan', () => {
  for (const [code, name, monthly, annualMonthly, annualTotal, seats] of plans) {
    for (const [suffix, expectedMonthly, expectedTotal] of [
      ['monthly', monthly, null],
      ['yearly', annualMonthly, annualTotal],
    ]) {
      const line = server.split('\n').find(line => line.trimStart().startsWith(code + '_' + suffix + ':'));
      assert.ok(line, 'missing plan ' + code + '_' + suffix);
      assert.match(line, new RegExp('monthlyPrice:' + expectedMonthly + '(?!\\d)'));
      assert.match(line, new RegExp('agentSeats:' + seats + '(?!\\d)'));
      if (suffix === 'yearly') assert.match(line, new RegExp('annualTotal:' + expectedTotal + '(?!\\d)'));
    }
    assert.equal(monthly - annualMonthly, 10, name + ' annual discount is 10 EUR/month');
    assert.equal(annualTotal, annualMonthly * 12, name + ' yearly sum matches equivalent monthly price');
  }
  assert.match(server, /NEW_MONTHLY_PRICE_CENTS = Object\.freeze/);
  assert.match(server, /NEW_YEARLY_PRICE_CENTS = Object\.freeze/);
  assert.match(server, /basic_yearly:46800, advanced_yearly:142800, business_yearly:166800/);
});

test('both new signups and added workspaces accept annual billing, preserving original trials', () => {
  assert.doesNotMatch(server, /Uusille tilauksille on saatavilla vain kuukausilaskutus/);
  assert.match(server, /await stripeCheckoutLineItem\(normalizedPlan\)/);
  assert.match(server, /await stripeCheckoutLineItem\(plan\)/);
  assert.match(server, /assistedSetupCheckoutTrial\(setupService\)/);
  assert.match(read('assisted-setup-billing.mjs'), /ASSISTED_SETUP_CUSTOMER_TRIAL_DAYS = 3/);
  assert.match(app, /basic_yearly/);
  assert.match(app, /advanced_yearly/);
  assert.match(app, /business_yearly/);
  assert.match(app, /const yearlyMonthly=monthly-10/);
  assert.match(app, /const yearlyTotal=yearlyMonthly\*12/);
  assert.match(app, /plan:card\.dataset\.planCode \+ \(yearly \? '_yearly' : '_monthly'\)/);
});

test('Stripe checkout validates the year-long billing interval, exact price and Product names', () => {
  assert.match(server, /stripe\.prices\.retrieve\(priceId\)/);
  assert.match(server, /stripe\.products\.retrieve\(productId\)/);
  assert.match(server, /price\.unit_amount !== CURRENT_PRICE_CENTS\[plan\]/);
  assert.match(server, /product\.name !== CURRENT_PRODUCT_NAMES\[plan\]/);
  assert.match(server, /plan\.endsWith\('_yearly'\) \? 'year' : 'month'/);
});

test('pricing pages and search structured data show three monthly and three annual offers', () => {
  const pricing = app.split('function pricingSection() {')[1]?.split('function cinematicConversationScene()')[0] || '';
  assert.ok(pricing);
  for (const [, name, monthly] of plans) {
    assert.ok(pricing.includes("card('"+name+"',"+monthly+","), 'missing '+name);
  }
  assert.match(pricing, /Vuosittain/);
  assert.match(pricing, /Säästät 120 €\/vuosi/);
  assert.equal((html.match(/"@type":"Offer"/g) || []).length, 6);
  for (const total of ['49.00','129.00','149.00','468.00','1428.00','1668.00']) {
    assert.ok(html.includes('"price":"'+total+'"'), total);
  }
});

test('configured current Checkout prices are used, but stale IDs cannot charge old amounts', async () => {
  const start = server.indexOf('async function stripeCheckoutLineItem(plan)');
  const end = server.indexOf('function planFromStripePriceId', start);
  assert.ok(start > 0 && end > start);
  const amounts = {
    basic_monthly:4900, advanced_monthly:12900, business_monthly:14900,
    basic_yearly:46800, advanced_yearly:142800, business_yearly:166800,
  };
  const names = {
    basic_monthly:'Respondo Advanced', advanced_monthly:'Respondo Premium', business_monthly:'Respondo Enterprise',
    basic_yearly:'Respondo Advanced', advanced_yearly:'Respondo Premium', business_yearly:'Respondo Enterprise',
  };
  const ctx = {
    stripePriceForPlan:() => 'price_legacy',
    assertCurrentCheckoutPrice:async() => { throw Error('legacy price blocked'); },
    CURRENT_PRICE_CENTS:amounts,
    CURRENT_PRODUCT_NAMES:names,
    console:{warn(){}},
  };
  const fn = vm.runInNewContext(server.slice(start,end)+'\nstripeCheckoutLineItem',ctx);
  for (const [plan,amount] of Object.entries(amounts)) {
    const result=JSON.parse(JSON.stringify(await fn(plan)));
    assert.deepEqual(result,{
      price_data:{
        currency:'eur',unit_amount:amount,
        recurring:{interval:plan.endsWith('_yearly')?'year':'month',interval_count:1},
        product_data:{name:names[plan]},
      },
      quantity:1,
    });
  }
  assert.equal((server.match(/line_items:\s*setupService \? \[checkoutLineItem,setupServiceCheckoutLineItem\(\)\] : \[checkoutLineItem\]/g)||[]).length,2);
});

test('historical subscriptions stay recognized and promotional content does not display obsolete prices', () => {
  for (const id of ['price_1UP2DWV05brJ7mTP6sjumnIt','price_1UP2DfV05brJ7mTPuSuwvuxm','price_1UP2DhV05brJ7mTP2pSDX8aV']) {
    assert.ok(server.includes(id), 'old price mapping missing '+id);
  }
  for (const source of [app,effects,html,guide,read('public/legal-content.js'),read('respondo-faq.mjs')]) {
    assert.doesNotMatch(source, /(?:29|34|39|44|49|54)[,.]90|(?:€29|€34|€39|€44|€49|€54)\.90/);
  }
});
