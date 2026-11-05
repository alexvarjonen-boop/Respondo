// Respondo first-party inbox. All data stays within this installation.
// Does NOT fetch mail or send any external-channel message.
import {randomUUID} from 'node:crypto';
import {triageNativeMail} from './native-mail-triage.mjs';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid=v=>UUID.test(String(v||''));
const clean=(v,max)=>String(v??'').trim().slice(0,max);
function ensureThreadId(v){if(!isUuid(v))throw new TypeError('Invalid thread ID');return v;}
const fold=v=>String(v||'').normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();
const tokens=v=>new Set(fold(v).split(' ').filter(x=>x.length>=4));
export function nativeInboxDraftSuggestion(question,sources=[],language='fi'){
  const query=clean(question,600);
  if(query.length<4)return null;
  const words=tokens(query);
  if(!words.size)return null;
  const ranked=[];
  for(const row of (Array.isArray(sources)?sources:[]).slice(0,1000)){
    if(row?.approved===false||!isUuid(row?.id)||!row?.answer||!row?.title)continue;
    const keywords=Array.isArray(row.keywords)?row.keywords.join(' '):'';
    const title=fold(row.title),text=fold(row.title+' '+keywords);
    const matched=[...words].filter(w=>tokens(text).has(w)).length;
    const exact=title===fold(query);
    if(!exact&&matched<2)continue;
    ranked.push({id:row.id,title:clean(row.title,120),
      snippet:clean(row.answer,1500),score:matched+(exact?100:0)});
  }
  ranked.sort((a,b)=>b.score-a.score);
  const best=ranked[0];
  if(!best)return null;
  return {
    sourceId:best.id,sourceTitle:best.title,
    suggestedText:best.snippet,
    languageRequested:['fi','sv','en'].includes(language)?language:'fi',
    // Multilingual answer cannot be assumed from another-language source.
    requiresLanguageAndFactReview:true,
    approvedForSend:false
  };
}
export async function ensureNativeInboxSchema(db){
  const sql=[
    `CREATE TABLE IF NOT EXISTS public.respondo_native_inbox_drafts(
      tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
      thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
      text TEXT NOT NULL,updated_by TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY(tenant_id,thread_id))`,
    `CREATE TABLE IF NOT EXISTS public.respondo_native_inbox_notes(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
      thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
      note TEXT NOT NULL,created_by TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS public.respondo_native_inbox_deliveries(
      tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
      thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
      delivery_id UUID NOT NULL,
      message_id UUID NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY(tenant_id,delivery_id))`
  ];
  for(const q of sql)await db.query(q);
  await db.query('CREATE INDEX IF NOT EXISTS idx_native_inbox_notes_thread ON public.respondo_native_inbox_notes(tenant_id,thread_id,created_at DESC)');
  for(const table of ['respondo_native_inbox_drafts','respondo_native_inbox_notes','respondo_native_inbox_deliveries']){
    await db.query('ALTER TABLE public.'+table+' ENABLE ROW LEVEL SECURITY');
    await db.query('REVOKE ALL PRIVILEGES ON TABLE public.'+table+' FROM PUBLIC');
  }
  const r=await db.query("SELECT rolname FROM pg_roles WHERE rolname=ANY($1::text[])",[['anon','authenticated','service_role']]);
  for(const item of r.rows||[]){
    if(!['anon','authenticated','service_role'].includes(item.rolname))continue;
    for(const table of ['respondo_native_inbox_drafts','respondo_native_inbox_notes','respondo_native_inbox_deliveries'])
      await db.query('REVOKE ALL PRIVILEGES ON TABLE public.'+table+' FROM '+item.rolname);
  }
}
export async function nativeInboxOverview(db,tenantId){
  const r=await db.query(`SELECT ct.id,ct.source_channel,ct.mode,ct.status,ct.language,
    ct.assigned_agent_id,ct.last_activity_at,
    left(last_message.message,180) AS preview,last_message.role AS last_role,
    d.updated_at AS draft_updated_at
    FROM chat_threads ct
    LEFT JOIN LATERAL(
      SELECT cm.message,cm.role FROM chat_messages cm
      WHERE cm.thread_id=ct.id AND cm.tenant_id=ct.tenant_id
      ORDER BY cm.created_at DESC LIMIT 1
    ) last_message ON TRUE
    LEFT JOIN respondo_native_inbox_drafts d ON d.tenant_id=ct.tenant_id AND d.thread_id=ct.id
    WHERE ct.tenant_id=$1
    ORDER BY ct.last_activity_at DESC LIMIT 80`,[tenantId]);
  return {threads:(r.rows||[]).map(x=>({
    ...x,canDeliverWithinRespondo:x.source_channel==='website',
    externalDeliveryConnected:false
  }))};
}
export async function nativeInboxThread(db,tenantId,threadId){
  ensureThreadId(threadId);
  const r=await db.query(`SELECT id,source_channel,external_contact_id,mode,status,language,
    last_activity_at FROM chat_threads WHERE tenant_id=$1 AND id=$2`,[tenantId,threadId]);
  if(!r.rows[0])return null;
  const [messages,notes,draft]=await Promise.all([
    db.query(`SELECT id,role,message,created_at FROM(
      SELECT id,role,message,created_at FROM chat_messages
      WHERE tenant_id=$1 AND thread_id=$2 ORDER BY created_at DESC LIMIT 100
    ) recent ORDER BY created_at ASC`,[tenantId,threadId]),
    db.query(`SELECT id,note,created_at FROM respondo_native_inbox_notes
      WHERE tenant_id=$1 AND thread_id=$2 ORDER BY created_at DESC LIMIT 50`,[tenantId,threadId]),
    db.query(`SELECT text,updated_at FROM respondo_native_inbox_drafts
      WHERE tenant_id=$1 AND thread_id=$2`,[tenantId,threadId])
  ]);
  return {thread:{...r.rows[0],canDeliverWithinRespondo:r.rows[0].source_channel==='website'},
    messages:messages.rows,notes:notes.rows,draft:draft.rows[0]||null};
}
export async function saveNativeInboxDraft(db,tenantId,threadId,userId,payload={}){
  ensureThreadId(threadId);
  const value=clean(payload.text,4000);
  if(!value||String(payload.text||'').trim().length>4000)throw new TypeError('Draft must contain 1–4000 characters');
  const r=await db.query(`INSERT INTO respondo_native_inbox_drafts(
    tenant_id,thread_id,text,updated_by)
    SELECT $1,id,$3,$4 FROM chat_threads WHERE id=$2 AND tenant_id=$1
    ON CONFLICT(tenant_id,thread_id)
    DO UPDATE SET text=EXCLUDED.text,updated_by=EXCLUDED.updated_by,updated_at=NOW()
    RETURNING text,updated_at`,
    [tenantId,threadId,value,clean(userId,120)]);
  return r.rows[0]||null;
}
export async function addNativeInboxNote(db,tenantId,threadId,userId,payload={}){
  ensureThreadId(threadId);
  const note=clean(payload.note,1200);
  if(note.length<3||String(payload.note||'').trim().length>1200)
    throw new TypeError('Note must contain 3–1200 characters');
  const r=await db.query(`INSERT INTO respondo_native_inbox_notes(tenant_id,thread_id,note,created_by)
    SELECT $1,id,$3,$4 FROM chat_threads WHERE id=$2 AND tenant_id=$1
    RETURNING id,note,created_at`,[tenantId,threadId,note,clean(userId,120)]);
  return r.rows[0]||null;
}
export async function closeNativeInboxThread(db,tenantId,threadId,status){
  ensureThreadId(threadId);
  if(!['open','closed'].includes(status))throw new TypeError('Invalid thread status');
  const r=await db.query(`UPDATE chat_threads SET status=$3,updated_at=NOW()
    WHERE tenant_id=$1 AND id=$2 RETURNING id,status`,[tenantId,threadId,status]);
  return r.rows[0]||null;
}
export async function nativeInboxDraftFromSources(db,tenantId,threadId){
  const thread=await db.query(`SELECT language,source_channel FROM chat_threads WHERE tenant_id=$1 AND id=$2`,
    [tenantId,ensureThreadId(threadId)]);
  if(!thread.rows[0])return null;
  const [messages,sources]=await Promise.all([
    db.query(`SELECT message FROM chat_messages
      WHERE tenant_id=$1 AND thread_id=$2 AND role='user'
      ORDER BY created_at DESC LIMIT 1`,[tenantId,threadId]),
    db.query(`SELECT id,title,answer,keywords,approved FROM knowledge
      WHERE tenant_id=$1 AND approved=TRUE ORDER BY updated_at DESC LIMIT 1000`,[tenantId])
  ]);
  const question=messages.rows[0]?.message;
  if(!question)return {suggestion:null,reason:'no_customer_question'};
  const sourceSuggestion=nativeInboxDraftSuggestion(question,sources.rows,thread.rows[0].language);
  // Email is always a human-approved draft. Booking and pricing messages must
  // not inherit a generic answer that could promise a slot or an unverified price.
  if(thread.rows[0].source_channel==='email'){
    const triage=triageNativeMail(question,thread.rows[0].language);
    const requiresConservativeReply=triage.intent==='booking'||triage.intent==='pricing';
    return {suggestion:requiresConservativeReply||!sourceSuggestion
      ?(triage.suggestion?{suggestedText:triage.suggestion,languageRequested:triage.language,
          sourceId:null,sourceTitle:null,requiresLanguageAndFactReview:true,
          approvedForSend:false}:null)
      :sourceSuggestion,
      intent:triage.intent,reviewRequired:true,externalDeliveryConnected:false,
      confirmedBooking:false,verifiedPrice:false};
  }
  return {suggestion:sourceSuggestion};
}

