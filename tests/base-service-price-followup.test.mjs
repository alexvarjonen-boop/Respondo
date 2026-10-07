import test from 'node:test';
import assert from 'node:assert/strict';
import { generateGroundedAnswer } from '../server.mjs';

const rows=[
  {
    id:'service',
    category:'Palvelut',
    title:'Palvelut: M Cut',
    answer:'M Cut on ylläpitävä hiustenleikkaus.',
    keywords:['hiustenleikkaus','haircut','hårklippning'],
    source_type:'website',
    source_url:'https://example.fi/',
  },
  {
    id:'base-price',
    category:'Hinnat',
    title:'Hinnat: M Cut™: 36 €',
    answer:'M Cut™: 36 €',
    keywords:['hinta','price','pris'],
    source_type:'website',
    source_url:'https://example.fi/',
  },
  {
    id:'premium-price',
    category:'Hinnat',
    title:'Hinnat: M Cut -hiustenleikkaus pidennetyllä päähieronnalla ja hiusten veitsirajauksella: 46 €',
    answer:'M Cut -hiustenleikkaus pidennetyllä päähieronnalla ja hiusten veitsirajauksella: 46 €',
    keywords:['hinta','price','pris'],
    source_type:'website',
    source_url:'https://example.fi/',
  },
];

for(const [lang,question,followup] of [
  ['fi','Leikkaatteko hiuksia?','Paljonko se maksaa?'],
  ['en','Do you cut hair?','How much does that cost?'],
  ['sv','Klipper ni hår?','Vad kostar det?'],
]){
  test('generic haircut price follow-up prefers base price in '+lang,async()=>{
    const result=await generateGroundedAnswer({
      companyName:'Example Barber',
      rows,
      message:followup,
      history:[{question,answer:'Kyllä, hiustenleikkaus onnistuu.'}],
      lang,
    });
    assert.equal(result.handoff,false);
    assert.match(result.answer,/36\s*€/);
    assert.doesNotMatch(result.answer,/46\s*€/);
  });
}


for(const [lang,question,followup] of [
  ['en','Do you cut hair?','And the price?'],
  ['sv','Klipper ni hår?','Och priset?'],
]){
  test('terse price follow-up keeps the prior haircut context in '+lang,async()=>{
    const result=await generateGroundedAnswer({
      companyName:'Example Barber',
      rows,
      message:followup,
      history:[{question,answer:'Yes, haircuts are available.'}],
      lang,
    });
    assert.equal(result.handoff,false,followup+' '+JSON.stringify(result));
    assert.match(result.answer,/36\s*€/,result.answer);
    assert.doesNotMatch(result.answer,/46\s*€/,result.answer);
  });
}
