// First-party, read-only reliability diagnostics. No AI provider calls.
import {auditImportedKnowledge} from './knowledge-readiness.mjs';
import {evaluateFreeQualityScenario} from './respondo-free-quality-gates.mjs';
import {redactQualityQuestion} from './respondo-quality-center.mjs';
import {listManualVersions} from './respondo-manual-versions.mjs';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const valid=id=>UUID.test(String(id||''));
const safe=(v,n=120)=>String(v??'').trim().slice(0,n);
const fold=v=>String(v||'').normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
const money=s=>[...String(s||'').matchAll(/(?:^|[^\d])(\d{1,6}(?:[.,]\d{1,2})?)\s*(?:€|eur\b|euroa\b|euros?\b)/gi)]
  .map(x=>Number(x[1].replace(',','.'))).filter(Number.isFinite);

export function detectKnowledgeConflicts(rows=[]){
 const groups=new Map();
 for(const row of (Array.isArray(rows)?rows:[]).slice(0,2000)){
  if(row?.approved!==true||!row.title||!row.answer)continue;
  const key=fold(row.category)+'|'+fold(row.title);
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push(row);
 }
 const flags=[];
 for(const group of groups.values()){
  if(group.length<2||new Set(group.map(x=>fold(x.answer))).size<2)continue;
  const prices=[...new Set(group.flatMap(x=>money(x.answer)))];
  flags.push({kind:prices.length>1?'different_prices':'different_answers',
   title:safe(group[0].title,150),category:safe(group[0].category,80),
   recordIds:group.map(x=>x.id).filter(valid).slice(0,8),prices:prices.slice(0,8),
   ownerReviewRequired:true,automaticallyResolved:false});
 }
 return flags.slice(0,35);
}

