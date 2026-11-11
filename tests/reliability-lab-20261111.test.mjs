import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 detectKnowledgeConflicts,checkLanguageLinks,knowledgeAuditSummary,
 screenRecordedAnswers,groupedJourney,ownerAlerts,ownerComplianceChecklist,reliabilityOverview
} from '../respondo-reliability-lab.mjs';
import {
 ensureManualVersionSchema,listManualVersions,createManualVersion,restoreManualVersion
} from '../respondo-manual-versions.mjs';

const tenant='aa200a82-194c-4b39-9719-403e738a2e5d';
const other='cd323430-9777-496b-86e2-7a12ad909335';
const version='f4548a0f-4aef-40fa-9cf9-243ff3b8496a';
const answerId='e11842f2-e2be-48b4-9a9f-7e23468dd2b6';
const record=(value,{id=answerId,title='Peruspesun hinta',category='Hinnat'}={})=>({
 id,title,category,answer:value,source_type:'manual',approved:true,
 keywords:[],verified_at:'2026-11-11T06:00:00Z',source_url:null,
 quick_reply_order:null
});
const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('same exact approved title with different prices is only a review warning',()=>{
 const rows=[record('Peruspesu 59 euroa.'),record('Peruspesu 79 euroa.',{
  id:'f9074d27-39a2-4be4-8f5e-e15bd375b9fa'
 })];
 const result=detectKnowledgeConflicts(rows);
 assert.equal(result.length,1);
 assert.equal(result[0].kind,'different_prices');
 assert.deepEqual(result[0].prices,[59,79]);
 assert.equal(result[0].automaticallyResolved,false);
 assert.equal(result[0].ownerReviewRequired,true);
 assert.equal(detectKnowledgeConflicts([rows[0],{...rows[1],category:'Different product'}]).length,0);
 assert.equal(detectKnowledgeConflicts([rows[0],{...rows[1],approved:false}]).length,0);
});

test('different approved answers without a price are not misrepresented as definite errors',()=>{
 const rows=[record('Yes'),record('We will check',{
  id:'243d441c-adcc-4a1d-8160-456a8525dbe2'
 })];
 assert.equal(detectKnowledgeConflicts(rows)[0].kind,'different_answers');
 assert.equal(detectKnowledgeConflicts(rows)[0].ownerReviewRequired,true);
});

test('locale link checker only flags explicit FI, SV, EN labeled mismatches',()=>{
 const rows=[record('Read https://example.com/help?lang=fi',{
  id:answerId,category:'Respondo · EN · Help'
 }),record('See https://example.com/help?lang=en',{
  id:'a2f28cd9-8089-4a37-baa0-1b2d7ac597fd',category:'Respondo · EN · Help'
 })];
 const result=checkLanguageLinks(rows);
 assert.equal(result.length,1);
 assert.equal(result[0].expected,'en');
 assert.equal(result[0].found,'fi');
 assert.equal(result[0].verifiedByBrowser,false);
 assert.equal(checkLanguageLinks([record('help?lang=fi')]).length,0);
});

test('knowledge score is topic coverage, not measured model accuracy',()=>{
 const rows=[
  record('Ikkunanpesua', {category:'Palvelut',title:'Palvelut'}),
  record('59 euroa', {category:'Hinnat',title:'Hinnat'})
 ];
 const result=knowledgeAuditSummary(rows);
 assert.equal(result.approvedFacts,2);
 assert.equal(result.scoreMeaning,'approved_topic_coverage_not_answer_quality');
 assert.equal(result.notModelAccuracy,true);
 assert.equal(result.automaticChanges,0);
 assert.ok(result.coveragePercent<100);
 assert.ok(result.missingTopics.length>=1);
});

test('recorded test lab avoids claiming actual chat execution or factual verification',()=>{
 const data=screenRecordedAnswers([
  {id:answerId,question:'Is it booked?',answer:'Your booking is confirmed.'},
  {id:'a3c34129-1b4a-4f1f-aa03-1fac474c896b',
    question:'What time?',answer:'We will check.'}
 ]);
 assert.equal(data.recordedRepliesScreened,2);
 assert.equal(data.flagged,1);
 assert.equal(data.actualLiveBotExecutions,0);
 assert.equal(data.factualCorrectnessProven,false);
 assert.equal(data.providerCalls,0);
 assert.ok(data.findingsByType.some(x=>x.code==='unverified_booking'));
});

