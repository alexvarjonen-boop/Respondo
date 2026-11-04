// Zendesk Support OAuth 2.0 (confidential client + PKCE) and deliberate ticket export.
// Uses global OAuth client registration for multi-customer SaaS. All tokens
// are tenant-encrypted and the callback is bound to a logged-in owner.
import crypto from 'node:crypto';

const SCOPES='tickets:read tickets:write';
const CALLBACK='/api/app/helpdesk/zendesk/callback';
const safeId=v=>/^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(String(v||''));
const hash=v=>crypto.createHash('sha256').update(String(v)).digest('hex');
export function zendeskDomain(value){
  const raw=String(value||'').trim().toLowerCase().replace(/\.zendesk\.com$/,'');
  if(!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(raw))
    throw new TypeError('Enter a Zendesk subdomain, not an arbitrary URL');
  return raw;
}
export function zendeskConfig(env=process.env,origin='https://respondoai.fi'){
  const clientId=String(env.ZENDESK_OAUTH_CLIENT_ID||'').trim();
  const clientSecret=String(env.ZENDESK_OAUTH_CLIENT_SECRET||'').trim();
  if(!clientId||clientSecret.length<16)return null;
  const url=new URL(origin);
  if(url.protocol!=='https:' && url.hostname!=='localhost')throw new Error('HTTPS OAuth callback required');
  if(url.username||url.password||url.search||url.hash)throw new Error('Invalid OAuth origin');
  return {clientId,clientSecret,redirectUri:url.origin+CALLBACK};
}
export function zendeskTokenSeal(value,env=process.env){
  const token=String(value||'');
  if(!token||token.length>10000)throw new TypeError('Invalid OAuth token');
  const master=String(env.DATA_ENCRYPTION_KEY||'').trim();
  if(master.length<24)throw new Error('OAuth encryption secret not configured');
  const key=crypto.createHash('sha256').update(master).digest();
  const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key,iv);
  const encrypted=Buffer.concat([cipher.update(token,'utf8'),cipher.final()]);
  return [iv,cipher.getAuthTag(),encrypted].map(b=>b.toString('base64url')).join('.');
}
export function zendeskTokenOpen(blob,env=process.env){
  const segments=String(blob||'').split('.');
  if(segments.length!==3||segments.some(x=>!x))throw new Error('OAuth token missing');
  const secret=String(env.DATA_ENCRYPTION_KEY||'').trim();
  if(secret.length<24)throw new Error('OAuth encryption secret not configured');
  const [iv,tag,bytes]=segments.map(x=>Buffer.from(x,'base64url'));
  if(iv.length!==12||tag.length!==16||!bytes.length||bytes.length>15000)
    throw new Error('Invalid encrypted OAuth token');
  const decipher=crypto.createDecipheriv('aes-256-gcm',crypto.createHash('sha256').update(secret).digest(),iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(bytes),decipher.final()]).toString('utf8');
}
export async function ensureZendeskSchema(db){
  const ddl=[
  `CREATE TABLE IF NOT EXISTS public.respondo_zendesk_oauth_states(
    state_hash TEXT PRIMARY KEY,tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    owner_user_id TEXT NOT NULL,subdomain TEXT NOT NULL,verifier_cipher TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS public.respondo_zendesk_connections(
    tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
    subdomain TEXT NOT NULL,access_cipher TEXT NOT NULL,refresh_cipher TEXT NOT NULL,
    access_expires_at TIMESTAMPTZ NOT NULL,verified_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS public.respondo_zendesk_exports(
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    native_ticket_id UUID NOT NULL REFERENCES public.respondo_native_tickets(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK(status IN ('processing','sent','unknown')),
    external_ticket_id TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(tenant_id,native_ticket_id))`
  ];
  for(const sql of ddl)await db.query(sql);
  const tables=['respondo_zendesk_oauth_states','respondo_zendesk_connections','respondo_zendesk_exports'];
  for(const table of tables){
    await db.query('ALTER TABLE public.'+table+' ENABLE ROW LEVEL SECURITY');
    await db.query('REVOKE ALL PRIVILEGES ON TABLE public.'+table+' FROM PUBLIC');
  }
  const roles=await db.query("SELECT rolname FROM pg_roles WHERE rolname=ANY($1::text[])",[['anon','authenticated','service_role']]);
  for(const role of roles.rows||[]){
    if(!['anon','authenticated','service_role'].includes(role.rolname))continue;
    for(const table of tables)await db.query('REVOKE ALL PRIVILEGES ON TABLE public.'+table+' FROM '+role.rolname);
  }
}
export async function beginZendeskOAuth(db,tenantId,userId,subdomain,config){
  if(!config)throw new TypeError('Zendesk OAuth application is not configured');
  const domain=zendeskDomain(subdomain);
  const state=crypto.randomBytes(32).toString('base64url');
  const verifier=crypto.randomBytes(48).toString('base64url');
  const challenge=crypto.createHash('sha256').update(verifier).digest('base64url');
  await db.query(`INSERT INTO respondo_zendesk_oauth_states(
    state_hash,tenant_id,owner_user_id,subdomain,verifier_cipher,expires_at
  ) VALUES($1,$2,$3,$4,$5,NOW()+INTERVAL '10 minutes')`,
    [hash(state),tenantId,String(userId),domain,zendeskTokenSeal(verifier)]);
  const url=new URL('https://'+domain+'.zendesk.com/oauth/authorizations/new');
  for(const [k,v] of Object.entries({
    response_type:'code',client_id:config.clientId,redirect_uri:config.redirectUri,
    state,scope:SCOPES,code_challenge:challenge,code_challenge_method:'S256',expires_in:'1800'
  }))url.searchParams.set(k,v);
  return {authorizationUrl:url.toString()};
}
export function zendeskFetchRequest(domain,token,method,path,payload){
  const d=zendeskDomain(domain);
  if(!['GET','POST'].includes(method)||!['tickets.json','users/me.json'].includes(path))
    throw new TypeError('Zendesk API route is not permitted');
  return {
    url:'https://'+d+'.zendesk.com/api/v2/'+path,
    init:{method,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(8000),
      headers:{Authorization:'Bearer '+token,Accept:'application/json',
        ...(payload?{'Content-Type':'application/json'}:{})},
      ...(payload?{body:JSON.stringify(payload)}:{})}
  };
}
export async function zendeskExchange(domain,form,{fetchImpl=fetch}={}){
  const url='https://'+zendeskDomain(domain)+'.zendesk.com/oauth/tokens';
  const response=await fetchImpl(url,{method:'POST',redirect:'error',cache:'no-store',
    signal:AbortSignal.timeout(8000),
    headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams(form).toString()
  });
  if(!response?.ok)throw new Error('Zendesk OAuth exchange failed');
  const token=await response.json().catch(()=>null);
  if(!token||typeof token.access_token!=='string'||!token.access_token||
     typeof token.refresh_token!=='string'||!token.refresh_token||
     String(token.token_type||'').toLowerCase()!=='bearer')
    throw new Error('Zendesk did not return reusable OAuth credentials');
  const scopes=new Set(String(token.scope||'').split(/\s+/).filter(Boolean));
  if(!scopes.has('tickets:read')||!scopes.has('tickets:write'))
    throw new Error('Zendesk did not grant required ticket scopes');
  const expires=Math.max(60,Math.min(172800,Number(token.expires_in)||0));
  return {...token,expiresAt:new Date(Date.now()+expires*1000)};
}
export async function completeZendeskOAuth(db,tenantId,userId,state,code,config,options={}){
  if(!config||!state||typeof state!=='string'||state.length>180
    ||typeof code!=='string'||code.length<5||code.length>3000)
    throw new TypeError('Invalid Zendesk callback');
  // Atomically consume state. It cannot be replayed even if a provider call fails.
  const result=await db.query(`DELETE FROM respondo_zendesk_oauth_states WHERE state_hash=$1
    AND tenant_id=$2 AND owner_user_id=$3 AND expires_at>NOW()
    RETURNING subdomain,verifier_cipher`,[hash(state),tenantId,String(userId)]);
  const found=result.rows[0];
  if(!found)throw new TypeError('Zendesk authorization expired or belongs to another workspace');
  const form={grant_type:'authorization_code',client_id:config.clientId,
    client_secret:config.clientSecret,code,redirect_uri:config.redirectUri,
    code_verifier:zendeskTokenOpen(found.verifier_cipher),scope:SCOPES};
  const token=await zendeskExchange(found.subdomain,form,options);
  const {url,init}=zendeskFetchRequest(found.subdomain,token.access_token,'GET','tickets.json');
  const verify=await (options.fetchImpl||fetch)(url,init);
  if(!verify?.ok)throw new Error('Zendesk account cannot read support tickets');
  await db.query(`INSERT INTO respondo_zendesk_connections(
    tenant_id,subdomain,access_cipher,refresh_cipher,access_expires_at,verified_at)
    VALUES($1,$2,$3,$4,$5,NOW())
    ON CONFLICT(tenant_id) DO UPDATE SET subdomain=EXCLUDED.subdomain,
      access_cipher=EXCLUDED.access_cipher,refresh_cipher=EXCLUDED.refresh_cipher,
      access_expires_at=EXCLUDED.access_expires_at,verified_at=NOW(),updated_at=NOW()`,
    [tenantId,found.subdomain,zendeskTokenSeal(token.access_token),
      zendeskTokenSeal(token.refresh_token),token.expiresAt]);
  return {connected:true,provider:'zendesk',subdomain:found.subdomain};
}
export async function zendeskStatus(db,tenantId,config){
  const [r,logs]=await Promise.all([
    db.query('SELECT subdomain,verified_at,access_expires_at FROM respondo_zendesk_connections WHERE tenant_id=$1',[tenantId]),
    db.query(`SELECT native_ticket_id,status,external_ticket_id,created_at FROM respondo_zendesk_exports
      WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 100`,[tenantId])
  ]);
  return {configured:Boolean(config),connected:Boolean(r.rows[0]),provider:'zendesk',
    subdomain:r.rows[0]?.subdomain||null,verifiedAt:r.rows[0]?.verified_at||null,
    exports:logs.rows||[]};
}
export async function disconnectZendesk(db,tenantId){
  await db.query('DELETE FROM respondo_zendesk_connections WHERE tenant_id=$1',[tenantId]);
  await db.query('DELETE FROM respondo_zendesk_oauth_states WHERE tenant_id=$1',[tenantId]);
  // Export audit remains to prevent duplicate ticket creation on reconnect.
  return {connected:false};
}
export async function usableZendeskAccess(db,tenantId,config,options={}){
  const r=await db.query(`SELECT subdomain,access_cipher,refresh_cipher,access_expires_at
    FROM respondo_zendesk_connections WHERE tenant_id=$1`,[tenantId]);
  const current=r.rows[0];if(!current)throw new TypeError('Connect Zendesk first');
  const domain=zendeskDomain(current.subdomain);
  if(new Date(current.access_expires_at).getTime()>Date.now()+90_000)
    return {domain,token:zendeskTokenOpen(current.access_cipher)};
  if(!config)throw new Error('OAuth app is not configured for token renewal');
  const updated=await zendeskExchange(domain,{
    grant_type:'refresh_token',client_id:config.clientId,
    client_secret:config.clientSecret,
    refresh_token:zendeskTokenOpen(current.refresh_cipher),
    scope:SCOPES
  },options);
  const res=await db.query(`UPDATE respondo_zendesk_connections
    SET access_cipher=$3,refresh_cipher=$4,access_expires_at=$5,updated_at=NOW()
    WHERE tenant_id=$1 AND refresh_cipher=$2 RETURNING tenant_id`,
    [tenantId,current.refresh_cipher,zendeskTokenSeal(updated.access_token),
      zendeskTokenSeal(updated.refresh_token),updated.expiresAt]);
  if(!res.rowCount)throw new Error('Concurrent token refresh detected; retry after reading state');
  return {domain,token:updated.access_token};
}
export async function exportZendeskTicket(db,tenantId,ticketId,{requesterEmail,approved}={},
  config,options={}){
  if(!safeId(ticketId)||approved!==true)throw new TypeError('Approve the specific ticket export');
  const email=String(requesterEmail||'').trim().toLowerCase();
  if(email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new TypeError('Valid customer email is required');
  const tr=await db.query(`SELECT id,title,details,priority FROM respondo_native_tickets
      WHERE tenant_id=$1 AND id=$2`,[tenantId,ticketId]);
  if(!tr.rows[0])throw new TypeError('Ticket not found in this workspace');
  const claimed=await db.query(`INSERT INTO respondo_zendesk_exports(tenant_id,native_ticket_id,status)
    VALUES($1,$2,'processing') ON CONFLICT DO NOTHING RETURNING status`,[tenantId,ticketId]);
  if(!claimed.rowCount){
    const prev=await db.query(`SELECT status,external_ticket_id FROM respondo_zendesk_exports
      WHERE tenant_id=$1 AND native_ticket_id=$2`,[tenantId,ticketId]);
    if(prev.rows[0]?.status==='sent')return {status:'sent',externalTicketId:prev.rows[0].external_ticket_id,duplicate:true};
    return {status:prev.rows[0]?.status||'processing',requiresReconciliation:true};
  }
  let externalId='';
  try{
    const {domain,token}=await usableZendeskAccess(db,tenantId,config,options);
    const ticket=tr.rows[0];
    const {url,init}=zendeskFetchRequest(domain,token,'POST','tickets.json',{ticket:{
      subject:String(ticket.title||'Support request').slice(0,160),
      comment:{body:String(ticket.details||ticket.title||'Support request').slice(0,2000)},
      requester:{name:'Customer',email},
      priority:ticket.priority==='urgent'?'urgent':'normal'
    }});
    const res=await (options.fetchImpl||fetch)(url,init);
    if(!res?.ok)throw new Error('Zendesk did not confirm the ticket');
    const payload=await res.json().catch(()=>null);
    if(!Number.isSafeInteger(Number(payload?.ticket?.id))||Number(payload.ticket.id)<=0)
      throw new Error('Zendesk ticket id missing');
    externalId=String(payload.ticket.id);
  }catch{
    await db.query(`UPDATE respondo_zendesk_exports SET status='unknown',updated_at=NOW()
      WHERE tenant_id=$1 AND native_ticket_id=$2 AND status='processing'`,[tenantId,ticketId]);
    return {status:'unknown',requiresReconciliation:true};
  }
  await db.query(`UPDATE respondo_zendesk_exports
    SET status='sent',external_ticket_id=$3,updated_at=NOW()
    WHERE tenant_id=$1 AND native_ticket_id=$2 AND status='processing'`,
    [tenantId,ticketId,externalId]);
  return {status:'sent',externalTicketId:externalId};
}
