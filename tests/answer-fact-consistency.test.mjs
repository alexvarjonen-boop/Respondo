import test from 'node:test';
import assert from 'node:assert/strict';
import {checkCitedNumericalClaims} from '../answer-fact-consistency.mjs';
import {gradeBotAnswer} from '../answer-smoke-tests.mjs';

const row=(id,category,answer)=>({id,title:category,category,answer});
test('flags fabricated euro price even with a valid tenant source id',()=>{
 const rows=[row('mine','Hinnat','Ikkunanpesu maksaa 49 € / tunti.')];
 const verdict=gradeBotAnswer({expectedEvidence:'available',topic:'pricing'},
   {answer:'Ikkunanpesu maksaa 99 € / tunti.',handoff:false,sourceIds:['mine']},
   new Set(['mine']),rows);
 assert.equal(verdict.status,'review');
 assert.equal(verdict.reason,'numeric_value_not_in_cited_sources');
});
test('accepts matching numeric values only as grounded candidate, not verified truth',()=>{
 const rows=[row('a','Hinnat','Ikkunanpesu maksaa 49,90 € tunnilta')];
 const verdict=gradeBotAnswer({expectedEvidence:'available',topic:'pricing'},
   {answer:'Ikkunanpesu maksaa 49.90 € tunnilta.',handoff:false,sourceIds:['a']},
   new Set(['a']),rows);
 assert.equal(verdict.status,'grounded_candidate');
 assert.equal(verdict.reason,'numeric_values_match_cited_sources');
});
test('ignores numbers from unrelated sources or tenants',()=>{
 const rows=[row('price','Hinnat','Hinta 49 €'),row('unrelated','Hinnat','Hinta 99 €')];
 const verdict=gradeBotAnswer({expectedEvidence:'available',topic:'pricing'},
   {answer:'Hinta on 99 €',handoff:false,sourceIds:['price']},
   new Set(['price','unrelated']),rows);
 assert.equal(verdict.status,'review');
});
test('checks delivery duration and clock times independently',()=>{
 assert.equal(checkCitedNumericalClaims({
  topic:'delivery',answer:'Delivery takes 5 days.',sourceRows:[row('d','Toimitus','Delivery takes 3 days.')],
 }).status,'review');
 assert.equal(checkCitedNumericalClaims({
  topic:'hours',answer:'Auki 09:00–17:00.',sourceRows:[row('h','Aukioloajat','Auki 09:00–17:00.')],
 }).status,'no_numeric_conflict_found');
 assert.equal(checkCitedNumericalClaims({
  topic:'hours',answer:'Auki 10:00–17:00.',sourceRows:[row('h','Aukioloajat','Auki 09:00–17:00.')],
 }).status,'review');
});
test('never invents confidence when answer contains no comparable numeric claims',()=>{
 assert.equal(checkCitedNumericalClaims({
  topic:'pricing',answer:'Pyydä tarjous yritykseltä.',sourceRows:[row('p','Hinnat','Hinta pyynnöstä')],
 }).status,'not_checked');
});
