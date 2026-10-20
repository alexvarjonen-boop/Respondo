import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyLeadIntent, qualifyLead } from '../lead-qualification.mjs';
test('detects Finnish Swedish and English purchase intent', () => {
  for (const message of ['Haluan ostaa tämän', 'I want to buy this', 'Jag vill köpa']) assert.equal(classifyLeadIntent(message).intent, 'purchase');
});
test('detects quotation and booking requests', () => {
  assert.equal(classifyLeadIntent('Paljonko maksaa verkkosivusto?').intent, 'quote');
  assert.equal(classifyLeadIntent('Haluaisin varata ajan').intent, 'booking');
});
test('never qualifies or exposes contact details without consent', () => {
  const lead = qualifyLead({ message:'Haluan ostaa', name:'Test', email:'test@example.com', consent:false });
  assert.equal(lead.qualified, false);
  assert.equal(lead.score, 0);
  assert.equal(lead.contact, null);
});
test('requires usable contact details and a name', () => {
  assert.equal(qualifyLead({message:'Haluan ostaa',name:'Test',email:'bad',consent:true}).qualified,false);
  assert.equal(qualifyLead({message:'Haluan ostaa',name:'Test',email:'test@example.com',consent:true}).qualified,true);
});
test('support requests are not treated as sales leads', () => {
  assert.equal(qualifyLead({message:'Ei toimi',name:'Test',email:'test@example.com',consent:true}).qualified,false);
});
