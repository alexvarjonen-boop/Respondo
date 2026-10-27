import test from 'node:test';
import assert from 'node:assert/strict';
import {generateGroundedAnswer,hasVerifiedPartialAnswer} from '../server.mjs';

const h=(id,text)=>({
  id,category:'Aukioloajat',title:'Aukioloajat',
  answer:text,source_type:'website',source_url:'https://shop.example/opening-hours'
});
const saturday=h('sat','la 09:00 - 16:00');
const sunday=h('sun','su suljettu');
const monday=h('mon','ma 09:00 - 17:00');

for(const [lang,question,day] of [
  ['fi','Oletteko auki sunnuntaina?','Sunnuntai'],
  ['en','Are you open on Sunday?','Sunday'],
  ['sv','Har ni öppet på söndag?','Söndag']
]){
  test('unknown '+lang+' weekday does not invent closing time or quote other days',async()=>{
    const result=await generateGroundedAnswer({rows:[saturday,monday],message:question,lang});
    assert.equal(result.handoff,true,JSON.stringify(result));
    assert.match(result.answer,new RegExp('^'+day+':'));
    assert.doesNotMatch(result.answer,/09:00|16:00|17:00|closed|suljettu|stängt/i);
    assert.deepEqual(result.sourceIds,[]);
    assert.equal(hasVerifiedPartialAnswer(result),false);
  });
}
for(const [lang,question,sat,sun] of [
  ['fi','Oletteko auki viikonloppuna?','Lauantai','Sunnuntai'],
  ['en','Are you open on weekends?','Saturday','Sunday'],
  ['sv','Har ni öppet på helgen?','Lördag','Söndag']
]){
  test('whole-weekend '+lang+' query answers both days from separate verified rows',async()=>{
    const result=await generateGroundedAnswer({rows:[saturday,sunday,monday],message:question,lang});
    assert.equal(result.handoff,false,JSON.stringify(result));
    assert.match(result.answer,new RegExp(sat+': 09:00 - 16:00'));
    assert.match(result.answer,new RegExp(sun+': (?:Suljettu|Closed|Stängt)'));
    assert.doesNotMatch(result.answer,/Monday|Maanantai|Måndag/);
    assert.deepEqual(new Set(result.sourceIds),new Set(['sat','sun']));
  });
  test('partially known weekend '+lang+' keeps sourced Saturday and discloses missing Sunday',async()=>{
    const result=await generateGroundedAnswer({rows:[saturday,monday],message:question,lang});
    assert.equal(result.handoff,true,JSON.stringify(result));
    assert.match(result.answer,new RegExp(sat+': 09:00 - 16:00'));
    assert.match(result.answer,new RegExp(sun+':'));
    assert.doesNotMatch(result.answer,/\b(?:Closed|Suljettu|Stängt)\b/);
    assert.deepEqual(result.sourceIds,['sat']);
    assert.equal(hasVerifiedPartialAnswer(result),true);
  });
}
test('contradictory explicit Monday times are not presented as one verified answer',async()=>{
  const result=await generateGroundedAnswer({
    rows:[monday,h('other-mon','ma 10:00 - 18:00')],
    message:'What are your opening hours on Monday?',lang:'en'
  });
  assert.equal(result.handoff,true);
  assert.match(result.answer,/Monday:.*could not be verified/i);
  assert.doesNotMatch(result.answer,/09:00|10:00|17:00|18:00/);
  assert.deepEqual(result.sourceIds,[]);
});
test('multiple weekday names joined with and yield both requested hours',async()=>{
  const result=await generateGroundedAnswer({rows:[saturday,sunday,monday],
    message:'Are you open on Monday and Saturday?',lang:'en'});
  assert.equal(result.handoff,false,JSON.stringify(result));
  assert.match(result.answer,/Monday: 09:00 - 17:00/);
  assert.match(result.answer,/Saturday: 09:00 - 16:00/);
  assert.doesNotMatch(result.answer,/Sunday:/);
});
