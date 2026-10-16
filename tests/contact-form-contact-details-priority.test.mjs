import test from 'node:test';
import assert from 'node:assert/strict';
import { generateGroundedAnswer, chatActions } from '../server.mjs';

const url='https://example.fi/contact';
const rows=[
  { id:'phone', category:'Yhteystiedot', title:'Puhelinnumero',
    answer:'+358 50 5774490', keywords:['phone','puhelin','telefon'],
    source_type:'website', source_url:url },
  { id:'email', category:'Yhteystiedot', title:'Sähköposti',
    answer:'info@example.fi', keywords:['email','sähköposti','e-post'],
    source_type:'website', source_url:url },
  { id:'form', category:'Yhteystiedot', title:'Yhteydenottolomake',
    answer:url, keywords:['contact','yhteydenotto','kontakt'],
    source_type:'website', source_url:url },
];

for (const [lang, question] of [
  ['fi','Miten saan teihin yhteyden?'],
  ['en','How can I contact you?'],
  ['sv','Hur kontaktar jag er?'],
]) {
  test('general contact question uses verified phone/email ahead of contact page in '+lang,async()=>{
    const result=await generateGroundedAnswer({
      companyName:'Example', rows, message:question, history:[], lang,
    });
    assert.equal(result.handoff,false,JSON.stringify(result));
    assert.match(result.answer,/\+358 50 5774490/i);
    assert.match(result.answer,/info@example\.fi/i);
    assert.ok(result.sourceIds.includes('phone'));
    assert.ok(result.sourceIds.includes('email'));
  });
}

for (const [lang, question, expected] of [
  ['fi','Miten voin lähettää teille viestin?',/yhteydenottolomakkeella/i],
  ['en','Can I send you a message?',/contact form/i],
  ['sv','Hur kan jag skicka ett meddelande till er?',/kontaktformuläret/i],
]) {
  test('explicit message request still opens the verified web form in '+lang,async()=>{
    const result=await generateGroundedAnswer({
      companyName:'Example', rows, message:question, history:[], lang,
    });
    assert.equal(result.handoff,false,JSON.stringify(result));
    assert.match(result.answer,expected);
    assert.ok(chatActions(rows,question,false,lang,result.selected).some(a=>a.url===url));
  });
}

test('only a contact form remains available if no verified phone/email exists',async()=>{
  const result=await generateGroundedAnswer({
    companyName:'Example', rows:[rows[2]],
    message:'Miten saan teihin yhteyden?', lang:'fi',
  });
  assert.equal(result.handoff,false);
  assert.match(result.answer,/yhteydenottolomakkeella/i);
  assert.deepEqual(result.sourceIds,['form']);
});
