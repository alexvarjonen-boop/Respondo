import test from 'node:test';
import assert from 'node:assert/strict';
import { generateGroundedAnswer } from '../server.mjs';

const rows=[{
  id:'price-only-haircut',
  category:'Hinnat',
  title:'Hinnat',
  answer:'M Cut - hiustenleikkaus: 36 €',
  keywords:['hinta','hiustenleikkaus','M Cut'],
  source_type:'website',
  source_url:'https://barber.example/',
}];

for(const [lang,message,expected] of [
  ['fi','Leikkaatteko hiuksia?',/Kyllä|hiustenleikk/i],
  ['en','Do you cut hair?',/Yes|haircut/i],
  ['sv','Klipper ni hår?',/Ja|hårklipp/i],
]){
  test('published price list proves haircut service in '+lang,async()=>{
    const result=await generateGroundedAnswer({rows,message,history:[],lang});
    assert.equal(result.handoff,false,message+' '+JSON.stringify(result));
    assert.match(result.answer,expected);
  });
}

for(const [lang,question,follow] of [
  ['fi','Leikkaatteko hiuksia?','Paljonko se maksaa?'],
  ['en','Do you cut hair?','How much does that cost?'],
  ['sv','Klipper ni hår?','Vad kostar det?'],
]){
  test('price-only haircut evidence supports contextual price follow-up in '+lang,async()=>{
    const first=await generateGroundedAnswer({rows,message:question,history:[],lang});
    assert.equal(first.handoff,false,JSON.stringify(first));
    const result=await generateGroundedAnswer({
      rows,
      message:follow,
      history:[{question,answer:first.answer}],
      lang,
    });
    assert.equal(result.handoff,false,JSON.stringify(result));
    assert.match(result.answer,/36\s*€/);
  });
}
