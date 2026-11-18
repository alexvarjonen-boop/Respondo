import test from 'node:test';
import assert from 'node:assert/strict';
import {findRepeatedCustomerQuestions} from '../respondo-quality-center.mjs';
const ts=m=>new Date(Date.parse('2026-11-18T10:00:00Z')+m*60000).toISOString();
const row=(id,visitor,question,minutes,channel='website')=>({id,visitor_ref:visitor,question,created_at:ts(minutes),source_channel:channel});
test('only same visitor, channel and repeated factual question within two hours flags a possible issue',()=>{
 const rows=[row('a','v1','Paljonko muutto maksaa?',0),row('b','v2','Paljonko muutto maksaa?',1),
   row('c','v1','Paljonko muutto maksaa!',25),row('d','v1','Paljonko muutto maksaa?',200),
   row('e','v1','Paljonko muutto maksaa?',26,'email')];
 const repeats=findRepeatedCustomerQuestions(rows);
 assert.equal(repeats.length,1);
 assert.equal(repeats[0].conversationId,'c');
 assert.equal(repeats[0].askedAgainAfterMinutes,25);
 assert.equal(repeats[0].accuracyVerified,false);
});
test('greetings and questions without an identifiable visitor are excluded; PII is redacted',()=>{
 const rows=[row('a','v1','Hei',0),row('b','v1','Hei',3),
   row('c',null,'Ota yhteyttä minuun',0),row('d',null,'Ota yhteyttä minuun',5),
   row('e','v2','Voitko soittaa +358 401234567?',0),row('f','v2','Voitko soittaa +358 401234567?',8)];
 const repeats=findRepeatedCustomerQuestions(rows);
 assert.equal(repeats.length,1);
 assert.ok(!repeats[0].question.includes('401234567'));
});
