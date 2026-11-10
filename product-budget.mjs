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
    :/\b(?:shoes?|sneakers?|trainers?|kenga\w*|kenka\w*|skor|sko)\b/.test(raw)?'shoe'
    :/\b(?:shirts?|clothing|clothes|jackets?|vaatt\w*|paita\w*|takki\w*|klader|kläder|jackor)\b/.test(raw)?'clothing'
    :/\b(?:tuot\w*|product\w*|produkt\w*|valikoima\w*|sortiment\w*|selection\w*|items?|products?)\b/.test(raw)?'product':'';
  if(!family)return null; // service-price questions belong to the service engine.
  const colorAliases={
    black:['black','musta','mustat','svart','svarta'],
    white:['white','valkoinen','valkoiset','vit','vita'],
    blue:['blue','sininen','siniset','bla','blå'],
    red:['red','punainen','punaiset','rod','röd'],
    green:['green','vihrea','vihreät','gron','grön'],
  };
  const color=Object.entries(colorAliases).find(([,aliases])=>
    aliases.some(alias=>new RegExp('\\b'+alias+'\\b','i').test(raw)))?.[0]||null;
  const sizeMatch=raw.match(/\b(?:size|koko|storlek)\s*(\d{1,3}(?:[.,]\d)?)\b/i);
  return {amount,currency,inclusive,family,color,size:sizeMatch?.[1]||null};
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
    const productText=String(product.name||'')+' '+String(product.productType||'');
    if(request.family==='shoe' && !/\b(?:shoes?|sneakers?|trainers?|kenga\w*|kenka\w*|skor|sko)\b/i.test(productText))return false;
    if(request.family==='clothing' && !/\b(?:shirts?|clothing|clothes|jackets?|vaatt\w*|paita\w*|takki\w*|klader|kläder|jackor)\b/i.test(productText))return false;
    if(request.color){
      const synonyms={
        black:/\b(?:black|musta|mustat|svart|svarta)\b/i,
        white:/\b(?:white|valkoinen|valkoiset|vit|vita)\b/i,
        blue:/\b(?:blue|sininen|siniset|bla|blå)\b/i,
        red:/\b(?:red|punainen|punaiset|rod|röd)\b/i,
        green:/\b(?:green|vihrea|vihreä|gron|grön)\b/i
      };
      const colors=[product.name,...(product.colors||[])].join(' ');
      if(!synonyms[request.color]?.test(colors))return false;
    }
    if(request.size){
      const sizes=[product.name,...(product.sizes||[])].join(' ');
      if(!new RegExp('\\b'+request.size.replace('.','\\.')+'\\b').test(sizes))return false;
    }
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
  const familyWord=lang==='en'?(request.family==='club'?'clubs':request.family==='putter'?'putters':request.family==='shoe'?'shoes':request.family==='clothing'?'clothing':'products')
    :lang==='sv'?(request.family==='club'?'klubbor':request.family==='putter'?'putters':request.family==='shoe'?'skor':request.family==='clothing'?'kläder':'produkter')
    :(request.family==='club'?'mailoja':request.family==='putter'?'puttereita':request.family==='shoe'?'kenkiä':request.family==='clothing'?'vaatteita':'tuotteita');
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
  // The visitor's spending limit is not a product-source fact. Refer to it
  // implicitly so the numeric contradiction guard only validates sourced prices.
  const answer=lang==='en'
    ? 'Yes. These '+familyWord+' in the approved catalog match your price limit: '+details+'.'
    :lang==='sv'
      ? 'Ja. Följande '+familyWord+' i de godkända produktuppgifterna passar din prisgräns: '+details+'.'
      : 'Kyllä. Nämä hyväksyttyjen tuotetietojen '+familyWord+' sopivat hintarajaasi: '+details+'.';
  return {answer,handoff:false,confidence:0.98,intent:'Tuotteet',
    sourceIds:chosen.map(product=>product.row?.id).filter(Boolean),
    selected:chosen.map(product=>product.row).filter(Boolean)};
}
