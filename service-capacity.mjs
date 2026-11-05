const services=['window_cleaning'];
const tr=(v,n=200)=>String(v??'').trim().slice(0,n);
const lower=s=>tr(s,400).normalize('NFKC').toLowerCase();
const phrases={
fi:{count:'Kuinka monta ikkunaa pitäisi pestä?',size:'Ovatko ikkunat pieniä, keskikokoisia vai isoja?',sides:'Pestäänkö ikkunat yhdeltä vai molemmilta puolilta?',access:'Pääseekö ikkunoihin helposti käsiksi ilman erityisvälineitä?',unknown:'Työn kesto täytyy tarkistaa työntekijältä ennen ajan vahvistamista.',duration:'Työhön on hyvä varata arviolta ',none:'Tälle työlle ei löytynyt riittävän pitkää yhtäjaksoista aikaa. Voit jättää yhteydenottopyynnön.',options:'Nämä alustavat ajat näyttävät mahdollisilta: ',unavailable:'Kalenterin tilaa ei voitu tarkistaa, joten en voi luvata aikaa.'},
sv:{count:'Hur många fönster ska tvättas?',size:'Är fönstren små, medelstora eller stora?',sides:'Ska de tvättas på ena eller båda sidorna?',access:'Är fönstren lättåtkomliga utan specialutrustning?',unknown:'En medarbetare behöver bekräfta tidsåtgången innan bokning.',duration:'Arbetet beräknas ta ',none:'Ingen sammanhängande tid som är tillräckligt lång hittades. Du kan lämna en förfrågan.',options:'Dessa preliminära tider kan fungera: ',unavailable:'Kalendern kunde inte kontrolleras, så jag kan inte lova någon tid.'},
en:{count:'How many windows need cleaning?',size:'Are they small, medium, or large?',sides:'Should we clean one side or both sides?',access:'Are the windows easily accessible without special equipment?',unknown:'The team must check the job duration before confirming a time.',duration:'The estimated duration is ',none:'No continuous slot long enough is currently confirmed. You can request a callback.',options:'These tentative start times may work: ',unavailable:'Calendar availability could not be verified, so I cannot promise a time.'}
};
export const serviceText=lang=>phrases[lang]||phrases.fi;
const number=(v,min,max,name)=>{const n=Number(v);if(!Number.isFinite(n)||n<min||n>max)throw new TypeError('Invalid '+name);return n;};
export function validateServiceRule(value={}){
  const serviceKey=tr(value.serviceKey||'window_cleaning',40);
  if(/^custom_[a-z0-9_]{3,40}$/.test(serviceKey)){
    const serviceName=tr(value.serviceName,100),unitLabel=tr(value.unitLabel,32);
    const calculation=value.calculation==='quantity'?'quantity':'fixed';
    if(serviceName.length<3||!unitLabel)throw new TypeError('Service name and unit are required');
    const aliases=tr(value.aliases,480).split(',').map(x=>x.trim()).filter(Boolean);
    if(aliases.length>8||aliases.some(x=>x.length<2||x.length>60))
      throw new TypeError('Invalid service aliases');
    return {serviceKey,serviceName,unitLabel,calculation,aliases:aliases.join(', '),
      minutesPerUnit:number(value.minutesPerUnit,1,720,'minutesPerUnit'),
      maxUnits:Math.floor(number(value.maxUnits,1,10000,'maxUnits')),
      baseMinutes:number(value.baseMinutes,0,360,'baseMinutes'),
      bufferMinutes:number(value.bufferMinutes,0,180,'bufferMinutes'),
      enabled:value.enabled===true};
  }
  if(!services.includes(serviceKey))throw new TypeError('Unsupported service');
  return {serviceKey,minutesPerWindow:number(value.minutesPerWindow,1,180,'minutesPerWindow'),
    baseMinutes:number(value.baseMinutes,0,360,'baseMinutes'),bufferMinutes:number(value.bufferMinutes,0,180,'bufferMinutes'),
    largeMultiplier:number(value.largeMultiplier,1,4,'largeMultiplier'),
    doubleSidedMultiplier:number(value.doubleSidedMultiplier,1,3,'doubleSidedMultiplier'),
    difficultAccessMinutes:number(value.difficultAccessMinutes,0,240,'difficultAccessMinutes'),
    maxWindows:Math.floor(number(value.maxWindows,1,300,'maxWindows')),enabled:value.enabled===true};
}
export function parseWindowFacts(message,prior={}){
  const s=lower(message);
  const facts={...prior};
  const count=s.match(/\b(\d{1,3})\s*(?:isoa|isoja|isoo|suurta|pientä|pienia|large|big|stora|små|small|medium|ikkunaa|ikkunoita|fönster|windows?)\b/i)
    ||s.match(/\b(?:ikkunoita|ikkunaa|ikkunoi|fönster|windows?)\s*(\d{1,3})\b/i);
  if(count&&Number(count[1])>=1&&Number(count[1])<=300)facts.quantity=Number(count[1]);
  if(!facts.quantity&&/^\s*\d{1,3}\s*$/.test(s))facts.quantity=Number(s);
  if(/\b(?:isoja|isoa|isoo|suuria|suurta|suuret|large|big|stora|stort)\b/i.test(s))facts.size='large';
  else if(/\b(?:pienet|pieniä|pientä|small|små)\b/i.test(s))facts.size='small';
  else if(/(?:keskikokois|medium|medelstora)/i.test(s))facts.size='medium';
  if(/(?:molemmilta puolilta|molemmat puolet|molemmilt puolilt|kummaltakin puolelta|both sides|båda sidor)/i.test(s))facts.sides='both';
  else if(/(?:vain sisältä|vain ulkoa|yhdeltä puolelta|one side|ena sidan)/i.test(s))facts.sides='one';
  if(/(?:normaalisti pääsee|helposti pääsee|helppo päästä|helposti käsiksi|easy access|easily accessible|lätt att nå)/i.test(s))facts.access='easy';
  else if(/(?:tikapuu|nostin|vaikea päästä|hankala päästä|difficult access|ladder|lift required|svårt att nå)/i.test(s))facts.access='difficult';
  return facts;
}
export function missingWindowFact(facts){
  if(!Number.isInteger(facts.quantity)||facts.quantity<=0)return 'count';
  if(!['small','medium','large'].includes(facts.size))return 'size';
  if(!['one','both'].includes(facts.sides))return 'sides';
  if(!['easy','difficult'].includes(facts.access))return 'access';
  return null;
}
export function estimateWindowDuration(rule,facts){
  const config=validateServiceRule({...rule,serviceKey:'window_cleaning'});
  if(!config.enabled)throw new TypeError('Capacity estimate disabled');
  const missing=missingWindowFact(facts||{});
  if(missing)return {status:'needs_details',missing};
  if(facts.quantity>config.maxWindows)return {status:'manual_review',reason:'too_many_windows'};
  const size=facts.size==='large'?config.largeMultiplier:1; // no unapproved small-window discount
  const sides=facts.sides==='both'?config.doubleSidedMultiplier:1;
  const access=facts.access==='difficult'?config.difficultAccessMinutes:0;
  const minutes=Math.ceil(config.baseMinutes+facts.quantity*config.minutesPerWindow*size*sides+
    access+config.bufferMinutes);
  if(!Number.isFinite(minutes)||minutes<1||minutes>1440)return {status:'manual_review',reason:'unsafe_duration'};
  return {status:'estimated',minutes,requiredMinutes:minutes,approximate:true};
}
/** A duration is derived from an explicitly approved company rule, not guessed. */
export function estimateServiceDuration(rule,facts={}){
  if(!rule?.enabled)throw new TypeError('Capacity estimate disabled');
  if(rule.serviceKey==='window_cleaning')return estimateWindowDuration(rule,facts);
  const config=validateServiceRule(rule);
  const quantity=config.calculation==='fixed'?1:facts.quantity;
  if(!Number.isInteger(quantity)||quantity<1)return {status:'needs_details',missing:'quantity'};
  if(quantity>config.maxUnits)return {status:'manual_review',reason:'too_many_units'};
  const minutes=Math.ceil(config.baseMinutes+config.bufferMinutes+quantity*config.minutesPerUnit);
  if(!Number.isFinite(minutes)||minutes<1||minutes>1440)
    return {status:'manual_review',reason:'unsafe_duration'};
  return {status:'estimated',minutes,requiredMinutes:minutes,approximate:true};
}
const ms=v=>new Date(v).getTime();
export function fitServiceSlots(slots,minutes,busy=[],now=Date.now()){
  if(!Number.isFinite(minutes)||minutes<=0)throw new TypeError('Duration required');
  return (Array.isArray(slots)?slots:[]).filter(slot=>{
    // A slot marked booked/blocked must never be treated as available.
    if(slot.status && slot.status!=='open')return false;
    const a=ms(slot.starts_at),b=ms(slot.ends_at);
    if(!Number.isFinite(a)||!Number.isFinite(b)||a<=now||b-a<minutes*60000)return false;
    return !busy.some(x=>{
      const start=ms(x.start),end=ms(x.end);
      return !Number.isFinite(start)||!Number.isFinite(end)||start<b&&end>a;
    });
  });
}
const hasIntent=s=>/(?:ikkunanpes|ikkunoiden pes|ikkunoita pes|window clean|window wash|fönsterputs|fönstertvätt)/i.test(lower(s));
export async function ensureServiceCapacitySchema(db){
  await db.query(`CREATE TABLE IF NOT EXISTS public.respondo_service_capacity(
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    service_key TEXT NOT NULL,
    config JSONB NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(tenant_id,service_key))`);
  // Upgrade the original window-cleaning-only schema without deleting its data.
  await db.query('ALTER TABLE public.respondo_service_capacity DROP CONSTRAINT IF EXISTS respondo_service_capacity_service_key_check');
  await db.query(`CREATE TABLE IF NOT EXISTS public.respondo_service_dialogues(
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    visitor_ref TEXT NOT NULL,service_key TEXT NOT NULL,facts JSONB NOT NULL DEFAULT '{}'::jsonb,
    preferred_text TEXT NOT NULL DEFAULT '',updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(tenant_id,visitor_ref))`);
  for(const table of ['respondo_service_capacity','respondo_service_dialogues']){
    await db.query('ALTER TABLE public.'+table+' ENABLE ROW LEVEL SECURITY');
    await db.query('REVOKE ALL PRIVILEGES ON TABLE public.'+table+' FROM PUBLIC,anon,authenticated,service_role');
  }
}
export async function readServiceRule(db,tenantId,serviceKey='window_cleaning'){
  if(serviceKey!=='window_cleaning'&&!/^custom_[a-z0-9_]{3,40}$/.test(serviceKey))return null;
  const r=await db.query(`SELECT config,enabled FROM respondo_service_capacity
    WHERE tenant_id=$1 AND service_key=$2`,[tenantId,serviceKey]);
  return r.rows[0]?{...r.rows[0].config,enabled:r.rows[0].enabled}:null;
}
export async function saveServiceRule(db,tenantId,value){
  const rule=validateServiceRule(value);
  const r=await db.query(`INSERT INTO respondo_service_capacity(tenant_id,service_key,config,enabled)
    VALUES($1,$2,$3::jsonb,$4) ON CONFLICT(tenant_id,service_key)
    DO UPDATE SET config=EXCLUDED.config,enabled=EXCLUDED.enabled,updated_at=NOW()
    RETURNING config,enabled`,[tenantId,rule.serviceKey,JSON.stringify(rule),rule.enabled]);
  return {...r.rows[0].config,enabled:r.rows[0].enabled};
}

