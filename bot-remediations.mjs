// Read-only triage of post-import bot smoke tests.
// Remediation codes are shared across tenants. Suggestions never mutate facts,
// insert invented answers or trigger unreviewed changes.
const topicSet=new Set(['services','pricing','hours','contact','location','quote','delivery','returns','warranty','payment']);
const fixedActions=Object.freeze({
 missing_information:{priority:'high',scope:'company',nextStep:'verify_and_add_missing_company_fact'},
 numeric_conflict:{priority:'high',scope:'shared_logic',nextStep:'review_value_and_source_matching'},
 unsupported_answer:{priority:'high',scope:'shared_logic',nextStep:'block_unsourced_company_claims'},
 needless_handoff:{priority:'medium',scope:'shared_logic',nextStep:'improve_retrieval_for_verified_fact'},
 answer_failure:{priority:'high',scope:'shared_logic',nextStep:'investigate_answer_pipeline_error'},
 needs_review:{priority:'medium',scope:'shared_logic',nextStep:'inspect_evidence_and_answer'},
 conflicting_facts:{priority:'high',scope:'company',nextStep:'resolve_conflicting_source_facts'},
 imported_noise:{priority:'medium',scope:'company',nextStep:'remove_navigation_or_cookie_content'},
});
const reasonMap=Object.freeze({
 numeric_value_not_in_cited_sources:'numeric_conflict',
 unverified_missing_fact_response:'unsupported_answer',
 unexpected_source:'unsupported_answer',
 answer_without_verified_source:'unsupported_answer',
 handoff_despite_imported_evidence:'needless_handoff',
 answer_error:'answer_failure',
 empty_answer:'answer_failure',
});
const priorityRank={high:0,medium:1,low:2};
export function suggestBotRemediations({readiness={},results=[]}={}) {
 const issues=new Map();
 const add=(code,topic,question='')=>{
   const rule=fixedActions[code];
   if(!rule)return;
   const safeTopic=topicSet.has(topic)?topic:'general';
   const key=code+'|'+safeTopic;
   if(!issues.has(key))issues.set(key,{code,topic:safeTopic,scope:rule.scope,priority:rule.priority,nextStep:rule.nextStep,count:0,examples:[]});
   const issue=issues.get(key);
   issue.count++;
   // Only generated smoke-test prompts are included; never raw customer chat logs.
   if(typeof question==='string' && question.length<=240 && issue.examples.length<2 && !issue.examples.includes(question))issue.examples.push(question);
 };
 for(const topic of new Set(Array.isArray(readiness?.missing)?readiness.missing:[]))add('missing_information',topic);
 for(const warning of Array.isArray(readiness?.warnings)?readiness.warnings:[]) {
   if(warning?.type==='suspected_noise')add('imported_noise','general');
   if(warning?.type==='conflicting_duplicate_titles')add('conflicting_facts','general');
 }
 for(const item of (Array.isArray(results)?results:[]).slice(0,100)){
   if(item?.status!=='review')continue;
   add(reasonMap[String(item.reason||'')]||'needs_review',item.topic,item.question);
 }
 const recommendations=[...issues.values()].sort((a,b)=>priorityRank[a.priority]-priorityRank[b.priority]||b.count-a.count||a.code.localeCompare(b.code)).slice(0,30);
 return {version:1,automaticChangesApplied:0,manualReviewRequired:recommendations.length>0,recommendations,
   summary:{sharedLogic:recommendations.filter(x=>x.scope==='shared_logic').length,companyFacts:recommendations.filter(x=>x.scope==='company').length}};
}
