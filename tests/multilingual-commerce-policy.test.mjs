import test from 'node:test';
import assert from 'node:assert/strict';
import { generateGroundedAnswer } from '../server.mjs';

const rows=[
  {
    id:'black',
    category:'Tuotteet',
    title:'JAG Satin Black - Putter',
    answer:'Tuote: JAG Satin Black - Putter. Hinta: 199.00 EUR. Saatavuus: varastossa. Linkki: https://example.fi/products/black.',
    keywords:['jag','satin','black','putter','tuote','product'],
    source_type:'website',source_url:'https://example.fi/products/black',
  },
  {
    id:'bronze',
    category:'Tuotteet',
    title:'JAG Satin Bronze - Putter',
    answer:'Tuote: JAG Satin Bronze - Putter. Hinta: 199.00 EUR. Saatavuus: varastossa. Linkki: https://example.fi/products/bronze.',
    keywords:['jag','satin','bronze','putter','tuote','product'],
    source_type:'website',source_url:'https://example.fi/products/bronze',
  },
  {
    id:'shirt',
    category:'Tuotteet',
    title:'MIDHEAVY 230g T-shirt',
    answer:'Tuote: MIDHEAVY 230g T-shirt. Hinta: 24.90 EUR. Värit: Black, Ivory, Transparent. Koot: S, M, L, XL, 2XL, 3XL. Linkki: https://example.fi/products/shirt.',
    keywords:['midheavy','shirt','black','ivory','transparent','size','color'],
    source_type:'website',source_url:'https://example.fi/products/shirt',
  },
  {
    id:'shipping-free',
    category:'Toimitus ja seuranta',
    title:'Toimitus',
    answer:'Free shipping available on orders over 280€',
    keywords:['shipping','delivery','toimitus'],
    source_type:'website',source_url:'https://example.fi/shipping',
  },
  {
    id:'delivery-time',
    category:'Toimitus ja seuranta',
    title:'Toimitusaika',
    answer:'Domestic orders usually arrive within a 3-5 business days, and international deliveries typically take about 7-14 business days.',
    keywords:['shipping','delivery','toimitusaika'],
    source_type:'website',source_url:'https://example.fi/shipping',
  },
  {
    id:'returns',
    category:'Palautukset ja vaihdot',
    title:'Palautukset ja vaihdot',
    answer:'Return within 45 days of purchase. Duties & taxes are non-refundable.',
    keywords:['return','refund','palautus'],
    source_type:'website',source_url:'https://example.fi/returns',
  },
];

for(const [lang,message,expected] of [
  ['fi','Paljonko toimitus maksaa?',/ilmainen.*280\s*€/i],
  ['en','How much does shipping cost?',/free.*280\s*€/i],
  ['sv','Vad kostar frakten?',/gratis.*280\s*€/i],
]){
  test('free-shipping threshold is localized without translator in '+lang,async()=>{
    const result=await generateGroundedAnswer({rows,message,history:[],lang});
    assert.equal(result.handoff,false,JSON.stringify(result));
    assert.match(result.answer,expected);
  });
}

for(const [lang,message,expected] of [
  ['fi','Kuinka kauan toimituksessa kestää?',/3[–-]5 arkipäivää.*7[–-]14 arkipäivää/i],
  ['en','How long does delivery take?',/3[–-]5 business days.*7[–-]14 business days/i],
  ['sv','Hur lång är leveranstiden?',/3[–-]5 arbetsdagar.*7[–-]14 arbetsdagar/i],
]){
  test('delivery duration is localized without translator in '+lang,async()=>{
    const result=await generateGroundedAnswer({rows,message,history:[],lang});
    assert.equal(result.handoff,false,JSON.stringify(result));
    assert.match(result.answer,expected);
  });
}

for(const [lang,message,expected] of [
  ['fi','Voinko palauttaa tuotteen?',/45 päivän/i],
  ['en','Can I return an item?',/45 days/i],
  ['sv','Kan jag returnera en produkt?',/45 dagar/i],
]){
  test('return window is localized without translator in '+lang,async()=>{
    const result=await generateGroundedAnswer({rows,message,history:[],lang});
    assert.equal(result.handoff,false,JSON.stringify(result));
    assert.match(result.answer,expected);
  });
}

for(const [lang,message] of [
  ['fi','Paljonko JAG Satin Black maksaa?'],
  ['en','How much is the JAG Satin Black putter?'],
  ['sv','Vad kostar JAG Satin Black-puttern?'],
]){
  test('specific named product price does not list sibling products in '+lang,async()=>{
    const result=await generateGroundedAnswer({rows,message,history:[],lang});
    assert.equal(result.handoff,false,JSON.stringify(result));
    assert.match(result.answer,/199/);
    assert.match(result.answer,/JAG Satin Black/i);
    assert.doesNotMatch(result.answer,/Bronze/i);
  });
}

for(const [lang,message,expected] of [
  ['fi','Mitä värejä MIDHEAVY paidasta löytyy?',/Black.*Ivory.*Transparent/i],
  ['en','What colors are available for the MIDHEAVY shirt?',/Black.*Ivory.*Transparent/i],
  ['sv','Vilka färger finns MIDHEAVY-tröjan i?',/Black.*Ivory.*Transparent/i],
  ['fi','Mitä kokoja MIDHEAVY paidasta on?',/S.*M.*L.*XL.*2XL.*3XL/i],
  ['en','What sizes does the MIDHEAVY shirt come in?',/S.*M.*L.*XL.*2XL.*3XL/i],
  ['sv','Vilka storlekar finns MIDHEAVY-tröjan i?',/S.*M.*L.*XL.*2XL.*3XL/i],
]){
  test('product variants answer structurally in '+lang+': '+message,async()=>{
    const result=await generateGroundedAnswer({rows,message,history:[],lang});
    assert.equal(result.handoff,false,JSON.stringify(result));
    assert.match(result.answer,expected);
  });
}