const appointmentIntent=s=>/(?:\baikaa\b|\bajanvar|\bvapaa.{0,8}aik|\bklo\s*\d|\bkello\s*\d|\bappointment|\bbook|\bfree.{0,10}time|\bledig|\btid\b)/i.test(lower(s));
function requestedClock(value){
  const s=lower(value);
  const weekdays=[/(?:sunnunt|söndag|sunday)/,/(?:maanant|måndag|monday)/,
    /(?:tiist|tisdag|tuesday)/,/(?:keskiviik|onsdag|wednesday)/,
    /(?:torst|torsdag|thursday)/,/(?:perjant|fredag|friday)/,
    /(?:lauant|lördag|saturday)/];
  const weekday=weekdays.findIndex(x=>x.test(s));
  const all=[...s.matchAll(/(?:\bklo\.?|\bkello|\bkl\.?|\bat)\s*(\d{1,2})(?::(\d{2}))?/g)];
  const last=all.at(-1);
  const hour=last?Number(last[1]):null;
  const minute=last?Number(last[2]||0):0;
  const ampm=/\b(?:pm|afternoon|eftermiddag)|iltapäiv|illalla/i.test(s);
  const morning=/\b(?:am|morning|förmiddag)|aamulla|aamupäiv/i.test(s);
  const rawHour=ampm&&hour!==null&&hour>=1&&hour<=11?hour+12:hour;
  return {weekday,hour:rawHour,minute,ambiguous:hour!==null&&hour>=1&&hour<=11&&!ampm&&!morning};
}
function slotLocalClock(date){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Europe/Helsinki',
    weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(date));
  const fields=Object.fromEntries(parts.map(x=>[x.type,x.value]));
  return {weekday:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(fields.weekday),
    hour:Number(fields.hour),minute:Number(fields.minute)};
}
function amendPreferredTime(previous,utterance){
  const prior=requestedClock(previous);
  const next=requestedClock(utterance);
  const raw=lower(utterance);
  const bare=raw.match(/^(\d{1,2})(?::(\d{2}))?$/);
  const isAfternoon=/(?:iltapäiv|illalla|afternoon|eftermiddag|\bpm\b)/i.test(raw);
  const isMorning=/(?:aamulla|aamupäiv|morning|förmiddag|\bam\b)/i.test(raw);
  const changedDay=next.weekday>=0;
  const changedClock=next.hour!==null||Boolean(bare);
  if(!changedDay&&!changedClock&&!isAfternoon&&!isMorning)return previous;
  const weekday=changedDay?next.weekday:prior.weekday;
  let hour=changedClock?(next.hour??Number(bare[1])):changedDay?null:prior.hour;
  const minute=changedClock?(next.hour!==null?next.minute:Number(bare[2]||0)):
    changedDay?0:prior.minute;
  if(isAfternoon&&hour!==null&&hour>=1&&hour<=11)hour+=12;
  if(isMorning&&hour===12)hour=0;
  // A changed weekday with no time must not inherit the old day’s clock.
  // Do not silently reuse a stale appointment when an invalid clock is supplied.
  if(hour!==null&&(!Number.isInteger(hour)||hour<0||hour>23||
    !Number.isInteger(minute)||minute<0||minute>59))return '';
  const days=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const day=weekday>=0?days[weekday]:'';
  const explicitMorning=isMorning||(!changedClock&&!changedDay&&/\bam\b/i.test(previous));
  const clock=hour===null?'':'at '+String(hour).padStart(2,'0')+':'+
    String(minute).padStart(2,'0')+(hour<12&&explicitMorning?' am':'');
  return [day,clock].filter(Boolean).join(' ');
}
function serviceFollowup(lang,key){
  const values={
    fi:{service:'Tarkoitatko ikkunanpesua? Kerro palvelu, niin tarkistan työajan.',clock:'Tarkennatko, tarkoititko klo 3 aamulla vai klo 15 iltapäivällä?',unavailable:'Toivomaasi aikaa ei löytynyt koko työmäärälle. '},
    sv:{service:'Gäller det fönstertvätt? Ange tjänsten så kontrollerar jag arbetstiden.',clock:'Menade du kl. 03 på morgonen eller kl. 15 på eftermiddagen?',unavailable:'Den önskade tiden är inte bekräftad för hela arbetet. '},
    en:{service:'Is this for window cleaning? Please confirm the service before I check duration.',clock:'Did you mean 3 AM or 3 PM (15:00)?',unavailable:'The requested time was not verified for the full job. '}
  };
  return (values[lang]||values.fi)[key];
}

