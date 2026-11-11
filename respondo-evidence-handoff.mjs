// Authenticated, tenant-scoped evidence inspector and human handoff briefing.
// Recorded source IDs are verified against the *current approved* company knowledge.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const valid=id=>UUID.test(String(id||''));
const bounded=(v,n)=>String(v??'').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,' ').trim().slice(0,n);
const roles=new Set(['user','assistant','bot','agent','human','employee','staff']);
export function summarizeHandoff(messages=[],language='en'){
  const items=(Array.isArray(messages)?messages:[]).slice(-100)
    .filter(m=>roles.has(String(m?.role||'').toLowerCase())&&m?.message)
    .map(m=>({role:String(m.role).toLowerCase(),text:bounded(m.message,550)}));
  const customer=items.filter(m=>m.role==='user');
  const staff=items.filter(m=>m.role!=='user');
  return {
    language:['fi','sv','en'].includes(language)?language:'en',
    lastCustomerMessage:customer.at(-1)?.text||null,
    previousCustomerMessages:customer.slice(-4,-1).map(x=>x.text),
    lastRecordedReply:staff.at(-1)?.text||null,
    messagesRead:items.length,missingDetailsMustBeVerified:true,
    confirmedPrice:false,confirmedBooking:false,
    generatedBy:'deterministic_transcript_extract',autoSent:false
  };
}
export function explainRecordedSources(conversation,sources=[]){
  if(!conversation)return null;
  const sourceIds=Array.isArray(conversation.source_ids)?
    [...new Set(conversation.source_ids.map(String).filter(valid))].slice(0,15):[];
  const matches=(Array.isArray(sources)?sources:[])
    .filter(x=>x&&x.approved===true&&sourceIds.includes(String(x.id)))
    .map(x=>({
      id:String(x.id),title:bounded(x.title,160),
      sourceType:bounded(x.source_type,40),
      sourceUrl:typeof x.source_url==='string'&&/^https?:\/\//i.test(x.source_url)?
        bounded(x.source_url,1000):null,
      lastVerifiedAt:x.verified_at||null,
      updatedAt:x.updated_at||null,
      excerpt:bounded(x.answer,360)
    }));
  return {
    conversationId:conversation.id,
    question:bounded(conversation.question,350),
    recordedAnswer:bounded(conversation.answer,700),
    recordedConfidence:Number.isFinite(Number(conversation.confidence))?Number(conversation.confidence):null,
    sourceIdsRecorded:sourceIds.length,
    currentlyApprovedSources:matches,
    sourcesUnavailable:sourceIds.length-matches.length,
    historicalSourceSnapshotAvailable:false,
    provenance:'recorded_ids_matched_to_current_approved_knowledge',
    answerCorrectnessVerified:false,
    ownerReviewRequired:true
  };
}
export async function conversationEvidence(db,tenantId,conversationId){
  if(!valid(tenantId)||!valid(conversationId))throw new TypeError('Invalid workspace or conversation');
  const c=await db.query(
    'SELECT id,question,answer,source_ids,confidence,created_at FROM conversations '+
    'WHERE tenant_id=$1 AND id=$2',
    [tenantId,conversationId]);
  const row=c.rows?.[0];
  if(!row)return null;
  const ids=Array.isArray(row.source_ids)?
    [...new Set(row.source_ids.map(String).filter(valid))].slice(0,15):[];
  if(!ids.length)return explainRecordedSources(row,[]);
  const k=await db.query(
    'SELECT id,title,answer,source_url,source_type,verified_at,updated_at,approved '+
    'FROM knowledge WHERE tenant_id=$1 AND id=ANY($2::uuid[]) AND approved=TRUE',
    [tenantId,ids]);
  return explainRecordedSources(row,k.rows||[]);
}
