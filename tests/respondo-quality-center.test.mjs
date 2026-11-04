import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  qualityDays,redactQualityQuestion,qualitySummary,
  ensureQualityCenterSchema,createQualityReview,updateQualityReview,
  qualityCenterOverview
} from '../respondo-quality-center.mjs';

const tenant='c75bb41f-0277-4448-ae3b-dcebb568c53c';
const conversation='f003bb7b-8459-401c-ade6-1e99f1ee6241';
const otherTenant='8178cd0b-ae39-4b42-8471-bf47cb590dee';

test('quality analytics separates automated replies, cited answers and resolution',()=>{
  const s=qualitySummary({channels:[
    {channel:'website',total:14,automated:10,handoffs:4,evidenced:7,low_confidence:3},
    {channel:'email',total:6,automated:2,handoffs:4,evidenced:1,low_confidence:2}
  ],leads:3,actions:2,tickets:1,reviews:[{status:'open'},{status:'dismissed'}]});
  assert.equal(s.total,20);
  assert.equal(s.automated,12);
  assert.equal(s.handoffs,8);
  assert.equal(s.evidenced,8);
  assert.equal(s.automationRate,60);
  assert.equal(s.evidenceRate,67);
  assert.equal(s.customerResolutionVerified,false);
  assert.equal(s.accuracyVerified,false);
  assert.equal(s.revenueAttributed,false);
  assert.equal(s.openReviews,1);
  assert.equal(qualitySummary().automationRate,null);
  assert.equal(qualityDays('400'),30);
  assert.equal(qualityDays('7'),7);
});
test('quality insights redact contact information from displayed questions',()=>{
  const s=redactQualityQuestion('Call me at +358 40 123 4567, email liisa@example.fi');
  assert.ok(!s.includes('358 40'));
  assert.ok(!s.includes('liisa@example.fi'));
  assert.ok(s.includes('[email]')&&s.includes('[phone]'));
  assert.equal(redactQualityQuestion('x'.repeat(800)).length,180);
});
test('review schema is tenant-owned, secured by RLS, inaccessible to Data API roles',async()=>{
  const queries=[];
  const db={query:async(sql,args)=>{
    queries.push([sql,args]);
    if(sql.includes('SELECT rolname FROM pg_roles'))return {rows:[{rolname:'anon'},{rolname:'authenticated'},{rolname:'service_role'}]};
    return {rows:[]};
  }};
  await ensureQualityCenterSchema(db);
  const all=queries.map(x=>x[0]).join('\n');
  assert.match(all,/tenant_id UUID NOT NULL REFERENCES public.tenants\(id\) ON DELETE CASCADE/);
  assert.match(all,/conversation_id UUID NOT NULL REFERENCES public.conversations\(id\) ON DELETE CASCADE/);
  assert.match(all,/ENABLE ROW LEVEL SECURITY/);
  assert.match(all,/REVOKE ALL PRIVILEGES ON TABLE public.respondo_quality_reviews FROM PUBLIC/);
  assert.match(all,/FROM anon/);
  assert.match(all,/FROM authenticated/);
  assert.match(all,/FROM service_role/);
});
test('review upsert references only same tenant conversation and never publishes knowledge',async()=>{
  const queries=[];
  const db={query:async(sql,args)=>{queries.push([sql,args]);return {rows:[{id:conversation,status:'open'}]};}};
  const found=await createQualityReview(db,tenant,{conversationId:conversation,reason:'incorrect_fact',note:'Verify owner price'});
  assert.equal(found.status,'open');
  assert.deepEqual(queries[0][1],[tenant,conversation,'incorrect_fact','Verify owner price']);
  assert.match(queries[0][0],/FROM conversations c WHERE c\.id=\$2 AND c\.tenant_id=\$1/);
  assert.doesNotMatch(queries[0][0],/\bUPDATE knowledge\b/i);
  await assert.rejects(createQualityReview(db,otherTenant,{conversationId:'broken',reason:'incorrect_fact'}),TypeError);
  await assert.rejects(createQualityReview(db,tenant,{conversationId:conversation,reason:'other'}),TypeError);
});
test('review cannot be marked resolved without documented verified correction',async()=>{
  const db={query:async(sql,args)=>({rows:[{id:args[1],status:args[2]}]})};
  await assert.rejects(updateQualityReview(db,tenant,conversation,{status:'resolved',resolutionNote:'ok'}),TypeError);
  const r=await updateQualityReview(db,tenant,conversation,{status:'resolved',resolutionNote:'Checked and corrected the approved price source.'});
  assert.equal(r.status,'resolved');
  await assert.rejects(updateQualityReview(db,tenant,conversation,{status:'published',resolutionNote:'foo'}),TypeError);
});
test('quality center queries are all tenant-scoped, bounded and only show redacted unanswered items',async()=>{
  const queries=[];
  const db={query:async(sql,args)=>{
    queries.push([sql,args]);
    if(sql.includes('AS channel'))return {rows:[{channel:'website',total:5,automated:3,handoffs:2,evidenced:2}]};
    if(sql.includes('created_at::date'))return {rows:[{day:'2026-11-04',total:5,handoffs:2}]};
    if(sql.includes('SELECT id,question,intent'))return {rows:[{
      id:conversation,question:'Contact user@example.org at +358 50 456 7890',intent:'Help',source_channel:'website'
    }]};
    if(sql.includes('FROM respondo_quality_reviews r'))return {rows:[{
      id:conversation,conversation_id:conversation,question:'Contact user@example.org',
      reason:'incorrect_fact',status:'open',note:'',resolution_note:''
    }]};
    if(sql.includes('FROM leads'))return {rows:[{total:2}]};
    if(sql.includes('FROM respondo_native_tickets'))return {rows:[{total:1}]};
    if(sql.includes('FROM action_requests')&&sql.includes('GROUP BY 1'))return {rows:[{status:'new',total:1}]};
    if(sql.includes('FROM action_requests'))return {rows:[{total:1}]};
    if(sql.includes('FROM knowledge'))return {rows:[{total:30,approved:25,recent:22}]};
    return {rows:[]};
  }};
  const report=await qualityCenterOverview(db,tenant,7);
  assert.equal(queries.length,9);
  assert.ok(queries.every(([sql,args])=>args[0]===tenant&&sql.includes('tenant_id=$1')));
  assert.equal(report.days,7);
  assert.equal(report.summary.automationRate,60);
  assert.equal(report.knowledge.approved,25);
  assert.ok(!report.gaps[0].question.includes('user@example.org'));
  assert.ok(!report.reviews[0].question.includes('user@example.org'));
  assert.equal(report.actionsByStatus[0].status,'new');
});
test('routes require owner and subscription, and dashboard has localized quality tabs',()=>{
  const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
  const entry=readFileSync(new URL('../server-entry.mjs',import.meta.url),'utf8');
  const ui=readFileSync(new URL('../public/native-ai-operations.js',import.meta.url),'utf8');
  assert.match(server,/app\.get\('\/api\/app\/native\/quality',auth,ownerOnly,subscribed,nativeEndpoint/);
  assert.match(server,/app\.post\('\/api\/app\/native\/quality\/reviews',auth,ownerOnly,subscribed,nativeWriteLimiter,nativeEndpoint/);
  assert.match(server,/app\.patch\('\/api\/app\/native\/quality\/reviews\/:id',auth,ownerOnly,subscribed,nativeWriteLimiter,nativeEndpoint/);
  assert.match(entry,/await ensureQualityCenterSchema\(pool\)/);
  assert.match(ui,/const kinds=\['contacts','tickets','quotes','rules','docs','quality','insights'\]/);
  assert.match(ui,/wrong_language/);
  assert.match(ui,/qualityIntro:/);
  assert.match(ui,/insightsIntro:/);
  assert.doesNotMatch(ui,/innerHTML\s*=/);
});
