import crypto from 'node:crypto';

const PROVIDERS = new Set(['hubspot', 'pipedrive']);
const KEY_NAME = 'DATA_ENCRYPTION_KEY';

export function crmProviderAllowed(provider) {
  return PROVIDERS.has(provider);
}

function encryptionKey(env = process.env) {
  const secret = String(env[KEY_NAME] || '').trim();
  if (secret.length < 24) throw new Error('CRM encryption is not configured');
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptCrmToken(value, env = process.env) {
  const token = String(value || '').trim();
  if (token.length < 15 || token.length > 512 || /[\r\n\u0000]/.test(token)) throw new TypeError('Invalid CRM credential');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(env), iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map(x => x.toString('base64url')).join('.');
}

export function decryptCrmToken(value, env = process.env) {
  const pieces = String(value || '').split('.');
  if (pieces.length !== 3 || pieces.some(x => !x)) throw new Error('CRM credential unavailable');
  const [iv, tag, data] = pieces.map(x => Buffer.from(x, 'base64url'));
  if (iv.length !== 12 || tag.length !== 16 || !data.length || data.length > 1024)
    throw new Error('CRM credential unavailable');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(env), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

export async function ensureCrmCredentialsSchema(db) {
  await db.query(`CREATE TABLE IF NOT EXISTS public.respondo_crm_credentials (
    tenant_id TEXT PRIMARY KEY,
    provider TEXT NOT NULL CHECK (provider IN ('hubspot','pipedrive')),
    token_ciphertext TEXT NOT NULL,
    verified_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await db.query('ALTER TABLE public.respondo_crm_credentials ENABLE ROW LEVEL SECURITY');
  await db.query('REVOKE ALL PRIVILEGES ON TABLE public.respondo_crm_credentials FROM PUBLIC');
}

export async function readCrmCredential(db, tenantId) {
  const found = await db.query(
    'SELECT provider,token_ciphertext FROM respondo_crm_credentials WHERE tenant_id=$1',
    [tenantId]
  );
  if (!found.rows[0]) return null;
  return {
    provider:found.rows[0].provider,
    token:decryptCrmToken(found.rows[0].token_ciphertext)
  };
}

export async function crmConnectorStatus(db, tenantId) {
  const [settings, secret, queue] = await Promise.all([
    db.query('SELECT provider,enabled FROM respondo_crm_settings WHERE tenant_id=$1',[tenantId]),
    db.query('SELECT provider,verified_at FROM respondo_crm_credentials WHERE tenant_id=$1',[tenantId]),
    db.query(`SELECT status,COUNT(*)::int AS total FROM respondo_crm_outbox
       WHERE tenant_id=$1 GROUP BY status`,[tenantId])
  ]);
  const setting=settings.rows[0]||{};
  const cred=secret.rows[0]||{};
  const pending=queue.rows.filter(row=>['pending','retry','processing'].includes(row.status))
    .reduce((sum,row)=>sum+Number(row.total||0),0);
  const failed=queue.rows.filter(row=>row.status==='failed')
    .reduce((sum,row)=>sum+Number(row.total||0),0);
  return {
    provider:cred.provider||setting.provider||null,
    connected:Boolean(cred.provider && setting.enabled && cred.provider===setting.provider),
    enabled:Boolean(setting.enabled),
    verifiedAt:cred.verified_at||null,
    queue:{pending,failed}
  };
}

// Checks permissions using one read-only request. Never log tokens, copy
// arbitrary URLs from the browser or follow redirects from providers.
export async function verifyCrmCredential(provider, token, {fetchImpl=fetch}={}) {
  if (!crmProviderAllowed(provider)) throw new TypeError('Unsupported CRM provider');
  if (typeof token!=='string' || token.trim().length<15 || token.length>512)
    throw new TypeError('Invalid CRM credential');
  const isHubspot=provider==='hubspot';
  const url=isHubspot
    ? 'https://api.hubapi.com/crm/v3/objects/contacts?limit=1'
    : 'https://api.pipedrive.com/api/v1/users/me';
  const headers=isHubspot
    ? {authorization:'Bearer '+token.trim(),accept:'application/json'}
    : {'x-api-token':token.trim(),accept:'application/json'};
  const response=await fetchImpl(url,{
    method:'GET',headers,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(8000)
  });
  if (!response.ok) return {ok:false,status:Number(response.status)||502};
  if (!isHubspot) {
    const data=await response.json().catch(()=>null);
    if (!data || data.success!==true) return {ok:false,status:502};
  }
  return {ok:true};
}

export async function connectCrmCredential(db, tenantId, provider, token, options={}) {
  if(!tenantId || !crmProviderAllowed(provider)) throw new TypeError('Invalid CRM connection');
  const encrypted=encryptCrmToken(token);
  const verification=await verifyCrmCredential(provider,token,options);
  if(!verification.ok) return {connected:false,verificationStatus:verification.status};
  const client=await db.connect();
  try {
    await client.query('BEGIN');
    await client.query(`INSERT INTO respondo_crm_credentials(tenant_id,provider,token_ciphertext,verified_at)
      VALUES($1,$2,$3,NOW()) ON CONFLICT(tenant_id)
      DO UPDATE SET provider=EXCLUDED.provider,token_ciphertext=EXCLUDED.token_ciphertext,
        verified_at=NOW(),updated_at=NOW()`,[tenantId,provider,encrypted]);
    await client.query(`INSERT INTO respondo_crm_settings(tenant_id,provider,enabled)
      VALUES($1,$2,TRUE) ON CONFLICT(tenant_id)
      DO UPDATE SET provider=EXCLUDED.provider,enabled=TRUE,updated_at=NOW()`,[tenantId,provider]);
    // Pending events created for an older CRM destination must not be
    // sent to this new provider when switching connection.
    await client.query(`DELETE FROM respondo_crm_outbox
      WHERE tenant_id=$1 AND status IN ('pending','retry','failed')`,[tenantId]);
    await client.query('COMMIT');
  } catch(error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
  return {connected:true,provider};
}

export async function retestCrmCredential(db,tenantId,options={}) {
  const credential=await readCrmCredential(db,tenantId);
  if (!credential) return {connected:false,reason:'not_configured'};
  const result=await verifyCrmCredential(credential.provider,credential.token,options);
  if (result.ok) {
    await db.query('UPDATE respondo_crm_credentials SET verified_at=NOW() WHERE tenant_id=$1',[tenantId]);
  } else {
    await db.query('UPDATE respondo_crm_settings SET enabled=FALSE,updated_at=NOW() WHERE tenant_id=$1',[tenantId]);
  }
  return {connected:result.ok,provider:credential.provider,...(result.ok?{}:{reason:'verification_failed'})};
}

export async function disconnectCrmCredential(db,tenantId) {
  const client=await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE respondo_crm_settings SET enabled=FALSE,updated_at=NOW() WHERE tenant_id=$1',[tenantId]);
    await client.query('DELETE FROM respondo_crm_credentials WHERE tenant_id=$1',[tenantId]);
    await client.query(`DELETE FROM respondo_crm_outbox WHERE tenant_id=$1
      AND status IN ('pending','retry','failed')`,[tenantId]);
    await client.query('COMMIT');
  } catch(error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {client.release();}
  return {connected:false};
}
