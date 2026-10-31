import {branchNameFromHoursRow} from './branch-hours.mjs';
const norm=x=>String(x||'').trim().replace(/\s+/g,' ');
export function dateISO(raw){
  const m=norm(raw).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const n=norm(raw).match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\.?$/);
  if(!m&&!n)return '';
  const y=Number(m?m[1]:n[3]),mo=Number(m?m[2]:n[2]),d=Number(m?m[3]:n[1]);
  const dt=new Date(Date.UTC(y,mo-1,d));
  if(y<2020||y>2100||dt.getUTCFullYear()!==y||dt.getUTCMonth()!==mo-1||dt.getUTCDate()!==d)return '';
  return String(y)+'-'+String(mo).padStart(2,'0')+'-'+String(d).padStart(2,'0');
}
function exceptionHours(input){
  const v=norm(input).toLowerCase();
  if(/^(?:suljettu|kiinni|closed|stangt|stängt)$/.test(v))return 'suljettu';
  const m=v.match(/^(?:klo\s*)?(\d{1,2})(?::(\d{2}))?\s*[-–—]\s*(\d{1,2})(?::(\d{2}))?$/);
  if(!m)return '';
  const a=Number(m[1]),b=Number(m[3]),am=Number(m[2]||0),bm=Number(m[4]||0);
  if(a>24||b>24||am>59||bm>59||(a===24&&am)||(b===24&&bm))return '';
  return String(a).padStart(2,'0')+':'+String(am).padStart(2,'0')+
    ' - '+String(b).padStart(2,'0')+':'+String(bm).padStart(2,'0');
}
export function branchExceptionFacts(doc){
  const branch=branchNameFromHoursRow({title:'Aukioloajat',source_url:doc?.url});
  if(!branch)return [];
  const blocks=Array.isArray(doc?.blocks)?doc.blocks:[];
  const found=new Map();
  for(let i=0;i<blocks.length;i++){
    const item=blocks[i];
    const heading=norm(item?.heading).toLowerCase();
    if(!/(?:poikkeusaukiolo|pyhä|pyha|holiday hours|special opening|exception|avvikande)/.test(heading))continue;
    const value=norm(item.text);
    const combined=value.match(/(\d{4}-\d\d-\d\d|\d\d?\.\d\d?\.\d{4})\s*[:–—-]?\s*(suljettu|kiinni|closed|stängt|stangt|(?:klo\s*)?\d{1,2}(?::\d\d)?\s*[-–—]\s*\d{1,2}(?::\d\d)?)/i);
    const date=dateISO(combined?combined[1]:value);
    const hours=date?exceptionHours(combined?combined[2]:blocks[i+1]?.text):'';
    if(!date||!hours)continue;
    if(found.has(date)&&found.get(date)!==hours)found.set(date,'conflict');
    else if(!found.has(date))found.set(date,hours);
  }
  return [...found].filter(([,v])=>v!=='conflict').slice(0,50).map(([date,hours])=>({
    category:'Poikkeusaukioloajat',title:'Poikkeusaukioloajat: '+branch,
    answer:date+': '+hours,keywords:['aukioloajat','poikkeusaukioloajat',date,branch],
    sourceUrl:doc.url
  }));
}
// Resolve Helsinki's *calendar* day before adding one day. Adding 24 hours to
// an instant gives the wrong date around the autumn DST transition.
export function exceptionQueryDate(message,now=new Date()){
  const text=norm(message);
  const direct=text.match(/\b\d{4}-\d\d-\d\d\b|\b\d{1,2}\.\d{1,2}\.\d{4}\b/)?.[0];
  if(direct)return dateISO(direct);
  const parts=new Intl.DateTimeFormat('en-GB',{
    timeZone:'Europe/Helsinki',year:'numeric',month:'2-digit',day:'2-digit'
  }).formatToParts(now);
  const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
  const year=p.year;
  const short=text.match(/\b(\d{1,2})\.(\d{1,2})\.?\b/);
  if(short)return dateISO(short[1]+'.'+short[2]+'.'+year);
  if(/\b(?:tänään|tanaan|today|idag|huomenna|tomorrow|imorgon)\b/i.test(text)){
    const today=dateISO(year+'-'+p.month+'-'+p.day);
    if(!today)return '';
    if(!/(?:huomenna|tomorrow|imorgon)/i.test(text))return today;
    const following=new Date(Date.UTC(Number(year),Number(p.month)-1,Number(p.day)+1));
    return following.toISOString().slice(0,10);
  }
  return '';
}

