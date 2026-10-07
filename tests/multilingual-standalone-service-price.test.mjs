import test from 'node:test';
import assert from 'node:assert/strict';
import { generateGroundedAnswer } from '../server.mjs';

const rows=[
  {
    id:'service',
    category:'Palvelut',
    title:'Palvelut: Hiustenleikkaus',
    answer:'Hiustenleikkaus kaikenikäisille miehille.',
    keywords:['hiustenleikkaus','haircut','hårklippning'],
    source_type:'website',
    source_url:'https://example.fi/',
  },
  {
    id:'base-price',
    category:'Hinnat',
    title:'Hinnat: Hiustenleikkaus 31€',
    answer:'Hiustenleikkaus 31€',
    keywords:['hinta','price','pris'],
    source_type:'website',
    source_url:'https://example.fi/',
  },
  {
    id:'bundle-price',
    category:'Hinnat',
    title:'Hinnat: Hiustenleikkaus ja parranajo 46€',
    answer:'Hiustenleikkaus ja parranajo 46€',
    keywords:['hinta','price','pris'],
    source_type:'website',
    source_url:'https://example.fi/',
  },
];

for(const [lang,message,expected] of [
  ['fi','Paljonko hiustenleikkaus maksaa?',/Hiustenleikkaus maksaa 31\s*€\./i],
  ['en','How much is a haircut?',/A haircut costs 31\s*€\./i],
  ['sv','Vad kostar en hårklippning?',/En hårklippning kostar 31\s*€\./i],
]){
  test('standalone haircut price works without translation in '+lang,async()=>{
    const result=await generateGroundedAnswer({
      companyName:'Example Barber',
      rows,
      message,
      history:[],
      lang,
    });
    assert.equal(result.handoff,false,JSON.stringify(result));
    assert.equal(result.intent,'Hinta');
    assert.match(result.answer,expected);
    assert.doesNotMatch(result.answer,/46\s*€/);
  });
}
