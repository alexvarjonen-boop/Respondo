import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 ensureScheduledQualitySchema,claimScheduledQualityRun,
 executeScheduledQualityRun,scheduledQualityOverview
} from '../respondo-scheduled-quality.mjs';
import {
 validateOwnerSale,ensureOwnerSalesSchema,recordOwnerSale,
 retractOwnerSale,summarizeOwnerSales,ownerSalesOverview
} from '../respondo-sales-evidence.mjs';
import {
 capabilityHealthSummary,capabilityHealthOverview
} from '../respondo-capability-health.mjs';

const company='5de52615-a4bc-4884-bcdb-020e0f20f232';
const owner='f965a9b5-9311-4a57-9677-0919b50a4692';
const request='88e1799a-663d-4f2b-aad7-cd4f157e1dd7';
const other='8a4ed77a-a7dc-48ca-9d0d-550b94775dcc';
const run='ae80132d-1bfd-46ee-87cc-d6a7e8b543d2';
const sourceId='63e9037a-1b71-4730-ac17-166357f356a0';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('new persistent data tables have tenant ownership and no public Data API rights',async()=>{
 const statements=[];
 const db={query:async(sql)=>{
  statements.push(sql);
  return sql.includes('SELECT rolname')?{rows:[{rolname:'anon'},{rolname:'authenticated'},{rolname:'service_role'}]}:{rows:[]};
 }};
 await ensureScheduledQualitySchema(db);
 await ensureOwnerSalesSchema(db);
 const sql=statements.join('\n');
 assert.match(sql,/UNIQUE\(tenant_id,period_day\)/);
 assert.match(sql,/UNIQUE\(tenant_id,action_request_id\)/);
 assert.match(sql,/REFERENCES public.tenants\(id\) ON DELETE CASCADE/);
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
 for(const role of ['anon','authenticated','service_role'])
  assert.match(sql,new RegExp('FROM '+role+'(?:\\n|$)'));
});

test('scheduled checker claims one subscribed tenant per day without duplicate runs',async()=>{
 const calls=[];
 const db={query:async(sql,params)=>{calls.push([sql,params]);return {rows:[{id:run,tenant_id:company}]}}};
 const claim=await claimScheduledQualityRun(db);
 assert.equal(claim.tenant_id,company);
 assert.match(calls[0][0],/subscription_status IN \('active','trialing'\)/);
 assert.match(calls[0][0],/NOT EXISTS/);
 assert.match(calls[0][0],/ON CONFLICT\(tenant_id,period_day\) DO NOTHING/);
});

test('synthetic company test runs actual supplied reply engine without writing customer conversations',async()=>{
 const calls=[],inputs=[];
 const db={query:async(sql,args)=>{
  calls.push([sql,args]);
  if(sql.includes('SELECT name FROM tenants'))return {rows:[{name:'Example company'}]};
  if(sql.includes('FROM knowledge'))return {rows:[
   {id:sourceId,title:'Opening hours',category:'Aukioloajat',
    answer:'Open Mon-Fri 08:00-16:00',approved:true,source_type:'website',
    source_url:'https://example.org/hours'}
  ]};
  return {rows:[],rowCount:1};
 }};
 const result=await executeScheduledQualityRun(db,{id:run,tenant_id:company},async(input)=>{
  inputs.push(input);
  return {handoff:false,answer:'Open Mon-Fri 08:00-16:00',sourceIds:[sourceId]};
 });
 assert.equal(result.tenantId,company);
 assert.equal(result.executed,18);
 assert.equal(result.accuracyVerified,false);
 assert.equal(inputs.length,18);
 assert(inputs.every(x=>x.companyName==='Example company'&&x.rows[0].id===sourceId));
 assert(calls.every(([sql,args])=> !sql.includes('conversations') &&
  (!sql.includes('WHERE tenant_id=$1')||args?.[0]===company)));
 const saved=calls.find(([sql])=>sql.includes("SET status='complete'"));
 assert.equal(saved[1][0],run);
 assert.equal(saved[1][1],company);
 const report=JSON.parse(saved[1][6]);
 assert.equal(report.actualBotExecutions,true);
 assert.equal(report.factualAccuracyVerified,false);
 assert.equal(report.outboundCustomerMessages,0);
 assert.equal(report.results.length,18);
 assert(!JSON.stringify(report).includes('Open Mon-Fri'));
});

