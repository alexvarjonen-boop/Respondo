import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compileWorkflowDescription} from '../respondo-workflow-descriptions.mjs';
import {validateFreeWorkflow} from '../respondo-free-actions.mjs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('English quote request yields internal task plus approval, inactive',()=>{
 const result=compileWorkflowDescription({description:'When a quote request arrives, create a task and request approval'});
 assert.equal(result.rule.trigger,'action_requested');
 assert.equal(result.rule.enabled,false);
 assert.deepEqual(result.rule.actions.map(x=>x.type),['create_task','request_approval']);
 assert.equal(result.rule.actions[1].purpose,'quote');
 assert.equal(result.automatedLanguageModelUsed,false);
 assert.equal(result.makesExternalCalls,false);
 assert.equal(validateFreeWorkflow(result.rule).chargeableActionsEnabled,false);
});

test('Finnish lead and accented text are recognized',()=>{
 const result=compileWorkflowDescription({description:'Kun uusi liidi saapuu, luo tehtävä ja pyydä hyväksyntä'});
 assert.equal(result.rule.trigger,'lead_captured');
 assert.deepEqual(result.rule.actions.map(x=>x.type),['create_task','request_approval']);
 assert.equal(result.rule.enabled,false);
});

test('Swedish quote request and internal task with approval are recognized',()=>{
 const result=compileWorkflowDescription({description:'När offertförfrågan kommer, skapa en uppgift och begär godkännande'});
 assert.equal(result.rule.trigger,'action_requested');
 assert.deepEqual(result.rule.actions.map(x=>x.type),['create_task','request_approval']);
});

test('reject unsupported external execution instead of silently dropping requested actions',()=>{
 for(const description of [
  'When a new lead arrives, send an email and create a task',
  'When a booking request arrives, confirm the booking automatically',
  'When a customer request arrives, charge the customer and open a ticket',
  'When a new lead arrives, send sms to the client',
  'Kun uusi liidi saapuu, lähetä sähköposti ja luo tehtävä'
 ])assert.throws(()=>compileWorkflowDescription({description}),/External delivery/);
});

test('reject ambiguous triggers, unsupported actions and unbounded text',()=>{
 for(const description of [
  'Create a task immediately without any trigger',
  'When a new lead and booking request arrive, create a task',
  'When a new lead arrives, contact the customer automatically',
  'When quote request arrives, do something',
  'x'.repeat(601)
 ])assert.throws(()=>compileWorkflowDescription({description}),TypeError);
});

test('description route owner-only, UI requires owner review before workflow creation',()=>{
 const server=read('server.mjs'),ui=read('public/native-ai-operations.js');
 assert.match(server,/free-workflows\/describe',auth,ownerOnly,subscribed,nativeWriteLimiter/);
 assert.match(ui,/FLOWS\+'\/describe'/);
 assert.match(ui,/flowAction\('POST',FLOWS,rule\)/);
 assert.match(ui,/Save this reviewed workflow disabled/);
});
