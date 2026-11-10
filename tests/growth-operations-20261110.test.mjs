import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  validateGrowthSettings,isPostcodeQuestion,serviceAreaResponse,
  suggestedGreeting,customerIntentStage,compareAnswerDrafts,
  chooseGrowthNextAction,growthSettings,saveGrowthSettings,
  recordWidgetActivation,ensureGrowthOperationsSchema,
  previewGrowthQuote,growthWeeklyReport
} from '../respondo-growth-ops.mjs';

const tenant='b77c025d-dcba-451e-aef3-d43191c84a1a';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('owner service-area settings require explicit approval and exact Finnish postcodes',()=>{
  const settings=validateGrowthSettings({
    confirm:true,tone:'concise',postalCodes:['20100','20320','20100']
  });
  assert.deepEqual(settings.postalCodes,['20100','20320']);
  assert.equal(settings.country,'FI');
  assert.throws(()=>validateGrowthSettings({tone:'friendly',postalCodes:['20100']}),/approval/);
  assert.throws(()=>validateGrowthSettings({confirm:true,tone:'undefined',postalCodes:[]}),/style/);
  assert.throws(()=>validateGrowthSettings({confirm:true,tone:'standard',postalCodes:['201001']}),/five digits/);
  assert.throws(()=>validateGrowthSettings({confirm:true,tone:'standard',postalCodes:['2010X']}),/five digits/);
  assert.throws(()=>validateGrowthSettings({confirm:true,tone:'standard',postalCodes:Array(201).fill('20100')}),/200/);
});

test('service area is verified only for explicit codes and not inferred from other addresses',()=>{
  for(const [lang,question] of [
    ['fi','Palveletteko postinumerossa 20100?'],
    ['sv','Levererar ni till postnummer 20100?'],
    ['en','Do you deliver to postal code 20100?']
  ]){
    assert.ok(isPostcodeQuestion(question));
    const answer=serviceAreaResponse(question,lang,['20100','20320']);
    assert.equal(answer.listed,true);
    assert.equal(answer.postcode,'20100');
    assert.equal(answer.bookingConfirmed,false);
    assert.equal(answer.priceVerified,false);
    assert.match(answer.answer,/20100/);
  }
  const unknown=serviceAreaResponse('Do you deliver to 20400?','en',['20100']);
  assert.equal(unknown.listed,false);
  assert.match(unknown.answer,/not yet been verified/);
  assert.doesNotMatch(unknown.answer,/do not deliver|cannot serve|unavailable/i);
  assert.equal(serviceAreaResponse('Do you deliver to 20100?','en',[]),null);
  assert.equal(serviceAreaResponse('Can I book next Tuesday?','en',['20100']),null);
  assert.equal(serviceAreaResponse('My number is 20100','en',['20100']),null);
});

test('greeting style only adapts default, custom copy remains untouched',()=>{
  assert.match(suggestedGreeting('friendly','fi','Hei!',false),/Kiva/);
  assert.match(suggestedGreeting('formal','en','Hello',false),/assist you/);
  assert.match(suggestedGreeting('concise','sv','Hej!',false),/hjälpa/);
  assert.equal(suggestedGreeting('formal','en','Owner-approved words',true),'Owner-approved words');
  assert.equal(suggestedGreeting('standard','fi','Aloita tästä',false),'Aloita tästä');
});

test('prospect stage is a hint, not a purchase or an external action',()=>{
  assert.equal(customerIntentStage('I want to order now').stage,'purchase_ready');
  assert.equal(customerIntentStage('How much does it cost?').stage,'comparing');
  assert.equal(customerIntentStage('Tell me about the service').stage,'researching');
  assert.equal(customerIntentStage('').stage,'unknown');
  assert.equal(customerIntentStage('Haluan tilata').requiresHumanConfirmation,false);
});

test('offline two-answer comparison flags unverified transactions without publishing',()=>{
  const res=compareAnswerDrafts({
    question:'Was my booking confirmed?',language:'en',
    first:'Your booking is confirmed.',
    second:'We must verify your slot first.'
  });
  assert.equal(res.usesLiveTraffic,false);
  assert.equal(res.autoPublish,false);
  assert.equal(res.claimsConversionLift,false);
  assert.equal(res.paidCalls,0);
  assert.ok(res.variants[0].flags.some(x=>x.code==='unverified_booking'));
  assert.equal(res.variants[1].flags.length,0);
  assert.throws(()=>compareAnswerDrafts({language:'en',question:'A',first:'B'}),/required/);
});

test('next action only uses recorded evidence and does not claim embed is healthy',()=>{
  assert.equal(chooseGrowthNextAction({approvedFacts:0}).key,'knowledge');
  assert.equal(chooseGrowthNextAction({approvedFacts:10,unanswered:3}).key,'quality');
  assert.equal(chooseGrowthNextAction({approvedFacts:10,leads:2}).key,'installation');
  assert.equal(chooseGrowthNextAction({approvedFacts:10,leads:0,lastWidgetSeen:new Date().toISOString()}).key,'test');
  assert.equal(chooseGrowthNextAction({approvedFacts:10,leads:2,lastWidgetSeen:new Date().toISOString()}).key,'results');
});

