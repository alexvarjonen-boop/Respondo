// Only consume facts explicitly published in schema.org JSON-LD.
// Source is recorded for every fact; never infer opening hours or availability.
const clean = value => String(value ?? '').replace(/<[^>]*>/g, ' ')
  .replace(/\s+/g, ' ').trim();

const types = node => (Array.isArray(node?.['@type']) ? node['@type'] : [node?.['@type']])
  .filter(x => typeof x === 'string')
  .map(x => x.split('/').pop().toLowerCase());
const BUSINESS_TYPES=new Set([
  'localbusiness','store','automotivebusiness','autorepair','motorcyclerepair',
  'restaurant','cafeorcoffeeshop','bakery','barorpub','foodestablishment',
  'medicalbusiness','medicalclinic','dentist','physician','pharmacy',
  'beautysalon','hairsalon','healthandbeautybusiness','sportsactivitylocation',
  'lodgingbusiness','hotel','motel','bedandbreakfast','hostel',
  'professionalservice','homesandconstructionbusiness','plumber',
  'electrician','roofingcontractor','movingcompany','locksmith',
  'realestateagent','financialservice','insuranceagency','bankorcreditunion',
  'childcare','educationalorganization','school','fitnesscenter',
]);
const DAY_KEYS=[
  ['Ma',['monday','mo','maanantai','måndag','mandag','ma']],
  ['Ti',['tuesday','tu','tiistai','tisdag','ti']],
  ['Ke',['wednesday','we','keskiviikko','onsdag','ke']],
  ['To',['thursday','th','torstai','torsdag','to']],
  ['Pe',['friday','fr','perjantai','fredag','pe']],
  ['La',['saturday','sa','lauantai','lördag','lordag','la']],
  ['Su',['sunday','su','sunnuntai','söndag']],
];
const DAY_NAME=new Map(DAY_KEYS.flatMap(([day,aliases])=>aliases.map(alias=>[alias,day])));
const WEEKDAYS=DAY_KEYS.map(([day])=>day);
const norm = value => clean(value).toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const dayKey = raw => {
  const t=norm(String(raw||'').split('/').pop());
  return DAY_NAME.get(t)||'';
};
const validURL = (raw,base) => {
  if(typeof raw!=='string'||!raw.trim()||/[<>{}"'\s]/.test(raw))return '';
  try{
    const u=new URL(raw.trim(),base);
    if(!['http:','https:'].includes(u.protocol)||u.username||u.password)return '';
    return u.toString();
  }catch{return '';}
};
const time = raw => {
  const value=clean(raw);
  const m=value.match(/^(\d{1,2})(?::(\d{2}))?(?::00)?$/);
  if(!m)return '';
  const h=Number(m[1]),min=Number(m[2]||0);
  if(h>24||min>59||(h===24&&min>0))return '';
  return String(h).padStart(2,'0')+':'+String(min).padStart(2,'0');
};
const branchName=(node,origin) => {
  // A chain-level Organization is not a branch. Require LocalBusiness +
  // explicit city/address or a location-specific URL to name a branch.
  if(!types(node).some(type=>BUSINESS_TYPES.has(type)))return '';
  const address=node?.address;
  const locality=typeof address==='object' && !Array.isArray(address)
    ? clean(address.addressLocality).slice(0,65) : '';
  const nodeURL=validURL(node?.url,origin);
  if(nodeURL){
    const path=new URL(nodeURL).pathname;
    const m=path.match(/\/(?:tavaratalot|toimipisteet|myymalat|myymälät|stores|shops|locations|branches|butiker|store|location)\/([^/?#]+)/i);
    if(m) {
      try{
        const title=decodeURIComponent(m[1]).replace(/[-_]+/g,' ').trim();
        if(/^[\p{L}\p{N}\s-]{3,65}$/u.test(title))return title.replace(/\b\p{L}/gu,x=>x.toUpperCase());
      }catch{}
    }
  }
  if(!locality || !/^[\p{L}\s-]{3,65}$/u.test(locality))return '';
  return locality;
};

function scheduleFromSpecification(spec) {
  const result=new Map();
  for(const item of (Array.isArray(spec)?spec:[spec]).slice(0,60)){
    if(!item||typeof item!=='object')continue;
    const opens=time(item.opens),closes=time(item.closes);
    if(!opens||!closes||opens===closes)continue;
    const rawDays=Array.isArray(item.dayOfWeek)?item.dayOfWeek:[item.dayOfWeek];
    const expanded=[];
    for(const value of rawDays){
      const key=dayKey(value);
      if(key)expanded.push(key);
      else if(typeof value==='string'){
        const m=value.match(/^([A-Za-z]+)\s*[-–]\s*([A-Za-z]+)$/);
        if(m){
          const start=dayKey(m[1]),end=dayKey(m[2]);
          const a=WEEKDAYS.indexOf(start),b=WEEKDAYS.indexOf(end);
          if(a>=0&&b>=a)expanded.push(...WEEKDAYS.slice(a,b+1));
        }
      }
    }
    for(const key of expanded){
      const hours=opens+' - '+closes;
      if(!result.has(key))result.set(key,hours);
      else if(result.get(key)!==hours)result.set(key,'CONFLICT');
    }
  }
  if([...result.values()].includes('CONFLICT'))return '';
  return WEEKDAYS.filter(key=>result.has(key)).map(key=>key+': '+result.get(key)).join(', ');
}
function scheduleFromString(input){
  const result=new Map();
  for(const item of (Array.isArray(input)?input:[input]).slice(0,20)){
    if(typeof item!=='string')continue;
    const parts=item.split(/[,;\n]+/);
    for(const part of parts){
      const m=part.trim().match(/^([A-Za-z]+)(?:\s*[-–]\s*([A-Za-z]+))?\s+(\d{1,2}(?::\d{2})?)\s*[-–]\s*(\d{1,2}(?::\d{2})?)$/);
      if(!m)continue;
      const a=dayKey(m[1]),b=m[2]?dayKey(m[2]):a;
      const start=WEEKDAYS.indexOf(a),end=WEEKDAYS.indexOf(b);
      const opens=time(m[3]),closes=time(m[4]);
      if(start<0||end<start||!opens||!closes||opens===closes)continue;
      for(const key of WEEKDAYS.slice(start,end+1)){
        const value=opens+' - '+closes;
        if(!result.has(key))result.set(key,value);
        else if(result.get(key)!==value)result.set(key,'CONFLICT');
      }
    }
  }
  if([...result.values()].includes('CONFLICT'))return '';
  return WEEKDAYS.filter(key=>result.has(key)).map(key=>key+': '+result.get(key)).join(', ');
}

function serviceLocations(value){
  const labels=[];
  const walk=(item)=>{
    if(Array.isArray(item)){item.slice(0,40).forEach(walk);return;}
    const text=typeof item==='string'?item:
      item && typeof item==='object' ? item.name||item.address?.addressLocality||'' : '';
    if(typeof text!=='string')return;
    const val=clean(text);
    if(val.length<3||val.length>60||!/^[\p{L}0-9\s,.-]+$/u.test(val))return;
    if(!labels.some(x=>norm(x)===norm(val)))labels.push(val);
  };
  walk(value);
  return labels.slice(0,35);
}
function bookingURL(node,base){
  const actions=(Array.isArray(node?.potentialAction)?node.potentialAction:[node?.potentialAction]);
  for(const action of actions.slice(0,12)){
    const type=types(action);
    if(!type.some(x=>['reserveaction','scheduleaction','bookaction'].includes(x)))continue;
    const targets=Array.isArray(action?.target)?action.target:[action?.target];
    for(const entry of targets){
      const target=typeof entry==='string'?entry:entry?.urlTemplate||entry?.url||'';
      const url=validURL(target,base);
      if(url && !/\/(?:contact|yhteystiedot|kontakt|ota-yhteytta)(?:\/|$)/i.test(new URL(url).pathname))return url;
    }
  }
  return '';
}

export function structuredBusinessFacts(html,pageUrl){
  const result=[];
  const seen=new Set();
  const pageHost=(()=>{try{return new URL(pageUrl).hostname.toLowerCase();}catch{return '';}})();
  if(!pageHost)return [];
  const push=(category,title,answer,url,keywords=[])=>{
    const sourceUrl=validURL(url,pageUrl);
    if(!sourceUrl||new URL(sourceUrl).hostname.toLowerCase()!==pageHost)return;
    const text=clean(answer);
    if(!text||text.length>1000)return;
    const key=[category,title,text,sourceUrl].join('|').toLowerCase();
    if(seen.has(key))return;
    seen.add(key);
    result.push({category,title,answer:text,keywords,sourceUrl});
  };
  let scripts=0;
  for(const match of String(html||'').matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)){
    if(++scripts>130)break;
    if(!/\btype\s*=\s*(?:"application\/ld\+json"|'application\/ld\+json'|application\/ld\+json)/i.test(match[1]))continue;
    if(match[2].length>800000)continue;
    let data;
    try{data=JSON.parse(match[2].trim());}catch{continue;}
    const visited=new WeakSet();
    let visitedCount=0;
    const visit=(node,depth=0)=>{
      if(depth>7||++visitedCount>450||!node||typeof node!=='object')return;
      if(Array.isArray(node)){node.slice(0,120).forEach(x=>visit(x,depth+1));return;}
      if(visited.has(node))return;
      visited.add(node);
      const ts=types(node);
      const business=ts.some(t=>BUSINESS_TYPES.has(t)||t==='organization'||t==='corporation');
      if(business){
        // Ignore third-party business nodes entirely. A retailer may embed
        // structured data describing a supplier, marketplace or partner.
        const official=validURL(node.url,pageUrl);
        if(official && new URL(official).hostname.toLowerCase()!==pageHost)return;
        const source=official||pageUrl;
        const branch=branchName(node,pageUrl);
        const schedule=scheduleFromSpecification(node.openingHoursSpecification)
          || scheduleFromString(node.openingHours);
        if(schedule)push('Aukioloajat',branch?'Aukioloajat: '+branch:'Aukioloajat',
          schedule,source,['aukioloajat','opening hours','öppettider',...(branch?[branch]:[])]);
        // areaServed describes a service area, not the business's street address.
        const areas=serviceLocations(node.areaServed||node.serviceArea);
        const serviceAreas=[];
        for(const area of areas){
          if(([...serviceAreas,area].join(', ')).length>290)break;
          serviceAreas.push(area);
        }
        if(serviceAreas.length)push('Toimialue','Toimialue',serviceAreas.join(', '),source,
          ['toimialue','palvelualue','service area','serviceområde']);
        const booking=bookingURL(node,pageUrl);
        if(booking)push('Ajanvaraus','Ajanvarauslinkki',booking,source,
          ['ajanvaraus','booking','appointment','tidsbokning']);
      }
      for(const prop of ['@graph','department','subOrganization','location','mainEntity']){
        if(node[prop] && typeof node[prop]==='object')visit(node[prop],depth+1);
      }
    };
    visit(data);
  }
  return result.slice(0,400);
}
