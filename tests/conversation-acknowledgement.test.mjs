import test from 'node:test';
import assert from 'node:assert/strict';
import {generateGroundedAnswer} from '../server.mjs';

test('short acknowledgements never trigger fallback or contact handoff', async()=>{
  const cases=[
    ['okei kiitos','fi'],
    ['ok kiitos','fi'],
    ['joo kiitos','fi'],
    ['selvä','fi'],
    ['okei','fi'],
    ['okay thanks','en'],
    ['got it','en'],
    ['no thanks','en'],
    ['okej tack','sv'],
    ['nej tack','sv'],
  ];

  for (const [message,lang] of cases) {
    const result=await generateGroundedAnswer({rows:[],message,lang});
    assert.equal(result.handoff,false,message+' should not hand off');
    assert.equal(result.confidence,1,message+' should be certain');
    assert.equal(result.sourceIds.length,0,message+' should not need knowledge sources');
    assert.equal(result.selected.length,0,message+' should not select knowledge rows');
  }
});

test('acknowledgement prefix does not swallow a real follow-up question', async()=>{
  const result=await generateGroundedAnswer({rows:[],message:'joo paljonko maksaa?',lang:'fi'});
  assert.equal(result.handoff,true,JSON.stringify(result));
});
