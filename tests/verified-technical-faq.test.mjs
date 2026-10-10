import test from 'node:test';
import assert from 'node:assert/strict';
import {verifiedTechnicalFaqAnswer} from '../verified-technical-faq.mjs';
import {generateGroundedAnswer} from '../server.mjs';
const faq=(id,title,answer,lang='fi')=>({
  id,title,answer,category:'Usein kysytyt',
  source_type:'website',source_url:'https://example.fi/faq',lang
});
const knowledge=[
  faq('agm','Tarvitseeko AGM-akku rekisteröidä vaihdon jälkeen?',
    'AGM-akun vaihdon jälkeen akun rekisteröinti voi olla tarpeen auton valmistajan ohjeiden mukaan.'),
  faq('p0420','Mitä vikakoodi P0420 tarkoittaa?',
    'P0420 liittyy katalysaattorijärjestelmän tehokkuuteen. Tarkka syy edellyttää vikadiagnostiikkaa.'),
];

test('professionally phrased synonym questions reuse only confirmed FAQ knowledge',async()=>{
  const result=await generateGroundedAnswer({rows:knowledge,lang:'fi',
    message:'Pitääkö AGM-akku koodata vaihdon jälkeen?'});
  assert.equal(result.handoff,false,JSON.stringify(result));
  assert.deepEqual(result.sourceIds,['agm']);
  assert.match(result.answer,/valmistajan ohjeiden mukaan/);
});

test('technical fault code questions resolve the exact P-code',async()=>{
  const result=await generateGroundedAnswer({rows:knowledge,lang:'fi',
    message:'Mitä tarkoittaa vikakoodi P0420?'});
  assert.equal(result.handoff,false,JSON.stringify(result));
  assert.deepEqual(result.sourceIds,['p0420']);
  assert.match(result.answer,/katalysaattori/);
});

test('different fault codes are not treated as interchangeable',async()=>{
  const answer=await generateGroundedAnswer({rows:knowledge,lang:'fi',
    message:'Mitä tarkoittaa vikakoodi P0300?'});
  assert.equal(answer.handoff,true,JSON.stringify(answer));
  assert.deepEqual(answer.sourceIds,[]);
});

test('do not manufacture diagnostic advice from a generic repair service',async()=>{
  const service=[{id:'s',category:'Palvelut',title:'Autokorjaamon palvelut',answer:'Tarjoamme autohuoltoa ja diagnostiikkaa.',source_type:'website',source_url:'https://example.fi'}];
  const answer=await generateGroundedAnswer({rows:service,lang:'fi',
    message:'Pitääkö AGM-akku koodata vaihdon jälkeen?'});
  assert.equal(answer.handoff,true,JSON.stringify(answer));
  assert.deepEqual(answer.sourceIds,[]);
});

test('English and Swedish expert FAQ answers work without paid APIs',async()=>{
  const cases=[
    ['en','Does an AGM battery require registration after replacement?',
      'Does an AGM battery need registration after replacement?',
      'Some cars require battery registration after an AGM battery replacement.'],
    ['sv','Behöver AGM-batteriet registreras efter byte?',
      'Behöver AGM-batteriet registreras efter byte?',
      'Vissa bilar kräver registrering av ett nytt AGM-batteri.']
  ];
  for(const [lang,message,title,answer] of cases){
    const result=await generateGroundedAnswer({lang,rows:[faq('expert',title,answer,lang)],message});
    assert.equal(result.handoff,false,lang+' '+JSON.stringify(result));
    assert.deepEqual(result.sourceIds,['expert']);
    assert.match(result.answer,/AGM/);
  }
});

test('conflicting approved technical FAQs require a human instead of arbitrary choice',()=>{
  const conflicting=[
    faq('a','Pitääkö AGM-akku koodata vaihdon jälkeen?','Joissakin autoissa tarvitaan koodaus.'),
    faq('b','Pitääkö AGM-akku koodata vaihdon jälkeen?','Koodaus ei ole koskaan tarpeen.')
  ];
  const answer=verifiedTechnicalFaqAnswer(conflicting,'Pitääkö AGM-akku koodata vaihdon jälkeen?');
  assert.equal(answer.handoff,true);
  assert.deepEqual(answer.sourceIds,[]);
});

test('non-technical store contact questions remain on established paths',async()=>{
  const result=await generateGroundedAnswer({lang:'fi',rows:knowledge,
    message:'Mihin aikaan olette auki?'});
  assert.notEqual(result.intent,'Tekninen kysymys');
});
