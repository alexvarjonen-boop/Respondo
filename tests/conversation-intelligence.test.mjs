import test from 'node:test';
import assert from 'node:assert/strict';
import {generateGroundedAnswer} from '../server.mjs';

const pureConversationCases=[
  // Finnish
  ['moro','fi'],['morjens','fi'],['hyvää huomenta','fi'],['mitäs kuuluu','fi'],
  ['kuka olet','fi'],['ootko botti','fi'],['voitko auttaa','fi'],['tarviin apua','fi'],
  ['mitä osaat','fi'],['mitä voin kysyä','fi'],['en tajua','fi'],['selitä tarkemmin','fi'],
  ['voitko toistaa','fi'],['sano uudestaan','fi'],['kiitti paljon','fi'],['suuret kiitokset','fi'],
  ['selvä homma','fi'],['asia selvä','fi'],['kuulostaa hyvältä','fi'],['ei kiitos','fi'],
  ['sori','fi'],['oma moka','fi'],['mahtavaa','fi'],['hyvä botti','fi'],['nähdään','fi'],
  // English
  ['good morning','en'],['how are you doing','en'],['are you a bot','en'],['i have a question','en'],
  ['what can you do','en'],['what can i ask','en'],["i don't understand",'en'],['what do you mean','en'],
  ['could you repeat','en'],['say that again','en'],['thank you so much','en'],['thanks for your help','en'],
  ['sounds good','en'],['that makes sense','en'],['no thanks','en'],['my bad','en'],['great job','en'],['see you later','en'],
  // Swedish
  ['god morgon','sv'],['hur mår du','sv'],['är du en bot','sv'],['jag behöver hjälp','sv'],
  ['vad kan du göra','sv'],['vad kan jag fråga','sv'],['jag förstår inte','sv'],['vad menar du','sv'],
  ['kan du upprepa','sv'],['säg det igen','sv'],['tusen tack','sv'],['tack för hjälpen','sv'],
  ['det låter bra','sv'],['jag förstår','sv'],['nej tack','sv'],['förlåt','sv'],['bra jobbat','sv'],['vi ses','sv'],
];

test('generic conversation layer handles broad FI/SV/EN natural language without company knowledge',async()=>{
  for(const [message,lang] of pureConversationCases){
    const result=await generateGroundedAnswer({rows:[],message,lang,history:[{question:'Mitä ikkunanpesu maksaa?',answer:'Ikkunanpesu maksaa 49 €.'}]});
    assert.equal(result.handoff,false,message);
    assert.equal(result.confidence,1,message);
    assert.ok(result.answer,message);
    assert.deepEqual(result.sourceIds,[],message);
  }
});

test('conversation wrappers never swallow a real business question',async()=>{
  const rows=[{
    id:'price-1',category:'Hinnat',title:'Hinnat',answer:'Ikkunanpesu maksaa 49 €.',
    source_type:'website',source_url:'https://example.fi/prices'
  }];
  for(const message of ['moi paljonko ikkunanpesu maksaa?','hei, mitä ikkunanpesu maksaa?','okei paljonko ikkunanpesu maksaa?']){
    const result=await generateGroundedAnswer({rows,message,lang:'fi'});
    assert.equal(result.handoff,false,JSON.stringify(result));
    assert.match(result.answer,/49/);
    assert.ok(result.sourceIds.length>0);
  }
});

test('follow-up wording inherits prior subject and intent instead of falling back',async()=>{
  const rows=[
    {id:'window',category:'Hinnat',title:'Hinnat',answer:'Ikkunanpesu maksaa 49 €.',source_type:'website',source_url:'https://example.fi/prices'},
    {id:'roof',category:'Hinnat',title:'Hinnat',answer:'Katonpesu maksaa 199 €.',source_type:'website',source_url:'https://example.fi/prices'},
    {id:'hours',category:'Aukioloajat',title:'Aukioloajat',answer:'Ma–pe 9–17, la 10–14, su suljettu.',source_type:'website',source_url:'https://example.fi/contact'}
  ];

  const priceFollowUp=await generateGroundedAnswer({
    rows,message:'entä katonpesu?',lang:'fi',
    history:[{question:'Mitä ikkunanpesu maksaa?',answer:'Ikkunanpesu maksaa 49 €.'}]
  });
  assert.equal(priceFollowUp.handoff,false,JSON.stringify(priceFollowUp));
  assert.match(priceFollowUp.answer,/199/);

  const hoursFollowUp=await generateGroundedAnswer({
    rows,message:'ja lauantaina?',lang:'fi',
    history:[{question:'Milloin olette auki?',answer:'Ma–pe 9–17, la 10–14, su suljettu.'}]
  });
  assert.equal(hoursFollowUp.handoff,false,JSON.stringify(hoursFollowUp));
  assert.match(hoursFollowUp.answer,/10.?14|la/i);
});

test('explicit correction replaces old subject instead of blindly concatenating it',async()=>{
  const rows=[
    {id:'window',category:'Hinnat',title:'Hinnat',answer:'Ikkunanpesu maksaa 49 €.',source_type:'website',source_url:'https://example.fi/prices'},
    {id:'roof',category:'Hinnat',title:'Hinnat',answer:'Katonpesu maksaa 199 €.',source_type:'website',source_url:'https://example.fi/prices'}
  ];
  const result=await generateGroundedAnswer({
    rows,message:'ei vaan tarkoitin katonpesun hintaa',lang:'fi',
    history:[{question:'Mitä ikkunanpesu maksaa?',answer:'Ikkunanpesu maksaa 49 €.'}]
  });
  assert.equal(result.handoff,false,JSON.stringify(result));
  assert.match(result.answer,/199/);
});

test('repeat request can reuse the last grounded answer without new knowledge lookup',async()=>{
  const result=await generateGroundedAnswer({
    rows:[],message:'sano uudestaan',lang:'fi',
    history:[{question:'Mitä se maksaa?',answer:'Palvelu maksaa 79 €.'}]
  });
  assert.equal(result.handoff,false);
  assert.equal(result.answer,'Palvelu maksaa 79 €.');
});
