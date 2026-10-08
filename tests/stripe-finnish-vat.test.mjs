import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server=fs.readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const respondoFaq=fs.readFileSync(new URL('../respondo-faq.mjs',import.meta.url),'utf8');
const effects=fs.readFileSync(new URL('../public/effects.js',import.meta.url),'utf8');

test('new subscription checkouts use no VAT tax rates when seller is not VAT registered',()=>{
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

test('visible prices remain unchanged and do not claim to include VAT',()=>{
  assert.doesNotMatch(server,/25[.,]5\s*%/);
  assert.doesNotMatch(app,/25[.,]5\s*%/);
  assert.match(app,/Starter',29\.90,29\.90,358\.80/);
  assert.match(app,/Advanced',39\.90,39\.90,478\.80/);
  assert.match(app,/Business',49\.90,49\.90,598\.80/);
});

test('seeded Respondo FAQ and homepage do not advertise VAT-inclusive or obsolete plan prices',()=>{
  for(const source of [respondoFaq,effects]){
    assert.doesNotMatch(source,/25[.,]5\s*%/);
  }
  assert.match(respondoFaq,/Starter 29,90 €/);
  assert.match(respondoFaq,/No VAT is charged/);
  assert.doesNotMatch(respondoFaq,/Basic 49,99 €/);
  assert.match(effects,/No VAT is charged/);
});