export function checkLanguageLinks(rows=[]){
 const issues=[];
 for(const row of (Array.isArray(rows)?rows:[]).slice(0,1500)){
  if(row?.approved!==true)continue;
  const expected=/\s·\s(FI|SV|EN)\s·\s/i.exec(String(row.category||''))?.[1]?.toLowerCase();
  if(!expected)continue;
  for(const href of (String(row.answer||'').match(/https?:\/\/[^\s<>"']+/g)||[]).slice(0,10)){
   try{
    const u=new URL(href),found=u.searchParams.get('lang')||u.searchParams.get('language');
    if(['fi','sv','en'].includes(found)&&found!==expected){
     issues.push({knowledgeId:valid(row.id)?row.id:null,title:safe(row.title,120),
      expected,found,possibleMismatch:true,verifiedByBrowser:false});
     break;
    }
   }catch{}
  }
 }
 return issues.slice(0,30);
}

export function knowledgeAuditSummary(rows=[]){
 const approved=(Array.isArray(rows)?rows:[]).filter(x=>x?.approved===true);
 const plan=auditImportedKnowledge(approved);
 const cutoff=Date.now()-90*86400000;
 const stale=approved.filter(x=>!x.verified_at||
   !Number.isFinite(Date.parse(String(x.verified_at)))||
   Date.parse(String(x.verified_at))<cutoff).length;
 return {coveragePercent:plan.coveragePercent,
  coverageTopics:plan.coverage,missingTopics:plan.missing,
  approvedFacts:approved.length,unverifiedOrOlderThan90Days:stale,
  potentialConflicts:detectKnowledgeConflicts(approved),
  possibleLanguageLinkIssues:checkLanguageLinks(approved),
  importerWarnings:plan.warnings,
  scoreMeaning:'approved_topic_coverage_not_answer_quality',
  partialSample:rows.length>=1500,notModelAccuracy:true,automaticChanges:0};
}

export function screenRecordedAnswers(rows=[],approvedFacts=[]){
 // Price comparisons are review signals, never conclusive error findings.
 // Only compare against currently approved sources cited by that reply.
 const sources=new Map((Array.isArray(approvedFacts)?approvedFacts:[])
  .filter(item=>item?.approved===true&&valid(item.id))
  .map(item=>[item.id.toLowerCase(),item]));
 const records=(Array.isArray(rows)?rows:[]).slice(0,300);
 const counts=new Map(),reviews=[];let examined=0,flagged=0;
 for(const row of records){
  if(!row?.question||!row?.answer)continue;
  // Per-answer language is not reliably recorded in conversations.
  // Exclude the language heuristic and use only transaction-safety flags.
  let result;
  try{result=evaluateFreeQualityScenario({
   question:row.question,answer:row.answer,language:'fi',proof:{}
  });}catch{continue;}
  examined++;
  const flags=result.flags.filter(x=>x.code!=='possible_wrong_language');
  const cited=(Array.isArray(row.source_ids)?row.source_ids:[]).slice(0,30)
   .filter(valid).map(id=>sources.get(String(id).toLowerCase())).filter(Boolean);
  const answerPrices=money(row.answer);
  const approvedPrices=[...new Set(cited.flatMap(item=>money(item.answer)))];
  if(answerPrices.length&&approvedPrices.length&&
     answerPrices.some(value=>!approvedPrices.some(approved=>Math.abs(value-approved)<0.005))){
   flags.push({code:'possible_cited_price_mismatch',severity:'review'});
  }
  if(flags.length){flagged++;
   if(reviews.length<30)reviews.push({conversationId:valid(row.id)?row.id:null,
    question:redactQualityQuestion(row.question),
    flags:flags.map(x=>({code:x.code,severity:x.severity}))});
  }
  for(const flag of flags)counts.set(flag.code,(counts.get(flag.code)||0)+1);
 }
 return {recordedRepliesScreened:examined,flagged,
  findingsByType:[...counts].map(([code,count])=>({code,count})),
  examples:reviews,actualLiveBotExecutions:0,providerCalls:0,
  factualCorrectnessProven:false,manualReviewRequired:true,
  checks:'recorded_answer_screening_without_transaction_ledger',
  note:'A flag is a reason for review, not evidence that the answer was false.'};
}

export function groupedJourney(rows=[]){
 const groups=new Map();
 for(const row of (Array.isArray(rows)?rows:[]).slice(0,300)){
  let path='(unknown)';
  try{const u=new URL(String(row.page_url||''));
   if(['https:','http:'].includes(u.protocol)){
    // Remove query, fragment and all but two path segments.
    path='/'+u.pathname.split('/').filter(Boolean).slice(0,2)
      .map(s=>s.length>30?s.slice(0,30)+'…':s).join('/');
   }
  }catch{}
  const item=groups.get(path)||{page:path,replies:0,handoffs:0};
  item.replies++;if(row.handoff===true)item.handoffs++;
  groups.set(path,item);
 }
 return [...groups.values()].sort((a,b)=>b.replies-a.replies).slice(0,12);
}

export function ownerAlerts({overdue=0,approvals=0,uncertain=0,conflicts=0}={}){
 const out=[];
 for(const [key,total,target] of [['overdue_tasks',overdue,'automation'],
  ['pending_approvals',approvals,'automation'],
  ['uncertain_replies',uncertain,'automation'],
  ['knowledge_conflicts',conflicts,'settings']]){
  if(Number(total)>0)out.push({key,total:Number(total),target});
 }
 return {items:out,delivery:'owner_dashboard_only',externalNotificationsSent:false};
}

export function ownerComplianceChecklist(){
 return {verifiedLegalCompliance:false,legalAdvice:false,
 checks:[
  {id:'ai_disclosure',text:'Inform visitors that they are interacting with AI',ownerReviewRequired:true},
  {id:'privacy_notice',text:'Verify privacy notice accurately describes purposes and recipients',ownerReviewRequired:true},
  {id:'retention',text:'Document actual retention and deletion behavior',ownerReviewRequired:true},
  {id:'human_handoff',text:'Verify the handoff path with a real visitor test',ownerReviewRequired:true},
  {id:'data_rights',text:'Test access, export and deletion requests',ownerReviewRequired:true},
  {id:'provider_agreements',text:'Review supplier agreements and international transfers',ownerReviewRequired:true}
 ]};
}

export async function reliabilityOverview(db,tenantId){
 if(!valid(tenantId))throw new TypeError('Invalid workspace');
 const [knowledge,conversations,tasks,approvals,versions]=await Promise.all([
  db.query('SELECT id,category,title,answer,approved,verified_at,source_type,source_url '+
   'FROM knowledge WHERE tenant_id=$1 AND approved=TRUE ORDER BY updated_at DESC LIMIT 1500',[tenantId]),
  db.query('SELECT id,question,answer,confidence,handoff,source_ids,page_url,created_at '+
   "FROM conversations WHERE tenant_id=$1 AND created_at>=NOW()-INTERVAL '30 days' "+
   'ORDER BY created_at DESC LIMIT 300',[tenantId]),
  db.query("SELECT COUNT(*)::int AS overdue FROM respondo_native_tasks "+
   "WHERE tenant_id=$1 AND status='open' AND due_at<NOW()",[tenantId]),
  db.query("SELECT COUNT(*)::int AS pending FROM respondo_free_workflow_approvals "+
   "WHERE tenant_id=$1 AND status='pending'",[tenantId]),
  listManualVersions(db,tenantId)
 ]);
 const summary=knowledgeAuditSummary(knowledge.rows||[]);
 const cases=conversations.rows||[];
 return {knowledge:summary,testLab:screenRecordedAnswers(cases,knowledge.rows||[]),
  journey:groupedJourney(cases),alerts:ownerAlerts({
   overdue:tasks.rows?.[0]?.overdue||0,approvals:approvals.rows?.[0]?.pending||0,
   uncertain:cases.filter(x=>x.handoff===true||Number(x.confidence)<0.45).length,
   conflicts:summary.potentialConflicts.length
  }),versions,compliance:ownerComplianceChecklist(),windowDays:30,
  newPaidServices:0,customerResolutionVerified:false};
}
