import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCrmEndpoint, deliverQualifiedLead } from '../lead-crm.mjs';
const publicDns=async()=>[{address:'8.8.8.8'}];
const event={event:'lead.qualified',tenantId:'t',leadId:'l',contact:{name:'Buyer',email:'buyer@example.com'}};
test('rejects insecure and local CRM endpoints',async()=>{
  for(const url of ['http://example.com/hook','https://127.0.0.1/hook','https://localhost/hook','https://user:pass@example.com/hook']){
    await assert.rejects(validateCrmEndpoint(url,publicDns));
  }
  await assert.rejects(validateCrmEndpoint('https://crm.example.com/hook',async()=>[{address:'10.0.0.1'}]));
});
test('signed webhook sends event without redirects',async()=>{
  let options;
  const result=await deliverQualifiedLead(event,{url:'https://crm.example.com/hook',secret:'x'.repeat(48),resolve:publicDns,
    fetchImpl:async(_url,request)=>{options=request;return {ok:true}}});
  assert.equal(result.status,'delivered');
  assert.equal(options.redirect,'error');
  assert.match(options.headers['x-respondo-signature'],/^sha256=/);
});
test('unconfigured CRM is disabled',async()=>{
  assert.deepEqual(await deliverQualifiedLead(event),{status:'disabled'});
});