const normalizePlace=value=>String(value||'').toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const hoursContext=/auki|avoin|sulje|opening|open\b|clos(?:ed|ing|e)\b|hours|oppettid|öppettid|stang|stäng|aukiolo/i;

function mentionsBranch(question,branch){
  const name=normalizePlace(branch);
  const forms=new Set([name]);
  if(name==='turku'){forms.add('turun');forms.add('abo');}
  else if(name.endsWith('i')||name.endsWith('a')||name.endsWith('o')||name.endsWith('e'))forms.add(name+'n');
  const text=' '+normalizePlace(question)+' ';
  return [...forms].some(form=>text.includes(' '+form+' '));
}

export function answerBranchException({rows=[],message='',lang='fi',history=[],now=new Date()}={}){
  const date=exceptionQueryDate(message,now);
  if(!date)return null;
  const recent=Array.isArray(history)?history.slice(-5):[];
  const dayOnly=/^(?:(?:entä|enta|and|och)\s+)?(?:tänään|tanaan|huomenna|today|tomorrow|idag|imorgon)[?.! ]*$/i.test(norm(message));
  // A question about a delivery or product "tomorrow" must never be
  // misclassified as a store-hours question just because a date is present.
  const previous=recent.at(-1);
  if(!hoursContext.test(message) && !(dayOnly && hoursContext.test(
    String(previous?.question||'')+' '+String(previous?.answer||''))))return null;

  const candidates=(rows||[]).filter(row=>row.category==='Poikkeusaukioloajat' &&
    String(row.title||'').startsWith('Poikkeusaukioloajat: ') &&
    String(row.answer||'').startsWith(date+': '));
  const names=[...new Set(candidates.map(row=>String(row.title).slice('Poikkeusaukioloajat: '.length)))];
  const direct=names.filter(name=>mentionsBranch(message,name));
  if(direct.length>1)return null;
  let selectedName=direct[0]||'';
  if(!selectedName){
    for(const turn of [...recent].reverse()){
      const question=String(turn?.question||'');
      const answer=String(turn?.answer||'');
      if(!hoursContext.test(question+' '+answer))continue;
      const named=names.filter(name=>mentionsBranch(question,name) ||
        normalizePlace(answer).startsWith(normalizePlace(name)+' '));
      if(named.length===1){selectedName=named[0];break;}
      if(named.length>1)return null;
    }
  }
  if(!selectedName)return null;
  const matching=candidates.filter(row=>String(row.title)==='Poikkeusaukioloajat: '+selectedName);
  const values=new Set(matching.map(row=>norm(String(row.answer).slice(date.length+2))));
  // Multiple published, conflicting exception times must never select a
  // random record. Leave the normal human-escalation path available.
  if(values.size!==1)return null;
  const hours=[...values][0];
  if(hours!=='suljettu'&&!/^\d\d:\d\d - \d\d:\d\d$/.test(hours))return null;
  const answer=lang==='en'?selectedName+': On '+date+', '+(hours==='suljettu'?'closed.':'open '+hours+'.'):
    lang==='sv'?selectedName+': '+date+' är butiken '+(hours==='suljettu'?'stängd.':'öppen '+hours+'.'):
      selectedName+': '+date+' '+(hours==='suljettu'?'myymälä on suljettu.':'auki '+hours+'.');
  return {answer,handoff:false,confidence:0.98,intent:'Aukioloajat',
    sourceIds:[...new Set(matching.map(row=>row.id).filter(Boolean))],selected:matching};
}
