// Evidence-first service overview for both public demos and subscribed tenants.
// Never infer an offering from a job title, news item, project reference or a
// company name. Source URLs are provenance, not a reason to invent a service.
import { isConcreteServiceLabel } from './website-knowledge.mjs';

const fold = value => String(value ?? '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').toLowerCase()
  .replace(/&(?:amp|nbsp);/gi,' ').replace(/[^a-z0-9]+/g,' ').trim()
  .replace(/\s+/g,' ');

const nonServiceUrl=/(?:^|\/)(?:news|blog|blogs|uutiset?|ajankohtaista|articles?|referenssit?|references?|case-studies|stories|project(?:s)?|projektit|tyopaikat|rekrytointi|careers?|jobs|team|henkilosto|henkilöstö|people|staff|author|tag|category)(?:\/|$)/i;
const serviceUrl=/(?:^|\/)(?:palvelut?|services?|tjanster|tjänster|purkutyot|purkutyöt|kierratys|kierrätys|huolto|korjaus|remontit?|asennus|hoidot|treatments|siivous|kuljetukset|tuotteet-ja-palvelut)(?:\/|$)/i;
const staff=/(?:^|\b|[-])(?:toimiala|liiketoiminta|alue|projekti|tyo|työ|myynti|tuotanto|talous|hankinta)?(?:paallikko|päällikkö|johtaja|asiantuntija|insinoori|insinööri|tyonjohtaja|työnjohtaja)(?:\b|\w*)|\b(?:toimitusjohtaja|tarjouslaskenta|tyopaikka|työpaikka|henkilosto|henkilöstö|rekrytointi|rekry|careers?|recruit\w*|manager|director|ceo|staff|employee|team member)\b/i;
const pastEvent=/\b(?:jarjesti|järjesti|toteutti|toteutettiin|jarjestettiin|järjestettiin|valmistui|avattiin|avasi|aloitti|kaynnisti|käynnisti|palkittiin|julkisti|tiedotti|osallistui|voitti|organized|organised|completed|announced|launched|sponsored|hosted)\b/i;
const salesNoise=/\b(?:lue lisa|lue lisää|read more|katso|see more|ota yhteytta|ota yhteyttä|click|contact us|varaa|book now|rekrytoimme|haemme|etsimme|tietoa meista|tietoa meistä)\b/i;
const reportFormat=/(?:\b\d{1,2}\.\d{1,2}\.\d{4}\b|\b20\d{2}\b)/;
const generic=/^(?:palvelut?|palvelumme|kaikki palvelut|services?|our services|what we do|mitä teemme|mita teemme|tjanster|tjänster|meidan palvelut|meidän palvelut)$/i;
const manualType = row => !['website','demo_import'].includes(String(row?.source_type||row?.sourceType||'').toLowerCase());

export function serviceOverviewQuestion(question) {
  const q=fold(question).replace(/[?!.,]/g,'');
  // Broad discovery questions only: never intercept prices, availability,
  // particular service confirmations, booking or delivery policies.
  if (/\b(?:hinta|hintaa|maksaa|maksavat|paljonko|price|cost|pris|kostar|ajanvaraus|booking|book|aika|when|milloin)\b/.test(q)) return false;
  return /^(?:mita (?:teette|te oikein teette|palveluita|palveluja|palveluja teilla on|palveluita tarjoatte|palveluja tarjoatte|palveluja teette|palveluita teette|tarjoatte)|millaisia palveluja (?:teilla on|tarjoatte)|mitka ovat palvelunne|kerro palveluistanne|mitka palvelut|what (?:do you do|services do you (?:offer|provide)|do you offer)|which services do you offer|tell me about your services|vad (?:gor ni|erbjuder ni)|vilka tjanster (?:har ni|erbjuder ni)|beratta om era tjanster)(?:\b|$)/.test(q);
}

function sourcePath(row){
  try { const u=new URL(String(row?.source_url||row?.sourceUrl||''));return u.pathname; }
  catch { return ''; }
}

