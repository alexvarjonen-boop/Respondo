import test from 'node:test';
import assert from 'node:assert/strict';
import {generateGroundedAnswer, queryTopic, selectRelevantKnowledge} from '../server.mjs';

const priceRows=[
  {id:'window-price',category:'Hinnat',title:'Hinnat',answer:'Ikkunanpesu maksaa 49 €.',keywords:['ikkunanpesu'],source_type:'website',source_url:'https://example.fi/hinnasto'},
  {id:'roof-price',category:'Hinnat',title:'Hinnat',answer:'Katonpesu maksaa 199 €.',keywords:['katonpesu'],source_type:'website',source_url:'https://example.fi/hinnasto'}
];
const products=[
  {id:'satin',category:'Tuotteet',title:'JAG Satin Black - Putter',answer:'Tuote: JAG Satin Black - Putter. Tuoteryhmä: Putter. Hinta: 199 EUR. Linkki: https://shop.example/products/satin.',keywords:['jag','putter'],source_type:'website',source_url:'https://shop.example/products/satin'},
  {id:'tour',category:'Tuotteet',title:'JAG Tour Blade Putter',answer:'Tuote: JAG Tour Blade Putter. Tuoteryhmä: Putter. Hinta: 249 EUR. Linkki: https://shop.example/products/tour.',keywords:['jag','putter'],source_type:'website',source_url:'https://shop.example/products/tour'}
];

test('common Finnish typing errors still retrieve the correct verified service price',async()=>{
  assert.equal(queryTopic('Paljoko ikkunapesu maaksaa?'),'pricing');
  const selected=selectRelevantKnowledge(priceRows,'Paljoko ikkunapesu maaksaa?');
  assert.equal(selected.length,1,JSON.stringify(selected));
  assert.equal(selected[0].id,'window-price');
  const reply=await generateGroundedAnswer({rows:priceRows,message:'Paljoko ikkunapesu maaksaa?',lang:'fi'});
  assert.equal(reply.handoff,false,JSON.stringify(reply));
  assert.match(reply.answer,/49/);
  assert.deepEqual(reply.sourceIds,['window-price']);
});

test('misspelled delivery keywords work in English and Swedish',async()=>{
  assert.equal(queryTopic('What is the delivry time?'),'delivery');
  assert.equal(queryTopic('Vad kostarr frakten?'),'delivery');
  const rows=[{id:'shipping',title:'Toimitusaika',category:'Toimitus ja seuranta',
    answer:'Delivery takes 3–5 business days.',source_type:'website',source_url:'https://example.fi/shipping'}];
  const result=await generateGroundedAnswer({rows,lang:'en',message:'What is the delivry time?'});
  assert.equal(result.handoff,false,JSON.stringify(result));
  assert.deepEqual(result.sourceIds,['shipping']);
  assert.match(result.answer,/3–5/);
});

test('pronoun pricing follow-ups resolve to the one previously discussed product',async()=>{
  const history=[{question:'Tell me about JAG Tour Blade Putter',answer:'JAG Tour Blade Putter costs 249 EUR.'}];
  const en=await generateGroundedAnswer({rows:products,message:'How much does it cost?',history,lang:'en'});
  assert.equal(en.handoff,false,JSON.stringify(en));
  assert.deepEqual(en.sourceIds,['tour']);
  assert.match(en.answer,/249/);
  assert.doesNotMatch(en.answer,/199/);

  const fi=await generateGroundedAnswer({rows:products,message:'Paljonko se maksaa?',history,lang:'fi'});
  assert.equal(fi.handoff,false,JSON.stringify(fi));
  assert.deepEqual(fi.sourceIds,['tour']);
  assert.match(fi.answer,/249/);

  const sv=await generateGroundedAnswer({rows:products,message:'Vad kostar den?',history,lang:'sv'});
  assert.equal(sv.handoff,false,JSON.stringify(sv));
  assert.deepEqual(sv.sourceIds,['tour']);
  assert.match(sv.answer,/249/);
});

test('ambiguous product pronoun does not invent a specific price',async()=>{
  const history=[{question:'Mitä puttereita myytte?',answer:'Valikoimassa JAG Satin Black - Putter ja JAG Tour Blade Putter.'}];
  const result=await generateGroundedAnswer({rows:products,message:'Paljonko se maksaa?',history,lang:'fi'});
  assert.equal(result.handoff,false);
  assert.match(result.answer,/Mitä tuotetta tarkoitat/);
  assert.deepEqual(result.sourceIds,[]);
  assert.deepEqual(result.selected,[]);
});

test('product-only site does not guess a referent when there is no history',async()=>{
  const result=await generateGroundedAnswer({rows:products,message:'How much does it cost?',lang:'en'});
  assert.equal(result.handoff,false);
  assert.equal(result.answer,'Which product do you mean?');
  assert.deepEqual(result.sourceIds,[]);
});

test('a delivery policy follow-up must not inherit the product price',async()=>{
  const rows=[...products,{id:'shipping',category:'Toimitus ja seuranta',title:'Toimitusaika',answer:'Toimitus kestää 3–5 arkipäivää.',source_type:'website',source_url:'https://shop.example/shipping'}];
  const result=await generateGroundedAnswer({rows,message:'Kuinka kauan sen toimitus kestää?',lang:'fi',
    history:[{question:'Paljonko JAG Tour Blade Putter maksaa?',answer:'JAG Tour Blade Putter maksaa 249 euroa.'}]});
  assert.equal(result.handoff,false,JSON.stringify(result));
  assert.deepEqual(result.sourceIds,['shipping']);
  assert.match(result.answer,/3–5/);
});
