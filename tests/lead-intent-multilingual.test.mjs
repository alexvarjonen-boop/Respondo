import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyLeadIntent,qualifyLead} from '../lead-qualification.mjs';
for(const [message,intent] of [
 ['Haluan tarjouksen','quote'],['Can I get a quote for this?','quote'],['Få offert','quote'],
 ['Book a demo','booking'],['Boka demo','booking'],['Haluaisin ostaa','purchase'],
 ['Vill köpa','purchase'],['I would like to buy','purchase'],
 ['En halua ostaa','unknown'],["I don't want to buy",'unknown'],
 ['Inte intresserad','unknown'],['Speak to a human agent','support'],
 ['Puhu ihmiselle','support'],['Prata med en människa','support']
])test('multilingual intent: '+message,()=>assert.equal(classifyLeadIntent(message).intent,intent));
test('negated intent cannot create a qualified lead',()=>{
 assert.equal(qualifyLead({message:'En halua ostaa',name:'Example',email:'example@example.com',consent:true}).qualified,false);
});
