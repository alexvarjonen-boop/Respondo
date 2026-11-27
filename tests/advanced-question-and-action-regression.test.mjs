import test from 'node:test';
import assert from 'node:assert/strict';
import {splitIndependentCustomerQuestions,chatActions} from '../server.mjs';

test('multi-part questions preserve compound payment methods',()=>{
  for(const [question,expected] of [
    ['Voinko maksaa kortilla ja käteisellä ja milloin toimitatte?',['Voinko maksaa kortilla ja käteisellä','milloin toimitatte']],
    ['Can I pay by card and cash and when do you deliver?',['Can I pay by card and cash','when do you deliver']],
    ['Kan jag betala med kort och kontanter och när levererar ni?',['Kan jag betala med kort och kontanter','när levererar ni']]
  ]) assert.deepEqual(splitIndependentCustomerQuestions(question),expected);
});
test('multi-part parsing respects question boundaries and avoids URLs or dependent references',()=>{
  assert.deepEqual(splitIndependentCustomerQuestions('Milloin toimitatte?Mihin aikaan olette auki?'),['Milloin toimitatte','Mihin aikaan olette auki']);
  assert.equal(splitIndependentCustomerQuestions('Milloin toimitatte ja paljonko se maksaa?'),null);
  assert.equal(splitIndependentCustomerQuestions('Milloin toimitatte? https://example.com/?x=1'),null);
  assert.equal(splitIndependentCustomerQuestions('Voinko maksaa kortilla ja käteisellä?'),null);
});
test('unapproved booking and contact URLs cannot become customer actions',()=>{
  const rows=[
    {id:'draft-booking',approved:false,category:'Ajanvaraus',title:'Ajanvarauslinkki',answer:'https://example.com/draft-booking',source_type:'website',source_url:'https://example.com'},
    {id:'draft-contact',approved:false,category:'Yhteystiedot',title:'Yhteydenottosivu',answer:'https://example.com/draft-contact',source_type:'website',source_url:'https://example.com'}
  ];
  for(const q of ['Miten voin varata ajan?','Miten saan teihin yhteyden?']){
    assert.ok(!chatActions(rows,q,false,'fi',[]).some(a=>String(a.url||'').includes('draft-')));
  }
});
