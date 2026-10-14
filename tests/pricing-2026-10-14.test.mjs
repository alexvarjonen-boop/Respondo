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

test('2026-10-14 monthly tiers have the approved prices and unchanged seat limits', () => {
  for (const [code, amount, seats] of [
    ['basic_monthly', 49, 2],
    ['advanced_monthly', 129, 10],
    ['business_monthly', 149, 20]
  ]) {
    const line = server.split('\n').find((line) => line.trimStart().startsWith(code + ':'));
    assert.ok(line, 'missing plan ' + code);
    assert.match(line, new RegExp('monthlyPrice:' + amount + '(?!\\d)'));
    assert.match(line, new RegExp('agentSeats:' + seats + '(?!\\d)'));
  }
  assert.match(server, /NEW_MONTHLY_PRICE_CENTS = Object\.freeze\(\{ basic_monthly:4900, advanced_monthly:12900, business_monthly:14900 \}\)/);
});

test('annual plans retain internal tier permissions and Stripe validation', () => {
  for (const [code,monthlyPrice,total,seats] of [
    ['basic_yearly',39,468,2],['advanced_yearly',119,1428,10],['business_yearly',139,1668,20]
  ]) {
    const line=server.split('\n').find((line)=>line.trimStart().startsWith(code+':'));
    assert.ok(line);
    assert.ok(line.includes('monthlyPrice:'+monthlyPrice));
    assert.ok(line.includes('annualTotal:'+total));
    assert.ok(line.includes('agentSeats:'+seats));
  }
  assert.match(server,/NEW_YEARLY_PRICE_CENTS = Object\.freeze\(\{ basic_yearly:46800, advanced_yearly:142800, business_yearly:166800 \}\)/);
  assert.match(server,/await stripeCheckoutLineItem\(normalizedPlan\)/);
  assert.match(server,/await assertCurrentCheckoutPrice\(plan,priceId\)/);
  assert.match(server,/stripe\.products\.retrieve\(productId\)/);
  assert.match(server,/product\.name !== productName/);
  for (const tier of ['basic','advanced','business']) assert.match(server,new RegExp("\\['"+tier+"_yearly',process\\.env\\.STRIPE_"+tier.toUpperCase()+"_YEARLY_PRICE_ID\\]"));
});

test('website and signup display both billing intervals', () => {
  const pricing = app.split('function pricingSection() {')[1]?.split('function cinematicConversationScene()')[0] || '';
  assert.ok(pricing);
  assert.match(pricing, /card\('Advanced',49,/);
  assert.match(pricing, /card\('Premium',129,/);
  assert.match(pricing, /card\('Enterprise',149,/);
  assert.match(pricing, /_yearly/);
  for (const tier of ['basic','advanced','business']) assert.ok(app.includes(`value="${tier}_yearly"`));

  for (const source of [app, effects]) {
    assert.match(source, /Respondo Advanced|Advanced/);
    assert.doesNotMatch(source, /(?:Starter 34,90|Advanced 44,90|Business 54,90)/);
  }
});

test('searchable marketing and guides do not advertise obsolete plan pricing', () => {
  for (const source of [html, guide]) {
    assert.doesNotMatch(source, /(?:Starter 34[,.]90|Advanced 44[,.]90|Business 54[,.]90)/);
    assert.match(source, /(?:Respondo Advanced|Advanced 49|Advanced €49|Advanced 49 €)/);
  }
});

test('no stale public prices remain across localized FAQ, legal pages or conversion content', () => {
  for (const path of [
    'public/app.js',
    'public/effects.js',
    'public/index.html',
    'public/global-resources.mjs',
    'public/legal-content.js',
    'public/customer-service-landing.mjs',
    'public/ai-topic-pages.mjs',
    'respondo-faq.mjs',
  ]) {
    const source = read(path);
    assert.doesNotMatch(source, /(?:29|34|39|44|49|54)[,.]90|(?:€29|€34|€39|€44|€49|€54)\.90/, 'outdated amount found in ' + path);
  }
});

test('Stripe Checkout uses exactly the approved monthly amounts and tier product names even with stale Railway Price IDs', async () => {
  const start=server.indexOf('async function stripeCheckoutLineItem(plan)');
  const end=server.indexOf('function planFromStripePriceId',start);
  assert.ok(start>0 && end>start);
  const source=server.slice(start,end);
  const prices={basic_monthly:4900,advanced_monthly:12900,business_monthly:14900};
  const names={basic_monthly:'Respondo Advanced',advanced_monthly:'Respondo Premium',business_monthly:'Respondo Enterprise'};
  const ctx={
    stripePriceForPlan:()=> 'price_old_mismatch',
    assertCurrentCheckoutPrice:async()=> { throw Error('Old price rejected'); },
    NEW_MONTHLY_PRICE_CENTS:prices,
    NEW_YEARLY_PRICE_CENTS:{basic_yearly:46800,advanced_yearly:142800,business_yearly:166800},
    NEW_MONTHLY_PRODUCT_NAMES:names,
    console:{warn(){}},
  };
  const get=vm.runInNewContext(source+'\nstripeCheckoutLineItem',ctx);
  for (const [plan,amount] of Object.entries(prices)) {
    const result=JSON.parse(JSON.stringify(await get(plan)));
    assert.deepEqual(result,{
      price_data:{currency:'eur',unit_amount:amount,recurring:{interval:'month',interval_count:1},product_data:{name:names[plan]}},
      quantity:1,
    });
    assert.equal('price' in result,false,'checkout must not reuse old mismatching Price ID');
  }
  for (const [plan,amount] of Object.entries(ctx.NEW_YEARLY_PRICE_CENTS)) {
    const result=JSON.parse(JSON.stringify(await get(plan)));
    assert.deepEqual(result,{
      price_data:{currency:'eur',unit_amount:amount,recurring:{interval:'year',interval_count:1},product_data:{name:names[plan.replace('_yearly','_monthly')]}},
      quantity:1,
    });
  }
  assert.equal((server.match(/line_items:\s*\[checkoutLineItem\]/g)||[]).length,2);
  assert.match(server,/subscription\.metadata\?\.plan/);
});
