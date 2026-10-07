import test from 'node:test';
import assert from 'node:assert/strict';
import { generateGroundedAnswer } from '../server.mjs';

const rows=[
  {
    id:'black',
    category:'Tuotteet',
    title:'JAG Satin Black - Putter',
    answer:'Tuote: JAG Satin Black - Putter. Hinta: 199 EUR. Tuoteryhmä: Putters. Värit: Black. Linkki: https://jagputters.fi/products/jag-satin-black-putter',
    keywords:['JAG','Satin','Black','Putter'],
    source_type:'website',
    source_url:'https://jagputters.fi/products/jag-satin-black-putter',
  },
  {
    id:'bronze',
    category:'Tuotteet',
    title:'JAG Satin Bronze - Putter',
    answer:'Tuote: JAG Satin Bronze - Putter. Hinta: 199 EUR. Tuoteryhmä: Putters. Värit: Bronze. Linkki: https://jagputters.fi/products/jag-satin-bronze-putter',
    keywords:['JAG','Satin','Bronze','Putter'],
    source_type:'website',
    source_url:'https://jagputters.fi/products/jag-satin-bronze-putter',
  },
  {
    id:'steel',
    category:'Tuotteet',
    title:'JAG Satin Steel - Putter',
    answer:'Tuote: JAG Satin Steel - Putter. Hinta: 199 EUR. Tuoteryhmä: Putters. Värit: Steel. Linkki: https://jagputters.fi/products/jag-satin-steel-putter',
    keywords:['JAG','Satin','Steel','Putter'],
    source_type:'website',
    source_url:'https://jagputters.fi/products/jag-satin-steel-putter',
  },
];

test('Finnish color word resolves the exact named product price',async()=>{
  const result=await generateGroundedAnswer({rows,message:'Paljonko musta putteri maksaa?',history:[],lang:'fi'});
  assert.equal(result.handoff,false);
  assert.match(result.answer,/JAG Satin Black/i);
  assert.doesNotMatch(result.answer,/Bronze|Steel/i);
  assert.match(result.answer,/199/);
});

test('Swedish hyphenated named putter resolves one exact variant',async()=>{
  const result=await generateGroundedAnswer({rows,message:'Vad kostar JAG Satin Black-puttern?',history:[],lang:'sv'});
  assert.equal(result.handoff,false);
  assert.match(result.answer,/JAG Satin Black/i);
  assert.doesNotMatch(result.answer,/Bronze|Steel/i);
  assert.match(result.answer,/199/);
});

for(const [lang,first,follow,expected] of [
  ['fi','Paljonko musta putteri maksaa?','Entä pronssinen?',/JAG Satin Bronze/i],
  ['en','How much is the black putter?','What about the bronze one?',/JAG Satin Bronze/i],
  ['sv','Vad kostar den svarta puttern?','Och den bronsfärgade?',/JAG Satin Bronze/i],
]){
  test('color follow-up keeps product family and price intent in '+lang,async()=>{
    const firstResult=await generateGroundedAnswer({rows,message:first,history:[],lang});
    assert.equal(firstResult.handoff,false);
    const result=await generateGroundedAnswer({
      rows,
      message:follow,
      history:[{question:first,answer:firstResult.answer}],
      lang,
    });
    assert.equal(result.handoff,false);
    assert.match(result.answer,expected);
    assert.doesNotMatch(result.answer,/Black|Steel/i);
    assert.match(result.answer,/199/);
  });
}
