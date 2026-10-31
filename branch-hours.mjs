// Grounded multi-location opening-hours disambiguation.
// A branch is never inferred from a general website URL or a city mentioned
// incidentally in an unrelated paragraph. Only verified location-specific
// opening-hours records can become choices or answers.
const norm = value => String(value||'').toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s-]/g,' ')
  .replace(/\s+/g,' ').trim();

const locations = new Set([
  'toimipiste','toimipisteet','myymala','myymalat','liike','liikkeet',
  'tavaratalo','tavaratalot','stores','store','shops','shop',
  'locations','location','branches','branch','butiker','butik',
  'varuhus','affarer','fi','sv','en','yhteystiedot','contact',
  'kontakt','aukioloajat','aukiolo','opening-hours','hours','opening',
  'about','etusivu','index','info','palvelut','services',
]);
const markers=new Set([
  'toimipiste','toimipisteet','myymala','myymalat','tavaratalo','tavaratalot',
  'liike','liikkeet','stores','store','locations','location',
  'branches','branch','butiker','butik','shops','shop','varuhus'
]);

function displaySlug(value) {
  const source=decodeURIComponent(String(value||'')).replace(/[-_]+/g,' ').trim();
  if(!source || source.length>65 || /\d{4,}/.test(source))return '';
  const cleaned=source.replace(/[^\p{L}\p{N}\s-]/gu,' ').replace(/\s+/g,' ').trim();
  const lower=norm(cleaned);
  if(!cleaned || locations.has(lower) || lower.length<3)return '';
  return cleaned.split(' ').map(x=>x[0].toUpperCase()+x.slice(1)).join(' ');
}

export function branchNameFromHoursRow(row) {
  const title=String(row?.title||'').trim();
  // Explicitly structured, company-approved knowledge can name the branch.
  const named=title.match(/^(?:aukioloajat|oppettider|öppettider|opening hours|hours)\s*[:–—-]\s*(.{3,65})$/i)
    || title.match(/^(.{3,65}?)\s*[:–—-]\s*(?:aukioloajat|oppettider|öppettider|opening hours|hours)$/i);
  if(named){
    const name=displaySlug(named[1]);
    if(name)return name;
  }
  // Otherwise require a branch marker in the SOURCE URL; never assume that a
  // homepage, product page or generic contacts page identifies one location.
  try {
    const u=new URL(String(row?.source_url||row?.sourceUrl||''));
    if(!['https:','http:'].includes(u.protocol))return '';
    const path=u.pathname.split('/').filter(Boolean);
    const tokens=path.map(x=>norm(decodeURIComponent(x)));
    const i=tokens.findIndex(x=>markers.has(x));
    if(i<0 || i+1>=tokens.length)return '';
    const candidate=displaySlug(path[i+1]);
    return candidate && !locations.has(norm(candidate)) ? candidate : '';
  }catch{return '';}
}

function variants(name) {
  const base=norm(name);
  const forms=new Set([base]);
  if(base.endsWith('ku'))forms.add(base.slice(0,-2)+'un'); // Turku -> Turun
  if(base.endsWith('i'))forms.add(base+'n'); // Raisio handled by default below
  if(base.endsWith('a') || base.endsWith('o') || base.endsWith('e'))forms.add(base+'n');
  if(base==='turku')forms.add('abo'); // Swedish name Åbo
  return [...forms];
}

function namedInQuestion(question,branch) {
  const query=' '+norm(question)+' ';
  return variants(branch).some(name=>query.includes(' '+name+' '));
}

function hoursPrompt(history) {
  const last=Array.isArray(history)?history.at(-1):null;
  const answer=norm(last?.answer||'');
  return /(?:minka|vilken|which|valitse|choose|valj)/.test(answer)
    && /(?:toimipiste|myymala|tavaratalo|store|location|branch|butik)/.test(answer)
    && /(?:aukiolo|opening|hours|oppettid)/.test(answer);
}

