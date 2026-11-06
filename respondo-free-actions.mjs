// Respondo Actions: cost-free, first-party automation in the existing PostgreSQL.
// Only local tickets/tasks or explicitly reviewed proposals are allowed.
// Never sends email, initiates payments, books appointments, or calls outside APIs.
import {enqueueNativeTask} from './native-taskboard.mjs';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUUID=v=>UUID.test(String(v||''));
const str=(v,n)=>String(v??'').trim().slice(0,n);
const TRIGGERS=new Set(['lead_captured','action_requested']);
const ACTIONS=new Set(['create_task','open_ticket','request_approval']);
const PURPOSES=new Set(['reply','booking','quote','payment','refund','discount','other']);
const CONDITIONS=new Set(['channel','language','priority']);
const safeLabel=v=>str(v,160).replace(/[\x00-\x1f\x7f]/g,' ');
export function validateFreeWorkflow(input={}){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new TypeError('Invalid workflow');
 const name=safeLabel(input.name);
 if(name.length<3)throw new TypeError('Workflow name must be at least 3 characters');
 if(!TRIGGERS.has(input.trigger))throw new TypeError('Unsupported workflow event');
 if(!Array.isArray(input.actions)||!input.actions.length||input.actions.length>4)
  throw new TypeError('Use one to four internal workflow actions');
 const rawConditions=input.conditions||{};
 if(!rawConditions||typeof rawConditions!=='object'||Array.isArray(rawConditions)||
    Object.keys(rawConditions).length>3||
    Object.keys(rawConditions).some(key=>!CONDITIONS.has(key)))
  throw new TypeError('Unsupported workflow condition');
 const conditions={};
 for(const [key,value] of Object.entries(rawConditions)){
  const v=str(value,40).toLowerCase();
  if(!/^[a-z_]{2,40}$/.test(v))throw new TypeError('Invalid workflow condition');
  conditions[key]=v;
 }
 const actions=input.actions.map(value=>{
  if(!value||typeof value!=='object'||Array.isArray(value)||!ACTIONS.has(value.type))
   throw new TypeError('Unsafe workflow action');
  const purpose=value.type==='request_approval'?str(value.purpose,40):null;
  if(value.type==='request_approval'&&!PURPOSES.has(purpose))
   throw new TypeError('Invalid approval purpose');
  const title=safeLabel(value.title||name);
  if(title.length<3)throw new TypeError('Workflow action title required');
  const dueHours=value.type==='create_task'?Number(value.dueHours??24):null;
  if(value.type==='create_task'&&
     (!Number.isFinite(dueHours)||dueHours<1||dueHours>168))
    throw new TypeError('Invalid task deadline');
  return {type:value.type,title,
    ...(purpose?{purpose}:{}),
    ...(dueHours!=null?{dueHours}:{})};
 });
 if(new Set(actions.map(a=>a.type+':'+(a.purpose||''))).size!==actions.length)
  throw new TypeError('Duplicate action in workflow');
 return {name,trigger:input.trigger,conditions,actions,
  enabled:input.enabled===true,chargeableActionsEnabled:false};
}
export function previewFreeWorkflow(config,event={}){
 const rule=validateFreeWorkflow(config);
 const e=event&&typeof event==='object'?event:{};
 const matches=Object.entries(rule.conditions).every(([key,value])=>
   str(e[key],40).toLowerCase()===value);
 return {matches,actions:matches?rule.actions:[],
  sendsExternalMessages:false,confirmsBooking:false,chargesCustomer:false,
  requiresOwnerApproval:matches&&rule.actions.some(a=>a.type==='request_approval')};
}
export async function ensureFreeWorkflowSchema(db){
 await db.query(`CREATE TABLE IF NOT EXISTS public.respondo_free_workflows(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_key TEXT NOT NULL CHECK(trigger_key IN ('lead_captured','action_requested')),
  conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  actions JSONB NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
 await db.query(`CREATE TABLE IF NOT EXISTS public.respondo_free_workflow_runs(
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES public.respondo_free_workflows(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(tenant_id,workflow_id,event_key))`);
 await db.query(`CREATE TABLE IF NOT EXISTS public.respondo_free_workflow_approvals(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES public.respondo_free_workflows(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK(purpose IN ('reply','booking','quote','payment','refund','discount','other')),
  title TEXT NOT NULL,details TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','acknowledged','dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id,workflow_id,event_key,purpose))`);
 for(const name of ['respondo_free_workflows','respondo_free_workflow_runs',
  'respondo_free_workflow_approvals']){
  await db.query('ALTER TABLE public.'+name+' ENABLE ROW LEVEL SECURITY');
  await db.query('REVOKE ALL PRIVILEGES ON TABLE public.'+name+' FROM PUBLIC');
  const roles=await db.query("SELECT rolname FROM pg_roles WHERE rolname=ANY($1::text[])",[
   ['anon','authenticated','service_role']]);
  for(const row of roles.rows||[])
   if(['anon','authenticated','service_role'].includes(row.rolname))
    await db.query('REVOKE ALL PRIVILEGES ON TABLE public.'+name+' FROM '+row.rolname);
 }
 await db.query(`CREATE INDEX IF NOT EXISTS idx_free_workflows_tenant
  ON public.respondo_free_workflows(tenant_id,trigger_key,enabled)`);
}
export async function freeWorkflowOverview(db,tenantId){
 if(!isUUID(tenantId))throw new TypeError('Invalid workspace');
 const [flows,approvals]=await Promise.all([
  db.query(`SELECT id,name,trigger_key,conditions,actions,enabled,created_at
   FROM respondo_free_workflows WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 50`,[tenantId]),
  db.query(`SELECT id,workflow_id,event_key,purpose,title,details,status,created_at
   FROM respondo_free_workflow_approvals WHERE tenant_id=$1
   ORDER BY created_at DESC LIMIT 50`,[tenantId])
 ]);
 return {workflows:flows.rows||[],approvals:approvals.rows||[],
  providerChargesTriggered:0,externalDeliveryEnabled:false};
}
export async function createFreeWorkflow(db,tenantId,payload){
 if(!isUUID(tenantId))throw new TypeError('Invalid workspace');
 const rule=validateFreeWorkflow(payload);
 // Creating a rule is always disabled until the owner explicitly enables it.
 const client=await db.connect();
 try{
  await client.query('BEGIN');
  const found=await client.query('SELECT id FROM tenants WHERE id=$1 FOR UPDATE',[tenantId]);
  if(!found.rowCount)throw new TypeError('Workspace missing');
  const count=await client.query(
   'SELECT COUNT(*)::integer AS count FROM respondo_free_workflows WHERE tenant_id=$1',
   [tenantId]);
  if(Number(count.rows[0]?.count)>=12)throw new TypeError('Maximum 12 workflows per company');
  const saved=await client.query(`INSERT INTO respondo_free_workflows(
   tenant_id,name,trigger_key,conditions,actions,enabled)
   VALUES($1,$2,$3,$4::jsonb,$5::jsonb,FALSE)
   RETURNING id,name,trigger_key,enabled`,
   [tenantId,rule.name,rule.trigger,JSON.stringify(rule.conditions),
    JSON.stringify(rule.actions)]);
  await client.query('COMMIT');
  return saved.rows[0];
 }catch(e){await client.query('ROLLBACK').catch(()=>{});throw e}
 finally{client.release()}
}
export async function setFreeWorkflowEnabled(db,tenantId,id,enabled){
 if(!isUUID(tenantId)||!isUUID(id)||typeof enabled!=='boolean')
  throw new TypeError('Invalid workflow update');
 const r=await db.query(`UPDATE respondo_free_workflows
   SET enabled=$3,updated_at=NOW() WHERE tenant_id=$1 AND id=$2
   RETURNING id,enabled`,[tenantId,id,enabled]);
 return r.rows[0]||null;
}
export async function markFreeWorkflowApproval(db,tenantId,id,status){
 if(!isUUID(tenantId)||!isUUID(id)||!['acknowledged','dismissed'].includes(status))
  throw new TypeError('Invalid review decision');
 const r=await db.query(`UPDATE respondo_free_workflow_approvals SET status=$3,updated_at=NOW()
   WHERE tenant_id=$1 AND id=$2 AND status='pending'
   RETURNING id,status`,[tenantId,id,status]);
 return r.rows[0]||null;
}
export async function runFreeWorkflowEvent(db,tenantId,trigger,event){
 if(!isUUID(tenantId)||!TRIGGERS.has(trigger)||!isUUID(event?.id))
  throw new TypeError('Invalid native workflow event');
 const rules=await db.query(`SELECT id,name,trigger_key,conditions,actions,enabled
  FROM respondo_free_workflows WHERE tenant_id=$1 AND trigger_key=$2 AND enabled=TRUE
  ORDER BY created_at ASC LIMIT 12`,[tenantId,trigger]);
 let executed=0,approvals=0;
 const eventKey=trigger+':'+event.id;
 for(const row of rules.rows||[]){
  const plan=previewFreeWorkflow({name:row.name,trigger:row.trigger_key,
   conditions:row.conditions,actions:row.actions,enabled:row.enabled},event);
  if(!plan.matches)continue;
  const client=await db.connect();
  try{
   await client.query('BEGIN');
   const claim=await client.query(`INSERT INTO respondo_free_workflow_runs(
     tenant_id,workflow_id,event_key) VALUES($1,$2,$3)
     ON CONFLICT DO NOTHING RETURNING event_key`,[tenantId,row.id,eventKey]);
   if(claim.rowCount){
    const subject=safeLabel(event.title||event.name||'Customer request');
    const description=str(event.details||event.note||'',1200);
    for(const action of plan.actions){
     if(action.type==='create_task'){
      await enqueueNativeTask(client,tenantId,{
       sourceKind:trigger==='lead_captured'?'lead':'action',sourceId:event.id,
       taskKey:trigger==='lead_captured'?'lead_followup':'action_review',
       title:action.title+': '+subject,details:description,
       dueHours:action.dueHours,priority:event.priority==='urgent'?'urgent':'normal'
      });
     }else if(action.type==='open_ticket'){
      await client.query(`INSERT INTO respondo_native_tickets(
        tenant_id,source_kind,source_id,title,details,priority)
        VALUES($1,'free_workflow',$2,$3,$4,$5)
        ON CONFLICT(tenant_id,source_kind,source_id) DO NOTHING`,
       [tenantId,event.id,action.title+': '+subject,description,
        event.priority==='urgent'?'urgent':'normal']);
     }else if(action.type==='request_approval'){
      await client.query(`INSERT INTO respondo_free_workflow_approvals(
       tenant_id,workflow_id,event_key,purpose,title,details)
       VALUES($1,$2,$3,$4,$5,$6)
       ON CONFLICT DO NOTHING`,
       [tenantId,row.id,eventKey,action.purpose,action.title+': '+subject,description]);
      approvals++;
     }else throw new TypeError('Unsafe workflow action');
    }
    executed++;
   }
   await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK').catch(()=>{});throw e}
  finally{client.release()}
 }
 return {executed,approvals,externalCalls:0};
}
