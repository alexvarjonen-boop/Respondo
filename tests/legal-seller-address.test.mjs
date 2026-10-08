import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server=fs.readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');

test('public seller business postal address requires explicit configuration',()=>{
  assert.match(server,/sellerPostalAddress:\s*String\(process\.env\.RESPONDO_SELLER_POSTAL_ADDRESS\s*\|\|\s*''\)/);
  assert.match(app,/sellerPostalAddress:\s*''/);
  assert.doesNotMatch(server,/sellerPostalAddress:\s*process\.env\.STRIPE_/);
});

test('configured postal address appears in checkout, legal disclosures and footer',()=>{
  assert.match(app,/function footer\(\)/);
  assert.match(app,/function legal\(type\)/);
  assert.match(app,/sellerPostalAddress\?'<small>'\+esc\(cfg\.sellerPostalAddress\)/);
  assert.match(app,/sellerPostalAddress\?'<span>'\+esc\(cfg\.sellerPostalAddress\)/);
  assert.match(app,/sellerPostalAddress\?'<p>'\+esc\(cfg\.sellerPostalAddress\)/);
  assert.match(app,/sellerName\|\|'Alex Varjonen/);
});
