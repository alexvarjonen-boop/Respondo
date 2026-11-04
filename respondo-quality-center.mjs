// Tenant-scoped answer-quality review and operational reporting.
// An automated reply never proves factual accuracy or customer resolution.
const reasons=new Set(['incorrect_fact','outdated_fact','wrong_language','misunderstood_question','unnecessary_handoff','other']);
const statuses=new Set(['open','resolved','dismissed']);
const uuid=x=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(x||''));
const short=(x,n)=>String(x??'').trim().slice(0,n);
const count=x=>Math.max(0,Number(x)||0);
export const qualityDays=value=>[7,30,90].includes(Number(value))?Number(value):30;
export function redactQualityQuestion(value){
  return short(value,500).replace(/\b[^\s@]+@[^\s@]+\.[A-Za-z]{2,}\b/g,'[email]')
    .replace(/(?:\+?\d[\d().\s-]{7,}\d)/g,'[phone]').slice(0,180);
}
export function qualitySummary({channels=[],leads=0,actions=0,tickets=0,reviews=[]}={}){
  let total=0,automated=0,handoffs=0,evidenced=0,lowConfidence=0;
  const byChannel=[];
  for(const row of channels){
    const item={channel:short(row.channel||'website',40),total:count(row.total),
      automated:count(row.automated),handoffs:count(row.handoffs),
      evidenced:count(row.evidenced),lowConfidence:count(row.low_confidence)};
    total+=item.total;automated+=item.automated;handoffs+=item.handoffs;
    evidenced+=item.evidenced;lowConfidence+=item.lowConfidence;
    byChannel.push(item);
  }
  return {total,automated,handoffs,evidenced,lowConfidence,
    leads:count(leads),actions:count(actions),tickets:count(tickets),
    openReviews:reviews.filter(r=>r.status==='open').length,
    automationRate:total?Math.round(100*automated/total):null,
    evidenceRate:automated?Math.round(100*evidenced/automated):null,
    byChannel,customerResolutionVerified:false,accuracyVerified:false,revenueAttributed:false};
}
export async function ensureQualityCenterSchema(db){
  await db.query(`CREATE TABLE IF NOT EXISTS public.respondo_quality_reviews(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    reason TEXT NOT NULL CHECK(reason IN ('incorrect_fact','outdated_fact','wrong_language','misunderstood_question','unnecessary_handoff','other')),
    note TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved','dismissed')),
    resolution_note TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id,conversation_id)
  )`);
  await db.query('CREATE INDEX IF NOT EXISTS idx_quality_reviews_tenant_status ON public.respondo_quality_reviews(tenant_id,status,created_at DESC)');
  await db.query('ALTER TABLE public.respondo_quality_reviews ENABLE ROW LEVEL SECURITY');
  await db.query('REVOKE ALL PRIVILEGES ON TABLE public.respondo_quality_reviews FROM PUBLIC');
  const roles=await db.query("SELECT rolname FROM pg_roles WHERE rolname=ANY($1::text[])",[['anon','authenticated','service_role']]);
  for(const row of roles.rows||[]){
    if(['anon','authenticated','service_role'].includes(row.rolname))
      await db.query('REVOKE ALL PRIVILEGES ON TABLE public.respondo_quality_reviews FROM '+row.rolname);
  }
}
export async function createQualityReview(db,tenantId,payload={}){
  if(!uuid(payload.conversationId)||!reasons.has(payload.reason))
    throw new TypeError('Select a conversation and a valid review reason');
  const note=short(payload.note,1200);
  if(payload.reason==='other'&&!note)throw new TypeError('Provide an explanation for other');
  const result=await db.query(
    `INSERT INTO respondo_quality_reviews(tenant_id,conversation_id,reason,note,status)
     SELECT $1,c.id,$3,$4,'open' FROM conversations c WHERE c.id=$2 AND c.tenant_id=$1
     ON CONFLICT(tenant_id,conversation_id)
     DO UPDATE SET reason=EXCLUDED.reason,note=EXCLUDED.note,status='open',resolution_note='',updated_at=NOW()
     RETURNING id,conversation_id,reason,note,status`,
    [tenantId,payload.conversationId,payload.reason,note]);
  return result.rows[0]||null;
}
export async function updateQualityReview(db,tenantId,id,payload={}){
  if(!uuid(id)||!statuses.has(payload.status))throw new TypeError('Invalid review status');
  const resolutionNote=short(payload.resolutionNote,1200);
  if(payload.status==='resolved'&&resolutionNote.length<8)
    throw new TypeError('Document the verified fix before resolving');
  const r=await db.query(
    `UPDATE respondo_quality_reviews SET status=$3,resolution_note=$4,updated_at=NOW()
     WHERE tenant_id=$1 AND id=$2 RETURNING id,status,resolution_note`,
    [tenantId,id,payload.status,resolutionNote]);
  return r.rows[0]||null;
}
export async function qualityCenterOverview(db,tenantId,requestedDays=30){
  const days=qualityDays(requestedDays), params=[tenantId,days];
  const [
    channels,daily,unanswered,reviews,leads,actions,tickets,actionStatuses,knowledge
  ]=await Promise.all([
    db.query(`SELECT COALESCE(NULLIF(source_channel,''),'website') AS channel,
      COUNT(*)::int AS total,
      COUNT(*) FILTER(WHERE handoff=FALSE)::int AS automated,
      COUNT(*) FILTER(WHERE handoff=TRUE)::int AS handoffs,
      COUNT(*) FILTER(WHERE handoff=FALSE AND cardinality(source_ids)>0)::int AS evidenced,
      COUNT(*) FILTER(WHERE confidence<0.45)::int AS low_confidence
      FROM conversations WHERE tenant_id=$1 AND created_at >= NOW()-($2::int * INTERVAL '1 day')
      GROUP BY 1 ORDER BY total DESC LIMIT 20`,params),
    db.query(`SELECT created_at::date AS day, COUNT(*)::int AS total,
      COUNT(*) FILTER(WHERE handoff=TRUE)::int AS handoffs
      FROM conversations WHERE tenant_id=$1 AND created_at >= NOW()-($2::int * INTERVAL '1 day')
      GROUP BY 1 ORDER BY 1`,params),
    db.query(`SELECT id,question,intent,source_channel,created_at
      FROM conversations WHERE tenant_id=$1 AND handoff=TRUE
      AND created_at >= NOW()-($2::int * INTERVAL '1 day')
      ORDER BY created_at DESC LIMIT 30`,params),
    db.query(`SELECT r.id,r.conversation_id,r.reason,r.note,r.status,r.resolution_note,r.created_at,
      c.question,c.source_channel
      FROM respondo_quality_reviews r
      JOIN conversations c ON c.id=r.conversation_id AND c.tenant_id=r.tenant_id
      WHERE r.tenant_id=$1 ORDER BY (r.status='open') DESC,r.created_at DESC LIMIT 60`,[tenantId]),
    db.query(`SELECT COUNT(*)::int AS total FROM leads
      WHERE tenant_id=$1 AND created_at >= NOW()-($2::int * INTERVAL '1 day')`,params),
    db.query(`SELECT COUNT(*)::int AS total FROM action_requests
      WHERE tenant_id=$1 AND created_at >= NOW()-($2::int * INTERVAL '1 day')`,params),
    db.query(`SELECT COUNT(*)::int AS total FROM respondo_native_tickets
      WHERE tenant_id=$1 AND created_at >= NOW()-($2::int * INTERVAL '1 day')`,params),
    db.query(`SELECT COALESCE(status,'new') AS status,COUNT(*)::int AS total
      FROM action_requests WHERE tenant_id=$1 AND created_at >= NOW()-($2::int * INTERVAL '1 day')
      GROUP BY 1`,params),
    db.query(`SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER(WHERE approved=TRUE)::int AS approved,
      COUNT(*) FILTER(WHERE approved=TRUE AND verified_at >= NOW()-INTERVAL '90 days')::int AS recent
      FROM knowledge WHERE tenant_id=$1`,[tenantId])
  ]);
  const rawReviews=reviews.rows||[];
  return {
    days,
    summary:qualitySummary({channels:channels.rows,leads:leads.rows[0]?.total,
      actions:actions.rows[0]?.total,tickets:tickets.rows[0]?.total,reviews:rawReviews}),
    daily:(daily.rows||[]).map(r=>({day:r.day,total:count(r.total),handoffs:count(r.handoffs)})),
    gaps:(unanswered.rows||[]).map(r=>({conversationId:r.id,
      question:redactQualityQuestion(r.question),intent:short(r.intent,100),
      channel:short(r.source_channel||'website',40),createdAt:r.created_at})),
    reviews:rawReviews.map(r=>({id:r.id,conversationId:r.conversation_id,reason:r.reason,
      note:short(r.note,1200),status:r.status,resolutionNote:short(r.resolution_note,1200),
      question:redactQualityQuestion(r.question),channel:r.source_channel||'website',
      createdAt:r.created_at})),
    actionsByStatus:(actionStatuses.rows||[]).map(r=>({status:short(r.status,40),total:count(r.total)})),
    knowledge:{total:count(knowledge.rows[0]?.total),
      approved:count(knowledge.rows[0]?.approved),
      verifiedLast90Days:count(knowledge.rows[0]?.recent)}
  };
}
