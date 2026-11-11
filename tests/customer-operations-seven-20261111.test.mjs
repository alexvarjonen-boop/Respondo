import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {
 procedureCatalog,validateProcedureSelection,validateProcedureSubmission,quoteBreakdown,
 qualifyInquiryAction,ensureCustomerOperationsSchema,tenantProcedures,saveTenantProcedure,
 trackingTokenValid,issueRequestTrackingLink,requestTrackingStatus,addCustomerTrackingNote,
 agencyWorkspaceSummary,customerOpsOverview,ownerRequestUpdates
} from '../respondo-customer-operations.mjs';
import {FEATURE_GROUPS,FEATURE_COUNT,featureAvailableForPublicPlan} from '../public/features-data.js';
import {globalGuideData,GLOBAL_GUIDE_PATHS} from '../public/global-resources.mjs';

const tenant='a2d2b7c9-c7b9-45a0-83f7-820c3a1b0a3f';
const action='3e1e08da-b827-4c86-afde-323c52474b02';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('all procedure templates have truthful owner approval and trilingual inputs',()=>{
 const catalog=procedureCatalog(['moving_quote']);
 assert.equal(catalog.length,3);
 assert.equal(catalog[0].enabled,true);
 assert.equal(catalog[1].enabled,false);
 assert.ok(catalog.every(x=>x.requiresHumanApproval===true&&x.fields.length>=4));
 for(const item of catalog){
  assert.equal(item.title.length,3);
  assert.ok(item.fields.every(x=>x.label.length===3));
 }
 assert.deepEqual(validateProcedureSelection('moving_quote',true),{
  code:'moving_quote',enabled:true});
 assert.throws(()=>validateProcedureSelection('unsafe',true),/Invalid/);
 assert.throws(()=>validateProcedureSelection('moving_quote','yes'),/Invalid/);
});

test('procedure intake retains real facts but never confirms prices or bookings',()=>{
 const data=validateProcedureSubmission('moving_quote',{
  from:'Turku',to:'Pargas',size:'74',floor:'3',lift:'yes',date:'2026-12-02',
  extra:'One piano'
 });
 assert.equal(data.actionType,'quote');
 assert.match(data.details,/Moving from: Turku/);
 assert.match(data.details,/Home size/);
 assert.equal(data.bookingConfirmed,false);
 assert.equal(data.approvedQuote,false);
 assert.equal(data.humanReviewRequired,true);
 const appointment=validateProcedureSubmission('booking_request',{
  service:'Window cleaning',date:'2026-12-04',time:'15:00',scope:'30 windows'
 });
 assert.equal(appointment.actionType,'callback');
 assert.equal(appointment.bookingConfirmed,false);
 assert.throws(()=>validateProcedureSubmission('booking_request',{
  service:'Cleaning',time:'16:00'}),/Missing required field: date/);
 assert.throws(()=>validateProcedureSubmission('moving_quote',{
  from:'A',to:'B',size:'-2',floor:'2',lift:'yes',date:'2026-12-02'
 }),/Invalid job size/);
});

test('transparent quote uses configured values without inventing travel expenses',()=>{
 const values={quote_base_price:10,quote_unit_price:2,
  quote_min_price:20,quote_vat_percent:25.5,quote_service_name:'Window cleaning'};
 const result=quoteBreakdown(values,4);
 assert.equal(result.totalCents,2510);
 assert.equal(result.subtotalCents,2000);
 assert.equal(result.status,'unapproved_estimate');
 assert.equal(result.bookingConfirmed,false);
 assert.equal(result.travelFeesVerified,false);
 assert.equal(result.binding,false);
 assert.throws(()=>quoteBreakdown({...values,quote_base_price:0,
  quote_unit_price:0,quote_min_price:0},1),/pricing/);
 assert.throws(()=>quoteBreakdown(values,0),/quantity/);
});

test('qualification is not equivalent to payment verification',()=>{
 const signal=qualifyInquiryAction('quote',{contact:'person@example.com'});
 assert.equal(signal.intent,'quote');
 assert.equal(signal.contactProvided,true);
 assert.equal(signal.confirmedSale,false);
});

