import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  ensureNativeTaskSchema,validateNativeAutomationTask,enqueueNativeTask,
  nativeTaskOverview,createManualNativeTask,updateNativeTask
} from '../native-taskboard.mjs';
const tenant='af65da90-85a5-4ae1-9260-14355ace433f';
const task='605fb352-91fa-477d-a4eb-7ad10958aafd';
const source='51744379-b767-482f-a80e-0217de46cab1';

test('automatic lead/action tasks are safe, finite, predictable and do not call provider',()=>{
  const lead=validateNativeAutomationTask({
    sourceKind:'lead',sourceId:source,taskKey:'lead_followup',
    title:'Follow up: Liisa',details:'Interested customer',dueHours:24
  });
  assert.equal(lead.dueHours,24);
  assert.equal(lead.sourceId,source);
  assert.throws(()=>validateNativeAutomationTask({
    sourceKind:'api',sourceId:source,taskKey:'external_email',title:'Send email',dueHours:1
  }),TypeError);
  assert.throws(()=>validateNativeAutomationTask({
    sourceKind:'action',sourceId:'no-uuid',taskKey:'action_review',title:'Review',dueHours:1
  }),TypeError);
  assert.throws(()=>validateNativeAutomationTask({
    sourceKind:'lead',sourceId:source,taskKey:'lead_followup',title:'Review',dueHours:-4
  }),TypeError);
});
test('schema is tenant-owned, access-revoked and indexed by deadline',async()=>{
  const sql=[];
  const db={query:async query=>{
    sql.push(query);
    if(query.includes('SELECT rolname'))return {rows:[{rolname:'anon'},
      {rolname:'authenticated'},{rolname:'service_role'}]};
    return {rows:[]};
  }};
  await ensureNativeTaskSchema(db);
  const all=sql.join('\n');
  assert.match(all,/REFERENCES public.tenants\(id\) ON DELETE CASCADE/);
  assert.match(all,/UNIQUE\(tenant_id,source_kind,source_id,task_key\)/);
  assert.match(all,/idx_native_tasks_tenant_due/);
  assert.match(all,/ENABLE ROW LEVEL SECURITY/);
  for(const role of ['anon','authenticated','service_role'])
    assert.match(all,new RegExp('FROM '+role+'(?:\\n|$)'));
});
test('atomic action task enqueue is idempotent by tenant and event',async()=>{
  const calls=[];
  const client={query:async(sql,args)=>{
    calls.push([sql,args]);return {rows:[{id:task,title:args[4]}]};
  }};
  const result=await enqueueNativeTask(client,tenant,{
    sourceKind:'action',sourceId:source,taskKey:'action_review',
    title:'Review new booking',dueHours:4,priority:'urgent'
  });
  assert.equal(result.id,task);
  assert.equal(calls[0][1][0],tenant);
  assert.equal(calls[0][1][1],'action');
  assert.equal(calls[0][1][2],source);
  assert.equal(calls[0][1][4],'Review new booking');
  assert.match(calls[0][0],/ON CONFLICT\(tenant_id,source_kind,source_id,task_key\) DO NOTHING/);
  assert.match(calls[0][0],/NOW\(\)\+\(\$8::double precision\*INTERVAL '1 hour'\)/);
});
test('task board returns only active tenant tasks and accurate overdue count',async()=>{
  const calls=[];
  const db={query:async(sql,args)=>{
    calls.push([sql,args]);
    if(sql.includes('COUNT(*) FILTER'))return {rows:[{open:2,overdue:1,completed:3}]};
    return {rows:[{id:task,title:'Call customer',status:'open'}]};
  }};
  const r=await nativeTaskOverview(db,tenant);
  assert.equal(r.tasks.length,1);assert.equal(r.counts.overdue,1);
  assert.equal(r.remindersStoredInRespondo,true);
  assert.equal(r.externalNotificationsSent,false);
  assert.ok(calls.every(([,args])=>args[0]===tenant));
  assert.ok(calls.every(([sql])=>sql.includes('tenant_id=$1')));
});
test('manual tasks require future due time and do not take client-supplied tenant ID',async()=>{
  const statements=[];
  const db={query:async(sql,args)=>{
    statements.push([sql,args]);return {rows:[{id:task,title:args[1]}]};
  }};
  const date=new Date(Date.now()+3*3600000);
  const r=await createManualNativeTask(db,tenant,'owner-user',{
    title:'Follow up customer',details:'Ask which day works',
    dueAt:date.toISOString(),priority:'urgent',tenantId:'other-tenant'
  });
  assert.equal(r.id,task);
  assert.equal(statements[0][1][0],tenant);
  assert.equal(statements[0][1][1],'Follow up customer');
  assert.equal(statements[0][1][5],'owner-user');
  await assert.rejects(createManualNativeTask(db,tenant,'owner-user',{
    title:'Call',dueAt:'1990-01-01'
  }),TypeError);
});
test('task status is owner-controlled and cannot be arbitrary',async()=>{
  const calls=[];
  const db={query:async(sql,args)=>{
    calls.push([sql,args]);return {rows:[{id:args[1],status:args[2]}]};
  }};
  const result=await updateNativeTask(db,tenant,task,'done');
  assert.equal(result.status,'done');
  assert.match(calls[0][0],/WHERE tenant_id=\$1 AND id=\$2/);
  assert.match(calls[0][0],/completed_at=CASE/);
  await assert.rejects(updateNativeTask(db,tenant,task,'suspend'),TypeError);
  await assert.rejects(updateNativeTask(db,tenant,'bad-uuid','open'),TypeError);
});
test('existing CRM/ticket automations write native tasks in the same transaction',()=>{
  const module=readFileSync(new URL('../native-ai-operations.mjs',import.meta.url),'utf8');
  const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
  const entry=readFileSync(new URL('../server-entry.mjs',import.meta.url),'utf8');
  assert.match(entry,/await ensureNativeTaskSchema\(pool\)/);
  assert.match(module,/await enqueueNativeTask\(client,tenantId,\{\s*sourceKind:'lead'/);
  assert.match(module,/await enqueueNativeTask\(client,tenantId,\{\s*sourceKind:'action'/);
  assert.match(module,/dueHours:24/);
  assert.match(module,/dueHours:4/);
  assert.match(server,/app\.get\('\/api\/app\/native\/tasks',auth,ownerOnly,subscribed/);
  assert.match(server,/createManualNativeTask\(pool,id,req.user.sub,req.body\|\|\{\}\)/);
  assert.match(server,/updateNativeTask\(pool,id,req.params.id,req.body\?\.status\)/);
});
test('owner dashboard localizations and no external notifications',()=>{
  const ui=readFileSync(new URL('../public/native-ai-operations.js',import.meta.url),'utf8');
  assert.match(ui,/fi:\{[\s\S]*?tasks:'Työtehtävät'/);
  assert.match(ui,/sv:\{[\s\S]*?tasks:'Uppgifter'/);
  assert.match(ui,/en:\{[\s\S]*?tasks:'Tasks'/);
  assert.match(ui,/tasksNoNotifications:/);
  assert.match(ui,/function renderTasks\(\)/);
  assert.match(ui,/status:item.status==='open'\?'done':'open'/);
  assert.doesNotMatch(ui,/innerHTML\s*=/);
});
