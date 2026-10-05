import test from 'node:test';
import assert from 'node:assert/strict';
import {generateGroundedAnswer,chatActions} from '../server.mjs';

const rows=[
  {id:'grip',category:'Tuotteet',title:'SuperStroke Pistol 1',answer:'Tuote: SuperStroke Pistol 1. Tuoteryhmä: Golf grips. Hinta: 21 USD. Linkki: https://shop.example/products/grip.',keywords:['superstroke','grip','golf','product'],source_type:'website',source_url:'https://shop.example/products/grip'},
  {id:'cover',category:'Tuotteet',title:'JAG Headcover',answer:'Tuote: JAG Headcover. Brändi: JAG Putters. Hinta: 29 EUR. Linkki: https://shop.example/products/headcover.',keywords:['jag','headcover','golf','product'],source_type:'website',source_url:'https://shop.example/products/headcover'},
  {id:'towel',category:'Tuotteet',title:'Microfiber Players Towel',answer:'Tuote: Microfiber Players Towel. Hinta: 19 EUR. Linkki: https://shop.example/products/towel.',keywords:['towel','golf','product'],source_type:'website',source_url:'https://shop.example/products/towel'},
  {id:'stamp',category:'Tuotteet',title:'Custom Stamping',answer:'Tuote: Custom Stamping. Brändi: JAG. Hinta: 35 EUR. Linkki: https://shop.example/products/custom-stamping.',keywords:['custom','stamping','product'],source_type:'website',source_url:'https://shop.example/products/custom-stamping'},
  {id:'putter',category:'Tuotteet',title:'JAG Satin Black - Putter',answer:'Tuote: JAG Satin Black - Putter. Tuoteryhmä: Putter. Hinta: 199 EUR. Linkki: https://shop.example/products/satin-black.',keywords:['jag','putter','golf','product'],source_type:'website',source_url:'https://shop.example/products/satin-black'},
];

test('broad what-do-you-sell question answers with natural product categories and one catalog link', async()=>{
  const result=await generateGroundedAnswer({rows,message:'What do you sell?',lang:'en'});
  assert.equal(result.handoff,false,JSON.stringify(result));
  assert.match(result.answer,/^We sell golf equipment, including:/);
  assert.match(result.answer,/• (?:Putters|Headcovers|Towels|Grips)/);
  assert.match(result.answer,/Among other products\.$/);
  assert.doesNotMatch(result.answer,/Tuote:|Tuoteryhmä:|Brändi:|Our selection includes/i);
  assert.equal(result.selected.length,0);

  const actions=chatActions(rows,'What do you sell?',false,'en',result.selected);
  assert.equal(actions.filter((action)=>action.type==='product').length,0);
  const catalog=actions.find((action)=>action.type==='catalog');
  assert.ok(catalog,JSON.stringify(actions));
  assert.equal(catalog.label,'View all products');
  assert.equal(catalog.url,'https://shop.example/collections/all');
});
