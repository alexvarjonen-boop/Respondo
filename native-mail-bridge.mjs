// Respondo native mailbox ingestion. Read-only external API access; no email sending.
import {randomUUID} from 'node:crypto';
import {readProvider,readGmailInbox,normalizeProviderItems} from './native-provider-adapters.mjs';
const clean=(v,n)=>String(v??'').trim().slice(0,n);
const safeEmail=v=>/^[^\s@]{1,128}@[^\s@]{1,160}\.[^\s@]{2,24}$/.test(v);
export function nativeMailboxProvider(value){return ['gmail','outlook'].includes(value);}
export async function ensureNativeMailBridgeSchema(db){
 await db.query(`CREATE TABLE IF NOT EXISTS respondo_native_mail_credentials(
   tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
   provider TEXT NOT NULL CHECK(provider IN ('gmail','outlook')),
   access_ciphertext TEXT NOT NULL,
   refresh_ciphertext TEXT,
   expires_at TIMESTAMPTZ,
   last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
   last_synced_at TIMESTAMPTZ,
   last_sync_error TEXT,
   PRIMARY KEY(tenant_id,provider)
 )`);
 await db.query(`CREATE TABLE IF NOT EXISTS respondo_native_mail_events(
   tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
   provider TEXT NOT NULL,
   message_id TEXT NOT NULL,
   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
   PRIMARY KEY(tenant_id,provider,message_id)
 )`);
 for(const name of ['respondo_native_mail_credentials','respondo_native_mail_events']){
  await db.query('ALTER TABLE '+name+' ENABLE ROW LEVEL SECURITY');
  await db.query('REVOKE ALL PRIVILEGES ON TABLE '+name+' FROM PUBLIC');
 }
}
export async function getNativeMailboxMessages(provider,token,{limit=20,fetcher=fetch}={}){
 if(!nativeMailboxProvider(provider))throw new TypeError('Unsupported mailbox');
 const data=provider==='gmail'?await readGmailInbox({token,limit,fetcher}):
  await readProvider({provider,token,limit,fetcher});
 return normalizeProviderItems(provider,data);
}
export async function storeNativeMailboxMessages(db,tenantId,provider,items){
 if(!nativeMailboxProvider(provider)||!/^[a-f\d-]{36}$/i.test(String(tenantId||'')))
  throw new TypeError('Invalid mailbox');
 if(!Array.isArray(items))throw new TypeError('Messages required');
 let imported=0;
 for(const item of items.slice(0,30)){
  const id=clean(item?.externalId,180),email=clean(item?.email,254).toLowerCase(),
   subject=clean(item?.title,250),snippet=clean(item?.snippet,1900);
  if(!id||!safeEmail(email)||(!snippet&&!subject))continue;
  const client=await db.connect();
  try{
   await client.query('BEGIN');
   const claimed=await client.query(`INSERT INTO respondo_native_mail_events(tenant_id,provider,message_id)
      VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING message_id`,[tenantId,provider,id]);
   if(!claimed.rowCount){await client.query('COMMIT');continue;}
   const contact=(provider+':'+email).slice(0,220);
   const thread=await client.query(`INSERT INTO chat_threads
      (id,tenant_id,source_channel,external_contact_id,visitor_ref,mode,status,last_activity_at)
      VALUES($1,$2,'email',$3,$4,'human','open',NOW())
      ON CONFLICT(tenant_id,source_channel,external_contact_id)
      DO UPDATE SET last_activity_at=NOW(),updated_at=NOW()
      RETURNING id`,[randomUUID(),tenantId,contact,contact.slice(0,160)]);
   await client.query(`INSERT INTO chat_messages
      (id,tenant_id,thread_id,source_channel,external_contact_id,visitor_ref,role,message,metadata)
      VALUES($1,$2,$3,'email',$4,$5,'user',$6,$7::jsonb)`,
      [randomUUID(),tenantId,thread.rows[0].id,contact,contact.slice(0,160),
       (subject?subject+'\n':'')+snippet,JSON.stringify({provider,providerMessageId:id})]);
   await client.query('COMMIT');
   imported++;
  }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error}
  finally{client.release();}
 }
 return {imported,autoSent:false,provider};
}
