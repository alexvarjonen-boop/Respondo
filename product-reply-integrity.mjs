import { productBudgetRequest } from './product-budget.mjs';

// Last-mile contract for retail answers, before any source-grounded text or
// product card can leave the bot. All trusted rows come from the current tenant.
const fold=(value)=>String(value??'').trim();
const idOf=(row)=>row?.id===null||row?.id===undefined?'':fold(row.id);
const isRowEquivalent=(current,selected)=>{
  if(current===selected)return true;
  if(idOf(current)!==idOf(selected))return false;
  return fold(current?.title)===fold(selected?.title) &&
    fold(current?.answer)===fold(selected?.answer) &&
    fold(current?.source_url||current?.sourceUrl)===fold(selected?.source_url||selected?.sourceUrl);
};

export function verifyRetailAnswer(result,rows=[],message='',lang='fi',parseProduct=null,requestedFamily=null,matchesFamily=null) {
  if(!result || result.handoff || result.intent!=='Tuotteet' || typeof parseProduct!=='function')return result;
  const selected=Array.isArray(result.selected)?result.selected:[];
  const request=productBudgetRequest(message);
  const family=typeof requestedFamily==='function'?requestedFamily(message):'';
  const known=Array.isArray(rows)?rows:[];
  const sourceIds=new Set((Array.isArray(result.sourceIds)?result.sourceIds:[]).map(String));
  const approvedImplicitSources=[];
  const failure=()=>{
    const answer=lang==='sv'
      ? 'Jag kan inte verifiera de här produkterna eller priserna mot butikens godkända uppgifter. Kontrollera aktuella produktuppgifter i butiken.'
      :lang==='en'
        ? 'I cannot verify these products or prices against the store’s approved information. Please check the current product details in the store.'
        : 'En pysty vahvistamaan näitä tuotteita tai hintoja verkkokaupan hyväksytyistä tiedoista. Tarkista ajantasaiset tuotetiedot verkkokaupasta.';
    return {...result,answer,handoff:false,confidence:0.2,sourceIds:[],selected:[],qualityFlag:'product_integrity_conflict'};
  };
  // The only price-bound affirmative without a card or approved citation would
  // be a guess. Negative/uncertain no-match replies are intentionally preserved.
  if(request && !selected.length && !sourceIds.size &&
     /^(?:kylla|kyllä|yes|ja\b|joo|löytyy|loytyy)/i.test(fold(result.answer)))return failure();
  if(!selected.length)return result;

  for(const row of selected){
    if(!row || row.approved===false)return failure();
    const canonical=known.find(candidate=>candidate && candidate.approved!==false && isRowEquivalent(candidate,row));
    if(!canonical)return failure();
    const id=idOf(canonical);
    // Existing explicit citations must agree with the selected cards. Some
    // legacy one-product catalog answers carry an approved selected row but
    // omit sourceIds; in that case promote the verified row to a citation.
    // This preserves a genuine single-product shop without relaxing checks.
    if(id && sourceIds.size && !sourceIds.has(id))return failure();
    let product=null;
    try{product=parseProduct(canonical);}catch{return failure();}
    if(id && !sourceIds.size && product)approvedImplicitSources.push(id);
    // A selected non-product FAQ may answer an ordinary catalog question,
    // but it cannot establish that a product meets a numerical price ceiling.
    if(!product){
      if(request || family)return failure();
      continue;
    }
    if(family && typeof matchesFamily==='function' && !matchesFamily(product,family))return failure();
    if(request){
      if(!Number.isFinite(product.price) || product.price<0)return failure();
      if(request.currency && fold(product.currency).toUpperCase()!==request.currency)return failure();
      if(request.inclusive ? product.price>request.amount : product.price>=request.amount)return failure();
    }
  }
  if(approvedImplicitSources.length){
    return {...result,sourceIds:[...new Set(approvedImplicitSources)]};
  }
  return result;
}
