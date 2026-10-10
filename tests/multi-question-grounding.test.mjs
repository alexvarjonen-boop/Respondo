import test from 'node:test';
import assert from 'node:assert/strict';
import {generateGroundedAnswer} from '../server.mjs';

const phone={id:'phone',category:'Yhteystiedot',title:'Puhelinnumero',
  answer:'+358401234567',source_type:'profile'};
const hours={id:'hours',category:'Aukioloajat',title:'Aukioloajat',
  answer:'ma 11:00 - 19:00',keywords:['auki','opening','hours','öppettider'],source_type:'website',source_url:'https://example.fi/'};
const rows=[phone,hours];

for(const [lang,message,dayLabel] of [
  ['fi','Mikä teidän puhelinnumero on ja milloin olette auki maanantaina?','Maanantai'],
  ['sv','Vad är ert telefonnummer och vilka öppettider har ni på måndag?','Måndag'],
  ['en','What is your phone number and what are your opening hours on Monday?','Monday'],
]){
  test('answers independent contact and hours questions in '+lang,async()=>{
    const result=await generateGroundedAnswer({rows,message,lang});
    assert.equal(result.handoff,false,JSON.stringify(result));
    assert.match(result.answer,/\+358401234567/);
    assert.match(result.answer,new RegExp(dayLabel+':\\s*11:00\\s*[-–]\\s*19:00'));
    assert.deepEqual(new Set(result.sourceIds),new Set(['phone','hours']));
    assert.equal(result.selected.length,2);
    assert.match(result.answer,/^1\. /);
    assert.match(result.answer,/\n2\. /);
  });
}

test('splits two fully written independent questions separated by punctuation',async()=>{
  const result=await generateGroundedAnswer({rows,lang:'fi',
    message:'Mikä puhelinnumeronne on? Milloin olette auki maanantaina?'});
  assert.equal(result.handoff,false,JSON.stringify(result));
  assert.deepEqual(new Set(result.sourceIds),new Set(['phone','hours']));
});

test('returns grounded partial answer plus explicit uncertainty if one detail is unavailable',async()=>{
  const result=await generateGroundedAnswer({rows:[hours],lang:'en',
    message:'What is your phone number and what are your opening hours on Monday?'});
  assert.equal(result.handoff,true,JSON.stringify(result));
  assert.match(result.answer,/could not verify/i);
  assert.match(result.answer,/Monday.*11:00/i);
  assert.deepEqual(result.sourceIds,['hours']);
  assert.equal(result.selected.length,1);
});

test('two unknown independent facts do not create an answer without evidence',async()=>{
  const result=await generateGroundedAnswer({rows:[],lang:'en',
    message:'What is your phone number and what are your opening hours on Monday?'});
  assert.equal(result.handoff,true);
  assert.equal(result.answer,'');
  assert.deepEqual(result.sourceIds,[]);
});

test('does not split unrelated conjunctions or a dependent product price follow-up',async()=>{
  const catalog=[
    {id:'a',category:'Tuotteet',title:'JAG Satin Black - Putter',
      answer:'Tuote: JAG Satin Black - Putter. Hinta: 199 EUR. Linkki: https://example.com/a.',
      source_type:'website',source_url:'https://example.com/a'}
  ];
  const product=await generateGroundedAnswer({rows:catalog,lang:'en',
    message:'Do you sell this putter and how much does it cost?'});
  assert.notEqual(product.intent,'Multiple questions');
  const service=await generateGroundedAnswer({rows:[],lang:'fi',
    message:'Teettekö ikkunoiden ja ovien pesuja?'});
  assert.notEqual(service.intent,'Useita kysymyksiä');
});

test('separate questions cannot turn a missing answer into another company fact',async()=>{
  const other={id:'shipping',category:'Toimitus ja seuranta',title:'Toimitusaika',
    answer:'Toimitusaika on 2–4 arkipäivää.',source_type:'website',source_url:'https://example.fi/shipping'};
  const result=await generateGroundedAnswer({rows:[phone,other],lang:'fi',
    message:'Mikä teidän puhelinnumero on ja milloin olette auki maanantaina?'});
  assert.equal(result.handoff,true);
  assert.deepEqual(result.sourceIds,['phone']);
  assert.doesNotMatch(result.answer,/2–4/);
});
