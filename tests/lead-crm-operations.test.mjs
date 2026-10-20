import test from 'node:test';
import assert from 'node:assert/strict';
import { createLeadOperations } from '../lead-operations.mjs';

const makePool=()=>({
  query:async(sql)=> {
    if(String(sql).includes('INSERT INTO respondo_qualified_leads'))return {rowCount:1,rows:[{lead_id:'ok'}]};
    return {rowCount:0,rows:[]};
  }
});
test('CRM delivery follows successful persistence and preserves lead on failure',async()=>{
  let attempts=0;
  const operations=createLeadOperations({
    pool:makePool(),resolveTenantId:async()=> 'tenant-1',
    crm:{url:'https://crm.example.com/hook',secret:'x'.repeat(48)},
    deliver:async()=>{attempts++;throw Error('CRM offline')}
  });
  const session=operations.beginCapture({message:'Please send me a quote for your services',language:'en'});
  assert.ok(session);
  const result=await operations.submitCapture({},{
    session,name:'Test Buyer',email:'buyer@example.com',consent:true
  });
  assert.equal(result.accepted,true);
  assert.equal(result.crmStatus,'failed');
  assert.equal(attempts,1);
});
test('CRM disabled by default',async()=>{
  const operations=createLeadOperations({pool:makePool(),resolveTenantId:async()=> 'tenant-1'});
  const session=operations.beginCapture({message:'Please send me a quote for your services',language:'en'});
  assert.ok(session);
  const result=await operations.submitCapture({},{
    session,name:'Test Buyer',email:'buyer@example.com',consent:true
  });
  assert.equal(result.accepted,true);
  assert.equal(result.crmStatus,'disabled');
});
