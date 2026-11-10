// First-party, tenant-private Growth Center. No paid AI calls, geocoding or outbound mail.
import {calculateNativeQuote} from './native-ai-operations.mjs';
import {runFreeQualitySuite} from './respondo-free-quality-gates.mjs';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const validTenant=id=>UUID.test(String(id||''));
const clean=(value,max=160)=>String(value??'').trim().slice(0,max);
const TONES=new Set(['standard','concise','friendly','formal']);
const postcodeQuestion=/\b(?:postinumero|posti(?:numero|koodi)|alueella|alueelle|palveletteko|toimitatteko|postnummer|postkod|levererar|betjänar|serviceområde|postcode|postal code|zip code|service area|deliver to|serve in)\b/i;

export function validateGrowthSettings(payload={}){
  if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new TypeError('Invalid settings');
  if(payload.confirm!==true)throw new TypeError('Explicit owner approval required');
  const tone=clean(payload.tone||'standard',20);
  if(!TONES.has(tone))throw new TypeError('Invalid greeting style');
  const input=payload.postalCodes;
  if(!Array.isArray(input)||input.length>200)throw new TypeError('Provide up to 200 Finnish postal codes');
  const postcodes=[...new Set(input.map(v=>String(v??'').trim()))];
  if(postcodes.some(v=>!/^\d{5}$/.test(v)))throw new TypeError('Each postal code must contain exactly five digits');
  return {tone,postalCodes:postcodes,source:'owner_approved_exact_codes',country:'FI'};
}

export function isPostcodeQuestion(message){
  const value=clean(message,1200);
  return /\b\d{5}\b/.test(value)&&postcodeQuestion.test(value);
}
export function serviceAreaResponse(message,lang,postalCodes=[]){
  if(!isPostcodeQuestion(message)||!Array.isArray(postalCodes)||!postalCodes.length)return null;
  const code=String(message).match(/\b\d{5}\b/)?.[0];
  if(!code)return null;
  const approved=postalCodes.includes(code),language=['fi','sv','en'].includes(lang)?lang:'en';
  const answers={
    fi:approved
      ? 'Postinumero '+code+' kuuluu yrityksen ilmoittamaan palvelualueeseen. Varmistamme työn saatavuuden ja mahdolliset lisämaksut erikseen.'
      : 'Postinumeron '+code+' palvelusaatavuutta ei ole vahvistettu yrityksen palvelualueluettelossa. Voit jättää tarkistuspyynnön.',
    sv:approved
      ? 'Postnummer '+code+' finns i företagets godkända serviceområde. Tillgänglighet och eventuella tilläggsavgifter behöver bekräftas separat.'
      : 'Företagets serviceområde har ännu inte bekräftats för postnummer '+code+'. Du kan skicka en förfrågan.',
    en:approved
      ? 'Postcode '+code+' is listed in the company’s approved service area. Availability and any additional charges still need confirmation.'
      : 'Service coverage has not yet been verified for postcode '+code+'. You can request a confirmation.'
  };
  return {answer:answers[language],intent:'Service area',postcode:code,
    listed:approved,bookingConfirmed:false,priceVerified:false,requiresAvailabilityCheck:true};
}

export function suggestedGreeting(tone,lang,existing='',custom=false){
  if(custom||!TONES.has(tone)||tone==='standard')return existing;
  const language=['fi','sv','en'].includes(lang)?lang:'en';
  const variants={
    concise:{fi:'Hei! Miten voin auttaa?',sv:'Hej! Hur kan jag hjälpa?',en:'Hi! How can I help?'},
    friendly:{fi:'Hei! Kiva kun otit yhteyttä. Miten voin auttaa?',sv:'Hej! Vad roligt att du hör av dig. Hur kan jag hjälpa?',en:'Hi! Thanks for reaching out. How can I help?'},
    formal:{fi:'Tervetuloa. Kuinka voimme auttaa?',sv:'Välkommen. Hur kan vi hjälpa er?',en:'Welcome. How may we assist you?'}
  };
  return variants[tone]?.[language]||existing;
}

export function customerIntentStage(message=''){
  const t=clean(message,600).toLowerCase();
  if(!t)return {stage:'unknown',requiresHumanConfirmation:false};
  if(/\b(?:ostan|haluan tilata|tilaan|buy now|i want to order|checkout|köp nu|jag vill beställa)\b/i.test(t))
    return {stage:'purchase_ready',requiresHumanConfirmation:false};
  if(/\b(?:tarjous|hinta|hinnasto|cost|price|quote|offert|pris)\b/i.test(t))
    return {stage:'comparing',requiresHumanConfirmation:false};
  return {stage:'researching',requiresHumanConfirmation:false};
}