test('journey report removes query strings and never asserts conversions',()=>{
 const result=groupedJourney([
  {page_url:'https://example.org/pricing?email=private@example.org',handoff:true},
  {page_url:'https://example.org/pricing?token=secret',handoff:false},
  {page_url:'bad',handoff:false}
 ]);
 const pricing=result.find(x=>x.page==='/pricing');
 assert.equal(pricing.replies,2);
 assert.equal(pricing.handoffs,1);
 assert.ok(result.every(x=>!x.page.includes('@')&&!x.page.includes('token=')));
});

test('alerts stay inside owner dashboard and compliance remains unverified',()=>{
 const result=ownerAlerts({overdue:2,approvals:1,uncertain:3,conflicts:0});
 assert.equal(result.items.length,3);
 assert.equal(result.externalNotificationsSent,false);
 assert.equal(result.items[0].target,'automation');
 const checks=ownerComplianceChecklist();
 assert.equal(checks.verifiedLegalCompliance,false);
 assert.equal(checks.legalAdvice,false);
 assert.equal(checks.checks.length,6);
});

test('snapshot schema enforces tenant isolation against public Data API users',async()=>{
 const statements=[];
 const db={query:async(sql)=>{
  statements.push(sql);
  return sql.includes('SELECT rolname')?{rows:[
   {rolname:'anon'},{rolname:'authenticated'},{rolname:'service_role'}
  ]}:{rows:[]};
 }};
 await ensureManualVersionSchema(db);
 const s=statements.join('\n');
 assert.match(s,/REFERENCES public\.tenants\(id\) ON DELETE CASCADE/);
 assert.match(s,/ENABLE ROW LEVEL SECURITY/);
 for(const role of ['anon','authenticated','service_role'])
  assert.match(s,new RegExp('FROM '+role+'(?:\\n|$)'));
});

test('version listing reads only active tenant without exposing answer bodies',async()=>{
 const calls=[];
 const db={query:async(sql,args)=>{calls.push({sql,args});return {rows:[
  {id:version,label:'Checkpoint',count:3,created_at:'2026-11-11'}
 ]};}};
 const result=await listManualVersions(db,tenant);
 assert.equal(result.scope,'manual_and_owner_answer_only');
 assert.equal(result.automaticSnapshots,false);
 assert.deepEqual(calls[0].args,[tenant]);
 assert.match(calls[0].sql,/WHERE tenant_id=\$1/);
});

test('creating snapshot requires approval, locks tenant, saves only manual facts',async()=>{
 let queries=[];
 const db={connect:async()=>({query:async(sql,args)=>{
  queries.push({sql,args});
  if(sql.startsWith('SELECT id FROM tenants'))return {rowCount:1,rows:[{id:tenant}]};
  if(sql.startsWith('SELECT id,category'))return {rows:[record('59 euroa')]};
  if(sql.includes('INSERT INTO respondo_manual_knowledge_versions'))
   return {rows:[{id:version,label:'Snapshot'}],rowCount:1};
  return {rows:[]};
 },release(){}})};
 await assert.rejects(createManualVersion(db,tenant,'owner',{}),/confirmation/);
 const result=await createManualVersion(db,tenant,'owner',{confirm:true,label:'Before edits'});
 assert.equal(result.saved,1);
 assert.equal(queries[0].sql,'BEGIN');
 assert.equal(queries.at(-1).sql,'COMMIT');
 assert.ok(queries.some(x=>/source_type IN \('manual','owner_answer'\)/.test(x.sql)));
 assert.ok(queries.every(x=>!x.sql.includes('DELETE FROM knowledge')));
});

