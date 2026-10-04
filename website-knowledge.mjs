// Conservative, dependency-free business fact extraction. Page headings supply
// context only; they are never stored as answers. No remote code is executed.
const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const review = /arvostel|asiakaskokem|asiakaspalaut|testimonial|review|rating|omdomen|recension|kundberatt|aggregateRating/i;
const junk = /cookie|evaste|privacy|tietosuoja|integritet|copyright|all rights reserved|kayttoeh|terms of|skip to|toggle nav|add to cart|ostoskori|kirjaudu|log in|sign in|uutiskirje|newsletter|localstorage|queryselector|javascript|webpack|more to (?:enjoy|get|unlock|qualify for) free shipping|away from free shipping|unlock free shipping|(?:spend|add).{0,40}more.{0,40}free shipping/i;
const service = /palvel|tarjoamme|teemme|service|we (?:offer|provide)|tjanst|vi erbjuder|pesu|siivou|puhdist|maalaus|raivaus|leikkaus|huolto|asennu|korjau|kuljet|muutto|poisvienti/;
const hours = /auki|opening|hours|oppet|maanantai|tiistai|keskiviikko|torstai|perjantai|lauantai|sunnuntai|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mandag|tisdag|onsdag|torsdag|fredag|lordag|sondag|\b(?:ma|ti|ke|to|pe|la|su|mon|tue|wed|thu|fri|sat|sun|man|tis|ons|tor|fre|lor|son)(?:\b|–|-)/;
const clock = /\b\d{1,2}(?:[:.]\d{2})?\s*(?:–|-|—|to|till)\s*\d{1,2}(?:[:.]\d{2})?\b|\b\d{1,2}:\d{2}\b|\b(?:closed|suljettu|stangt|24\/7)\b/i;
const price = /(?:\d[\d\s.,]*\s*(?:€|eur\b|usd\b|sek\b|kr\b|\$|£)|[€$£]\s*\d)|(?:hinta|hinnoittelu|price|pris).*(?:sopim|tarjous|quote|offert|contact|yhtey|avtal)/i;
const delivery = /toimitus|toimitusaika|toimitamme|toimitetaan|seurant|lahetys|lähetys|shipping|delivery|shipment|tracking|track(?:ing)?\s+(?:code|number|order)|nouto|pickup|leverans|sparning|spårning|forsand|försänd/i;
const returns = /palaut|vaihto|hyvitys|return|refund|exchange|retur|aterbetal|återbetal|byte\b/i;
const warranty = /takuu|reklamaatio|warranty|guarantee|garanti|reklamation/i;
const payment = /maksutapa|maksaminen|maksuvaihtoeh|korttimaks|lasku\b|klarna|paypal|mobilepay|apple\s*pay|google\s*pay|payment|payment method|pay\s+(?:with|by)|betalning|betalningsmetod|faktura/i;
const email = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const phone = /(?:\+\d{1,3}[\s().-]*|\b0)\d(?:[\s().-]*\d){5,11}\b/;
const labels = {
  services:'Palvelut', pricing:'Hinnat', hours:'Aukioloajat', contact:'Yhteystiedot', quote:'Tarjouspyyntö',
  delivery:'Toimitus ja seuranta', returns:'Palautukset ja vaihdot', warranty:'Takuu', payment:'Maksaminen'
};
const keywords = {
  services:['palvelut','teette','services','tjänster'],
  pricing:['hinta','maksaa','price','pris'],
  hours:['auki','opening','hours','öppettider'],
  contact:['yhteystiedot','contact','kontakt'],
  quote:['tarjous','tarjouspyyntö','quote','offert'],
  delivery:['toimitus','toimitusaika','seuranta','seurantakoodi','lähetys','shipping','delivery','tracking','shipment','leverans','spårning'],
  returns:['palautus','palautukset','vaihto','hyvitys','return','returns','refund','exchange','retur','återbetalning'],
  warranty:['takuu','reklamaatio','warranty','guarantee','garanti','reklamation'],
  payment:['maksutapa','maksaminen','kortti','lasku','klarna','paypal','mobilepay','payment','betalning']
};

