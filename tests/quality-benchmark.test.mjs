import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateResponse,summarizeQuality} from '../quality-benchmark.mjs';
test('rejects unsupported claims and missing facts',()=>{
 const r=evaluateResponse({question:'Mikä on hinta?',answer:'Hinta on 49 €/kk. Ilmainen ikuisesti.',expectedTerms:['49 €/kk'],forbiddenTerms:['ilmainen ikuisesti']});
 assert.equal(r.passed,false);assert.deepEqual(r.violations,['ilmainen ikuisesti']);
});
test('passes a grounded answer',()=>{
 assert.equal(evaluateResponse({question:'Mikä on hinta?',answer:'49 €/kk',expectedTerms:['49 €/kk']}).passed,true);
});
test('summary reports denominator and pass rate',()=>{
 const r=summarizeQuality([{question:'A',answer:'B'},{question:'A',answer:''}]);
 assert.equal(r.total,2);assert.equal(r.passRate,0.5);
});
