// Deliberately limited to owner-managed manual Q&A, not imported website data.
// Restores published state without deleting cited records. Creates a recovery
// checkpoint within the same transaction before any changed publication state.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const valid=value=>UUID.test(String(value||''));
const safe=(value,n)=>String(value??'').trim().slice(0,n);

export async function ensureManualVersionSchema(db){
 await db.query('CREATE TABLE IF NOT EXISTS public.respondo_manual_knowledge_versions ('+
  'id UUID PRIMARY KEY DEFAULT gen_random_uuid(),'+
  'tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,'+
  'label TEXT NOT NULL,entries JSONB NOT NULL,created_by TEXT NOT NULL,'+
  'created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
 await db.query('CREATE INDEX IF NOT EXISTS idx_manual_versions_tenant '+
  'ON public.respondo_manual_knowledge_versions(tenant_id,created_at DESC)');
 await db.query('ALTER TABLE public.respondo_manual_knowledge_versions ENABLE ROW LEVEL SECURITY');
 await db.query('REVOKE ALL PRIVILEGES ON TABLE public.respondo_manual_knowledge_versions FROM PUBLIC');
 const roles=await db.query("SELECT rolname FROM pg_roles WHERE rolname=ANY($1::text[])",
  [['anon','authenticated','service_role']]);
 for(const item of roles.rows||[])if(['anon','authenticated','service_role'].includes(item.rolname))
  await db.query('REVOKE ALL PRIVILEGES ON TABLE public.respondo_manual_knowledge_versions FROM '+item.rolname);
}

export async function listManualVersions(db,tenantId){
 if(!valid(tenantId))throw new TypeError('Invalid workspace');
 const r=await db.query('SELECT id,label,created_at,jsonb_array_length(entries)::int AS count '+
  'FROM respondo_manual_knowledge_versions WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 20',
  [tenantId]);
 return {versions:r.rows||[],scope:'manual_and_owner_answer_only',automaticSnapshots:false};
}

async function readEntries(client,tenantId){
 const r=await client.query('SELECT id,category,title,answer,keywords,source_type,source_url,'+
  'approved,verified_at,quick_reply_order FROM knowledge '+
  "WHERE tenant_id=$1 AND source_type IN ('manual','owner_answer') ORDER BY id LIMIT 1001",
  [tenantId]);
 if((r.rows||[]).length>1000)throw new TypeError('At most 1000 manual answers per version');
 return r.rows||[];
}
function validateEntries(value){
 if(!Array.isArray(value)||value.length>1000||
  value.some(x=>!valid(x?.id)||!['manual','owner_answer'].includes(x?.source_type)||
   typeof x.title!=='string'||!x.title||typeof x.answer!=='string'||!x.answer||
   typeof x.approved!=='boolean'||!Array.isArray(x.keywords)))
  throw new TypeError('Invalid saved version');
 return value;
}
async function withTransaction(db,handler){
 const client=await db.connect();
 try{
  await client.query('BEGIN');
  const result=await handler(client);
  await client.query('COMMIT');
  return result;
 }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}
 finally{client.release();}
}

export async function createManualVersion(db,tenantId,ownerId,payload={}){
 if(!valid(tenantId)||payload.confirm!==true)throw new TypeError('Owner confirmation required');
 const label=safe(payload.label||'Manual answers checkpoint',100);
 if(label.length<3)throw new TypeError('Version label required');
 return withTransaction(db,async client=>{
  const tenant=await client.query('SELECT id FROM tenants WHERE id=$1 FOR UPDATE',[tenantId]);
  if(!tenant.rowCount)throw new TypeError('Workspace not found');
  const entries=await readEntries(client,tenantId);
  const r=await client.query('INSERT INTO respondo_manual_knowledge_versions '+
   '(tenant_id,label,entries,created_by) VALUES($1,$2,$3::jsonb,$4) '+
   'RETURNING id,label,created_at',
   [tenantId,label,JSON.stringify(entries),safe(ownerId,150)]);
  return {...r.rows[0],saved:entries.length,scope:'manual_and_owner_answer_only'};
 });
}

export async function restoreManualVersion(db,tenantId,versionId,ownerId,payload={}){
 if(!valid(tenantId)||!valid(versionId)||payload.confirm!==true||
    payload.phrase!=='RESTORE MANUAL ANSWERS')
  throw new TypeError('Exact restore phrase and owner confirmation are required');
 return withTransaction(db,async client=>{
  const tenant=await client.query('SELECT id FROM tenants WHERE id=$1 FOR UPDATE',[tenantId]);
  if(!tenant.rowCount)throw new TypeError('Workspace not found');
  const version=await client.query('SELECT entries FROM respondo_manual_knowledge_versions '+
   'WHERE tenant_id=$1 AND id=$2 FOR UPDATE',[tenantId,versionId]);
  if(!version.rows?.length)throw new TypeError('Version not found for this company');
  const saved=validateEntries(version.rows[0].entries);
  const previous=await readEntries(client,tenantId);
  await client.query('INSERT INTO respondo_manual_knowledge_versions '+
   '(tenant_id,label,entries,created_by) VALUES($1,$2,$3::jsonb,$4)',
   [tenantId,'Before restore '+versionId,JSON.stringify(previous),safe(ownerId,150)]);
  // Leave records in place for old citation references; only change publication.
  // Site crawls, company profile and product facts remain untouched.
  await client.query('UPDATE knowledge SET approved=FALSE,updated_at=NOW() '+
   "WHERE tenant_id=$1 AND source_type IN ('manual','owner_answer')",[tenantId]);
  for(const entry of saved){
   const r=await client.query('INSERT INTO knowledge '+
    '(id,tenant_id,category,title,answer,keywords,source_type,source_url,'+
    'approved,verified_at,quick_reply_order) '+
    'VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) '+
    'ON CONFLICT(id) DO UPDATE SET category=EXCLUDED.category,title=EXCLUDED.title,'+
    'answer=EXCLUDED.answer,keywords=EXCLUDED.keywords,source_url=EXCLUDED.source_url,'+
    'approved=EXCLUDED.approved,verified_at=EXCLUDED.verified_at,'+
    'quick_reply_order=EXCLUDED.quick_reply_order,updated_at=NOW() '+
    'WHERE knowledge.tenant_id=EXCLUDED.tenant_id '+
    "AND knowledge.source_type IN ('manual','owner_answer') RETURNING id",
    [entry.id,tenantId,entry.category,entry.title,entry.answer,entry.keywords,
     entry.source_type,entry.source_url||null,entry.approved,entry.verified_at||null,
     entry.quick_reply_order??null]);
   if(!r.rowCount)throw new TypeError('Knowledge record belongs to another workspace');
  }
  return {restored:saved.length,rollbackCheckpointSaved:true,
   unpublishedExtraManualEntries:true,websiteImportsUnchanged:true,
   profileFactsUnchanged:true};
 });
}
