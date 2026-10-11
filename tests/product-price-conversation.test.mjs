import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// Execute the production resolver itself with deterministic fixture inputs.
// The entire Express app does not need a live PostgreSQL/Stripe environment
// just to verify whether an elliptical customer question inherits price intent.
const source=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const start=source.indexOf('function contextualProductPriceQuestion(');
const end=source.indexOf('\nfunction directProductVariantFollowup(',start);
assert.ok(start>=0&&end>start,'the production product-price resolver must exist');

const normalize=(v)=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const family=(v)=>{
  const q=normalize(v);
  if(/\bputter\w*\b/.test(q))return 'putter';
  if(/\b(?:mailansuoja\w*|headcover\w*)\b/.test(q))return 'headcover';
  if(/\b(?:pyyhe\w*|towel\w*|handduk\w*)\b/.test(q))return 'towel';
  return '';
};
const tokens=(v)=>normalize(v).split(' ').filter(w=>w.length>=3);
const score=(p,ts)=>ts.reduce((sum,t)=>sum+(normalize(p.name).includes(t)?12:0),0);
const fn=runInNewContext(
  source.slice(start,end)+'\ncontextualProductPriceQuestion;',
  {
    normalizeSearchText:normalize,
    requestedProductFamily:family,
    productQueryTokens:tokens,
    productMatchScore:score,
    conversationPhraseType:()=>null,
  }
);
const products=[{name:'JAG Putter'},{name:'JAG Towel'},{name:'JAG Headcover'},{name:'Alpha Charger'}];

test('entä pyyhe retains the prior putter price intent',()=>{
  assert.equal(fn(products,'entä pyyhe',[{question:'mitä putteri maksaa?',answer:'JAG Putter maksaa 300 €.'}]),'pyyhe hinta maksaa');
});
test('entä mailansuoja retains the price intent across several short follow-ups',()=>{
  const history=[
    {question:'mitä putteri maksaa?',answer:'JAG Putter maksaa 300 €.'},
    {question:'entä pyyhe',answer:'Vastausta ei löytynyt.'},
  ];
  assert.equal(fn(products,'entä mailansuoja',history),'mailansuoja hinta maksaa');
});
test('does not inherit price intent from a stock-availability question',()=>{
  assert.equal(fn(products,'entä pyyhe',[{question:'Onko putteri varastossa?'}]),'');
});
test('does not invent a history when none was supplied',()=>{
  assert.equal(fn(products,'entä pyyhe',[]),'');
});
test('a new shipping topic does not become a product price lookup',()=>{
  assert.equal(fn(products,'entä toimitus',[{question:'mitä putteri maksaa?'}]),'');
});
test('an explicit new availability intent resets the prior price context',()=>{
  const history=[
    {question:'mitä putteri maksaa?'},
    {question:'onko sitä varastossa?'},
  ];
  assert.equal(fn(products,'entä pyyhe',history),'');
});
test('supports English follow-up questions',()=>{
  assert.equal(fn(products,'what about towel',[{question:'how much does the putter cost?'}]),'towel hinta maksaa');
});
test('supports unambiguous product names outside golf',()=>{
  assert.equal(fn(products,'entä Alpha Charger',[{question:'paljonko putteri maksaa?'}]),'alpha charger hinta maksaa');
});
test('does not guess the price for an unknown product name',()=>{
  assert.equal(fn(products,'entä Something Else',[{question:'mitä putteri maksaa?'}]),'');
});
