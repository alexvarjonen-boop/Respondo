import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {leadFollowupTiming} from '../native-taskboard.mjs';
test('explicit FI, SV and EN sales requests receive a near-term internal task',()=>{
  for(const question of ['Haluaisin tarjouksen muutosta','Can I book an appointment?','Jag vill köpa den här']){
    const result=leadFollowupTiming(question);
    assert.equal(result.dueHours,0.5,question);
    assert.equal(result.priority,'urgent');
  }
});
test('negated or general contact requests do not become urgent sales tasks',()=>{
  for(const question of ['En halua ostaa tätä','I do not want to buy','Ottakaa yhteyttä ensi viikolla','Hei']){
    const result=leadFollowupTiming(question);
    assert.equal(result.dueHours,24,question);
    assert.equal(result.priority,'normal');
  }
});
test('explicit booking, callback or quote form submissions remain urgent even with an empty note',()=>{
  for(const type of ['booking','callback','quote']){
    assert.deepEqual([leadFollowupTiming('',type).dueHours,leadFollowupTiming('',type).priority],[0.5,'urgent']);
  }
  assert.equal(leadFollowupTiming('','order_status').priority,'normal');
  const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
  assert.match(server,/priority:\['quote','booking','callback'\]\.includes\(type\)\?'urgent':'normal'/);
  assert.match(server,/requestType:type,\s*note:String\(fields\.details/);
});
