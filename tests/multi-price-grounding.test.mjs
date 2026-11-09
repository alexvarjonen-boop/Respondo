import test from 'node:test';
import assert from 'node:assert/strict';
import { focusMultiPriceAnswer } from '../multi-price-grounding.mjs';
import { generateGroundedAnswer } from '../server.mjs';

const multiPrice='Ikkunanpesu maksaa 49 €. Katonpesu maksaa 199 €.';
const rows=[{
  id:'prices',title:'Hinnat',category:'Hinnat',answer:multiPrice,
  source_type:'website',source_url:'https://example.fi/hinnasto'
}];

test('single verified service price is selected from multi-price row',async()=>{
  const result=await generateGroundedAnswer({rows,message:'Mitä katonpesu maksaa?',lang:'fi'});
  assert.equal(result.handoff,false,JSON.stringify(result));
  assert.match(result.answer,/199/);
  assert.doesNotMatch(result.answer,/49/);
  assert.deepEqual(result.sourceIds,['prices']);
});

test('short price follow-up switches subjects without leaking earlier price',async()=>{
  const result=await generateGroundedAnswer({
    rows,message:'Entä katonpesu?',lang:'fi',
    history:[{question:'Mitä ikkunanpesu maksaa?',answer:'Ikkunanpesu maksaa 49 €.'}]
  });
  assert.equal(result.handoff,false,JSON.stringify(result));
  assert.match(result.answer,/199/);
  assert.doesNotMatch(result.answer,/49/);
});

test('unmatched service is never assigned a different service price',()=>{
  const result=focusMultiPriceAnswer(multiPrice,'Paljonko pihalaattojen pesu maksaa?');
  assert.equal(result.status,'unmatched');
  assert.equal(result.answer,'');
});

test('a generic price-list request preserves all source prices',()=>{
  const result=focusMultiPriceAnswer(multiPrice,'Mitä palvelunne maksavat?');
  assert.equal(result.status,'unchanged');
  assert.match(result.answer,/49/);
  assert.match(result.answer,/199/);
});

test('one verified price clause is left intact',()=>{
  const result=focusMultiPriceAnswer('Ikkunanpesu maksaa 49 €.','Paljonko ikkunanpesu maksaa?');
  assert.equal(result.status,'unchanged');
  assert.match(result.answer,/49/);
});

test('multiple possible price facts do not produce an arbitrary single price',()=>{
  const raw='Ikkunanpesu arkena maksaa 49 €. Ikkunanpesu viikonloppuna maksaa 69 €.';
  const result=focusMultiPriceAnswer(raw,'Paljonko ikkunanpesu maksaa?');
  assert.equal(result.status,'ambiguous');
  assert.equal(result.answer,'');
});

test('named weekend variant selects only its own amount',()=>{
  const raw='Ikkunanpesu arkena maksaa 49 €. Ikkunanpesu viikonloppuna maksaa 69 €.';
  const result=focusMultiPriceAnswer(raw,'Paljonko ikkunanpesu viikonloppuna maksaa?');
  assert.equal(result.status,'focused');
  assert.match(result.answer,/69/);
  assert.doesNotMatch(result.answer,/49/);
});

test('explicit question about two different services returns both cited prices',()=>{
  const result=focusMultiPriceAnswer(multiPrice,'Mitä ikkunanpesu ja katonpesu maksavat?');
  assert.equal(result.status,'focused');
  assert.match(result.answer,/49/);
  assert.match(result.answer,/199/);
});

for (const [lang,message] of [
  ['en','How much does roof cleaning cost?'],
  ['sv','Vad kostar taktvätt?']
]) {
  test('multilingual direct question does not use the first unrelated euro amount in '+lang,async()=>{
    const result=await generateGroundedAnswer({rows,message,lang});
    assert.equal(result.handoff,false,JSON.stringify(result));
    assert.match(result.answer,/199/);
    assert.doesNotMatch(result.answer,/49/);
    assert.deepEqual(result.sourceIds,['prices']);
  });
}

for(const [lang,question,message] of [
  ['fi','Pesettekö ikkunoita?','Paljonko se maksaa?'],
  ['en','Do you clean windows?','How much does that cost?'],
  ['sv','Tvättar ni fönster?','Vad kostar det?']
]){
  test('follow-up pricing is sourced from the specific prior service in '+lang,async()=>{
    const result=await generateGroundedAnswer({
      rows,message,lang,
      history:[{question,answer:'Aiempi vastaus ei ole hyväksytty hintatieto.'}]
    });
    assert.equal(result.handoff,false,JSON.stringify(result));
    assert.match(result.answer,/49/);
    assert.doesNotMatch(result.answer,/199/);
  });
}
