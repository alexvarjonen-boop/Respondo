// Respondo first-party, tenant-local answer-repair aliases.
// No model calls, no fabricated facts, no unreviewed knowledge publication.
// An alias references a *current approved* source instead of copying source text.
const idPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isId=x=>idPattern.test(String(x||''));
const fold=s=>String(s||'').normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g,'')
  .replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
const common=new Set([
  'miksi','mihin','miten','mista','mita','milloin','missä','paljonko','maksaa','mitka','jotain',
  'kuinka','haluan','teilla','onko','voiko','voidaanko','sen','taman','tuon',
  'what','when','how','where','which','does','with','can','you','your','have',
  'hur','nar','var','vilka','vad','det','har','kan','med','fran','som','ni','och'
]);
const tokenSet=s=>new Set(fold(s).split(/\s+/).filter(v=>v.length>=4&&!common.has(v)));
const catTopic=s=>{
  const text=fold(s);
  if(/hinnat|hinnoittel|pricing|priser|prislist|hinta|kustann|cost|price|pris/.test(text))return 'price';
  if(/aukiolo|opening hours|oppettid|opening|hours/.test(text))return 'hours';
  if(/takuu|warranty|garanti/.test(text))return 'warranty';
  if(/palaut|returns|refund|retur/.test(text))return 'returns';
  if(/toimit|delivery|shipping|leverans/.test(text))return 'delivery';
  if(/osoite|yhteystiedot|contact|kontakt|puhelin|phone|email/.test(text))return 'contact';
  return '';
};
const text=(s,max)=>String(s??'').trim().slice(0,max);
export function safeRepairQuestion(question){
  const q=text(question,200);
  if(q.length<9||q.length>180||!/[\p{L}]/u.test(q)
    || /@|https?:|www\.|\[(?:email|phone)\]/i.test(q)
    || /(?:\+?\d[\d().\s-]{7,}\d)/.test(q))
    throw new TypeError('Remove personal contact details and use a generic question');
  return q;
}
export function repairSuggestions(gaps=[],sources=[],aliases=[]){
  const done=new Set((aliases||[]).map(x=>String(x.conversation_id)));
  const options=(sources||[]).filter(x=>x?.approved!==false&&isId(x?.id)
    &&x?.title&&x?.answer&&x?.verified_at&&new Date(x.verified_at).getTime()>Date.now()-180*86400000
    &&new Date(x.verified_at).getTime()<=Date.now()+86400000);
  const list=[];
  for(const gap of (Array.isArray(gaps)?gaps:[]).slice(0,60)){
    if(!isId(gap?.id)||done.has(String(gap.id)))continue;
    const question=text(gap.question,180);
    const keywords=tokenSet(question),topic=catTopic(question);
    if(!keywords.size)continue;
    const ranked=[];
    for(const row of options){
      const title=String(row.title||'');
      const cat=String(row.category||'');
      const sourceTopic=catTopic(cat+' '+title);
      if(topic&&sourceTopic&&topic!==sourceTopic)continue;
      const sourceTokens=tokenSet(title+' '+(Array.isArray(row.keywords)?row.keywords.join(' '):''));
      const intersection=[...keywords].filter(t=>sourceTokens.has(t)).length;
      const exact=fold(question)===fold(title);
      // When the category and question topic agree, one exact service/product
      // word is sufficient to offer a reviewable candidate. Never auto-approve.
      if(!exact&&intersection<2&&!(intersection>=1&&topic&&sourceTopic===topic))continue;
      const topicBoost=topic&&sourceTopic===topic?3:0;
      const rank=(exact?100:0)+intersection*5+topicBoost;
      ranked.push({sourceId:row.id,title:text(title,140),excerpt:text(row.answer,240),rank,
        sourceVerifiedAt:row.verified_at});
    }
    ranked.sort((a,b)=>b.rank-a.rank);
    if(ranked.length)list.push({conversationId:gap.id,question,
      candidates:ranked.slice(0,2).map(({rank,...candidate})=>({
        ...candidate,quality:'possible_source_requires_owner_review'
      }))});
  }
  return list.slice(0,30);
}
export function expandKnowledgeAliases(approvedRows,aliases){
  const rows=(Array.isArray(approvedRows)?approvedRows:[]).filter(r=>r&&r.approved!==false);
  const map=new Map(rows.map(r=>[String(r.id),r]));
  const additions=[];
  for(const item of Array.isArray(aliases)?aliases.slice(0,1000):[]){
    if(!isId(item.id)||!isId(item.source_knowledge_id))continue;
    const approved=map.get(String(item.source_knowledge_id));
    if(!approved || !approved.answer || !approved.title)continue;
    const verified=new Date(approved.verified_at).getTime();
    if(!Number.isFinite(verified)||verified<Date.now()-180*86400000||verified>Date.now()+86400000)
      continue;
    let question='';
    try{question=safeRepairQuestion(item.question);}catch{continue;}
    additions.push({
      ...approved,id:item.id,title:question,source_type:approved.source_type,
      keywords:[...new Set([...tokenSet(question),...(Array.isArray(approved.keywords)?approved.keywords:[])])].slice(0,24),
      // Never trust saved alias text as a fresh fact. Read the *current*
      // approved source record on every chat request.
      answer:approved.answer,verified_at:approved.verified_at
    });
  }
  return [...rows,...additions];
}
export async function ensureQualityRepairSchema(db){
  await db.query(`CREATE TABLE IF NOT EXISTS public.respondo_quality_aliases(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    source_knowledge_id UUID NOT NULL REFERENCES public.knowledge(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    approved_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id,conversation_id),
    UNIQUE(tenant_id,question)
  )`);
  await db.query('CREATE INDEX IF NOT EXISTS idx_respondo_quality_aliases_source ON public.respondo_quality_aliases(tenant_id,source_knowledge_id)');
  await db.query('ALTER TABLE public.respondo_quality_aliases ENABLE ROW LEVEL SECURITY');
  await db.query('REVOKE ALL PRIVILEGES ON TABLE public.respondo_quality_aliases FROM PUBLIC');
  const role=await db.query("SELECT rolname FROM pg_roles WHERE rolname=ANY($1::text[])",[['anon','authenticated','service_role']]);
  for(const r of role.rows||[]){
    if(['anon','authenticated','service_role'].includes(r.rolname))
      await db.query('REVOKE ALL PRIVILEGES ON TABLE public.respondo_quality_aliases FROM '+r.rolname);
  }
}
export async function qualityRepairOverview(db,tenantId){
  const [gaps,sources,aliases]=await Promise.all([
    db.query(`SELECT id,question,intent FROM conversations WHERE tenant_id=$1 AND handoff=TRUE
      ORDER BY created_at DESC LIMIT 50`,[tenantId]),
    db.query(`SELECT id,title,answer,category,keywords,source_url,source_type,approved,verified_at
      FROM knowledge WHERE tenant_id=$1 AND approved=TRUE
      ORDER BY verified_at DESC NULLS LAST LIMIT 2000`,[tenantId]),
    db.query(`SELECT id,conversation_id,source_knowledge_id,question,created_at
      FROM respondo_quality_aliases WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 100`,[tenantId])
  ]);
  const evidence=repairSuggestions(gaps.rows,sources.rows,aliases.rows);
  return {suggestions:evidence,approved:(aliases.rows||[]).map(a=>({
    id:a.id,question:a.question,createdAt:a.created_at
  })),automaticChangesApplied:0,requiresOwnerApproval:true};
}
export async function approveQualityRepair(db,tenantId,userId,{
  conversationId,sourceId,question,approved
}={}){
  if(approved!==true||!isId(conversationId)||!isId(sourceId))
    throw new TypeError('Explicit approval and source are required');
  const safe=safeRepairQuestion(question);
  // Server verifies both conversation and source belong to the *same* tenant.
  // No freeform "answer" is accepted; original verified source stays canonical.
  const found=await db.query(`SELECT c.id AS conversation_id,k.id AS source_id
    FROM conversations c JOIN knowledge k ON k.tenant_id=c.tenant_id
    WHERE c.id=$2 AND c.tenant_id=$1 AND c.handoff=TRUE AND k.id=$3
      AND k.approved=TRUE AND k.verified_at>=NOW()-INTERVAL '180 days'
      AND k.verified_at<=NOW()+INTERVAL '1 day'
    LIMIT 1`,[tenantId,conversationId,sourceId]);
  if(!found.rows[0])throw new TypeError('The gap or verified source is unavailable for this workspace');
  const result=await db.query(`INSERT INTO respondo_quality_aliases(
    tenant_id,conversation_id,source_knowledge_id,question,approved_by)
    VALUES($1,$2,$3,$4,$5)
    ON CONFLICT DO NOTHING RETURNING id,question`,
    [tenantId,conversationId,sourceId,safe,String(userId).slice(0,120)]);
  if(!result.rows[0])throw new TypeError('This repair is already approved or conflicts with another alias');
  return {id:result.rows[0].id,question:result.rows[0].question,approved:true,
    answerSource:'approved_current_company_fact'};
}
export async function qualityAliasesForTenant(db,tenantId,approvedRows){
  const r=await db.query(`SELECT id,source_knowledge_id,question
    FROM respondo_quality_aliases WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 1000`,[tenantId]);
  return expandKnowledgeAliases(approvedRows,r.rows);
}
