/*
 * Evidence-only multilingual FAQ intent matching.
 *
 * This file NEVER provides business facts, just a candidate alignment between
 * two approved business-authored FAQ headings. The answer engine must continue
 * to validate tenant ownership, provenance, safe content, conflicts, and
 * response language before returning the business's literal answer.
 *
 * Topic and facet matching are intentionally conservative: a generic
 * delivery FAQ cannot prove a specific price, shipping deadline or country.
 */
const normal = value=>String(value||'').normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu,' ').replace(/\s+/g,' ').trim();

const families = [
  {name:'gift-card',
   topic:/\b(?:lahjakort\w*|presentkort\w*|gift\s+cards?|gift\s+vouchers?|giftcard\w*|värdebevis\w*|vardebevis\w*)\b/,
   facets:[
     ['buy',/\b(?:ost\w*|myyt\w*|myyda\w*|purchase|buy|buying|sell|selling|salj\w*|sälj\w*|kopa|köpa)\b/],
     ['redeem',/\b(?:kaytta\w*|kayto\w*|kelpaa\w*|lunast\w*|use|using|redeem\w*|accept\w*|betal\w*|anvand\w*|använd\w*)\b/],
     ['expiry',/\b(?:voimass\w*|vanhen\w*|expires?|expiry|valid\w*|giltig\w*|utgang\w*)\b/]
   ]},
  {name:'wifi',
   topic:/\b(?:wi\s*fi|wifi|wlan|wireless\s+internet|internet\s+access|langato\w*\s+verk\w*|netti\w*|tradlost\s+nat\w*|internetuppkoppling)\b/,
   facets:[
     ['password',/\b(?:salasan\w*|password\w*|losenord\w*|lösenord\w*|code|koodi\w*)\b/],
     ['free',/\b(?:ilmain\w*|maksuto\w*|free|gratis|avgiftsfri\w*)\b/]
   ]},
  {name:'returns',
   topic:/\b(?:palaut\w*|palautusoike\w*|return\w*|refund\w*|retur\w*|angerratt\w*|ångerrätt\w*|rahojen\s+palaut\w*)\b/,
   facets:[
     ['duration',/\b(?:kuinka\s+kauan|montako\s+paiva\w*|how\s+long|how\s+many\s+days|days|paiva\w*|dagar|hur\s+lange|hur\s+länge|deadline|aikaa|time\s+limit)\b/],
     ['cost',/\b(?:hinta\w*|maks\w*|cost\w*|fee\w*|free|ilmain\w*|pris\w*|avgift\w*|gratis)\b/],
     ['method',/\b(?:miten|kuinka|how|hur|ohje\w*|instruction\w*|process\w*|menettely\w*)\b/]
   ]},
  {name:'warranty',
   topic:/\b(?:takuu\w*|takuun\w*|warrant\w*|guarantee\w*|garanti\w*)\b/,
   facets:[
     ['duration',/\b(?:kuinka\s+kauan|kauanko|pitka\w*|how\s+long|duration|years?|months?|vuott\w*|vuod\w*|kuukau\w*|ar|år|manad\w*|månad\w*|lenge|länge)\b/],
     ['coverage',/\b(?:katta\w*|sisalta\w*|cover\w*|include\w*|galler\w*|gäller\w*|omfatta\w*|excluded?|poissul\w*)\b/]
   ]},
  {name:'shipping',
   topic:/\b(?:toimitu\w*|lahety\w*|shipping|delivery|deliver\w*|frakt\w*|leverans\w*|postitus\w*)\b/,
   facets:[
     ['duration',/\b(?:kuinka\s+kauan|milloin|kauanko|time|long|days|paiva\w*|kest\w*|speed|fast|hur\s+lange|hur\s+länge|dagar|nar|när)\b/],
     ['cost',/\b(?:maks\w*|hinta\w*|ilmain\w*|free|cost\w*|price|fee\w*|avgift\w*|pris\w*|gratis)\b/],
     ['international',/\b(?:ulkomaa\w*|kansainval\w*|international\w*|abroad|outside|overseas|utomlands|internationell\w*)\b/],
     ['pickup',/\b(?:nouto\w*|noud\w*|pickup|pick\s*up|collect\w*|hamta\w*|hämta\w*|avhamt\w*)\b/]
   ]},
  {name:'cancellation',
   topic:/\b(?:peruu\w*|peruut\w*|cancel\w*|cancell\w*|avboka\w*|avbestall\w*|avbeställ\w*)\b/,
   facets:[
     ['booking',/\b(?:varau\w*|varaus\w*|ajanvarau\w*|appointment\w*|booking\w*|bokning\w*|tid\s+hos)\b/],
     ['order',/\b(?:tilau\w*|tilaus\w*|order\w*|bestall\w*|beställ\w*)\b/],
     ['cost',/\b(?:maks\w*|kustann\w*|fee\w*|cost\w*|charge\w*|avgift\w*|pris\w*)\b/]
   ]},
  {name:'payment-methods',
   topic:/\b(?:maksutap\w*|maksuva\w*|payment\s+methods?|payment\s+options?|accepted\s+payments?|betalsatt\w*|betalsätt\w*|betalningssatt\w*|betalningssätt\w*)\b/,
   facets:[]}
];
function facetsOf(text,family){
  const found=new Set();
  for(const [name,re] of family.facets)if(re.test(' '+text+' '))found.add(name);
  return found;
}
function explicitUnknownScope(text){
  return /\b(?:except|unless|only|paitsi|vain|ainoastaan|endast|enbart|utom)\b/.test(' '+text+' ');
}
export function faqTopicEvidence(question, approvedTitle) {
  const user=normal(question),title=normal(approvedTitle);
  if(!user||!title||user.length>450||title.length>220)return null;
  // Exception clauses may change the meaning; they require an exact
  // question rather than any synonym-based inference.
  if(explicitUnknownScope(user)||explicitUnknownScope(title))return null;
  for(const family of families){
    if(!family.topic.test(' '+user+' ')||!family.topic.test(' '+title+' '))continue;
    const wanted=facetsOf(user,family),known=facetsOf(title,family);
    // A different facet or unspecified facet cannot prove the request.
    if(wanted.size!==known.size||[...wanted].some(f=>!known.has(f)))continue;
    // Prevent single-word FAQ subjects from matching arbitrary long questions.
    if(title.length<6)continue;
    return {concept:family.name,score:0.84+(wanted.size?0.07:0)};
  }
  return null;
}

