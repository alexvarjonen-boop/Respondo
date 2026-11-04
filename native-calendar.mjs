// First-party Respondo service scheduling. No Google/Microsoft/third-party
// booking is required or implied. A customer action is an unconfirmed
// booking REQUEST until a company owner approves it in this calendar.
import {randomUUID} from 'node:crypto';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const validId=x=>UUID.test(String(x||''));
const text=(x,n)=>String(x??'').trim().slice(0,n);
const date=x=>new Date(x).getTime();
export function validateInternalReservation(request,slot,now=Date.now()){
  const requested=request?.payload?.requestedSlot;
  const workload=request?.payload?.serviceCapacity;
  if(!requested||!workload||workload.approvalRequired!==true)
    throw new TypeError('This request requires a validated service duration');
  const minutes=Number(workload.durationMinutes);
  if(!Number.isInteger(minutes)||minutes<1||minutes>1440)
    throw new TypeError('The required service duration is not verified');
  if(!slot||slot.status!=='open'||String(slot.id)!==String(requested.slotId))
    throw new TypeError('Requested Respondo calendar slot is not open');
  const start=date(slot.starts_at),end=date(slot.ends_at);
  if(!Number.isFinite(start)||!Number.isFinite(end)||start<=now+60000||end<=start)
    throw new TypeError('The requested slot is invalid or has already begun');
  if(start!==date(requested.startsAt)||end!==date(requested.endsAt))
    throw new TypeError('The requested slot has changed; ask customer to select again');
  if(end-start<minutes*60000)
    throw new TypeError('The service will not fit within the selected interval');
  if(end-start>1440*60000)throw new TypeError('Unusually long slots need manual scheduling');
  return {startsAt:new Date(start).toISOString(),endsAt:new Date(end).toISOString(),
    requiredMinutes:minutes, reservedMinutes:Math.round((end-start)/60000)};
}
export async function ensureNativeCalendarSchema(db){
  await db.query(`CREATE TABLE IF NOT EXISTS public.respondo_native_calendar_events(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    action_request_id UUID NOT NULL REFERENCES public.action_requests(id) ON DELETE CASCADE,
    slot_id UUID NOT NULL REFERENCES public.booking_slots(id) ON DELETE CASCADE,
    starts_at TIMESTAMPTZ NOT NULL,ends_at TIMESTAMPTZ NOT NULL,
    required_minutes INTEGER NOT NULL CHECK(required_minutes BETWEEN 1 AND 1440),
    status TEXT NOT NULL DEFAULT 'confirmed'
      CHECK(status IN ('confirmed','cancelled')),
    decision_note TEXT NOT NULL DEFAULT '',
    decided_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id,action_request_id),
    CHECK(ends_at>starts_at)
  )`);
  await db.query('CREATE INDEX IF NOT EXISTS idx_native_calendar_tenant_start ON public.respondo_native_calendar_events(tenant_id,starts_at DESC)');
  await db.query('ALTER TABLE public.respondo_native_calendar_events ENABLE ROW LEVEL SECURITY');
  await db.query('REVOKE ALL PRIVILEGES ON TABLE public.respondo_native_calendar_events FROM PUBLIC');
  const roles=await db.query("SELECT rolname FROM pg_roles WHERE rolname=ANY($1::text[])",[['anon','authenticated','service_role']]);
  for(const row of roles.rows||[])if(['anon','authenticated','service_role'].includes(row.rolname))
    await db.query('REVOKE ALL PRIVILEGES ON TABLE public.respondo_native_calendar_events FROM '+row.rolname);
}
export async function nativeCalendarOverview(db,tenantId){
  const [pending,events,slots]=await Promise.all([
    db.query(`SELECT id,created_at,payload->'fields' AS fields,
      payload->'requestedSlot' AS requested_slot,
      payload->'serviceCapacity' AS service_capacity,request_type,status
      FROM action_requests WHERE tenant_id=$1 AND request_type='booking'
        AND payload ? 'requestedSlot' AND status IN ('new','in_progress')
      ORDER BY created_at ASC LIMIT 100`,[tenantId]),
    db.query(`SELECT id,action_request_id,slot_id,starts_at,ends_at,required_minutes,
      status,decision_note,created_at FROM respondo_native_calendar_events
      WHERE tenant_id=$1 ORDER BY starts_at DESC LIMIT 100`,[tenantId]),
    db.query(`SELECT id,starts_at,ends_at,status FROM booking_slots
      WHERE tenant_id=$1 AND ends_at>=NOW()-INTERVAL '7 days'
      ORDER BY starts_at ASC LIMIT 200`,[tenantId])
  ]);
  return {
    pending:(pending.rows||[]).map(x=>({
      id:x.id,createdAt:x.created_at,status:x.status,
      customerName:text(x.fields?.name,120),contact:text(x.fields?.contact,220),
      requestedSlot:x.requested_slot,
      serviceCapacity:{
        durationMinutes:Number(x.service_capacity?.durationMinutes)||null,
        approvalRequired:x.service_capacity?.approvalRequired===true
      }
    })),
    events:events.rows||[],slots:slots.rows||[],
    externalCalendarSynchronized:false,
    customerAutomaticallyNotified:false,
    bookingPolicy:'Requires owner decision and sufficient unoccupied native interval'
  };
}
export async function decideNativeBooking(db,tenantId,requestId,userId,input={}){
  if(!validId(requestId)||!['confirm','reject'].includes(input.decision))
    throw new TypeError('Invalid native booking decision');
  const note=text(input.note,600);
  if(String(input.note||'').length>600)throw new TypeError('Decision note is too long');
  const client=await db.connect();
  try{
    await client.query('BEGIN');
    // Every native and public booking operation locks the tenant row first,
    // serializing competing reservations for different overlapping slots.
    const tenant=await client.query('SELECT id FROM tenants WHERE id=$1 FOR UPDATE',[tenantId]);
    if(!tenant.rowCount)throw new TypeError('Workspace not found');
    const result=await client.query(
      `SELECT id,request_type,status,payload,result FROM action_requests
      WHERE tenant_id=$1 AND id=$2 FOR UPDATE`,[tenantId,requestId]);
    const request=result.rows[0];
    if(!request||request.request_type!=='booking'
      ||!['new','in_progress'].includes(request.status)
      ||!request.payload?.requestedSlot)throw new TypeError('Pending booking request not found');
    const now=new Date().toISOString();
    if(input.decision==='reject'){
      await client.query(`UPDATE action_requests SET status='done',
        result=COALESCE(result,'{}'::jsonb)||$3::jsonb,updated_at=NOW()
        WHERE tenant_id=$1 AND id=$2`,[tenantId,requestId,JSON.stringify({
        internalBooking:{decision:'rejected',decidedAt:now,decidedBy:text(userId,120),
          note,customerNotified:false,externalCalendarSynchronized:false}
      })]);
      await client.query('COMMIT');
      return {status:'rejected',confirmed:false,customerNotified:false};
    }
    const slotId=request.payload.requestedSlot.slotId;
    if(!validId(slotId))throw new TypeError('Invalid requested slot reference');
    const sr=await client.query(
      'SELECT id,starts_at,ends_at,status FROM booking_slots WHERE tenant_id=$1 AND id=$2 FOR UPDATE',
      [tenantId,slotId]);
    const capacity=validateInternalReservation(request,sr.rows[0]);
    const clash=await client.query(
      `SELECT id FROM booking_slots WHERE tenant_id=$1 AND status='booked'
      AND starts_at < $3::timestamptz AND ends_at > $2::timestamptz LIMIT 1`,
      [tenantId,capacity.startsAt,capacity.endsAt]);
    if(clash.rowCount)throw new TypeError('Another booking overlaps this interval');
    const nativeClash=await client.query(
      `SELECT id FROM respondo_native_calendar_events WHERE tenant_id=$1 AND status='confirmed'
      AND starts_at < $3::timestamptz AND ends_at > $2::timestamptz LIMIT 1`,
      [tenantId,capacity.startsAt,capacity.endsAt]);
    if(nativeClash.rowCount)throw new TypeError('An existing Respondo reservation overlaps');
    const booked=await client.query(
      "UPDATE booking_slots SET status='booked' WHERE tenant_id=$1 AND id=$2 AND status='open' RETURNING id",
      [tenantId,slotId]);
    if(!booked.rowCount)throw new TypeError('Requested slot is no longer open');
    const inserted=await client.query(
      `INSERT INTO respondo_native_calendar_events(
        tenant_id,action_request_id,slot_id,starts_at,ends_at,
        required_minutes,decision_note,decided_by)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id,starts_at,ends_at`,
      [tenantId,requestId,slotId,capacity.startsAt,capacity.endsAt,
        capacity.requiredMinutes,note,text(userId,120)]);
    await client.query(`UPDATE action_requests SET status='done',
      result=COALESCE(result,'{}'::jsonb)||$3::jsonb,updated_at=NOW()
      WHERE tenant_id=$1 AND id=$2`,[tenantId,requestId,JSON.stringify({
      internalBooking:{decision:'confirmed',decidedAt:now,decidedBy:text(userId,120),
        eventId:inserted.rows[0].id,note,customerNotified:false,
        externalCalendarSynchronized:false}
    })]);
    await client.query('COMMIT');
    return {confirmed:true,status:'confirmed',eventId:inserted.rows[0].id,
      startsAt:capacity.startsAt,endsAt:capacity.endsAt,
      requiredMinutes:capacity.requiredMinutes,customerNotified:false,
      externalCalendarSynchronized:false};
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{});
    throw error;
  }finally{client.release();}
}
export async function cancelNativeBooking(db,tenantId,eventId,userId){
  if(!validId(eventId))throw new TypeError('Invalid reservation reference');
  const client=await db.connect();
  try{
    await client.query('BEGIN');
    const tenant=await client.query('SELECT id FROM tenants WHERE id=$1 FOR UPDATE',[tenantId]);
    if(!tenant.rowCount)throw new TypeError('Workspace not found');
    const found=await client.query(
      `SELECT id,slot_id,status,action_request_id FROM respondo_native_calendar_events
      WHERE tenant_id=$1 AND id=$2 FOR UPDATE`,[tenantId,eventId]);
    if(!found.rows[0]||found.rows[0].status!=='confirmed')
      throw new TypeError('Confirmed reservation not found');
    await client.query(
      "UPDATE respondo_native_calendar_events SET status='cancelled',updated_at=NOW() WHERE tenant_id=$1 AND id=$2",
      [tenantId,eventId]);
    await client.query(
      "UPDATE booking_slots SET status='open' WHERE tenant_id=$1 AND id=$2 AND status='booked' AND starts_at>NOW()",
      [tenantId,found.rows[0].slot_id]);
    await client.query(`UPDATE action_requests SET
      result=COALESCE(result,'{}'::jsonb)||$3::jsonb,updated_at=NOW()
      WHERE tenant_id=$1 AND id=$2`,[tenantId,found.rows[0].action_request_id,
      JSON.stringify({internalBooking:{decision:'cancelled',decidedAt:new Date().toISOString(),
        decidedBy:text(userId,120),customerNotified:false,externalCalendarSynchronized:false}})]);
    await client.query('COMMIT');
    return {status:'cancelled',customerNotified:false,externalCalendarSynchronized:false};
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{});
    throw error;
  }finally{client.release();}
}
