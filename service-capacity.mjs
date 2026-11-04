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
  const count=s.match(/\b(\d{1,3})\s*(?:isoa|isoja|isoo|suurta|pientä|pienia|ikkunaa|ikkunoita|fönster|windows?)\b/i)
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
const ms=v=>new Date(v).getTime();
export function fitServiceSlots(slots,minutes,busy=[],now=Date.now()){
  if(!Number.isFinite(minutes)||minutes<=0)throw new TypeError('Duration required');
  return (Array.isArray(slots)?slots:[]).filter(slot=>{
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
    service_key TEXT NOT NULL CHECK(service_key='window_cleaning'),
    config JSONB NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(tenant_id,service_key))`);
  await db.query(`CREATE TABLE IF NOT EXISTS public.respondo_service_dialogues(
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    visitor_ref TEXT NOT NULL,service_key TEXT NOT NULL,facts JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(tenant_id,visitor_ref))`);
  for(const table of ['respondo_service_capacity','respondo_service_dialogues']){
    await db.query('ALTER TABLE public.'+table+' ENABLE ROW LEVEL SECURITY');
    await db.query('REVOKE ALL PRIVILEGES ON TABLE public.'+table+' FROM PUBLIC,anon,authenticated,service_role');
  }
}
export async function readServiceRule(db,tenantId){
  const r=await db.query(`SELECT config,enabled FROM respondo_service_capacity
    WHERE tenant_id=$1 AND service_key='window_cleaning'`,[tenantId]);
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
export async function serviceDialogue(db,tenantId,visitorRef,message,lang,availableSlots){
  const visitor=tr(visitorRef,160);
  if(!visitor)return null;
  const rule=await readServiceRule(db,tenantId);
  if(!rule?.enabled)return null;
  const old=await db.query(`SELECT facts FROM respondo_service_dialogues
    WHERE tenant_id=$1 AND visitor_ref=$2 AND updated_at>NOW()-INTERVAL '45 minutes'`,[tenantId,visitor]);
  if(!old.rowCount&&!hasIntent(message))return null;
  // Do not trap the conversation after the service question has been answered.
  if (/^(?:kiitos|kiitti|thank you|thanks|tack|hei|moi|bye|heippa)[! .]*$/i.test(lower(message)))
    return null;
  const previousFacts=old.rows[0]?.facts||{};
  if(!hasIntent(message)&&!missingWindowFact(previousFacts)&&
    !/(?:aika|ajanvar|perjant|lauant|maanant|tiist|keskiviik|torst|sunnunt|klo|huomenna|tomorrow|booking|time|tid|fredag|friday|slot)/i.test(message))
    return null;
  const facts=parseWindowFacts(message,previousFacts);
  const words=serviceText(lang);
  await db.query(`INSERT INTO respondo_service_dialogues(tenant_id,visitor_ref,service_key,facts)
    VALUES($1,$2,'window_cleaning',$3::jsonb)
    ON CONFLICT(tenant_id,visitor_ref) DO UPDATE SET facts=EXCLUDED.facts,updated_at=NOW()`,
    [tenantId,visitor,JSON.stringify(facts)]);
  const missing=missingWindowFact(facts);
  if(missing)return {answer:words[missing],status:'needs_details',facts};
  const estimate=estimateWindowDuration(rule,facts);
  if(estimate.status!=='estimated')return {answer:words.unknown,status:'manual_review',facts};
  const duration=Math.floor(estimate.minutes/60)+' h '+(estimate.minutes%60?estimate.minutes%60+' min':'');
  try{
    const slots=await availableSlots(estimate.minutes);
    const dates=slots.slice(0,3).map(slot=>new Date(slot.starts_at).toLocaleString(
      lang==='sv'?'sv-SE':lang==='en'?'en-GB':'fi-FI',
      {timeZone:'Europe/Helsinki',weekday:'long',day:'numeric',month:'numeric',hour:'2-digit',minute:'2-digit'}));
    return {answer:words.duration+duration+'. '+(dates.length?words.options+dates.join(', ')+'. '+words.unknown:words.none),
      status:dates.length?'proposed':'no_slots',facts,estimate};
  }catch{
    return {answer:words.duration+duration+'. '+words.unavailable,status:'calendar_unverified',facts,estimate};
  }
}
