import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {LEGAL_20261008} from '../public/legal-content.js';

test('legal seller and data-controller disclosures consistently identify the registered Respondo AI business',()=>{
  for(const page of ['kayttoehdot','tietosuoja']){
    const first=LEGAL_20261008[page].sections[0].body;
    for(const text of first){
      assert.match(text,/^Respondo AI, (?:Y-tunnus|FO-nummer|Business ID) 3599437-5/);
      assert.match(text,/info@respondoai\.fi/);
      assert.doesNotMatch(text,/Alex Varjonen/i);
    }
  }
});

test('new recurring invoice seller footer uses registered name and business ID',()=>{
  const source=fs.readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
  const start=source.indexOf('const RESPONDO_DOMESTIC_INVOICE_FOOTER =');
  const stop=source.indexOf('async function ensureNewDomesticSubscriptionSellerFooter',start);
  assert.ok(start>=0&&stop>start);
  const footer=source.slice(start,stop);
  assert.match(footer,/Myyjä \/ Seller: Respondo AI/);
  assert.match(footer,/3599437-5/);
  assert.doesNotMatch(footer,/Alex Varjonen/i);
});
