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


for(const [lang,message] of [
  ['fi','Mihin numeroon voin soittaa?'],
  ['en','Which number should I call?'],
  ['sv','Vilket nummer ska jag ringa?'],
]){
  test('call-number paraphrase returns verified phone in '+lang,async()=>{
    const result=await generateGroundedAnswer({
      companyName:'Example',
      rows,
      message,
      history:[],
      lang,
    });
    assert.equal(result.handoff,false,message+' '+JSON.stringify(result));
    assert.equal(result.intent,'Yhteystiedot');
    assert.match(result.answer,/\+358 50 5774490/i,result.answer);
    assert.doesNotMatch(result.answer,/info@example\.fi/i,result.answer);
  });
}

test('order number wording is not mistaken for a phone-number request',async()=>{
  const result=await generateGroundedAnswer({
    companyName:'Example',
    rows,
    message:'Where is my order number?',
    history:[],
    lang:'en',
  });
  assert.doesNotMatch(String(result.answer||''),/Our phone number is/i);
});
