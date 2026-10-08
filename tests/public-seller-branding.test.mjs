import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const index=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
test('public site does not display the sole proprietor personal name in signup, footer, or legal page chrome',()=>{
  assert.doesNotMatch(app,/Alex Varjonen/i);
  assert.match(app,/sellerName: 'Respondo AI'/);
  assert.match(app,/function footer\(\)/);
  assert.match(app,/<b>Respondo AI<\/b>/);
  assert.match(index,/seller-brand-v1/);
});
test('the public configuration is brand-only, while statutory invoice seller identity remains accurate',()=>{
  assert.match(server,/sellerName: 'Respondo AI'/);
  assert.match(server,/Myyjä \/ Seller: Alex Varjonen \(Respondo AI\)/);
});
