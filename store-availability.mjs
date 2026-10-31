// Location-scoped product availability from explicit merchant-published Offer
// records. Not a real-time inventory integration; answers disclose that.
const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
function sameSite(value,source){
  try{const a=new URL(value,source),b=new URL(source);return /^https?:$/.test(a.protocol)&&a.hostname===b.hostname?a.toString():'';}catch{return '';}
}
function structuredNodes(html){
  const out=[];
  for(const m of String(html||'').matchAll(/<script\b[^>]*type=["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi)){
    let d;try{d=JSON.parse(m[1]);}catch{continue;}
    const visit=(v,depth=0)=>{
      if(!v||depth>6||out.length>=300)return;
      if(Array.isArray(v)){v.slice(0,100).forEach(x=>visit(x,depth+1));return;}
      if(typeof v!=='object')return;
      out.push(v);
      if(v['@graph'])visit(v['@graph'],depth+1);
      if(v.hasVariant)visit(v.hasVariant,depth+1);
    };
    visit(d);
  }
  return out;
}
const t=x=>(Array.isArray(x)?x:[x]).map(v=>String(v||'').split('/').at(-1).toLowerCase());
export function extractStoreAvailability(html,url){
  const offersByStore=new Map();
  for(const product of structuredNodes(html)){
    if(!t(product['@type']).some(x=>x==='product'||x==='productgroup'))continue;
    const title=String(product.name||'').replace(/<[^>]*>/g,' ').trim().slice(0,140);
    if(title.length<4)continue;
    const productUrl=sameSite(product.url||url,url);
    if(!productUrl)continue;
    for(const offer of (Array.isArray(product.offers)?product.offers:[product.offers]).slice(0,100)){
      if(!offer||typeof offer!=='object')continue;
      const availability=norm(String(offer.availability||'').split('/').at(-1));
      if(!['instock','outofstock'].includes(availability))continue;
      for(const location of (Array.isArray(offer.availableAtOrFrom)?offer.availableAtOrFrom:[offer.availableAtOrFrom])){
        if(!location||typeof location!=='object')continue;
        const place=String(location.name||location.address?.addressLocality||'').trim().slice(0,65);
        if(!/^[\p{L}\p{N}\s-]{3,65}$/u.test(place))continue;
        const key=norm(title+'|'+place);
        // Never silently choose the first offer if the merchant's JSON-LD
        // publishes contradictory stock statuses for the same product/store.
        const previous=offersByStore.get(key);
        if(previous){
          if(previous.availability!==availability)previous.conflict=true;
          continue;
        }
        offersByStore.set(key,{
          availability,conflict:false,
          fact:{
            title:'Myymäläsaatavuus: '+title+' – '+place,
            category:'Myymäläsaatavuus',
            answer:availability==='instock'?'Sivuston mukaan varastossa.':'Sivuston mukaan ei varastossa.',
            keywords:['myymäläsaatavuus',place,title,'stock','availability'],
            sourceUrl:productUrl
          }
        });
      }
    }
  }
  return [...offersByStore.values()].filter(entry=>!entry.conflict).map(entry=>entry.fact).slice(0,300);
}
// Match user language inflections without confusing partial place/product names.
// Any ambiguous product or store match must be clarified, never guessed.
function mentionsPhrase(words,phrase){
  const terms=norm(phrase).split(' ').filter(Boolean);
  if(!terms.length)return false;
  const input=norm(words).split(' ').filter(Boolean);
  const match=(term,word)=>word===term ||
    (term.length>=5 && word.startsWith(term) && /^(?:n|a|ä|ia|ja|iin|issa|ista|illa|ilta|lle|it|eja|eita|en|et|in|un|ta|tä)$/.test(word.slice(term.length)));
  return input.some((_,index)=>terms.every((term,i)=>match(term,input[index+i]||'')));
}
function mentionsStore(message,name){
  const place=norm(name);
  const variants=new Set([place]);
  if(place==='turku'){
    for(const variant of ['turun','turussa','turusta','turkuun','abo'])variants.add(variant);
  }else if(place.endsWith('a')||place.endsWith('o')||place.endsWith('e')||place.endsWith('i')){
    for(const suffix of ['n','ssa','sta','an','on','en','in'])variants.add(place+suffix);
  }
  return [...variants].some(value=>(' '+norm(message)+' ').includes(' '+value+' '));
}
const stateOf=row=>{
  const value=norm(String(row?.answer||''));
  if(value==='sivuston mukaan varastossa')return true;
  if(value==='sivuston mukaan ei varastossa')return false;
  return null;
};
export function storeAvailabilityAnswer(rows,message,history=[],lang='fi'){
  const q=norm(message);
  const stockQuery=/\b(?:saatav|saatavuus|varasto|varastossa|myymala|myymalasaatavuus|stock|in stock|availability|available|lager|lagerstatus)\b/.test(q) ||
    /\b(?:saatavilla|saatavuudesta|varastossa|stock|available)\b/.test(q);
  const previous=Array.isArray(history)?history.at(-1):null;
  const continuation=/(?:minka myymalan|which store|vilken butik)/.test(norm(previous?.answer)) && previous?.question;
  if(!stockQuery&&!continuation)return null;
  const request=continuation && q.split(' ').length<=3 ? norm(previous.question)+' '+q : q;
  const candidates=(rows||[]).filter(r=>r.category==='Myymäläsaatavuus'&&
    /^Myymäläsaatavuus: .+ – .+/.test(String(r.title||'')));
  const matching=candidates.map(row=>{
    const m=String(row.title).match(/^Myymäläsaatavuus: (.+) – (.+)$/);
    if(!m)return null;
    const product=norm(m[1]);
    // Require at least one distinctive product token, not simply "a store".
    const terms=product.split(' ').filter(word=>word.length>=4);
    const relevantProduct=mentionsPhrase(request,product) || terms.some(term=>mentionsPhrase(request,term));
    const relevantStore=mentionsStore(request,m[2]);
    return relevantProduct?{row,store:m[2],product:m[1],relevantStore}:null;
  }).filter(Boolean);
  if(!matching.length)return null;
  const chosen=matching.filter(x=>x.relevantStore);
  const language=['fi','sv','en'].includes(lang)?lang:'fi';
  if(!chosen.length){
    const names=[...new Set(matching.map(x=>x.store))].slice(0,1000);
    return {
      answer:language==='en'?'Which store should I check?':language==='sv'?'Vilken butik vill du kontrollera?':'Minkä myymälän saatavuuden haluat tarkistaa?',
      handoff:false,confidence:1,intent:'Myymäläsaatavuus',sourceIds:[],selected:[],branchChoices:names
    };
  }
  const uniqueProducts=new Set(chosen.map(x=>norm(x.product)));
  const uniqueStores=new Set(chosen.map(x=>norm(x.store)));
  if(uniqueProducts.size!==1||uniqueStores.size!==1)return null;
  const states=new Set(chosen.map(x=>stateOf(x.row)));
  if(states.size!==1||states.has(null)){
    return {
      answer:language==='en'?'I could not verify stock availability for this product at this store.':
        language==='sv'?'Jag kunde inte bekräfta lagerstatus för den här produkten i butiken.':
          'En voinut varmistaa tämän tuotteen myymäläsaatavuutta.',
      handoff:true,confidence:0.1,intent:'Myymäläsaatavuus',sourceIds:[],selected:[]
    };
  }
  const hit=chosen[0],stock=[...states][0];
  const answer=language==='en'?hit.product+' at '+hit.store+': '+(stock?'listed as in stock':'listed as out of stock')+' on the website. This is not a real-time stock check.':
    language==='sv'?hit.product+' i '+hit.store+': '+(stock?'anges finnas i lager':'anges vara slut i lager')+' på webbplatsen. Detta är inte en kontroll i realtid.':
      hit.product+' – '+hit.store+': '+(stock?'sivuston mukaan varastossa':'sivuston mukaan ei varastossa')+'. Tämä ei ole reaaliaikainen varastosaldotarkistus.';
  return {answer,handoff:false,confidence:0.9,intent:'Myymäläsaatavuus',
    sourceIds:[...new Set(chosen.map(x=>x.row.id).filter(Boolean))],selected:chosen.map(x=>x.row)};
}
