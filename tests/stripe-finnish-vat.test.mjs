import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server=fs.readFileSync(new URL('../server.mjs',import.meta.url),'utf8');

test('Stripe subscription checkout uses inclusive Finnish VAT and shows its euro share',()=>{
  assert.match(server,/const FINNISH_VAT_PERCENT = 25\.5/);
  assert.match(server,/async function ensureFinnishVatTaxRate\(\)/);
  assert.match(server,/display_name:'ALV 25,5 %'/);
  assert.match(server,/percentage:FINNISH_VAT_PERCENT/);
  assert.match(server,/inclusive:true/);
  assert.match(server,/country:'FI'/);
  assert.match(server,/async function finnishVatCheckoutMessage\(priceId, lang='fi'\)/);
  assert.match(server,/amountCents \* FINNISH_VAT_PERCENT \/ \(100 \+ FINNISH_VAT_PERCENT\)/);
  assert.match(server,/sisältää ALV 25,5 %/);
  assert.match(server,/line_items:\s*\[\{ price, quantity: 1, tax_rates: \[finnishVatTaxRateId\] \}\]/);
  assert.match(server,/line_items:\[\{price,quantity:1,tax_rates:\[finnishVatTaxRateId\]\}\]/);
  assert.match(server,/custom_text:\s*\{\s*submit:\s*\{ message: finnishVatMessage \}/);
  assert.match(server,/custom_text:\{\s*submit:\{message:finnishVatMessage\}/);
  assert.doesNotMatch(server,/automatic_tax:\s*\{\s*enabled:\s*true\s*\}/);
});
