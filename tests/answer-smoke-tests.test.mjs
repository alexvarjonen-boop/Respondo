import test from 'node:test';
import assert from 'node:assert/strict';
import {gradeBotAnswer,runImportedAnswerSmokeTests} from '../answer-smoke-tests.mjs';
import {auditImportedKnowledge} from '../knowledge-readiness.mjs';
const rows=[{id:'a',category:'Palvelut',title:'Ikkunanpesu',answer:'Teemme ikkunanpesuja.'}];
const readiness=auditImportedKnowledge(rows);
test('runs actual generated multilingual questions rather than reporting imaginary passes',async()=>{
  let calls=0;
  const report=await runImportedAnswerSmokeTests({readiness,rows,answerQuestion:async(question,lang)=>{
    calls++;assert.ok(['fi','sv','en'].includes(lang));
    return {answer:'Kyllä, teemme ikkunanpesuja.',handoff:false,sourceIds:['a']};
  }});
  assert.equal(calls,18);
  assert.equal(report.executed,18);
  assert.equal(report.testsExecuted,true);
  assert.equal(report.accuracyVerified,false);
  assert.equal(report.counts.review,15);
  assert.equal(report.counts.grounded_candidate,3);
});
test('missing facts cannot pass on confident but unverified replies',()=>{
  const scenario={expectedEvidence:'missing'};
  assert.equal(gradeBotAnswer(scenario,{answer:'Yes it costs 49 euros',handoff:false,sourceIds:[]},new Set()).status,'review');
  assert.equal(gradeBotAnswer(scenario,{answer:'We cannot confirm that.',handoff:true,sourceIds:[]},new Set()).status,'safe');
});
test('foreign tenant source IDs are never accepted as proof',()=>{
  const scenario={expectedEvidence:'available'};
  assert.equal(gradeBotAnswer(scenario,{answer:'Yes',handoff:false,sourceIds:['foreign']},new Set(['a'])).status,'review');
  assert.equal(gradeBotAnswer(scenario,{answer:'Yes',handoff:false,sourceIds:['a']},new Set(['a'])).status,'grounded_candidate');
});
test('exceptions become review items and validation stays bounded',async()=>{
  let calls=0;
  const report=await runImportedAnswerSmokeTests({readiness,rows,limit:900,answerQuestion:async()=>{
    calls++;throw Error('upstream unavailable');
  }});
  assert.equal(calls,18);assert.equal(report.counts.review,18);
  assert.ok(report.results.every(r=>r.reason==='answer_error'));
});

test('unapproved knowledge and fabricated undefined IDs cannot make bot answer pass',async()=>{
  const report=await runImportedAnswerSmokeTests({
    readiness:{scenarios:[{topic:'services',language:'fi',question:'Mitä palveluja tarjoatte?',expectedEvidence:'available'}]},
    rows:[{category:'Palvelut',title:'Palvelu',answer:'Palvelua tarjotaan.'}],
    answerQuestion:async()=>({answer:'Kyllä.',handoff:false,sourceIds:['undefined']}),
  });
  assert.equal(report.results[0].status,'review');
  const unapproved=[{id:'candidate',approved:false,category:'Palvelut',title:'Palvelu',answer:'Palvelua tarjotaan.'}];
  assert.equal(gradeBotAnswer({expectedEvidence:'available',topic:'services'},
    {answer:'Kyllä.',handoff:false,sourceIds:['candidate']},new Set(['candidate']),unapproved).status,'review');
});
