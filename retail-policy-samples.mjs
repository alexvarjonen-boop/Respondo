// Catalog-confirmed, same-origin product samples for importer policy checks.
// Do not accept arbitrary product links from the visitor, off-site URLs or
// payment / checkout destinations. The actual fetch still uses pinned DNS.
export function retailPolicySampleUrls(products,siteUrl,maxSamples=3){
  let base;
  try{base=new URL(String(siteUrl||''));}catch{return [];}
  if(!['http:','https:'].includes(base.protocol))return [];
  const urls=[],seen=new Set();
  const limit=Math.min(3,Math.max(0,Number(maxSamples)||0));
  for(const product of Array.isArray(products)?products.slice(0,1000):[]){
    if(urls.length>=limit)break;
    let u;
    try{u=new URL(String(product?.url||''));}catch{continue;}
    if(u.origin!==base.origin || u.username || u.password ||
       !/(?:^|\/)(?:products?|tuotteet?)\/[^/]+\/?$/i.test(u.pathname))continue;
    u.hash='';u.search='';
    const key=u.href.replace(/\/$/,'');
    if(seen.has(key))continue;
    seen.add(key);urls.push(u.href);
  }
  return urls;
}
