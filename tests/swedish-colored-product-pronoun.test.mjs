import test from 'node:test';
import assert from 'node:assert/strict';
import { generateGroundedAnswer } from '../server.mjs';

const product = (id,name,color) => ({
  id,
  category:'Tuotteet',
  title:name,
  answer:'Tuote: '+name+'. Hinta: 199 EUR. Tuoteryhmä: Putters. Värit: '+color+
    '. Linkki: https://example.fi/products/'+id,
  keywords:['JAG','Satin',color,'Putter'],
  source_type:'website',
  source_url:'https://example.fi/products/'+id,
});
const rows=[
  product('black','JAG Satin Black - Putter','Black'),
  product('bronze','JAG Satin Bronze - Putter','Bronze'),
  product('steel','JAG Satin Steel - Putter','Steel'),
  {id:'gift',category:'Tuotteet',title:'Golf Gift Card',
   answer:'Tuote: Golf Gift Card. Hinta: 40 EUR. Tuoteryhmä: Gift Cards. Linkki: https://example.fi/gift',
   keywords:['gift'],source_type:'website',source_url:'https://example.fi/gift'},
];

test('Swedish definite article plus exact color and putter family is not ambiguous',async()=>{
  const first='Vad kostar den svarta puttern?';
  const answer=await generateGroundedAnswer({ companyName:'JAG', rows, message:first, history:[], lang:'sv' });
  assert.equal(answer.handoff,false,JSON.stringify(answer));
  assert.match(answer.answer,/JAG Satin Black/i);
  assert.match(answer.answer,/199/);
  assert.doesNotMatch(answer.answer,/Vilken produkt menar du|Bronze|Gift Card/i);
});

test('Swedish bronze continuation follows the previously verified putter price',async()=>{
  const first='Vad kostar den svarta puttern?';
  const firstReply=await generateGroundedAnswer({companyName:'JAG',rows,message:first,history:[],lang:'sv'});
  assert.match(firstReply.answer,/JAG Satin Black/i);
  const reply=await generateGroundedAnswer({
    companyName:'JAG',rows,message:'Och den bronsfärgade?',
    history:[{question:first,answer:firstReply.answer}],lang:'sv',
  });
  assert.equal(reply.handoff,false,JSON.stringify(reply));
  assert.match(reply.answer,/JAG Satin Bronze/i);
  assert.match(reply.answer,/199/);
  assert.doesNotMatch(reply.answer,/Vilken produkt menar du|JAG Satin Black/i);
});
