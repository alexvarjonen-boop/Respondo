// Deterministic, tenant-local knowledge readiness audit. Never uses other tenants'
// content, sends data to external services or treats suggested questions as proof.
const CATEGORY_SAMPLES = Object.freeze([
  {id:'services', labels:['palvelut','services','tjanster'], prompts:['Mitä palveluja tarjoatte?','Vilka tjänster erbjuder ni?','What services do you offer?']},
  {id:'pricing', labels:['hinnat','hinnoittelu','pricing','prices','priser','prislista'], prompts:['Paljonko palvelunne maksavat?','Vad kostar era tjänster?','How much do your services cost?']},
  {id:'hours', labels:['aukioloajat','opening hours','oppettider'], prompts:['Milloin olette auki?','Vilka är era öppettider?','What are your opening hours?']},
  {id:'contact', labels:['yhteystiedot','contact','kontakt'], prompts:['Miten teihin saa yhteyden?','Hur kontaktar jag er?','How can I contact you?']},
  {id:'location', labels:['sijainti','myymalat','location','stores','butiker'], prompts:['Missä sijaitsette?','Var finns ni?','Where are you located?']},
  {id:'quote', labels:['tarjouspyynto','quote','offert'], prompts:['Miten pyydän tarjouksen?','Hur begär jag en offert?','How do I request a quote?']},
  {id:'delivery', labels:['toimitus ja seuranta','delivery','shipping','leverans'], prompts:['Kauanko toimitus kestää?','Hur lång är leveranstiden?','How long does shipping take?']},
  {id:'returns', labels:['palautukset ja vaihdot','returns','refunds','returer'], prompts:['Voinko palauttaa tuotteen?','Kan jag returnera produkten?','Can I return the product?']},
  {id:'warranty', labels:['takuu','warranty','garanti'], prompts:['Onko tuotteella takuuta?','Har produkten garanti?','Does the product have a warranty?']},
  {id:'payment', labels:['maksaminen','payment','betalning'], prompts:['Millä voin maksaa?','Hur kan jag betala?','How can I pay?']},
]);
const fold = v => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const JUNK = /(?:cookie|evaste|all rights reserved|skip to content|javascript|localstorage|queryselector|add to cart|ostoskori|uutiskirje|newsletter)/i;
const MAX_ROWS=10000;
export function auditImportedKnowledge(rows=[], {businessType='auto'}={}) {
  const cleanRows=(Array.isArray(rows)?rows:[]).slice(0,MAX_ROWS)
    .filter(r=>r && r.approved!==false && typeof r.answer==='string' && r.answer.trim() && typeof r.title==='string' && r.title.trim());
  const junkRows=cleanRows.filter(r=>JUNK.test(fold(r.title+' '+r.answer)));
  const trusted=cleanRows.filter(r=>!JUNK.test(fold(r.title+' '+r.answer)));
  const bucket = new Map(CATEGORY_SAMPLES.map(c=>[c.id,[]]));
  for(const r of trusted) {
    const cat=fold(r.category);
    for(const c of CATEGORY_SAMPLES) if(c.labels.some(label=>cat.includes(label))) bucket.get(c.id).push(r);
  }
  const commerce = businessType==='ecommerce' || (businessType==='auto' && trusted.some(r=>/tuotteet|verkkokauppa|products|catalog|produkt|shop/i.test(String(r.category||''))));
  const applicable = commerce
    ? ['pricing','contact','delivery','returns','warranty','payment']
    : ['services','pricing','hours','contact','location','quote'];
  const available=applicable.filter(id=>bucket.get(id).length>0);
  const missing=applicable.filter(id=>bucket.get(id).length===0);
  const seen=new Map(), duplicateWarnings=[];
  for(const r of trusted) {
    const key=fold(r.category)+'|'+fold(r.title);
    const value=fold(r.answer);
    if(seen.has(key) && seen.get(key)!==value && !duplicateWarnings.includes(String(r.title))) duplicateWarnings.push(String(r.title));
    else if(!seen.has(key)) seen.set(key,value);
  }
  // Score is coverage of published facts, not the chat model's answer accuracy.
  const coveragePercent=Math.round(100*available.length/applicable.length);
  const scenarios=CATEGORY_SAMPLES.filter(c=>applicable.includes(c.id)).flatMap(c=>c.prompts.map((question,i)=>({
    topic:c.id, language:['fi','sv','en'][i], question,
    expectedEvidence:bucket.get(c.id).length?'available':'missing',
    // Missing evidence should trigger clarification/handoff, never an invented fact.
    expectedBehavior:bucket.get(c.id).length?'answer_from_verified_source':'do_not_invent',
  })));
  const warnings=[];
  if(junkRows.length) warnings.push({type:'suspected_noise',count:junkRows.length});
  if(duplicateWarnings.length) warnings.push({type:'conflicting_duplicate_titles',titles:duplicateWarnings.slice(0,20)});
  return {
    version:1, type:commerce?'ecommerce':'services', totalRows:cleanRows.length,
    usableRows:trusted.length, coveragePercent,
    coverage:applicable.map(id=>({topic:id,found:bucket.get(id).length,available:bucket.get(id).length>0})),
    missing, warnings, scenarios,
    // 'scenarios' are a test plan, not an assertion that the chatbot passed.
    testsExecuted:false,
  };
}
