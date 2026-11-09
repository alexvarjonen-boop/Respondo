import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { isPhysicalClubProduct,productBudgetRequest,groundedBudgetProductAnswer } from '../product-budget.mjs';
import {generateGroundedAnswer,verifiedProductCards} from '../server.mjs';

const product=(name,price,id,productType='Putters',currency='EUR')=>({
  name,price,productType,currency,row:{id,title:name},
});
const gift=product('JAG Putters Gift Card',25,'gift','Gift cards');
const blade=product('JAG Satin Black Blade Putter',199,'blade');
const boundary=product('JAG Steel Putter',300,'boundary');
const expensive=product('JAG Bronze Putter',329,'expensive');
const stock=[gift,blade,boundary,expensive];

test('Finnish mailoja price ceiling recognizes clubs, excludes gift cards and exact boundary',()=>{
  const request=productBudgetRequest('onko teillä mailoja alle 300€?');
  assert.deepEqual(request,{amount:300,currency:'EUR',inclusive:false,family:'club'});
  const answer=groundedBudgetProductAnswer(stock,'onko teillä mailoja alle 300€?','fi');
  assert.equal(answer.intent,'Tuotteet');
  assert.deepEqual(answer.selected.map(row=>row.id),['blade']);
  assert.ok(answer.answer.includes('199'));
  assert.doesNotMatch(answer.answer,/Gift Card|Steel Putter/);
});
test('inclusive ceiling includes exactly 300 EUR while strict under does not',()=>{
  assert.deepEqual(groundedBudgetProductAnswer(stock,'puttereita enintään 300€','fi').selected.map(r=>r.id),['blade','boundary']);
  assert.deepEqual(groundedBudgetProductAnswer(stock,'puttereita alle 300€','fi').selected.map(r=>r.id),['blade']);
});
test('other languages preserve the product category and currency limit',()=>{
  for (const [message,lang] of [['Do you have clubs under €300?','en'],['Har ni klubbor under 300€?','sv']]){
    const answer=groundedBudgetProductAnswer(stock,message,lang);
    assert.deepEqual(answer.selected.map(r=>r.id),['blade']);
    assert.equal(answer.handoff,false);
  }
});
test('gift card and accessories never become club recommendations',()=>{
  assert.equal(isPhysicalClubProduct(gift),false);
  assert.equal(isPhysicalClubProduct(product('JAG Putters Headcover',30,'cover','Accessories')),false);
  assert.equal(isPhysicalClubProduct(blade),true);
  const answer=groundedBudgetProductAnswer([gift], 'onko teillä mailoja alle 300€?','fi');
  assert.equal(answer.handoff,false);
  assert.deepEqual(answer.selected,[]);
  assert.doesNotMatch(answer.answer,/Gift Card/);
  assert.match(answer.answer,/ei löytynyt vahvistettuja mailoja/);
});
test('unverified prices and mismatched currencies cannot be used for budget cards',()=>{
  const answer=groundedBudgetProductAnswer([
    product('USD Putter',199,'usd','Putters','USD'),
    product('Unknown Putter',null,'unknown'),
  ],'mailoja alle 300€','fi');
  assert.deepEqual(answer.selected,[]);
});
test('service budgets are left for service pricing, not catalog logic',()=>{
  assert.equal(productBudgetRequest('teettekö ikkunanpesua alle 300€'),null);
  assert.equal(groundedBudgetProductAnswer(stock,'teettekö ikkunanpesua alle 300€','fi'),null);
});
test('full grounded answer engine selects matching product rows only',async()=>{
  const row=(id,name,price,type='Putters')=>({
    id,title:name,category:'Tuotteet',approved:true,
    source_url:'https://jagputters.fi/products/'+id,
    answer:'Tuote: '+name+'. Hinta: '+price+' EUR. Linkki: https://jagputters.fi/products/'+id+'. Tuoteryhmä: '+type+'.',
  });
  const rows=[
    row('gift','JAG Putters Gift Card',25,'Gift cards'),
    row('blade','JAG Satin Black Blade Putter',199),
    row('steel','JAG Steel Putter',300),
  ];
  const result=await generateGroundedAnswer({companyName:'JAG Putters',rows,message:'onko teillä mailoja alle 300€?',lang:'fi'});
  assert.equal(result.handoff,false);
  assert.equal(result.intent,'Tuotteet');
  assert.deepEqual(verifiedProductCards(result).map(p=>p.name),['JAG Satin Black Blade Putter']);
});
test('preview CTA is readable in dark themes and localized using reply language',async()=>{
  const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
  assert.match(app,/#app \.preview-bubble\.bot \.preview-product-open/);
  assert.match(app,/-webkit-text-fill-color:#fff!important/);
  assert.match(app,/appendPreviewProductCards\(bubble,result\.products,result\.language\|\|currentLang\(\)\)/);
  assert.match(app,/products\.length===1\?' product':' products'/);
  assert.doesNotMatch(app,/opener\.addEventListener\('click',showProducts\);\s*showProducts\(\)/);
});
