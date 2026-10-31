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
  const facts=[],seen=new Set();
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
        if(seen.has(key))continue;
        seen.add(key);
        facts.push({
          title:'Myymäläsaatavuus: '+title+' – '+place,
          category:'Myymäläsaatavuus',
          answer:availability==='instock'?'Sivuston mukaan varastossa.':'Sivuston mukaan ei varastossa.',
          keywords:['myymäläsaatavuus',place,title,'stock','availability'],
          sourceUrl:productUrl
        });
      }
    }
  }
  return facts.slice(0,300);
}
export function storeAvailabilityAnswer(rows,message,history=[],lang='fi'){
  let q=norm(message);
  const stockQuery=/\b(?:saatav|saatavuus|varasto|varastossa|myymala|myymalasaatavuus|stock|in stock|availability|available|lager|lagerstatus)\b/.test(q) ||
    /\b(?:saatavilla|saatavuudesta|varastossa|stock|available)\b/.test(q);
  const previous=Array.isArray(history)?history.at(-1):null;
  const continuation=/(?:minka myymalan|which store|vilken butik)/.test(norm(previous?.answer)) && previous?.question;
  if(!stockQuery&&!continuation)return null;
  const request=continuation && q.split(' ').length<=3 ? norm(previous.question)+' '+q : q;
  const candidates=(rows||[]).filter(r=>r.category==='Myymäläsaatavuus'&&/^Myymäläsaatavuus: .+ – .+/.test(String(r.title||'')));
  const matching=candidates.map(row=>{
    const m=row.title.match(/^Myymäläsaatavuus: (.+) – (.+)$/);
    if(!m)return null;
    const product=norm(m[1]),store=norm(m[2]);
    const relevantProduct=request.includes(product);
    const relevantStore=request.includes(store)||store==='turku'&&request.includes('turun')||store==='raisio'&&request.includes('raision');
    return relevantProduct?{row,store:m[2],product:m[1],relevantStore}:null;
  }).filter(Boolean);
  if(!matching.length)return null;
  const chosen=matching.filter(x=>x.relevantStore);
  if(chosen.length!==1){
    if(chosen.length>1)return null;
    const names=[...new Set(matching.map(x=>x.store))].slice(0,1000);
    if(names.length===1)return null; // Ask for explicit location instead of assuming.
    return {
      answer:lang==='en'?'Which store should I check?':lang==='sv'?'Vilken butik vill du kontrollera?':'Minkä myymälän saatavuuden haluat tarkistaa?',
      handoff:false,confidence:1,intent:'Myymäläsaatavuus',sourceIds:[],selected:[],branchChoices:names
    };
  }
  const hit=chosen[0],stock=hit.row.answer.toLowerCase().includes('ei varastossa')?false:true;
  const answer=lang==='en'?hit.product+' at '+hit.store+': '+(stock?'listed as in stock':'listed as out of stock')+' on the website. This is not a real-time stock check.':
    lang==='sv'?hit.product+' i '+hit.store+': '+(stock?'anges finnas i lager':'anges vara slut i lager')+' på webbplatsen. Detta är inte en kontroll i realtid.':
      hit.product+' – '+hit.store+': '+(stock?'sivuston mukaan varastossa':'sivuston mukaan ei varastossa')+'. Tämä ei ole reaaliaikainen varastosaldotarkistus.';
  return {answer,handoff:false,confidence:0.9,intent:'Myymäläsaatavuus',
    sourceIds:[hit.row.id].filter(Boolean),selected:[hit.row]};
}
