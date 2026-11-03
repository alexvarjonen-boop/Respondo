// Read-only, deterministic detection of unsupported numeric claims.
// This does not prove semantic correctness. Only checks explicit comparable
// values against the exact cited tenant rows, never external knowledge.
const numericToken=/(?:\d{1,3}(?:[ .]\d{3})+|\d+)(?:[,.]\d+)?/g;
const normalizeText=s=>String(s??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const decimals=s=>String(s).replace(/\s/g,'').replace(',', '.');
const unitPattern=/^(?:\s*(€|eur\b|\$|usd\b|kr\b|sek\b|%|h\b|hours?\b|tunt\w*|days?\b|paiv\w*|dag\w*|weeks?\b|viik\w*|kk\b|month\w*|months?\b|year\w*|vuot\w*|vuos\w*))?/i;
function parseClaims(input) {
 const text=normalizeText(input);
 const values=[];
 for(const m of text.matchAll(numericToken)){
   const start=m.index, raw=m[0], before=text.slice(Math.max(0,start-2),start), after=text.slice(start+raw.length);
   const u=after.match(unitPattern)?.[1]||'';
   const unit=/€|eur/.test(u)||before.endsWith('€')?'eur':/\$|usd/.test(u)||before.endsWith('$')?'usd':/kr|sek/.test(u)?'sek':u==='%'?'percent':/^(?:h|hour|tunt)/.test(u)?'hour':/^(?:day|paiv|dag)/.test(u)?'day':/^(?:week|viik)/.test(u)?'week':/^(?:kk|month)/.test(u)?'month':/^(?:year|vuot|vuos)/.test(u)?'year':'';
   // Time stamps are compared as a single clock value, not two stray numbers.
   const clock=/^\d{1,2}:\d{2}/.exec(text.slice(start));
   if(clock){ values.push({value:clock[0],unit:'clock'});continue; }
   // Skip phone, URLs and identifiers; they are not standalone factual quantities.
   if(/[@/+#\w]/.test(text[start-1]||'') && !before.endsWith('€') && !before.endsWith('$'))continue;
   if(unit){values.push({value:decimals(raw),unit});}
   else if(!/[.:/-]/.test(text[start-1]||'') && !/[.:/-]/.test(after[0]||''))values.push({value:decimals(raw),unit:'plain'});
 }
 return values;
}
export function checkCitedNumericalClaims({answer='',sourceRows=[],topic=''}={}) {
 const cited=Array.isArray(sourceRows)?sourceRows:[];
 if(!cited.length)return {status:'not_checked',reason:'no_cited_sources'};
 const quoted=cited.map(r=>String(r.title||'')+' '+String(r.answer||'')).join(' ');
 const replyClaims=parseClaims(answer);
 if(!replyClaims.length)return {status:'not_checked',reason:'no_numeric_claims'};
 const sourced=parseClaims(quoted);
 const numericTopics=new Set(['pricing','hours','delivery','returns','warranty','payment']);
 if(!numericTopics.has(String(topic)))return {status:'not_checked',reason:'topic_not_comparable'};
 const missing=replyClaims.filter(claim=>{
   // Unqualified numbers can be formatting, ordinals or dates. Escalate them
   // for review only; never infer they are factual errors.
   if(claim.unit==='plain')return false;
   return !sourced.some(x=>x.value===claim.value && x.unit===claim.unit);
 });
 if(missing.length)return {status:'review',reason:'numeric_value_not_in_cited_sources',values:missing.slice(0,8)};
 return {status:'no_numeric_conflict_found',reason:'checked_explicit_numeric_values'};
}