export function decodeHtml(s) {
  const named = {amp:'&', quot:'"', apos:"'", nbsp:' ', lt:'<', gt:'>', auml:'ä', ouml:'ö', aring:'å', Auml:'Ä', Ouml:'Ö', Aring:'Å', euro:'€', ndash:'–', mdash:'—'};
  return String(s || '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, v) => {
    if (v[0] !== '#') return named[v] ?? m;
    const n = v[1].toLowerCase() === 'x' ? parseInt(v.slice(2),16) : Number(v.slice(1));
    return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : ' ';
  });
}
function attrs(tag) {
  const a = {};
  for (const m of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) a[m[1].toLowerCase()] = decodeHtml(m[2] ?? m[3] ?? m[4]);
  return a;
}
function httpUrl(raw, base) {
  try { const u = new URL(raw, base); return /^https?:$/.test(u.protocol) && !u.username && !u.password ? u.href : ''; } catch { return ''; }
}

function stripProductHtml(value) {
  return clean(decodeHtml(String(value || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ')));
}
function productNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const raw=String(value ?? '').trim().replace(/\s/g,'').replace(',', '.').replace(/[^0-9.-]/g,'');
  const number=Number(raw);
  return Number.isFinite(number) && number >= 0 ? number : null;
}
function productTypeIs(node, wanted) {
  const type=node?.['@type'];
  const values=Array.isArray(type)?type:[type];
  return values.some((value)=>norm(value)===norm(wanted));
}
function productBrand(value) {
  if (!value) return '';
  if (typeof value === 'string') return clean(value);
  return clean(value.name || value.brand || '');
}
function productAvailability(value) {
  const n=norm(String(value || '').split('/').pop());
  if (/instock|in stock|varastossa|available/.test(n)) return 'varastossa';
  if (/outofstock|out of stock|soldout|sold out|ei varastossa|unavailable/.test(n)) return 'ei varastossa';
  if (/preorder|pre-order|ennakkotila/.test(n)) return 'ennakkotilaus';
  return '';
}
function productOffers(value) {
  const out=[];
  const walk=(offer)=>{
    if (!offer) return;
    if (Array.isArray(offer)) { offer.forEach(walk); return; }
    if (typeof offer !== 'object') return;
    if (Array.isArray(offer.offers)) offer.offers.forEach(walk);
    const currency=clean(offer.priceCurrency || offer.currency || '');
    const price=productNumber(offer.price ?? offer.lowPrice ?? offer.minPrice ?? offer.priceSpecification?.price);
    const maxPrice=productNumber(offer.highPrice ?? offer.maxPrice ?? offer.priceSpecification?.maxPrice ?? offer.price);
    const url=clean(offer.url || '');
    const availability=productAvailability(offer.availability);
    if (price !== null || maxPrice !== null || url || availability) out.push({price,maxPrice,currency,url,availability});
  };
  walk(value);
  return out;
}
function productFromStructuredNode(node, pageUrl) {
  if (!node || typeof node !== 'object' || (!productTypeIs(node,'Product') && !productTypeIs(node,'ProductGroup'))) return null;
  const name=clean(node.name || node.headline || '');
  if (!name) return null;
  const offers=productOffers(node.offers);
  const prices=offers.flatMap((offer)=>[offer.price,offer.maxPrice]).filter((value)=>Number.isFinite(value));
  const price=prices.length?Math.min(...prices):null;
  const maxPrice=prices.length?Math.max(...prices):price;
  const currency=offers.find((offer)=>offer.currency)?.currency || clean(node.priceCurrency || '');
  const availability=offers.find((offer)=>offer.availability)?.availability || productAvailability(node.availability);
  const url=httpUrl(node.url || offers.find((offer)=>offer.url)?.url || pageUrl,pageUrl) || pageUrl;
  const description=stripProductHtml(node.description || '').slice(0,700);
  const category=clean(node.category || node.productCategory || node.additionalType || '').slice(0,120);
  const brand=productBrand(node.brand).slice(0,120);
  const sku=clean(node.sku || node.mpn || '').slice(0,120);
  return {name,url,price,maxPrice,currency,availability,description,category,brand,sku};
}
function structuredProductNodes(html) {
  const nodes=[];
  for (const match of String(html || '').matchAll(/<script\b[^>]*type\s*=\s*(?:"application\/ld\+json"|'application\/ld\+json'|application\/ld\+json)[^>]*>([\s\S]*?)<\/script\s*>/gi)) {
    const raw=String(match[1] || '').trim();
    if (!raw) continue;
    let data=null;
    try { data=JSON.parse(raw); } catch {
      try { data=JSON.parse(decodeHtml(raw)); } catch { data=null; }
    }
    const walk=(value)=>{
      if (!value) return;
      if (Array.isArray(value)) { value.forEach(walk); return; }
      if (typeof value !== 'object') return;
      nodes.push(value);
      if (Array.isArray(value['@graph'])) value['@graph'].forEach(walk);
      if (Array.isArray(value.hasVariant)) value.hasVariant.forEach(walk);
      if (value.mainEntity && typeof value.mainEntity === 'object') walk(value.mainEntity);
    };
    walk(data);
  }
  return nodes;
}
function productMeta(html, key) {
  const wanted=norm(key);
  for (const match of String(html || '').matchAll(/<meta\b[^>]*>/gi)) {
    const a=attrs(match[0]);
    if (norm(a.property || a.name || a.itemprop)===wanted) return clean(a.content || '');
  }
  return '';
}
export function extractProducts(html, pageUrl) {
  const products=[];
  for (const node of structuredProductNodes(html)) {
    const product=productFromStructuredNode(node,pageUrl);
    if (product) products.push(product);
  }
  if (!products.length) {
    const type=productMeta(html,'og:type');
    const title=productMeta(html,'og:title') || productMeta(html,'twitter:title');
    const amount=productNumber(productMeta(html,'product:price:amount') || productMeta(html,'og:price:amount'));
    const currency=productMeta(html,'product:price:currency') || productMeta(html,'og:price:currency');
    const productish=/product/i.test(type) || /\/(?:products?|tuotteet?|shop)\//i.test(new URL(pageUrl).pathname);
    if (productish && title && amount !== null) {
      products.push({
        name:title,
        url:httpUrl(productMeta(html,'og:url') || pageUrl,pageUrl) || pageUrl,
        price:amount,
        maxPrice:amount,
        currency,
        availability:productAvailability(productMeta(html,'product:availability')),
        description:stripProductHtml(productMeta(html,'og:description')).slice(0,700),
        category:'',brand:'',sku:'',
      });
    }
  }
  const seen=new Set();
  return products.filter((product)=>{
    const key=norm((product.url || '')+'|'+product.name);
    if (!key || seen.has(key)) return false;
    seen.add(key); return true;
  });
}
function productMoney(value) {
  if (!Number.isFinite(value)) return '';
  return Number(value).toFixed(2);
}
function productKeywords(product) {
  return [...new Set(clean([product.name,product.category,product.brand,'tuote product'].filter(Boolean).join(' '))
    .toLowerCase().split(/[^a-z0-9åäö]+/i).filter((word)=>word.length>=3))].slice(0,18);
}
function productKnowledgeAnswer(product) {
  const parts=['Tuote: '+product.name+'.'];
  if (Number.isFinite(product.price)) {
    const range=Number.isFinite(product.maxPrice) && product.maxPrice>product.price
      ? productMoney(product.price)+'–'+productMoney(product.maxPrice)
      : productMoney(product.price);
    parts.push('Hinta: '+range+(product.currency?' '+product.currency:'')+'.');
  }
  if (product.category) parts.push('Tuoteryhmä: '+product.category+'.');
  if (product.brand) parts.push('Brändi: '+product.brand+'.');
  if (product.availability) parts.push('Saatavuus: '+product.availability+'.');
  if (product.sku) parts.push('SKU: '+product.sku+'.');
  if (product.url) parts.push('Linkki: '+product.url+'.');
  if (product.description) parts.push('Kuvaus: '+product.description.slice(0,520));
  return clean(parts.join(' '));
}
export function parseProductKnowledgeRow(row) {
  const category=norm(row?.category || '');
  const answer=String(row?.answer || '');
  if (!/(?:^|\s)(?:tuotteet|tuote|products?|produkter)(?:\s|$)/.test(category+' '+norm(row?.title || '')) && !/^Tuote:\s*/i.test(answer)) return null;
  const name=clean(String(row?.title || '').replace(/^Tuote:\s*/i,'')) || clean(answer.match(/Tuote:\s*([^.]*)/i)?.[1] || '');
  if (!name) return null;
  const priceMatch=answer.match(/Hinta:\s*([0-9]+(?:[.,][0-9]+)?)(?:\s*[–-]\s*([0-9]+(?:[.,][0-9]+)?))?\s*([A-Z]{3}|€|\$|£)?/i);
  const price=priceMatch?productNumber(priceMatch[1]):null;
  const maxPrice=priceMatch&&priceMatch[2]?productNumber(priceMatch[2]):price;
  const currency=clean(priceMatch?.[3] || '').toUpperCase();
  const availability=clean(answer.match(/Saatavuus:\s*([^.]*)/i)?.[1] || '');
  const productType=clean(answer.match(/Tuoteryhmä:\s*([^.]*)/i)?.[1] || '');
  const brand=clean(answer.match(/Brändi:\s*([^.]*)/i)?.[1] || '');
  const description=clean(answer.match(/Kuvaus:\s*([\s\S]*)$/i)?.[1] || '').slice(0,700);
  const linkMatch=answer.match(/Linkki:\s*(https?:\/\/\S+)/i);
  const rawUrl=String(row?.source_url || row?.sourceUrl || linkMatch?.[1] || '').replace(/[.,;]+$/,'');
  const url=httpUrl(rawUrl);
  return {name,price,maxPrice,currency,availability,productType,brand,description,url,row};
}


export function extractBusinessDocument(html, url) {
  const products = extractProducts(html, url);
  const blocks = [], links = [];
  const stack = [];
  let buffer = '', heading = '', suppressedHeading = false;
  const flush = () => {
    const text = clean(decodeHtml(buffer)); buffer = '';
    if (text && !suppressedHeading) blocks.push({text, heading});
  };
  // Strip raw-text elements first, so code containing '<' cannot corrupt parsing.
  const source = String(html || '').replace(/<!--[^]*?-->/g,'').replace(/<(script|style|noscript|svg|template)\b[^>]*>[^]*?<\/\1\s*>/gi,'');
  for (const token of source.match(/<[^>]*>|[^<]+/g) || []) {
    if (token[0] !== '<') {
      if (stack.some(x => x.skip)) continue;
      const h = stack.findLast(x => /^h[1-6]$/.test(x.tag));
      const a = stack.findLast(x => x.tag === 'a');
      if (a) a.text += token;
      if (h) h.text += token;
      const cell = stack.findLast(x => x.tag === 'td' || x.tag === 'th');
      if (cell) cell.text += token;
      // Keep table rows intact: a detached price cell without its service name
      // must never become an independently retrievable business price.
      if (!stack.some(x => x.tag === 'tr') && !h && !stack.some(x => x.tag === 'nav')) buffer += token;
      continue;
    }
    const match = token.match(/^<\s*(\/?)\s*([a-z0-9]+)/i);
    if (!match) continue;
    const closing = !!match[1], tag = match[2].toLowerCase();
    const boundary = /^(?:p|div|section|article|li|tr|address|h[1-6]|nav|header|footer|aside|blockquote)$/.test(tag);
    if (boundary) flush();
    if (closing) {
      const i = stack.findLastIndex(x => x.tag === tag);
      if (i < 0) continue;
      const node = stack[i];
      if (/^h[1-6]$/.test(tag) && !node.skip) {
        heading = clean(decodeHtml(node.text));
        suppressedHeading = review.test(norm(heading)) || junk.test(norm(heading));
      }
      if ((tag === 'td' || tag === 'th') && !node.skip) {
        const row = stack.findLast(x => x.tag === 'tr');
        if (row) row.cells.push(clean(decodeHtml(node.text)));
      }
      if (tag === 'tr' && !node.skip && node.cells?.length > 1) {
        const cells = node.cells.filter(Boolean);
        if (cells.length > 1) blocks.push({text:cells.join(': '), heading});
      }
      if (tag === 'a' && !node.skip && node.href) links.push({url:node.href, label:clean(decodeHtml(node.text)), context:heading});
      stack.splice(i);
      if (tag === 'section' || tag === 'article') { heading = ''; suppressedHeading = false; }
      continue;
    }
    const a = attrs(token), marker = norm([a.class,a.id,a.role,a.itemprop,a['aria-label']].filter(Boolean).join(' '));
    // Links in navigation are useful destinations but navigation text is not a fact.
    const parentSkip = stack.some(x => x.skip);
    const skip = parentSkip || /^(head|title|button|select|option|blockquote|iframe)$/.test(tag) || review.test(marker) || junk.test(marker) || a['aria-hidden'] === 'true' || /display\s*:\s*none|visibility\s*:\s*hidden/i.test(a.style || '') || /\bhidden\b/i.test(token.replace(/"[^"]*"|'[^']*'/g,''));
    const href = tag === 'a' ? httpUrl(a.href, url) : '';
    if (tag === 'a' && a.href && !parentSkip && /^(?:mailto:|tel:)/i.test(a.href)) {
      blocks.push({text:decodeHtml(a.href.replace(/^(mailto:|tel:)/i,'').split('?')[0]), heading:'Yhteystiedot'});
    }
    if (tag === 'br') {
      const cell = stack.findLast(x => x.tag === 'td' || x.tag === 'th');
      if (cell) cell.text += ' ';
      else buffer += ' ';
    }
    if (!/^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/.test(tag) && !/\/\s*>$/.test(token)) stack.push({tag,skip,href,text:'',cells:tag === 'tr' ? [] : undefined});
  }
  flush();
  return {url, blocks, links, products, text:blocks.map(x=>x.text).join('\n')};
}

export function businessFactKind(text, context = '') {
  const t = clean(text), n = norm(t), c = norm(context);
  if (!t || t.length > 1600 || junk.test(n) || review.test(n) || /[★⭐]|\b\d(?:[.,]\d)?\s*\/\s*5\b/.test(t)) return '';
  if (/^(?:palvelut?|services?|tjanster|hinnat|hinnasto|pricing|prices|yhteystiedot|contact|aukioloajat|opening hours|pyyda tarjous|ota yhteytta|lue lisaa|read more|las mer|etusivu|home)$/i.test(n)) return '';
  const commerce=n+' '+c;
  const commerceFact=t.length>=10 && t.split(/\s+/).length>=2;
  // Store policies must stay separate from generic prices. A shipping sentence
  // such as "Delivery €5.90, tracking sent by email" is delivery knowledge,
  // not an orphan price row.
  if (commerceFact && delivery.test(commerce)) return 'delivery';
  if (commerceFact && returns.test(commerce)) return 'returns';
  if (commerceFact && warranty.test(commerce)) return 'warranty';
  if (commerceFact && payment.test(commerce)) return 'payment';
  if (price.test(t)) return 'pricing';
  if (hours.test(n+' '+c) && clock.test(n)) return 'hours';
  if (email.test(t) || phone.test(t) && (/^\+\d/.test(t) || /puhel|puh\b|tel|phone|contact|yhteys|kontakt/.test(n+' '+c))) return 'contact';
  if (/\b\d{5}\s+[A-ZÅÄÖa-zåäö]/.test(t) || /(?:osoite|address|adress)\s*:?\s*\S+.*\d/.test(n)) return 'contact';
  // Require real prose or a concrete service list, not an isolated marketing heading.
  if ((service.test(n) || service.test(c)) && t.length >= 18 && (/[.!;]/.test(t) || /[,•]/.test(t) || /tarjoamme|teemme|we offer|we provide|vi erbjuder/.test(n))) return 'services';
  return '';
}

export function essentialWebsiteCandidates(bundle) {
  const out = [], seen = new Set();
  const add = (kind,title,answer,sourceUrl) => {
    const text = clean(answer), key = kind+':'+norm(text);
    if (!text || seen.has(key)) return;
    seen.add(key);
    const uniqueTitle = ['services','pricing'].includes(kind) ? title + ': ' + text.slice(0,110) : title;
    out.push({category:labels[kind], title:uniqueTitle, answer:text, keywords:keywords[kind], sourceUrl});
  };
  const addProduct = (product, fallbackUrl = '') => {
    if (!product?.name) return;
    const sourceUrl=httpUrl(product.url || fallbackUrl,fallbackUrl || undefined);
    if (!sourceUrl) return;
    const key='product:'+norm(sourceUrl+'|'+product.name);
    if (seen.has(key)) return;
    seen.add(key);
    out.push({
      category:'Tuotteet',
      title:clean(product.name).slice(0,180),
      answer:productKnowledgeAnswer({...product,url:sourceUrl}).slice(0,1600),
      keywords:productKeywords(product),
      sourceUrl,
    });
  };

  for (const product of Array.isArray(bundle?.products) ? bundle.products : []) addProduct(product,bundle?.finalUrl || '');

  const quoteLinks = [];
  for (const doc of bundle?.pageDocuments || []) {
    if (/privacy|terms|tietosuoja|kayttoeh|arvostel|reviews|testimonial|blog|uutis|news/.test(norm(new URL(doc.url).pathname))) continue;
    const docProducts=Array.isArray(doc.products)?doc.products:[];
    for (const product of docProducts) addProduct(product,doc.url);
    const blocks = doc.blocks || String(doc.text || '').split('\n').map(text=>({text,heading:''}));
    for (const block of blocks) {
      const kind = businessFactKind(block.text,block.heading);
      if (!kind) continue;
      // Product pages are imported as complete product records. Do not create a
      // second detached "price" fact that has lost the product name/link.
      if (kind === 'pricing' && docProducts.length) continue;
      let title = labels[kind];
      if (kind === 'delivery') {
        // Classify the individual fact by its own sentence, not merely by a
        // shared section heading. In a "Toimitus ja seuranta" section the
        // delivery-time paragraph must not masquerade as tracking evidence.
        const factContext=norm(block.text);
        title=/seurant|tracking|sparning|spårning/.test(factContext)
          ? 'Tilausten seuranta'
          : /toimitusaika|delivery time|shipping time|leveranstid/.test(factContext)
            ? 'Toimitusaika'
            : 'Toimitus';
      }
      if (kind === 'returns') title = 'Palautukset ja vaihdot';
      if (kind === 'warranty') title = 'Takuu';
      if (kind === 'payment') title = 'Maksutavat';
      if (kind === 'contact') title = email.test(block.text) ? 'Sähköposti' : phone.test(block.text) ? 'Puhelinnumero' : 'Osoite';
      if (kind === 'contact' && email.test(block.text)) add(kind,'Sähköposti',block.text.match(email)[0],doc.url);
      if (kind === 'contact' && phone.test(block.text) && !/\b\d{5}\s+[A-Za-zÅÄÖåäö]/.test(block.text)) add(kind,'Puhelinnumero',block.text.match(phone)[0],doc.url);
      if (kind !== 'contact' || title === 'Osoite') {
        const concreteHeading = clean(block.heading);
        const hasContext = concreteHeading && concreteHeading.length < 65 && service.test(norm(concreteHeading)) && !/^(?:palvelut?|services?|tjanster|hinnat|hinnasto)$/i.test(norm(concreteHeading)) && !norm(block.text).includes(norm(concreteHeading));
        add(kind,title,hasContext && ['services','pricing'].includes(kind) ? concreteHeading + ': ' + block.text : block.text,doc.url);
      }
    }
    for (const link of doc.links || []) {
      const n = norm(link.label + ' ' + new URL(link.url).pathname);
      const explicit = /tarjous|quote|estimate|offert|prisforslag/.test(n);
      const contact = /yhtey|contact|kontakt/.test(n);
      if (explicit || contact) quoteLinks.push({...link,sourceUrl:doc.url,score:explicit?10:1});
    }
  }
  quoteLinks.sort((a,b)=>b.score-a.score);
  if (quoteLinks.length) add('quote','Tarjouspyyntölomake',quoteLinks[0].url,quoteLinks[0].sourceUrl);
  return out.slice(0,10000);
}
export function essentialWebsiteProfile(bundle) {
  const facts = essentialWebsiteCandidates(bundle);
  const byKind = (kind) => facts.filter(x=>x.category===labels[kind]).map(x=>x.answer).join('\n').slice(0,4000);
  const byTitle = (title) => facts.find(x=>x.title===title)?.answer || '';
  return {
    website:bundle.finalUrl || '',
    services:byKind('services'),
    pricing:byKind('pricing'),
    hours:byKind('hours'),
    delivery:byKind('delivery'),
    returns:byKind('returns'),
    warranty:byKind('warranty'),
    payment:byKind('payment'),
    phone:byTitle('Puhelinnumero'),
    email:byTitle('Sähköposti'),
    address:byTitle('Osoite'),
    quoteRequestUrl:byTitle('Tarjouspyyntölomake'),
    bookingUrl:'',
    serviceArea:'',
    notes:''
  };
}

export function usableWebsiteRow(row) {
  if (review.test(norm([row.category,row.title,row.answer].join(' ')))) return false;
  if (row.source_type !== 'website' && row.sourceType !== 'website') return true;
  if (row.title === 'Tarjouspyyntölomake') return !!httpUrl(row.answer);
  if (/(?:^|\s)(?:tuotteet|products?|produkter)(?:\s|$)/.test(norm(row.category || ''))) {
    const product=parseProductKnowledgeRow(row);
    return !!(product?.name && product?.url);
  }
  return !!businessFactKind(row.answer, row.category);
}