test('a failed scheduled checker persists failure but never a guessed accuracy score',async()=>{
 const calls=[];
 const db={query:async(sql,args)=>{
  calls.push([sql,args]);
  if(sql.includes('SELECT name FROM tenants'))throw Error('db unavailable');
  return {rows:[]};
 }};
 await assert.rejects(executeScheduledQualityRun(db,{id:run,tenant_id:company},async()=>({})),/db unavailable/);
 assert(calls.some(([sql])=>sql.includes("status='failed'")));
 assert(!calls.some(([sql])=>sql.includes("status='complete'")));
});

test('synthetic quality history is owner-workspace scoped',async()=>{
 const calls=[];
 const db={query:async(sql,args)=>{calls.push([sql,args]);return {rows:[]}}};
 const result=await scheduledQualityOverview(db,company);
 assert.equal(result.accuracyVerified,false);
 assert.equal(result.customerMessagesSent,false);
 assert.deepEqual(calls[0][1],[company]);
 assert.match(calls[0][0],/WHERE tenant_id=\$1/);
 await assert.rejects(scheduledQualityOverview(db,'notuuid'),TypeError);
});

test('owner sale requires existing request, explicit confirmation and evidence reference',()=>{
 assert.throws(()=>validateOwnerSale({actionRequestId:request,amountCents:12900,reference:'INV-2026-001'}),/confirm/);
 assert.throws(()=>validateOwnerSale({actionRequestId:request,amountCents:0,reference:'INV-2026-001',confirm:true}),/amount/);
 assert.throws(()=>validateOwnerSale({actionRequestId:request,amountCents:12900,reference:'ab',confirm:true}),/reference/);
 assert.throws(()=>validateOwnerSale({actionRequestId:request,amountCents:12900,reference:'INV-2026-001',currency:'USD',confirm:true}),/EUR/);
 assert.equal(validateOwnerSale({actionRequestId:request,amountCents:12900,reference:'INV-2026-001',confirm:true}).verifiedByPaymentProvider,false);
});

test('owner sale SQL binds request, owner and tenant and never counts subscription revenue',async()=>{
 const calls=[];
 const db={query:async(sql,args)=>{
  calls.push([sql,args]);
  return {rows:[{id:other,amount_cents:12900,status:'owner_confirmed'}]};
 }};
 const result=await recordOwnerSale(db,company,owner,{
  actionRequestId:request,amountCents:12900,reference:'INV-2026-001',confirm:true
 });
 assert.equal(result.status,'owner_confirmed');
 assert.deepEqual(calls[0][1],[company,request,12900,'INV-2026-001',owner]);
 assert.match(calls[0][0],/a.tenant_id=\$1 AND a.id=\$2/);
 assert.match(calls[0][0],/ON CONFLICT\(tenant_id,action_request_id\) DO NOTHING/);
 assert.doesNotMatch(calls[0][0],/stripe_subscription|subscription_price/);
});

test('retraction retains an audit trail and cannot affect a different owner account',async()=>{
 const calls=[];
 const db={query:async(sql,args)=>{calls.push([sql,args]);return {rows:[{id:other,status:'retracted'}]}}};
 assert.equal((await retractOwnerSale(db,company,other,owner,'Refunded invoice')).status,'retracted');
 assert.deepEqual(calls[0][1],[company,other,owner,'Refunded invoice']);
 assert.match(calls[0][0],/confirmed_by=\$3/);
 assert.match(calls[0][0],/status='owner_confirmed'/);
 assert.throws(()=>validateOwnerSale({confirm:true,actionRequestId:request,amountCents:1.4,reference:'INV-2026'}),/whole cents/);
});

