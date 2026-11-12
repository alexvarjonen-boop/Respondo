// Owner-reconciled conversion evidence. This never pretends that a manually
// recorded sale is independently verified by Stripe, bank or payment provider.
const uuid=v=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v||''));
const days=value=>[7,30,90].includes(Number(value))?Number(value):30;
const source=v=>String(v||'').trim().slice(0,120);
const currency='EUR';

export function validateOwnerSale(payload={}){
 if(!uuid(payload.actionRequestId)||payload.confirm!==true)
  throw new TypeError('Choose an actual customer request and confirm the sale');
 const amount=Number(payload.amountCents);
 if(!Number.isSafeInteger(amount)||amount<1||amount>100000000000)
  throw new TypeError('Enter an amount in whole cents');
 const reference=source(payload.reference);
 if(reference.length<5||/[\r\n\x00-\x1f]/.test(reference))
  throw new TypeError('Add an invoice or receipt reference, without customer details');
 if(payload.currency&&payload.currency!==currency)throw new TypeError('Only EUR is supported');
 return {actionRequestId:payload.actionRequestId,amountCents:amount,
  reference,currency,verifiedByPaymentProvider:false};
}

export async function ensureOwnerSalesSchema(db){
 await db.query(`CREATE TABLE IF NOT EXISTS public.respondo_owner_sales(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  action_request_id UUID NOT NULL REFERENCES public.action_requests(id) ON DELETE CASCADE,
  amount_cents BIGINT NOT NULL CHECK(amount_cents>0 AND amount_cents<=100000000000),
  currency TEXT NOT NULL DEFAULT 'EUR' CHECK(currency='EUR'),
  owner_reference TEXT NOT NULL,
  confirmed_by UUID NOT NULL REFERENCES public.users(id),
  status TEXT NOT NULL DEFAULT 'owner_confirmed' CHECK(status IN ('owner_confirmed','retracted')),
  retraction_note TEXT,
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  retracted_at TIMESTAMPTZ,
  UNIQUE(tenant_id,action_request_id))`);
 await db.query('CREATE INDEX IF NOT EXISTS idx_owner_sales_tenant ON public.respondo_owner_sales(tenant_id,confirmed_at DESC)');
 await db.query('ALTER TABLE public.respondo_owner_sales ENABLE ROW LEVEL SECURITY');
 await db.query('REVOKE ALL PRIVILEGES ON TABLE public.respondo_owner_sales FROM PUBLIC');
 const roles=await db.query("SELECT rolname FROM pg_roles WHERE rolname=ANY($1::text[])",[['anon','authenticated','service_role']]);
 for(const role of roles.rows||[])if(['anon','authenticated','service_role'].includes(role.rolname))
  await db.query('REVOKE ALL PRIVILEGES ON TABLE public.respondo_owner_sales FROM '+role.rolname);
}

export async function recordOwnerSale(db,tenantId,ownerId,payload={}){
 if(!uuid(tenantId)||!uuid(ownerId))throw new TypeError('Invalid owner workspace');
 const item=validateOwnerSale(payload);
 // SELECT from action_requests binds the sale to the owner's active tenant;
 // the API endpoint also applies ownerOnly + subscribed middleware.
 const r=await db.query(`INSERT INTO public.respondo_owner_sales(
   tenant_id,action_request_id,amount_cents,currency,owner_reference,confirmed_by)
   SELECT $1,a.id,$3,'EUR',$4,$5 FROM public.action_requests a
   WHERE a.tenant_id=$1 AND a.id=$2 AND a.request_type IN ('quote','booking','callback')
   ON CONFLICT(tenant_id,action_request_id) DO NOTHING
   RETURNING id,action_request_id,amount_cents,currency,status,confirmed_at`,[
  tenantId,item.actionRequestId,item.amountCents,item.reference,ownerId]);
 return r.rows?.[0]||null;
}

