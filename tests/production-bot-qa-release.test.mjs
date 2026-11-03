import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { auditImportedKnowledge } from '../knowledge-readiness.mjs';
import { compareBotValidationRuns } from '../bot-retest-comparison.mjs';

const server=await readFile(new URL('../server.mjs',import.meta.url),'utf8');
const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');

test('production preserves existing crawl coverage, subscriptions and onboarding checkup',()=>{
 assert.match(server,/coverage:websiteImportCoverage\(bundle,candidates\)/);
 assert.match(server,/readiness:auditImportedKnowledge\(candidates\)/);
 assert.match(server,/await enqueueOnboardingCheckup\(client,tenantId\)/);
 assert.match(server,/app\.post\('\/api\/app\/import-website\/start', auth, ownerOnly, subscribed/);
});

test('production audit runs tenant scoped bot checks and protects active workspace',()=>{
 assert.match(server,/app\.post\('\/api\/app\/import-website\/validate\/:jobId', auth, ownerOnly, subscribed/);
 assert.match(server,/app\.post\('\/api\/app\/import-website\/retest\/:jobId', auth, ownerOnly, subscribed/);
 assert.match(server,/job\.userId!==req\.user\.sub \|\| job\.tenantId!==tenant\.id/);
 assert.match(server,/WHERE tenant_id=\$1 AND approved=true ORDER BY updated_at DESC LIMIT 10000/);
 assert.match(server,/compareBotValidationRuns\(before,validation\)/);
});

test('production dashboard keeps existing scan coverage and adds multilingual QA report',()=>{
 assert.match(app,/const summary=result\.coverage/);
 assert.match(app,/websiteImportQualityReport/);
 assert.match(app,/websiteImportRetestSummary/);
 assert.match(app,/Recommended fixes/);
 assert.match(app,/Retesting approved company facts/);
 assert.match(app,/Results do not prove factual correctness/);
 assert.match(app,/approveWebsiteImport/);
});

test('audit reports uncertainty and regression comparison never fabricates passes',()=>{
 const report=auditImportedKnowledge([{id:'1',category:'Palvelut',title:'Ikkunanpesu',answer:'Teemme ikkunanpesua.'}]);
 assert.equal(report.testsExecuted,false);
 const result=compareBotValidationRuns({results:[{topic:'services',language:'fi',question:'Mitä teette?',status:'grounded_candidate',reason:'source_references_present'}]},{
  results:[{topic:'services',language:'fi',question:'Mitä teette?',status:'review',reason:'answer_without_verified_source'}]});
 assert.equal(result.regressions,1);
 assert.equal(result.accuracyVerified,false);
});
