import test from 'node:test';
import assert from 'node:assert/strict';
import { signLeadPayload, verifyLeadPayload, buildLeadEvent } from '../lead-webhook.mjs';
const secret = '0123456789abcdef0123456789abcdef';
test('webhook signatures reject tampering', () => {
  const {body,signature} = signLeadPayload({event:'lead.qualified'},secret);
  assert.equal(verifyLeadPayload(body,signature,secret),true);
  assert.equal(verifyLeadPayload(body+' ',signature,secret),false);
});
test('export rejects unqualified or nonconsenting leads', () => {
  assert.throws(() => buildLeadEvent({tenantId:'t',leadId:'l',lead:{qualified:false,contact:{}}}));
  assert.throws(() => buildLeadEvent({tenantId:'t',leadId:'l',lead:{qualified:true,contact:null}}));
});
test('event contains tenant identifier and only intended lead fields', () => {
  const event=buildLeadEvent({tenantId:'tenant',leadId:'lead',lead:{qualified:true,contact:{name:'A'},intent:'quote',score:80},occurredAt:'2026-10-20T00:00:00Z'});
  assert.equal(event.tenantId,'tenant');
  assert.equal(event.event,'lead.qualified');
  assert.equal(event.score,80);
});
