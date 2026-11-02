import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isCatalogQuestionTitle, parseProductKnowledgeRow, essentialWebsiteCandidates} from '../website-knowledge.mjs';

const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');

test('multilingual FAQ questions cannot become purchasable product names',()=>{
  for(const question of [
    'Onko tämä tuote varastossa?', 'Mitä tuotteita myytte?',
    'Is this product in stock?', 'Do you sell this product?',
    'Finns denna produkt i lager?', 'Har ni produkten i lager?'
  ]){
    assert.equal(isCatalogQuestionTitle(question),true,question);
    assert.equal(parseProductKnowledgeRow({
      category:'Tuotteet',title:question,answer:'Tuote: '+question+' Hinta: 14.00 EUR. URL: https://shop.example/products/sample'
    }),null,question);
  }
  assert.equal(isCatalogQuestionTitle('What If? Edition'),false);
  assert.equal(isCatalogQuestionTitle('Putter Model X'),false);
});

test('import excludes template product questions and retains normal products',()=>{
  const candidates=essentialWebsiteCandidates({
    finalUrl:'https://shop.example/',
    products:[
      {name:'Onko tämä tuote varastossa?',url:'https://shop.example/products/stock-faq',price:0},
      {name:'Example Golf Putter',url:'https://shop.example/products/example-putter',price:129,currency:'EUR'}
    ],
    pageDocuments:[]
  });
  assert.ok(!candidates.some(c=>c.category==='Tuotteet' && /Onko tämä tuote varastossa/.test(c.title)));
  assert.ok(candidates.some(c=>c.category==='Tuotteet' && c.title==='Example Golf Putter'));
});

test('preview rejects FAQ product cards before rendering, including previously cached results',()=>{
  assert.match(app,/const faqTitle=\/\^\(\?:onko\|/);
  assert.match(app,/return Boolean\(name\) && !faqTitle/);
  assert.match(app,/function appendPreviewProductCards/);
});

test('white product card uses native Chrome/Safari text fill for dark names, descriptions and links',()=>{
  for(const hex of ['#171923','#414653','#111827','#244d91'])
    assert.ok(app.includes('color:'+hex+'!important;-webkit-text-fill-color:'+hex+'!important'),hex);
  assert.match(app,/#app \.preview-bubble\.bot \.preview-product-card \.preview-product-copy strong/);
  assert.match(app,/#app \.preview-bubble\.bot \.preview-product-card \.preview-product-go/);
  assert.match(app,/\.preview-product-card\{display:flex;gap:10px/);
  assert.match(app,/white card/);
});

test('public test bot assets receive a fresh cache key',()=>{
  assert.match(html,/app\.js\?v=[^"]*preview-products-v48/);
});
