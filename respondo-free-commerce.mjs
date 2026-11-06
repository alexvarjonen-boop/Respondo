// Seller-provided order snapshots, kept entirely inside Respondo.
// No Shopify/WooCommerce billing, paid delivery API, payment action, or carrier call.
import {createHmac} from 'node:crypto';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const validTenant=x=>UUID.test(String(x||''));
const trim=(v,max)=>String(v??'').trim().slice(0,max);
const SOURCES=new Set(['manual','shopify','woocommerce']);
const STATUSES=new Set(['pending','paid','processing','shipped','delivered','cancelled','refunded']);
const EMAIL=/^[^\s@]{1,128}@[^\s@]{1,160}\.[^\s@]{2,24}$/;
const REF=/^#?[A-Za-z0-9][A-Za-z0-9._-]{2,78}$/;
function verifiedOrderRef(value){
 const ref=trim(value,80);
 if(!REF.test(ref))throw new TypeError('Valid order reference is required');
 return ref;
}
function normalEmail(value){
 const email=trim(value,254).toLowerCase();
 if(!EMAIL.test(email))throw new TypeError('A valid customer verification email is required');
 return email;
}
export function nativeOrderEmailDigest(tenantId,email,secret){
 if(!validTenant(tenantId)||typeof secret!=='string'||secret.length<24)
  throw new TypeError('Order lookup secret not configured');
 return createHmac('sha256',secret).update('respondo-order-lookup:v1:'+tenantId+':'+normalEmail(email))
  .digest('hex');
}
export function validateNativeOrderSnapshot(payload={}){
 if(!payload||typeof payload!=='object'||Array.isArray(payload))
  throw new TypeError('Invalid order information');
 const source=trim(payload.source||'manual',20),status=trim(payload.status,30);
 if(!SOURCES.has(source)||!STATUSES.has(status))
  throw new TypeError('Unsupported source or order status');
 const ref=verifiedOrderRef(payload.reference);
 const email=normalEmail(payload.customerEmail);
 const currency=trim(payload.currency||'EUR',3).toUpperCase();
 if(!/^[A-Z]{3}$/.test(currency))throw new TypeError('Invalid currency');
 const total=payload.totalCents==null?null:Number(payload.totalCents);
 if(total!==null&&(!Number.isSafeInteger(total)||total<0||total>1000000000))
  throw new TypeError('Invalid total');
 return {source,reference:ref,status,customerEmail:email,currency,totalCents:total};
}
export async function ensureFreeCommerceSchema(db){
 await db.query(`CREATE TABLE IF NOT EXISTS public.respondo_native_order_snapshots(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK(source IN ('manual','shopify','woocommerce')),
  external_ref TEXT NOT NULL,
  email_digest TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN
   ('pending','paid','processing','shipped','delivered','cancelled','refunded')),
  currency CHAR(3) NOT NULL DEFAULT 'EUR',
  total_cents BIGINT,
  reported_by_owner BOOLEAN NOT NULL DEFAULT TRUE,
  provider_live_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id,source,external_ref))`);
 await db.query('CREATE INDEX IF NOT EXISTS idx_native_order_ref ON public.respondo_native_order_snapshots(tenant_id,external_ref)');
 await db.query('ALTER TABLE public.respondo_native_order_snapshots ENABLE ROW LEVEL SECURITY');
 await db.query('REVOKE ALL PRIVILEGES ON TABLE public.respondo_native_order_snapshots FROM PUBLIC');
 const roles=await db.query("SELECT rolname FROM pg_roles WHERE rolname=ANY($1::text[])",[['anon','authenticated','service_role']]);
 for(const row of roles.rows||[])if(['anon','authenticated','service_role'].includes(row.rolname))
  await db.query('REVOKE ALL PRIVILEGES ON TABLE public.respondo_native_order_snapshots FROM '+row.rolname);
}
export async function putFreeOrderSnapshot(db,tenantId,payload,{secret}={}){
 if(!validTenant(tenantId)||payload?.approved!==true)
  throw new TypeError('Owner approval required for order updates');
 const x=validateNativeOrderSnapshot(payload);
 const digest=nativeOrderEmailDigest(tenantId,x.customerEmail,secret);
 const r=await db.query(`INSERT INTO respondo_native_order_snapshots
  (tenant_id,source,external_ref,email_digest,status,currency,total_cents)
  VALUES($1,$2,$3,$4,$5,$6,$7)
  ON CONFLICT(tenant_id,source,external_ref)
  DO UPDATE SET email_digest=EXCLUDED.email_digest,status=EXCLUDED.status,
    currency=EXCLUDED.currency,total_cents=EXCLUDED.total_cents,
    reported_by_owner=TRUE,provider_live_verified=FALSE,updated_at=NOW()
  RETURNING id,source,external_ref,status,currency,total_cents,updated_at`,
  [tenantId,x.source,x.reference,digest,x.status,x.currency,x.totalCents]);
 return {...r.rows[0],realTimeProviderVerified:false,
  paidExternalCalls:0};
}
export async function freeOrderOverview(db,tenantId){
 if(!validTenant(tenantId))throw new TypeError('Invalid workspace');
 const r=await db.query(`SELECT id,source,external_ref,status,currency,total_cents,
    updated_at,reported_by_owner,provider_live_verified
  FROM respondo_native_order_snapshots WHERE tenant_id=$1
  ORDER BY updated_at DESC LIMIT 75`,[tenantId]);
 return {orders:r.rows||[],selfManaged:true,externalCostsTriggered:0};
}
export async function lookupFreeOrderStatus(db,tenantId,reference,email,{secret}={}){
 if(!validTenant(tenantId))throw new TypeError('Invalid workspace');
 const ref=verifiedOrderRef(reference);
 const digest=nativeOrderEmailDigest(tenantId,email,secret);
 const r=await db.query(`SELECT status,updated_at,source,provider_live_verified
   FROM respondo_native_order_snapshots
   WHERE tenant_id=$1 AND external_ref=$2 AND email_digest=$3
   ORDER BY updated_at DESC LIMIT 2`,[tenantId,ref,digest]);
 if(r.rows?.length!==1)return null;
 return {status:r.rows[0].status,asOf:r.rows[0].updated_at,
   source:r.rows[0].source,liveProviderVerified:false,
   sellerProvidedSnapshot:true,shippingTrackingVerified:false};
}
