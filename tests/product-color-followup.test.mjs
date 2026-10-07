import test from 'node:test';
import assert from 'node:assert/strict';
import { generateGroundedAnswer } from '../server.mjs';

const rows=[
  {
    id:'black',category:'Tuotteet',title:'JAG Satin Black - Putter',
    answer:'Tuote: JAG Satin Black - Putter. Hinta: 199 EUR. Linkki: https://example.fi/products/black.',
    keywords:['jag','satin','black','putter'],source_type:'website',source_url:'https://example.fi/products/black'
  },
  {
    id:'bronze',category:'Tuotteet',title:'JAG Satin Bronze - Putter',
    answer:'Tuote: JAG Satin Bronze - Putter. Hinta: 199 EUR. Linkki: https://example.fi/products/bronze.',
    keywords:['jag','satin','bronze','putter'],source_type:'website',source_url:'https://example.fi/products/bronze'
  },
  {
    id:'steel',category:'Tuotteet',title:'JAG Satin Steel - Putter',
    answer:'Tuote: JAG Satin Steel - Putter. Hinta: 199 EUR. Linkki: https://example.fi/products/steel.',
    keywords:['jag','satin','steel','putter'],source_type:'website',source_url:'https://example.fi/products/steel'
  },
];

for(const [lang,message,expected] of [
  ['fi','Paljonko musta putteri maksaa?',/JAG Satin Black.*199/is],
  ['en','How much is the black putter?',/JAG Satin Black.*199/is],
  ['sv','Vad kostar den svarta puttern?',/JAG Satin Black.*199/is],
  ['sv','Vad kostar JAG Satin Black-puttern?',/JAG Satin Black.*199/is],
]){
  test('multilingual color product price resolves the exact variant: '+lang+' '+message,async()=>{
    const result=await generateGroundedAnswer({rows,message,history:[],lang});
    assert.equal(result.handoff,false,JSON.stringify(result));
    assert.match(result.answer,expected);
    assert.doesNotMatch(result.answer,/Bronze|Steel/i);
  });
}

for(const [lang,first,follow,expected] of [
  ['fi','Paljonko musta putteri maksaa?','Entä pronssinen?',/JAG Satin Bronze.*199/is],
  ['en','How much is the black putter?','What about the bronze one?',/JAG Satin Bronze.*199/is],
  ['sv','Vad kostar den svarta puttern?','Och den bronsfärgade?',/JAG Satin Bronze.*199/is],
]){
  test('product color price follow-up keeps family context in '+lang,async()=>{
    const firstResult=await generateGroundedAnswer({rows,message:first,history:[],lang});
    assert.equal(firstResult.handoff,false,JSON.stringify(firstResult));
    const result=await generateGroundedAnswer({
      rows,message:follow,lang,
      history:[{question:first,answer:firstResult.answer}],
    });
    assert.equal(result.handoff,false,JSON.stringify(result));
    assert.match(result.answer,expected);
    assert.doesNotMatch(result.answer,/Black|Steel/i);
  });
}
