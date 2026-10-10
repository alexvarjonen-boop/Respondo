import test from 'node:test';
import assert from 'node:assert/strict';
import {interpretCustomerQuestion} from '../query-typos.mjs';
import {generateGroundedAnswer, queryTopic, selectRelevantKnowledge} from '../server.mjs';

const prices=[
  {id:'window',category:'Hinnat',title:'Hinnat',answer:'Ikkunanpesu maksaa 49 €.',source_type:'website',source_url:'https://example.fi/prices'},
  {id:'roof',category:'Hinnat',title:'Hinnat',answer:'Katonpesu maksaa 199 €.',source_type:'website',source_url:'https://example.fi/prices'}
];
const products=[
  {id:'black',category:'Tuotteet',title:'JAG Satin Black - Putter',answer:'Tuote: JAG Satin Black - Putter. Tuoteryhmä: Putter. Hinta: 199 EUR. Linkki: https://shop.example/products/satin.',keywords:['jag','putter'],source_type:'website',source_url:'https://shop.example/products/satin'},
  {id:'tour',category:'Tuotteet',title:'JAG Tour Blade Putter',answer:'Tuote: JAG Tour Blade Putter. Tuoteryhmä: Putter. Hinta: 249 EUR. Linkki: https://shop.example/products/tour.',keywords:['jag','putter'],source_type:'website',source_url:'https://shop.example/products/tour'}
];

test('typos in price intent and compound service name preserve the right source',async()=>{
  const interpreted=interpretCustomerQuestion('Paljoko ikkunapesu maaksaa?','fi').text;
  assert.match(interpreted,/paljonko/i);
  assert.match(interpreted,/maksaa/i);
  assert.equal(queryTopic(interpreted),'pricing');
  assert.deepEqual(selectRelevantKnowledge(prices,interpreted).map(row=>row.id),['window']);
  const answer=await generateGroundedAnswer({rows:prices,lang:'fi',message:'Paljoko ikkunapesu maaksaa?'});
  assert.equal(answer.handoff,false,JSON.stringify(answer));
  assert.deepEqual(answer.sourceIds,['window']);
  assert.match(answer.answer,/49/);
});

test('English and Swedish misspellings normalize without altering company facts',()=>{
  assert.equal(interpretCustomerQuestion('What is the delivry time?','en').text,'What is the delivery time?');
  assert.equal(interpretCustomerQuestion('Vad kostarr frakten?','sv').text,'Vad kostar frakten?');
});

test('product price references resolve to one previously named product in three languages',async()=>{
  const history=[{question:'Tell me about JAG Tour Blade Putter',answer:'JAG Tour Blade Putter costs 249 EUR.'}];
  for(const [lang,message] of [['fi','Paljonko se maksaa?'],['sv','Vad kostar den?'],['en','How much does it cost?']]){
    const answer=await generateGroundedAnswer({rows:products,lang,message,history});
    assert.equal(answer.handoff,false,JSON.stringify(answer));
    assert.deepEqual(answer.sourceIds,['tour'],message);
    assert.match(answer.answer,/249/,message);
    assert.doesNotMatch(answer.answer,/199/,message);
  }
});

test('multiple possible product referents ask for clarification, never a made-up price',async()=>{
  const answer=await generateGroundedAnswer({rows:products,lang:'fi',message:'Paljonko se maksaa?',
    history:[{question:'Mitä puttereita myytte?',answer:'JAG Satin Black - Putter ja JAG Tour Blade Putter ovat saatavilla.'}]});
  assert.equal(answer.handoff,false,JSON.stringify(answer));
  assert.equal(answer.answer,'Mitä tuotetta tarkoitat?');
  assert.deepEqual(answer.sourceIds,[]);
});

test('product price without a referent asks for clarification instead of picking the cheapest',async()=>{
  const answer=await generateGroundedAnswer({rows:products,lang:'en',message:'How much does it cost?'});
  assert.equal(answer.handoff,false,JSON.stringify(answer));
  assert.equal(answer.answer,'Which product do you mean?');
  assert.deepEqual(answer.sourceIds,[]);
});

test('shipping policies override product references even with a pronoun',async()=>{
  const shipping={id:'shipping',category:'Toimitus ja seuranta',title:'Toimitusaika',answer:'Toimitusaika on 3–5 arkipäivää.',source_type:'website',source_url:'https://shop.example/shipping'};
  const answer=await generateGroundedAnswer({rows:[...products,shipping],lang:'fi',
    message:'Kuinka kauan sen toimitus kestää?',
    history:[{question:'Mitä JAG Tour Blade Putter maksaa?',answer:'JAG Tour Blade Putter maksaa 249 €.'}]});
  assert.equal(answer.handoff,false,JSON.stringify(answer));
  assert.deepEqual(answer.sourceIds,['shipping']);
  assert.match(answer.answer,/3–5/);
});
