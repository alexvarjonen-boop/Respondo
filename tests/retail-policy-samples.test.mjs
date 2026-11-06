import test from 'node:test';
import assert from 'node:assert/strict';
import {retailPolicySampleUrls} from '../retail-policy-samples.mjs';
import {extractBusinessDocument,essentialWebsiteCandidates} from '../website-knowledge.mjs';

test('retail policy sampling uses only catalog-confirmed same-origin product pages',()=>{
  const items=[
    {url:'https://shop.example/products/headcover'},
    {url:'https://other.example/products/foreign'},
    {url:'https://shop.example/checkout'},
    {url:'https://shop.example/products/putter?variant=123'},
    {url:'https://shop.example/products/headcover#details'},
    {url:'https://shop.example/products/grip'},
    {url:'https://shop.example/products/fourth'}
  ];
  assert.deepEqual(retailPolicySampleUrls(items,'https://shop.example/',3),[
    'https://shop.example/products/headcover',
    'https://shop.example/products/putter',
    'https://shop.example/products/grip'
  ]);
  assert.deepEqual(retailPolicySampleUrls(items,'https://unrelated.example/',3),[]);
});
test('product-page policy sample persists a real threshold with product source',()=>{
  const site='https://shop.example/products/headcover';
  const html='<html><body><button><span>Free shipping available on orders over 280€</span></button></body></html>';
  const doc=extractBusinessDocument(html,site);
  const facts=essentialWebsiteCandidates({finalUrl:'https://shop.example/',products:[],pageDocuments:[doc]});
  const found=facts.filter(x=>x.category==='Toimitus ja seuranta'&&/280/.test(x.answer));
  assert.equal(found.length,1);
  assert.equal(found[0].sourceUrl,site);
});