test('restore requires exact phrase; unpublishes extras but never deletes cited data',async()=>{
 const queries=[],saved=record('Before');
 const db={connect:async()=>({query:async(sql,args)=>{
  queries.push({sql,args});
  if(sql.startsWith('SELECT id FROM tenants'))return {rowCount:1,rows:[{id:tenant}]};
  if(sql.startsWith('SELECT entries'))return {rows:[{entries:[saved]}]};
  if(sql.startsWith('SELECT id,category'))return {rows:[record('After')]};
  if(sql.startsWith('INSERT INTO knowledge'))return {rowCount:1,rows:[{id:answerId}]};
  return {rowCount:1,rows:[]};
 },release(){}})};
 await assert.rejects(restoreManualVersion(db,tenant,version,'owner',{
  confirm:true,phrase:'restore'
 }),/Exact restore/);
 const result=await restoreManualVersion(db,tenant,version,'owner',{
  confirm:true,phrase:'RESTORE MANUAL ANSWERS'
 });
 assert.equal(result.restored,1);
 assert.equal(result.websiteImportsUnchanged,true);
 assert.equal(result.rollbackCheckpointSaved,true);
 assert.ok(queries.some(x=>x.sql.includes('UPDATE knowledge SET approved=FALSE')));
 assert.ok(queries.some(x=>x.sql.includes('knowledge.tenant_id=EXCLUDED.tenant_id')));
 assert.ok(queries.every(x=>!x.sql.includes('DELETE FROM knowledge')));
 assert.equal(queries.at(-1).sql,'COMMIT');
});

test('restore does nothing when snapshot belongs to a different company',async()=>{
 const calls=[];
 const db={connect:async()=>({query:async(sql,args)=>{
  calls.push(sql);
  if(sql.startsWith('SELECT id FROM tenants'))return {rowCount:1,rows:[{id:tenant}]};
  if(sql.startsWith('SELECT entries'))return {rows:[]};
  return {rows:[]};
 },release(){}})};
 await assert.rejects(restoreManualVersion(db,other,version,'owner',{
  confirm:true,phrase:'RESTORE MANUAL ANSWERS'
 }),/not found/);
 assert.equal(calls.at(-1),'ROLLBACK');
 assert.equal(calls.some(x=>x.includes('UPDATE knowledge')),false);
});

test('reliability API returns tenant-scoped records and no invented paid conversions',async()=>{
 const queries=[];
 const db={query:async(sql,args)=>{
  queries.push({sql,args});
  if(sql.includes('FROM knowledge'))return {rows:[record('Hours 8-16')]};
  if(sql.includes('FROM conversations'))return {rows:[]};
  if(sql.includes('FROM respondo_native_tasks'))return {rows:[{overdue:2}]};
  if(sql.includes('FROM respondo_free_workflow_approvals'))return {rows:[{pending:1}]};
  if(sql.includes('FROM respondo_manual_knowledge_versions'))return {rows:[]};
  throw Error('Unexpected '+sql);
 }};
 const result=await reliabilityOverview(db,tenant);
 assert.equal(result.alerts.items.length,2);
 assert.equal(result.customerResolutionVerified,false);
 assert.equal(result.newPaidServices,0);
 assert.ok(queries.every(x=>x.args?.[0]===tenant && /tenant_id=\$1/.test(x.sql)));
});

test('dashboard includes owner confirmation, consent-based fallback and scoped endpoints',()=>{
 const server=file('server.mjs'),entry=file('server-entry.mjs'),
  ui=file('public/reliability-console.js'),widget=file('public/widget.js'),
  index=file('public/index.html');
 for(const path of ['/api/app/native/reliability','/api/app/native/manual-versions',
  '/api/app/native/manual-versions/:versionId/restore'])assert.ok(server.includes(path));
 assert.match(server,/native\/reliability',auth,ownerOnly,subscribed/);
 assert.match(server,/manual-versions',auth,ownerOnly,subscribed/);
 assert.match(server,/manual-versions\/:versionId\/restore',\s*auth,ownerOnly,subscribed/);
 assert.match(entry,/ensureManualVersionSchema\(pool\)/);
 assert.match(ui,/RESTORE MANUAL ANSWERS/);
 assert.match(ui,/confirm:true,phrase/);
 assert.match(ui,/data\.compliance\?\.checks/);
 assert.match(widget,/showLeadForm\(message\)/);
 assert.match(widget,/rememberSessionMessage\(pending\.textContent,'bot'\)/);
 assert.match(index,/reliability-console\.css/);
 assert.match(index,/reliability-console\.js/);
});
