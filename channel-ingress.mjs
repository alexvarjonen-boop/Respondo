// First-party channel API reliability. No paid external messaging provider.
// An event ID is supplied by the authenticated upstream bridge, not the end user.
export const CHANNELS=Object.freeze(['api','email']);
export function validInboundEventId(v){
  return typeof v==='string'&&v.length>=8&&v.length<=160&&/^[a-zA-Z0-9_.:-]+$/.test(v);
}
export function reconstructedConversationHistory(rows=[],limit=6){
  const ordered=Array.isArray(rows)?rows:[];
  const history=[];
  let pending=null;
  for(const item of ordered){
    const role=String(item?.role||'').toLowerCase();
    const message=String(item?.message||'').trim();
    if(!message)continue;
    if(role==='user'){
      // Another user message without an answer terminates the earlier
      // uncompleted turn. Do not invent assistant text or copy it forward.
      pending=message;
      continue;
    }
    if((role==='assistant'||role==='human')&&pending){
      history.push({question:pending,answer:message,handoff:role==='human'});
      pending=null;
    }
  }
  return history.slice(-Math.max(0,Math.min(12,Number(limit)||6)));
}
export async function ensureChannelIngressSchema(db){
  await db.query(`CREATE TABLE IF NOT EXISTS public.respondo_channel_ingest(
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    channel TEXT NOT NULL CHECK(channel IN ('api','email')),
    event_id TEXT NOT NULL CHECK(length(event_id) BETWEEN 8 AND 160),
    status TEXT NOT NULL DEFAULT 'processing'
      CHECK(status IN ('processing','completed','failed')),
    response JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(tenant_id,channel,event_id)
  )`);
  await db.query('CREATE INDEX IF NOT EXISTS idx_channel_ingest_recent ON public.respondo_channel_ingest(tenant_id,created_at DESC)');
  await db.query('ALTER TABLE public.respondo_channel_ingest ENABLE ROW LEVEL SECURITY');
  await db.query('REVOKE ALL PRIVILEGES ON TABLE public.respondo_channel_ingest FROM PUBLIC');
  const r=await db.query("SELECT rolname FROM pg_roles WHERE rolname=ANY($1::text[])",[['anon','authenticated','service_role']]);
  for(const row of r.rows||[]){
    if(['anon','authenticated','service_role'].includes(row.rolname))
      await db.query('REVOKE ALL PRIVILEGES ON TABLE public.respondo_channel_ingest FROM '+row.rolname);
  }
}
// Only claim after bearer authentication and explicit active tenant validation.
export async function claimInboundEvent(db,tenantId,channel,eventId){
  if(!validInboundEventId(eventId)||!CHANNELS.includes(channel))
    throw new TypeError('Invalid event identifier or channel');
  const values=[tenantId,channel,eventId];
  const created=await db.query(
    `INSERT INTO respondo_channel_ingest(tenant_id,channel,event_id)
      VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING status`,values);
  if(created.rowCount)return {status:'new'};
  const existing=await db.query(
    `SELECT status,response FROM respondo_channel_ingest
      WHERE tenant_id=$1 AND channel=$2 AND event_id=$3`,values);
  if(!existing.rows[0])return {status:'processing'};
  const {status,response}=existing.rows[0];
  if(status==='completed')return {status:'completed',response};
  return {status:status==='failed'?'failed':'processing'};
}
export async function completeInboundEvent(db,tenantId,channel,eventId,response){
  if(!validInboundEventId(eventId)||!CHANNELS.includes(channel))
    throw new TypeError('Invalid event identifier or channel');
  // Preserve a single immutable completed result for all upstream retries.
  const result=await db.query(
    `UPDATE respondo_channel_ingest SET status='completed',response=$4::jsonb,updated_at=NOW()
      WHERE tenant_id=$1 AND channel=$2 AND event_id=$3 AND status='processing'
      RETURNING event_id`,
    [tenantId,channel,eventId,JSON.stringify(response)]);
  if(!result.rowCount)throw new Error('Channel event not claimable');
  return true;
}
export async function failInboundEvent(db,tenantId,channel,eventId){
  if(!validInboundEventId(eventId)||!CHANNELS.includes(channel))
    throw new TypeError('Invalid event identifier or channel');
  await db.query(
    `UPDATE respondo_channel_ingest SET status='failed',updated_at=NOW()
      WHERE tenant_id=$1 AND channel=$2 AND event_id=$3 AND status='processing'`,
    [tenantId,channel,eventId]);
  // Never automatically replay uncertain side effects: the API caller can
  // reconcile this event manually and use a fresh ID if it was not processed.
}
