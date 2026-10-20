import test from 'node:test';
import assert from 'node:assert/strict';
import { createLeadOperations } from '../lead-operations.mjs';

test('owner session determines tenant, never client supplied tenant', async () => {
  const calls = [];
  const pool = {query:async (sql,params)=>{calls.push({sql,params});return {rowCount:1,rows:[]}}};
  const ops = createLeadOperations({pool,resolveTenantId:async ()=>'owner-tenant'});
  const session = ops.beginCapture({message:'Haluan ostaa',language:'fi'});
  const result = await ops.submitCapture({tenantId:'attacker-tenant'},{
    session,name:'Buyer',email:'buyer@example.com',consent:true
  });
  assert.equal(result.accepted,true);
  assert.equal(calls[0].params[0],'owner-tenant');
  assert.notEqual(calls[0].params[0],'attacker-tenant');
});
test('unauthorized caller cannot query tenant leads', async () => {
  const pool = {query:async()=>{throw Error('unexpected database access')}};
  const ops = createLeadOperations({pool,resolveTenantId:async()=>null});
  await assert.rejects(ops.list({}),/Unauthorized tenant/);
  await assert.rejects(ops.analytics({}),/Unauthorized tenant/);
});
test('consent rejection does not persist any lead', async () => {
  let writes = 0;
  const pool = {query:async()=>{writes++;return {rowCount:1}}};
  const ops = createLeadOperations({pool,resolveTenantId:async()=> 'owner-tenant'});
  const session = ops.beginCapture({message:'Haluan ostaa'});
  const result = await ops.submitCapture({}, {session,name:'Buyer',email:'buyer@example.com',consent:false});
  assert.equal(result.accepted,false);
  assert.equal(writes,0);
});
