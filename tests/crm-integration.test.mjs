import test from 'node:test';
import assert from 'node:assert/strict';
import { deliverCrmProvider } from '../lead-crm-providers.mjs';
import { processCrmOutbox, setCrmProvider } from '../lead-crm-queue.mjs';

test('Pipedrive creates person before lead and uses returned person ID',async()=>{
  const requests=[];
  const pool={query:async()=>({rows:[{provider:'pipedrive',enabled:true}]})};
  const fetchImpl=async(url,options)=>{
    requests.push({url,body:JSON.parse(options.body)});
    return {ok:true,json:async()=>({data:{id:42}})};
  };
  await deliverCrmProvider('tenant-1',{leadId:'lead-1',contact:{name:'Customer',email:'a@example.com'}},{
    pool,credentials:{'tenant-1':{token:'test-token'}},fetchImpl
  });
  assert.match(requests[0].url,/\/persons$/);
  assert.match(requests[1].url,/\/leads$/);
  assert.equal(requests[1].body.person_id,42);
});
test('CRM settings use parameterized tenant scope',async()=>{
  let args;
  const pool={query:async(sql,params)=>{args=params;return {rowCount:1}}};
  await setCrmProvider(pool,'tenant-1','hubspot',true);
  assert.deepEqual(args,['tenant-1','hubspot',true]);
  await assert.rejects(setCrmProvider(pool,'tenant-1','unknown',true));
});
test('retry worker backs off failed deliveries',async()=>{
  const queries=[];
  const pool={query:async(sql,args)=>{
    queries.push({sql,args});
    if(sql.includes('RETURNING id,tenant_id,payload,attempts'))return {rows:[{id:'job-1',tenant_id:'tenant-1',payload:{},attempts:0}]};
    return {rows:[]};
  }};
  const result=await processCrmOutbox(pool,async()=>{throw Error('unavailable')});
  assert.equal(result.retried,1);
  assert.equal(queries[1].args[1],'retry');
  assert.equal(queries[1].args[2],1);
  assert.equal(queries[1].args[3],60);
});
