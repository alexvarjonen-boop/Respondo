import test from 'node:test';
import assert from 'node:assert/strict';
import { generateGroundedAnswer } from '../server.mjs';

const rows=[
  {
    id:'phone',
    category:'Yhteystiedot',
    title:'Puhelinnumero',
    answer:'+358 50 5774490',
    keywords:['puhelin','phone','telefon'],
    source_type:'website',
    source_url:'https://example.fi/contact',
  },
  {
    id:'email',
    category:'Yhteystiedot',
    title:'Sähköposti',
    answer:'info@example.fi',
    keywords:['sähköposti','email','e-post'],
    source_type:'website',
    source_url:'https://example.fi/contact',
  },
];

for(const [lang,message,expected] of [
  ['fi','Miten saan teihin yhteyden?',/\+358 50 5774490.*info@example\.fi/i],
  ['en','How can I contact you?',/\+358 50 5774490.*info@example\.fi/i],
  ['sv','Hur kontaktar jag er?',/\+358 50 5774490.*info@example\.fi/i],
]){
  test('general contact question returns verified phone and email in '+lang,async()=>{
    const result=await generateGroundedAnswer({
      companyName:'Example',
      rows,
      message,
      history:[],
      lang,
    });
    assert.equal(result.handoff,false);
    assert.equal(result.intent,'Yhteystiedot');
    assert.match(result.answer,expected);
  });
}
