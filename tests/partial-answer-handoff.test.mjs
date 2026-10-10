import test from 'node:test';
import assert from 'node:assert/strict';
import {hasVerifiedPartialAnswer,generateGroundedAnswer} from '../server.mjs';

const phone={id:'phone',category:'Yhteystiedot',title:'Puhelinnumero',
  answer:'+358401234567',source_type:'profile'};
const hours={id:'hours',category:'Aukioloajat',title:'Aukioloajat',
  answer:'ma 11:00 - 19:00',source_type:'website',source_url:'https://example.fi/'};

test('verified partial answers remain visible when human follow-up is required',async()=>{
  const result=await generateGroundedAnswer({rows:[phone],lang:'en',
    message:'What is your phone number and what are your opening hours on Monday?'});
  assert.equal(result.handoff,true);
  assert.deepEqual(result.sourceIds,['phone']);
  assert.equal(hasVerifiedPartialAnswer(result),true);
  assert.match(result.answer,/\+358401234567/);
  assert.match(result.answer,/could not verify/i);
});

test('unsupported content or a bare handoff is not marked as verified partial',()=>{
  assert.equal(hasVerifiedPartialAnswer({handoff:true,intent:'Useita kysymyksiä',
    answer:'Maybe we offer the service',sourceIds:[]}),false);
  assert.equal(hasVerifiedPartialAnswer({handoff:true,intent:'Palvelut',
    answer:'I think so',sourceIds:['a']}),false);
  assert.equal(hasVerifiedPartialAnswer({handoff:false,intent:'Useita kysymyksiä',
    answer:'Verified answer',sourceIds:['a']}),false);
});

test('a fully supported two-question answer is not a partial handoff',async()=>{
  const result=await generateGroundedAnswer({rows:[phone,hours],lang:'en',
    message:'What is your phone number and what are your opening hours on Monday?'});
  assert.equal(result.handoff,false,JSON.stringify(result));
  assert.equal(hasVerifiedPartialAnswer(result),false);
  assert.deepEqual(new Set(result.sourceIds),new Set(['phone','hours']));
});
