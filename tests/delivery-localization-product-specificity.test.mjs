import test from 'node:test';
import assert from 'node:assert/strict';
import { generateGroundedAnswer } from '../server.mjs';

const rows=[
  {
    id:'ship-free',category:'Toimitus ja seuranta',title:'Toimitus',
    answer:'Free shipping available on orders over 280€',
    keywords:['toimitus','shipping','delivery'],source_type:'website',source_url:'https://example.com/shipping'
  },
  {
    id:'ship-time',category:'Toimitus ja seuranta',title:'Toimitus',
    answer:'Fast and effortless delivery, straight to your pickup point! Domestic orders usually arrive within a 3-5 business days, and international deliveries typically take about 7-14 business days.',
    keywords:['toimitus','toimitusaika','shipping','delivery'],source_type:'website',source_url:'https://example.com/shipping'
  },
  {
    id:'black',category:'Tuotteet',title:'JAG Satin Black - Putter',
    answer:'Tuote: JAG Satin Black - Putter. Hinta: 199.00 EUR. Brändi: JAG Putters. Saatavuus: varastossa. Linkki: https://example.com/black.',
    keywords:['jag','satin','black','putter','putters'],source_type:'website',source_url:'https://example.com/black'
  },
  {
    id:'bronze',category:'Tuotteet',title:'JAG Satin Bronze - Putter',
    answer:'Tuote: JAG Satin Bronze - Putter. Hinta: 199.00 EUR. Brändi: JAG Putters. Saatavuus: varastossa. Linkki: https://example.com/bronze.',
    keywords:['jag','satin','bronze','putter','putters'],source_type:'website',source_url:'https://example.com/bronze'
  },
  {
    id:'steel',category:'Tuotteet',title:'JAG Satin Steel - Putter',
    answer:'Tuote: JAG Satin Steel - Putter. Hinta: 199.00 EUR. Brändi: JAG Putters. Saatavuus: varastossa. Linkki: https://example.com/steel.',
    keywords:['jag','satin','steel','putter','putters'],source_type:'website',source_url:'https://example.com/steel'
  },
];

test('delivery-time answer is structurally localized in FI SV EN without translator',async()=>{
  const cases=[
    ['fi','Kuinka kauan toimituksessa kestää?',/Kotimaan toimitus.*3–5 arkipäivää.*Kansainvälinen.*7–14 arkipäivää/i],
    ['sv','Hur lång är leveranstiden?',/Inrikes leverans.*3–5 arbetsdagar.*Internationell.*7–14 arbetsdagar/i],
    ['en','How long does delivery take?',/Domestic delivery.*3–5 business days.*International.*7–14 business days/i],
  ];
  for(const [lang,message,expected] of cases){
    const result=await generateGroundedAnswer({companyName:'Shop',rows,message,history:[],lang});
    assert.equal(result.handoff,false,message+' '+JSON.stringify(result));
    assert.match(result.answer,expected,message+' -> '+result.answer);
  }
});

test('free-shipping threshold is localized in FI SV EN without translator',async()=>{
  const cases=[
    ['fi','Paljonko toimitus maksaa?',/ilmainen.*280/i],
    ['sv','Vad kostar frakten?',/gratis.*280/i],
    ['en','How much does shipping cost?',/free.*280/i],
  ];
  for(const [lang,message,expected] of cases){
    const result=await generateGroundedAnswer({companyName:'Shop',rows,message,history:[],lang});
    assert.equal(result.handoff,false,message+' '+JSON.stringify(result));
    assert.match(result.answer,expected,message+' -> '+result.answer);
  }
});

test('named same-family product price returns only the named variant',async()=>{
  for(const [lang,message] of [
    ['en','How much is the JAG Satin Black putter?'],
    ['sv','Vad kostar JAG Satin Black-puttern?'],
  ]){
    const result=await generateGroundedAnswer({companyName:'JAG Putters',rows,message,history:[],lang});
    assert.equal(result.handoff,false,JSON.stringify(result));
    assert.match(result.answer,/JAG Satin Black/i);
    assert.match(result.answer,/199/);
    assert.doesNotMatch(result.answer,/Bronze|Steel/i);
  }
});
