import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = p => readFileSync(new URL('../'+p, import.meta.url),'utf8');
const app = read('public/app.js'), legal = read('public/legal-content.js'), server = read('server.mjs');
test('Movexa is the seller; Respondo AI stays the brand',()=>{
  assert.match(server,/sellerName:\s*'Movexa'/);
  assert.match(app,/sellerName:\s*'Movexa'/);
  assert.match(app,/A MOVEXA BRAND/);
  assert.match(app,/footer-movexa/);
  assert.match(app,/esc\(cfg\.sellerName\|\|'Movexa'\)/);
  assert.match(legal,/Movexa \(Business ID 3599437-5\)/);
  assert.match(legal,/Movexa \(FO-nummer 3599437-5\)/);
  assert.match(legal,/Movexa \(Y-tunnus 3599437-5\)/);
});
test('Company information is routed and fully localized',()=>{
  assert.match(legal,/yritystiedot:\s*\{/);
  assert.match(app,/\/yritystiedot/);
  assert.match(server,/\/yritystiedot/);
  for(const word of ['Yritystiedot','Företagsuppgifter','Company Information']) assert.ok(legal.includes(word));
  assert.doesNotMatch(legal,/yksityinen elinkeinonharjoittaja/i);
});
