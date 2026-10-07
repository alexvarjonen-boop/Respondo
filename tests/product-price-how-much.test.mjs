import test from 'node:test';
import assert from 'node:assert/strict';
import { generateGroundedAnswer } from '../server.mjs';

const rows=[{
  id:'black',
  category:'Tuotteet',
  title:'JAG Satin Black - Putter',
  answer:'Tuote: JAG Satin Black - Putter. Hinta: 199.00 EUR. Brändi: JAG Putters. Saatavuus: varastossa. Linkki: https://jagputters.fi/products/jag-black-custom-blade-putter.',
  keywords:['jag','satin','black','putter','putters','tuote','product'],
  source_type:'website',
  source_url:'https://jagputters.fi/products/jag-black-custom-blade-putter',
}];

for(const [lang,message,expected] of [
  ['fi','Paljonko JAG Satin Black maksaa?',/JAG Satin Black[^\n]*199/i],
  ['en','How much is the JAG Satin Black putter?',/JAG Satin Black[^\n]*199/i],
  ['sv','Vad kostar JAG Satin Black-puttern?',/JAG Satin Black[^\n]*199/i],
]){
  test('named ecommerce product price works without translation in '+lang,async()=>{
    const result=await generateGroundedAnswer({
      companyName:'JAG Putters',
      rows,
      message,
      history:[],
      lang,
    });
    assert.equal(result.handoff,false);
    assert.equal(result.intent,'Tuotteet');
    assert.match(result.answer,expected);
  });
}
