// Match customer-provided product links against THIS tenant's approved catalog.
// Never crawl arbitrary visitor URLs or infer product details from a URL.
export function extractCustomerProductUrl(message) {
  const candidates=String(message||'').match(/(?:https?:\/\/|www\.)[^\s<>"']+/gi)||[];
  for (const candidate of candidates.slice(0,4)) {
    const raw=candidate.replace(/[.,;:!?\]\)]+$/g,'');
    try {
      const url=new URL(/^www\./i.test(raw)?'https://'+raw:raw);
      if (!['https:','http:'].includes(url.protocol) || url.username || url.password || !url.hostname) continue;
      return url;
    } catch {}
  }
  return null;
}

export function canonicalCatalogProductPath(value) {
  try {
    const url=value instanceof URL?value:new URL(String(value||''));
    if (!['https:','http:'].includes(url.protocol) || url.username || url.password) return '';
    return url.hostname.toLowerCase().replace(/^www\./,'')+
      (url.port?':'+url.port:'')+
      (url.pathname.replace(/\/+$/,'')||'/');
  } catch { return ''; }
}

export function approvedProductLinkAnswer(rows,message,lang='fi',parseProduct) {
  const url=extractCustomerProductUrl(message);
  if (!url || typeof parseProduct!=='function') return null;
  const target=canonicalCatalogProductPath(url);
  for (const row of Array.isArray(rows)?rows:[]) {
    let product;
    try { product=parseProduct(row); } catch {continue;}
    if (!product?.name || !product.url || canonicalCatalogProductPath(product.url)!==target) continue;
    const answer=lang==='sv'
      ? 'Här är produkten från butikens godkända uppgifter. Kontrollera det aktuella priset på produktsidan.'
      : lang==='en'
        ? 'Here is the product from the store’s approved information. Check the latest price on the product page.'
        : 'Tässä on tuote verkkokaupan hyväksytyistä tiedoista. Tarkista ajantasainen hinta tuotesivulta.';
    return {answer,handoff:false,confidence:0.99,intent:'Tuotteet',sourceIds:[row?.id].filter(Boolean),selected:[row]};
  }
  // A normal website/document URL is not necessarily an ecommerce question.
  const question=String(message||'');
  const productCue=/\b(?:tuot\w*|product\w*|produkt\w*|ostaa|osta|buy|köpa|kopa)\b/i.test(question) ||
    /\/(?:products?|produkter|produkt|tuote|item|shop|p)\//i.test(url.pathname);
  if (!productCue) return null;
  const answer=lang==='sv'
    ? 'Jag hittar inte produkten i butikens godkända produktuppgifter. Jag kan därför inte bekräfta pris eller tillgänglighet.'
    : lang==='en'
      ? 'I cannot find that product in this store’s approved catalog, so I cannot verify its price or availability.'
      : 'En löydä tuotetta tämän verkkokaupan hyväksytystä tuoteluettelosta, joten en voi vahvistaa sen hintaa tai saatavuutta.';
  return {answer,handoff:false,confidence:0.35,intent:'Tuotelinkki',sourceIds:[],selected:[]};
}
