// Conservative, read-only numeric fact checks against the exact cited tenant
// rows. Matching numbers are evidence candidates, never proof of semantics.
const COMPARABLE_TOPICS=new Set(['pricing','hours','delivery','returns','warranty','payment']);
const fold=s=>String(s??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\u00a0/g,' ');
const numberRe=/(?:\d{1,3}(?:[ .]\d{3})+|\d+)(?:[,.]\d+)?/g;
const unitRe=/^\s*(€|eur(?:o(?:a|ja|s)?)?|\$|usd|kronor|kruunua|kr|sek|%|h|hours?|tunt\w*|timm\w*|days?|paiv\w*|dag\w*|weeks?|viik\w*|kk|months?|manad\w*|years?|vuos\w*|ar)(?![a-z])/i;
const unit=(raw)=>{
  const s=fold(raw);
  if(/^(?:€|eur|euro|euroa|euroja|euros)$/.test(s))return 'eur';
  if(/^(?:\$|usd)$/.test(s))return 'usd';
  if(/^(?:kr|sek|kronor|kruunua)$/.test(s))return 'sek';
  if(s==='%')return 'percent';
  if(/^(?:h|hour|tunt|timm)/.test(s))return 'hour';
  if(/^(?:day|paiv|dag)/.test(s))return 'day';
  if(/^(?:week|viik)/.test(s))return 'week';
  if(/^(?:kk|month|manad)/.test(s))return 'month';
  if(/^(?:year|vuos|ar$)/.test(s))return 'year';
  return '';
};
const canonicalNumber=value=>{
  const text=String(value).replace(/\s/g,'').replace(',','.');
  const n=Number(text);
  return Number.isFinite(n)?String(n):text;
};
const canonicalClock=(hour,minutes='00')=>String(Number(hour))+':'+minutes;
function numericFacts(value,topic) {
  const text=fold(value);
  const facts=[];
  const used=[];
  const remember=(start,end,entry)=>{used.push([start,end]);facts.push(entry);};
  if(topic==='hours') {
    // Explicit 09:00, 9.00 and 17:30 timestamps; do not confuse prices
    // with clock times in other topics.
    for(const m of text.matchAll(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/g))
      remember(m.index,m.index+m[0].length,{unit:'clock',value:canonicalClock(m[1],m[2])});
    // Opening-hour ranges like "auki 9–17" or "open 9-17".
    for(const m of text.matchAll(/\b([01]?\d|2[0-3])\s*[-–—]\s*([01]?\d|2[0-3])\b/g)) {
      if(used.some(([a,b])=>m.index<b && m.index+m[0].length>a))continue;
      remember(m.index,m.index+m[0].length,{unit:'clock',value:canonicalClock(m[1])});
      facts.push({unit:'clock',value:canonicalClock(m[2])});
    }
    // "klo 9", "kl. 9": require an explicit clock cue.
    for(const m of text.matchAll(/\b(?:klo|kl)\.?\s+([01]?\d|2[0-3])\b/g)) {
      const start=m.index+m[0].lastIndexOf(m[1]);
      if(used.some(([a,b])=>start>=a&&start<b))continue;
      remember(start,start+m[1].length,{unit:'clock',value:canonicalClock(m[1])});
    }
  }
  // Price and duration ranges carry one unit after the high endpoint:
  // "49–79 €", "2–4 päivää". Both endpoints require source support.
  for(const m of text.matchAll(/\b(\d+(?:[,.]\d+)?)\s*[-–—]\s*(\d+(?:[,.]\d+)?)\s*(€|eur(?:o(?:a|ja|s)?)?|\$|usd|kronor|kruunua|kr|sek|%|hours?|tunt\w*|timm\w*|days?|paiv\w*|dag\w*|weeks?|viik\w*|kk|months?|manad\w*|years?|vuos\w*|ar)(?![a-z])/gi)) {
    if(used.some(([a,b])=>m.index<b && m.index+m[0].length>a))continue;
    const kind=unit(m[3]);
    if(!kind)continue;
    remember(m.index,m.index+m[0].length,{unit:kind,value:canonicalNumber(m[1])});
    facts.push({unit:kind,value:canonicalNumber(m[2])});
  }
  for(const m of text.matchAll(numberRe)) {
    if(used.some(([a,b])=>m.index>=a&&m.index<b))continue;
    const start=m.index,end=start+m[0].length;
    const before=text.slice(Math.max(0,start-3),start);
    const after=text.slice(end);
    // Do not turn contact numbers, URLs, reference identifiers, or plain
    // unqualified numbers into price or warranty contradictions.
    if(/[a-z0-9@/+#]/.test(text[start-1]||''))continue;
    if(/^[.:/\-]/.test(after))continue;
    let kind=unit(after.match(unitRe)?.[1]||'');
    if(!kind && /[€$]\s*$/.test(before))kind=before.includes('€')?'eur':'usd';
    if(!kind)continue;
    facts.push({unit:kind,value:canonicalNumber(m[0])});
  }
  return facts;
}
export function checkCitedNumericalClaims({answer='',sourceRows=[],topic=''}={}) {
  if(!COMPARABLE_TOPICS.has(String(topic)))return {status:'not_checked',reason:'topic_not_comparable'};
  const cited=Array.isArray(sourceRows)?sourceRows:[];
  if(!cited.length)return {status:'not_checked',reason:'no_cited_sources'};
  const claims=numericFacts(answer,topic);
  if(!claims.length)return {status:'not_checked',reason:'no_numeric_claims'};
  const originals=numericFacts(cited.map(r=>String(r.title||'')+' '+String(r.answer||'')).join(' '),topic);
  const missing=claims.filter(claim=>!originals.some(source=>source.unit===claim.unit&&source.value===claim.value));
  if(missing.length)return {status:'review',reason:'numeric_value_not_in_cited_sources',values:missing.slice(0,8)};
  return {status:'no_numeric_conflict_found',reason:'checked_explicit_numeric_values'};
}
