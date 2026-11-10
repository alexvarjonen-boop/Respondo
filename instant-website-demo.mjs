// Plain-language, non-persistent website snapshot. Data comes only from the
// public homepage HTML, with the fetch pinned and SSRF-protected by server.mjs.
const text=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/&(?:amp|#38);/gi,'&')
  .replace(/&(?:quot|#34);/gi,'"').replace(/&(?:lt|#60);/gi,'<')
  .replace(/&(?:gt|#62);/gi,'>').replace(/\s+/g,' ').trim();
export function summarizeInstantDemoHtml(html='',url=''){
  const h=String(html||'').slice(0,160000)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ');
  const title=text(h.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]).slice(0,140);
  const heading=text(h.match(/<h1(?:\s[^>]*)?>([\s\S]*?)<\/h1>/i)?.[1]).slice(0,180);
  const tag=(h.match(/<meta\s+[^>]*name\s*=\s*["']description["'][^>]*>/i)?.[0]||'');
  const description=text(tag.match(/content\s*=\s*["']([^"']+)["']/i)?.[1]).slice(0,500);
  const finalUrl=new URL(url);
  return {website:finalUrl.origin,finalUrl:finalUrl.href,
    title:title||heading||finalUrl.hostname,
    heading:heading||title||finalUrl.hostname,
    description:description||null,
    source:'public-homepage',
    verifiedFactsOnly:true,
    fullWebsiteImported:false,
    limitations:'This sample is based only on public page title, heading and meta description. Prices, hours and bookings are not verified.'};
}
