import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const server = readFileSync(new URL('../server.mjs', import.meta.url), 'utf8');
const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const effects = readFileSync(new URL('../public/effects.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const guides = readFileSync(new URL('../public/global-resources.mjs', import.meta.url), 'utf8');

test('legacy checkout price validation is retained separately from new public offer',()=>{
  const pricing=app.slice(app.indexOf('function pricingSection()'),app.indexOf('function bindPricingPeriodSwitch()'));
  assert.match(pricing,/350/);assert.match(pricing,/200/);
  assert.match(pricing,/\/tilaus\?plan=respondo_monthly/);assert.doesNotMatch(pricing,/Advanced|Premium|Enterprise/);
  for(const [tier,amount,internal] of [['Advanced','49','basic'],['Premium','129','advanced'],['Enterprise','149','business']]){
    assert.match(app,/value="respondo_monthly"/);
    assert.ok(server.includes(internal+'_monthly:'+amount+'00'));
  }
  assert.match(server,/stripe\.prices\.retrieve\(priceId\)/);
});

test('new annual subscriptions are available for each tier and save 120 euros per year', () => {
  for (const [plan,amount,total] of [
    ['basic',39,468],['advanced',119,1428],['business',139,1668]
  ]) {
    assert.ok(!app.includes('value="'+plan+'_yearly"'));
    assert.ok(server.includes(plan+'_yearly:'));
    assert.ok(server.includes('monthlyPrice:'+amount+',annualTotal:'+total));
    assert.ok(!app.includes('value="'+plan+'_monthly"'));
  }
  assert.match(server, /NEW_YEARLY_PRICE_CENTS/);
  assert.match(server, /CURRENT_PRICE_CENTS/);
  assert.doesNotMatch(server, /Uusille tilauksille on saatavilla vain kuukausilaskutus/);
});

test('homepage structured data advertises one monthly price',()=>{
  assert.equal((html.match(/"@type":"Offer"/g)||[]).length,1);
  assert.ok(html.includes('"price":"350.00"'));
  assert.match(html,/"category":"monthly subscription"/);
});

test('historical monthly subscriber prices retain explicit mapping', () => {
  for (const priceId of [
    'price_1UP2DWV05brJ7mTP6sjumnIt',
    'price_1UP2DfV05brJ7mTPuSuwvuxm',
    'price_1UP2DhV05brJ7mTP2pSDX8aV',
  ]) assert.ok(server.includes(priceId));
});
