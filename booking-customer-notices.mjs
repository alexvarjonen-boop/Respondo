// Existing first-party booking decision -> transactional email outbox.
// No new provider or subscription. Delivery requires existing transactional
// email configuration; absence leaves a visible undelivered record.
const validUuid=s=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(s||''));
const clean=s=>String(s||'').trim().slice(0,254);
const email=s=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean(s))?clean(s):null;
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const langs=new Set(['fi','sv','en']);
const kinds=new Set(['confirmed','rejected','cancelled']);
export function bookingNoticeContent({kind,language,companyName,startsAt,endsAt}){
  if(!kinds.has(kind))throw TypeError('Invalid booking decision');
  const lang=langs.has(language)?language:'fi';
  const company=String(companyName||'Your service provider').slice(0,120);
  const translated={
    fi:{confirmed:['Ajanvaraus vahvistettu','Yrityksesi on vahvistanut ajanvarauksesi.'],rejected:['Aikatoivetta ei voitu vahvistaa','Yritys ei voinut hyväksyä aikatoivettasi. Ota yhteyttä vaihtoehtoisen ajan sopimiseksi.'],cancelled:['Ajanvaraus peruttu','Yritys on peruuttanut ajanvarauksen. Ota yhteyttä, jos haluat uuden ajan.']},
    sv:{confirmed:['Bokningen är bekräftad','Företaget har bekräftat din bokning.'],rejected:['Bokningen kunde inte bekräftas','Företaget kunde inte bekräfta önskad tid. Kontakta företaget för ett alternativ.'],cancelled:['Bokningen har avbokats','Företaget har avbokat din bokning. Kontakta företaget om du behöver en ny tid.']},
    en:{confirmed:['Appointment confirmed','The business has confirmed your appointment.'],rejected:['Appointment request not approved','The business could not confirm the requested time. Contact them to arrange another time.'],cancelled:['Appointment cancelled','The business has cancelled the appointment. Contact them to reschedule.']}
  };
  const [subject,body]=translated[lang][kind];
  const time=kind==='confirmed' && startsAt && endsAt
    ? (lang==='fi'?'Ajankohta (UTC): ':lang==='sv'?'Tid (UTC): ':'Time (UTC): ')+
       new Date(startsAt).toISOString().replace('T',' ').slice(0,16)+' – '+
       new Date(endsAt).toISOString().replace('T',' ').slice(0,16)
    : null;
  const note=lang==='fi'?'Tämä on palveluun liittyvä automaattinen viesti.':
    lang==='sv'?'Detta är ett automatiskt servicemeddelande.':
      'This is an automated service notification.';
  const html='<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#17202e">'+
    '<h2>'+escape(subject)+'</h2><p>'+escape(body)+'</p>'+
    (time?'<p><strong>'+escape(time)+'</strong></p>':'')+
    '<p>'+escape(company)+'</p><p style="color:#687083;font-size:12px">'+escape(note)+'</p></div>';
  return {subject:company+' – '+subject,html};
}
export async function ensureBookingNoticesSchema(db){
  await db.query(`CREATE TABLE IF NOT EXISTS public.respondo_booking_notices(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    action_request_id UUID NOT NULL REFERENCES public.action_requests(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK(kind IN ('confirmed','rejected','cancelled')),
    recipient TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'fi',
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','sent','failed','not_configured')),
    attempts INTEGER NOT NULL DEFAULT 0,
    provider_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    UNIQUE(tenant_id,action_request_id,kind)
  )`);
  await db.query('CREATE INDEX IF NOT EXISTS idx_booking_notices_tenant_created ON public.respondo_booking_notices(tenant_id,created_at DESC)');
  await db.query('ALTER TABLE public.respondo_booking_notices ENABLE ROW LEVEL SECURITY');
  await db.query('REVOKE ALL PRIVILEGES ON TABLE public.respondo_booking_notices FROM PUBLIC');
  const roles=await db.query("SELECT rolname FROM pg_roles WHERE rolname=ANY($1::text[])",[['anon','authenticated','service_role']]);
  for(const row of roles.rows||[])if(['anon','authenticated','service_role'].includes(row.rolname))
    await db.query('REVOKE ALL PRIVILEGES ON TABLE public.respondo_booking_notices FROM '+row.rolname);
}
export async function queueBookingNotice(db,tenantId,requestId,kind){
  if(!validUuid(tenantId)||!validUuid(requestId)||!kinds.has(kind))throw TypeError('Invalid booking notice');
  const r=await db.query(`INSERT INTO respondo_booking_notices(tenant_id,action_request_id,kind,recipient,language)
    SELECT ar.tenant_id,ar.id,$3,
      LOWER(BTRIM(ar.payload->'fields'->>'contact')),
      COALESCE(NULLIF(ar.payload->>'customerLanguage',''),'fi')
    FROM action_requests ar WHERE ar.tenant_id=$1 AND ar.id=$2 AND ar.request_type='booking'
      AND ar.payload->'fields'->>'contact' ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]{2,}$'
    ON CONFLICT(tenant_id,action_request_id,kind) DO NOTHING RETURNING id`,[tenantId,requestId,kind]);
  return {queued:r.rowCount===1,reason:r.rowCount===1?'queued':'no_email_or_already_queued'};
}
export async function sendBookingNotice(db,tenantId,requestId,kind,{apiKey,from,send}={}){
  if(!validUuid(tenantId)||!validUuid(requestId)||!kinds.has(kind))throw TypeError('Invalid booking notice');
  if(!apiKey||!from)return {status:'not_configured'};
  const claimed=await db.query(`UPDATE respondo_booking_notices n SET status='sending',attempts=attempts+1
    WHERE n.tenant_id=$1 AND n.action_request_id=$2 AND n.kind=$3 AND n.status='pending'
    RETURNING n.id,n.recipient,n.language`,[tenantId,requestId,kind]);
  if(!claimed.rowCount)return {status:'not_pending'};
  const notice=claimed.rows[0];
  try{
    const r=await db.query(`SELECT t.name,ar.payload,ar.result FROM action_requests ar
      JOIN tenants t ON t.id=ar.tenant_id
      WHERE ar.tenant_id=$1 AND ar.id=$2`,[tenantId,requestId]);
    if(!r.rowCount)throw Error('Original booking request missing');
    const {name,payload,result}=r.rows[0];
    // The pending message must still match the owner's committed decision.
    // Never notify a visitor of a booking state merely because an outbox
    // entry exists (for example after a cancellation or concurrent retry).
    const actualDecision=String(result?.internalBooking?.decision||'');
    if(actualDecision!==kind)
      throw Error('Booking decision changed; notification withheld');
    const confirmed=actualDecision==='confirmed';
    const requested=payload?.requestedSlot;
    const content=bookingNoticeContent({kind,language:notice.language,companyName:name,
      startsAt:confirmed?requested?.startsAt:null,endsAt:confirmed?requested?.endsAt:null});
    if(!email(notice.recipient))throw Error('Unusable email');
    const transport=send || (async params=>{
      const response=await fetch('https://api.resend.com/emails',{
        method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},
        body:JSON.stringify({from,to:[params.to],subject:params.subject,html:params.html}),
        signal:AbortSignal.timeout(8500),
      });
      if(!response.ok)throw Error('Existing transactional provider unavailable');
      const json=await response.json().catch(()=>({}));
      return String(json?.id||'').slice(0,120);
    });
    const providerId=await transport({to:notice.recipient,...content});
    await db.query(`UPDATE respondo_booking_notices SET status='sent',provider_id=$4,sent_at=NOW()
      WHERE id=$1 AND tenant_id=$2 AND status='sending' AND kind=$3`,
      [notice.id,tenantId,kind,String(providerId||'').slice(0,120)]);
    return {status:'sent'};
  }catch(error){
    // No automatic retry for an unknown external delivery state: avoid doubles.
    await db.query(`UPDATE respondo_booking_notices SET status='failed'
      WHERE id=$1 AND tenant_id=$2 AND status='sending'`,[notice.id,tenantId]);
    return {status:'failed'};
  }
}
export async function bookingNoticesOverview(db,tenantId){
  const r=await db.query(`SELECT action_request_id,kind,status,created_at,sent_at
    FROM respondo_booking_notices WHERE tenant_id=$1
    ORDER BY created_at DESC LIMIT 80`,[tenantId]);
  return {notices:r.rows||[],automaticDeliveryDependsOnExistingEmailConfiguration:true};
}
