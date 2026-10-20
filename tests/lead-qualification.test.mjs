import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyLeadIntent, qualifyLead, nextLeadQuestion } from '../lead-qualification.mjs';
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

test('support never receives sales score', () => {
  const lead = qualifyLead({message:'Reklamaatio ja tarjouspyyntö',name:'A',email:'a@example.com',consent:true});
  assert.equal(lead.intent,'support');
  assert.equal(lead.score,0);
  assert.equal(lead.qualified,false);
});
test('consent must be the boolean true', () => {
  const lead = qualifyLead({message:'Haluan ostaa',name:'A',email:'a@example.com',consent:'true'});
  assert.equal(lead.qualified,false);
  assert.equal(lead.contact,null);
});
test('lead follow-up questions are localized', () => {
  assert.match(nextLeadQuestion('quote','fi'),/palvelua/);
  assert.match(nextLeadQuestion('quote','sv'),/tjänst/);
  assert.match(nextLeadQuestion('quote','en'),/service/);
  assert.equal(nextLeadQuestion('support','fi'),null);
});
