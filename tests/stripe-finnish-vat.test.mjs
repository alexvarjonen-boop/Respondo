import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server=fs.readFileSync(new URL('../server.mjs',import.meta.url),'utf8');

test('Stripe subscription checkout uses inclusive Finnish VAT instead of zero automatic tax',()=>{
  assert.match(server,/async function ensureFinnishVatTaxRate\(\)/);
  assert.match(server,/percentage:25\.5/);
  assert.match(server,/inclusive:true/);
  assert.match(server,/country:'FI'/);
  assert.match(server,/line_items:\s*\[\{ price, quantity: 1, tax_rates: \[finnishVatTaxRateId\] \}\]/);
  assert.match(server,/line_items:\[\{price,quantity:1,tax_rates:\[finnishVatTaxRateId\]\}\]/);
  assert.doesNotMatch(server,/automatic_tax:\s*\{\s*enabled:\s*true\s*\}/);
});
