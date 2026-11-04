import {encryptCrmToken,decryptCrmToken} from './crm-connectors.mjs';

// Verified, opt-in Freshdesk Support API v2 integration.
// No customer data leaves Respondo until the owner exports one ticket.
// Zendesk API-token auth is deprecated; OAuth-based Zendesk is separate work.
const uuid=x=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(x||''));
export function helpdeskDomain(raw){
  const domain=String(raw||'').trim().toLowerCase().replace(/\.freshdesk\.com$/,'');
  if(!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(domain))
    throw new TypeError('Enter your Freshdesk subdomain (letters, numbers or hyphens)');
  return domain;
}
export function validateFreshdeskRequester(email){
  const value=String(email||'').trim().toLowerCase();
  if(value.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    throw new TypeError('A valid customer email is required');
  return value;
}
function authHeader(token){
  return 'Basic '+Buffer.from(String(token)+':X','utf8').toString('base64');
}
export function freshdeskRequest(domain,token,method,resource,body){
  return {
    url:'https://'+helpdeskDomain(domain)+'.freshdesk.com/api/v2/'+resource,
    options:{method,redirect:'error',
      headers:{authorization:authHeader(token),'content-type':'application/json',accept:'application/json'},
      signal:AbortSignal.timeout(8000),
      ...(body?{body:JSON.stringify(body)}:{})}
  };
}
export async function verifyFreshdesk(domain,token,{fetchImpl=fetch}={}){
  const {url,options}=freshdeskRequest(domain,token,'GET','agents/me');
  const response=await fetchImpl(url,options);
  if(!response?.ok)return {connected:false,status:Number(response?.status)||502};
  const data=await response.json().catch(()=>null);
  // A successful HTTP status without an authenticated agent is insufficient.
  if(!data||!Number.isFinite(Number(data.id)))return {connected:false,status:502};
  return {connected:true};
}
export async function ensureFreshdeskSchema(db){
  await db.query(`CREATE TABLE IF NOT EXISTS public.respondo_freshdesk_connections(
    tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
    subdomain TEXT NOT NULL,
    encrypted_key TEXT NOT NULL,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS public.respondo_freshdesk_exports(
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    native_ticket_id UUID NOT NULL REFERENCES public.respondo_native_tickets(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK(status IN ('processing','sent','unknown')),
    external_ticket_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(tenant_id,native_ticket_id)
  )`);
  for(const table of ['respondo_freshdesk_connections','respondo_freshdesk_exports']){
    await db.query('ALTER TABLE public.'+table+' ENABLE ROW LEVEL SECURITY');
    await db.query('REVOKE ALL PRIVILEGES ON TABLE public.'+table+' FROM PUBLIC');
  }
  const roles=await db.query("SELECT rolname FROM pg_roles WHERE rolname=ANY($1::text[])",[['anon','authenticated','service_role']]);
  for(const role of roles.rows||[]){
    if(!['anon','authenticated','service_role'].includes(role.rolname))continue;
    for(const table of ['respondo_freshdesk_connections','respondo_freshdesk_exports'])
      await db.query('REVOKE ALL PRIVILEGES ON TABLE public.'+table+' FROM '+role.rolname);
  }
}
export async function connectFreshdesk(db,tenantId,{subdomain,apiKey}={},options={}){
  const domain=helpdeskDomain(subdomain);
  const token=String(apiKey||'').trim();
  const ciphertext=encryptCrmToken(token); // AES-256-GCM using existing secret key
  const verified=await verifyFreshdesk(domain,token,options);
  if(!verified.connected)return {connected:false,status:verified.status};
  await db.query(`INSERT INTO respondo_freshdesk_connections(tenant_id,subdomain,encrypted_key,verified_at)
    VALUES($1,$2,$3,NOW())
    ON CONFLICT(tenant_id) DO UPDATE SET
      subdomain=EXCLUDED.subdomain,encrypted_key=EXCLUDED.encrypted_key,
      verified_at=NOW(),updated_at=NOW()`,[tenantId,domain,ciphertext]);
  return {connected:true,provider:'freshdesk',subdomain:domain};
}
export async function freshdeskStatus(db,tenantId){
  const [r,ex]=await Promise.all([
    db.query(`SELECT subdomain,verified_at FROM respondo_freshdesk_connections WHERE tenant_id=$1`,[tenantId]),
    db.query(`SELECT native_ticket_id,status,external_ticket_id,created_at
      FROM respondo_freshdesk_exports WHERE tenant_id=$1
      ORDER BY created_at DESC LIMIT 100`,[tenantId])
  ]);
  const found=r.rows[0]||null;
  return {connected:Boolean(found),provider:'freshdesk',subdomain:found?.subdomain||null,
    verifiedAt:found?.verified_at||null,exports:ex.rows||[]};
}
export async function retestFreshdesk(db,tenantId,options={}){
  const r=await db.query(`SELECT subdomain,encrypted_key FROM respondo_freshdesk_connections
     WHERE tenant_id=$1`,[tenantId]);
  if(!r.rows[0])return {connected:false,reason:'not_connected'};
  const result=await verifyFreshdesk(r.rows[0].subdomain,decryptCrmToken(r.rows[0].encrypted_key),options);
  if(result.connected)await db.query(`UPDATE respondo_freshdesk_connections SET verified_at=NOW()
    WHERE tenant_id=$1`,[tenantId]);
  return result;
}
export async function disconnectFreshdesk(db,tenantId){
  await db.query('DELETE FROM respondo_freshdesk_connections WHERE tenant_id=$1',[tenantId]);
  // Keep the export audit. Reconnecting must not silently create duplicates.
  return {connected:false};
}
export async function exportFreshdeskTicket(db,tenantId,ticketId,
  {requesterEmail,approved}={}, {fetchImpl=fetch}={}){
  if(!uuid(ticketId)||approved!==true)throw new TypeError('Explicit owner approval is required for this ticket');
  const email=validateFreshdeskRequester(requesterEmail);
  const [conn,ticket]=await Promise.all([
    db.query(`SELECT subdomain,encrypted_key FROM respondo_freshdesk_connections WHERE tenant_id=$1`,[tenantId]),
    db.query(`SELECT id,title,details,priority FROM respondo_native_tickets
      WHERE tenant_id=$1 AND id=$2`,[tenantId,ticketId])
  ]);
  if(!conn.rows[0])throw new TypeError('Connect Freshdesk first');
  if(!ticket.rows[0])throw new TypeError('Ticket not found in this workspace');
  const result=await db.query(`INSERT INTO respondo_freshdesk_exports(tenant_id,native_ticket_id,status)
     VALUES($1,$2,'processing') ON CONFLICT DO NOTHING RETURNING status`,[tenantId,ticketId]);
  if(!result.rowCount){
    const prev=await db.query(`SELECT status,external_ticket_id FROM respondo_freshdesk_exports
      WHERE tenant_id=$1 AND native_ticket_id=$2`,[tenantId,ticketId]);
    const known=prev.rows[0];
    if(known?.status==='sent')return {status:'sent',externalTicketId:known.external_ticket_id,duplicate:true};
    return {status:known?.status||'processing',requiresReconciliation:true};
  }
  const domain=conn.rows[0].subdomain;
  const token=decryptCrmToken(conn.rows[0].encrypted_key);
  const item=ticket.rows[0];
  const body={
    email,subject:String(item.title).slice(0,160),
    description:String(item.details||item.title).slice(0,2000),
    priority:item.priority==='urgent'?4:2,
    status:2
  };
  let externalId=null;
  try{
    const {url,options}=freshdeskRequest(domain,token,'POST','tickets',body);
    const response=await fetchImpl(url,options);
    if(!response?.ok)throw new Error('Provider did not confirm the ticket');
    const payload=await response.json().catch(()=>null);
    if(!Number.isSafeInteger(Number(payload?.id))||Number(payload.id)<=0)
      throw new Error('Provider did not return a ticket identifier');
    externalId=String(payload.id);
  }catch(error){
    // Timeouts and 5xx are ambiguous: the external ticket might have been
    // created, so never blindly retry the same customer data.
    await db.query(`UPDATE respondo_freshdesk_exports SET status='unknown',updated_at=NOW()
      WHERE tenant_id=$1 AND native_ticket_id=$2 AND status='processing'`,[tenantId,ticketId]);
    return {status:'unknown',requiresReconciliation:true};
  }
  await db.query(`UPDATE respondo_freshdesk_exports
    SET status='sent',external_ticket_id=$3,updated_at=NOW()
    WHERE tenant_id=$1 AND native_ticket_id=$2 AND status='processing'`,
    [tenantId,ticketId,externalId]);
  return {status:'sent',externalTicketId:externalId};
}
