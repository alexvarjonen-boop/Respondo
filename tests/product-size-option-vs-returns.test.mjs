import test from 'node:test';
import assert from 'node:assert/strict';
import { generateGroundedAnswer, queryTopic } from '../server.mjs';

const rows=[
  {
    id:'shirt',category:'Tuotteet',title:'T-paita MIDHEAVY 230g',
    answer:'Tuote: T-paita MIDHEAVY 230g. Hinta: 19.92 EUR. Koot: S, M, L, XL, 2XL, 3XL. Linkki: https://example.fi/products/midheavy.',
    keywords:['midheavy','230g','shirt'],source_type:'website',source_url:'https://example.fi/products/midheavy'
  },
  {
    id:'returns',category:'Palautukset ja vaihdot',title:'Palautukset ja vaihdot',
    answer:'Tuotteen voi palauttaa 100 päivän kuluessa.',
    keywords:['palautukset','vaihto','returns'],source_type:'website',source_url:'https://example.fi/pages/returns'
  },
];

for (const [lang,message] of [
  ['fi','Mitä kokovaihtoehtoja MIDHEAVY 230g -paidasta löytyy?'],
  ['fi','Missä koissa MIDHEAVY 230g -paitaa saa?'],
  ['fi','Onko MIDHEAVY 230g -paidasta eri kokovaihtoehtoja?'],
  ['en','Which sizes are available for the MIDHEAVY 230g T-shirt?'],
  ['sv','Vilka storlekar är tillgängliga för MIDHEAVY 230g t-shirten?'],
]){
  test('size options never trigger return policy: '+lang+' '+message,async()=>{
    assert.equal(queryTopic(message),'sizing',message);
    const result=await generateGroundedAnswer({companyName:'Shop',rows,message,lang,history:[]});
    assert.equal(result.handoff,false,JSON.stringify(result));
    assert.match(result.answer,/MIDHEAVY 230g/);
    assert.match(result.answer,/S,\s*M,\s*L,\s*XL,\s*2XL,\s*3XL/i,result.answer);
    assert.doesNotMatch(result.answer,/100 päivän|return|palauttaa|palauttaa|returnera/i);
  });
}
for(const [lang,message] of [
  ['fi','Miten tuotteen vaihto toimii?'],
  ['fi','Mikä on palautusoikeus?'],
  ['en','What is your return policy?'],
]){
  test('true returns still route to returns: '+lang+' '+message,async()=>{
    const result=await generateGroundedAnswer({companyName:'Shop',rows,message,lang,history:[]});
    assert.equal(result.handoff,false,JSON.stringify(result));
    assert.match(result.answer,/100/);
  });
}

test('an unrelated question never treats a letter inside a word as an S size request',async()=>{
  const result=await generateGroundedAnswer({
    companyName:'Shop',rows,
    message:'Mitä muuta osaatte kertoa MIDHEAVY 230g -paidasta?',
    lang:'fi',history:[],
  });
  assert.doesNotMatch(String(result.answer||''),/\b(?:koossa|size)\s+S\b/i,JSON.stringify(result));
});