test('only unretracted owner sales count, and attribution is not platform verification',()=>{
 const x=summarizeOwnerSales([
  {status:'owner_confirmed',amount_cents:10000,attributed:true},
  {status:'owner_confirmed',amount_cents:4000,attributed:false},
  {status:'retracted',amount_cents:20000,attributed:true}
 ]);
 assert.equal(x.ownerConfirmedSales,2);
 assert.equal(x.ownerConfirmedRevenueCents,14000);
 assert.equal(x.attributedOwnerConfirmedRevenueCents,10000);
 assert.equal(x.platformVerifiedRevenueCents,0);
 assert.equal(x.independentPaymentVerification,false);
});

test('revenue queries only read active tenant and require visitor/channel match',async()=>{
 const calls=[];
 const db={query:async(sql,args)=>{
  calls.push([sql,args]);
  return sql.trim().startsWith('SELECT s.id')?
   {rows:[{id:other,status:'owner_confirmed',amount_cents:9900,attributed:true,
    action_request_id:request,confirmed_at:'2026-11-12T08:00:00Z'}]}:
   {rows:[{id:request,request_type:'quote',created_at:'2026-11-12'}]};
 }};
 const result=await ownerSalesOverview(db,company,30);
 assert.equal(result.summary.attributedOwnerConfirmedRevenueCents,9900);
 assert.equal(result.customerDetailsExposed,false);
 assert.equal(result.eligibleRequests[0].id,request);
 assert(calls.every(([sql,args])=>sql.includes('tenant_id=$1')&&args[0]===company));
 assert.match(calls[0][0],/c.visitor_ref=a.visitor_ref/);
 assert.match(calls[0][0],/c.source_channel/);
 assert(!JSON.stringify(result).includes('owner_reference'));
});

test('capability health explicitly separates configured from browser or payment verified',async()=>{
 const mocked=capabilityHealthSummary({tenant:{auto_refresh_enabled:true,
  last_refresh_status:'failed'},flows:3,approvals:2,
  lastQuality:{status:'complete',finished_at:'2026-11-12'},
  latestRequest:'2026-11-12'});
 assert.equal(mocked.checks.find(x=>x.key==='knowledge_refresh').status,'attention');
 assert.equal(mocked.checks.find(x=>x.key==='workflow_builder').status,'configured');
 assert.equal(mocked.checks.find(x=>x.key==='answer_quality').status,'checked');
 assert.equal(mocked.browserFlowsVerified,false);
 assert.equal(mocked.paymentProviderReconciliationVerified,false);
 const calls=[];
 const db={query:async(sql,args)=>{
  calls.push([sql,args]);
  if(sql.includes('FROM tenants'))return {rows:[{auto_refresh_enabled:false}]};
  return {rows:[]};
 }};
 assert.equal((await capabilityHealthOverview(db,company)).allCustomerFeaturesProven,false);
 assert(calls.every(([sql,args])=>args[0]===company && (sql.includes('WHERE id=$1')||sql.includes('tenant_id=$1'))));
});

test('backend, scheduler and owner dashboard expose only authenticated operational features',()=>{
 const server=read('server.mjs'),entry=read('server-entry.mjs'),
  ui=read('public/native-ai-operations.js');
 assert.match(server,/ensureScheduledQualitySchema\(pool\)/);
 assert.match(server,/ensureOwnerSalesSchema\(pool\)/);
 for(const route of ['quality/scheduled','capability-health','sales'])
  assert(server.includes("'/api/app/native/"+route+"'"));
 assert.match(server,/quality\/scheduled',auth,ownerOnly,subscribed/);
 assert.match(server,/sales',auth,ownerOnly,subscribed,nativeWriteLimiter/);
 assert.match(server,/sales\/:id\/retract',auth,ownerOnly,subscribed,nativeWriteLimiter/);
 assert.match(server,/disableAIFallback:true/);
 assert.match(server,/args.disableAIFallback===true/);
 assert.match(ui,/quality\/scheduled/);
 assert.match(ui,/capability-health/);
 assert.match(ui,/Company-confirmed sales/);
 assert.match(ui,/independently checked the payment/);
});
