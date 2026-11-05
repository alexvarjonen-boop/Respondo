// First-party, owner-approved Meta replies. No autonomous external messaging.
// Only replies to verified inbound chats inside a conservative 23-hour window.
import {randomUUID} from 'node:crypto';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const validNum=x=>/^[0-9]{5,30}$/.test(String(x??''));
const channels=['whatsapp','instagram','facebook'];
export function buildApprovedMetaReply({provider,resourceId,recipient,accessToken,text}){
 if(!channels.includes(provider)||!validNum(resourceId)||!validNum(recipient)||
  typeof accessToken!=='string'||accessToken.length<10||typeof text!=='string'||
  !text.trim()||text.length>4000||text!==text.trim())throw TypeError('Invalid approved Meta reply');
 const url='https://graph.facebook.com/v24.0/'+encodeURIComponent(resourceId)+'/messages';
 const payload=provider==='whatsapp'
  ?{messaging_product:'whatsapp',to:recipient,type:'text',text:{body:text}}
  :{recipient:{id:recipient},messaging_type:'RESPONSE',message:{text}};
 return {url,options:{method:'POST',redirect:'error',
  headers:{Authorization:'Bearer '+accessToken,'Content-Type':'application/json',Accept:'application/json'},
  body:JSON.stringify(payload)}};
}
export async function ensureNativeMetaOutboundSchema(db){
 await db.query(`CREATE TABLE IF NOT EXISTS respondo_native_meta_deliveries(
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  delivery_id UUID NOT NULL,
  thread_id UUID NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK(provider IN ('whatsapp','instagram','facebook')),
  resource_id TEXT NOT NULL,recipient TEXT NOT NULL,text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unknown' CHECK(status IN ('unknown','sent')),
  provider_response_id TEXT,approved_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(tenant_id,delivery_id)
 )`);
 await db.query('ALTER TABLE respondo_native_meta_deliveries ENABLE ROW LEVEL SECURITY');
 await db.query('REVOKE ALL PRIVILEGES ON TABLE respondo_native_meta_deliveries FROM PUBLIC');
 const r=await db.query("SELECT rolname FROM pg_roles WHERE rolname=ANY($1::text[])",[['anon','authenticated','service_role']]);
 for(const row of r.rows||[])if(['anon','authenticated','service_role'].includes(row.rolname))
  await db.query('REVOKE ALL PRIVILEGES ON TABLE respondo_native_meta_deliveries FROM '+row.rolname);
}
export async function sendApprovedNativeMeta(db,{tenantId,threadId,deliveryId,userId,text,approved,
 getAccessToken,fetcher=fetch,now=Date.now()}){
 if(!UUID.test(String(tenantId))||!UUID.test(String(threadId))||!UUID.test(String(deliveryId))||
  approved!==true||typeof text!=='string'||!text.trim()||text.length>4000)
  throw TypeError('Valid IDs, body and explicit approval are required');
 if(typeof getAccessToken!=='function')throw TypeError('Provider token resolver required');
 const client=await db.connect();let request,provider;
 try{
  await client.query('BEGIN');
  const thread=await client.query(`SELECT source_channel,external_contact_id,status FROM chat_threads
    WHERE tenant_id=$1 AND id=$2 FOR UPDATE`,[tenantId,threadId]);
  const t=thread.rows[0];
  if(!t||!channels.includes(t.source_channel)||t.status!=='open'||!validNum(t.external_contact_id))
   throw TypeError('Open Meta channel conversation required');
  provider=t.source_channel;
  const last=await client.query(`SELECT created_at FROM chat_messages
    WHERE tenant_id=$1 AND thread_id=$2 AND source_channel=$3 AND role='user'
    ORDER BY created_at DESC LIMIT 1`,[tenantId,threadId,provider]);
  const received=new Date(last.rows[0]?.created_at).getTime();
  // Safely refuse out-of-window free-form responses. Approved templates require a separate flow.
  if(!Number.isFinite(received)||received>now+60000||now-received>=23*3600000)
   throw TypeError('Meta customer care reply window expired');
  const connection=await client.query(`SELECT resource_id,access_token_encrypted
    FROM respondo_meta_connections WHERE tenant_id=$1 AND provider=$2`,[tenantId,provider]);
  const credential=connection.rows[0];
  if(!credential||!validNum(credential.resource_id))throw TypeError('Meta channel is not connected');
  const claimed=await client.query(`INSERT INTO respondo_native_meta_deliveries
    (tenant_id,delivery_id,thread_id,provider,resource_id,recipient,text,approved_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING RETURNING delivery_id`,
    [tenantId,deliveryId,threadId,provider,credential.resource_id,t.external_contact_id,text.trim(),String(userId||'').slice(0,120)]);
  if(!claimed.rowCount){
   const previous=await client.query(`SELECT thread_id,status FROM respondo_native_meta_deliveries
     WHERE tenant_id=$1 AND delivery_id=$2`,[tenantId,deliveryId]);
   if(String(previous.rows[0]?.thread_id)!==threadId)throw TypeError('Delivery ID already used elsewhere');
   await client.query('COMMIT');return {status:previous.rows[0].status,duplicate:true,autoRetry:false};
  }
  // This callback decrypts a single tenant-bound credential, never exposes it to the client.
  const token=getAccessToken(credential.access_token_encrypted);
  request=buildApprovedMetaReply({provider,resourceId:credential.resource_id,
    recipient:t.external_contact_id,accessToken:token,text:text.trim()});
  await client.query('COMMIT');
 }catch(e){await client.query('ROLLBACK').catch(()=>{});throw e}
 finally{client.release()}
 let response;
 try{response=await fetcher(request.url,{...request.options,signal:AbortSignal.timeout(12000)})}
 catch{return {status:'unknown',duplicate:false,autoRetry:false}}
 if(!response.ok)return {status:'unknown',duplicate:false,autoRetry:false,providerStatus:response.status};
 let remoteId='';
 try{const result=await response.json();remoteId=String(result?.messages?.[0]?.id||result?.message_id||'').slice(0,180)}catch{}
 const audit=await db.connect();
 try{
  await audit.query('BEGIN');
  const updated=await audit.query(`UPDATE respondo_native_meta_deliveries
    SET status='sent',provider_response_id=$3,updated_at=NOW()
    WHERE tenant_id=$1 AND delivery_id=$2 AND status='unknown'
    RETURNING provider,recipient,text`,[tenantId,deliveryId,remoteId]);
  if(updated.rowCount){
   const item=updated.rows[0],contact=item.recipient;
   await audit.query(`INSERT INTO chat_messages
     (id,tenant_id,thread_id,source_channel,external_contact_id,visitor_ref,role,message,metadata)
     VALUES($1,$2,$3,$4,$5,$6,'human',$7,$8::jsonb)`,
     [randomUUID(),tenantId,threadId,item.provider,contact,contact.slice(0,160),
      item.text,JSON.stringify({origin:'respondo_native_meta_reply',provider:item.provider,deliveryId,providerResponseId:remoteId})]);
   await audit.query(`UPDATE chat_threads SET updated_at=NOW(),last_activity_at=NOW()
     WHERE tenant_id=$1 AND id=$2`,[tenantId,threadId]);
   await audit.query('DELETE FROM respondo_native_inbox_drafts WHERE tenant_id=$1 AND thread_id=$2',[tenantId,threadId]);
  }
  await audit.query('COMMIT');
 }catch(e){await audit.query('ROLLBACK').catch(()=>{});throw e}
 finally{audit.release()}
 return {status:'sent',provider,duplicate:false,autoRetry:false};
}
