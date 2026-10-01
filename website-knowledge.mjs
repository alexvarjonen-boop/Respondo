// Conservative, dependency-free business fact extraction. Page headings supply
// context only; they are never stored as answers. No remote code is executed.
const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const review = /arvostel|asiakaskokem|asiakaspalaut|testimonial|review|rating|omdomen|recension|kundberatt|aggregateRating/i;
const junk = /cookie|evaste|privacy|tietosuoja|integritet|copyright|all rights reserved|kayttoeh|terms of|skip to|toggle nav|add to cart|ostoskori|kirjaudu|log in|sign in|uutiskirje|newsletter|localstorage|queryselector|javascript|webpack/i;
const service = /palvel|tarjoamme|teemme|service|we (?:offer|provide)|tjanst|vi erbjuder|pesu|siivou|puhdist|maalaus|raivaus|leikkaus|huolto|asennu|korjau|kuljet|muutto|poisvienti/;
const hours = /auki|opening|hours|oppet|maanantai|tiistai|keskiviikko|torstai|perjantai|lauantai|sunnuntai|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mandag|tisdag|onsdag|torsdag|fredag|lordag|sondag|\b(?:ma|ti|ke|to|pe|la|su|mon|tue|wed|thu|fri|sat|sun|man|tis|ons|tor|fre|lor|son)(?:\b|–|-)/;
const clock = /\b\d{1,2}(?:[:.]\d{2})?\s*(?:–|-|—|to|till)\s*\d{1,2}(?:[:.]\d{2})?\b|\b\d{1,2}:\d{2}\b|\b(?:closed|suljettu|stangt|24\/7)\b/i;
const price = /(?:\d[\d\s.,]*\s*(?:€|eur\b|usd\b|sek\b|kr\b|\$|£)|[€$£]\s*\d)|(?:hinta|hinnoittelu|price|pris).*(?:sopim|tarjous|quote|offert|contact|yhtey|avtal)/i;
const email = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const phone = /(?:\+\d{1,3}[\s().-]*|\b0)\d(?:[\s().-]*\d){5,11}\b/;
const labels = {services:'Palvelut', pricing:'Hinnat', hours:'Aukioloajat', contact:'Yhteystiedot', quote:'Tarjouspyyntö'};
const keywords = {services:['palvelut','teette','services','tjänster'], pricing:['hinta','maksaa','price','pris'], hours:['auki','opening','hours','öppettider'], contact:['yhteystiedot','contact','kontakt'], quote:['tarjous','tarjouspyyntö','quote','offert']};

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

export function extractBusinessDocument(html, url) {
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
  return {url, blocks, links, text:blocks.map(x=>x.text).join('\n')};
}

export function businessFactKind(text, context = '') {
  const t = clean(text), n = norm(t), c = norm(context);
  if (!t || t.length > 1600 || junk.test(n) || review.test(n) || /[★⭐]|\b\d(?:[.,]\d)?\s*\/\s*5\b/.test(t)) return '';
  if (/^(?:palvelut?|services?|tjanster|hinnat|hinnasto|pricing|prices|yhteystiedot|contact|aukioloajat|opening hours|pyyda tarjous|ota yhteytta|lue lisaa|read more|las mer|etusivu|home)$/i.test(n)) return '';
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
  const quoteLinks = [];
  for (const doc of bundle?.pageDocuments || []) {
    if (/privacy|terms|tietosuoja|kayttoeh|arvostel|reviews|testimonial|blog|uutis|news/.test(norm(new URL(doc.url).pathname))) continue;
    const blocks = doc.blocks || String(doc.text || '').split('\n').map(text=>({text,heading:''}));
    for (const block of blocks) {
      const kind = businessFactKind(block.text,block.heading);
      if (!kind) continue;
      let title = labels[kind];
      if (kind === 'contact') title = email.test(block.text) ? 'Sähköposti' : phone.test(block.text) ? 'Puhelinnumero' : 'Osoite';
      // Extract actual contact values; never save a whole footer as a phone number.
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
  return out.slice(0,1000);
}

export function essentialWebsiteProfile(bundle) {
  const facts = essentialWebsiteCandidates(bundle);
  const byKind = (kind) => facts.filter(x=>x.category===labels[kind]).map(x=>x.answer).join('\n').slice(0,4000);
  const byTitle = (title) => facts.find(x=>x.title===title)?.answer || '';
  return {website:bundle.finalUrl || '', services:byKind('services'), pricing:byKind('pricing'), hours:byKind('hours'), phone:byTitle('Puhelinnumero'), email:byTitle('Sähköposti'), address:byTitle('Osoite'), quoteRequestUrl:byTitle('Tarjouspyyntölomake'), bookingUrl:'', serviceArea:'', notes:''};
}

export function usableWebsiteRow(row) {
  if (review.test(norm([row.category,row.title,row.answer].join(' ')))) return false;
  if (row.source_type !== 'website' && row.sourceType !== 'website') return true;
  if (row.title === 'Tarjouspyyntölomake') return !!httpUrl(row.answer);
  return !!businessFactKind(row.answer, row.category);
}
