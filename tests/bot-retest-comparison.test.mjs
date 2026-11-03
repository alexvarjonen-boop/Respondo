import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {compareBotValidationRuns} from '../bot-retest-comparison.mjs';

const sample=(question,status,reason='',language='fi',topic='pricing')=>({question,status,reason,language,topic});
test('identical questions are compared and failed results becoming grounded remain only candidates',()=>{
  const before={results:[sample('Paljonko?', 'review','answer_without_verified_source'),sample('Milloin?', 'safe','missing_fact_handoff')]};
  const after={results:[sample('Paljonko?', 'grounded_candidate','source_references_present'),sample('Milloin?', 'safe','missing_fact_handoff')]};
  const diff=compareBotValidationRuns(before,after);
  assert.equal(diff.improvedCandidates,1);
  assert.equal(diff.regressions,0);
  assert.equal(diff.unchanged,1);
  assert.equal(diff.accuracyVerified,false);
  assert.equal(diff.automaticChangesApplied,0);
});
test('previously safe or source-backed answers becoming unsupported are regressions',()=>{
  const before={results:[sample('Hinta?', 'grounded_candidate','numeric_values_match_cited_sources'),sample('Auki?', 'safe','missing_fact_handoff')]};
  const after={results:[sample('Hinta?', 'review','numeric_value_not_in_cited_sources'),sample('Auki?', 'review','unexpected_source')]};
  const diff=compareBotValidationRuns(before,after);
  assert.equal(diff.regressions,2);
  assert.ok(diff.changes.every(x=>x.classification==='regression'));
});
test('language and topic are part of comparison identity, not loosely matched',()=>{
  const before={results:[sample('Price?', 'review','x','en')]};
  const after={results:[sample('Price?', 'grounded_candidate','source_references_present','sv')]};
  const diff=compareBotValidationRuns(before,after);
  assert.equal(diff.compared,0);
  assert.equal(diff.newCases,1);
  assert.equal(diff.improvedCandidates,0);
});
test('uncertain changes do not count as fixes and missing baselines are disclosed',()=>{
  const diff=compareBotValidationRuns({}, {results:[sample('New','review','answer_error')]});
  assert.equal(diff.baselineAvailable,false);
  assert.equal(diff.compared,0);
  assert.equal(diff.newCases,1);
});
test('retest endpoint runs only for approved active tenant job and uses persisted tenant facts',async()=>{
  const server=await readFile(new URL('../server.mjs',import.meta.url),'utf8');
  const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
  assert.match(server,/app\.post\('\/api\/app\/import-website\/retest\/:jobId', auth, ownerOnly, subscribed/);
  assert.match(server,/job\.userId!==req\.user\.sub \|\| job\.tenantId!==tenant\.id/);
  assert.match(server,/if\(revision<1\)/);
  assert.match(server,/WHERE tenant_id=\$1 AND approved=true ORDER BY updated_at DESC LIMIT 10000/);
  assert.match(server,/approvalRevision=Number\(job\.approvalRevision\|\|0\)\+1/);
  assert.match(server,/compareBotValidationRuns\(before,validation\)/);
  assert.match(app,/import-website\/retest\//);
  assert.match(app,/Retesting approved company facts/);
  assert.match(app,/Results do not prove factual correctness/);
});
