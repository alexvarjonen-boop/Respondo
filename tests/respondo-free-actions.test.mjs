import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateFreeWorkflow,previewFreeWorkflow,runFreeWorkflowEvent,
 createFreeWorkflow,markFreeWorkflowApproval} from '../respondo-free-actions.mjs';

const tenant='22222222-2222-4222-8222-222222222222';
const id='33333333-3333-4333-8333-333333333333';
const wf='44444444-4444-4444-8444-444444444444';
const config={name:'Handle new inquiries',trigger:'lead_captured',
 conditions:{language:'fi'},actions:[
  {type:'create_task',title:'Follow up',dueHours:24},
  {type:'request_approval',title:'Check the offer',purpose:'quote'}
 ]};
test('first-party automation is safe and disabled by default',()=>{
 const value=validateFreeWorkflow(config);
 assert.equal(value.enabled,false);
 assert.equal(value.chargeableActionsEnabled,false);
 assert.deepEqual(value.actions.map(x=>x.type),['create_task','request_approval']);
});
test('preview filters the correct language and does not send or charge',()=>{
 const fi=previewFreeWorkflow(config,{language:'fi'});
 assert.equal(fi.matches,true);
 assert.equal(fi.requiresOwnerApproval,true);
 assert.equal(fi.sendsExternalMessages,false);
 assert.equal(fi.chargesCustomer,false);
 assert.equal(fi.confirmsBooking,false);
 assert.equal(previewFreeWorkflow(config,{language:'sv'}).matches,false);
});
test('external or dynamic actions and unsafe conditions are rejected',()=>{
 for(const type of ['send_sms','send_email','webhook','api_call','charge_credit_card',
   'confirm_booking','run_javascript']){
  assert.throws(()=>validateFreeWorkflow({...config,actions:[{type,title:'Run'}]}),/Unsafe/);
 }
 assert.throws(()=>validateFreeWorkflow({...config,conditions:{secret:'x'}}),/condition/);
 assert.throws(()=>validateFreeWorkflow({...config,actions:[
  {type:'request_approval',title:'Refund',purpose:'unknown'}]}),/purpose/);
 assert.throws(()=>validateFreeWorkflow({...config,actions:[
  {type:'create_task',title:'Now',dueHours:10000}]}),/deadline/);
});
test('maximum four actions, duplicate effects and invalid triggers fail closed',()=>{
 assert.throws(()=>validateFreeWorkflow({...config,trigger:'payment_received'}),/Unsupported/);
 assert.throws(()=>validateFreeWorkflow({...config,actions:new Array(5).fill(
  {type:'create_task',title:'Follow up'})}),/one to four/);
 assert.throws(()=>validateFreeWorkflow({...config,actions:[
  {type:'create_task',title:'One'},{type:'create_task',title:'Two'}]}),/Duplicate/);
});
function mockDb({claimed=true}={}){
 const calls=[];
 const row={id:wf,name:config.name,trigger_key:'lead_captured',conditions:{language:'fi'},
  actions:validateFreeWorkflow(config).actions,enabled:true};
 const client={query:async(sql,args)=>{
  calls.push({sql,args});
  if(sql.includes('FROM tenants WHERE id='))return {rowCount:1,rows:[{id:tenant}]};
  if(sql.includes('COUNT(*)'))return {rowCount:1,rows:[{count:0}]};
  if(sql.includes('INSERT INTO respondo_free_workflows'))return {rowCount:1,rows:[{id:wf,enabled:false}]};
  if(sql.includes('INSERT INTO respondo_free_workflow_runs'))return {rowCount:claimed?1:0,rows:claimed?[{event_key:'lead_captured:'+id}]:[]};
  if(sql.includes('INSERT INTO respondo_native_tasks'))return {rowCount:1,rows:[{id}]};
  return {rowCount:1,rows:[]};
 },release:()=>{}};
 return {calls,db:{connect:async()=>client,query:async(sql,args)=>{
  calls.push({sql,args});
  if(sql.includes('FROM respondo_free_workflows WHERE tenant_id='))return {rowCount:1,rows:[row]};
  return {rowCount:0,rows:[]};
 }}};
}
test('workflow execution is transactional, tenant scoped, and no remote calls',async()=>{
 const {db,calls}=mockDb();
 const result=await runFreeWorkflowEvent(db,tenant,'lead_captured',{id,name:'Customer',
  language:'fi',email:'test@example.com'});
 assert.deepEqual(result,{executed:1,approvals:1,externalCalls:0});
 assert(calls.some(c=>c.sql.includes('INSERT INTO respondo_native_tasks')&&c.args[0]===tenant));
 assert(calls.some(c=>c.sql.includes('INSERT INTO respondo_free_workflow_approvals')&&c.args[0]===tenant));
 assert(calls.some(c=>c.sql==='COMMIT'));
 assert(!calls.some(c=>/https?:|sms|webhook|stripe/i.test(c.sql)));
});
test('same event is idempotent, a different language does not execute',async()=>{
 const duplicate=mockDb({claimed:false});
 assert.equal((await runFreeWorkflowEvent(duplicate.db,tenant,'lead_captured',
  {id,name:'Customer',language:'fi'})).executed,0);
 assert(!duplicate.calls.some(c=>c.sql.includes('INSERT INTO respondo_native_tasks')));
 const skipped=mockDb();
 assert.equal((await runFreeWorkflowEvent(skipped.db,tenant,'lead_captured',
  {id,name:'Customer',language:'sv'})).executed,0);
});
test('creating a workflow requires a real tenant and starts disabled',async()=>{
 const {db,calls}=mockDb();
 const result=await createFreeWorkflow(db,tenant,{...config,enabled:true});
 assert.equal(result.enabled,false);
 assert(calls.some(c=>c.sql.includes('FOR UPDATE')&&c.args[0]===tenant));
 assert(calls.some(c=>c.sql.includes('enabled)')&&c.sql.includes('FALSE')));
});
test('review acknowledgement is not an external execution command',async()=>{
 const {db,calls}=mockDb();
 await markFreeWorkflowApproval(db,tenant,wf,'acknowledged');
 assert(calls.some(c=>c.sql.includes("status='pending'")));
 await assert.rejects(markFreeWorkflowApproval(db,tenant,wf,'send'),/Invalid review decision/);
});
test('owner authorization and native trigger dispatch wired in server',()=>{
 const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
 const internal=readFileSync(new URL('../native-ai-operations.mjs',import.meta.url),'utf8');
 assert.match(server,/ensureFreeWorkflowSchema\(pool\)/);
 assert.match(server,/free-workflows',auth,ownerOnly,subscribed/);
 assert.match(internal,/runFreeWorkflowEvent\(db,tenantId,trigger,event\)/);
});
