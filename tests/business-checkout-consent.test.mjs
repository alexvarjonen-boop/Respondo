import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';

const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const legal=readFileSync(new URL('../public/legal-content.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/checkout-consent.css',import.meta.url),'utf8');
const index=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');

test('all three B2B purchase paths use one terms checkbox, not a second business confirmation',()=>{
  assert.match(app,/function checkoutBusinessTerms\(name='terms'/);
  assert.equal((app.match(/checkoutBusinessTerms\('acceptedTerms', 'workspace-terms'\)/g)||[]).length,2);
  assert.equal((app.match(/checkoutBusinessTerms\('terms', 'checkrow field full'\)/g)||[]).length,1);
  assert.doesNotMatch(app,/name="businessPurchase"\s+required/);
  assert.match(app,/businessPurchase:!!form\.get\('terms'\)/);
  assert.equal((app.match(/businessPurchase:fd\.get\('acceptedTerms'\)==='on'/g)||[]).length,2);
});
test('the consent is readable, links to legal pages, and retains native keyboard accessible checkbox',()=>{
  assert.match(app,/name="\$\{name\}" required/);
  assert.match(app,/href="\/kayttoehdot\?lang=\$\{lang\}"/);
  assert.match(app,/href="\/tietosuoja\?lang=\$\{lang\}"/);
  assert.match(app,/vahvistan, että tilaus tehdään yrityskäyttöön/);
  assert.match(css,/max-height:20px!important/);
  assert.match(css,/max-width:20px!important/);
  assert.match(index,/checkout-consent\.css\?v=20261009-b2b-consent-v1/);
});
test('all localized terms expressly limit purchases to business usage',()=>{
  assert.match(legal,/Respondo AI on tarkoitettu yksinomaan yrityksille/);
  assert.match(legal,/Respondo AI erbjuds endast företag/);
  assert.match(legal,/Respondo AI is offered only to businesses/);
  assert.match(legal,/LEGAL_UPDATE_DATE = '2026-10-09'/);
});
