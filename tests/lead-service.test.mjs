import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareLeadConversation, prepareQualifiedLead, prepareCrmDelivery, summarizeLeads } from '../lead-service.mjs';
import { verifyLeadPayload } from '../lead-webhook.mjs';
const secret = 'a'.repeat(48);
test('conversation classification offers localized next question', () => {
  const result = prepareLeadConversation({message:'Jag vill boka tid',language:'sv'});
  assert.equal(result.intent,'booking');
  assert.equal(result.requiresConsent,true);
  assert.match(result.nextQuestion,/boka/);
});
test('qualified lead yields signed tenant event without sending it', () => {
  const result = prepareQualifiedLead({tenantId:'tenant-1',leadId:'lead-1',message:'Haluan ostaa',name:'Example',email:'buyer@example.com',consent:true});
  assert.equal(result.accepted,true);
  assert.equal(result.event.tenantId,'tenant-1');
  const delivery = prepareCrmDelivery(result.event,secret);
  assert.equal(verifyLeadPayload(delivery.body,delivery.headers['x-respondo-signature'],secret),true);
  assert.equal(summarizeLeads([result.lead]).qualified,1);
});
test('missing consent never creates an exportable event', () => {
  const result = prepareQualifiedLead({tenantId:'tenant-1',leadId:'lead-2',message:'Haluan ostaa',name:'Example',email:'buyer@example.com',consent:false});
  assert.equal(result.accepted,false);
  assert.equal(result.event,null);
});
test('rejects events without tenant identity', () => {
  assert.throws(()=>prepareQualifiedLead({leadId:'lead-3',message:'Haluan ostaa'}),/tenant ID/);
});
