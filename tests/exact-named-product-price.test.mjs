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


test('inflected Finnish product price wording still returns the exact price',async()=>{
  const result=await generateGroundedAnswer({
    rows,
    message:'Paljonko hintaa on tuotteella JAG Satin Black?',
    history:[],
    lang:'fi',
  });
  assert.equal(result.handoff,false,JSON.stringify(result));
  assert.match(result.answer,/JAG Satin Black/i);
  assert.match(result.answer,/199/);
  assert.doesNotMatch(result.answer,/Bronze|Steel|koossa/i);
});


test('Swedish product-price phrase with auxiliary har is not mistaken for hair service pricing',async()=>{
  const mixedRows=[
    {
      id:'shirt',category:'Tuotteet',title:'T-paita MIDHEAVY 230g',
      answer:'Tuote: T-paita MIDHEAVY 230g. Hinta: 19.92 EUR. Linkki: https://example.fi/products/midheavy.',
      keywords:['t-paita','midheavy','230g','product'],source_type:'website',source_url:'https://example.fi/products/midheavy'
    },
    {
      id:'hair-kit',category:'Hinnat',title:'Hair Kit',
      answer:'Hair Kit: 46,99 €',
      keywords:['hair','price'],source_type:'website',source_url:'https://example.fi/hair'
    },
  ];
  const result=await generateGroundedAnswer({
    rows:mixedRows,
    message:'Vilket pris har T-paita MIDHEAVY 230g?',
    history:[],
    lang:'sv',
  });
  assert.equal(result.handoff,false,JSON.stringify(result));
  assert.match(result.answer,/MIDHEAVY 230g/i,result.answer);
  assert.match(result.answer,/19[.,]92/,result.answer);
  assert.doesNotMatch(result.answer,/46[.,]99/,result.answer);
});
