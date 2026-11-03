// Read-only comparison of identical test questions before and after knowledge approval.
// A grounded candidate is NOT guaranteed factually correct. No automatic changes.
const key = item => String(item?.language||'')+'|'+String(item?.topic||'')+'|'+String(item?.question||'');
const acceptable = new Set(['grounded_candidate','safe']);
export function compareBotValidationRuns(before={},after={}) {
  const baseline = new Map((Array.isArray(before?.results)?before.results:[]).map(item=>[key(item),item]));
  const current = Array.isArray(after?.results)?after.results:[];
  let improvedCandidates=0, regressions=0, unchanged=0, newCases=0;
  const changes=[];
  for(const item of current) {
    const prior=baseline.get(key(item));
    if(!prior){ newCases++;continue; }
    if(prior.status===item.status && prior.reason===item.reason){unchanged++;continue;}
    const worsened=acceptable.has(prior.status) && item.status==='review';
    const improved=prior.status==='review' && acceptable.has(item.status);
    if(worsened)regressions++;
    if(improved)improvedCandidates++;
    changes.push({
      topic:item.topic,language:item.language,question:item.question,
      before:prior.status,after:item.status,beforeReason:prior.reason,afterReason:item.reason,
      classification:worsened?'regression':improved?'improvement_candidate':'changed_needs_review',
    });
  }
  return {version:1,baselineAvailable:baseline.size>0,compared:current.length-newCases,
    improvedCandidates,regressions,unchanged,newCases,changes:changes.slice(0,18),
    // Provenance/heuristic grades cannot establish factual accuracy.
    accuracyVerified:false,automaticChangesApplied:0};
}
