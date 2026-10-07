import test from 'node:test';
import assert from 'node:assert/strict';
import { generateGroundedAnswer } from '../server.mjs';

const rows=[
  {id:'mon',category:'Aukioloajat',title:'Aukioloajat',answer:'ma 11:00 - 19:00',keywords:['auki','opening','hours','öppettider'],source_type:'website',source_url:'https://example.fi/'},
  {id:'sat',category:'Aukioloajat',title:'Aukioloajat',answer:'la 09:00 - 16:00',keywords:['auki','opening','hours','öppettider'],source_type:'website',source_url:'https://example.fi/'},
];

test('opening hours are localized structurally without translation service',async()=>{
  const cases=[
    ['fi','Mihin aikaan olette auki maanantaina?',/Maanantai:\s*11:00\s*-\s*19:00/],
    ['en','What are your opening hours on Monday?',/Monday:\s*11:00\s*-\s*19:00/],
    ['sv','Vilka öppettider har ni på måndag?',/Måndag:\s*11:00\s*-\s*19:00/],
    ['fi','Oletteko auki lauantaina?',/Lauantai:\s*09:00\s*-\s*16:00/],
    ['en','Are you open on Saturday?',/Saturday:\s*09:00\s*-\s*16:00/],
    ['sv','Har ni öppet på lördag?',/Lördag:\s*09:00\s*-\s*16:00/],
  ];
  for(const [lang,message,expected] of cases){
    const result=await generateGroundedAnswer({companyName:'Example',rows,message,history:[],lang});
    assert.equal(result.handoff,false,lang+' '+message+' '+JSON.stringify(result));
    assert.match(result.answer,expected,lang+' '+message+' '+result.answer);
    assert.equal(result.intent,'Aukioloajat');
  }
});

test('generic opening-hours question returns the available schedule in requested language',async()=>{
  const en=await generateGroundedAnswer({companyName:'Example',rows,message:'What are your opening hours?',history:[],lang:'en'});
  assert.equal(en.handoff,false);
  assert.match(en.answer,/Monday:/);
  assert.match(en.answer,/Saturday:/);
});
