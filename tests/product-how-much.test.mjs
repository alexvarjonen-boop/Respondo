import test from 'node:test';
import assert from 'node:assert/strict';
import { generateGroundedAnswer } from '../server.mjs';

const rows=[{
  id:'p1',
  category:'Tuotteet',
  title:'JAG Satin Black - Putter',
  answer:'Tuote: JAG Satin Black - Putter. Hinta: 199.00 EUR. Brändi: JAG Putters. Saatavuus: varastossa. Linkki: https://example.com/jag-black.',
  keywords:['jag','satin','black','putter','putters','tuote','product'],
  source_type:'website',
  source_url:'https://example.com/jag-black',
}];

test('English how-much wording returns a named ecommerce product price',async()=>{
  const result=await generateGroundedAnswer({
    companyName:'JAG Putters',
    rows,
    message:'How much is the JAG Satin Black putter?',
    history:[],
    lang:'en',
  });
  assert.equal(result.handoff,false,JSON.stringify(result));
  assert.match(result.answer,/JAG Satin Black/i);
  assert.match(result.answer,/199/);
});

test('English how-much product pricing does not need translation service',async()=>{
  const result=await generateGroundedAnswer({
    companyName:'JAG Putters',
    rows,
    message:'How much is JAG Satin Black?',
    history:[],
    lang:'en',
  });
  assert.equal(result.handoff,false,JSON.stringify(result));
  assert.match(result.answer,/199/);
});