export async function retractOwnerSale(db,tenantId,id,ownerId,note){
 if(!uuid(tenantId)||!uuid(id)||!uuid(ownerId))throw new TypeError('Invalid owner sale');
 const reason=source(note);
 if(reason.length<8)throw new TypeError('Provide a reason for retracting the sale');
 const r=await db.query(`UPDATE public.respondo_owner_sales SET
  status='retracted',retraction_note=$4,retracted_at=NOW()
  WHERE tenant_id=$1 AND id=$2 AND confirmed_by=$3 AND status='owner_confirmed'
  RETURNING id,status`,[tenantId,id,ownerId,reason]);
 return r.rows?.[0]||null;
}

export function summarizeOwnerSales(rows=[]){
 const valid=(Array.isArray(rows)?rows:[]).filter(row=>
   row?.status==='owner_confirmed'&&Number.isSafeInteger(Number(row.amount_cents))&&
   Number(row.amount_cents)>0);
 const cents=valid.reduce((sum,row)=>sum+Number(row.amount_cents),0);
 const matched=valid.filter(row=>row.attributed===true);
 return {ownerConfirmedSales:valid.length,ownerConfirmedRevenueCents:cents,
  attributedOwnerConfirmedSales:matched.length,
  attributedOwnerConfirmedRevenueCents:matched.reduce((sum,row)=>sum+Number(row.amount_cents),0),
  currency,independentPaymentVerification:false,
  attributionMethod:'Recorded conversation and submitted customer request must have same tenant, visitor reference and channel within 90 days.',
  revenueAttributionSource:'explicit_owner_invoice_or_receipt_reference',
  // No Stripe Connect/bank event was verified here.
  platformVerifiedSales:0,platformVerifiedRevenueCents:0};
}

export async function ownerSalesOverview(db,tenantId,period=30){
 if(!uuid(tenantId))throw new TypeError('Invalid workspace');
 const windowDays=days(period);
 const [sales,available]=await Promise.all([
 db.query(`SELECT s.id,s.action_request_id,s.status,s.amount_cents,s.currency,
  s.confirmed_at,s.retracted_at,
  EXISTS(
   SELECT 1 FROM public.conversations c
   WHERE c.tenant_id=s.tenant_id AND c.visitor_ref=a.visitor_ref
     AND COALESCE(NULLIF(c.source_channel,''),'website')=
       COALESCE(NULLIF(a.source_channel,''),'website')
     AND c.created_at BETWEEN a.created_at-INTERVAL '90 days' AND a.created_at+INTERVAL '1 day'
  ) AND a.visitor_ref IS NOT NULL AND BTRIM(a.visitor_ref)<>'' AS attributed
  FROM public.respondo_owner_sales s
  JOIN public.action_requests a ON a.tenant_id=s.tenant_id AND a.id=s.action_request_id
  WHERE s.tenant_id=$1 AND s.confirmed_at>=NOW()-($2::int * INTERVAL '1 day')
  ORDER BY s.confirmed_at DESC LIMIT 500`,[tenantId,windowDays]),
 db.query(`SELECT a.id,a.request_type,a.created_at
  FROM public.action_requests a
  WHERE a.tenant_id=$1 AND a.request_type IN ('quote','booking','callback')
   AND a.created_at>=NOW()-INTERVAL '90 days'
   AND NOT EXISTS(SELECT 1 FROM public.respondo_owner_sales s
    WHERE s.tenant_id=a.tenant_id AND s.action_request_id=a.id)
  ORDER BY a.created_at DESC LIMIT 30`,[tenantId])
 ]);
 return {days:windowDays,summary:summarizeOwnerSales(sales.rows),
  recentSales:(sales.rows||[]).slice(0,30).map(x=>({
   id:x.id,actionRequestId:x.action_request_id,status:x.status,
   amountCents:Number(x.amount_cents),attributed:Boolean(x.attributed),
   confirmedAt:x.confirmed_at
  })),eligibleRequests:available.rows||[],
  customerDetailsExposed:false};
}
