import test from 'node:test';
import assert from 'node:assert/strict';
import { generateGroundedAnswer } from '../server.mjs';

const rows=[
  {
    id:'service',
    category:'Palvelut',
    title:'Palvelut: Hiustenleikkaus',
    answer:'Tarjoamme hiustenleikkauksia.',
    keywords:['hiustenleikkaus','haircut','hårklippning'],
    source_type:'website',
    source_url:'https://example.fi/',
  },
  {
    id:'price',
    category:'Hinnat',
    title:'Hinnat: 🔶Hiustenleikkaus 31€',
    answer:'🔶Hiustenleikkaus 31€',
    keywords:['hinta','price','pris'],
    source_type:'website',
    source_url:'https://example.fi/',
  },
];

for(const [lang,message,expected] of [
  ['fi','Paljonko hiustenleikkaus maksaa?',/Hiustenleikkaus maksaa 31€\./i],
  ['en','How much is a haircut?',/A haircut costs 31€\./i],
  ['sv','Vad kostar en hårklippning?',/En hårklippning kostar 31€\./i],
]){
  test('direct haircut price is answered structurally in '+lang,async()=>{
    const result=await generateGroundedAnswer({
      companyName:'Example Barber',
      rows,
      message,
      history:[],
      lang,
    });
    assert.equal(result.handoff,false);
    assert.equal(result.intent,'Hinta');
    assert.match(result.answer,expected);
  });
}
