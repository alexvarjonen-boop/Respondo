// Extract a weekly schedule from a VERIFIED branch detail page.
// Supports site layouts where weekday labels and hour ranges are separate
// text nodes, e.g. "Maanantai" followed by "8 - 20".
// No parent-page hours or customer-support opening times may be attributed
// to an individual store.
import {branchNameFromHoursRow} from './branch-hours.mjs';

const days = [
  ['Ma','maanantai|monday|mandag|måndag|ma|mon'],
  ['Ti','tiistai|tuesday|tisdag|ti|tue'],
  ['Ke','keskiviikko|wednesday|onsdag|ke|wed'],
  ['To','torstai|thursday|torsdag|to|thu'],
  ['Pe','perjantai|friday|fredag|pe|fri'],
  ['La','lauantai|saturday|lordag|lördag|la|sat'],
  ['Su','sunnuntai|sunday|sondag|söndag|su|sun'],
];
const normalize=x=>String(x||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');
const dayByToken=new Map(days.flatMap(([short,names])=>names.split('|').map(name=>[normalize(name),short])));

function hourRange(value){
  const text=normalize(value).replace(/^klo\.?\s*/, '').replace(/\s+/g,' ');
  if(/^(?:suljettu|closed|stangt|st[aä]ngt|kiinni)$/.test(text))return 'suljettu';
  const m=text.match(/^(\d{1,2})(?::(\d{2}))?\s*[-–—]\s*(\d{1,2})(?::(\d{2}))?$/);
  if(!m)return '';
  const h1=Number(m[1]),m1=Number(m[2]||0),h2=Number(m[3]),m2=Number(m[4]||0);
  if(h1>24||h2>24||m1>59||m2>59||(h1===24&&m1)||(h2===24&&m2))return '';
  return String(h1).padStart(2,'0')+':'+String(m1).padStart(2,'0')+
    ' - '+String(h2).padStart(2,'0')+':'+String(m2).padStart(2,'0');
}

function recognizedDay(x){
  const value=normalize(x).replace(/:$/,'');
  return dayByToken.get(value)||'';
}

export function extractBranchWeeklyHours(doc) {
  const branch=branchNameFromHoursRow({title:'Aukioloajat',source_url:doc?.url});
  if(!branch)return null;
  const source=Array.isArray(doc?.blocks)?doc.blocks.map(b=>({
    text:String(b?.text||'').trim(), heading:normalize(b?.heading)
  })):[];
  const matches=new Map();
  let explicit=false;
  let candidatePairs=0;
  for(let i=0;i<source.length;i++){
    const item=source[i];
    const inExceptions=/(?:poikkeus|exception|holiday|special hours|avvikande|undantag)/.test(item.heading);
    if(inExceptions)continue;
    const inHours=/(?:aukiolo|opening hour|business hour|oppettid|öppettid)/.test(item.heading);
    // A day and a time may occupy different elements. Both must be in the
    // same heading/context, and we do not jump across intervening content.
    const combined=item.text.match(/^([^:\d]{2,24})\s*:?\s+(\d{1,2}(?::\d{2})?\s*[-–—]\s*\d{1,2}(?::\d{2})?|suljettu|closed|st[aä]ngt)$/i);
    const separate=recognizedDay(item.text)&&source[i+1]&&
      (source[i+1].heading===item.heading || (!item.heading && !source[i+1].heading));
    const day=combined?recognizedDay(combined[1]):(separate?recognizedDay(item.text):'');
    const value=day?hourRange(combined?combined[2]:source[i+1].text):'';
    if(!day||!value)continue;
    candidatePairs++;
    if(inHours)explicit=true;
    if(!matches.has(day))matches.set(day,value);
    else if(matches.get(day)!==value)return null;
    if(separate && !combined)i++;
  }
  // Require a real weekly schedule; a stray "Monday 8–20" sentence in a
  // support/footer section is not an entire store's operating hours.
  if(matches.size<3 || candidatePairs<3)return null;
  // Avoid attributing a completely undifferentiated footer timetable to a
  // store if there is not even a weekday-separated schedule.
  const ordered=days.filter(([short])=>matches.has(short))
    .map(([short])=>short+': '+matches.get(short));
  return {name:branch,sourceUrl:doc.url,hours:ordered.join(', '),days:matches.size,explicit};
}
