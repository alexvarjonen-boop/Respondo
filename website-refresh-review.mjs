// Scheduled website refresh never silently publishes changed or new facts.
import {createHash} from 'node:crypto';
const uuid=s=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(s||''));
const trim=(s,n)=>String(s||'').trim().slice(0,n);
export function websiteCandidateFingerprint(candidate){
  return createHash('sha256').update(trim(candidate.sourceUrl,2048)+'\n'+trim(candidate.title,250).toLowerCase()).digest('hex');
}
export async function ensureWebsiteRefreshReviewSchema(db){
  await db.query(`CREATE TABLE IF NOT EXISTS public.respondo_website_refresh_reviews(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    fingerprint TEXT NOT NULL,
    source_url TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    answer TEXT NOT NULL,
    keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','dismissed')),
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id,fingerprint)
  )`);
  await db.query('CREATE INDEX IF NOT EXISTS idx_refresh_reviews_tenant_status ON public.respondo_website_refresh_reviews(tenant_id,status,updated_at DESC)');
  await db.query('ALTER TABLE public.respondo_website_refresh_reviews ENABLE ROW LEVEL SECURITY');
  await db.query('REVOKE ALL PRIVILEGES ON TABLE public.respondo_website_refresh_reviews FROM PUBLIC');
  const roles=await db.query("SELECT rolname FROM pg_roles WHERE rolname=ANY($1::text[])",[['anon','authenticated','service_role']]);
  for(const row of roles.rows||[])if(['anon','authenticated','service_role'].includes(row.rolname))
    await db.query('REVOKE ALL PRIVILEGES ON TABLE public.respondo_website_refresh_reviews FROM '+row.rolname);
}
export async function stageWebsiteRefresh(db,tenantId,candidate){
  if(!uuid(tenantId))throw TypeError('Valid tenant required');
  let sourceUrl=trim(candidate?.sourceUrl,2048);
  const title=trim(candidate?.title,250);
  const category=trim(candidate?.category,100),answer=trim(candidate?.answer,8000),
    keywords=Array.isArray(candidate?.keywords)?candidate.keywords.map(x=>trim(x,65)).slice(0,18):[];
  let sourceValid=false;
  try{
    const url=new URL(sourceUrl);
    sourceValid=['http:','https:'].includes(url.protocol)&&!url.username&&!url.password&&
      Boolean(url.hostname);
    if(sourceValid){url.hash='';sourceUrl=url.toString();}
  }catch{}
  if(!sourceValid||title.length<2||answer.length<8)
    throw TypeError('Verified website candidate required');
  const fingerprint=websiteCandidateFingerprint({sourceUrl,title});
  const existing=await db.query(`SELECT id,answer,category,keywords FROM knowledge WHERE tenant_id=$1
    AND approved=TRUE AND source_type='website' AND source_url=$2 AND LOWER(title)=LOWER($3)
    ORDER BY verified_at DESC NULLS LAST,created_at DESC,id DESC LIMIT 1`,
    [tenantId,sourceUrl,title]);
  // Only an *approved*, fully unchanged fact can be reverified without review.
  // An unapproved record must never suppress the review queue.
  const old=existing.rows?.[0];
  if(old?.answer===answer && old.category===category &&
     JSON.stringify(old.keywords||[])===JSON.stringify(keywords)){
    // The website has returned to the published fact. Retire any pending
    // proposal without recording an owner decision.
    await db.query(`WITH verified AS (
      UPDATE knowledge SET verified_at=NOW()
      WHERE tenant_id=$1 AND id=$2 AND approved=TRUE AND source_type='website'
      RETURNING id
    )
    UPDATE respondo_website_refresh_reviews
      SET status='dismissed',reviewed_by=NULL,reviewed_at=NULL,updated_at=NOW()
      WHERE tenant_id=$1 AND fingerprint=$3 AND status='pending'
        AND EXISTS (SELECT 1 FROM verified)`,[tenantId,old.id,fingerprint]);
    return {status:'unchanged'};
  }
  // An ID identifies the displayed proposal. A dashboard that has loaded an
  // earlier proposal must not approve replacement content using the old ID.
  const result=await db.query(`INSERT INTO respondo_website_refresh_reviews
    (tenant_id,fingerprint,source_url,title,category,answer,keywords,status)
    VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,'pending')
    ON CONFLICT(tenant_id,fingerprint) DO UPDATE SET
      id=EXCLUDED.id,title=EXCLUDED.title,category=EXCLUDED.category,answer=EXCLUDED.answer,
      keywords=EXCLUDED.keywords,status='pending',reviewed_by=NULL,reviewed_at=NULL,updated_at=NOW()
    WHERE respondo_website_refresh_reviews.status='approved'
       OR (respondo_website_refresh_reviews.status='dismissed' AND respondo_website_refresh_reviews.reviewed_at IS NULL)
       OR (respondo_website_refresh_reviews.answer,respondo_website_refresh_reviews.category,respondo_website_refresh_reviews.keywords)
          IS DISTINCT FROM (EXCLUDED.answer,EXCLUDED.category,EXCLUDED.keywords)
    RETURNING status`,[tenantId,fingerprint,sourceUrl,title,category,answer,JSON.stringify(keywords)]);
  if(result.rows?.length)return {status:result.rows[0].status};
  const previous=await db.query(`SELECT status FROM respondo_website_refresh_reviews
    WHERE tenant_id=$1 AND fingerprint=$2`,[tenantId,fingerprint]);
  return {status:previous.rows?.[0]?.status||'pending'};
}
export async function websiteRefreshReviewOverview(db,tenantId){
  if(!uuid(tenantId))throw TypeError('Valid tenant required');
  const result=await db.query(`SELECT r.id,r.source_url,r.title,r.category,r.answer,r.status,r.updated_at,
    k.answer AS current_answer FROM respondo_website_refresh_reviews r
    LEFT JOIN LATERAL (
      SELECT answer FROM knowledge k WHERE k.tenant_id=r.tenant_id
        AND k.source_type='website' AND k.approved=TRUE
        AND k.source_url=r.source_url AND LOWER(k.title)=LOWER(r.title)
      ORDER BY k.verified_at DESC NULLS LAST,k.created_at DESC,k.id DESC LIMIT 1
    ) k ON TRUE
    WHERE r.tenant_id=$1 ORDER BY (r.status='pending') DESC,r.updated_at DESC LIMIT 80`,[tenantId]);
  return {reviews:result.rows||[],requiresOwnerApproval:true};
}
export async function decideWebsiteRefreshReview(db,tenantId,id,ownerId,decision){
  if(!uuid(tenantId)||!uuid(id)||!['approve','dismiss'].includes(decision))
    throw TypeError('Valid review decision required');
  const client=await db.connect();
  try{
    await client.query('BEGIN');
    await client.query('SELECT id FROM tenants WHERE id=$1 FOR UPDATE',[tenantId]);
    const r=await client.query(`SELECT * FROM respondo_website_refresh_reviews
      WHERE tenant_id=$1 AND id=$2 AND status='pending' FOR UPDATE`,[tenantId,id]);
    const item=r.rows?.[0];
    if(!item){await client.query('ROLLBACK');return null;}
    if(decision==='approve'){
      const old=await client.query(`SELECT id FROM knowledge WHERE tenant_id=$1
        AND source_type='website' AND source_url=$2 AND LOWER(title)=LOWER($3)
        ORDER BY approved DESC,verified_at DESC NULLS LAST,created_at DESC,id DESC LIMIT 1 FOR UPDATE`,
        [tenantId,item.source_url,item.title]);
      if(old.rows?.[0]?.id){
        await client.query(`UPDATE knowledge SET category=$1,answer=$2,keywords=$3,
          approved=TRUE,verified_at=NOW(),updated_at=NOW()
          WHERE tenant_id=$4 AND id=$5 AND source_type='website'`,
          [item.category,item.answer,item.keywords,tenantId,old.rows[0].id]);
      }else{
        await client.query(`INSERT INTO knowledge
          (id,tenant_id,category,title,answer,keywords,source_type,source_url,approved,verified_at)
          VALUES(gen_random_uuid(),$1,$2,$3,$4,$5,'website',$6,TRUE,NOW())`,
          [tenantId,item.category,item.title,item.answer,item.keywords,item.source_url]);
      }
    }
    await client.query(`UPDATE respondo_website_refresh_reviews
      SET status=$3,reviewed_by=$4,reviewed_at=NOW(),updated_at=NOW()
      WHERE tenant_id=$1 AND id=$2`,[tenantId,id,decision==='approve'?'approved':'dismissed',trim(ownerId,120)]);
    await client.query('COMMIT');
    return {decision,knowledgePublished:decision==='approve'};
  }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}
  finally{client.release();}
}
