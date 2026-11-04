// First-party task board and automation follow-ups.
// No email, SMS, Meta, external CRM, or chargeable AI calls.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid=x=>UUID.test(String(x||''));
const txt=(v,max)=>String(v??'').trim().slice(0,max);
const KINDS=new Set(['lead','action','manual']);
const KEYS=new Set(['lead_followup','action_review','manual']);
export async function ensureNativeTaskSchema(db){
  await db.query(`CREATE TABLE IF NOT EXISTS public.respondo_native_tasks(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    source_kind TEXT NOT NULL CHECK(source_kind IN ('lead','action','manual')),
    source_id UUID,
    task_key TEXT NOT NULL CHECK(task_key IN ('lead_followup','action_review','manual')),
    title TEXT NOT NULL,details TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','done')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('normal','urgent')),
    due_at TIMESTAMPTZ NOT NULL,
    created_by TEXT NOT NULL DEFAULT 'automation',
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id,source_kind,source_id,task_key)
  )`);
  await db.query('CREATE INDEX IF NOT EXISTS idx_native_tasks_tenant_due ON public.respondo_native_tasks(tenant_id,status,due_at ASC)');
  await db.query('ALTER TABLE public.respondo_native_tasks ENABLE ROW LEVEL SECURITY');
  await db.query('REVOKE ALL PRIVILEGES ON TABLE public.respondo_native_tasks FROM PUBLIC');
  const r=await db.query("SELECT rolname FROM pg_roles WHERE rolname=ANY($1::text[])",[['anon','authenticated','service_role']]);
  for(const v of r.rows||[])if(['anon','authenticated','service_role'].includes(v.rolname))
    await db.query('REVOKE ALL PRIVILEGES ON TABLE public.respondo_native_tasks FROM '+v.rolname);
}
export function validateNativeAutomationTask({
  sourceKind,sourceId,taskKey,title,details='',dueHours=24,priority='normal'
}={}){
  if(!KINDS.has(sourceKind)||!KEYS.has(taskKey))throw new TypeError('Unsupported task type');
  if(sourceKind==='lead'&&taskKey!=='lead_followup')throw new TypeError('Invalid lead task');
  if(sourceKind==='action'&&taskKey!=='action_review')throw new TypeError('Invalid action task');
  if(sourceKind==='manual'||!isUuid(sourceId)){
    if(sourceKind!=='manual')throw new TypeError('Source event ID is required');
  }
  const value=Number(dueHours),label=txt(title,160),note=txt(details,1200);
  if(!Number.isFinite(value)||value<0.1||value>168||label.length<3)
    throw new TypeError('Invalid task deadline or title');
  return {sourceKind,sourceId:sourceKind==='manual'?null:sourceId,taskKey,
    title:label,details:note,dueHours:value,priority:priority==='urgent'?'urgent':'normal'};
}
export async function enqueueNativeTask(client,tenantId,task){
  const x=validateNativeAutomationTask(task);
  const r=await client.query(`INSERT INTO respondo_native_tasks(
    tenant_id,source_kind,source_id,task_key,title,details,priority,due_at,created_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,NOW()+($8::double precision*INTERVAL '1 hour'),'automation')
    ON CONFLICT(tenant_id,source_kind,source_id,task_key) DO NOTHING
    RETURNING id,title,due_at`,
    [tenantId,x.sourceKind,x.sourceId,x.taskKey,x.title,x.details,x.priority,x.dueHours]);
  return r.rows[0]||null;
}
export async function nativeTaskOverview(db,tenantId){
  const [tasks,counts]=await Promise.all([
    db.query(`SELECT id,source_kind,task_key,title,details,status,priority,due_at,
      created_at,completed_at FROM respondo_native_tasks
      WHERE tenant_id=$1 ORDER BY (status='open') DESC,
        (priority='urgent') DESC,due_at ASC LIMIT 100`,[tenantId]),
    db.query(`SELECT COUNT(*) FILTER(WHERE status='open')::int AS open,
      COUNT(*) FILTER(WHERE status='open' AND due_at<NOW())::int AS overdue,
      COUNT(*) FILTER(WHERE status='done')::int AS completed
      FROM respondo_native_tasks WHERE tenant_id=$1`,[tenantId])
  ]);
  return {tasks:tasks.rows||[],counts:counts.rows[0]||{open:0,overdue:0,completed:0},
    remindersStoredInRespondo:true,externalNotificationsSent:false};
}
export async function createManualNativeTask(db,tenantId,userId,payload={}){
  const title=txt(payload.title,160),details=txt(payload.details,1200);
  const dueAt=new Date(payload.dueAt);
  if(title.length<3||!Number.isFinite(dueAt.getTime())||
     dueAt.getTime()<=Date.now()+60000||
     dueAt.getTime()>Date.now()+366*86400000)
    throw new TypeError('Provide a title and a future deadline within 366 days');
  const priority=payload.priority==='urgent'?'urgent':'normal';
  const r=await db.query(`INSERT INTO respondo_native_tasks(
    tenant_id,source_kind,task_key,title,details,priority,due_at,created_by)
    VALUES($1,'manual','manual',$2,$3,$4,$5,$6)
    RETURNING id,title,status,due_at`,
    [tenantId,title,details,priority,dueAt.toISOString(),txt(userId,120)]);
  return r.rows[0];
}
export async function updateNativeTask(db,tenantId,id,status){
  if(!isUuid(id)||!['open','done'].includes(status))
    throw new TypeError('Invalid task state');
  const r=await db.query(`UPDATE respondo_native_tasks
    SET status=$3,completed_at=CASE WHEN $3='done' THEN NOW() ELSE NULL END,
      updated_at=NOW() WHERE tenant_id=$1 AND id=$2
    RETURNING id,status,completed_at`,[tenantId,id,status]);
  return r.rows[0]||null;
}
