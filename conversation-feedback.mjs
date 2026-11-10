// Explicit customer feedback only, stored in this tenant's first-party DB.
// A widget token + matching conversation visitor ref are required by the route.
const reasons=new Set(['not_helpful','incorrect','unclear','other']);
const uuid=v=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(String(v||''));
export function validateConversationFeedback(payload={}){
  if(!uuid(payload.conversationId))throw TypeError('Valid conversation required');
  if(typeof payload.helpful!=='boolean')throw TypeError('Select whether the answer was helpful');
  const reason=payload.helpful ? null : String(payload.reason||'not_helpful');
  if(reason!==null && !reasons.has(reason))throw TypeError('Unsupported feedback reason');
  return {conversationId:payload.conversationId,helpful:payload.helpful,reason};
}
export async function ensureConversationFeedbackSchema(db){
  await db.query(`CREATE TABLE IF NOT EXISTS public.respondo_conversation_feedback(
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    helpful BOOLEAN NOT NULL,
    reason TEXT CHECK(reason IS NULL OR reason IN ('not_helpful','incorrect','unclear','other')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(tenant_id,conversation_id)
  )`);
  await db.query('CREATE INDEX IF NOT EXISTS idx_feedback_tenant_time ON public.respondo_conversation_feedback(tenant_id,created_at DESC)');
  await db.query('ALTER TABLE public.respondo_conversation_feedback ENABLE ROW LEVEL SECURITY');
  await db.query('REVOKE ALL PRIVILEGES ON TABLE public.respondo_conversation_feedback FROM PUBLIC');
  const roles=await db.query("SELECT rolname FROM pg_roles WHERE rolname=ANY($1::text[])",[['anon','authenticated','service_role']]);
  for(const row of roles.rows||[])if(['anon','authenticated','service_role'].includes(row.rolname))
    await db.query('REVOKE ALL PRIVILEGES ON TABLE public.respondo_conversation_feedback FROM '+row.rolname);
}
export async function saveConversationFeedback(db,tenantId,visitorRef,payload){
  const f=validateConversationFeedback(payload);
  if(!uuid(tenantId)||typeof visitorRef!=='string'||visitorRef.length<8||visitorRef.length>160)
    throw TypeError('Tenant and conversation reference required');
  const result=await db.query(`INSERT INTO respondo_conversation_feedback(tenant_id,conversation_id,helpful,reason)
    SELECT $1,c.id,$4,$5 FROM conversations c
    WHERE c.tenant_id=$1 AND c.id=$2 AND c.visitor_ref=$3 AND c.created_at>NOW()-INTERVAL '7 days'
    ON CONFLICT (tenant_id,conversation_id) DO NOTHING
    RETURNING conversation_id`,[tenantId,f.conversationId,visitorRef,f.helpful,f.reason]);
  return {recorded:result.rowCount===1};
}
export async function feedbackOverview(db,tenantId,days=30){
  const period=[7,30,90].includes(Number(days))?Number(days):30;
  const r=await db.query(`SELECT COUNT(*)::int AS total,
    COUNT(*) FILTER(WHERE helpful=TRUE)::int AS helpful,
    COUNT(*) FILTER(WHERE helpful=FALSE)::int AS unhelpful
    FROM respondo_conversation_feedback WHERE tenant_id=$1
      AND created_at>=NOW()-($2::int*INTERVAL '1 day')`,[tenantId,period]);
  const a=r.rows?.[0]||{};
  const total=Number(a.total)||0, helpful=Number(a.helpful)||0;
  return {total,helpful,unhelpful:Number(a.unhelpful)||0,positivePercent:total?Math.round(100*helpful/total):null,
    isSelfReported:true,resolutionVerified:false};
}
