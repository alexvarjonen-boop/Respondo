import test from 'node:test';
import assert from 'node:assert/strict';
import {extractCustomerProductUrl,canonicalCatalogProductPath,approvedProductLinkAnswer} from '../product-url-match.mjs';

const row={id:'verified-1',title:'Putter',url:'https://example.fi/products/putter',
  product:{name:'Putter',url:'https://example.fi/products/putter',price:129,imageUrl:'https://example.fi/p.jpg'}};
const parse=row=>row.product || null;
const rows=[row];

test('direct product URL produces a grounded card candidate',()=>{
  const answer=approvedProductLinkAnswer(rows,'Näytä https://example.fi/products/putter', 'fi',parse);
  assert.equal(answer?.intent,'Tuotteet');
  assert.equal(answer?.sourceIds[0],'verified-1');
  assert.deepEqual(answer?.selected,[row]);
  assert.match(answer.answer,/ajantasainen hinta/);
});
test('URL with tracking and variant parameters matches exact approved product path',()=>{
  const answer=approvedProductLinkAnswer(rows,'https://www.example.fi/products/putter/?utm_source=chat&variant=2', 'en',parse);
  assert.equal(answer?.selected[0],row);
  assert.match(answer.answer,/latest price/);
});
test('does not match another shop or a similar but different product',()=>{
  assert.equal(approvedProductLinkAnswer(rows,'https://other.fi/products/putter','fi',parse)?.selected.length,0);
  assert.equal(approvedProductLinkAnswer(rows,'https://example.fi/products/putter-2','fi',parse)?.selected.length,0);
});
test('unknown explicit product link never fabricates price or recommendation',()=>{
  const answer=approvedProductLinkAnswer(rows,'Kan ni visa https://example.fi/products/unknown','sv',parse);
  assert.equal(answer?.intent,'Tuotelinkki');
  assert.deepEqual(answer.selected,[]);
  assert.match(answer.answer,/inte bekräfta/);
});
test('non-product web link follows existing page-answer logic',()=>{
  assert.equal(approvedProductLinkAnswer(rows,'Read https://example.fi/contact', 'en',parse),null);
});
test('rejects credentials and unsafe URL schemes',()=>{
  assert.equal(extractCustomerProductUrl('ftp://example.fi/products/putter'),null);
  assert.equal(extractCustomerProductUrl('https://person:secret@example.fi/products/putter'),null);
});
test('plain www links are accepted and query fragments ignored',()=>{
  assert.equal(canonicalCatalogProductPath(extractCustomerProductUrl('www.example.fi/products/putter?x=1.')),'example.fi/products/putter');
});
test('catalog isolation is enforced by the supplied rows',()=>{
  const another={...row,id:'other',product:{...row.product,url:'https://another.fi/products/putter'}};
  assert.equal(approvedProductLinkAnswer([another],'https://example.fi/products/putter','fi',parse)?.selected.length,0);
});
