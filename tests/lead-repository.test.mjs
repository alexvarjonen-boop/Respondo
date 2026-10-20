import test from 'node:test';
import assert from 'node:assert/strict';
import { saveQualifiedLead, listQualifiedLeads, leadAnalyticsForTenant } from '../lead-repository.mjs';

const event = {event:'lead.qualified',tenantId:'tenant-a',leadId:'lead-1',intent:'quote',score:80,contact:{name:'Buyer',email:'buyer@example.com'},occurredAt:'2026-10-20T10:00:00Z'};
test('rejects cross-tenant lead writes before querying database', async () => {
  const pool = {query:()=>{throw Error('database must not be queried')}};
  await assert.rejects(saveQualifiedLead(pool,'tenant-b',event),/Invalid tenant-scoped/);
});
test('persists only parameterized tenant-scoped lead', async () => {
  const calls = [];
  const pool = {query:async (sql,params)=>{calls.push({sql,params});return {rowCount:1}}};
  assert.deepEqual(await saveQualifiedLead(pool,'tenant-a',event),{saved:true});
  assert.equal(calls[0].params[0],'tenant-a');
  assert.match(calls[0].sql,/ON CONFLICT/);
});
test('lists only authenticated tenant leads with bounded limit', async () => {
  const calls = [];
  const pool = {query:async (sql,params)=>{calls.push(params);return {rows:[]}}};
  await listQualifiedLeads(pool,'tenant-a',999);
  assert.deepEqual(calls[0],['tenant-a',100]);
});
test('analytics omit contact data', async () => {
  const pool = {query:async()=>({rows:[{qualified:true,intent:'quote',score:80,contact:{email:'secret@example.com'}}]})};
  const result = await leadAnalyticsForTenant(pool,'tenant-a');
  assert.equal(result.qualified,1);
  assert.doesNotMatch(JSON.stringify(result),/secret@example.com/);
});