export async function listServiceRules(db,tenantId){
  const r=await db.query('SELECT config,enabled FROM respondo_service_capacity WHERE tenant_id=$1 ORDER BY updated_at DESC LIMIT 50',[tenantId]);
  return (r.rows||[]).map(x=>({...x.config,enabled:x.enabled}));
}
function customMatch(message,rules){
  const content=lower(message);
  return rules.find(rule=>
    [rule.serviceName,...String(rule.aliases||'').split(',')].some(name=>
      name.trim().length>=3&&content.includes(lower(name.trim()))));
}
function customQuantity(message,rule,old={}){
  const facts={...old,_serviceKey:rule.serviceKey};
  if(rule.calculation==='fixed')return {...facts,quantity:1};
  const value=lower(message),unit=lower(rule.unitLabel);
  const terms=[unit];
  if(/^(?:m²|m2|neliö|neliötä)$/.test(unit))terms.push('m2','m²','neliö','neliötä','neliötä');
  if(/^(?:kpl|pcs|st|pieces)$/.test(unit))terms.push('kpl','pcs','pieces','kappaletta');
  const escape=x=>x.replace(/[.*+?^{}()|[\]\\]/g,'\\$&');
  const re=new RegExp('(?:^|\\s)(\\d{1,5})\\s*(?:'+terms.map(escape).join('|')+')(?=\\s|$|[.,;!?])','iu');
  const match=value.match(re);
  if(match&&Number(match[1])>0)facts.quantity=Number(match[1]);
  else if(/^\d{1,5}$/.test(value)&&Number(value)>0)facts.quantity=Number(value);
  return facts;
}
function customWords(lang){
  const all={
    fi:{service:'Minkä palvelun haluat varata?',quantity:'Paljonko työtä on? Ilmoita määrä yksikössä',duration:'Arvioitu työaika on ',none:'Riittävän pitkää yhtäjaksoista aikaa ei löytynyt. Voit jättää yhteydenottopyynnön.',options:'Mahdollisia aloitusaikoja: ',review:'Työaika vahvistetaan työntekijän tarkistuksen jälkeen.',unavailable:'Kalenteria ei voitu tarkistaa, joten en voi luvata aikaa.'},
    sv:{service:'Vilken tjänst vill du boka?',quantity:'Hur stor är arbetsmängden? Ange mängden i enheten',duration:'Uppskattad arbetstid är ',none:'Ingen tillräckligt lång sammanhängande tid hittades. Du kan skicka en förfrågan.',options:'Möjliga starttider: ',review:'Personalen måste granska arbetstiden före bekräftelse.',unavailable:'Kalendern kunde inte kontrolleras, så jag kan inte lova en tid.'},
    en:{service:'Which service would you like to book?',quantity:'How much work is needed? Give the quantity in',duration:'The estimated duration is ',none:'No sufficiently long continuous slot was found. You can submit an enquiry.',options:'Possible starting times: ',review:'Staff must review the duration before confirmation.',unavailable:'The calendar could not be checked, so I cannot promise a time.'}
  };
  return all[lang]||all.fi;
}
async function customServiceDialogue(db,tenantId,visitor,message,lang,availableSlots,rule,old={},rules=[]){
  const words=customWords(lang);
  const previousService=old.facts?._serviceKey;
  const facts=previousService===rule?.serviceKey?{...old.facts}:{};
  let preferred=tr(old.preferred_text||'',300);
  if(!rule){
    const names=rules.map(x=>x.serviceName).slice(0,8).join(', ');
    await db.query(`INSERT INTO respondo_service_dialogues
      (tenant_id,visitor_ref,service_key,facts,preferred_text)
      VALUES($1,$2,'pending',$3::jsonb,$4)
      ON CONFLICT(tenant_id,visitor_ref) DO UPDATE SET service_key=EXCLUDED.service_key,
        facts=EXCLUDED.facts,preferred_text=EXCLUDED.preferred_text,updated_at=NOW()`,
      [tenantId,visitor,JSON.stringify({_genericPending:true}),preferred||tr(message,300)]);
    return {answer:words.service+' '+names+'.',status:'needs_service'};
  }
  preferred=preferred?amendPreferredTime(preferred,message):tr(message,300);
  const updated=customQuantity(message,rule,facts);
  await db.query(`INSERT INTO respondo_service_dialogues
    (tenant_id,visitor_ref,service_key,facts,preferred_text)
    VALUES($1,$2,$3,$4::jsonb,$5)
    ON CONFLICT(tenant_id,visitor_ref) DO UPDATE SET service_key=EXCLUDED.service_key,
      facts=EXCLUDED.facts,preferred_text=EXCLUDED.preferred_text,updated_at=NOW()`,
    [tenantId,visitor,rule.serviceKey,JSON.stringify(updated),preferred]);
  const estimate=estimateServiceDuration(rule,updated);
  if(estimate.status==='needs_details')return {answer:words.quantity+' '+rule.unitLabel+'?',status:'needs_details',facts:updated};
  if(estimate.status!=='estimated')return {answer:words.review,status:'manual_review',facts:updated};
  const duration=Math.floor(estimate.minutes/60)+' h '+
    (estimate.minutes%60?estimate.minutes%60+' min':'');
  const requested=requestedClock(preferred);
  if(requested.ambiguous)return {answer:words.duration+duration+'. '+serviceFollowup(lang,'clock'),status:'needs_time',facts:updated,estimate};
  try{
    const slots=await availableSlots(estimate.minutes);
    const matches=requested.weekday>=0?slots.filter(x=>{
      const clock=slotLocalClock(x.starts_at);
      return clock.weekday===requested.weekday&&
        (requested.hour===null||(clock.hour===requested.hour&&clock.minute===requested.minute));
    }):[];
    const sorted=[...matches,...slots.filter(x=>!matches.includes(x))];
    const times=sorted.slice(0,3).map(x=>new Date(x.starts_at).toLocaleString(
      lang==='sv'?'sv-SE':lang==='en'?'en-GB':'fi-FI',
      {timeZone:'Europe/Helsinki',weekday:'long',day:'numeric',month:'numeric',hour:'2-digit',minute:'2-digit'}));
    return {answer:words.duration+duration+'. '+
      (times.length?words.options+times.join(', ')+'. '+words.review:words.none),
      status:times.length?'proposed':'no_slots',facts:updated,estimate};
  }catch{
    return {answer:words.duration+duration+'. '+words.unavailable,
      status:'calendar_unverified',facts:updated,estimate};
  }
}

