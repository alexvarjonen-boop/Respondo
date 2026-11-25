// Pure discovery helpers. Network access and DNS/SSRF validation remain in the
// existing pinned public HTTP fetcher. Only same-host HTTP(S) URLs are returned.
const TRACKING=/^(?:utm_[a-z0-9_]+|gclid|dclid|fbclid|msclkid|mc_cid|mc_eid|_ga|igshid|yclid|gbraid|wbraid)$/i;
const ASSET=/\.(?:pdf|jpe?g|png|gif|svg|webp|avif|ico|zip|docx?|xlsx?|pptx?|mp4|mp3|woff2?|ttf|css|m?js|json|xml|gz)$/i;
const ACTION=/\/(?:cart|checkout|basket|login|logout|register|wp-admin|wp-login\.php|account|my-account|search)(?:\/|$)/i;
const ACTION_QUERY=/^(?:add-to-cart|remove_item|wc-ajax|action|token|sessionid|session_id|password|redirect_to|return_to|s|q|search)$/i;
const fold=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function decode(s){
  return String(s||'').replace(/&(?:amp|quot|apos|lt|gt|#39|#x27|#x26|#38);/gi,x=>({'&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>','&#39;':"'",'&#x27;':"'",'&#x26;':'&','&#38;':'&'})[x.toLowerCase()]||x);
}
export function normalizedCrawlUrl(raw,baseUrl,{sitemap=false}={}){
  try{
    const base=new URL(baseUrl);
    const u=new URL(decode(raw).trim(),base);
    if(!/^https?:$/.test(u.protocol)||u.username||u.password||u.hostname.toLowerCase()!==base.hostname.toLowerCase()||u.port!==base.port)return '';
    if(!sitemap && (ASSET.test(u.pathname)||ACTION.test(u.pathname)||[...u.searchParams.keys()].some(k=>ACTION_QUERY.test(k))))return '';
    u.hash='';
    for(const k of [...u.searchParams.keys()])if(TRACKING.test(k))u.searchParams.delete(k);
    if(!sitemap && (u.search.length>320||[...u.searchParams.keys()].length>8))return '';
    return u.href;
  }catch{return '';}
}
export function crawlUrlKey(value,base=value){
  const safe=normalizedCrawlUrl(value,base);
  if(!safe)return '';
  const u=new URL(safe);
  return u.origin+u.pathname.replace(/\/+$/,'')+u.search;
}
export function customerPageScore(value){
  const p=fold(value);
  if(/(?:contact|yhteystied|yhteydenotto|ota-yhteytta|kontakt|kontakta|opening|aukiolo|oppettid|location|toimipiste|myymala|tavaratalo|branches|butiker)/.test(p))return 320;
  if(/(?:faq|ukk|usein.kys|vanliga.frag|help|support|asiakaspalvelu|kundservice|shipping|delivery|toimit|leverans|return|refund|palaut|retur|warranty|takuu|garanti|payment|maksu|betalning)/.test(p))return 300;
  if(/(?:price|pricing|hinn|pris|palvel|service|tjanst|tarjous|offert|quote|ajanvaraus|booking|appointment|boka)/.test(p))return 280;
  if(/(?:about|meista|yritys|company|om-oss)/.test(p))return 200;
  if(/(?:products?|tuotteet|produkter|collections?|kauppa|shop)/.test(p))return 130;
  if(/(?:blog|news|uutis|author|tag|category|demo|sample)/.test(p))return -50;
  return 0;
}
export function crawlPageLinks(html,baseUrl){
  const found=new Map();
  // Strip scripts and styles; anchors may have unquoted or mixed-case hrefs.
  const source=String(html||'').replace(/<!--[^]*?-->/g,'').replace(/<(script|style|template)\b[^>]*>[^]*?<\/\1\s*>/gi,'');
  for(const m of source.matchAll(/<a\b([^>]{0,4000})>([^]*?)<\/a\s*>/gi)){
    const href=m[1].match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'<>]+))/i);
    if(!href)continue;
    const url=normalizedCrawlUrl(href[1]??href[2]??href[3],baseUrl);
    if(!url)continue;
    const label=decode(m[2].replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim().slice(0,250);
    const score=Math.max(customerPageScore(new URL(url).pathname),customerPageScore(label));
    const key=crawlUrlKey(url,baseUrl);
    if(!found.has(key)||found.get(key).score<score)found.set(key,{url,score});
    if(found.size>=12000)break;
  }
  return [...found.values()].sort((a,b)=>b.score-a.score);
}
export function sitemapEntries(xml,baseUrl){
  const source=String(xml||'');
  const index=/<(?:[\w.-]+:)?sitemapindex\b/i.test(source);
  const tag=index?'sitemap':'url';
  const out=[];
  const pattern=new RegExp('<(?:[\\\\w.-]+:)?'+tag+'(?:\\\\s[^>]*)?>([\\\\s\\\\S]*?)<\\\\/(?:[\\\\w.-]+:)?'+tag+'\\\\s*>','gi');
  for(const m of source.matchAll(pattern)){
    const loc=m[1].match(/<(?:[\w.-]+:)?loc(?:\s[^>]*)?>\s*(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]+?))\s*<\/(?:[\w.-]+:)?loc\s*>/i);
    if(!loc)continue;
    const url=normalizedCrawlUrl(loc[1]??loc[2],baseUrl,{sitemap:index});
    if(url)out.push({url,index,score:customerPageScore(new URL(url).pathname)});
    if(out.length>=20000)break;
  }
  return out;
}
export function selectSitemapPages(entries,limit){
  const seen=new Set();
  return entries.filter(x=>!x.index).sort((a,b)=>b.score-a.score).filter(x=>{
    const key=crawlUrlKey(x.url);
    if(!key||seen.has(key))return false;seen.add(key);return true;
  }).slice(0,Math.max(0,limit)).map(x=>x.url);
}
