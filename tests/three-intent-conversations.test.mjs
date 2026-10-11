import test from 'node:test';
import assert from 'node:assert/strict';
import {splitIndependentCustomerQuestions,generateGroundedAnswer} from '../server.mjs';

const row=(id,title,answer,category)=>({
  id,title,answer,category,source_type:'website',
  source_url:'https://example.fi/about'
});
const address=row('address','Osoite','Testikatu 1, 20100 Turku.','Yhteystiedot');
const hours=row('hours','Aukioloajat','Ma–pe 09.00–17.00.','Aukioloajat');
const phone=row('phone','Puhelinnumero','+358 40 123 4567.','Yhteystiedot');

test('three independent Finnish business questions become three separate intents',()=>{
  assert.deepEqual(
    splitIndependentCustomerQuestions('Missä sijaitsette ja milloin olette auki ja mikä on puhelinnumeronne?'),
    ['Missä sijaitsette','milloin olette auki','mikä on puhelinnumeronne']
  );
});
test('three independent English business questions preserve order',()=>{
  assert.deepEqual(
    splitIndependentCustomerQuestions('Where is your store and when are you open and what is your phone number?'),
    ['Where is your store','when are you open','what is your phone number']
  );
});
test('three independent Swedish business questions preserve order',()=>{
  assert.deepEqual(
    splitIndependentCustomerQuestions('Var är er adress och vilka är era öppettider och vad är ert telefonnummer?'),
    ['Var är er adress','vilka är era öppettider','vad är ert telefonnummer']
  );
});
test('question-mark separated three-intent questions are also understood',()=>{
  assert.deepEqual(
    splitIndependentCustomerQuestions('Where is your store? When are you open? What is your phone number?'),
    ['Where is your store','When are you open','What is your phone number']
  );
});
test('a later pronoun question must not become an unrelated grounded intent',()=>{
  for(const msg of [
    'Where is your store and when are you open and how much does it cost?',
    'Where is your store and when does it open and what is your phone number?'
  ]) assert.equal(splitIndependentCustomerQuestions(msg),null,msg);
});
test('shared or repeated topics and noun lists cannot be split by force',()=>{
  for(const msg of [
    'Where is your store and where is your office and when are you open?',
    'Can you install sockets and lights and do you repair refrigerators?',
    'Where is your store and when are you open and what is your phone number and what services do you offer?'
  ]) assert.equal(splitIndependentCustomerQuestions(msg),null,msg);
});
test('two independent intents are preserved without requiring a third',()=>{
  assert.deepEqual(
    splitIndependentCustomerQuestions('Where is your store and when are you open?'),
    ['Where is your store','when are you open']
  );
});
test('end-to-end: independently grounded facts remain in each numbered answer',async()=>{
  const result=await generateGroundedAnswer({
    rows:[address,hours,phone],
    message:'Missä sijaitsette ja milloin olette auki ja mikä on puhelinnumeronne?',
    lang:'fi'
  });
  assert.match(result.answer,/^1\. /);
  assert.match(result.answer,/\n2\. /);
  assert.match(result.answer,/\n3\. /);
  assert.ok(result.sourceIds.length>=1,JSON.stringify(result));
  assert.ok(result.sourceIds.every(id=>['address','hours','phone'].includes(id)));
});
test('end-to-end: unanswered third question is clearly marked without fabricated evidence',async()=>{
  const result=await generateGroundedAnswer({
    rows:[address,hours],
    message:'Missä sijaitsette ja milloin olette auki ja mikä on puhelinnumeronne?',
    lang:'fi'
  });
  assert.match(result.answer,/\n3\. /);
  assert.equal(result.handoff,true,JSON.stringify(result));
  assert.ok(!result.sourceIds.includes('phone'));
  assert.match(result.answer,/En löytänyt tähän osaan vahvistettua vastausta/);
});