export async function sendNativeWebsiteReply(db,tenantId,threadId,userId,payload={}){
  ensureThreadId(threadId);
  if(!isUuid(payload.deliveryId))throw new TypeError('Unique delivery ID required');
  const message=clean(payload.text,4000);
  if(!message||String(payload.text||'').trim().length>4000)
    throw new TypeError('Reply must contain 1–4000 characters');
  const client=await db.connect();
  try{
    await client.query('BEGIN');
    const t=await client.query(
      `SELECT source_channel,external_contact_id,visitor_ref,status FROM chat_threads
        WHERE tenant_id=$1 AND id=$2 FOR UPDATE`,[tenantId,threadId]);
    if(!t.rows[0]){
      await client.query('ROLLBACK');return null;
    }
    if(t.rows[0].source_channel!=='website')
      throw new TypeError('External channels cannot be delivered by the native inbox');
    if(t.rows[0].status==='closed')
      throw new TypeError('Reopen this conversation before sending');
    const id=randomUUID();
    const delivered=await client.query(
      `INSERT INTO respondo_native_inbox_deliveries(tenant_id,thread_id,delivery_id,message_id)
        VALUES($1,$2,$3,$4) ON CONFLICT(tenant_id,delivery_id) DO NOTHING
        RETURNING delivery_id`,[tenantId,threadId,payload.deliveryId,id]);
    if(!delivered.rowCount){
      const existing=await client.query(
        `SELECT thread_id,message_id FROM respondo_native_inbox_deliveries
        WHERE tenant_id=$1 AND delivery_id=$2`,[tenantId,payload.deliveryId]);
      if(existing.rows[0]&&String(existing.rows[0].thread_id)!==threadId)
        throw new TypeError('Delivery ID was used for a different conversation');
      await client.query('COMMIT');
      return {sent:true,duplicate:true,channel:'website',messageId:existing.rows[0]?.message_id};
    }
    const row=await client.query(
      `INSERT INTO chat_messages(id,tenant_id,thread_id,source_channel,external_contact_id,
        visitor_ref,role,message,metadata)
      VALUES($1,$2,$3,'website',$4,$5,'human',$6,$7::jsonb)
      RETURNING id,role,message,created_at`,
      [id,tenantId,threadId,t.rows[0].external_contact_id,
        t.rows[0].visitor_ref,message,
        JSON.stringify({origin:'respondo_native_inbox',ownerId:clean(userId,120)})]);
    await client.query(
      `UPDATE chat_threads SET mode='human',status='open',last_activity_at=NOW(),
        updated_at=NOW() WHERE tenant_id=$1 AND id=$2`,[tenantId,threadId]);
    await client.query(
      `DELETE FROM respondo_native_inbox_drafts
        WHERE tenant_id=$1 AND thread_id=$2`,[tenantId,threadId]);
    await client.query('COMMIT');
    return {sent:true,duplicate:false,channel:'website',message:row.rows[0]};
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{});
    throw error;
  }finally{client.release();}
}
