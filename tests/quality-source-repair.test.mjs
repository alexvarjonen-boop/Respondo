import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  safeRepairQuestion,repairSuggestions,expandKnowledgeAliases,
  ensureQualityRepairSchema,qualityRepairOverview,approveQualityRepair,
  qualityAliasesForTenant
} from '../quality-source-repair.mjs';

const TENANT='f8e0ac74-48a5-4b68-a2e0-5ee56fb2bbd8';
const USER='aaff87c5-a100-4087-8a1a-b262770a04bb';
const GAP='00ab0e6b-d5dc-47b9-9b2c-a1c4c17a7385';
const SOURCE='f7b3dfe0-8f46-489b-a464-aa0750c8f5f1';
const ALIAS='f0cf2221-4573-481b-a431-69f7546115fa';
const current=new Date().toISOString();
const old=new Date(Date.now()-200*24*60*60*1000).toISOString();
const row=(id,title,answer,verified_at=current)=>({
  id,title,answer,category:'Hinnat',keywords:['ikkunanpesu','ikkunaa','hinta'],
  source_type:'website',source_url:'https://company.example/pricing',
  verified_at,approved:true
});

test('repair question is generic and never stores contact details or URLs',()=>{
  assert.equal(safeRepairQuestion('Paljonko ikkunanpesu maksaa?'),'Paljonko ikkunanpesu maksaa?');
  for(const v of ['hei','Liisa@example.org haluaa hinnan',
    'Soita +358 40 123 4567', 'https://evil.example.com /price',
    'Call [email] about a quote'])
    assert.throws(()=>safeRepairQuestion(v),TypeError);
});
test('only sufficiently relevant, recent, approved sources become possible suggestions',()=>{
  const gap={id:GAP,question:'Paljonko ikkunanpesu maksaa?'};
  const sources=[
    row(SOURCE,'Ikkunanpesu hinta', 'Ikkunanpesu maksaa 60 €'),
    row('50373d27-2f4d-4f15-9d72-eaa92529dff2','Ikkunanpesu hinta vanha','100 €',old),
    {...row('6d97a0f3-63ed-43d7-a3a7-152b10fc9ce9','Ikkunanpesu hinta draft','99 €'),approved:false},
    {...row('1b4627dd-386f-4461-94df-e9d1a989c148','Sähköasennuksen hinta','500 €'),category:'Palvelut',keywords:['sähköasennus']}
  ];
  const proposals=repairSuggestions([gap],sources);
  assert.equal(proposals.length,1);
  assert.equal(proposals[0].candidates.length,1);
  assert.equal(proposals[0].candidates[0].sourceId,SOURCE);
  assert.equal(proposals[0].candidates[0].quality,'possible_source_requires_owner_review');
  assert.equal(repairSuggestions([gap],sources,[{conversation_id:GAP}]).length,0);
});
test('existing source is always read fresh, and revoked/stale source disables alias',()=>{
  const alias={id:ALIAS,source_knowledge_id:SOURCE,question:'Paljonko ikkunanpesu maksaa?'};
  const original=row(SOURCE,'Ikkunanpesu hinta','Ikkunanpesu maksaa 60 €');
  const expanded=expandKnowledgeAliases([original],[alias]);
  assert.equal(expanded.length,2);
  assert.equal(expanded[1].id,ALIAS);
  assert.equal(expanded[1].answer,'Ikkunanpesu maksaa 60 €');
  assert.equal(expandKnowledgeAliases([{...original,answer:'Ikkunanpesu maksaa 70 €'}],[alias])[1].answer,'Ikkunanpesu maksaa 70 €');
  assert.equal(expandKnowledgeAliases([{...original,approved:false}],[alias]).length,0);
  assert.equal(expandKnowledgeAliases([{...original,verified_at:old}],[alias]).length,1);
  assert.equal(expandKnowledgeAliases([],[alias]).length,0);
});
test('aliases reject stale or unapproved company evidence and preserve tenant ownership',async()=>{
  const log=[];
  const db={query:async(sql,args)=>{
    log.push([sql,args]);
    if(sql.includes('SELECT c.id AS conversation_id'))return {rows:[]};
    return {rows:[]};
  }};
  await assert.rejects(approveQualityRepair(db,TENANT,USER,{
    conversationId:GAP,sourceId:SOURCE,question:'Paljonko ikkunanpesu maksaa?',approved:true
  }),/unavailable/);
  assert.match(log[0][0],/c\.tenant_id=\$1/);
  assert.match(log[0][0],/k\.tenant_id=c\.tenant_id/);
  assert.match(log[0][0],/k\.approved=TRUE/);
  assert.match(log[0][0],/k\.verified_at>=NOW\(\)-INTERVAL '180 days'/);
  assert.deepEqual(log[0][1],[TENANT,GAP,SOURCE]);
});
test('explicit owner approval saves only safe question/source link, never freeform answer',async()=>{
  const calls=[];
  const db={query:async(sql,args)=>{
    calls.push([sql,args]);
    if(sql.includes('SELECT c.id AS conversation_id'))return {rows:[{conversation_id:GAP,source_id:SOURCE}]};
    return {rows:[{id:ALIAS,question:'Paljonko ikkunanpesu maksaa?'}]};
  }};
  const result=await approveQualityRepair(db,TENANT,USER,{
    approved:true,conversationId:GAP,sourceId:SOURCE,question:'Paljonko ikkunanpesu maksaa?',
    answer:'This browser text MUST NOT be saved'
  });
  assert.equal(result.approved,true);
  const insert=calls.at(-1);
  assert.deepEqual(insert[1],[TENANT,GAP,SOURCE,'Paljonko ikkunanpesu maksaa?',USER]);
  assert.ok(!JSON.stringify(calls).includes('This browser text MUST NOT be saved'));
  assert.doesNotMatch(insert[0],/\bINSERT INTO knowledge\b/i);
  await assert.rejects(approveQualityRepair(db,TENANT,USER,{
    approved:false,conversationId:GAP,sourceId:SOURCE,question:'Paljonko ikkunanpesu maksaa?'
  }),TypeError);
});
test('duplicate question or conversation is blocked rather than silently replaced',async()=>{
  const db={query:async sql=>sql.includes('SELECT c.id AS conversation_id')
    ?{rows:[{conversation_id:GAP,source_id:SOURCE}]}:{rows:[]}};
  await assert.rejects(approveQualityRepair(db,TENANT,USER,{
    approved:true,conversationId:GAP,sourceId:SOURCE,question:'Paljonko ikkunanpesu maksaa?'
  }),/already approved/);
});
test('schema owns tenant/source/conversation, RLS and revoked Data API roles',async()=>{
  const q=[];
  const db={query:async sql=>{
    q.push(sql);
    if(sql.includes('SELECT rolname'))return {rows:[
      {rolname:'anon'},{rolname:'authenticated'},{rolname:'service_role'}]};
    return {rows:[]};
  }};
  await ensureQualityRepairSchema(db);
  const sql=q.join('\n');
  assert.match(sql,/REFERENCES public.tenants\(id\) ON DELETE CASCADE/);
  assert.match(sql,/REFERENCES public.knowledge\(id\) ON DELETE CASCADE/);
  assert.match(sql,/REFERENCES public.conversations\(id\) ON DELETE CASCADE/);
  assert.match(sql,/UNIQUE\(tenant_id,question\)/);
  assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
  for(const role of ['anon','authenticated','service_role'])
    assert.match(sql,new RegExp('FROM '+role+'(?:\\n|$)'));
});
test('overview loads only the tenant information, and never auto-updates answer facts',async()=>{
  const calls=[];
  const db={query:async(sql,params)=>{
    calls.push([sql,params]);
    if(sql.includes('FROM conversations WHERE'))return {rows:[{id:GAP,question:'Paljonko ikkunanpesu maksaa?'}]};
    if(sql.includes('FROM knowledge WHERE'))return {rows:[row(SOURCE,'Ikkunanpesu hinta','60 €')]};
    if(sql.includes('FROM respondo_quality_aliases'))return {rows:[]};
    return {rows:[]};
  }};
  const result=await qualityRepairOverview(db,TENANT);
  assert.equal(result.suggestions.length,1);
  assert.equal(result.automaticChangesApplied,0);
  assert.equal(result.requiresOwnerApproval,true);
  assert.ok(calls.every(([,args])=>args?.[0]===TENANT));
  assert.ok(calls.every(([sql])=>sql.includes('tenant_id=$1')));
});
test('live website and channel chat read aliases from only that tenant source rows',async()=>{
  const aliases=[{id:ALIAS,source_knowledge_id:SOURCE,question:'Paljonko ikkunanpesu maksaa?'}];
  const db={query:async(sql,args)=>{
    assert.match(sql,/WHERE tenant_id=\$1/);assert.deepEqual(args,[TENANT]);
    return {rows:aliases};
  }};
  const expanded=await qualityAliasesForTenant(db,TENANT,[row(SOURCE,'Ikkunanpesu hinta','60 €')]);
  assert.equal(expanded.length,2);
  assert.equal(expanded.at(-1).answer,'60 €');
});
test('owner-only quality routes, full chat source merge, and localized UI exist',()=>{
  const s=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
  const entry=readFileSync(new URL('../server-entry.mjs',import.meta.url),'utf8');
  const ui=readFileSync(new URL('../public/native-ai-operations.js',import.meta.url),'utf8');
  assert.match(entry,/await ensureQualityRepairSchema\(pool\)/);
  assert.match(s,/app\.get\('\/api\/app\/native\/quality\/repair',auth,ownerOnly,subscribed,nativeEndpoint/);
  assert.match(s,/app\.post\('\/api\/app\/native\/quality\/repair',auth,ownerOnly,subscribed,nativeWriteLimiter,nativeEndpoint/);
  assert.match(s,/kr\.rows=await qualityAliasesForTenant\(pool,tenant\.id,kr\.rows\)/);
  assert.match(s,/kr\.rows=await qualityAliasesForTenant\(pool,t\.id,kr\.rows\)/);
  assert.match(ui,/repairIntro:/);
  assert.match(ui,/repairConfirm:/);
  assert.match(ui,/renderRepairSuggestions\(\)/);
  assert.match(ui,/checkbox\.checked/);
});
