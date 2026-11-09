// Deterministic, source-locked retail price-ceiling questions.
// Prices and card destinations are selected only from approved tenant products.

export function isPhysicalClubProduct(product={}) {
  const text=String((product.name||'')+' '+(product.productType||'')).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  // A brand such as "JAG Putters" can appear on a gift card or headcover.
  if (/\b(?:gift\s*cards?|giftcards?|presentkort\w*|lahjakort\w*|head\s*covers?|headcovers?|mailansuoj\w*|grips?|towels?|pyyh\w*|handduk\w*|accessor\w*|tarvik\w*|pallot|balls?|bags?|bagit|cover)\b/i.test(text)) return false;
  return /\b(?:putter\w*|golf\s*clubs?|golfmail\w*|maila\w*|mailo\w*|clubs?|klubbor|golfklubb\w*|driver\w*|wedges?|irons?|hybrids?|fairway\s*woods?|hockey\s*sticks?|racquets?|rackets?)\b/i.test(text);
}

export function productBudgetRequest(message='') {
  const raw=String(message||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\u00a0/g,' ');
  const m=raw.match(/\b(alle|under|below|less\s+than|cheaper\s+than|billigare\s+an|enintaan|korkeintaan|up\s+to|at\s+most|hogst|max(?:imum)?)\s*(€|\$|£)?\s*(\d{1,6}(?:[.,]\d{1,2})?)\s*(€|eur(?:o|oa|os)?|\$|usd|dollars?|£|gbp|sek|kr)?/i);
  if(!m)return null;
  const amount=Number(m[3].replace(',','.'));
  if(!Number.isFinite(amount)||amount<=0)return null;
  const unit=(m[4]||m[2]||'').toLowerCase();
  const currency= /^(?:€|eur)/.test(unit)?'EUR':/^(?:\$|usd|dollar)/.test(unit)?'USD':/^(?:£|gbp)/.test(unit)?'GBP':/^(?:sek|kr)/.test(unit)?'SEK':'';
  const inclusive=!/^(?:alle|under|below|less|cheaper|billigare)/.test(m[1]);
  const family=/\bputter\w*\b/.test(raw)?'putter'
    :/\b(?:maila\w*|mailo\w*|golfmail\w*|clubs?|golfklubb\w*|klubbor)\b/.test(raw)?'club'
    :/\b(?:tuot\w*|product\w*|produkt\w*|valikoima\w*|sortiment\w*|selection\w*|items?|products?)\b/.test(raw)?'product':'';
  if(!family)return null; // service-price questions belong to the service engine.
  return {amount,currency,inclusive,family};
}

export function groundedBudgetProductAnswer(products,message,lang='fi') {
  const request=productBudgetRequest(message);
  if(!request)return null;
  const pool=(Array.isArray(products)?products:[]).filter((product)=>{
    if(!product?.name)return false;
    if(request.family==='putter'){
      if(!isPhysicalClubProduct(product))return false;
      const t=(String(product.name||'')+' '+String(product.productType||'')).toLowerCase();
      if(!/\bputter\w*\b/.test(t))return false;
    }
    if(request.family==='club' && !isPhysicalClubProduct(product))return false;
    if(!Number.isFinite(product.price)||product.price<0)return false;
    if(request.currency && String(product.currency||'').toUpperCase()!==request.currency)return false;
    return request.inclusive ? product.price<=request.amount : product.price<request.amount;
  }).sort((a,b)=>a.price-b.price || String(a.name).localeCompare(String(b.name)));
  const locale=lang==='sv'?'sv-SE':lang==='en'?'en-US':'fi-FI';
  const fmt=(value,code)=>{
    if(!/^[A-Z]{3}$/.test(code||''))return new Intl.NumberFormat(locale,{maximumFractionDigits:2}).format(value);
    return new Intl.NumberFormat(locale,{style:'currency',currency:code}).format(value);
  };
  const amount=fmt(request.amount,request.currency);
  const familyWord=lang==='en'?(request.family==='club'?'clubs':request.family==='putter'?'putters':'products')
    :lang==='sv'?(request.family==='club'?'klubbor':request.family==='putter'?'putters':'produkter')
    :(request.family==='club'?'mailoja':request.family==='putter'?'puttereita':'tuotteita');
  const bound=lang==='en'?(request.inclusive?'at or below ':'under '):lang==='sv'?(request.inclusive?'högst ':'under '):(request.inclusive?'enintään ':'alle ');
  if(!pool.length){
    const answer=lang==='en'
      ? 'I could not verify any '+familyWord+' priced '+bound+amount+' from this store’s approved product data. Check the current selection in the store.'
      :lang==='sv'
        ? 'Jag kunde inte bekräfta några '+familyWord+' för '+bound+amount+' i butikens godkända produktuppgifter. Kontrollera det aktuella sortimentet i webbutiken.'
        : 'Hyväksytyistä tuotetiedoista ei löytynyt vahvistettuja '+familyWord+' hintaan '+bound+amount+'. Tarkista ajantasainen valikoima verkkokaupasta.';
    return {answer,handoff:false,confidence:0.35,intent:'Tuotteet',sourceIds:[],selected:[]};
  }
  const chosen=pool.slice(0,4);
  const details=chosen.map(product=>product.name+' ('+fmt(product.price,product.currency||'')+')').join(', ');
  const answer=lang==='en'
    ? 'Yes. The approved catalog lists '+familyWord+' '+bound+amount+': '+details+'.'
    :lang==='sv'
      ? 'Ja. I de godkända produktuppgifterna finns '+familyWord+' för '+bound+amount+': '+details+'.'
      : 'Kyllä. Hyväksytyistä tuotetiedoista löytyi '+familyWord+' hintaan '+bound+amount+': '+details+'.';
  return {answer,handoff:false,confidence:0.98,intent:'Tuotteet',
    sourceIds:chosen.map(product=>product.row?.id).filter(Boolean),
    selected:chosen.map(product=>product.row).filter(Boolean)};
}