export function credibleServiceName(value) {
  const raw=String(value??'').replace(/<[^>]*>/g,' ')
    .replace(/\\(?:n|r|t)/gi,' ').replace(/^[\s\u2022*•✓–—-]+|[\s.!,;:]+$/g,'')
    .replace(/\s+/g,' ').trim();
  if(!raw || raw.length>78 || raw.split(/\s+/).length>7) return '';
  if(generic.test(raw) || staff.test(raw) || pastEvent.test(raw) || salesNoise.test(raw) || reportFormat.test(raw)) return '';
  if(!isConcreteServiceLabel(raw)) return '';
  // No bare corporate references, page headings or job roles in a customer list.
  if(/\b(?:oy|ab|ltd|inc)\b/i.test(raw) || /[:;|]/.test(raw)) return '';
  return raw;
}

// Canonicalize only established translations of the *same imported offering*.
// This is evidence normalization, not a list of services any company is assumed
// to provide. Unknown service names remain as the business published them.
const multilingualServiceNames=[
  {id:'lifting-equipment',pattern:/^(?:nostopalvelut\s+ja\s+[-–]?kalusto|lifting services? and equipment|lyfttjänster och lyftutrustning)$/i,
    labels:['Nostopalvelut ja -kalusto','Lyfttjänster och lyftutrustning','Lifting services and equipment']},
  {id:'transport',pattern:/^(?:kuljetuspalvelut|transport services?|transporttjänster)$/i,
    labels:['Kuljetuspalvelut','Transporttjänster','Transport services']},
  {id:'projects',pattern:/^(?:projektipalvelut|project services?|projekttjänster)$/i,
    labels:['Projektipalvelut','Projekttjänster','Project services']},
  {id:'construction-installation',pattern:/^(?:rakentamisen asennukset|construction installations?|bygginstallationer)$/i,
    labels:['Rakentamisen asennukset','Bygginstallationer','Construction installations']},
  {id:'hauling-jacking',pattern:/^(?:haalaus ja tunkkaus|hauling and jacking|intransport och domkraftslyft)$/i,
    labels:['Haalaus ja tunkkaus','Intransport och domkraftslyft','Hauling and jacking']},
  {id:'personnel-lifts',pattern:/^(?:henkilönostimet|personnel lifts?|personlyftar)$/i,
    labels:['Henkilönostimet','Personlyftar','Personnel lifts']},
];
function serviceIdentity(name,lang){
  const match=multilingualServiceNames.find(item=>item.pattern.test(String(name).trim()));
  if(!match) return {key:fold(name),label:name};
  return {key:'service:'+match.id,label:match.labels[lang==='sv'?1:lang==='en'?2:0]};
}
function isBrandOnlyServiceLabel(name,row,companyName=''){
  const cleaned=fold(name).replace(/\s+/g,'');
  const business=fold(companyName).replace(/\b(?:oy|ab|ltd|inc)\b/g,'').replace(/\s+/g,'');
  if(business && cleaned===business) return true;
  // A website title that is just its own domain's business name is not a
  // service: e.g. "Nostokonepalvelu" on nostokonepalvelu.fi.
  try {
    const host=new URL(String(row?.source_url||row?.sourceUrl||'')).hostname
      .replace(/^www\./,'').split('.')[0].replace(/[-_]/g,'').toLowerCase();
    return !!host && cleaned===host;
  } catch { return false; }
}

function profileNames(row) {
  const answer=String(row?.answer||'').trim();
  if(!answer || answer.length>1100) return [];
  // Only explicit manually maintained service lists can be split. Imported
  // paragraphs must never turn a random enumeration into service offerings.
  if(/\b(?:jarjesti|järjesti|toteutti|completed|sponsored)\b/i.test(answer)) return [];
  return answer.split(/\s*(?:\n|[|•;]|,(?=\s*[^,]{3,80}(?:,|$)))\s*/g)
    .slice(0,24).map(part=>credibleServiceName(part)).filter(Boolean);
}

