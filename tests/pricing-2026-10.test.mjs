import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const server = readFileSync(new URL('../server.mjs', import.meta.url), 'utf8');
const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const effects = readFileSync(new URL('../public/effects.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const guides = readFileSync(new URL('../public/global-resources.mjs', import.meta.url), 'utf8');

test('three new monthly prices agree across checkout backend and public UI', () => {
  for (const [tier, amount, internal] of [
    ['Advanced', '49', 'basic'],
    ['Premium', '129', 'advanced'],
    ['Enterprise', '149', 'business'],
  ]) {
    assert.match(app, new RegExp("card\\('"+tier+"',"+amount+","));
    assert.match(app, new RegExp('value="'+internal+'_monthly"'));
    assert.match(effects, new RegExp(tier+'[^\\n]*'+amount+' €|'+amount+' €[^\\n]*'+tier));
    assert.match(guides, new RegExp(tier+'[^\\n]*'+amount));
  }
  assert.match(server, /NEW_MONTHLY_PRICE_CENTS\s*=\s*Object\.freeze\(\{\s*basic_monthly:4900,\s*advanced_monthly:12900,\s*business_monthly:14900\s*\}\)/);
  assert.match(server, /stripe\.prices\.retrieve\(priceId\)/);
});

test('new annual checkout plans are available and keep existing Stripe mappings', () => {
  assert.match(server,/NEW_YEARLY_PRICE_CENTS/);
  for (const code of ['basic','advanced','business']) {
    assert.ok(app.includes('value="'+code+'_yearly"'));
    assert.ok(server.includes("['"+code+"_yearly',process.env.STRIPE_"+code.toUpperCase()+"_YEARLY_PRICE_ID]"));
  }
  assert.doesNotMatch(server,/if \(plan\.endsWith\('_yearly'\)\) return res\.status\(400\)/);
});

test('homepage structured data advertises all monthly and annual offers', () => {
  assert.equal((html.match(/"@type":"Offer"/g) ?? []).length, 6);
  assert.match(html, /"name":"Respondo Advanced Monthly","price":"49\.00"/);
  assert.match(html, /"name":"Respondo Premium Monthly","price":"129\.00"/);
  assert.match(html, /"name":"Respondo Enterprise Monthly","price":"149\.00"/);
  assert.match(html, /"name":"Respondo Advanced Annual","price":"468\.00"/);
  assert.match(html, /"name":"Respondo Premium Annual","price":"1428\.00"/);
  assert.match(html, /"name":"Respondo Enterprise Annual","price":"1668\.00"/);
});

test('historical monthly subscriber prices retain explicit mapping', () => {
  for (const priceId of [
    'price_1UP2DWV05brJ7mTP6sjumnIt',
    'price_1UP2DfV05brJ7mTPuSuwvuxm',
    'price_1UP2DhV05brJ7mTP2pSDX8aV',
  ]) assert.ok(server.includes(priceId));
});
