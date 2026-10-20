import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createLeadOperations } from '../lead-operations.mjs';

test('CRM settings operations are scoped to authenticated tenant',async()=>{
  const queries=[];
  const pool={query:async(sql,args)=>{queries.push({sql,args});return {rows:[{provider:'hubspot',enabled:true}],rowCount:1}}};
  const ops=createLeadOperations({pool,resolveTenantId:async()=> 'trusted-tenant'});
  await ops.updateCrmSettings({tenantId:'attacker'},{provider:'hubspot',enabled:true});
  assert.deepEqual(queries[0].args,['trusted-tenant','hubspot',true]);
  await ops.crmSettings({tenantId:'attacker'});
  assert.deepEqual(queries[1].args,['trusted-tenant']);
});
test('CRM settings reject unauthenticated access',async()=>{
  const ops=createLeadOperations({pool:{query:async()=>{throw Error('unexpected database query')}},resolveTenantId:async()=>null});
  await assert.rejects(ops.crmSettings({}),/Unauthorized tenant/);
  await assert.rejects(ops.updateCrmSettings({},{provider:'webhook',enabled:true}),/Unauthorized tenant/);
});
test('CRM endpoints require owner authentication',()=>{
  const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
  assert.match(server,/app\.get\('\/api\/leads\/crm', auth, ownerOnly, requireLeadSchema/);
  assert.match(server,/app\.put\('\/api\/leads\/crm', auth, ownerOnly, requireLeadSchema/);
});
