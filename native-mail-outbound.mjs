// Only a workspace owner-approved reply to an imported email can leave Respondo.
// Ambiguous deliveries are quarantined, never automatically retried.
import {randomUUID} from 'node:crypto';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const email=/^[^\s<>@\r\n]{1,128}@[^\s<>@\r\n]{1,160}\.[^\s<>@\r\n]{2,24}$/;
const clean=(x,n)=>String(x??'').trim().slice(0,n);
const safeHeader=(x,n)=>clean(x,n).replace(/[\r\n\x00-\x1f\x7f]/g,' ');
export function buildApprovedMailRequest({provider,token,recipient,text,messageId,subject,threadId,originalRfcId}){
 if(!['gmail','outlook'].includes(provider)||typeof token!=='string'||token.length<10)throw TypeError('Invalid provider token');
 if(!email.test(recipient)||!text||text!==text.trim()||text.length>4000||/[\x00]/.test(text))throw TypeError('Invalid recipient or body');
 if(!/^[A-Za-z0-9._=+/-]{1,180}$/.test(String(messageId||'')))throw TypeError('Invalid original message');
 const headers={Authorization:'Bearer '+token,'Content-Type':'application/json',Accept:'application/json'};
 if(provider==='outlook'){
  return {url:'https://graph.microsoft.com/v1.0/me/messages/'+encodeURIComponent(messageId)+'/reply',
   options:{method:'POST',headers,body:JSON.stringify({comment:text}),redirect:'error'}};
 }
 if(!/^[A-Za-z0-9_-]{1,180}$/.test(String(threadId||'')))throw TypeError('Missing Gmail thread');
 if(!/^<[^<>\r\n]{3,250}>$/.test(String(originalRfcId||'')))throw TypeError('Missing original Message-ID');
 const subjectPlain=safeHeader(subject||'',180).replace(/^re:\s*/i,'');
 const subjectLine=/[^\x20-\x7e]/.test(subjectPlain)
  ?'=?UTF-8?B?'+Buffer.from(subjectPlain,'utf8').toString('base64')+'?=':subjectPlain;
 const mime=['To: '+recipient,'Subject: Re: '+subjectLine,
  'In-Reply-To: '+originalRfcId,'References: '+originalRfcId,
  'MIME-Version: 1.0','Content-Type: text/plain; charset=UTF-8',
  'Content-Transfer-Encoding: base64','',''];
 const encodedBody=Buffer.from(text,'utf8').toString('base64').match(/.{1,76}/g)?.join('\r\n')||'';
 const raw=Buffer.from(mime.join('\r\n')+encodedBody+'\r\n').toString('base64url');
 return {url:'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
  options:{method:'POST',headers,body:JSON.stringify({raw,threadId}),redirect:'error'}};
}
export async function ensureNativeMailDeliverySchema(db){
 await db.query(`CREATE TABLE IF NOT EXISTS respondo_native_mail_deliveries(
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  delivery_id UUID NOT NULL,
  thread_id UUID NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK(provider IN ('gmail','outlook')),
  recipient TEXT NOT NULL,
  text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unknown' CHECK(status IN ('unknown','sent')),
  provider_response_id TEXT,
  approved_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(tenant_id,delivery_id)
 )`);
 await db.query('ALTER TABLE respondo_native_mail_deliveries ENABLE ROW LEVEL SECURITY');
 await db.query('REVOKE ALL PRIVILEGES ON TABLE respondo_native_mail_deliveries FROM PUBLIC');
 const roles=await db.query("SELECT rolname FROM pg_roles WHERE rolname=ANY($1::text[])",[['anon','authenticated','service_role']]);
 for(const row of roles.rows||[])if(['anon','authenticated','service_role'].includes(row.rolname))
  await db.query('REVOKE ALL PRIVILEGES ON TABLE respondo_native_mail_deliveries FROM '+row.rolname);
}
export async function sendApprovedNativeMail(db,{tenantId,threadId,deliveryId,userId,text,approved,token,fetcher=fetch}){
 if(!uuid.test(tenantId)||!uuid.test(threadId)||!uuid.test(deliveryId)||approved!==true)
  throw TypeError('Explicit owner approval and valid IDs required');
 if(typeof text!=='string'||!text.trim()||text.length>4000)throw TypeError('Invalid approved reply');
 // The intent is durably claimed BEFORE network I/O. If the provider times out,
 // the status remains unknown, requiring human inspection rather than a retry.
 const client=await db.connect();let data;
 try{
  await client.query('BEGIN');
  const t=await client.query(`SELECT id,source_channel,external_contact_id,status
   FROM chat_threads WHERE id=$1 AND tenant_id=$2 FOR UPDATE`,[threadId,tenantId]);
  if(!t.rows[0]||t.rows[0].source_channel!=='email'||t.rows[0].status==='closed')
   throw TypeError('Open imported email conversation required');
  const msg=await client.query(`SELECT metadata,message FROM chat_messages
   WHERE tenant_id=$1 AND thread_id=$2 AND role='user' AND source_channel='email'
   ORDER BY created_at DESC LIMIT 1`,[tenantId,threadId]);
  const m=msg.rows[0]?.metadata;
  const provider=m?.provider;
  if(!['gmail','outlook'].includes(provider))throw TypeError('No supported provider message');
  const recipient=clean(t.rows[0].external_contact_id,254).slice(provider.length+1);
  if(!String(t.rows[0].external_contact_id).startsWith(provider+':')||!email.test(recipient))
   throw TypeError('Unverified recipient');
  const originalId=clean(m.providerMessageId,180);
  const subject=clean(m.subject,180);
  const request=buildApprovedMailRequest({provider,token,recipient,text:text.trim(),
   messageId:originalId,subject,threadId:m.providerThreadId,originalRfcId:m.originalRfcId});
  const claimed=await client.query(`INSERT INTO respondo_native_mail_deliveries
   (tenant_id,delivery_id,thread_id,provider,recipient,text,approved_by)
   VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING RETURNING delivery_id`,
   [tenantId,deliveryId,threadId,provider,recipient,text.trim(),clean(userId,120)]);
  if(!claimed.rowCount){
   const old=await client.query(`SELECT thread_id,status,text,provider,recipient FROM respondo_native_mail_deliveries
    WHERE tenant_id=$1 AND delivery_id=$2`,[tenantId,deliveryId]);
   if(String(old.rows[0]?.thread_id)!==threadId||
      old.rows[0]?.text!==text.trim()||old.rows[0]?.provider!==provider||
      old.rows[0]?.recipient!==recipient)
      throw TypeError('Delivery identifier reused for different content');
   await client.query('COMMIT');
   return {status:old.rows[0].status,duplicate:true,autoRetry:false};
  }
  await client.query('COMMIT');
  data={provider,request,recipient};
 }catch(e){await client.query('ROLLBACK').catch(()=>{});throw e}
 finally{client.release()}
 let response;
 try{
  response=await fetcher(data.request.url,{...data.request.options,signal:AbortSignal.timeout(12000)});
 }catch(e){return {status:'unknown',duplicate:false,autoRetry:false}}
 if(!response.ok){
  // Provider 4xx/5xx can be ambiguous after transport; never retry automatically.
  return {status:'unknown',duplicate:false,autoRetry:false,providerStatus:response.status};
 }
 let remoteId='';
 if(data.provider==='gmail')try{
  const reply=await response.json();remoteId=clean(reply?.id,180);
 }catch{}
 const audit=await db.connect();
 try{
  await audit.query('BEGIN');
  const updated=await audit.query(`UPDATE respondo_native_mail_deliveries
    SET status='sent',provider_response_id=$3,updated_at=NOW()
    WHERE tenant_id=$1 AND delivery_id=$2 AND status='unknown'
    RETURNING thread_id,provider,recipient,text`,[tenantId,deliveryId,remoteId]);
  if(updated.rowCount){
   const item=updated.rows[0];
   await audit.query(`INSERT INTO chat_messages(
     id,tenant_id,thread_id,source_channel,external_contact_id,visitor_ref,role,message,metadata)
     VALUES($1,$2,$3,'email',$4,$5,'human',$6,$7::jsonb)`,
     [randomUUID(),tenantId,threadId,item.provider+':'+item.recipient,
      (item.provider+':'+item.recipient).slice(0,160),item.text,
      JSON.stringify({origin:'respondo_native_mail_reply',provider:item.provider,
       deliveryId,providerResponseId:remoteId})]);
   await audit.query(`UPDATE chat_threads SET last_activity_at=NOW(),updated_at=NOW()
     WHERE tenant_id=$1 AND id=$2`,[tenantId,threadId]);
   await audit.query(`DELETE FROM respondo_native_inbox_drafts
     WHERE tenant_id=$1 AND thread_id=$2`,[tenantId,threadId]);
  }
  await audit.query('COMMIT');
 }catch(e){await audit.query('ROLLBACK').catch(()=>{});throw e}
 finally{audit.release()}
 return {status:'sent',duplicate:false,autoRetry:false};
}
