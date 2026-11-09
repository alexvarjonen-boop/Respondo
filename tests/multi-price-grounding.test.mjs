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
