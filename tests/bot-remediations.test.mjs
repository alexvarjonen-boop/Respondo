import test from 'node:test';
import assert from 'node:assert/strict';
import {suggestBotRemediations} from '../bot-remediations.mjs';
import {readFile} from 'node:fs/promises';

const result=(reason,topic='pricing',question='Paljonko maksaa?')=>({status:'review',reason,topic,question});

test('separates shared answer bugs from missing customer data without mutating facts',()=>{
 const audit=suggestBotRemediations({readiness:{missing:['hours'],warnings:[]},results:[
   result('numeric_value_not_in_cited_sources'),
   result('answer_without_verified_source'),
   result('handoff_despite_imported_evidence','services'),
 ]});
 assert.equal(audit.automaticChangesApplied,0);
 assert.equal(audit.manualReviewRequired,true);
 assert.equal(audit.summary.sharedLogic,3);
 assert.equal(audit.summary.companyFacts,1);
 assert.ok(audit.recommendations.some(x=>x.scope==='company'&&x.code==='missing_information'&&x.topic==='hours'));
 assert.ok(audit.recommendations.some(x=>x.scope==='shared_logic'&&x.nextStep==='review_value_and_source_matching'));
});

test('groups recurring bugs instead of creating one manual task per variant',()=>{
 const audit=suggestBotRemediations({results:[
  result('numeric_value_not_in_cited_sources','pricing','Onko 49 €?'),
  result('numeric_value_not_in_cited_sources','pricing','Paljonko?'),
  result('numeric_value_not_in_cited_sources','pricing','Maksu?'),
 ]});
 assert.equal(audit.recommendations.length,1);
 assert.equal(audit.recommendations[0].count,3);
 assert.equal(audit.recommendations[0].examples.length,2);
});

test('failed and successful answers do not become fake fixes',()=>{
 const audit=suggestBotRemediations({readiness:{missing:[]},results:[
  {status:'grounded_candidate',reason:'source_references_present',topic:'pricing'},
  {status:'safe',reason:'missing_fact_handoff',topic:'hours'},
 ]});
 assert.equal(audit.manualReviewRequired,false);
 assert.deepEqual(audit.recommendations,[]);
});

test('conflicting source information stays human-reviewed, no automatic overwrite',()=>{
 const audit=suggestBotRemediations({readiness:{warnings:[
  {type:'conflicting_duplicate_titles',titles:['Hinta']},
  {type:'suspected_noise',count:3},
 ]}});
 assert.equal(audit.automaticChangesApplied,0);
 assert.equal(audit.summary.companyFacts,2);
 assert.ok(audit.recommendations.every(x=>x.scope==='company'));
});

test('unknown inputs cannot write executable commands or flood the report',()=>{
 const audit=suggestBotRemediations({readiness:{missing:['__proto__','pricing']},results:Array.from({length:500},(_,i)=>result('unknown_reason','unknown_topic','question '+i))});
 assert.ok(audit.recommendations.length<=30);
 assert.equal(audit.recommendations.some(x=>x.topic==='__proto__'),false);
 assert.equal(audit.recommendations.find(x=>x.code==='needs_review').count,100);
});

test('web UI presents recommendations without automatically approving company facts',async()=>{
 const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
 const server=await readFile(new URL('../server.mjs',import.meta.url),'utf8');
 assert.match(app,/Recommended fixes/);
 assert.match(app,/Company facts are not changed automatically/);
 assert.match(server,/validation\.remediations=suggestBotRemediations/);
 assert.match(app,/li\.textContent=prefix/);
});