function polarityOf(value){
  const text=normal(value).slice(0,650);
  if(!text)return 'unknown';
  const negative=/(?:^|\b)(?:ei|emme|eivat|eivatkaan|no|nej|inte|not|never|cannot|cant|kielletty|forbidden|unavailable|not\s+allowed|not\s+permitted|not\s+accepted|ei\s+ole\s+sallittua)\b/;
  const positive=/(?:^|\b)(?:kylla|joo|yes|ja|javisst|allowed|permitted|accepted|welcome|sallittu|sallitaan|hyvaksytaan|onnistuu|available|tarjolla|finns|tillatet|tillåtet)\b/;
  if(negative.test(text))return 'no';
  if(positive.test(text))return 'yes';
  return 'unknown';
}
function numericFacts(text){
  return [...normal(text).matchAll(/\b\d+(?:[.,]\d+)?\b/g)].map(x=>x[0]).sort();
}
// Applied only to TWO equivalent, approved FAQ headings from the SAME tenant.
// A material disagreement must be escalated; reworded identical policy should
// not needlessly hand off. Return true if not proven consistent.
export function faqAnswersMateriallyConflict(first,second){
  const a=normal(first),b=normal(second);
  if(a===b||a.includes(b)&&b.length>=18||b.includes(a)&&a.length>=18)return false;
  const aNumbers=numericFacts(first),bNumbers=numericFacts(second);
  if(aNumbers.join('|')!==bNumbers.join('|'))return true;
  const pa=polarityOf(first),pb=polarityOf(second);
  if(pa!=='unknown'&&pa===pb){
    const qa=/\b(?:only|vain|endast|bara|except|paitsi|unless|utom)\b/.test(a);
    const qb=/\b(?:only|vain|endast|bara|except|paitsi|unless|utom)\b/.test(b);
    // "Yes" and "Yes, only service animals" are not equivalent.
    if(qa!==qb)return true;
    return false;
  }
  return true;
}