test('schema uses private tenant tables with RLS and revokes API role access',async()=>{
 const stmts=[];
 const db={query:async(sql)=>{stmts.push(sql);return sql.startsWith('SELECT rolname')
  ?{rows:[{rolname:'anon'},{rolname:'authenticated'},{rolname:'service_role'}]}:{rows:[]};}};
 await ensureCustomerOperationsSchema(db);
 const sql=stmts.join('\n');
 for(const table of ['respondo_customer_procedures','respondo_customer_request_links',
  'respondo_customer_request_updates']){
  assert.match(sql,new RegExp('CREATE TABLE IF NOT EXISTS public\\.'+table));
  assert.match(sql,new RegExp('ALTER TABLE public\\.'+table+' ENABLE ROW LEVEL SECURITY'));
  assert.match(sql,new RegExp('FROM authenticated'));
 }
 assert.match(sql,/UNIQUE\(tenant_id,action_id\)/);
 assert.match(sql,/DEFAULT gen_random_uuid\(\)/);
});

test('owner procedure updates require confirmation and exact tenant',async()=>{
 const calls=[];
 const db={query:async(sql,args)=>{
  calls.push([sql,args]);
  if(sql.startsWith('SELECT'))return {rows:[{code:'service_quote'}]};
  return {rows:[{code:'service_quote',enabled:true}]};
 }};
 await assert.rejects(saveTenantProcedure(db,tenant,{code:'service_quote',enabled:true}),/approval/);
 const saved=await saveTenantProcedure(db,tenant,{
  code:'service_quote',enabled:true,confirm:true});
 assert.equal(saved.enabled,true);
 assert.deepEqual(calls[0][1],[tenant,'service_quote',true]);
 const options=await tenantProcedures(db,tenant);
 assert.equal(options.find(x=>x.code==='service_quote').enabled,true);
 assert.ok(calls.every(([sql,args])=>sql.includes('tenant_id')&&args[0]===tenant));
});

test('tracking token is a 32-byte random capability whose hash alone reaches database',async()=>{
 const queries=[];
 const db={query:async(sql,args)=>{
  queries.push([sql,args]);return {rowCount:1,rows:[{expires_at:'2026-12-11'}]};
 }};
 const a=await issueRequestTrackingLink(db,tenant,action);
 assert.equal(a.token.length,64);
 assert.equal(trackingTokenValid(a.token),true);
 assert.equal(trackingTokenValid('ab'.repeat(31)),false);
 assert.deepEqual(queries[0][1].slice(0,2),[tenant,action]);
 assert.equal(queries[0][1][2],createHash('sha256').update(a.token).digest('hex'));
 assert.ok(!queries[0][0].includes(a.token));
});

test('public status returns only non-sensitive request metadata',async()=>{
 const token='a'.repeat(64),calls=[];
 const db={query:async(sql,args)=>{
  calls.push([sql,args]);
  return {rows:[{name:'Company',request_type:'quote',status:'in_progress',
    created_at:'2026-11-11',updated_at:'2026-11-12',email:'never returned'}]};
 }};
 const result=await requestTrackingStatus(db,token);
 assert.equal(result.companyName,'Company');
 assert.equal(result.status,'in_progress');
 assert.equal(result.confirmedAppointment,false);
 assert.equal(result.verifiedSale,false);
 assert.equal(result.email,undefined);
 assert.equal(result.contact,undefined);
 assert.equal(calls[0][1][0],createHash('sha256').update(token).digest('hex'));
 assert.match(calls[0][0],/l\.expires_at>NOW\(\)/);
 assert.match(calls[0][0],/a\.tenant_id=l\.tenant_id/);
 assert.equal(await requestTrackingStatus(db,'invalid'),null);
});

test('supplementary customer notes are limited to five and use tenant+action scope',async()=>{
 const calls=[];
 const db={connect:async()=>({query:async(sql,args)=>{
  calls.push([sql,args]);
  if(sql.includes('SELECT l.tenant_id'))return {rowCount:1,rows:[
   {tenant_id:tenant,action_id:action}]};
  if(sql.includes('SELECT COUNT'))return {rows:[{count:4}]};
  return {rowCount:1,rows:[]};
 },release(){}})};
 const result=await addCustomerTrackingNote(db,'b'.repeat(64),'Please call me tomorrow');
 assert.equal(result.received,true);
 assert.equal(calls.at(-1)[0],'COMMIT');
 assert.ok(calls.some(([sql,args])=>sql.includes('INSERT INTO respondo_customer_request_updates')&&
  args[0]===tenant&&args[1]===action));
 await assert.rejects(addCustomerTrackingNote(db,'invalid','This is a message'),/Invalid link/);
});

