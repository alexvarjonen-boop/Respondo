import test from 'node:test';
import assert from 'node:assert/strict';
import {approvedCurrentPageProduct} from '../page-context-product.mjs';

const parse=row=>({name:row.name,url:row.url});
const catalog=[
 {id:'approved-one',approved:true,name:'Aurora lamp',url:'https://store.example/products/aurora'},
 {id:'draft-two',approved:false,name:'Hidden lamp',url:'https://store.example/products/hidden'}
];
test('current product page resolves a demonstrative customer question without crawling',()=>{
 for(const [lang,question] of [
  ['fi','Mikä tämä tuote on?'],
  ['sv','Vad är den här produkten?'],
  ['en','What is this product?']
 ]){
  const r=approvedCurrentPageProduct(catalog,question,
   {url:'https://store.example/products/aurora?utm_source=summer',title:'Untrusted title'},lang,parse);
  assert.deepEqual(r.sourceIds,['approved-one']);
  assert.match(r.answer,/Aurora lamp/);
  assert.equal(r.handoff,false);
 }
});
test('unapproved, off-page and invalid source URLs cannot create product evidence',()=>{
 for(const url of [
  'https://store.example/products/hidden',
  'https://different.example/products/aurora',
  'javascript:alert(1)',
  'https://someone:pass@store.example/products/aurora',
  'https://store.example/products/nonexistent'
 ])assert.equal(approvedCurrentPageProduct(catalog,'What is this product?',{url},'en',parse),null);
 assert.equal(approvedCurrentPageProduct(catalog,'What are your opening hours?',
  {url:'https://store.example/products/aurora'},'en',parse),null);
});
test('explicit visitor URL is never silently replaced by the current page URL',()=>{
 const r=approvedCurrentPageProduct(catalog,
  'What is this product? https://store.example/products/hidden',
  {url:'https://store.example/products/aurora'},'en',parse);
 assert.equal(r,null);
});
