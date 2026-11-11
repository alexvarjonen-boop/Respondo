// First-party Respondo Customer Operations: safe intake, owner-only agency, link tracking.
// No paid API, no automatic external delivery or binding booking.
import {randomBytes,createHash} from 'node:crypto';
import {classifyLeadIntent} from './lead-qualification.mjs';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const uuid=value=>UUID.test(String(value||''));
const clean=(v,max=160)=>String(v??'').replace(/[\x00-\x1f\x7f]/g,' ').trim().slice(0,max);
const codes=['moving_quote','service_quote','booking_request'];
const field=(key,label,type='text',required=true)=>({key,label,type,required});
const specs={
 moving_quote:{actionType:'quote',title:['Muuttopalvelun tarjouspyyntö','Flyttoffert','Moving service quote'],
  fields:[
   field('from',['Lähtöosoite','Avsändaradress','Moving from']),
   field('to',['Kohdeosoite','Destinationsadress','Moving to']),
   field('size',['Asunnon koko (m²)','Bostadens storlek (m²)','Home size (m²)'],'number'),
   field('floor',['Kerros','Våning','Floor']),
   field('lift',['Hissi käytössä?','Finns hiss?','Elevator available?']),
   field('date',['Toivottu muuttopäivä','Önskat flyttdatum','Preferred moving date'],'date'),
   field('extra',['Lisätietoja','Ytterligare information','Additional details'],'textarea',false)]},
 service_quote:{actionType:'quote',title:['Palvelutarjous','Offertförfrågan','Service quote request'],
  fields:[
   field('service',['Tarvittava palvelu','Önskad tjänst','Service needed']),
   field('scope',['Työn määrä tai kuvaus','Arbetets omfattning','Job size or description']),
   field('postcode',['Postinumero','Postnummer','Postal code']),
   field('date',['Toivottu ajankohta','Önskat datum','Preferred date'],'date',false),
   field('extra',['Lisätietoja','Ytterligare information','Additional details'],'textarea',false)]},
 booking_request:{actionType:'callback',title:['Ajanvarauksen kartoitus','Bokningsförfrågan','Appointment enquiry'],
  fields:[
   field('service',['Palvelu','Tjänst','Service']),
   field('date',['Toivottu päivä','Önskat datum','Preferred date'],'date'),
   field('time',['Toivottu kellonaika','Önskad tid','Preferred time']),
   field('scope',['Työn arvioitu laajuus','Arbetets omfattning','Expected job scope'],'textarea',false)]}
};
export function procedureCatalog(active=[]){
 const enabled=new Set(active);
 return codes.map(code=>({code,actionType:specs[code].actionType,
  title:specs[code].title,fields:specs[code].fields,enabled:enabled.has(code),
  requiresHumanApproval:true}));
}
export function validateProcedureSelection(code,enabled){
 if(!codes.includes(code)||typeof enabled!=='boolean')throw new TypeError('Invalid procedure');
 return {code,enabled};
}
export function validateProcedureSubmission(code,answers={}){
 if(!codes.includes(code)||!answers||Array.isArray(answers)||typeof answers!=='object')
  throw new TypeError('Invalid procedure');
 const p=specs[code],fields={};
 for(const f of p.fields){
  const value=clean(answers[f.key],f.type==='textarea'?500:180);
  if(f.required&&!value)throw new TypeError('Missing required field: '+f.key);
  if(f.type==='date'&&value&&!/^\d{4}-\d{2}-\d{2}$/.test(value))
   throw new TypeError('Invalid date');
  if(f.type==='number'&&value&&(!Number.isFinite(Number(value))||Number(value)<=0||Number(value)>100000))
   throw new TypeError('Invalid job size');
  if(value)fields[f.key]=value;
 }
 return {code,actionType:p.actionType,fields,
  details:p.fields.filter(f=>fields[f.key]).map(f=>f.label[2]+': '+fields[f.key]).join(' | ').slice(0,1700),
  humanReviewRequired:true,bookingConfirmed:false,approvedQuote:false};
}
export function quoteBreakdown(tenant,quantity){
 const n=Number(quantity);
 if(!Number.isFinite(n)||n<=0||n>100000||!Number.isInteger(n*1000))
  throw new TypeError('Invalid quantity');
 const money=v=>Number.isFinite(Number(v))&&Number(v)>=0?Number(v):0;
 const base=money(tenant.quote_base_price),unit=money(tenant.quote_unit_price),
  min=money(tenant.quote_min_price),vat=Math.min(30,money(tenant.quote_vat_percent));
 if(!(base>0||unit>0||min>0))throw new TypeError('Company pricing is not configured');
 const subtotal=Math.max(min,base+unit*n),total=Math.round(subtotal*(1+vat/100)*100);
 if(!Number.isSafeInteger(total)||total>100000000)throw new TypeError('Estimate out of range');
 return {service:clean(tenant.quote_service_name||'Service'),quantity:n,
  baseCents:Math.round(base*100),unitCents:Math.round(unit*100),
  minimumCents:Math.round(min*100),subtotalCents:Math.round(subtotal*100),
  totalCents:total,vatPercent:vat,currency:'EUR',
  status:'unapproved_estimate',binding:false,bookingConfirmed:false,
  travelFeesVerified:false,actualSaleConfirmed:false};
}
export function qualifyInquiryAction(type,fields={}){
 const text=[type==='quote'?'quote':type==='booking'?'booking':
  type==='callback'?'contact':'',clean(fields.details,600)].join(' ');
 const signal=classifyLeadIntent(text);
 return {intent:signal.intent==='unknown'?type:signal.intent,confidence:signal.confidence,
  contactProvided:Boolean(clean(fields.contact,150)),confirmedSale:false};
}
export async function ensureCustomerOperationsSchema(db){
 await db.query('CREATE TABLE IF NOT EXISTS public.respondo_customer_procedures ('+
  'tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,'+
  "code TEXT NOT NULL CHECK(code IN ('moving_quote','service_quote','booking_request')),"+
  'enabled BOOLEAN NOT NULL DEFAULT FALSE,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),'+
  'PRIMARY KEY(tenant_id,code))');
 await db.query('CREATE TABLE IF NOT EXISTS public.respondo_customer_request_links ('+
  'id UUID PRIMARY KEY DEFAULT gen_random_uuid(),'+
  'tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,'+
  'action_id UUID NOT NULL,token_hash TEXT NOT NULL UNIQUE,'+
  "expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW()+INTERVAL '30 days'),"+
  'revoked_at TIMESTAMPTZ,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),'+
  'UNIQUE(tenant_id,action_id))');
 await db.query('CREATE TABLE IF NOT EXISTS public.respondo_customer_request_updates ('+
  'id UUID PRIMARY KEY DEFAULT gen_random_uuid(),'+
  'tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,'+
  'action_id UUID NOT NULL,note TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
 await db.query('CREATE INDEX IF NOT EXISTS idx_request_updates_scope '+
  'ON public.respondo_customer_request_updates(tenant_id,action_id,created_at)');
 for(const table of ['respondo_customer_procedures','respondo_customer_request_links',
   'respondo_customer_request_updates']){
  await db.query('ALTER TABLE public.'+table+' ENABLE ROW LEVEL SECURITY');
  await db.query('REVOKE ALL PRIVILEGES ON TABLE public.'+table+' FROM PUBLIC');
  const roles=await db.query("SELECT rolname FROM pg_roles WHERE rolname=ANY($1::text[])",
   [['anon','authenticated','service_role']]);
  for(const role of roles.rows||[])if(['anon','authenticated','service_role'].includes(role.rolname))
   await db.query('REVOKE ALL PRIVILEGES ON TABLE public.'+table+' FROM '+role.rolname);
 }
}
export async function tenantProcedures(db,tenantId){
 if(!uuid(tenantId))throw new TypeError('Invalid company');
 const r=await db.query('SELECT code FROM respondo_customer_procedures WHERE tenant_id=$1 AND enabled=TRUE',[tenantId]);
 return procedureCatalog((r.rows||[]).map(x=>x.code));
}
export async function saveTenantProcedure(db,tenantId,payload={}){
 if(!uuid(tenantId)||payload.confirm!==true)throw new TypeError('Owner approval required');
 const v=validateProcedureSelection(payload.code,payload.enabled);
 const r=await db.query('INSERT INTO respondo_customer_procedures(tenant_id,code,enabled) '+
  'VALUES($1,$2,$3) ON CONFLICT(tenant_id,code) DO UPDATE SET enabled=EXCLUDED.enabled,updated_at=NOW() '+
  'RETURNING code,enabled',[tenantId,v.code,v.enabled]);
 return {...r.rows[0],humanApprovalRequired:true};
}
const hash=token=>createHash('sha256').update(token).digest('hex');
export const trackingTokenValid=token=>/^[0-9a-f]{64}$/i.test(String(token||''));
export async function issueRequestTrackingLink(db,tenantId,actionId){
 if(!uuid(tenantId)||!uuid(actionId))throw new TypeError('Invalid request');
 const token=randomBytes(32).toString('hex');
 const r=await db.query('INSERT INTO respondo_customer_request_links (tenant_id,action_id,token_hash) '+
  'SELECT tenant_id,id,$3 FROM action_requests WHERE tenant_id=$1 AND id=$2 '+
  'ON CONFLICT(tenant_id,action_id) DO UPDATE SET token_hash=EXCLUDED.token_hash,'+
  "expires_at=NOW()+INTERVAL '30 days',revoked_at=NULL RETURNING expires_at",
  [tenantId,actionId,hash(token)]);
 if(!r.rowCount)throw new TypeError('Request not found');
 return {token,expiresAt:r.rows[0].expires_at};
}
export async function requestTrackingStatus(db,token){
 if(!trackingTokenValid(token))return null;
 const r=await db.query('SELECT t.name,a.request_type,a.status,a.created_at,a.updated_at '+
  'FROM respondo_customer_request_links l JOIN action_requests a '+
  'ON a.id=l.action_id AND a.tenant_id=l.tenant_id JOIN tenants t ON t.id=l.tenant_id '+
  'WHERE l.token_hash=$1 AND l.revoked_at IS NULL AND l.expires_at>NOW() LIMIT 1',
  [hash(token.toLowerCase())]);
 const row=r.rows?.[0];if(!row)return null;
 return {companyName:clean(row.name),type:row.request_type,
  status:['new','in_progress','done'].includes(row.status)?row.status:'new',
  createdAt:row.created_at,updatedAt:row.updated_at,
  verifiedSale:false,confirmedAppointment:false,quoteAccepted:false};
}
export async function addCustomerTrackingNote(db,token,note){
 if(!trackingTokenValid(token))throw new TypeError('Invalid link');
 const text=clean(note,650);
 if(text.length<3)throw new TypeError('Add a short message');
 const client=await db.connect();
 try{
  await client.query('BEGIN');
  const access=await client.query('SELECT l.tenant_id,l.action_id '+
   'FROM respondo_customer_request_links l JOIN action_requests a '+
   'ON a.id=l.action_id AND a.tenant_id=l.tenant_id '+
   'WHERE l.token_hash=$1 AND l.revoked_at IS NULL AND l.expires_at>NOW() FOR UPDATE OF l',
   [hash(token.toLowerCase())]);
  if(!access.rowCount)throw new TypeError('Link unavailable');
  const {tenant_id,action_id}=access.rows[0];
  const count=await client.query('SELECT COUNT(*)::int AS count FROM respondo_customer_request_updates '+
   'WHERE tenant_id=$1 AND action_id=$2',[tenant_id,action_id]);
  if(Number(count.rows[0]?.count)>=5)throw new TypeError('Maximum five updates');
  await client.query('INSERT INTO respondo_customer_request_updates(tenant_id,action_id,note) '+
   'VALUES($1,$2,$3)',[tenant_id,action_id,text]);
  await client.query('COMMIT');
  return {received:true,status:'awaiting_company_review'};
 }catch(e){await client.query('ROLLBACK').catch(()=>{});throw e;}
 finally{client.release();}
}
export async function ownerRequestUpdates(db,tenantId,actionId){
 if(!uuid(tenantId)||!uuid(actionId))throw new TypeError('Invalid request');
 const r=await db.query('SELECT note,created_at FROM respondo_customer_request_updates '+
  'WHERE tenant_id=$1 AND action_id=$2 ORDER BY created_at DESC LIMIT 5',[tenantId,actionId]);
 return {updates:r.rows||[]};
}
export async function agencyWorkspaceSummary(db,ownerId){
 if(!clean(ownerId,160))throw new TypeError('Invalid owner');
 const r=await db.query('SELECT t.id,t.name,t.slug,t.subscription_plan,t.subscription_status,'+
  '(t.id=active_tenant_for_user($1)) AS selected,'+
  "COALESCE((SELECT COUNT(*) FROM leads l WHERE l.tenant_id=t.id AND l.created_at>=NOW()-INTERVAL '30 days'),0)::int AS leads_30d,"+
  "COALESCE((SELECT COUNT(*) FROM action_requests a WHERE a.tenant_id=t.id AND a.created_at>=NOW()-INTERVAL '30 days'),0)::int AS requests_30d "+
  'FROM tenants t WHERE t.owner_user_id=$1 ORDER BY t.created_at ASC LIMIT 50',[ownerId]);
 return {workspaces:r.rows||[],windowDays:30,whiteLabelEnabled:false,
  partnerCommissionsConfigured:false,ownerOnly:true};
}
export async function customerOpsOverview(db,tenantId){
 if(!uuid(tenantId))throw new TypeError('Invalid workspace');
 const [procedures,requests]=await Promise.all([
  tenantProcedures(db,tenantId),
  db.query('SELECT id,request_type,status,created_at,payload->'+"'fields'"+' AS fields '+
   "FROM action_requests WHERE tenant_id=$1 AND created_at>=NOW()-INTERVAL '30 days' "+
   'ORDER BY created_at DESC LIMIT 60',[tenantId])
 ]);
 return {procedures,qualifiedRequests:(requests.rows||[]).map(x=>({
  id:x.id,type:x.request_type,status:x.status,createdAt:x.created_at,
  qualification:qualifyInquiryAction(x.request_type,x.fields||{})
 })),verifiedRevenueAvailable:false,automationRequiresApproval:true};
}
