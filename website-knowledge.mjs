// Conservative, dependency-free business fact extraction. Page headings supply
// context only; they are never stored as answers. No remote code is executed.
const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const clean = (s) => String(s || '')
  // Some CMS builders serialize line breaks into visible "\\n" text. Treat
  // those escape sequences as whitespace before anything can reach knowledge.
  .replace(/\\(?:r\\n|n|r|t)/gi, ' ')
  // Soft hyphens and zero-width formatting characters must never leak into
  // customer-facing text or split search tokens.
  .replace(/[\u00ad\u200b-\u200d\u2060\ufeff]/g, '')
  .replace(/\s+/g, ' ')
  .trim();
const review = /arvostel|asiakaskokem|asiakaspalaut|testimonial|review|rating|omdomen|recension|kundberatt|aggregateRating/i;
const junk = /cookie|evaste|privacy|tietosuoja|integritet|copyright|all rights reserved|kayttoeh|terms of|skip to|toggle nav|add to cart|ostoskori|kirjaudu|log in|sign in|uutiskirje|newsletter|localstorage|queryselector|javascript|webpack|ssr_script|headsection|pagefontsizestyle|extensionstorender|sidebarposition|current_url|data-version|@media|min-width|max-width|more to (?:enjoy|get|unlock|qualify for) free shipping|away from free shipping|unlock free shipping|(?:spend|add).{0,40}more.{0,40}free shipping|^(?:regular price|unit price|select option|choose option|product description|product description shipping (?:&|and) return)$/i;
const service = /palvel|tarjoamme|teemme|service|we (?:offer|provide)|tjanst|vi erbjuder|pesu|siivou|puhdist|maalaus|raivaus|leikkaus|huolto|asennu|korjau|kuljet|muutto|poisvienti|purku|kartoit|kierrat|murske|asbesti|haitta.?aine|saneeraus|linjasaneeraus/;
const hours = /auki|opening|hours|oppet|maanantai|tiistai|keskiviikko|torstai|perjantai|lauantai|sunnuntai|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mandag|tisdag|onsdag|torsdag|fredag|lordag|sondag|\b(?:ma|ti|ke|to|pe|la|su|mon|tue|wed|thu|fri|sat|sun|man|tis|ons|tor|fre|lor|son)(?:\b|–|-)/;
const clock = /\b\d{1,2}[:.]\d{2}\s*(?:–|-|—|to|till)\s*\d{1,2}(?:[:.]\d{2})?\b|\b\d{1,2}(?:[:.]\d{2})?\s*(?:–|-|—|to|till)\s*\d{1,2}[:.]\d{2}\b|\b\d{1,2}[:.]\d{2}\b|\b(?:closed|suljettu|stangt|24\/7)\b/i;
const price = /(?:\d[\d\s.,]*\s*(?:€|eur\b|usd\b|sek\b|kr\b|\$|£)|[€$£]\s*\d)|(?:hinta|hinnoittelu|price|pris).*(?:sopim|tarjous|quote|offert|contact|yhtey|avtal)/i;
const delivery = /toimitus|toimitusaika|toimitamme|toimitetaan|seurant|lahetys|lähetys|\bship(?:s|ped|ping)?\b|delivery|shipment|tracking|track(?:ing)?\s+(?:code|number|order)|nouto|pickup|leverans|sparning|spårning|forsand|försänd/i;
const returns = /\bpalaut(?:us\w*|taa\w*|an\w*|etaan\w*|ettava\w*|taminen\w*)\b|\bvaihto\b|\bvaihd(?:ot|on|ossa|oksi|ettava|etaan|taa)\b|\bhyvitys\w*\b|\breturns?\b|\brefund\w*\b|\bexchange\w*\b|\bretur\w*\b|\baterbetal\w*\b|\båterbetal\w*\b|\bbyte\b/i;
const warranty = /\b(?:takuu|takuun|takuuta|takuussa|takuusta|takuuseen|takuuaika\w*|takuuehto\w*|tuotetakuu\w*|reklamaatio\w*|warrant(?:y|ies)|guarantee\w*|garanti\w*|reklamation\w*)\b/i;
const payment = /maksutapa|maksaminen|maksuvaihtoeh|korttimaks|lasku\b|klarna|paypal|mobilepay|apple\s*pay|google\s*pay|payment|payment method|pay\s+(?:with|by)|betalning|betalningsmetod|faktura/i;

// Policy headings and marketing badges are context, not customer-answer facts.
// Keep short concrete rules ("Return within 45 days", "3 month warranty") and
// real payment-method lists, but reject slogans such as "Hassle Free Returns".
function policyHeadingOnly(value, kind = '') {
  const raw=clean(value);
  const n=norm(raw).replace(/[–—]/g,'-');
  if(!n) return true;
  // Theme benefit strips and accordion headings may contain policy keywords but
  // still do not state an actual customer rule.
  if(/(?:simple checkout|secure payment options?|save favorites?|track your orders)/i.test(raw)) return true;
  if(/^(?:shipping\s*(?:&|and)\s*return|product description\s+shipping\s*(?:&|and)\s*return|order processing and shipping information(?:\s+for\s*\S+|\s*for\S+)?)$/i.test(n)) return true;
  if(/\d/.test(n)) return false;
  if(kind==='payment' && /visa|mastercard|amex|american express|paypal|klarna|mobilepay|apple pay|google pay|kortti|card|lasku|invoice|faktura/.test(n)) return false;
  if(/\b(?:can|may|must|will|are|is|has|have|accept|accepted|receive|ship|shipped|return(?:ed|ing)?|refund(?:ed|s)?|exchange(?:d|s)?|voi|voidaan|saa|taytyy|täytyy|on|ovat|hyvitet|palautetaan|vaihdetaan|toimitetaan|lähetetään|lahetetaan|kan|får|far|måste|maste|är|ar|betalas|returneras|aterbetalas|återbetalas)\b/i.test(raw)) return false;
  if(/^(?:hassle[- ]?free returns?|easy returns?|free returns?|returns?\s*(?:&|and)\s*exchanges?|shipping\s*(?:&|and)\s*returns?|fast shipping|free shipping|secure payments?|safe payments?|warranty|guarantee|returns?|refunds?|shipping|delivery|payment|payments)$/i.test(n)) return true;
  const words=n.split(/\s+/).filter(Boolean);
  return words.length<=5 && !/[.!?]/.test(raw);
}
const materials = /materiaali|materiaalit|material|materials|made\s+(?:of|from)|valmistettu\s+(?:materiaalista|materiaalista|teräksestä|teraksesta|alumiinista|puusta)|stainless\s+steel|ruostumaton\s+teräs|ruostumaton\s+teras|alumiini|aluminum|aluminium|hiilikuitu|carbon\s*fib|puuvilla|cotton|polyester|nahka|leather|villa\b|wool\b|titaani|titanium/i;
const quality = /laatu|quality|quality control|valmistus|manufactur|made\s+in|handmade|käsinteht|kasinteht|cnc|precision|tolerance|testattu|tested|sertifio|certif|standard(?:i|it)?\b|durab|kestävy|kestavy|viimeistely|finish/i;
const care = /hoito-oh|käyttöoh|kayttooh|huolto-oh|pesuoh|care\s+instruction|product\s+care|maintenance\s+instruction|washing\s+instruction|cleaning\s+instruction|how\s+to\s+(?:clean|wash|care)|skötsel|skotsel|tvättråd|tvattrad/i;
const sizing = /kokotauluk|koko-opas|mitoitus|koot\b|sizes?\b|size\s+guide|sizing|fit\b|mitat\b|dimensions?\b|pituus|leveys|korkeus|halkaisija|paino\b|weight\b|length\b|width\b|height\b|storlek|mått\b|matt\b/i;
const location = /myymäl|myymala|showroom|noutopiste|pickup\s+point|store\s+location|our\s+store|butik|butiker|lagerbutik|sijaitsee|located\s+(?:at|in)|find\s+us|löydät\s+meidät|loydat\s+meidat|home\s+base\s+(?:is\s+)?(?:in|at)|based\s+(?:in|at)|headquartered\s+(?:in|at)|head\s+office\s+(?:in|at)|kotipaikka|toimipaikka|paakonttori|pääkonttori/i;
const customerQuestion = /^(?:mitä|mita|mikä|mika|miten|kuinka|voiko|saako|onko|missä|missa|milloin|paljonko|what|which|how|can|do|does|is|are|where|when|why|vad|vilken|hur|kan|har|är|ar|var|när|nar)\b/i;
const email = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const phone = /(?:\+\d{1,3}[\s().-]*|\b0)\d(?:[\s().-]*\d){5,11}\b/;
const billingAddressNoise = /verkkolask|laskutusosoite|laskutus\s*osoite|e-?lasku|e-?invoice|invoicing address|invoice address|billing address|ovt\b|operaattori|operator\b/i;
const labels = {
  services:'Palvelut', pricing:'Hinnat', hours:'Aukioloajat', contact:'Yhteystiedot', quote:'Tarjouspyyntö',
  delivery:'Toimitus ja seuranta', returns:'Palautukset ja vaihdot', warranty:'Takuu', payment:'Maksaminen',
  materials:'Materiaalit', quality:'Laatu ja valmistus', care:'Hoito-ohjeet', sizing:'Koot ja mitat',
  location:'Sijainti ja myymälät', faq:'Usein kysytyt', catalog:'Verkkokauppa'
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
  payment:['maksutapa','maksaminen','kortti','lasku','klarna','paypal','mobilepay','payment','betalning'],
  materials:['materiaali','materiaalit','material','materials'],
  quality:['laatu','valmistus','quality','manufacturing','made in'],
  care:['hoito-ohje','huolto-ohje','care','maintenance','washing'],
  sizing:['koko','koot','mitat','size','sizes','dimensions'],
  location:['sijainti','myymälä','osoite','location','store','butik'],
  faq:['usein kysytyt','faq','help','ohje'],
  catalog:['tuotteet','verkkokauppa','shop','products','catalog','collection']
};