export function compareAnswerDrafts({question,language='fi',first,second}={}){
  const lang=['fi','sv','en'].includes(language)?language:'en';
  const q=clean(question,1200),a=clean(first,3000),b=clean(second,3000);
  if(!q||!a||!b)throw new TypeError('A question and two answer drafts are required');
  const screening=runFreeQualitySuite({cases:[
    {question:q,answer:a,language:lang},
    {question:q,answer:b,language:lang}
  ]});
  return {variants:[
    {key:'A',words:a.split(/\s+/).length,flags:screening.results[0].flags},
    {key:'B',words:b.split(/\s+/).length,flags:screening.results[1].flags}
  ],decision:'manual_review_required',usesLiveTraffic:false,autoPublish:false,
  claimsAccuracy:false,claimsConversionLift:false,paidCalls:0};
}

export async function ensureGrowthOperationsSchema(db){
  await db.query('CREATE TABLE IF NOT EXISTS public.respondo_growth_settings ('+
    'tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,'+
    'postal_codes JSONB NOT NULL DEFAULT '+ "'[]'::jsonb,"+
    "tone TEXT NOT NULL DEFAULT 'standard' CHECK(tone IN ('standard','concise','friendly','formal')),"+
    'updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
  await db.query('CREATE TABLE IF NOT EXISTS public.respondo_widget_health ('+
    'tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,'+
    'host TEXT NOT NULL,last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),'+
    'activations BIGINT NOT NULL DEFAULT 1)');
  for(const name of ['respondo_growth_settings','respondo_widget_health']){
    await db.query('ALTER TABLE public.'+name+' ENABLE ROW LEVEL SECURITY');
    await db.query('REVOKE ALL PRIVILEGES ON TABLE public.'+name+' FROM PUBLIC');
    const roles=await db.query("SELECT rolname FROM pg_roles WHERE rolname=ANY($1::text[])",[['anon','authenticated','service_role']]);
    for(const role of roles.rows||[])if(['anon','authenticated','service_role'].includes(role.rolname))
      await db.query('REVOKE ALL PRIVILEGES ON TABLE public.'+name+' FROM '+role.rolname);
  }
}

export async function growthSettings(db,tenantId){
  if(!validTenant(tenantId))throw new TypeError('Invalid workspace');
  const r=await db.query('SELECT postal_codes,tone,updated_at FROM respondo_growth_settings WHERE tenant_id=$1',[tenantId]);
  const row=r.rows?.[0];
  return {tone:TONES.has(row?.tone)?row.tone:'standard',
    postalCodes:Array.isArray(row?.postal_codes)?row.postal_codes:[],
    country:'FI',ownerVerified:!!row,updatedAt:row?.updated_at||null};
}
export async function saveGrowthSettings(db,tenantId,payload){
  if(!validTenant(tenantId))throw new TypeError('Invalid workspace');
  const v=validateGrowthSettings(payload);
  const r=await db.query('INSERT INTO respondo_growth_settings(tenant_id,postal_codes,tone) '+
    "VALUES($1,$2::jsonb,$3) ON CONFLICT(tenant_id) DO UPDATE SET postal_codes=EXCLUDED.postal_codes,"+
    'tone=EXCLUDED.tone,updated_at=NOW() RETURNING updated_at',
    [tenantId,JSON.stringify(v.postalCodes),v.tone]);
  return {...v,updatedAt:r.rows?.[0]?.updated_at||null,requiresOwnerApproval:false};
}
export async function recordWidgetActivation(db,tenantId,host){
  if(!validTenant(tenantId)||!host||!/^[a-z0-9.-]{1,253}$/i.test(host))return false;
  const r=await db.query('INSERT INTO respondo_widget_health(tenant_id,host) VALUES($1,$2) '+
    'ON CONFLICT(tenant_id) DO UPDATE SET host=EXCLUDED.host,last_seen_at=NOW(),'+
    'activations=respondo_widget_health.activations+1 '+
    "WHERE respondo_widget_health.last_seen_at<NOW()-INTERVAL '10 minutes' RETURNING tenant_id",
    [tenantId,host]);
  return Boolean(r.rowCount);
}

export function chooseGrowthNextAction({approvedFacts=0,unanswered=0,lastWidgetSeen=null,leads=0}={}){
  if(approvedFacts===0)return {key:'knowledge',target:'settings',priority:'high'};
  if(unanswered>0)return {key:'quality',target:'automation',priority:'high'};
  if(!lastWidgetSeen || !Number.isFinite(Date.parse(String(lastWidgetSeen)))||
      Date.now()-Date.parse(String(lastWidgetSeen))>7*24*60*60*1000)
    return {key:'installation',target:'install',priority:'high'};
  if(leads===0)return {key:'test',target:'bot',priority:'normal'};
  return {key:'results',target:'automation',priority:'normal'};
}

export async function growthOverview(db,tenantId){
  if(!validTenant(tenantId))throw new TypeError('Invalid workspace');
  const [settings,widget,facts,gaps,leads]=await Promise.all([
    growthSettings(db,tenantId),
    db.query('SELECT host,last_seen_at,activations FROM respondo_widget_health WHERE tenant_id=$1',[tenantId]),
    db.query('SELECT COUNT(*)::int AS total FROM knowledge WHERE tenant_id=$1 AND approved=TRUE',[tenantId]),
    db.query('SELECT COUNT(*)::int AS total FROM conversations WHERE tenant_id=$1 AND (handoff=TRUE OR confidence<0.45) AND created_at>=NOW()-INTERVAL '+"'7 days'",[tenantId]),
    db.query('SELECT COUNT(*)::int AS total FROM leads WHERE tenant_id=$1 AND created_at>=NOW()-INTERVAL '+"'7 days'",[tenantId])
  ]);
  const lastSeen=widget.rows?.[0]?.last_seen_at||null;
  const approvedFacts=Number(facts.rows?.[0]?.total)||0;
  const unanswered=Number(gaps.rows?.[0]?.total)||0;
  const totalLeads=Number(leads.rows?.[0]?.total)||0;
  return {settings,widget:{lastSeenAt:lastSeen,host:widget.rows?.[0]?.host||null,
    successfulTokenRequests:Number(widget.rows?.[0]?.activations)||0,
    provenVisualEmbed:false,source:'successful_widget_token_requests'},
    approvedFacts,unansweredLast7Days:unanswered,leadsLast7Days:totalLeads,
    nextAction:chooseGrowthNextAction({approvedFacts,unanswered,lastWidgetSeen:lastSeen,leads:totalLeads}),
    providerConnectionsVerified:false};
}

export async function previewGrowthQuote(db,tenantId,quantity){
  if(!validTenant(tenantId))throw new TypeError('Invalid workspace');
  const r=await db.query('SELECT quote_base_price,quote_unit_price,quote_min_price,quote_vat_percent,quote_service_name FROM tenants WHERE id=$1',[tenantId]);
  if(!r.rows?.[0])throw new TypeError('Workspace not found');
  const result=calculateNativeQuote(r.rows[0],quantity);
  return {...result,status:'estimate_only',binding:false,requiresOwnerApproval:true,
    availabilityVerified:false,priceConfiguredByOwner:true};
}

export async function growthWeeklyReport(db,tenantId){
  if(!validTenant(tenantId))throw new TypeError('Invalid workspace');
  const [conversations,leads,requests]=await Promise.all([
    db.query('SELECT COUNT(*)::int AS messages,COUNT(*) FILTER (WHERE handoff=TRUE)::int AS handoffs,'+
      'COUNT(*) FILTER (WHERE handoff=FALSE AND cardinality(source_ids)>0)::int AS sourced '+
      "FROM conversations WHERE tenant_id=$1 AND created_at>=NOW()-INTERVAL '7 days'",[tenantId]),
    db.query('SELECT COUNT(*)::int AS leads FROM leads WHERE tenant_id=$1 AND created_at>=NOW()-INTERVAL '+"'7 days'",[tenantId]),
    db.query('SELECT request_type,COUNT(*)::int AS total FROM action_requests WHERE tenant_id=$1 '+
      "AND created_at>=NOW()-INTERVAL '7 days' AND request_type IN ('booking','quote','callback') GROUP BY request_type",[tenantId])
  ]);
  const stats=conversations.rows?.[0]||{},counts=Object.fromEntries((requests.rows||[]).map(r=>[r.request_type,Number(r.total)||0]));
  return {days:7,generatedAt:new Date().toISOString(),messages:Number(stats.messages)||0,
    humanHandoffs:Number(stats.handoffs)||0,sourcedBotAnswers:Number(stats.sourced)||0,
    leads:Number(leads.rows?.[0]?.leads)||0,
    bookingRequests:counts.booking||0,quoteRequests:counts.quote||0,callbackRequests:counts.callback||0,
    paidSalesVerified:false,customerResolutionVerified:false,delivery:'owner_download_only',
    noExternalEmailSent:true};
}
