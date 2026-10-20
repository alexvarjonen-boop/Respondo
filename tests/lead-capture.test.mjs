import test from 'node:test';
import assert from 'node:assert/strict';
import { beginLeadCapture, completeLeadCapture } from '../lead-capture.mjs';

test('sales conversation starts localized capture', () => {
  const session = beginLeadCapture({message:'Jag vill köpa',language:'sv'});
  assert.equal(session.intent,'purchase');
  assert.match(session.question,/intresserad/);
});
test('support requests cannot start lead capture', () => {
  assert.equal(beginLeadCapture({message:'Ei toimi, haluan ostaa uuden'}),null);
});
test('contact export requires explicit consent', () => {
  const session = beginLeadCapture({message:'Haluan ostaa'});
  const details = {session,tenantId:'tenant-1',leadId:'lead-1',name:'Customer',email:'customer@example.com'};
  assert.equal(completeLeadCapture({...details,consent:false}).accepted,false);
  assert.equal(completeLeadCapture({...details,consent:'true'}).accepted,false);
  const accepted = completeLeadCapture({...details,consent:true});
  assert.equal(accepted.accepted,true);
  assert.equal(accepted.event.tenantId,'tenant-1');
});
test('forged support session cannot export contact', () => {
  const session = {stage:'details',originalMessage:'Haluan ostaa',intent:'support'};
  assert.equal(completeLeadCapture({session,tenantId:'t',leadId:'l',consent:true}).accepted,false);
});