function previousBranch(history, names) {
  // On a follow-up, only inherit a previously explicitly selected branch.
  // Never infer location from a random service answer or unrelated question.
  const recent=Array.isArray(history)?history.slice(-5):[];
  for(let i=recent.length-1;i>=0;i--){
    const q=String(recent[i]?.question||'');
    const answer=String(recent[i]?.answer||'');
    if(!/(?:auki|opening|hours|oppettid|suljettu|closed|stangt)/i.test(norm(answer+q))) continue;
    const found=names.filter(name=>namedInQuestion(q,name));
    if(found.length===1)return found[0];
  }
  return '';
}

export function resolveBranchOpeningHours({rows,message,history=[],lang='fi',isHoursQuestion,parseHours,usableRow}){
  const eligible=(rows||[]).filter(row=>usableRow(row) &&
    /(?:aukiolo|opening hours|oppettid|öppettid|business hours)/i.test(
      norm(String(row.category||'')+' '+String(row.title||'')+' '+String((row.keywords||[]).join(' ')))));
  const byName=new Map();
  for(const row of eligible){
    if(!String(row.answer||'').trim())continue;
    const branch=branchNameFromHoursRow(row);
    if(!branch)continue;
    const key=norm(branch);
    if(!byName.has(key))byName.set(key,{name:branch,rows:[]});
    byName.get(key).rows.push(row);
  }
  const branches=[...byName.values()].sort((a,b)=>a.name.localeCompare(b.name,'fi'));
  if(!branches.length)return null;
  const names=branches.map(x=>x.name);
  const exact=branches.filter(x=>namedInQuestion(message,x.name));
  const isFollowup=hoursPrompt(history);
  const isDayFollowup=/^(?:ent[aä]\s+)?(?:maanantaina|tiistaina|keskiviikkona|torstaina|perjantaina|lauantaina|sunnuntaina|huomenna|t[aä]n[aä][aä]n|viikonloppuna|monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekend|imorgon|idag)(?:\s+.*)?[?.!]?$/i.test(String(message||'').trim());
  if(!isHoursQuestion && !(isFollowup&&exact.length) && !isDayFollowup)return null;
  const inherited=exact.length===0 && !isFollowup ? previousBranch(history,names) : '';
  const selected=exact.length===1?exact[0]:branches.find(b=>norm(b.name)===norm(inherited));
  const language=['fi','sv','en'].includes(lang)?lang:'fi';
  if(!selected){
    const prompt=language==='en'?'Which location’s opening hours would you like to know?'
      :language==='sv'?'Vilken butiks öppettider vill du veta?'
      :'Minkä toimipisteen aukioloajat haluat tietää?';
    return {
      answer:prompt,handoff:false,confidence:1,intent:'Toimipisteen valinta',sourceIds:[],selected:[],
      branchChoices:branches.slice(0,40).map(b=>b.name)
    };
  }
  // Results must use ONLY selected branch rows, even if other stores have a
  // different schedule on the same weekday.
  const parsed=selected.rows.flatMap(row=>(parseHours(row.answer)||[]).map(x=>({...x,row})));
  const days=new Map();
  for(const entry of parsed){
    const day=entry.day?.key;
    if(!day)continue;
    if(!days.has(day))days.set(day,new Set());
    days.get(day).add(entry.value);
  }
  // Conflicting confirmed times for one branch are not silently resolved.
  if([...days.values()].some(values=>values.size>1)){
    const msg=language==='en'?'The published opening hours conflict for this location. Please check with the store.'
      :language==='sv'?'De publicerade öppettiderna för den här butiken är motstridiga. Kontrollera med butiken.'
      :'Tämän toimipisteen julkaistuissa aukioloajoissa on ristiriita. Tarkista ajat suoraan myymälästä.';
    return {answer:selected.name+': '+msg,handoff:false,confidence:0.2,intent:'Aukioloajat',sourceIds:[],selected:[]};
  }
  // The host application's existing day/weekend parser remains authoritative
  // for Finnish, Swedish, English and special closing-day wording.
  const context=isHoursQuestion?message:(
    isDayFollowup ? 'aukioloajat '+message :
    (history.at(-1)?.question||'aukioloajat')
  );
  return {branch:selected.name,rows:selected.rows,query:context};
}
