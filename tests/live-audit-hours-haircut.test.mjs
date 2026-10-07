import test from 'node:test';
import assert from 'node:assert/strict';
import { generateGroundedAnswer } from '../server.mjs';

const hourRows=[
  {
    id:'hours',
    category:'Aukioloajat',
    title:'Aukioloajat',
    answer:'Ma-Pe : 09:00–19:00La : 09:00 -17:00',
    keywords:['aukioloajat','opening hours','öppettider'],
    source_type:'website',
    source_url:'https://www.turkishbarber.fi/',
  },
];

for(const [lang,message,label] of [
  ['fi','Oletteko auki lauantaina?','Lauantai'],
  ['en','Are you open on Saturday?','Saturday'],
  ['sv','Har ni öppet på lördag?','Lördag'],
]){
  test('compact glued opening-hours string resolves Saturday in '+lang,async()=>{
    const result=await generateGroundedAnswer({
      companyName:'Turkish Barber Shop',
      rows:hourRows,
      message,
      history:[],
      lang,
    });
    assert.equal(result.handoff,false);
    assert.match(result.answer,new RegExp(label,'i'));
    assert.match(result.answer,/09:00\s*-\s*17:00/);
    assert.doesNotMatch(result.answer,/09:00\s*-\s*19:00/);
  });
}

const serviceRows=[
  {
    id:'haircut',
    category:'Palvelut',
    title:'Palvelut: HIUSTEN LEIKKAUS (Tavallinen)',
    answer:'HIUSTEN LEIKKAUS (Tavallinen)',
    keywords:['palvelu','hiusten leikkaus','haircut'],
    source_type:'website',
    source_url:'https://www.turkishbarber.fi/',
  },
];

test('natural Finnish ordinary-haircut wording is grounded in imported service',async()=>{
  const result=await generateGroundedAnswer({
    companyName:'Turkish Barber Shop',
    rows:serviceRows,
    message:'Teettekö tavallista hiustenleikkausta?',
    history:[],
    lang:'fi',
  });
  assert.equal(result.handoff,false);
  assert.equal(result.intent,'Palvelut');
  assert.match(result.answer,/hiustenleikkaus|leikka/i);
});