test('settings are tenant-scoped, persisted only after approval',async()=>{
  const seen=[];
  const db={query:async(sql,args)=>{
    seen.push([sql,args]);
    if(sql.startsWith('SELECT'))return {rows:[{postal_codes:['20100'],tone:'formal',updated_at:'2026-11-10T12:00:00Z'}]};
    return {rows:[{updated_at:'2026-11-10T12:00:00Z'}]};
  }};
  const saved=await saveGrowthSettings(db,tenant,{confirm:true,postalCodes:['20100'],tone:'formal'});
  assert.equal(saved.tone,'formal');
  assert.equal(seen[0][1][0],tenant);
  const readBack=await growthSettings(db,tenant);
  assert.equal(readBack.tone,'formal');
  assert.deepEqual(readBack.postalCodes,['20100']);
  assert.ok(seen.every(x=>x[0].includes('tenant_id')&&x[1][0]===tenant));
});

test('health record is private and gated by a successful authorized widget token',async()=>{
  const calls=[];
  const db={query:async(sql,params)=>{calls.push([sql,params]);return {rowCount:1};}};
  assert.equal(await recordWidgetActivation(db,tenant,'company.example'),true);
  assert.equal(calls.length,1);
  assert.match(calls[0][0],/ON CONFLICT\(tenant_id\)/);
  assert.match(calls[0][0],/INTERVAL '10 minutes'/);
  assert.equal(await recordWidgetActivation(db,tenant,'localhost:3000'),false);
  assert.equal(calls.length,1);
});

test('tenant tables have RLS and no Data API role permissions',async()=>{
  const statements=[];
  const db={query:async(sql)=>{
    statements.push(sql);
    if(sql.includes('SELECT rolname'))return {rows:[{rolname:'anon'},{rolname:'authenticated'},{rolname:'service_role'}]};
    return {rows:[]};
  }};
  await ensureGrowthOperationsSchema(db);
  const sql=statements.join('\n');
  for(const table of ['respondo_growth_settings','respondo_widget_health']){
    assert.match(sql,new RegExp('CREATE TABLE IF NOT EXISTS public\\.'+table));
    assert.match(sql,new RegExp('ALTER TABLE public\\.'+table+' ENABLE ROW LEVEL SECURITY'));
    assert.match(sql,new RegExp('REVOKE ALL PRIVILEGES ON TABLE public\\.'+table+' FROM anon'));
    assert.match(sql,new RegExp('REVOKE ALL PRIVILEGES ON TABLE public\\.'+table+' FROM authenticated'));
  }
});

test('quote preview is explicitly nonbinding and uses existing owner-approved rules',async()=>{
  const db={query:async(sql,params)=>{
    assert.match(sql,/FROM tenants WHERE id=\$1/);
    assert.deepEqual(params,[tenant]);
    return {rows:[{quote_base_price:15,quote_unit_price:2,quote_min_price:0,
      quote_vat_percent:24,quote_service_name:'Window cleaning'}]};
  }};
  const quote=await previewGrowthQuote(db,tenant,2);
  assert.equal(quote.totalCents,2356);
  assert.equal(quote.currency,'EUR');
  assert.equal(quote.status,'estimate_only');
  assert.equal(quote.binding,false);
  assert.equal(quote.availabilityVerified,false);
});

test('7-day report includes recorded requests only and cannot claim sales or resolved cases',async()=>{
  const calls=[];
  const db={query:async(sql,args)=>{
    calls.push([sql,args]);
    if(sql.includes('FROM conversations'))return {rows:[{messages:18,handoffs:4,sourced:9}]};
    if(sql.includes('FROM leads'))return {rows:[{leads:3}]};
    if(sql.includes('FROM action_requests'))return {rows:[
      {request_type:'quote',total:2},{request_type:'booking',total:1}
    ]};
    return {rows:[]};
  }};
  const report=await growthWeeklyReport(db,tenant);
  assert.equal(report.days,7);
  assert.equal(report.messages,18);
  assert.equal(report.humanHandoffs,4);
  assert.equal(report.bookingRequests,1);
  assert.equal(report.quoteRequests,2);
  assert.equal(report.paidSalesVerified,false);
  assert.equal(report.customerResolutionVerified,false);
  assert.equal(report.noExternalEmailSent,true);
  assert.ok(calls.every(([sql,args])=>sql.includes('tenant_id=$1')&&args[0]===tenant));
});

test('authenticated growth endpoints do not leak to demo and never claim external connections',()=>{
  const server=read('server.mjs'),entry=read('server-entry.mjs'),
    workspace=read('public/workspace-continuation-v24.js'),
    frontend=read('public/owner-growth-center.js'),index=read('public/index.html');
  for(const name of ['/api/app/native/growth','/api/app/native/growth/settings',
    '/api/app/native/growth/quote-preview','/api/app/native/growth/weekly-report',
    '/api/app/native/growth/compare'])assert.ok(server.includes(name));
  assert.match(server,/native\/growth',auth,ownerOnly,subscribed,nativeEndpoint/);
  assert.match(server,/isPostcodeQuestion\(message\)/);
  assert.match(server,/recordWidgetActivation\(pool,tenant\.id,origin\.hostname\)/);
  assert.match(entry,/ensureGrowthOperationsSchema\(pool\)/);
  assert.match(workspace,/workspace\.dataset\.demo=demo\?'true':'false'/);
  assert.match(frontend,/dataset\.demo==='true'/);
  assert.match(index,/owner-growth-center\.js/);
  assert.match(index,/owner-growth-center\.css/);
  assert.doesNotMatch(frontend,/innerHTML\s*=/);
});