export async function serviceDialogue(db,tenantId,visitorRef,message,lang,availableSlots){
  const visitor=tr(visitorRef,160);
  if(!visitor)return null;
  const rules=await listServiceRules(db,tenantId);
  const rule=rules.find(x=>x.serviceKey==='window_cleaning'&&x.enabled);
  const custom=rules.filter(x=>x.serviceKey?.startsWith('custom_')&&x.enabled);
  if(!rule&&!custom.length)return null;
  const previous=await db.query(`SELECT facts,preferred_text FROM respondo_service_dialogues
    WHERE tenant_id=$1 AND visitor_ref=$2 AND updated_at>NOW()-INTERVAL '45 minutes'`,[tenantId,visitor]);
  const old=previous.rows[0]||{};
  const named=customMatch(message,custom);
  const priorCustom=custom.find(x=>x.serviceKey===old.facts?._serviceKey);
  const isService=hasIntent(message),isAppointment=appointmentIntent(message);
  if(custom.length&&(named||priorCustom||old.facts?._genericPending||
    (isAppointment&&!isService))){
    return customServiceDialogue(db,tenantId,visitor,message,lang,availableSlots,
      named||priorCustom||null,old,custom);
  }
  if(!rule)return null;
  if(!previous.rowCount&&!isService&&!isAppointment)return null;
  const words=serviceText(lang);
  if(/^(?:kiitos|kiitti|thank you|thanks|tack|hei|moi|bye|heippa)[! .]*$/i.test(lower(message)))
    return null;
  let facts=old.facts||{};
  let preferredText=tr(old.preferred_text||'',300);
  if(!previous.rowCount&&!isService){
    // A generic calendar question does not establish which service is needed.
    // Ask, rather than assuming that every enquiry is for window cleaning.
    await db.query(`INSERT INTO respondo_service_dialogues
      (tenant_id,visitor_ref,service_key,facts,preferred_text)
      VALUES($1,$2,'window_cleaning',$3::jsonb,$4)`,
      [tenantId,visitor,JSON.stringify({_servicePending:true}),tr(message,300)]);
    return {answer:serviceFollowup(lang,'service'),status:'needs_service'};
  }
  if(facts._servicePending){
    if(/^(?:ei|no|nej|not really)/i.test(lower(message))){
      await db.query('DELETE FROM respondo_service_dialogues WHERE tenant_id=$1 AND visitor_ref=$2',[tenantId,visitor]);
      return null;
    }
    if(!isService&&!/^(?:joo|kyllä|yes|ja|jo|on)\b/i.test(lower(message))&&
      !(parseWindowFacts(message,{}).quantity>0&&/(?:ikkun|window|fönster)/i.test(message)))
      return {answer:serviceFollowup(lang,'service'),status:'needs_service'};
    facts={};
  }
  if(!isService&&!missingWindowFact(facts)&&!isAppointment&&
    !/(?:perjant|friday|fredag|maanant|monday|måndag|tiist|tuesday|tisdag|keskiviik|wednesday|onsdag|torsdag|torst|lauant|saturday|lördag|söndag|sunnunt|sunday|huomenna|tomorrow)/i.test(message)&&
    !/^(?:\s*\d{1,2}(?::\d{2})?\s*|\s*(?:klo|kello|at|kl)\s*\d{1,2}(?::\d{2})?)$/i.test(message)&&
    !/(?:iltapäiv|illalla|aamulla|aamupäiv|afternoon|morning|eftermiddag|förmiddag|\bpm\b|\bam\b)/i.test(message))
    return null;
  facts=parseWindowFacts(message,facts);
  if(!preferredText)preferredText=tr(message,250);
  else preferredText=amendPreferredTime(preferredText,message);
  await db.query(`INSERT INTO respondo_service_dialogues
    (tenant_id,visitor_ref,service_key,facts,preferred_text)
    VALUES($1,$2,'window_cleaning',$3::jsonb,$4)
    ON CONFLICT(tenant_id,visitor_ref) DO UPDATE SET
      facts=EXCLUDED.facts,preferred_text=EXCLUDED.preferred_text,updated_at=NOW()`,
    [tenantId,visitor,JSON.stringify(facts),preferredText]);
  const missing=missingWindowFact(facts);
  if(missing)return {answer:words[missing],status:'needs_details',facts};
  const estimate=estimateWindowDuration(rule,facts);
  if(estimate.status!=='estimated')return {answer:words.unknown,status:'manual_review',facts};
  const duration=Math.floor(estimate.minutes/60)+' h '+
    (estimate.minutes%60?estimate.minutes%60+' min':'');
  const requested=requestedClock(preferredText);
  if(requested.ambiguous)return {answer:words.duration+duration+'. '+
    serviceFollowup(lang,'clock'),status:'needs_time',facts,estimate};
  try{
    const available=await availableSlots(estimate.minutes);
    const matches=requested.weekday>=0
      ?available.filter(x=>{
          const clock=slotLocalClock(x.starts_at);
          return clock.weekday===requested.weekday&&
            (requested.hour===null||
              (clock.hour===requested.hour&&clock.minute===requested.minute));
        })
      :[];
    const sorted=[...matches,...available.filter(x=>!matches.includes(x))];
    const dates=sorted.slice(0,3).map(x=>new Date(x.starts_at).toLocaleString(
      lang==='sv'?'sv-SE':lang==='en'?'en-GB':'fi-FI',
      {timeZone:'Europe/Helsinki',weekday:'long',day:'numeric',month:'numeric',hour:'2-digit',minute:'2-digit'}));
    const missed=requested.weekday>=0&&!matches.length
      ?serviceFollowup(lang,'unavailable'):'';
    return {answer:words.duration+duration+'. '+missed+
      (dates.length?words.options+dates.join(', ')+'. '+words.unknown:words.none),
      status:dates.length?'proposed':'no_slots',facts,estimate};
  }catch{
    return {answer:words.duration+duration+'. '+words.unavailable,
      status:'calendar_unverified',facts,estimate};
  }
}
