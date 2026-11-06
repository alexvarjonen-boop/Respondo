// Cost-free Respondo-signed inbound events for company-owned systems.
// No Zapier, external AI, outbound HTTP, payment or message delivery.
// A custom sender must implement these headers; this does NOT claim that
// Shopify/WooCommerce's native webhook signatures are compatible.
import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {putFreeOrderSnapshot} from './respondo-free-commerce.mjs';
import {validateContact} from './native-ai-operations.mjs';
import {enqueueNativeTask} from './native-taskboard.mjs';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EVENT=/^[A-Za-z0-9_.:-]{8,160}$/;
const NONCE=/^[a-f0-9]{36}$/;
const isUUID=x=>UUID.test(String(x||''));
function assertMaster(master){
 if(typeof master!=='string'||master.length<24)throw new TypeError('Webhook master secret missing');
}
export function deriveFreeWebhookSecret(tenantId,nonce,master){
 if(!isUUID(tenantId)||!NONCE.test(String(nonce)))throw new TypeError('Invalid webhook identity');
 assertMaster(master);
 return createHmac('sha256',master).update('respondo-free-inbound:v1:'+tenantId+':'+nonce)
  .digest('hex');
}
export function signFreeWebhookPayload(secret,timestamp,rawBody){
 if(typeof secret!=='string'||!/^[a-f0-9]{64}$/.test(secret)||
  !Buffer.isBuffer(rawBody)||!/^\d{10}$/.test(String(timestamp)))
  throw new TypeError('Invalid signed webhook parameters');
 const message=Buffer.concat([Buffer.from(String(timestamp)+'.'),rawBody]);
 return 'sha256='+createHmac('sha256',secret).update(message).digest('hex');
}
export function verifyFreeWebhook({tenantId,nonce,master,rawBody,timestamp,signature,eventId,now=Date.now()}){
 if(!isUUID(tenantId)||!EVENT.test(String(eventId||''))||!Buffer.isBuffer(rawBody)||
  rawBody.length===0||rawBody.length>30000)return false;
 const t=Number(timestamp);
 if(!Number.isSafeInteger(t)||t<1600000000||Math.abs(Math.floor(now/1000)-t)>300)
  return false;
 if(typeof signature!=='string'||!/^sha256=[0-9a-f]{64}$/.test(signature))
  return false;
 let expected;
 try{expected=signFreeWebhookPayload(deriveFreeWebhookSecret(tenantId,nonce,master),String(t),rawBody)}
 catch{return false}
 const x=Buffer.from(expected,'ascii'),y=Buffer.from(signature,'ascii');
 return x.length===y.length&&timingSafeEqual(x,y);
}
export async function ensureFreeWebhookSchema(db){
 await db.query(`CREATE TABLE IF NOT EXISTS public.respondo_free_webhook_keys(
  tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  nonce TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
 await db.query(`CREATE TABLE IF NOT EXISTS public.respondo_free_webhook_events(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('order_status','lead_captured')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id,event_id))`);
 for(const name of ['respondo_free_webhook_keys','respondo_free_webhook_events']){
  await db.query('ALTER TABLE public.'+name+' ENABLE ROW LEVEL SECURITY');
  await db.query('REVOKE ALL PRIVILEGES ON TABLE public.'+name+' FROM PUBLIC');
  const roles=await db.query("SELECT rolname FROM pg_roles WHERE rolname=ANY($1::text[])",[
   ['anon','authenticated','service_role']]);
  for(const row of roles.rows||[])
   if(['anon','authenticated','service_role'].includes(row.rolname))
    await db.query('REVOKE ALL PRIVILEGES ON TABLE public.'+name+' FROM '+row.rolname);
 }
}
export async function freeWebhookStatus(db,tenantId){
 if(!isUUID(tenantId))throw new TypeError('Invalid workspace');
 const r=await db.query('SELECT enabled,updated_at FROM respondo_free_webhook_keys WHERE tenant_id=$1',[tenantId]);
 return {enabled:r.rows[0]?.enabled===true,lastChangedAt:r.rows[0]?.updated_at||null,
  endpoint:'/api/webhooks/respondo-native/'+tenantId,signingSecretReturnedOnRotationOnly:true,
  externalApiCalls:0,providerNativeWebhookSignatureSupported:false};
}
export async function rotateFreeWebhookKey(db,tenantId,master){
 if(!isUUID(tenantId))throw new TypeError('Invalid workspace');
 assertMaster(master);
 const nonce=randomBytes(18).toString('hex');
 const r=await db.query(`INSERT INTO respondo_free_webhook_keys(tenant_id,nonce,enabled)
  VALUES($1,$2,TRUE)
  ON CONFLICT(tenant_id) DO UPDATE SET nonce=EXCLUDED.nonce,enabled=TRUE,updated_at=NOW()
  RETURNING enabled`,[tenantId,nonce]);
 return {enabled:r.rows[0]?.enabled===true,
  endpoint:'/api/webhooks/respondo-native/'+tenantId,
  signingSecret:deriveFreeWebhookSecret(tenantId,nonce,master),
  warning:'Copy this signing secret now. It will not be shown again.',
  paidProviderRequired:false};
}
export async function disableFreeWebhookKey(db,tenantId){
 if(!isUUID(tenantId))throw new TypeError('Invalid workspace');
 const r=await db.query(`UPDATE respondo_free_webhook_keys
   SET enabled=FALSE,updated_at=NOW() WHERE tenant_id=$1 RETURNING enabled`,[tenantId]);
 return {enabled:false,previouslyConfigured:Boolean(r.rowCount)};
}
export async function acceptFreeWebhookEvent(db,{tenantId,rawBody,eventId,timestamp,signature,master,now=Date.now()}){
 if(!isUUID(tenantId)||!Buffer.isBuffer(rawBody))throw new TypeError('Invalid event');
 const key=await db.query('SELECT nonce FROM respondo_free_webhook_keys WHERE tenant_id=$1 AND enabled=TRUE',[tenantId]);
 if(!key.rows[0]||!verifyFreeWebhook({tenantId,nonce:key.rows[0].nonce,master,
   rawBody,eventId,timestamp,signature,now}))
  throw new TypeError('Invalid webhook signature, timestamp or event ID');
 let data;
 try{data=JSON.parse(rawBody.toString('utf8'))}
 catch{throw new TypeError('Invalid JSON event')}
 if(!data||!['order_status','lead_captured'].includes(data.kind)||
    !data.data||typeof data.data!=='object'||Array.isArray(data.data))
  throw new TypeError('Unsupported webhook event');
 const event=data.kind==='order_status'
  ?{...data.data,approved:true}
  :validateContact(data.data);
 const client=await db.connect();
 try{
  await client.query('BEGIN');
  const claimed=await client.query(`INSERT INTO respondo_free_webhook_events
    (tenant_id,event_id,kind) VALUES($1,$2,$3)
    ON CONFLICT(tenant_id,event_id) DO NOTHING RETURNING id`,
    [tenantId,eventId,data.kind]);
  if(!claimed.rowCount){
   await client.query('COMMIT');
   return {accepted:true,duplicate:true,externalCalls:0};
  }
  if(data.kind==='order_status'){
   await putFreeOrderSnapshot(client,tenantId,event,{secret:master});
  }else{
   const leadId=claimed.rows[0].id;
   await client.query(`INSERT INTO respondo_native_contacts
    (tenant_id,source_lead_id,name,email,phone,note)
    VALUES($1,$2,$3,$4,$5,$6)
    ON CONFLICT(tenant_id,source_lead_id) DO NOTHING`,
    [tenantId,leadId,event.name,event.email,event.phone,event.note]);
   await enqueueNativeTask(client,tenantId,{
    sourceKind:'lead',sourceId:leadId,taskKey:'lead_followup',
    title:'Follow up: '+event.name,details:event.note,
    dueHours:24,priority:'normal'
   });
  }
  await client.query('COMMIT');
  return {accepted:true,duplicate:false,kind:data.kind,externalCalls:0};
 }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error}
 finally{client.release()}
}
