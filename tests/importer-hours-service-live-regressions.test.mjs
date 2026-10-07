import test from 'node:test';
import assert from 'node:assert/strict';
import { generateGroundedAnswer } from '../server.mjs';

const hoursRows=[{
  id:'hours',
  category:'Aukioloajat',
  title:'Aukioloajat',
  answer:'Ma-Pe : 09:00–19:00La : 09:00 -17:00',
  keywords:['aukioloajat','opening hours','öppettider'],
  source_type:'website',
  source_url:'https://example.fi/',
}];

for(const [lang,message,label] of [
  ['fi','Oletteko auki lauantaina?','Lauantai'],
  ['en','Are you open on Saturday?','Saturday'],
  ['sv','Har ni öppet på lördag?','Lördag'],
]){
  test('compact no-space opening hours resolve Saturday correctly in '+lang,async()=>{
    const result=await generateGroundedAnswer({
      companyName:'Example',
      rows:hoursRows,
      message,
      history:[],
      lang,
    });
    assert.equal(result.handoff,false);
    assert.equal(result.intent,'Aukioloajat');
    assert.match(result.answer,new RegExp('^'+label+':\\s*09:00\\s*-\\s*17:00\\.$','i'));
    assert.doesNotMatch(result.answer,/Friday|Fredag|Perjantai/i);
  });
}

test('weekday range expands Monday through Friday without leaking Saturday hours',async()=>{
  const result=await generateGroundedAnswer({
    companyName:'Example',
    rows:hoursRows,
    message:'Mihin aikaan olette auki maanantaina?',
    history:[],
    lang:'fi',
  });
  assert.equal(result.handoff,false);
  assert.match(result.answer,/^Maanantai:\s*09:00\s*-\s*19:00\.$/i);
});

const serviceRows=[{
  id:'haircut',
  category:'Palvelut',
  title:'Palvelut: HIUSTEN LEIKKAUS (Tavallinen)',
  answer:'HIUSTEN LEIKKAUS (Tavallinen)',
  keywords:['hiustenleikkaus','haircut','hårklippning'],
  source_type:'website',
  source_url:'https://example.fi/',
}];

test('Finnish multi-word direct haircut question is grounded in the imported service',async()=>{
  const result=await generateGroundedAnswer({
    companyName:'Example Barber',
    rows:serviceRows,
    message:'Teettekö tavallista hiustenleikkausta?',
    history:[],
    lang:'fi',
  });
  assert.equal(result.handoff,false);
  assert.equal(result.intent,'Palvelut');
  assert.match(result.answer,/hiustenleikkauks/i);
});
