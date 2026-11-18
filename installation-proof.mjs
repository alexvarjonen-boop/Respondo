// A read-only check of the HTML returned by the business's saved site.
// Static markup proves the installation snippet is present, not that a
// browser executed it or that a visitor completed a chat. Dynamic tag
// managers and iframe embeds may be invisible to this check.
const supportedHosts=new Set(['respondoai.fi','www.respondoai.fi']);
const decode=value=>String(value||'').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'");
function attribute(tag,name){
  const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const hit=tag.match(new RegExp('(?:^|\\s)'+escaped+'\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))','i'));
  return hit?decode(hit[1]??hit[2]??hit[3]):'';
}
export function inspectInstalledWidgetHtml(html,website,companySlug){
  let origin;
  try {origin=new URL(website);}catch{return {status:'inconclusive',reason:'invalid_website'};}
  const slug=String(companySlug||'').trim().toLowerCase();
  if(!slug)return {status:'inconclusive',reason:'invalid_company'};
  let sawWidget=false,otherCompany=false;
  // Comments, inert templates and noscript examples are not live script tags.
  const markup=String(html||'').replace(/<!--[\s\S]*?-->/g,' ')
    .replace(/<template\b[^>]*>[\s\S]*?<\/template\s*>/gi,' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript\s*>/gi,' ');
  for(const tag of markup.match(/<script\b[^>]*>/gi)||[]){
    let url;
    try{url=new URL(attribute(tag,'src'),origin);}catch{continue;}
    if(!supportedHosts.has(url.hostname.toLowerCase())||url.pathname!=='/widget.js')continue;
    sawWidget=true;
    if(attribute(tag,'data-company').toLowerCase()===slug)
      return {status:'snippet_detected',reason:'matching_company'};
    otherCompany=true;
  }
  return sawWidget&&otherCompany
    ?{status:'wrong_company',reason:'widget_company_mismatch'}
    :{status:'not_detected',reason:'not_in_server_html'};
}
export function sameInstalledSiteHost(savedUrl,finalUrl){
  try{
    const host=s=>new URL(s).hostname.toLowerCase().replace(/^www\./,'');
    return host(savedUrl)===host(finalUrl);
  }catch{return false;}
}
