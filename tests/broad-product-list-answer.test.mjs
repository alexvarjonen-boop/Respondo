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


test('broad catalog-only fallback never dumps raw URLs or the demo website address', async()=>{
  const catalogRows=[
    {id:'catalog',category:'Verkkokauppa',title:'Tuotekatalogi',answer:'https://jagputters.fi/collections/all',keywords:['tuotteet','catalog','shop'],source_type:'website',source_url:'https://jagputters.fi/'},
    {id:'website',category:'Yrityksen perustiedot',title:'Verkkosivu',answer:'https://respondo-web-production.up.railway.app',keywords:['verkkosivu'],source_type:'profile',source_url:null},
  ];
  const result=await generateGroundedAnswer({rows:catalogRows,message:'Mitä myytte',lang:'fi'});
  assert.equal(result.handoff,false,JSON.stringify(result));
  assert.equal(result.answer,'Myymme erilaisia tuotteita. Katso kaikki tuotteet alla olevasta painikkeesta.');
  assert.doesNotMatch(result.answer,/https?:\/\//i);
  assert.doesNotMatch(result.answer,/Respondo|railway/i);

  const actions=chatActions(catalogRows,'Mitä myytte',false,'fi',result.selected);
  const catalog=actions.find((action)=>action.type==='catalog');
  assert.ok(catalog,JSON.stringify(actions));
  assert.equal(catalog.label,'Katso kaikki tuotteet');
  assert.equal(catalog.url,'https://jagputters.fi/collections/all');
});


test('generic what-do-you-do question uses product catalog for a product-only store', async()=>{
  for (const [message,lang,pattern] of [
    ['Mitä teette?','fi',/^Myymme golfvarusteita, esimerkiksi:/],
    ['What do you do?','en',/^We sell golf equipment, including:/],
    ['Vad gör ni?','sv',/^Vi säljer golfutrustning, bland annat:/],
  ]) {
    const result=await generateGroundedAnswer({rows,message,lang,companyName:'JAG Putters'});
    assert.equal(result.handoff,false,message+' '+JSON.stringify(result));
    assert.match(result.answer,pattern,message);
    assert.match(result.answer,/Putter|Headcover|Mailansuoja|Golf/i,message);
    assert.equal(result.intent,'Tuotteet',message);
  }
});


test('putter price question excludes accessories and gift cards', async()=>{
  const categoryRows=[
    ...rows,
    {id:'gift50',category:'Tuotteet',title:'JAG Putters Gift Card - €50',answer:'Tuote: JAG Putters Gift Card - €50. Tuoteryhmä: Gift card. Brändi: JAG Putters. Hinta: 50 EUR. Linkki: https://shop.example/products/gift-50.',keywords:['jag','putters','gift','card'],source_type:'website',source_url:'https://shop.example/products/gift-50'},
    {id:'gift100',category:'Tuotteet',title:'JAG Putters Gift Card - €100',answer:'Tuote: JAG Putters Gift Card - €100. Tuoteryhmä: Gift card. Brändi: JAG Putters. Hinta: 100 EUR. Linkki: https://shop.example/products/gift-100.',keywords:['jag','putters','gift','card'],source_type:'website',source_url:'https://shop.example/products/gift-100'},
    {id:'putter2',category:'Tuotteet',title:'JAG Tour Blade Putter',answer:'Tuote: JAG Tour Blade Putter. Tuoteryhmä: Putter. Brändi: JAG Putters. Hinta: 249 EUR. Linkki: https://shop.example/products/tour-blade.',keywords:['jag','putter','golf'],source_type:'website',source_url:'https://shop.example/products/tour-blade'},
  ];
  const result=await generateGroundedAnswer({rows:categoryRows,message:'Mitä putterit maksaa',lang:'fi'});
  assert.equal(result.handoff,false,JSON.stringify(result));
  assert.match(result.answer,/JAG Satin Black - Putter – 199/);
  assert.match(result.answer,/JAG Tour Blade Putter – 249/);
  assert.doesNotMatch(result.answer,/Gift Card|Headcover|SuperStroke|Towel/i);
  assert.ok(result.selected.length>=2,JSON.stringify(result));
  assert.ok(result.selected.every((row)=>/putter/i.test(row.title)),JSON.stringify(result.selected));

  const actions=chatActions(categoryRows,'Mitä putterit maksaa',false,'fi',result.selected);
  assert.ok(actions.length>=2,JSON.stringify(actions));
  assert.ok(actions.every((action)=>/putter|satin-black|tour-blade/i.test(action.label+' '+action.url)),JSON.stringify(actions));
});


test('broad product-range paraphrases resolve naturally in FI EN SV',async()=>{
  for(const [lang,message] of [
    ['fi','Mitä tuotteita teiltä löytyy?'],
    ['fi','Millainen tuotevalikoima teillä on?'],
    ['en','What products do you sell?'],
    ['en','What is in your product range?'],
    ['sv','Vilka produkter säljer ni?'],
    ['sv','Vad finns i ert sortiment?'],
  ]){
    const result=await generateGroundedAnswer({rows,message,lang,companyName:'JAG Putters'});
    assert.equal(result.handoff,false,message+' '+JSON.stringify(result));
    assert.equal(result.intent,'Tuotteet',message);
    assert.match(result.answer,/golf|Putter|Headcover|Grip|Towel|Mailansuoja|golfutrustning/i,message+' '+result.answer);
  }
});