test('owner-only agency overview queries the owner, never a tenant supplied in request body',async()=>{
 const calls=[],db={query:async(sql,args)=>{
  calls.push([sql,args]);
  return {rows:[{id:tenant,name:'Company',leads_30d:2,requests_30d:3}]};
 }};
 const result=await agencyWorkspaceSummary(db,'owner-user');
 assert.equal(result.workspaces.length,1);
 assert.equal(result.ownerOnly,true);
 assert.equal(result.whiteLabelEnabled,false);
 assert.equal(result.partnerCommissionsConfigured,false);
 assert.deepEqual(calls[0][1],['owner-user']);
 assert.match(calls[0][0],/t\.owner_user_id=\$1/);
});

test('lead and action overview reveals no customer contact details',async()=>{
 const queries=[];
 const db={query:async(sql,args)=>{
  queries.push([sql,args]);
  if(sql.includes('respondo_customer_procedures'))return {rows:[]};
  return {rows:[{id:action,request_type:'quote',status:'new',
   fields:{contact:'hidden@example.org'},created_at:'2026-11-11'}]};
 }};
 const result=await customerOpsOverview(db,tenant);
 assert.equal(result.qualifiedRequests[0].qualification.contactProvided,true);
 assert.equal(result.qualifiedRequests[0].qualification.confirmedSale,false);
 assert.equal(result.qualifiedRequests[0].contact,undefined);
 assert.ok(queries.every(([sql,args])=>sql.includes('tenant_id=$1')&&args[0]===tenant));
});

test('customer updates require tenant-scoped owner read',async()=>{
 const db={query:async(sql,args)=>{
  assert.match(sql,/WHERE tenant_id=\$1 AND action_id=\$2/);
  assert.deepEqual(args,[tenant,action]);
  return {rows:[{note:'More information',created_at:'2026-11-11'}]};
 }};
 const result=await ownerRequestUpdates(db,tenant,action);
 assert.equal(result.updates.length,1);
 await assert.rejects(ownerRequestUpdates(db,tenant,'bad'),/Invalid request/);
});

test('public portal and widget never claim automatic purchase or confirmed booking',()=>{
 const server=read('server.mjs'),widget=read('public/widget.js'),
  entry=read('server-entry.mjs'),ui=read('public/customer-operations-owner.js'),
  page=read('public/request-status.html'),portal=read('public/request-status.js');
 for(const path of ['/api/public/request-status','/api/public/request-status/note',
  '/api/public/:slug/procedures','/api/app/native/customer-ops',
  '/api/app/native/agency/summary'])assert.ok(server.includes(path));
 assert.match(server,/customer-ops',auth,ownerOnly,subscribed/);
 assert.match(server,/agency\/summary',auth,ownerOnly,subscribed/);
 assert.match(server,/!procedureSubmission/);
 assert.match(entry,/ensureCustomerOperationsSchema\(pool\)/);
 assert.match(widget,/function showProcedureForm\(/);
 assert.match(widget,/product-compare-panel/);
 assert.match(widget,/Track your request/);
 assert.match(ui,/Approved customer procedures/);
 assert.match(portal,/location\.hash\.slice\(1\)/);
 assert.match(portal,/referrerPolicy:'no-referrer'/);
 assert.match(page,/name="robots" content="noindex,nofollow,noarchive"/);
 assert.match(page,/name="referrer" content="no-referrer"/);
 assert.doesNotMatch(portal,/localStorage\.setItem/);
});

test('Features and Guides are updated in all three languages without false claims',()=>{
 const group=FEATURE_GROUPS.find(x=>x.key==='customer_operations');
 assert.ok(group);
 assert.equal(group.items.length,10);
 assert.ok(group.items.every(x=>x.length===3&&x.every(y=>y.length>10)));
 assert.equal(FEATURE_COUNT,FEATURE_GROUPS.reduce((n,g)=>n+g.items.length,0));
 for(const slug of [
  '/guides/asiakasprosessit-ja-tyonkulut',
  '/guides/verkkokaupan-tuotevertailu',
  '/guides/tarjouslaskenta-ja-asiointiseuranta',
  '/guides/usean-yrityksen-hallinta'
 ]){
  assert.ok(GLOBAL_GUIDE_PATHS.includes(slug));
  for(const lang of ['fi','sv','en']){
   const article=globalGuideData(slug,lang);
   assert.ok(article?.title&&article.sections.length>=4&&article.faq.length>=2);
  }
 }
 const app=read('public/app.js'),html=read('public/index.html');
 assert.match(app,/features-data\.js\?v=20261111-customer-ops-v1/);
 assert.match(app,/global-resources\.mjs\?v=20261111-customer-ops-v1/);
 assert.match(html,/app\.js\?v=20261111-customer-ops-v1/);
 assert.match(html,/customer-operations-owner\.js/);
 assert.match(html,/customer-operations-owner\.css/);
});
