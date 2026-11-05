// First-party, tenant-scoped CRM read/import. No third-party AI or silent updates.
// Existing Respondo contact records are never overwritten by remote data.
import {readCrmCredential} from './crm-connectors.mjs';
const clean=(v,n)=>String(v??'').trim().slice(0,n);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const mail=/^[^\s@]{1,128}@[^\s@]{1,160}\.[^\s@]{2,24}$/;
export function normalizeCrmContacts(provider,data){
 let rows;
 if(provider==='hubspot')rows=data?.results;
 else if(provider==='pipedrive')rows=data?.data;
 else throw TypeError('Unsupported CRM provider');
 if(!Array.isArray(rows))throw Error('Unexpected CRM contact response');
 return rows.slice(0,40).map(row=>{
  const p=provider==='hubspot'?row.properties||{}:row;
  const name=provider==='hubspot'?[p.firstname,p.lastname].filter(Boolean).join(' '):p.name;
  const e=provider==='hubspot'?p.email:(Array.isArray(p.emails)?p.emails[0]?.value:p.email?.[0]?.value||p.email);
  const phone=provider==='hubspot'?p.phone:(Array.isArray(p.phones)?p.phones[0]?.value:p.phone?.[0]?.value||p.phone);
  return {externalId:clean(row.id,100),name:clean(name,120),email:clean(e,254).toLowerCase(),
   phone:clean(phone,40)};
 }).filter(x=>x.externalId&&x.name&&(mail.test(x.email)||x.phone.length>=6));
}
export async function fetchNativeCrmContacts(provider,token,{fetcher=fetch}={}){
 if(!['hubspot','pipedrive'].includes(provider)||typeof token!=='string'||token.length<15)
  throw TypeError('CRM account must be connected');
 const url=provider==='hubspot'
  ?'https://api.hubapi.com/crm/v3/objects/contacts?limit=40&properties=email,firstname,lastname,phone'
  :'https://api.pipedrive.com/api/v2/persons?limit=40';
 const headers=provider==='hubspot'?{authorization:'Bearer '+token,accept:'application/json'}:
  {'x-api-token':token,accept:'application/json'};
 const res=await fetcher(url,{method:'GET',headers,redirect:'error',
  signal:AbortSignal.timeout(10000)});
 if(!res.ok)throw Error('crm_contact_http_'+res.status);
 const raw=await res.text();
 if(raw.length>500000)throw Error('crm_response_too_large');
 return normalizeCrmContacts(provider,JSON.parse(raw));
}
export async function ensureNativeCrmImportSchema(db){
 await db.query(`CREATE TABLE IF NOT EXISTS respondo_native_crm_imports(
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK(provider IN ('hubspot','pipedrive')),
  external_id TEXT NOT NULL,
  contact_id UUID NOT NULL REFERENCES respondo_native_contacts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(tenant_id,provider,external_id)
 )`);
 await db.query('ALTER TABLE respondo_native_crm_imports ENABLE ROW LEVEL SECURITY');
 await db.query('REVOKE ALL PRIVILEGES ON TABLE respondo_native_crm_imports FROM PUBLIC');
 const roles=await db.query("SELECT rolname FROM pg_roles WHERE rolname=ANY($1::text[])",[['anon','authenticated','service_role']]);
 for(const r of roles.rows||[])if(['anon','authenticated','service_role'].includes(r.rolname))
  await db.query('REVOKE ALL PRIVILEGES ON TABLE respondo_native_crm_imports FROM '+r.rolname);
}
export async function previewNativeCrmImport(db,tenantId,{fetcher=fetch}={}){
 if(!UUID.test(tenantId))throw TypeError('Invalid workspace');
 const connected=await db.query(`SELECT provider,enabled FROM respondo_crm_settings
  WHERE tenant_id=$1`,[tenantId]);
 const provider=connected.rows[0]?.provider;
 if(!connected.rows[0]?.enabled||!['hubspot','pipedrive'].includes(provider))
  throw TypeError('Connect CRM first');
 const credential=await readCrmCredential(db,tenantId);
 if(!credential||credential.provider!==provider)throw TypeError('CRM token unavailable');
 const contacts=await fetchNativeCrmContacts(provider,credential.token,{fetcher});
 return {provider,contacts,count:contacts.length,requiresApproval:true,
  willOverwriteExisting:false,limitedToFirst40:true};
}
export async function importNativeCrmContacts(db,tenantId,{approved,provider,externalIds}={},options={}){
 if(approved!==true||!['hubspot','pipedrive'].includes(provider)||
  !Array.isArray(externalIds)||!externalIds.length||externalIds.length>40||
  externalIds.some(x=>typeof x!=='string'||x.length>100||!x))
  throw TypeError('Explicit approval and selected contact IDs required');
 const preview=await previewNativeCrmImport(db,tenantId,options);
 if(preview.provider!==provider)throw TypeError('CRM changed; refresh preview');
 const allowed=new Set(externalIds);
 const selected=preview.contacts.filter(c=>allowed.has(c.externalId));
 if(new Set(selected.map(c=>c.externalId)).size!==new Set(externalIds).size)
  throw TypeError('CRM contacts changed; refresh preview');
 let imported=0,skipped=0;
 for(const contact of selected){
  const client=await db.connect();
  try{
   await client.query('BEGIN');
   const existing=await client.query(`SELECT contact_id FROM respondo_native_crm_imports
     WHERE tenant_id=$1 AND provider=$2 AND external_id=$3`,
     [tenantId,provider,contact.externalId]);
   if(existing.rowCount){skipped++;await client.query('COMMIT');continue}
   // Do not duplicate existing company contacts matching email.
   const match=contact.email?await client.query(`SELECT id FROM respondo_native_contacts
     WHERE tenant_id=$1 AND lower(email)=$2 LIMIT 1`,[tenantId,contact.email]):{rows:[]};
   if(match.rows[0]){skipped++;await client.query('COMMIT');continue}
   const inserted=await client.query(`INSERT INTO respondo_native_contacts
     (tenant_id,name,email,phone,note,stage)
     VALUES($1,$2,$3,$4,$5,'new') RETURNING id`,
     [tenantId,contact.name,mail.test(contact.email)?contact.email:'',contact.phone,
      'Imported from '+provider]);
   await client.query(`INSERT INTO respondo_native_crm_imports
     (tenant_id,provider,external_id,contact_id) VALUES($1,$2,$3,$4)
     ON CONFLICT DO NOTHING`,[tenantId,provider,contact.externalId,inserted.rows[0].id]);
   await client.query('COMMIT');imported++;
  }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error}
  finally{client.release()}
 }
 return {provider,imported,skipped,externalUpdates:0,approved:true};
}
