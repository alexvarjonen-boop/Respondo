import {randomUUID} from 'node:crypto';
import { enqueueNativeTask } from './native-taskboard.mjs';

const RULES=[['lead_captured','save_contact'],['action_requested','open_ticket']];
const STATES=new Set(['new','contacted','qualified','won','lost']);
const TICKET_STATES=new Set(['open','in_progress','waiting','done']);
const text=(v,max)=>String(v??'').trim().slice(0,max);
const uuid=v=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v||''));
export function validateContact(value={}){
  const name=text(value.name,120),email=text(value.email,254).toLowerCase(),phone=text(value.phone,40);
  const e=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const p=/^\+?[\d\s().-]{6,40}$/.test(phone);
  if(!name||(!e&&!p))throw new TypeError('Contact needs a name and valid email or phone');
  return {name,email:e?email:'',phone:p?phone:'',note:text(value.note,1200),
    stage:STATES.has(value.stage)?value.stage:'new'};
}
export function calculateNativeQuote(tenant,quantity){
  const n=Number(quantity);
  if(!Number.isFinite(n)||n<=0||n>100000||!Number.isInteger(n*1000))throw new TypeError('Invalid quantity');
  const money=v=>Number.isFinite(Number(v))&&Number(v)>=0?Number(v):0;
  const base=money(tenant.quote_base_price),unit=money(tenant.quote_unit_price);
  const min=money(tenant.quote_min_price),vat=Math.min(30,money(tenant.quote_vat_percent));
  if(!(base>0||unit>0||min>0))throw new TypeError('Configure verified service prices first');
  const cents=Math.round(Math.max(min,base+unit*n)*(1+vat/100)*100);
  if(!Number.isSafeInteger(cents)||cents>100000000)throw new TypeError('Quote value out of bounds');
  return {service:text(tenant.quote_service_name||'Service',120),quantity:n,
    totalCents:cents,currency:'EUR'};
}
export async function ensureNativeOperationsSchema(db){
  const tables=[
    `CREATE TABLE IF NOT EXISTS public.respondo_native_contacts(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
      source_lead_id UUID,
      name TEXT NOT NULL,email TEXT NOT NULL DEFAULT '',phone TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      stage TEXT NOT NULL DEFAULT 'new' CHECK(stage IN ('new','contacted','qualified','won','lost')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(tenant_id,source_lead_id))`,
    `CREATE TABLE IF NOT EXISTS public.respondo_native_tickets(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
      source_kind TEXT NOT NULL DEFAULT 'manual',
      source_id UUID,
      title TEXT NOT NULL,details TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','waiting','done')),
      priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('normal','urgent')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(tenant_id,source_kind,source_id))`,
    `CREATE TABLE IF NOT EXISTS public.respondo_native_quotes(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
      service TEXT NOT NULL,quantity NUMERIC NOT NULL,total_cents BIGINT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'EUR',
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','approved')),
      note TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS public.respondo_native_rules(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
      trigger_key TEXT NOT NULL CHECK(trigger_key IN ('lead_captured','action_requested')),
      action_key TEXT NOT NULL CHECK(action_key IN ('save_contact','open_ticket')),
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(tenant_id,trigger_key,action_key))`,
    `CREATE TABLE IF NOT EXISTS public.respondo_native_runs(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
      rule_id UUID NOT NULL REFERENCES public.respondo_native_rules(id) ON DELETE CASCADE,
      event_key TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(tenant_id,rule_id,event_key))`,
    `CREATE TABLE IF NOT EXISTS public.respondo_native_documents(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
      knowledge_id UUID,
      title TEXT NOT NULL,body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('published','draft')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`
  ];
  for(const sql of tables)await db.query(sql);
  for(const table of ['respondo_native_contacts','respondo_native_tickets',
    'respondo_native_quotes','respondo_native_rules','respondo_native_runs',
    'respondo_native_documents']){
    await db.query('ALTER TABLE public.'+table+' ENABLE ROW LEVEL SECURITY');
    await db.query('REVOKE ALL PRIVILEGES ON TABLE public.'+table+' FROM PUBLIC, anon, authenticated, service_role');
  }
}
async function defaults(db,tenantId){
  for(const [trigger,action] of RULES)
    await db.query(`INSERT INTO respondo_native_rules(tenant_id,trigger_key,action_key)
      VALUES($1,$2,$3) ON CONFLICT(tenant_id,trigger_key,action_key) DO NOTHING`,
      [tenantId,trigger,action]);
}
export async function nativeOverview(db,tenantId){
  await defaults(db,tenantId);
  const sql=[
    'SELECT id,name,email,phone,note,stage,created_at FROM respondo_native_contacts WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 75',
    'SELECT id,title,details,status,priority,source_kind,created_at FROM respondo_native_tickets WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 75',
    'SELECT id,service,quantity,total_cents,currency,status,note,created_at FROM respondo_native_quotes WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 50',
    'SELECT id,trigger_key,action_key,enabled FROM respondo_native_rules WHERE tenant_id=$1 ORDER BY trigger_key',
    'SELECT id,title,status,created_at FROM respondo_native_documents WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 50',
    'SELECT id,event_key,created_at FROM respondo_native_runs WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 15'
  ];
  const rows=await Promise.all(sql.map(query=>db.query(query,[tenantId])));
  return Object.fromEntries(['contacts','tickets','quotes','rules','documents','recentRuns'].map((key,i)=>[key,rows[i].rows]));
}
export async function createNativeContact(db,tenantId,payload){
  const x=validateContact(payload);
  const r=await db.query(`INSERT INTO respondo_native_contacts(tenant_id,name,email,phone,note,stage)
    VALUES($1,$2,$3,$4,$5,$6) RETURNING id,name,email,phone,note,stage`,
    [tenantId,x.name,x.email,x.phone,x.note,x.stage]);
  return r.rows[0];
}
export async function updateNativeContact(db,tenantId,id,payload){
  if(!uuid(id)||!STATES.has(payload.stage))throw new TypeError('Invalid contact update');
  const r=await db.query(`UPDATE respondo_native_contacts SET stage=$3,updated_at=NOW()
    WHERE tenant_id=$1 AND id=$2 RETURNING id,stage`,[tenantId,id,payload.stage]);
  return r.rows[0]||null;
}
export async function createNativeTicket(db,tenantId,payload){
  const title=text(payload.title,160),details=text(payload.details,2000);
  if(title.length<3)throw new TypeError('Ticket title required');
  const priority=payload.priority==='urgent'?'urgent':'normal';
  const r=await db.query(`INSERT INTO respondo_native_tickets(tenant_id,title,details,priority)
    VALUES($1,$2,$3,$4) RETURNING id,title,details,status,priority`,
    [tenantId,title,details,priority]);
  return r.rows[0];
}
export async function updateNativeTicket(db,tenantId,id,payload){
  if(!uuid(id)||!TICKET_STATES.has(payload.status))throw new TypeError('Invalid ticket state');
  const r=await db.query(`UPDATE respondo_native_tickets SET status=$3,updated_at=NOW()
    WHERE tenant_id=$1 AND id=$2 RETURNING id,status`,[tenantId,id,payload.status]);
  return r.rows[0]||null;
}
export async function createNativeQuote(db,tenantId,quantity,note=''){
  const tr=await db.query(`SELECT quote_base_price,quote_unit_price,quote_min_price,
    quote_vat_percent,quote_service_name FROM tenants WHERE id=$1`,[tenantId]);
  if(!tr.rows[0])throw new TypeError('Workspace not found');
  const x=calculateNativeQuote(tr.rows[0],quantity);
  const r=await db.query(`INSERT INTO respondo_native_quotes
    (tenant_id,service,quantity,total_cents,note)
    VALUES($1,$2,$3,$4,$5) RETURNING id,service,quantity,total_cents,status`,
    [tenantId,x.service,x.quantity,x.totalCents,text(note,700)]);
  return r.rows[0];
}
export async function updateNativeQuote(db,tenantId,id,status){
  if(!uuid(id)||!['draft','approved'].includes(status))throw new TypeError('Invalid quote status');
  const r=await db.query(`UPDATE respondo_native_quotes SET status=$3,updated_at=NOW()
    WHERE tenant_id=$1 AND id=$2 RETURNING id,status`,[tenantId,id,status]);
  return r.rows[0]||null;
}
export async function setNativeRule(db,tenantId,trigger,action,enabled){
  if(typeof enabled!=='boolean'||!RULES.some(x=>x[0]===trigger&&x[1]===action))
    throw new TypeError('Unsupported automation rule');
  await defaults(db,tenantId);
  const r=await db.query(`UPDATE respondo_native_rules SET enabled=$4,updated_at=NOW()
    WHERE tenant_id=$1 AND trigger_key=$2 AND action_key=$3 RETURNING id,enabled`,
    [tenantId,trigger,action,enabled]);
  return r.rows[0];
}
export async function saveNativeDocument(db,tenantId,payload){
  const title=text(payload.title,160),body=text(payload.body,8000);
  if(title.length<3||body.length<20||payload.publish!==true)
    throw new TypeError('Document needs title, body and explicit publication approval');
  const client=await db.connect();
  try {
    await client.query('BEGIN');
    const k=await client.query(`INSERT INTO knowledge(id,tenant_id,category,title,answer,
       keywords,source_type,approved,verified_at)
       VALUES($1,$2,'Yrityksen dokumentit',$3,$4,$5,'native_document',TRUE,NOW()) RETURNING id`,
      [randomUUID(),tenantId,title,body,title.toLowerCase().split(/\s+/).filter(x=>x.length>2).slice(0,12)]);
    const r=await client.query(`INSERT INTO respondo_native_documents
      (tenant_id,knowledge_id,title,body,status) VALUES($1,$2,$3,$4,'published')
      RETURNING id,title,status`,[tenantId,k.rows[0].id,title,body]);
    await client.query('COMMIT');
    return r.rows[0];
  } catch(error){await client.query('ROLLBACK');throw error;}
  finally{client.release();}
}
export async function removeNativeDocument(db,tenantId,id){
  if(!uuid(id))throw new TypeError('Invalid document ID');
  const client=await db.connect();
  try {
    await client.query('BEGIN');
    const r=await client.query(`DELETE FROM respondo_native_documents
      WHERE tenant_id=$1 AND id=$2 RETURNING knowledge_id`,[tenantId,id]);
    if(r.rows[0]?.knowledge_id)
      await client.query(`DELETE FROM knowledge WHERE tenant_id=$1 AND id=$2 AND source_type='native_document'`,
        [tenantId,r.rows[0].knowledge_id]);
    await client.query('COMMIT');
    return Boolean(r.rows[0]);
  } catch(error){await client.query('ROLLBACK');throw error;}
  finally{client.release();}
}
export async function runNativeAutomation(db,tenantId,trigger,event){
  if(!['lead_captured','action_requested'].includes(trigger)||!uuid(event?.id))
    throw new TypeError('Invalid automation event');
  await defaults(db,tenantId);
  const rules=await db.query(`SELECT id,action_key FROM respondo_native_rules
    WHERE tenant_id=$1 AND trigger_key=$2 AND enabled=TRUE`,[tenantId,trigger]);
  let executed=0;
  for(const rule of rules.rows){
    const client=await db.connect();
    try {
      await client.query('BEGIN');
      const run=await client.query(`INSERT INTO respondo_native_runs(tenant_id,rule_id,event_key)
        VALUES($1,$2,$3) ON CONFLICT(tenant_id,rule_id,event_key) DO NOTHING RETURNING id`,
        [tenantId,rule.id,trigger+':'+event.id]);
      if(run.rowCount) {
        if(trigger==='lead_captured'&&rule.action_key==='save_contact'){
          const contact=validateContact(event);
          await client.query(`INSERT INTO respondo_native_contacts
            (tenant_id,source_lead_id,name,email,phone,note)
            VALUES($1,$2,$3,$4,$5,$6)
            ON CONFLICT(tenant_id,source_lead_id) DO NOTHING`,
            [tenantId,event.id,contact.name,contact.email,contact.phone,contact.note]);
          await enqueueNativeTask(client,tenantId,{
            sourceKind:'lead',sourceId:event.id,taskKey:'lead_followup',
            title:'Follow up: '+contact.name,
            details:text(event.note||'Customer lead',1200),
            dueHours:24,priority:'normal'
          });
        }else if(trigger==='action_requested'&&rule.action_key==='open_ticket'){
          await client.query(`INSERT INTO respondo_native_tickets
            (tenant_id,source_kind,source_id,title,details,priority)
            VALUES($1,'action',$2,$3,$4,$5)
            ON CONFLICT(tenant_id,source_kind,source_id) DO NOTHING`,
            [tenantId,event.id,text(event.title||'Customer request',160),
              text(event.details,2000),event.priority==='urgent'?'urgent':'normal']);
          await enqueueNativeTask(client,tenantId,{
            sourceKind:'action',sourceId:event.id,taskKey:'action_review',
            title:'Review: '+text(event.title||'Customer request',140),
            details:text(event.details||'Customer action requires review',1200),
            dueHours:4,priority:event.priority==='urgent'?'urgent':'normal'
          });
        }else throw new Error('Unsafe automation action');
        executed++;
      }
      await client.query('COMMIT');
    } catch(error){await client.query('ROLLBACK');throw error;}
    finally{client.release();}
  }
  return {executed};
}