export function decodeHtml(s) {
  const named = {
    amp:'&', quot:'"', apos:"'", nbsp:' ', lt:'<', gt:'>',
    auml:'ä', ouml:'ö', aring:'å', Auml:'Ä', Ouml:'Ö', Aring:'Å',
    euro:'€', ndash:'–', mdash:'—', shy:'', raquo:'»', laquo:'«',
    hellip:'…', middot:'·', copy:'©', reg:'®'
  };
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

export function isConcreteServiceLabel(value) {
  const raw=clean(decodeHtml(value)).replace(/[»›→]+\s*$/,'').trim();
  const n=norm(raw);
  if (!raw || raw.length<3 || raw.length>80) return false;
  const words=raw.split(/\s+/).filter(Boolean);
  if (words.length>7) return false;

  // Navigation CTAs, slogans, location links and blog/date links often contain
  // a service word (for example a company name containing "muuttopalvelu").
  // They are not service names and must not be listed as company offerings.
  if (/[.!?]/.test(raw)) return false;
  if (/^(?:palvelut?|services?|tjanster|tjänster|palvelut ja hinnat|services and prices|tjanster och priser|tjänster och priser|asiakaspalvelu|customer service|kundservice)$/i.test(n)) return false;
  if (/\b(?:tutustu|lue|katso|tilaa|varaa|pyyda|pyydä|ota\s+yhtey|contact|kontakt|sijainti|kartalla|location|map|hyppaa|hyppää|mukaan|ajankohtaista|uutis|news|blog|tietopank|etusivu|home)\b/.test(n)) return false;
  if (/\b(?:hyvasti|hyvästi|vastarinn|paras|mainioit|helppo|nopea|reippaasti|sujuvat|taydella|täydellä)\b/.test(n)) return false;
  if (/\b(?:oy|ab|ltd|inc|llc)\b/.test(n) && /sijaint|kart|location|map/.test(n)) return false;
  if (/\b\d{1,2}[.:]\d{2}\b|\b\d{1,2}\.\s*(?:tammi|helmi|maalis|huhti|touko|kesa|kesä|heina|heinä|elo|syys|loka|marras|joulu)/.test(n)) return false;

  // Require a concrete service noun/stem instead of accepting every marketing
  // phrase from a card that happens to mention "service".
  return /(?:palvelu|service|tjanst|tjänst|pesu|siivou|puhdist|maala|raivau|leikkaus|hiusten|haircut|harklipp|hårklipp|parturi|kampaamo|parran|beard|skagg|skägg|muotoil|styling|trimma|trimming|shave|ajo\b|skinfade|fade|varja|värjä|color|colour|farg|färg|wax|vaha|kynsi|nail|ripsi|lash|kulmakarv|eyebrow|huolto|asennu|korjau|kuljet|muut(?:to|ot|toa|toja|tojen)|varastointi|vuokraus|poisvienti|purku|kartoit|kierrat|kierrät|murske|asbesti|saneeraus|remont|rakennus|hiero|fysioter|hoito|koulutus|konsult|suunnittel|valokuva|catering|siirto|pakkaus)/.test(n);
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
function productTextValues(value, limit = 24) {
  const out=[];
  const add=(item)=>{
    if (item === null || item === undefined || item === '') return;
    if (Array.isArray(item)) { item.forEach(add); return; }
    if (typeof item === 'object') {
      if ('value' in item) add(item.value);
      else if ('name' in item) add(item.name);
      else if ('text' in item) add(item.text);
      return;
    }
    const text=clean(String(item));
    if (!text || text.length>120) return;
    if (!out.some((x)=>norm(x)===norm(text))) out.push(text);
  };
  add(value);
  return out.slice(0,limit);
}
function productOptionList(value) {
  const options=[];
  const add=(name,values)=>{
    const optionName=clean(String(name||'')).slice(0,80);
    const optionValues=productTextValues(values,30);
    if (!optionName || !optionValues.length) return;
    const existing=options.find((item)=>norm(item.name)===norm(optionName));
    if (existing) {
      for (const item of optionValues) if (!existing.values.some((x)=>norm(x)===norm(item))) existing.values.push(item);
      existing.values=existing.values.slice(0,30);
      return;
    }
    options.push({name:optionName,values:optionValues});
  };
  for (const item of Array.isArray(value)?value:(value?[value]:[])) {
    if (!item) continue;
    if (typeof item === 'object') add(item.name || item.label || item.option, item.values ?? item.value ?? item.terms);
  }
  return options.slice(0,12);
}
function structuredProductSpecs(node) {
  const specs=[];
  const add=(name,value)=>{
    const label=clean(String(name||'')).slice(0,80);
    const values=productTextValues(value,8);
    if (!label || !values.length) return;
    const text=values.join(', ').slice(0,180);
    if (!specs.some((item)=>norm(item.name)===norm(label) && norm(item.value)===norm(text))) specs.push({name:label,value:text});
  };
  for (const property of Array.isArray(node?.additionalProperty)?node.additionalProperty:[]) {
    if (property && typeof property === 'object') add(property.name || property.propertyID, property.value ?? property.valueReference ?? property.description);
  }
  add('Paino',node?.weight);
  add('Leveys',node?.width);
  add('Korkeus',node?.height);
  add('Syvyys',node?.depth);
  return specs.slice(0,18);
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
  const variants=Array.isArray(node.hasVariant)?node.hasVariant.filter((item)=>item&&typeof item==='object'):[];
  const offers=productOffers([node.offers,...variants.map((variant)=>variant.offers)]);
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
  const colors=productTextValues([node.color,...variants.map((variant)=>variant.color)],30);
  const sizes=productTextValues([node.size,...variants.map((variant)=>variant.size)],30);
  const materialsList=productTextValues([node.material,...variants.map((variant)=>variant.material)],20);
  const options=productOptionList(node.additionalProperty);
  if(colors.length && !options.some((option)=>/vari|color|colour|farg|färg/.test(norm(option.name)))) options.push({name:'Väri',values:colors});
  if(sizes.length && !options.some((option)=>/koko|size|storlek/.test(norm(option.name)))) options.push({name:'Koko',values:sizes});
  if(materialsList.length && !options.some((option)=>/materia|material/.test(norm(option.name)))) options.push({name:'Materiaali',values:materialsList});
  const specs=structuredProductSpecs(node);
  return {name,url,price,maxPrice,currency,availability,description,category,brand,sku,colors,sizes,materials:materialsList,options:options.slice(0,12),specs};
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
        category:'',brand:'',sku:'',colors:[],sizes:[],materials:[],options:[],specs:[],
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
  const optionText=(Array.isArray(product.options)?product.options:[])
    .flatMap((option)=>[option?.name,...(Array.isArray(option?.values)?option.values:[])]);
  const specText=(Array.isArray(product.specs)?product.specs:[])
    .flatMap((spec)=>[spec?.name,spec?.value]);
  return [...new Set(clean([
    product.name,product.category,product.brand,
    ...(product.colors||[]),...(product.sizes||[]),...(product.materials||[]),
    ...optionText,...specText,'tuote product'
  ].filter(Boolean).join(' '))
    .toLowerCase().split(/[^a-z0-9åäö]+/i).filter((word)=>word.length>=3))].slice(0,32);
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
  if (Array.isArray(product.colors) && product.colors.length) parts.push('Värit: '+product.colors.slice(0,30).join(', ')+'.');
  if (Array.isArray(product.sizes) && product.sizes.length) parts.push('Koot: '+product.sizes.slice(0,30).join(', ')+'.');
  if (Array.isArray(product.materials) && product.materials.length) parts.push('Materiaalit: '+product.materials.slice(0,20).join(', ')+'.');
  if (Array.isArray(product.options) && product.options.length) {
    const text=product.options.slice(0,12).map((option)=>clean(option?.name)+': '+(option?.values||[]).slice(0,20).join(', ')).filter(Boolean).join('; ');
    if (text) parts.push('Vaihtoehdot: '+text.slice(0,420)+'.');
  }
  if (Array.isArray(product.specs) && product.specs.length) {
    const text=product.specs.slice(0,18).map((spec)=>clean(spec?.name)+': '+clean(spec?.value)).filter(Boolean).join('; ');
    if (text) parts.push('Tuotetiedot: '+text.slice(0,420)+'.');
  }
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
  const list=(label)=>clean(answer.match(new RegExp(label+'\\s*:\\s*([^.]*)','i'))?.[1] || '')
    .split(',').map((item)=>clean(item)).filter(Boolean).slice(0,30);
  const colors=list('Värit');
  const sizes=list('Koot');
  const materialsList=list('Materiaalit');
  const optionsText=clean(answer.match(/Vaihtoehdot:\s*([^.]*)/i)?.[1] || '');
  const options=optionsText ? optionsText.split(';').map((part)=>{
    const [name,...rest]=part.split(':');
    return {name:clean(name),values:rest.join(':').split(',').map((x)=>clean(x)).filter(Boolean)};
  }).filter((item)=>item.name&&item.values.length).slice(0,12) : [];
  const specsText=clean(answer.match(/Tuotetiedot:\s*([^.]*)/i)?.[1] || '');
  const specs=specsText ? specsText.split(';').map((part)=>{
    const [name,...rest]=part.split(':');
    return {name:clean(name),value:clean(rest.join(':'))};
  }).filter((item)=>item.name&&item.value).slice(0,18) : [];
  const description=clean(answer.match(/Kuvaus:\s*([\s\S]*)$/i)?.[1] || '').slice(0,700);
  const linkMatch=answer.match(/Linkki:\s*(https?:\/\/\S+)/i);
  const rawUrl=String(row?.source_url || row?.sourceUrl || linkMatch?.[1] || '').replace(/[.,;]+$/,'');
  const url=httpUrl(rawUrl);
  return {name,price,maxPrice,currency,availability,productType,brand,colors,sizes,materials:materialsList,options,specs,description,url,row};
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

  // Some page builders put contact text inside buttons/widgets that are
  // intentionally excluded from ordinary content extraction. Recover literal
  // email addresses from the remaining HTML before those UI nodes are skipped.
  const sourceEmails=new Set();
  const decodedSource=decodeHtml(source);
  for(const match of decodedSource.matchAll(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,12}\b/gi)){
    const value=String(match[0]||'').trim();
    if(!value || placeholderContactValue(value) || /^(?:no-?reply|noreply)@/i.test(value)) continue;
    const around=decodedSource.slice(Math.max(0,(match.index||0)-420),(match.index||0)+value.length+420);
    if(manufacturerContactContext(around)) continue;
    const key=value.toLowerCase();
    if(sourceEmails.has(key)) continue;
    sourceEmails.add(key);
    blocks.push({text:value,heading:'Yhteystiedot'});
    if(sourceEmails.size>=12) break;
  }

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
      // Contact builders often render "email + street address" inline with no
      // whitespace between the closing mail/phone link and the next text node.
      // Flush the contact anchor so the following physical address is parsed as
      // its own fact instead of becoming e.g. "info@example.fiHallituskatu".
      if (tag === 'a' && !node.skip && (email.test(clean(decodeHtml(node.text))) || phone.test(clean(decodeHtml(node.text))))) flush();
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
      const contactHeading=clean(heading || 'Yhteystiedot');
      if(!manufacturerContactContext(contactHeading)){
        blocks.push({
          text:decodeHtml(a.href.replace(/^(mailto:|tel:)/i,'').split('?')[0]),
          heading:contactHeading || 'Yhteystiedot'
        });
      }
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
  if (billingAddressNoise.test(t)) return '';
  if (/^(?:palvelut?|services?|tjanster|hinnat|hinnasto|pricing|prices|yhteystiedot|contact|aukioloajat|opening hours|pyyda tarjous|ota yhteytta|lue lisaa|read more|las mer|etusivu|home)$/i.test(n)) return '';
  const commerce=n+' '+c;
  const commerceFact=t.length>=10 && t.split(/\s+/).length>=2;
  // Explicit section headings win over incidental words inside the sentence.
  // Example: "CNC-koneistetaan ja tarkastetaan ennen toimitusta" belongs to
  // quality/manufacturing, not shipping merely because it mentions delivery.
  if (commerceFact && /materia|material/.test(c) && materials.test(commerce)) return 'materials';
  if (commerceFact && /laatu|quality|valmist|manufactur/.test(c) && quality.test(commerce)) return 'quality';
  if (commerceFact && /hoito|care|maintenance|pesuoh|washing/.test(c) && care.test(commerce)) return 'care';
  if (commerceFact && /koko|size|sizing|mitat|dimension|storlek/.test(c) && sizing.test(commerce)) return 'sizing';
  // Policy facts are classified from the sentence itself first. A shared
  // heading such as "Shipping & Returns" must never turn a return sentence
  // into delivery (or vice versa). Only fall back to heading context when that
  // heading identifies exactly one policy topic.
  const giftCardCashRule=/(?:gift\s*card|lahjakort|presentkort)[\s\S]{0,180}(?:cannot|can't|can not|ei\s+voi|inte)[\s\S]{0,100}(?:exchange(?:d)?\s+for\s+cash|cash|kateis|käteis|kontant)/i.test(t);
  const returnPolicyEvidence=returns.test(n) && (
    returns.test(c) ||
    /\b(?:customer|asiakas|kund|product|item|purchase|order|tuote|ostos|tilaus|days?|paiva|paivaa|päivä|päivää|dag|dagar|refund|hyvitys|exchange|vaihto|unused|unopened|receipt|kuitti|returperiod|palautusoikeus|palautusaika)\w*/i.test(n)
  );
  if (commerceFact && !giftCardCashRule && returnPolicyEvidence && !policyHeadingOnly(t,'returns')) return 'returns';
  const warrantyPolicyEvidence=warranty.test(n) && (
    warranty.test(c) ||
    /\b(?:defect|defective|fault|faulty|virhe|viallinen|reklamaatio|material(?:s)?|workmanship|covered|coverage|valid|warranty\s+period|guarantee\s+period|takuu(?:aika|ehdot?|ehto|kattaa|voimassa)|month|months|year|years|kuukaus|vuosi|garanti(?:tid|villkor)|manad|månad|ar|år)\b/i.test(n)
  );
  if (commerceFact && warrantyPolicyEvidence && !policyHeadingOnly(t,'warranty')) return 'warranty';
  if (commerceFact && payment.test(n) && !policyHeadingOnly(t,'payment')) return 'payment';
  if (commerceFact && delivery.test(n) && !policyHeadingOnly(t,'delivery')) return 'delivery';
  if (commerceFact) {
    const contextualPolicies=[
      ['returns',returns],
      ['warranty',warranty],
      ['payment',payment],
      ['delivery',delivery],
    ].filter(([,pattern])=>pattern.test(c));
    if (contextualPolicies.length===1) {
      const kind=contextualPolicies[0][0];
      // A heading such as "Guarantee" must not turn ordinary marketing prose
      // ("guarantees a good vibe", "result guaranteed") into warranty knowledge.
      if (kind==='warranty' && !warranty.test(n) &&
          !/\b(?:defect|defective|material(?:s)?|workmanship|covered|coverage|valid|month|months|year|years|virhe|materiaali|valmistusvirhe|kuukaus|vuosi|fel|material|tillverkningsfel|manad|månad|ar|år)\b/i.test(t)) {
        // Ignore non-policy prose that only inherited warranty context.
      } else if (kind==='returns' && !returns.test(n) &&
          !/\b(?:\d+\s*(?:day|days|paiva|paivaa|päivä|päivää|dag|dagar)|unused|unopened|original condition|receipt|proof of purchase|return window|return period|palautusoikeus|palautusaika|kayttamaton|käyttämätön|avaamaton|kuitti|ostotosite|returratt|returrätt|returperiod|oanvand|oanvänd)\b/i.test(t)) {
        // Ignore membership/marketing prose that only inherited a Returns heading.
      } else if (!policyHeadingOnly(t,kind)) return kind;
    }
  }
  if (commerceFact && care.test(commerce)) return 'care';
  if (commerceFact && sizing.test(commerce) && (/\d/.test(t) || /koko|size|mitat|dimension|fit|paino|weight|pituus|length|leveys|width|korkeus|height/.test(n))) return 'sizing';
  if (commerceFact && materials.test(commerce)) return 'materials';
  if (commerceFact && quality.test(commerce) && (
    /valmist|manufactur|made\s+in|handmade|käsinteht|kasinteht|cnc|precision|testat|certif|sertifio|standard|durab|kestä|kesta|materia|steel|teräs|teras|alumi|carbon|puuvilla|cotton|nahka|leather/.test(n)
    || /laatu|quality/.test(c)
  )) return 'quality';
  if (price.test(t)) return 'pricing';
  const explicitHoursContext=/aukiolo|opening hours|business hours|oppettid|öppettid/.test(c);
  if (hours.test(n+' '+c) && (clock.test(n) || (explicitHoursContext && /\b\d{1,2}\s*(?:–|-|—|to|till)\s*\d{1,2}\b/.test(n)))) return 'hours';
  if (email.test(t) || phone.test(t) && (/^\+\d/.test(t) || /puhel|puh\b|tel|phone|contact|yhteys|kontakt/.test(n+' '+c))) return 'contact';
  if (!billingAddressNoise.test(t+' '+context) &&
      (/\b\d{5}\s+[A-ZÅÄÖa-zåäö]/.test(t) || /(?:osoite|address|adress)\s*:?\s*\S+.*\d/.test(n))) return 'location';
  if (!billingAddressNoise.test(t+' '+context) &&
      /\b[A-ZÅÄÖa-zåäö][A-ZÅÄÖa-zåäö .'-]{1,55}\s+\d+[A-Za-z]?\b/.test(t) &&
      /osoite|address|adress|yhteystiedot|contact|kontakt/.test(c)) return 'location';
  if (commerceFact && location.test(commerce)) return 'location';
  // FAQ and customer-info sections often contain useful facts that do not fit a
  // fixed category (gift cards, discount codes, customisation, pre-orders, etc.).
  // Keep the heading as retrieval context so isolated marketing copy is not imported.
  if (commerceFact && c.length>=4 && c.length<=180 && (
    /[?]$/.test(clean(context)) ||
    customerQuestion.test(c) ||
    /lahjakort|gift\s*card|alennuskood|discount\s*code|kampanjakood|promo\s*code|ennakkotila|pre-?order|tilaaminen|ordering|order\s+info|personointi|personalis|customi[sz]|räätälö|raatalo|alkuperä|alkupera|origin|turvallisuus|safety|vastuullisuus|sustainab|faq|usein kysytyt|asiakasohje|customer info/.test(c)
  )) return 'faq';
  // About/brand copy often mentions services without stating a usable
  // customer-facing fact. Reject that prose unless it explicitly says what the
  // company offers; keep the broader service logic everywhere else so concise
  // rows such as "Pesemme ikkunoita" remain valid evidence.
  const aboutContext=/^(?:meista|meistä|about|about us|about-us|our story|who we are|yritys|company)$/i.test(c);
  const explicitServiceOffering=/\b(?:tarjoamme|tarjoaa|teemme|palvelemme|saat meilta|saat meiltä|we offer|we provide|we perform|offers|provides|vi erbjuder|erbjuder|vi utfor|vi utför)\b/.test(n);
  if (aboutContext && !explicitServiceOffering) return '';
  if ((service.test(n) || service.test(c)) && t.length >= 18 && (/[.!;]/.test(t) || /[,•]/.test(t) || /tarjoamme|teemme|we offer|we provide|vi erbjuder/.test(n))) return 'services';
  return '';
}


function placeholderContactValue(value) {
  const n=norm(clean(value));
  return /(?:^|[\s@.])example\.(?:com|org|net)(?:$|\s)|hello@example|admin@example|test@example|your@email|yourmail|email@example/.test(n);
}

function templateDemoDocument(doc) {
  const text=norm([
    doc?.text,
    ...(Array.isArray(doc?.blocks)?doc.blocks.map((x)=>x?.text):[]),
    ...(Array.isArray(doc?.products)?doc.products.flatMap((x)=>[x?.name,x?.description]):[]),
  ].filter(Boolean).join(' '));
  if(!text) return false;
  return /lorem ipsum/.test(text) ||
    /128 winston st/.test(text) ||
    /new york,\s*ny\s*05120/.test(text) ||
    /brooklyn area/.test(text) ||
    /1\.800\.218\.20\.20/.test(text) ||
    /hello@example\.com/.test(text) ||
    /admin@example\.com/.test(text) ||
    /our primary goal is developing a secure and customizable theme framework/.test(text) ||
    /create websites using our templates as easy as 1-2-3/.test(text) ||
    /installation \+ logo change/.test(text) ||
    /wp plugins installation/.test(text) ||
    /ready to use website/.test(text) ||
    /themerex\.net\/support/.test(text);
}

function pricedServiceLabel(value) {
  const raw=clean(decodeHtml(value)).replace(/[»›→]+\s*$/,'').trim();
  const n=norm(raw);
  if(!raw || raw.length<3 || raw.length>90 || /[.!?]/.test(raw)) return false;
  if(/^(?:kaikki|hiukset|parta|muu palvelu|all|hair|beard|other services?)$/i.test(n)) return false;
  if(isConcreteServiceLabel(raw)) return true;
  if(/^(?:m\s*(?:cut|buzz\s*cut|beard|special\s*shave|color|special\s*color))(?:\s*(?:xl|junior|student))?(?:™)?$/i.test(raw)) return true;
  return /(?:hiust|hair|hår|har\b|parran|beard|skägg|skagg|skinfade|fade|värjä|varja|color|colour|färg|farg|muotoil|styling|shave|ajo\b|tatuoin|tattoo|kulmakarv|eyebrow|kasvokarv|facial hair|hieronta|massage|wax|vaha)/.test(n);
}

function templateDemoProduct(product) {
  const text=norm([product?.name,product?.description,product?.url].filter(Boolean).join(' '));
  if(!text) return true;
  if(/lorem ipsum|hello@example\.com|admin@example\.com|new york,\s*ny\s*05120|brooklyn area/.test(text)) return true;
  const name=norm(product?.name||'');
  if(/^(?:shop|store|products?|tuotteet)(?:\s*[-|–—:].*)?$/.test(name)) return true;
  if(/\b(?:products?|tuotteet)\s+(?:archives?|arkistot?|arsivleri|arşivleri)\b/.test(name)) return true;
  if(Number(product?.price)===0 && /shop|store|catalog|products?|tuotteet/.test(name)) return true;
  return false;
}


function extractedContactEmail(value) {
  const raw=clean(decodeHtml(value))
    .replace(/(\.(?:fi|se|no|dk|com|net|org|eu))(?=[A-ZÅÄÖ])/g,'$1 ');
  const match=raw.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,12}\b/i)?.[0] || '';
  return match && !placeholderContactValue(match) ? match : '';
}

function extractedContactPhone(value) {
  const raw=clean(decodeHtml(value));
  if(!raw || billingAddressNoise.test(raw)) return '';
  const match=raw.match(/(?:\+\d{1,3}[\s().-]*|\b0)\d(?:[\s().-]*\d){5,11}\b/)?.[0] || '';
  if(!match) return '';
  const digits=match.replace(/\D/g,'');
  if(digits.length<7 || digits.length>15) return '';
  return match.replace(/\s+/g,' ').trim();
}

function manufacturerContactContext(value) {
  const n=norm(clean(value));
  return /(?:valmistajan\s+tiedot|valmistaja|manufacturer(?:\s+(?:information|details|contact))?|hersteller|tillverkare|producent|producer|maahantuoja|importer|jakelija|distributor|eu\s+responsible\s+person|responsible\s+person|vastuuhenkilo|vastuuhenkilö)/i.test(n);
}

function physicalAddressFragments(value) {
  const raw=clean(decodeHtml(value));
  if(!raw || billingAddressNoise.test(raw)) return [];
  const addressRaw=raw
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.(?:fi|se|no|dk|com|net|org|eu)(?=[A-ZÅÄÖ]|\s|$)/gi,' ')
    .replace(/\s+/g,' ')
    .trim();
  const out=[];
  const add=(value)=>{
    const text=clean(value).replace(/^[,;:|–—-]+\s*|\s*[,;:|–—-]+$/g,'');
    if(!text || text.length>140 || out.some((x)=>norm(x)===norm(text))) return;
    out.push(text);
  };
  const full=addressRaw.match(/\b([A-ZÅÄÖa-zåäö][A-ZÅÄÖa-zåäö .'-]{1,55}(?:katu|tie|kuja|polku|väylä|vayla|raitti|ranta|kaari|aukio|tori|puisto|rinne|gatan|vägen|vagen|väg|vag|gränden|granden|street|road|avenue|lane|boulevard|drive)\s+\d+[A-Za-z]?(?:\s*[,|-]?\s*\d{5}\s+[A-ZÅÄÖa-zåäö][A-ZÅÄÖa-zåäö .'-]{1,55})?)\b/i);
  if(full) add(full[1]);
  const street=addressRaw.match(/\b([A-ZÅÄÖa-zåäö][A-ZÅÄÖa-zåäö .'-]{1,55}(?:katu|tie|kuja|polku|väylä|vayla|raitti|ranta|kaari|aukio|tori|puisto|rinne|gatan|vägen|vagen|väg|vag|gränden|granden|street|road|avenue|lane|boulevard|drive)\s+\d+[A-Za-z]?)\b/i);
  if(street) add(street[1]);
  const postal=addressRaw.match(/\b(\d{5}\s+[A-ZÅÄÖa-zåäö][A-ZÅÄÖa-zåäö .'-]{1,55})\b/);
  if(postal) add(postal[1]);
  return out;
}

export function essentialWebsiteCandidates(bundle) {
  const out = [], seen = new Set();
  const rawCatalogProducts=Array.isArray(bundle?.products)?bundle.products:[];
  const usableCatalogProducts=rawCatalogProducts.filter((product)=>!templateDemoProduct(product));
  const templateProductCount=rawCatalogProducts.length-usableCatalogProducts.length;
  const catalogLooksLikeTemplate=rawCatalogProducts.length>=3 && templateProductCount>=2 && templateProductCount>=usableCatalogProducts.length;
  const hasCatalogProducts=usableCatalogProducts.length>0;
  const add = (kind,title,answer,sourceUrl) => {
    const text = clean(answer), key = kind+':'+norm(text);
    if (!text || seen.has(key)) return;
    seen.add(key);
    const uniqueTitle = ['services','pricing'].includes(kind) ? title + ': ' + text.slice(0,110) : title;
    out.push({category:labels[kind], title:uniqueTitle, answer:text, keywords:keywords[kind], sourceUrl});
  };
  const addProduct = (product, fallbackUrl = '') => {
    if (!product?.name || templateDemoProduct(product)) return;
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

  for (const product of usableCatalogProducts) addProduct(product,bundle?.finalUrl || '');

  const quoteLinks = [];
  const catalogLinks = [];
  const serviceLinks = [];
  for (const doc of bundle?.pageDocuments || []) {
    if (templateDemoDocument(doc)) continue;
    const parsedDocUrl=new URL(doc.url);
    const rawDocPath=parsedDocUrl.pathname.toLowerCase();
    if (/\/(?:home[-_]?\d+|demo(?:[-_][^/]*)?|sample-page|sample|template(?:[-_][^/]*)?|author|feed)(?:\/|$)/i.test(rawDocPath)) continue;
    if (/\/(?:tag|product-tag|product-category|category)\//i.test(rawDocPath)) continue;
    const docPath=norm(parsedDocUrl.pathname);
    const companyInfoDoc=/about|about-us|meista|yritys|company|who-we-are|our-story/.test(docPath);
    if (/privacy|terms|tietosuoja|kayttoeh|arvostel|reviews|testimonial/.test(docPath)) continue;
    if (!companyInfoDoc && /blog|uutis|news/.test(docPath)) continue;
    const docProducts=Array.isArray(doc.products)?doc.products:[];
    for (const product of docProducts) addProduct(product,doc.url);
    const blocks = doc.blocks || String(doc.text || '').split('\n').map(text=>({text,heading:''}));
    const recoveredPriceIndexes=new Set();
    const zeroOnlyPrice=(value)=>/[0-9]/.test(String(value||'')) && /^[€$£\s0.,]+$/.test(clean(value));
    for(let index=0; index<blocks.length; index++){
      const priceText=clean(blocks[index]?.text);
      const detachedPrice=/^[€$£]?\s*\d[\d\s.,]*(?:\s*(?:€|eur|usd|sek|nok|dkk|kr|\$|£))?$/i.test(priceText);
      if(!detachedPrice || zeroOnlyPrice(priceText)) continue;

      const ownHeading=clean(blocks[index]?.heading);
      if(ownHeading && pricedServiceLabel(ownHeading)){
        add('services','Palvelut',ownHeading,doc.url);
        add('pricing','Hinnat',ownHeading+': '+priceText,doc.url);
        recoveredPriceIndexes.add(index);
        continue;
      }

      for(let previous=index-1; previous>=Math.max(0,index-3); previous--){
        const label=clean(blocks[previous]?.text);
        if(!label) continue;
        if(/^[€$£]?\s*\d/.test(label)) continue;
        if(!pricedServiceLabel(label)) break;
        add('services','Palvelut',label,doc.url);
        add('pricing','Hinnat',label+': '+priceText,doc.url);
        recoveredPriceIndexes.add(index);
        break;
      }
    }
    for (let blockIndex=0; blockIndex<blocks.length; blockIndex++) {
      const block=blocks[blockIndex];
      const manufacturerContext=manufacturerContactContext(block.heading) || manufacturerContactContext(block.text);
      const directEmail=manufacturerContext ? '' : extractedContactEmail(block.text);
      if(directEmail) add('contact','Sähköposti',directEmail,doc.url);
      const directPhone=manufacturerContext ? '' : extractedContactPhone(block.text);
      if(directPhone) add('contact','Puhelinnumero',directPhone,doc.url);
      if(!manufacturerContext) {
        for(const address of physicalAddressFragments(block.text)) add('location','Osoite',address,doc.url);
      }

      const kind = businessFactKind(block.text,block.heading);
      if (!kind) continue;
      if(manufacturerContext && (kind==='contact' || kind==='location')) continue;
      if(kind==='pricing' && recoveredPriceIndexes.has(blockIndex)) continue;
      // Product pages are imported as complete product records. Do not create a
      // second detached "price" fact that has lost the product name/link.
      if (kind === 'pricing' && docProducts.length) continue;
      const detachedNumericPrice=/^[€$£]?\s*\d[\d\s.,]*(?:\s*(?:€|eur|usd|sek|kr|\$|£))?$/i.test(clean(block.text));
      if (kind === 'pricing' && zeroOnlyPrice(block.text)) continue;
      if (kind === 'pricing' && detachedNumericPrice) continue;
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
      if (kind === 'materials') title = 'Materiaalit';
      if (kind === 'quality') title = 'Laatu ja valmistus';
      if (kind === 'care') title = 'Hoito-ohjeet';
      if (kind === 'sizing') title = 'Koot ja mitat';
      if (kind === 'location') title = /\b\d{5}\s+[A-Za-zÅÄÖåäö]/.test(block.text) || /(?:osoite|address|adress)\s*:?\s*\S+.*\d/i.test(block.text) ? 'Osoite' : 'Sijainti ja myymälät';
      if (kind === 'faq') title = clean(block.heading).slice(0,180) || 'Usein kysytyt';
      if (kind === 'contact') title = directEmail ? 'Sähköposti' : phone.test(block.text) ? 'Puhelinnumero' : 'Yhteystiedot';
      if (kind === 'contact' && directEmail) add(kind,'Sähköposti',directEmail,doc.url);
      if (kind === 'contact' && phone.test(block.text) && !/\b\d{5}\s+[A-Za-zÅÄÖåäö]/.test(block.text)) add(kind,'Puhelinnumero',block.text.match(phone)[0],doc.url);
      if (kind !== 'contact') {
        const concreteHeading = clean(block.heading);
        const normalizedHeading=norm(concreteHeading);
        const genericCommerceHeading=/^(?:palvelut?|services?|tjanster|hinnat|hinnasto|pricing|prices|price list|palvelut ja hinnasto|services and prices)$/i.test(normalizedHeading);
        const usefulCommerceHeading=Boolean(
          concreteHeading &&
          concreteHeading.length < 65 &&
          !genericCommerceHeading &&
          !junk.test(normalizedHeading) &&
          !review.test(normalizedHeading) &&
          !/^(?:ota yhteytta|contact|read more|lue lisaa|varaa aika|book now)$/i.test(normalizedHeading)
        );
        const hasServiceContext = usefulCommerceHeading && (
          service.test(normalizedHeading) ||
          ['services','pricing'].includes(kind)
        ) && !norm(block.text).includes(normalizedHeading);
        const productContext = docProducts.length===1 && ['materials','quality','care','sizing'].includes(kind)
          ? clean(docProducts[0].name)
          : '';
        const contextualAnswer = productContext && !norm(block.text).includes(norm(productContext))
          ? productContext+': '+block.text
          : hasServiceContext && ['services','pricing'].includes(kind)
            ? concreteHeading+': '+block.text
            : block.text;
        const contextualTitle = productContext ? productContext+' – '+title : title;
        add(kind,contextualTitle,contextualAnswer,doc.url);
      }
    }
    for (const link of doc.links || []) {
      const parsed=new URL(link.url);
      const path=norm(parsed.pathname);
      const n = norm(link.label + ' ' + parsed.pathname);
      const explicit = /tarjous|quote|estimate|offert|prisforslag/.test(n);
      const contact = /yhtey|contact|kontakt/.test(n);
      if (explicit || contact) quoteLinks.push({...link,sourceUrl:doc.url,score:explicit?10:1});

      const individualProduct=/\/(?:products?|tuotteet?)\/[^/]+\/?$/.test(parsed.pathname.toLowerCase());
      const catalogOrProductPath=/\/(?:collections?|products?|tuotteet?|shop|store|kauppa)(?:\/|$)/i.test(parsed.pathname);
      const serviceLabel=clean(decodeHtml(link.label));
      const sameHost=parsed.hostname===new URL(doc.url).hostname;
      const concreteServiceLink=sameHost && !individualProduct && !catalogOrProductPath && isConcreteServiceLabel(serviceLabel);
      if(concreteServiceLink) serviceLinks.push({...link,label:serviceLabel,sourceUrl:doc.url,score:20});

      const allProducts=/collections\/all|all[-_ ]?products|shop[-_ ]?all|kaikki[-_ ]?tuotteet|alla[-_ ]?produkter/.test(n);
      const catalogPath=/^(?:\/(?:collections|products?|tuotteet?|shop|store|kauppa)\/?$)/i.test(parsed.pathname);
      const catalogLabel=/^(?:all products|shop all|products|shop|store|tuotteet|verkkokauppa|kaikki tuotteet|produkter|alla produkter)$/i.test(clean(link.label));
      if(!individualProduct && (allProducts || catalogPath || catalogLabel)){
        catalogLinks.push({...link,sourceUrl:doc.url,score:allProducts?30:catalogLabel?20:10});
      }
    }
  }
  serviceLinks.sort((a,b)=>b.score-a.score);
  for (const link of serviceLinks) add('services','Palvelut',clean(link.label),link.sourceUrl || link.url);
  quoteLinks.sort((a,b)=>b.score-a.score);
  if (quoteLinks.length) add('quote','Tarjouspyyntölomake',quoteLinks[0].url,quoteLinks[0].sourceUrl);
  catalogLinks.sort((a,b)=>b.score-a.score);
  const extractedProductCount=out.filter((item)=>item.category==='Tuotteet').length;
  if (catalogLinks.length && !catalogLooksLikeTemplate && (hasCatalogProducts || extractedProductCount>0)) {
    add('catalog','Tuotekatalogi',catalogLinks[0].url,catalogLinks[0].sourceUrl);
  }

  // If the user imports a branch/location-specific page, contact details,
  // address and opening hours from other branches on the same chain must not
  // contaminate this location. Keep the exact start page plus facts that
  // explicitly mention the location slug (e.g. "maariankatu").
  let scoped=out;
  try {
    const final=new URL(bundle?.finalUrl || '');
    const finalKey=(final.origin+final.pathname.replace(/\/+$/,'')).toLowerCase();
    const segments=final.pathname.split('/').map((x)=>norm(x)).filter(Boolean);
    const generic=new Set(['fi','sv','en','contact','kontakt','yhteystiedot','about','about-us','meista','meistä','company','locations','location','stores','store','shops','shop','parturit','salons','toimipisteet']);
    const scopeToken=[...segments].reverse().find((x)=>x.length>=4 && !generic.has(x)) || '';
    const sourceKey=(value)=>{
      try {
        const u=new URL(String(value||''));
        return (u.origin+u.pathname.replace(/\/+$/,'')).toLowerCase();
      } catch { return ''; }
    };
    const sensitiveKey=(item)=>{
      if(item.title==='Puhelinnumero') return 'phone';
      if(item.title==='Sähköposti') return 'email';
      if(item.title==='Osoite' || item.category===labels.location) return 'location';
      if(item.category===labels.hours) return 'hours';
      return '';
    };
    const exactKeys=new Set(out.filter((item)=>sourceKey(item.sourceUrl)===finalKey).map(sensitiveKey).filter(Boolean));
    if(scopeToken && exactKeys.size){
      scoped=out.filter((item)=>{
        const key=sensitiveKey(item);
        if(!key || !exactKeys.has(key)) return true;
        const src=sourceKey(item.sourceUrl);
        if(src===finalKey) return true;
        const evidence=norm(String(item.answer||'')+' '+String(item.title||'')+' '+String(item.sourceUrl||''));
        return evidence.includes(scopeToken);
      });
    }
  } catch {}
  return scoped.slice(0,10000);
}
function addressScore(value,title='') {
  const text=clean(value);
  const meta=norm(title);
  if(!text || text.length>220 || /^https?:\/\//i.test(text) || billingAddressNoise.test(text)) return -1000;
  let score=0;
  if(/osoite|address|adress/.test(meta)) score+=35;
  if(/\b[A-ZÅÄÖa-zåäö][A-ZÅÄÖa-zåäö .'-]{1,55}\s+\d+[A-Za-z]?\b/.test(text)) score+=45;
  if(/\b\d{5}\s+[A-ZÅÄÖa-zåäö][A-ZÅÄÖa-zåäö .'-]{1,55}\b/.test(text)) score+=35;
  if(/\b(?:katu|tie|kuja|polku|kaari|väylä|vayla|road|street|st\.?|avenue|ave\.?|gatan|vägen|vagen)\b/i.test(text)) score+=20;
  if(/\b\d{5}\b/.test(text)) score+=10;
  if(text.split(/\s+/).length<=8) score+=8;
  return score;
}

function compactLocationAnswer(value) {
  const text=clean(value);
  if(!text) return '';
  const based=text.match(/(?:home\s+base(?:\s+is)?|based|located|headquartered|head\s+office)\s+(?:in|at)\s+([^.!?]+)/i);
  if(based){
    return clean(based[1])
      .replace(/,\s*(?:we|where\s+we|and\s+we|our\s+team)\b[\s\S]*$/i,'')
      .replace(/[,;:]+$/,'')
      .trim();
  }
  return text;
}

function profileServiceLabelFromPrice(value) {
  const raw=clean(value).replace(/^[^A-ZÅÄÖa-zåäö0-9]+/,'');
  if(!raw) return '';
  const label=raw
    .replace(/\s*[:–—-]?\s*(?:alkaen\s+|alk\.\s*)?(?:[€$£]\s*)?\d[\d\s.,]*(?:\s*(?:€|eur\b|usd\b|sek\b|kr\b|\$|£))?.*$/i,'')
    .replace(/[\s:–—-]+$/,'')
    .trim();
  if(!pricedServiceLabel(label)) return '';
  const serviceAction=/\b(?:hiustenleikka|leikkaus|koneajo|parran\s+(?:muotoilu|ajo|trimmaus)|muotoilu|veitsirajaus|skin\s*fade|skinfade|hieronta|puhdistus|pesu|siivou|asennus|korjaus|huolto|kuljetus|muutto|konsultointi|suunnittelu|hair\s*cut|haircut|beard\s*trim|shave|razor\s*line|massage|cleaning|washing|installation|repair|maintenance|transport|moving|consulting|design|harklipp|hårklipp|skaggtrim|skäggtrim|rakning|massage|stadning|städning|tvatt|tvätt|installation|reparation|flytt)\w*/i;
  return serviceAction.test(norm(label)) ? label : '';
}

function conciseProfileServices(facts) {
  const out=[]; const seen=new Set();
  const add=(value)=>{
    const text=clean(value)
      .replace(/^[•·▪◾🔶◆◇►▶✓✔]+\s*/,'')
      .replace(/[.!?;:]+$/,'')
      .trim();
    const key=norm(text);
    if(!text || text.length>180 || seen.has(key)) return;
    if(/\b(?:varaa|ota yhtey|contact us|book now|lue lisaa|lue lisää|read more|tutustu|tervetuloa|welcome|jasen|jäsen|membership|sopimuseh|terms)\b/i.test(text)) return;
    if(!isConcreteServiceLabel(text) && !pricedServiceLabel(text)) return;
    seen.add(key);
    out.push(text);
  };

  for(const fact of facts.filter(x=>x.category===labels.services)){
    const title=clean(fact.title);
    const answer=clean(fact.answer);
    const explicit=title.match(/^Palvelut\s*:\s*(.+)$/i);
    if(explicit && norm(explicit[1])===norm(answer)) add(answer);
  }

  for(const fact of facts.filter(x=>x.category===labels.pricing)){
    const label=profileServiceLabelFromPrice(fact.answer);
    if(label) add(label);
  }

  if(!out.length){
    for(const fact of facts.filter(x=>x.category===labels.services)){
      const answer=clean(fact.answer);
      if(!answer || answer.length>120) continue;
      if(/\b(?:pitkän historian|pitkan historian|tavoitteenamme|kokonaisvaltais(?:esta|en|ta)|jokainen asiakkaamme|elämys|elamyks|palvelussa|palveluista)\b/i.test(answer)) continue;
      for(const part of answer.split(/\s*(?:\n|[|•·])\s*/)){
        if(part.length<=120) add(part);
      }
    }
  }
  return out.slice(0,32).join('\n').slice(0,2600);
}

function uniqueProfileFacts(items, limit=4000) {
  const out=[]; const seen=new Set();
  for(const item of items){
    const value=clean(item?.answer);
    const key=norm(value).replace(/\s+/g,' ');
    if(!value || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if(out.join('\n').length>=limit) break;
  }
  return out.join('\n').slice(0,limit);
}

function bestAddressAnswer(facts) {
  const locationFacts=(facts||[]).filter((item)=>item?.title==='Osoite' || item?.category===labels.location);
  if(!locationFacts.length) return '';

  const bySource=new Map();
  for(const item of locationFacts){
    const source=String(item.sourceUrl||'');
    if(!bySource.has(source)) bySource.set(source,[]);
    bySource.get(source).push(item);
  }

  const candidates=[];
  for(const [source,items] of bySource){
    for(const item of items){
      const compact=compactLocationAnswer(item.answer);
      candidates.push({value:compact,score:addressScore(compact,item.title),source,item});
    }
    const street=items
      .map((item)=>clean(item.answer))
      .find((value)=>/\b[A-ZÅÄÖa-zåäö][A-ZÅÄÖa-zåäö .'-]{1,55}\s+\d+[A-Za-z]?\b/.test(value) && !/\b\d{5}\b/.test(value));
    const postal=items
      .map((item)=>clean(item.answer))
      .find((value)=>/\b\d{5}\s+[A-ZÅÄÖa-zåäö][A-ZÅÄÖa-zåäö .'-]{1,55}\b/.test(value));
    if(street && postal && norm(street)!==norm(postal)){
      const streetKey=norm(street);
      const postalKey=norm(postal);
      const combined=postalKey.includes(streetKey)
        ? clean(postal)
        : streetKey.includes(postalKey)
          ? clean(street)
          : clean(street+', '+postal);
      candidates.push({value:combined,score:addressScore(combined,'Osoite')+25,source,item:items[0]});
    }
  }

  return candidates
    .filter((x)=>x.value && x.score>-1000)
    .sort((a,b)=>b.score-a.score || a.value.length-b.value.length)[0]?.value || '';
}

export function essentialWebsiteProfile(bundle) {
  const facts = essentialWebsiteCandidates(bundle);
  let preferred='';
  try {
    const u=new URL(bundle?.finalUrl || '');
    preferred=(u.origin+u.pathname.replace(/\/+$/,'')).toLowerCase();
  } catch {}
  const sourceKey=(value)=>{
    try {
      const u=new URL(String(value||''));
      return (u.origin+u.pathname.replace(/\/+$/,'')).toLowerCase();
    } catch { return ''; }
  };
  const sourcePriority=(item)=>{
    const src=sourceKey(item?.sourceUrl);
    let score=0;
    if(preferred && src===preferred) score+=120;
    try{
      const u=new URL(String(item?.sourceUrl||''));
      const p=norm(u.pathname);
      if(/(?:^|\/)(?:contact|contacts|yhteystiedot|kontakt|kundservice|customer-service|asiakaspalvelu)(?:\/|$)/.test(p)) score+=100;
      if(u.pathname==='/' || u.pathname==='') score+=70;
      if(/(?:^|\/)(?:about|about-us|meista|meistä|company|yritys)(?:\/|$)/.test(p)) score+=35;
      if(/\/(?:products?|tuotteet?)\//.test(p)) score-=120;
      if(/\/(?:blog|news|uutis)\//.test(p)) score-=45;
    }catch{}
    return score;
  };
  const sorted=(items)=>[...items].sort((a,b)=>sourcePriority(b)-sourcePriority(a));
  const byKind = (kind) => uniqueProfileFacts(sorted(facts.filter(x=>x.category===labels[kind])),4000);
  const byTitle = (title) => sorted(facts.filter(x=>x.title===title))[0]?.answer || '';
  return {
    website:bundle.finalUrl || '',
    services:conciseProfileServices(sorted(facts)),
    pricing:byKind('pricing'),
    hours:byKind('hours'),
    delivery:byKind('delivery'),
    returns:byKind('returns'),
    warranty:byKind('warranty'),
    payment:byKind('payment'),
    phone:byTitle('Puhelinnumero'),
    email:byTitle('Sähköposti'),
    address:bestAddressAnswer(facts),
    quoteRequestUrl:byTitle('Tarjouspyyntölomake'),
    bookingUrl:'',
    serviceArea:'',
    notes:''
  };
}

export function usableWebsiteRow(row) {
  if (review.test(norm([row.category,row.title,row.answer].join(' ')))) return false;
  const sourceType=String(row.source_type || row.sourceType || '');
  if (!['website','demo_import'].includes(sourceType)) return true;
  if (row.title === 'Tarjouspyyntölomake' || row.title === 'Tuotekatalogi') return !!httpUrl(row.answer);
  const serviceTitle=String(row.title||'').match(/^Palvelut\s*:\s*(.+)$/i);
  if (
    serviceTitle &&
    norm(row.category||'')==='palvelut' &&
    norm(serviceTitle[1])===norm(row.answer||'') &&
    isConcreteServiceLabel(row.answer)
  ) return true;
  if (/(?:^|\s)(?:tuotteet|products?|produkter)(?:\s|$)/.test(norm(row.category || ''))) {
    const product=parseProductKnowledgeRow(row);
    // A product can still be useful factual evidence even when an individual
    // product URL is missing; the catalog CTA is handled separately.
    return !!product?.name;
  }
  return !!businessFactKind(row.answer, String(row.category||'')+' '+String(row.title||''));
}