export function verifiedServiceOverview(rows, { lang='fi', limit=7, companyName='' }={}) {
  const candidates=[];
  const entries=Array.isArray(rows)?rows:[];
  for(const row of entries){
    const category=fold(row?.category||'');
    const title=String(row?.title||'').trim();
    const answer=String(row?.answer||'').trim();
    const path=sourcePath(row);
    if(path && nonServiceUrl.test(path)) continue;
    const explicit=title.match(/^Palvelut\s*:\s*(.+)$/i);
    const fromManual=manualType(row);
    if(explicit && fold(explicit[1])===fold(answer)){
      const name=credibleServiceName(answer);
      if(name && !isBrandOnlyServiceLabel(name,row,companyName)) candidates.push({name,row,score:(fromManual?110:35)+(serviceUrl.test(path)?55:0)+(path==='/'?12:0)});
      continue;
    }
    // Manually entered, approved service lists have priority over scraped links.
    if(fromManual && /^(?:palvelut|services|tjänster)$/i.test(title) &&
       (category==='yrityksen perustiedot'||category==='palvelut')){
      for(const name of profileNames(row)) if(!isBrandOnlyServiceLabel(name,row,companyName)) candidates.push({name,row,score:105});
    }
  }
  candidates.sort((a,b)=>b.score-a.score);
  const chosen=[];
  const seen=new Set();
  for(const c of candidates){
    const identity=serviceIdentity(c.name,lang);
    const key=identity.key;
    if(!key || seen.has(key)) continue;
    // Generic headings add nothing when a specific variant is available.
    const tooGeneric=chosen.some(x=>fold(x.name).startsWith(key+' '));
    if(tooGeneric) continue;
    seen.add(key);
    chosen.push({...c,displayName:identity.label});
    if(chosen.length>=Math.max(1,Math.min(12,limit))) break;
  }
  if(!chosen.length){
    // Company-owned service descriptions can be factual without short menu labels.
    // Return one directly stated offering, not a collage of ranked snippets.
    const statements=[];
    for(const row of entries){
      if(fold(row?.category||'')!=='palvelut') continue;
      const path=sourcePath(row);
      if(path && nonServiceUrl.test(path)) continue;
      const raw=String(row?.answer||'').replace(/^(?:palvelumme|palvelut|services|tjänster)\s*[:–—-]\s*/i,'').trim();
      if(!raw || pastEvent.test(raw) || staff.test(raw) || salesNoise.test(raw.slice(0,75))) continue;
      const first=raw.split(/(?<=[.!?])\s+/)[0].replace(/\s+/g,' ').trim();
      if(first.length<20 || first.length>195) continue;
      const startsWithOffering=/^(?:tarjoamme|teemme|hoidamme|suoritamme|palvelemme|pesemme|korjaamme|asennamme|we offer|we provide|we do|vi erbjuder|vi utför)\b/i.test(first);
      if(!startsWithOffering || !/(?:palvel|huolto|pesu|puhdist|korja|asenn|muutto|kuljet|purku|kartoit|siivou|remont|service|repair|clean|install|transport|tjänst)/i.test(first)) continue;
      statements.push({row,answer:first,score:manualType(row)?3:serviceUrl.test(path)?2:1});
    }
    statements.sort((a,b)=>b.score-a.score);
    if(!statements.length)return null;
    const best=statements[0];
    return {answer:best.answer,selected:[best.row],names:[],confidence:best.score>=2?0.9:0.82};
  }
  const names=chosen.map(x=>x.displayName);
  const format = items => items.length===1 ? items[0]
    : items.slice(0,-1).join(', ')+(lang==='sv'?' och ':lang==='en'?' and ':' ja ')+items.at(-1);
  const prefix=lang==='en'?'We offer services such as '
    :lang==='sv'?'Vi erbjuder bland annat '
    :'Palveluihimme kuuluvat: ';
  const answer=prefix+format(names)+'.';
  const selected=[...new Set(chosen.map(x=>x.row))];
  return {answer,selected,names,confidence:chosen.every(x=>x.score>=90)?0.96:0.89};
}
