import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ensureNativeCalendarSchema,nativeCalendarOverview,
  validateInternalReservation,decideNativeBooking,cancelNativeBooking
} from '../native-calendar.mjs';

const tenant='af65da90-85a5-4ae1-9260-14355ace433f';
const req='d0d84b6c-e441-49ee-970c-fcd44f1d078f';
const slotId='f45c7ae0-ece1-4763-8c72-65bc178b39f1';
const eventId='ca1200dc-23ab-4c53-8e71-b343b4518617';
const user='owner-local-1';
const start=new Date(Date.now()+48*3600000).toISOString();
const end=new Date(new Date(start).getTime()+5*3600000).toISOString();
const request={
  id:req,request_type:'booking',status:'new',
  payload:{requestedSlot:{slotId,startsAt:start,endsAt:end},
    serviceCapacity:{durationMinutes:240,approvalRequired:true}}
};
const slot={id:slotId,starts_at:start,ends_at:end,status:'open'};

test('native booking refuses short slots, missing detail, stale slots and changed times',()=>{
  assert.deepEqual(validateInternalReservation(request,slot),{
    startsAt:start,endsAt:end,requiredMinutes:240,reservedMinutes:300
  });
  const shorter={...slot,ends_at:new Date(new Date(start).getTime()+2*3600000).toISOString()};
  assert.throws(()=>validateInternalReservation({...request,
    payload:{...request.payload,requestedSlot:{slotId,startsAt:start,endsAt:shorter.ends_at}}
  },shorter),/not fit/);
  assert.throws(()=>validateInternalReservation({...request,
    payload:{...request.payload,serviceCapacity:{approvalRequired:false,durationMinutes:120}}
  },slot),/validated/);
  assert.throws(()=>validateInternalReservation(request,{...slot,status:'booked'}),/not open/);
  assert.throws(()=>validateInternalReservation(request,{...slot,ends_at:new Date(Date.now()-1000).toISOString()}),TypeError);
});
test('schema is tenant-owned, restricts status and protects Data API access',async()=>{
  const statements=[];
  const db={query:async sql=>{
    statements.push(sql);
    if(sql.includes('SELECT rolname'))return {rows:[{rolname:'anon'},
      {rolname:'authenticated'},{rolname:'service_role'}]};
    return {rows:[]};
  }};
  await ensureNativeCalendarSchema(db);
  const all=statements.join('\n');
  assert.match(all,/REFERENCES public.tenants\(id\) ON DELETE CASCADE/);
  assert.match(all,/REFERENCES public.action_requests\(id\) ON DELETE CASCADE/);
  assert.match(all,/REFERENCES public.booking_slots\(id\) ON DELETE CASCADE/);
  assert.match(all,/UNIQUE\(tenant_id,action_request_id\)/);
  assert.match(all,/ENABLE ROW LEVEL SECURITY/);
  for(const role of ['anon','authenticated','service_role'])
    assert.match(all,new RegExp('FROM '+role+'(?:\\n|$)'));
});
test('owner calendar returns only tenant requests, events and slots; no customer notification claim',async()=>{
  const queries=[];
  const db={query:async(sql,args)=>{
    queries.push([sql,args]);
    if(sql.includes('FROM action_requests'))return {rows:[{id:req,
      fields:{name:'Customer',contact:'customer@example.org'},
      requested_slot:request.payload.requestedSlot,
      service_capacity:request.payload.serviceCapacity
    }]};
    if(sql.includes('FROM respondo_native_calendar_events'))return {rows:[{id:eventId,status:'confirmed'}]};
    return {rows:[slot]};
  }};
  const r=await nativeCalendarOverview(db,tenant);
  assert.equal(r.pending.length,1);
  assert.equal(r.pending[0].serviceCapacity.durationMinutes,240);
  assert.equal(r.externalCalendarSynchronized,false);
  assert.equal(r.customerAutomaticallyNotified,false);
  assert.ok(queries.every(([,args])=>args?.[0]===tenant));
});
test('owner confirmation locks tenant and request, validates duration and commits native slot once',async()=>{
  const statements=[],response={};
  const client={query:async(sql,args)=>{
    statements.push([sql,args]);
    if(sql.startsWith('SELECT id FROM tenants'))return {rowCount:1,rows:[{id:tenant}]};
    if(sql.includes('FROM action_requests')&&sql.includes('FOR UPDATE'))return {rows:[request]};
    if(sql.includes('FROM booking_slots')&&sql.includes('FOR UPDATE'))return {rows:[slot]};
    if(sql.includes("status='booked'")&&sql.startsWith('SELECT'))return {rowCount:0,rows:[]};
    if(sql.includes("status='confirmed'")&&sql.startsWith('SELECT'))return {rowCount:0,rows:[]};
    if(sql.includes('UPDATE booking_slots'))return {rowCount:1,rows:[{id:slotId}]};
    if(sql.includes('INSERT INTO respondo_native_calendar_events'))return {
      rowCount:1,rows:[{id:eventId,starts_at:start,ends_at:end}]};
    return {rowCount:1,rows:[]};
  },release(){}};
  const result=await decideNativeBooking({connect:async()=>client},tenant,req,user,{
    decision:'confirm',note:'Team member confirmed workload.'
  });
  assert.equal(result.status,'confirmed');
  assert.equal(result.confirmed,true);
  assert.equal(result.requiredMinutes,240);
  assert.equal(result.customerNotified,false);
  assert.equal(result.externalCalendarSynchronized,false);
  assert.equal(statements.at(-1)[0],'COMMIT');
  assert.ok(statements.find(([sql])=>sql.startsWith('SELECT id FROM tenants')));
  assert.ok(statements.find(([sql])=>sql.includes('FROM action_requests')&&sql.includes('FOR UPDATE')));
  const event=statements.find(([sql])=>sql.includes('INSERT INTO respondo_native_calendar_events'));
  assert.equal(event[1][0],tenant);
  assert.equal(event[1][1],req);
  assert.equal(event[1][2],slotId);
  assert.equal(event[1][5],240);
  assert.ok(!statements.some(([sql])=>/googleapis|microsoft\.com|calendar\.events/i.test(sql)));
  const action=statements.find(([sql])=>sql.includes("UPDATE action_requests SET status='done'"));
  assert.equal(JSON.parse(action[1][2]).internalBooking.customerNotified,false);
});
test('a booked overlapping slot blocks confirmation and rolls back all changes',async()=>{
  const statements=[];
  const client={query:async(sql,args)=>{
    statements.push([sql,args]);
    if(sql.startsWith('SELECT id FROM tenants'))return {rowCount:1,rows:[{id:tenant}]};
    if(sql.includes('FROM action_requests')&&sql.includes('FOR UPDATE'))return {rows:[request]};
    if(sql.includes('FROM booking_slots')&&sql.includes('FOR UPDATE'))return {rows:[slot]};
    if(sql.includes("status='booked'")&&sql.startsWith('SELECT'))return {rowCount:1,rows:[{id:'already-booked'}]};
    return {rows:[],rowCount:0};
  },release(){}};
  await assert.rejects(decideNativeBooking({connect:async()=>client},tenant,req,user,{
    decision:'confirm'
  }),/overlaps/);
  assert.ok(statements.some(([sql])=>sql==='ROLLBACK'));
  assert.ok(!statements.some(([sql])=>sql.includes('INSERT INTO respondo_native_calendar_events')));
  assert.ok(!statements.some(([sql])=>sql.includes('UPDATE booking_slots')));
});
test('rejecting a tentative reservation never claims or books the calendar slot',async()=>{
  const statements=[];
  const client={query:async(sql,args)=>{
    statements.push([sql,args]);
    if(sql.startsWith('SELECT id FROM tenants'))return {rowCount:1,rows:[{id:tenant}]};
    if(sql.includes('FROM action_requests')&&sql.includes('FOR UPDATE'))return {rows:[request]};
    return {rowCount:1,rows:[]};
  },release(){}};
  const r=await decideNativeBooking({connect:async()=>client},tenant,req,user,{
    decision:'reject',note:'No staff available'
  });
  assert.equal(r.confirmed,false);assert.equal(r.customerNotified,false);
  assert.equal(statements.at(-1)[0],'COMMIT');
  assert.ok(!statements.some(([sql])=>sql.includes('UPDATE booking_slots')));
});
test('previously processed request cannot be confirmed or double-booked',async()=>{
  const statements=[];
  const client={query:async(sql,args)=>{
    statements.push([sql,args]);
    if(sql.startsWith('SELECT id FROM tenants'))return {rowCount:1,rows:[{id:tenant}]};
    if(sql.includes('FROM action_requests')&&sql.includes('FOR UPDATE'))
      return {rows:[{...request,status:'done'}]};
    return {rows:[],rowCount:0};
  },release(){}};
  await assert.rejects(decideNativeBooking({connect:async()=>client},tenant,req,user,{
    decision:'confirm'
  }),/Pending booking/);
  assert.ok(statements.some(([sql])=>sql==='ROLLBACK'));
  assert.ok(!statements.some(([sql])=>sql.includes('INSERT INTO respondo_native_calendar_events')));
});
test('cancellation frees native future slot but never pretends to notify customer',async()=>{
  const calls=[];
  const client={query:async(sql,args)=>{
    calls.push([sql,args]);
    if(sql.startsWith('SELECT id FROM tenants'))return {rowCount:1,rows:[{id:tenant}]};
    if(sql.includes('FROM respondo_native_calendar_events')&&sql.includes('FOR UPDATE'))
      return {rows:[{id:eventId,slot_id:slotId,status:'confirmed',action_request_id:req}]};
    return {rowCount:1,rows:[]};
  },release(){}};
  const r=await cancelNativeBooking({connect:async()=>client},tenant,eventId,user);
  assert.equal(r.status,'cancelled');assert.equal(r.customerNotified,false);
  assert.ok(calls.some(([sql])=>sql.includes("SET status='open'")&&sql.includes('starts_at>NOW()')));
  assert.equal(calls.at(-1)[0],'COMMIT');
  const update=calls.find(([sql])=>sql.includes('UPDATE action_requests SET'));
  assert.equal(JSON.parse(update[1][2]).internalBooking.customerNotified,false);
});
test('server offers own protected booking and public overlap-safe display/commit',()=>{
  const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
  const entry=readFileSync(new URL('../server-entry.mjs',import.meta.url),'utf8');
  const ui=readFileSync(new URL('../public/native-ai-operations.js',import.meta.url),'utf8');
  assert.match(entry,/await ensureNativeCalendarSchema\(pool\)/);
  assert.match(server,/app\.get\('\/api\/app\/native\/calendar',auth,ownerOnly,subscribed/);
  assert.match(server,/decideNativeBooking\(pool,id,req.params.id,req.user.sub,req.body\|\|\{\}\)/);
  assert.match(server,/cancelNativeBooking\(pool,id,req.params.id,req.user.sub\)/);
  assert.match(server,/NOT EXISTS\(\s*SELECT 1 FROM booking_slots occupied/);
  assert.match(server,/await client\.query\('SELECT id FROM tenants WHERE id=\$1 FOR UPDATE',\[tenant\.id\]\)/);
  assert.match(server,/overlapping\.rowCount/);
  assert.match(ui,/calendarExternalWarning:/);
  assert.match(ui,/renderSchedule\(\)/);
  assert.match(ui,/decision:'confirm'/);
  assert.match(ui,/decision:'reject'/);
});
