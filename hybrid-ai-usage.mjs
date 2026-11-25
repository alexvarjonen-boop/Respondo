import {createHash} from 'node:crypto';

const MAX_GLOBAL_CALLS=100;
const MAX_TENANT_CALLS=10;
const TTL_MS=10*60_000;
const MAX_CACHE=400;
const cache=new Map();
const safeScope=id=>typeof id==='string' && /^[a-zA-Z0-9_-]{1,128}$/.test(id);

// Only authenticated, server-resolved tenant IDs may be passed by callers.
// One SQL row per UTC day serializes reservations across workers and restarts.
// Reserve two calls conservatively, even if only the planning call is needed.
let initialized=new WeakMap();
export async function reserveHybridCalls(pool,tenantId){
  if(!pool || !safeScope(tenantId))return false;
  try{
    let init=initialized.get(pool);
    if(!init){
      init=pool.query("CREATE TABLE IF NOT EXISTS respondo_hybrid_daily_quota (day date PRIMARY KEY, used integer NOT NULL CHECK (used >= 0), tenants jsonb NOT NULL DEFAULT '{}'::jsonb); ALTER TABLE respondo_hybrid_daily_quota ENABLE ROW LEVEL SECURITY; REVOKE ALL ON respondo_hybrid_daily_quota FROM PUBLIC; DO $ DECLARE r text; BEGIN FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=r) THEN EXECUTE format('REVOKE ALL ON respondo_hybrid_daily_quota FROM %I',r); END IF; END LOOP; END $;").then(()=>true);
      initialized.set(pool,init);
      init.catch(()=>initialized.delete(pool));
    }
    await init;
    const result=await pool.query(
      "INSERT INTO respondo_hybrid_daily_quota AS quota(day,used,tenants) VALUES ((now() AT TIME ZONE 'UTC')::date,2,jsonb_build_object($1::text,2)) ON CONFLICT(day) DO UPDATE SET used=quota.used+2, tenants=jsonb_set(quota.tenants,ARRAY[$1::text],to_jsonb(COALESCE((quota.tenants->>$1::text)::integer,0)+2),true) WHERE quota.used+2 <= $2 AND COALESCE((quota.tenants->>$1::text)::integer,0)+2 <= $3 RETURNING used",
      [tenantId,MAX_GLOBAL_CALLS,MAX_TENANT_CALLS]);
    return result.rowCount===1;
  }catch{return false;}
}

export function needsHybridReasoning(result){
  if(!result || result.qualityFlag)return false;
  // Clear small talk and audited, verified facts cost no external calls.
  if(!result.handoff && String(result.answer||'').trim() &&
     (Number(result.confidence)>=0.85 && (result.sourceIds||[]).length>0 || Number(result.confidence)>=0.95))return false;
  return !!result.handoff || !String(result.answer||'').trim() ||
    Number(result.confidence||0)<0.85;
}

function publicRow(row){
  return row?.approved===true && (row.source_type||row.sourceType)==='website' &&
    /^https:\/\//i.test(String(row.source_url||row.sourceUrl||'')) && row.id!=null;
}
// Exact questions only: no cross-tenant, cross-language, or fuzzy answer reuse.
// No history or page-dependent replies. Fingerprint public source revisions.
export function hybridCacheKey({tenantId,message,lang,history,pageContext,rows}={}){
  if(!safeScope(tenantId) || typeof message!=='string' || !message.trim() || message.length>300 ||
     !Array.isArray(rows) || !rows.length || rows.length>5000 ||
     (Array.isArray(history)&&history.length) || (pageContext&&Object.keys(pageContext).length))return '';
  if(/@|https?:|\d|password|salasana|lösenord|tilaus|varaus|order|book|reserv|cancel|refund|payment|hinta|maks|price|cost|pris/i.test(message))return '';
  const publicRows=rows.filter(publicRow);
  if(!publicRows.length)return '';
  const hash=createHash('sha256');
  hash.update(JSON.stringify([tenantId,lang,message.trim()]));
  // Include the complete public corpus and its ordering; never include private
  // knowledge text or customer history. Exact content changes invalidate reuse.
  for(const r of publicRows)hash.update(JSON.stringify([String(r.id),r.title,r.answer,r.source_url||r.sourceUrl,r.updated_at]));
  for(const r of rows.filter(r=>!publicRow(r)))hash.update(JSON.stringify([String(r?.id),r?.approved,r?.updated_at]));
  return hash.digest('hex');
}
export function readHybridCache(key,rows,now=Date.now()){
  if(!key)return null;
  const hit=cache.get(key);
  if(!hit)return null;
  if(hit.expires<=now){cache.delete(key);return null;}
  const selected=hit.sourceIds.map(id=>rows.find(r=>publicRow(r)&&String(r.id)===id));
  if(selected.some(r=>!r)){cache.delete(key);return null;}
  return {answer:hit.answer,handoff:false,confidence:0.72,intent:'Keskusteleva AI',
    sourceIds:selected.map(r=>r.id),selected};
}
export function writeHybridCache(key,result,rows,now=Date.now()){
  if(!key || result?.handoff || result?.qualityFlag || result?.intent!=='Keskusteleva AI' ||
     !Array.isArray(result.sourceIds) || !result.sourceIds.length || result.sourceIds.length>3)return false;
  const answer=String(result.answer||'').trim();
  if(!answer || answer.length>600 || /@|https?:|\d|password|salasana|lösenord|tilaus|varaus|order|book|reserv|cancel|refund|payment|hinta|maks|price|cost|pris/i.test(answer))return false;
  const sourceIds=result.sourceIds.map(String);
  if(!sourceIds.every(id=>rows.some(r=>publicRow(r)&&String(r.id)===id)))return false;
  while(cache.size>=MAX_CACHE)cache.delete(cache.keys().next().value);
  cache.set(key,{answer,sourceIds,expires:now+TTL_MS});
  return true;
}
