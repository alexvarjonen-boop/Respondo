// Marketing attribution is supplied only by explicit URL query parameters.
// This module does not set cookies, fingerprint visitors or send third-party data.
const safeParam=(value,max=40)=>String(value||'').trim().toLowerCase().replace(/[^a-z0-9_-]/g,'').slice(0,max);
const sourceKeys=['utm_source','utm_medium','utm_campaign'];
export function marketingAttributionQuery(search=''){
  const query=new URLSearchParams(search);
  const out=new URLSearchParams();
  for(const key of sourceKeys){
    const value=safeParam(query.get(key),key==='utm_campaign'?60:32);
    if(value)out.set(key,value);
  }
  return out.toString().replace(/&/g,'&amp;').replace(/^/,'');
}
export function marketingLeadVisitorRef(search='',demo=false){
  const query=new URLSearchParams(search),base=demo?'public-demo-request':'homepage-contact';
  const pieces=sourceKeys.map(key=>safeParam(query.get(key),key==='utm_campaign'?40:26));
  // A stable, bounded text field already exists in the leads table; no schema change.
  const info=pieces.some(Boolean)?'|'+pieces.map((v,i)=>sourceKeys[i].slice(4)+'='+v).join('|'):'';
  return (base+info).slice(0,160);
}
export function normalizeDemoWebsite(value){
  const raw=String(value||'').trim();
  if(!raw || raw.length>255 || /[\s\x00-\x1f]/.test(raw)) return '';
  const prefixed=/^https?:\/\//i.test(raw)?raw:'https://'+raw;
  try{
    const url=new URL(prefixed);
    if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.port) return '';
    const host=url.hostname.toLowerCase();
    if(!host.includes('.') || host==='localhost' || host.endsWith('.local') || host.endsWith('.internal')) return '';
    if(/^(?:\d+\.){3}\d+$/.test(host) || host.includes('..')) return '';
    if(!host.split('.').every(piece=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(piece))) return '';
    if(!/[a-z]{2,}$/.test(host.split('.').at(-1))) return '';
    return url.origin+url.pathname+(url.search||'');
  }catch{return '';}
}
export function buildDemoRequestMessage(lang,website,notes=''){
  const u=normalizeDemoWebsite(website);
  if(!u) return '';
  const message={
    fi:'Pyydän Respondo AI:n yrityskohtaista esittelyä.\nVerkkosivustomme: ',
    sv:'Jag vill ha en företagsanpassad demonstration av Respondo AI.\nVår webbplats: ',
    en:'I would like a website-specific Respondo AI demonstration.\nOur website: '
  }[lang]||'I would like a website-specific Respondo AI demonstration.\nOur website: ';
  const hint={fi:'\nLisätiedot: ',sv:'\nYtterligare information: ',en:'\nAdditional details: '}[lang]||'\nAdditional details: ';
  const details=String(notes||'').trim().slice(0,1000);
  return (message+u+(details?hint+details:'')).slice(0,2000);
}
