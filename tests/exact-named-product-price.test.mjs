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

for(const [lang,message] of [
  ['fi','Paljonko JAG Satin Black putteri maksaa?'],
  ['en','How much is the JAG Satin Black putter?'],
  ['sv','Vad kostar JAG Satin Black-puttern?'],
]){
  test('exact named same-family product price in '+lang,async()=>{
    const result=await generateGroundedAnswer({rows,message,history:[],lang});
    assert.equal(result.handoff,false,JSON.stringify(result));
    assert.match(result.answer,/JAG Satin Black/i);
    assert.match(result.answer,/199/);
    assert.doesNotMatch(result.answer,/Bronze|Steel/i);
    assert.equal(result.selected?.length,1,JSON.stringify(result));
  });
}
