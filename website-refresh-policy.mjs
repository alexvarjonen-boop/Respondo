// Pure validation for scheduled tenant website reimports.
const forbidden=/cookie|ev[aä]ste|privacy|tietosuoja|terms of service|k[aä]ytt[oö]eh|all rights reserved|localstorage|sessionstorage|queryselector|addeventlistener/i;
export function autoRefreshEligible(now,lastAttempt,enabled,subscription,website){
  if(!enabled||!['active','trialing'].includes(subscription))return false;
  try{
    const u=new URL(website);
    if(!['https:','http:'].includes(u.protocol)||u.username||u.password)return false;
  }catch{return false;}
  if(lastAttempt){
    const last=new Date(lastAttempt).getTime();
    if(!Number.isFinite(last)||now-last<23*60*60*1000)return false;
  }
  return true;
}
export function acceptedRefreshCandidate(item,origin,usableRow){
  const title=String(item?.title||'').trim().slice(0,180);
  const answer=String(item?.answer||'').trim().slice(0,1600);
  const category=String(item?.category||'').trim().slice(0,80);
  const sourceUrl=String(item?.sourceUrl||'');
  try{
    const target=new URL(sourceUrl);
    const tenant=new URL(origin);
    if(target.hostname!==tenant.hostname||!['https:','http:'].includes(target.protocol))return null;
  }catch{return null;}
  if(!title||!answer||!category||forbidden.test(title+' '+answer.slice(0,900)+' '+category))return null;
  if(!usableRow({title,answer,category,source_type:'website',source_url:sourceUrl}))return null;
  return {title,answer,category,sourceUrl,keywords:Array.isArray(item.keywords)?
    item.keywords.map(x=>String(x||'').slice(0,65)).slice(0,18):[]};
}
