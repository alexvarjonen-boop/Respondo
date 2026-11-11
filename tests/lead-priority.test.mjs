import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyRequestPriority} from '../lead-priority.mjs';
test('explicit urgency in FI SV EN produces an urgent handling flag',()=>{
 for(const message of ['Tarvitsen huomenna muuttajan','Need this urgently','Behöver hjälp snarast']){
  const q=classifyRequestPriority({type:'quote',message});
  assert.equal(q.tier,'urgent');
  assert.equal(q.manualReviewRequired,true);
  assert.equal(q.autoConfirmed,false);
 }
});
test('uncertain or negated urgency never makes an urgent lead',()=>{
 for(const message of ['Ei kiirettä, haluaisin tarjouksen','No rush, just checking pricing','Inte bråttom med det']){
  assert.equal(classifyRequestPriority({type:'quote',message}).tier,'normal');
 }
});
test('named schedule and explicit quantity are signals, not booking confirmation',()=>{
 const q=classifyRequestPriority({type:'booking',message:'Can you visit on Friday for 20 pcs?'});
 assert.equal(q.tier,'normal');
 assert.deepEqual(q.signals,['named_weekday','explicit_amount']);
 assert.equal(q.autoConfirmed,false);
});
test('non-sales request types are not assigned lead priority',()=>{
 for(const type of ['order_status','refund','support',''])assert.equal(classifyRequestPriority({type,message:'Urgent'}),null);
});
test('does not return personal or contact information',()=>{
 const q=classifyRequestPriority({type:'callback',message:'Call me immediately at 0401234567'});
 assert.equal(JSON.stringify(q).includes('0401234567'),false);
});
