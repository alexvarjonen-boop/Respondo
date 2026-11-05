import test from 'node:test';
import assert from 'node:assert/strict';
import {triageNativeMail} from '../native-mail-triage.mjs';
import {nativeInboxDraftFromSources} from '../native-inbox.mjs';

test('window washing availability never gets falsely confirmed',()=>{
 const result=triageNativeMail('Voiko perjantaina klo 15 pestä 30 ikkunaa?','fi');
 assert.equal(result.intent,'booking');
 assert.match(result.suggestion,/työn keston ja vapaan ajan/);
 assert.equal(result.autoSend,false);
 assert.equal(result.confirmedBooking,false);
});
test('pricing is review-only in all languages',()=>{
 for(const [message,language] of [
  ['Mitä maksaa ikkunoiden pesu?','fi'],
  ['Vad kostar fönstertvätt?','sv'],
  ['What does window cleaning cost?','en']
 ]){
  const t=triageNativeMail(message,language);
  assert.equal(t.intent,'pricing');assert.equal(t.verifiedPrice,false);
  assert.equal(t.requiresReview,true);assert.ok(t.suggestion.length>20);
 }
});
test('empty messages do not generate a reply',()=>{
 assert.equal(triageNativeMail('  ','en').suggestion,null);
});
test('inbox creates conservative draft for email booking even with approved knowledge',async()=>{
 const db={query:async(sql)=>{
  if(sql.includes('SELECT language,source_channel'))return {rows:[{language:'en',source_channel:'email'}]};
  if(sql.includes('FROM chat_messages'))return {rows:[{message:'Is Friday at 3 available for cleaning 30 windows?'}]};
  if(sql.includes('FROM knowledge'))return {rows:[{
   id:'11111111-1111-4111-8111-111111111111',
   title:'Friday window cleaning',answer:'Friday 3 PM is available, booked!',
   approved:true,keywords:['Friday','cleaning']
  }]};
  throw Error('Unexpected SQL: '+sql);
 }};
 const result=await nativeInboxDraftFromSources(db,'22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333');
 assert.equal(result.intent,'booking');
 assert.equal(result.suggestion.approvedForSend,false);
 assert.match(result.suggestion.suggestedText,/before confirming a booking/);
 assert.doesNotMatch(result.suggestion.suggestedText,/booked!/);
 assert.equal(result.externalDeliveryConnected,false);
});
