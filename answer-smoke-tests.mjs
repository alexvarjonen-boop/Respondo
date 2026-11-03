// Bounded read-only smoke tests of actual bot answers against tenant-local sources.
// "review" is not a pass. Source provenance is necessary, not proof of semantics.
const MAX_CASES=18;
const norm=v=>String(v??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
const UNSUPPORTED=/\b(?:kylla|yes|ja|maksaa|costs?|price is|hinta on|on avoinna|open from|oppet fran|toimitus kestaa|delivery takes|garanti(?:n)? ar|warranty is)\b/;
export function gradeBotAnswer(scenario,answer,knownIds=new Set()) {
  const reply=String(answer?.answer||'').trim();
  const ids=Array.isArray(answer?.sourceIds)?answer.sourceIds.filter(id=>knownIds.has(String(id))):[];
  const noSource=ids.length===0;
  const handoff=answer?.handoff===true;
  if (!reply && !handoff) return {status:'review',reason:'empty_answer'};
  if(scenario.expectedEvidence==='missing') {
    if(handoff && noSource) return {status:'safe',reason:'missing_fact_handoff'};
    // Do not mark generic, unsupported statements as correct answers.
    return {status:'review',reason:noSource?'unverified_missing_fact_response':'unexpected_source'};
  }
  if(handoff) return {status:'review',reason:'handoff_despite_imported_evidence'};
  if(noSource) return {status:'review',reason:'answer_without_verified_source'};
  if(UNSUPPORTED.test(norm(reply)) && ids.length===0) return {status:'review',reason:'unsupported_claim'};
  return {status:'grounded_candidate',reason:'source_references_present'};
}
export async function runImportedAnswerSmokeTests({readiness,rows,answerQuestion,limit=MAX_CASES}={}) {
  if(typeof answerQuestion!=='function') throw new TypeError('answerQuestion required');
  const cases=Array.isArray(readiness?.scenarios)?readiness.scenarios.slice(0,Math.max(0,Math.min(MAX_CASES,Math.floor(Number(limit)||0)))):[];
  const knownIds=new Set((Array.isArray(rows)?rows:[]).map(r=>String(r.id)).filter(Boolean));
  const results=[];
  for(const scenario of cases) {
    try {
      const answer=await answerQuestion(scenario.question,scenario.language);
      const verdict=gradeBotAnswer(scenario,answer,knownIds);
      results.push({topic:scenario.topic,language:scenario.language,question:scenario.question,
        status:verdict.status,reason:verdict.reason,handoff:answer?.handoff===true,
        sourceCount:Array.isArray(answer?.sourceIds)?answer.sourceIds.filter(id=>knownIds.has(String(id))).length:0});
    }catch {
      results.push({topic:scenario.topic,language:scenario.language,question:scenario.question,status:'review',reason:'answer_error',handoff:false,sourceCount:0});
    }
  }
  const counts={grounded_candidate:0,safe:0,review:0};
  for(const r of results) counts[r.status]++;
  return {version:1,testsExecuted:true,executed:results.length,counts,results,
    // A citation is not a factual entailment check; expert review is still needed.
    accuracyVerified:false};
}
