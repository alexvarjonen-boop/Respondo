import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server=fs.readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const terms=fs.readFileSync(new URL('../public/legal-content.js',import.meta.url),'utf8');
const respondoFaq=fs.readFileSync(new URL('../respondo-faq.mjs',import.meta.url),'utf8');
const effects=fs.readFileSync(new URL('../public/effects.js',import.meta.url),'utf8');

test('new Finnish subscriptions include 25.5% VAT in prices without any extra charge',()=>{
  assert.match(server,/async function finnishInclusiveVatRateId\(/);
  assert.match(server,/percentage:25\.5,/);
  assert.match(server,/inclusive:true,/);
  assert.match(server,/country:'FI'/);
  assert.equal((server.match(/await checkoutItemsWithDomesticVat\(/g)||[]).length,2);
  assert.equal((server.match(/line_items:checkoutLineItems,/g)||[]).length,2);
  assert.match(server,/const SETUP_SERVICE_PRICE_CENTS = 19900/);
  assert.match(server,/unit_amount:ownerFree \? 0 : SETUP_SERVICE_PRICE_CENTS/);
  assert.match(server,/automatic_tax:\s*\{\s*enabled:\s*checkoutCountry\.automaticTax\s*\}/);
  assert.match(server,/return \{ok:true,country,policyVersion:TAX_COUNTRY_POLICY_VERSION,automaticTax:false\}/);
  assert.doesNotMatch(server,/Myyjä ei ole arvonlisäverorekisterissä|No VAT is charged/);
});

test('approved public pricing remains unchanged and invoices disclose Finnish VAT inclusively',()=>{
  assert.match(server,/basic_monthly:4900, advanced_monthly:12900, business_monthly:14900/);
  assert.match(server,/basic_yearly:46800, advanced_yearly:142800, business_yearly:166800/);
  assert.match(app,/card\('Advanced',49,2/);
  assert.match(app,/card\('Premium',129,10/);
  assert.match(app,/card\('Enterprise',149,20/);
  assert.match(terms,/25,5 %/);
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

test('FAQ and marketing pages do not advertise a false VAT exemption',()=>{
  assert.doesNotMatch(respondoFaq,/Arvonlisäveroa ei peritä|No VAT is charged/);
  assert.doesNotMatch(effects,/No VAT is charged|Ingen moms debiteras/);
  assert.match(respondoFaq,/sisältävät Suomen ALV:n 25,5 %/);
  assert.match(effects,/Price includes VAT/);
});
