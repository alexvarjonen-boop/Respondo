import test from 'node:test';
import assert from 'node:assert/strict';
import { generateGroundedAnswer } from '../server.mjs';

const serviceRows=[
  {id:'hours-1',category:'Aukioloajat',title:'Aukioloajat',answer:'Ma-Pe : 09:00–19:00La : 09:00 -17:00',keywords:['aukioloajat'],source_type:'website',source_url:'https://example.com'},
  {id:'svc-1',category:'Palvelut',title:'Palvelut',answer:'HIUSTEN LEIKKAUS (Tavallinen)',keywords:['hiustenleikkaus'],source_type:'website',source_url:'https://example.com'},
];

test('combined weekday ranges answer Saturday correctly in FI/SV/EN',async()=>{
  const cases=[
    ['fi','Oletteko auki lauantaina?',/Lauantai:\s*09:00\s*-\s*17:00/i],
    ['en','Are you open on Saturday?',/Saturday:\s*09:00\s*-\s*17:00/i],
    ['sv','Har ni öppet på lördag?',/Lördag:\s*09:00\s*-\s*17:00/i],
  ];
  for(const [lang,message,expected] of cases){
    const result=await generateGroundedAnswer({companyName:'Test',rows:serviceRows,message,history:[],lang});
    assert.equal(result.handoff,false,message+' '+JSON.stringify(result));
    assert.match(result.answer,expected,message+' -> '+result.answer);
  }
});

test('Finnish explicit haircut question is grounded in imported service evidence',async()=>{
  const result=await generateGroundedAnswer({
    companyName:'Test',rows:serviceRows,message:'Teettekö tavallista hiustenleikkausta?',history:[],lang:'fi'
  });
  assert.equal(result.handoff,false,JSON.stringify(result));
  assert.match(result.answer,/Kyllä.*hiustenleikk/i);
});
