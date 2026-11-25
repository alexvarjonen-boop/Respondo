import test from 'node:test';
import assert from 'node:assert/strict';
import {reserveHybridCalls,needsHybridReasoning,hybridCacheKey,readHybridCache,writeHybridCache} from '../hybrid-ai-usage.mjs';

const row={id:'r1',approved:true,source_type:'website',source_url:'https://example.test/services',title:'Cleaning',answer:'We provide office cleaning.',updated_at:'v1'};
const base={tenantId:'tenant-a',message:'Do you clean offices?',lang:'en',history:[],pageContext:{},rows:[row]};
const answer={answer:'We provide office cleaning.',handoff:false,confidence:0.72,intent:'Keskusteleva AI',sourceIds:['r1'],selected:[row]};

test('local routing protects strong answers and detected conflicts',()=>{
  assert.equal(needsHybridReasoning({answer:'Yes',handoff:false,confidence:1,sourceIds:[]}),false);
  assert.equal(needsHybridReasoning({answer:'Yes',handoff:false,confidence:.91,sourceIds:['r1']}),false);
  assert.equal(needsHybridReasoning({handoff:true,confidence:.2}),true);
  assert.equal(needsHybridReasoning({answer:'uncertain',confidence:.5,sourceIds:['r1']}),true);
  assert.equal(needsHybridReasoning({handoff:true,qualityFlag:'conflict'}),false);
});
test('quota uses server-side UTC and atomic upsert for global and tenant caps',async()=>{
  let total=0;const tenants=new Map();let calls=0;
  const pool={query:async(sql,params)=>{
    if(!params){assert.match(sql,/ENABLE ROW LEVEL SECURITY/);return {};}
    calls++;
    assert.match(sql,/ON CONFLICT\(day\) DO UPDATE/);
    assert.match(sql,/AT TIME ZONE 'UTC'/);
    const [id,global,perTenant]=params;
    assert.equal(global,100);assert.equal(perTenant,10);
    const used=tenants.get(id)||0;
    if(total+2>global||used+2>perTenant)return {rowCount:0};
    total+=2;tenants.set(id,used+2);return {rowCount:1};
  }};
  const first=await Promise.all(Array.from({length:20},()=>reserveHybridCalls(pool,'tenant-a')));
  assert.equal(first.filter(Boolean).length,5);
  for(let i=1;i<10;i++)for(let j=0;j<5;j++)assert.equal(await reserveHybridCalls(pool,'tenant-'+i),true);
  assert.equal(total,100);
  assert.equal(await reserveHybridCalls(pool,'tenant-extra'),false);
  assert.equal(await reserveHybridCalls(pool,''),false);
  assert.equal(calls,66);
});
test('quota storage errors fail closed',async()=>{
  assert.equal(await reserveHybridCalls({query:async()=>{throw Error('db unavailable')}},'tenant-a'),false);
});
test('cache isolates tenants, exact questions, language, sources and context',()=>{
  const k=hybridCacheKey(base);
  assert.ok(k);
  for(const patch of [
    {tenantId:'tenant-b'},{lang:'fi'},{message:'Do you clean houses?'},
    {rows:[{...row,answer:'We do not clean offices.'}]},
    {rows:[{...row,updated_at:'v2'}]}
  ])assert.notEqual(k,hybridCacheKey({...base,...patch}));
  for(const patch of [
    {tenantId:''},{history:[{question:'previous'}]},{pageContext:{url:'https://example.test'}},
    {message:'Can you book this?'},{message:'My email is test@example.test'},
    {rows:[{...row,approved:false}]},{rows:[{...row,source_type:'manual'}]}
  ])assert.equal(hybridCacheKey({...base,...patch}),'');
});
test('cache reuses only verified public answer and expires or rejects removed sources',()=>{
  const k=hybridCacheKey(base);
  const now=1000;
  assert.equal(writeHybridCache(k,answer,[row],now),true);
  assert.deepEqual(readHybridCache(k,[row],now),answer);
  assert.equal(readHybridCache(k,[{...row,approved:false}],now),null);
  assert.equal(writeHybridCache(k,{...answer,answer:'We have booked it.'},[row],now),false);
  assert.equal(writeHybridCache(k,{...answer,sourceIds:['missing']},[row],now),false);
  assert.equal(writeHybridCache(k,answer,[row],now),true);
  assert.equal(readHybridCache(k,[row],now+600001),null);
});
