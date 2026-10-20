import test from 'node:test';
import assert from 'node:assert/strict';
import {deliverCrmProvider} from '../lead-crm-providers.mjs';
test('HubSpot retries upsert same email instead of creating duplicates',async()=>{
 const calls=[];
 const pool={query:async()=>({rows:[{provider:'hubspot',enabled:true}]})};
 const event={leadId:'lead-1',contact:{name:'Test User',email:'test@example.com',phone:'+358401234567'}};
 const fetchImpl=async(url,options)=>{calls.push({url,options});return {ok:true,status:200}};
 for(let i=0;i<2;i++)await deliverCrmProvider('tenant-1',event,{pool,credentials:{'tenant-1':{token:'test-token'}},fetchImpl});
 assert.equal(calls.length,2);
 for(const call of calls){
  assert.equal(call.url,'https://api.hubapi.com/crm/v3/objects/contacts/batch/upsert');
  const payload=JSON.parse(call.options.body);
  assert.equal(payload.inputs[0].id,'test@example.com');
  assert.equal(payload.inputs[0].idProperty,'email');
 }
});
test('HubSpot refuses non-idempotent contact without email',async()=>{
 const pool={query:async()=>({rows:[{provider:'hubspot',enabled:true}]})};
 await assert.rejects(()=>deliverCrmProvider('tenant-1',{leadId:'lead-1',contact:{name:'Test',phone:'1234567'}},{pool,credentials:{'tenant-1':{token:'test-token'}},fetchImpl:async()=>{throw Error('must not call API')}}),/requires a valid email/);
});
