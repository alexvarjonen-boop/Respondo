import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeQuality} from '../quality-benchmark.mjs';
import {benchmarkCases} from '../quality-benchmark-cases.mjs';
test('all multilingual synthetic benchmark fixtures pass',()=>{
 const result=summarizeQuality(benchmarkCases);
 assert.equal(result.total,9);
 assert.equal(result.failed,0,JSON.stringify(result.results));
});
test('each language has facts, safety and workflow cases',()=>{
 for(const language of ['fi','sv','en'])
  assert.deepEqual(new Set(benchmarkCases.filter(c=>c.language===language).map(c=>c.category)),new Set(['facts','safety','workflow']));
});
