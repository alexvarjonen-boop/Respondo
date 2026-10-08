import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server=fs.readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const terms=fs.readFileSync(new URL('../public/legal-content.js',import.meta.url),'utf8');

test('new Stripe subscriptions do not charge Finnish VAT when seller is not VAT registered',()=>{
  assert.match(server,/function checkoutTaxExemptionMessage\(lang='fi'\)/);
  assert.match(server,/Arvonlisäveroa ei peritä/);
  assert.match(server,/Ingen moms debiteras/);
  assert.match(server,/No VAT is charged/);
  assert.doesNotMatch(server,/ensureFinnishVatTaxRate|FINNISH_VAT_PERCENT|finnishVatTaxRateId|finnishVatMessage/);
  assert.match(server,/line_items:\s*\[\{ price, quantity: 1 \}\]/);
  assert.match(server,/line_items:\[\{price,quantity:1\}\]/);
  assert.equal((server.match(/automatic_tax:\s*\{\s*enabled:\s*false\s*\}/g)||[]).length,2);
  assert.equal((server.match(/custom_text:\s*\{\s*submit:\s*\{\s*message:\s*taxExemptionMessage/g)||[]).length,2);
});

test('prices and terms do not falsely describe VAT as included',()=>{
  for(const s of [server,app,terms]){
    assert.doesNotMatch(s,/25[.,]5\s*%/);
  }
  assert.match(app,/Starter',29\.90,29\.90,358\.80/);
  assert.match(app,/Advanced',39\.90,39\.90,478\.80/);
  assert.match(app,/Business',49\.90,49\.90,598\.80/);
});

test('historical inclusive-tax Stripe prices stay associated with their plans',()=>{
  const legacy=[
    'price_1UOLwuV05brJ7mTPUcIxZKE6',
    'price_1UOLx1V05brJ7mTPETqeexmn',
    'price_1UOLx3V05brJ7mTPODsTKyC5',
    'price_1UOLx6V05brJ7mTPIgyqDymD',
    'price_1UOLx8V05brJ7mTPDq47ha22',
    'price_1UOLxBV05brJ7mTPSsDPLXTM',
  ];
  const mapping=server.slice(server.indexOf('function planFromStripePriceId'),server.indexOf('async function activeTenantPlan'));
  for(const id of legacy) assert.ok(mapping.includes(id),'missing '+id);
});
