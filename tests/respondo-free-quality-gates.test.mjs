import test from 'node:test';
import assert from 'node:assert/strict';
import {runFreeQualitySuite,evaluateFreeQualityScenario,freeQualityScenarios}
 from '../respondo-free-quality-gates.mjs';
const sample={language:'fi',question:'Onko varaus vahvistettu?',answer:'Varaus on vahvistettu.'};
test('unsupported booking claim is critical without ledger proof',()=>{
 const r=evaluateFreeQualityScenario(sample);
 assert.equal(r.severity,'critical');
 assert(r.flags.some(x=>x.code==='unverified_booking'));
 assert.equal(r.externalApiCalls,0);
});
test('verified booking proof prevents the specific unsupported-claim flag',()=>{
 const r=evaluateFreeQualityScenario({...sample,proof:{bookingConfirmed:true}});
 assert(!r.flags.some(x=>x.code==='unverified_booking'));
 assert.equal(r.factualCorrectnessProven,false);
});
test('detects unverified refund, payment, shipment and quoted price',()=>{
 for(const [answer,code] of [
  ['We charged your card.','unverified_payment'],
  ['Your refund was processed.','unverified_refund'],
  ['Your order shipped.','unverified_order'],
  ['The price is 200 €.','unverified_price']
 ]){
  const r=evaluateFreeQualityScenario({language:'en',question:'What happened?',answer});
  assert(r.flags.some(x=>x.code===code),answer);
 }
});
test('FI SV EN examples and no-cost batch gate',()=>{
 const data=runFreeQualitySuite({cases:freeQualityScenarios()});
 assert.equal(data.total,6);
 assert.equal(data.providerCalls,0);
 assert.equal(data.paidAiCalls,0);
 assert.equal(data.automaticSafetyScreenOnly,true);
 assert.equal(data.notFullAccuracyValidation,true);
 assert.equal(data.gatePass,false);
});
test('safe customer clarification is not falsely flagged as booking',()=>{
 const cases=[
  {language:'fi',question:'Onko perjantai vapaa?',answer:'Tarkistamme vapaana olevat ajat. Kerro työn laajuus.'},
  {language:'sv',question:'När kan ni komma?',answer:'Tack! Ange tjänst och önskad tid.'},
  {language:'en',question:'Can I book?',answer:'Please confirm the service and number of items first.'}
 ];
 const r=runFreeQualitySuite({cases});
 assert.equal(r.flagged,0);
 assert.equal(r.gatePass,true);
});
test('safety regression batches are capped at 100 cases',()=>{
 assert.throws(()=>runFreeQualitySuite({cases:[]}),/1–100/);
 assert.throws(()=>runFreeQualitySuite({cases:new Array(101).fill(sample)}),/1–100/);
 assert.throws(()=>evaluateFreeQualityScenario({...sample,language:'xx'}),/FI, SV or EN/);
});
