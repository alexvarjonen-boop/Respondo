import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateInternalReservation} from '../native-calendar.mjs';
import {summarizeConversionData,conversionOverview} from '../respondo-conversion-analytics.mjs';
import {summarizeQualityGaps} from '../respondo-quality-center.mjs';

const tenant='71f3d66e-050d-4ce6-8f3f-f12a7cc95db9';
const slotId='d632a698-0de2-4749-b3d6-1b392e73eabc';
const start=new Date(Date.now()+48*60*60*1000).toISOString();
const end=new Date(Date.parse(start)+4*60*60*1000).toISOString();
const slot={id:slotId,starts_at:start,ends_at:end,status:'open'};
const request={payload:{
  requestedSlot:{slotId,startsAt:start,endsAt:end},
  serviceCapacity:{durationMinutes:null,approvalRequired:true,manualVerificationRequired:true}
}};

test('native booking requires an owner-verified duration without approved service rules',()=>{
  assert.throws(()=>validateInternalReservation(request,slot),/duration is not verified/);
  assert.throws(()=>validateInternalReservation(request,slot,Date.now(),0),/duration is not verified/);
  assert.throws(()=>validateInternalReservation(request,slot,Date.now(),241),/not fit/);
  assert.equal(validateInternalReservation(request,slot,Date.now(),240).requiredMinutes,240);
  const known={...request,payload:{...request.payload,
    serviceCapacity:{durationMinutes:200,approvalRequired:true}}};
  assert.equal(validateInternalReservation(known,slot,Date.now(),10).requiredMinutes,200,
    'a visitor or owner cannot shorten an approved company duration');
});

test('conversion summary is counts only, with no inferred sales or invented rate',()=>{
  const summary=summarizeConversionData(
    [{channel:'website',engaged:10,converted:2},{channel:'email',engaged:2,converted:0}],
    [{request_type:'booking',submitted:3,confirmed_bookings:1,paid_quotes:0},
     {request_type:'quote',submitted:2,confirmed_bookings:0,paid_quotes:1}],
    [{total:4}]
  );
  assert.equal(summary.engagedVisitors,12);
  assert.equal(summary.actionSubmittingVisitors,2);
  assert.equal(summary.actionRatePercent,17);
  assert.equal(summary.submittedRequests,5);
  assert.equal(summary.confirmedBookings,1);
  assert.equal(summary.verifiedPayments,1);
  assert.equal(summary.salesConversionVerified,false);
  assert.equal(summary.revenueAttributed,false);
  assert.equal(summarizeConversionData().actionRatePercent,null);
});

test('conversion queries are authenticated-tenant scoped and no personal data is returned',async()=>{
  const qs=[];
  const db={query:async(sql,args)=>{
    qs.push([sql,args]);
    if(sql.includes('WITH engaged'))return {rows:[{channel:'website',engaged:4,converted:1}]};
    if(sql.includes('FROM action_requests'))return {rows:[{request_type:'booking',submitted:1,confirmed_bookings:0,paid_quotes:0}]};
    if(sql.includes('FROM leads'))return {rows:[{total:1}]};
    throw Error('Unexpected query');
  }};
  const r=await conversionOverview(db,tenant,7);
  assert.equal(r.days,7);assert.equal(r.summary.actionRatePercent,25);
  assert.equal(qs.length,3);
  assert.ok(qs.every(([sql,args])=>args[0]===tenant&&args[1]===7&&sql.includes('tenant_id=$1')));
  assert.ok(!JSON.stringify(r).includes('email'));
  assert.ok(qs[0][0].includes('e.channel=c.channel'));
  assert.ok(qs[1][0].includes("result->>'paid'='true'"));
});

test('recurring low-confidence and handoff patterns are read-only owner suggestions',()=>{
  const rows=[
    {intent:'How to install?',channel:'website',reason:'handoff'},
    {intent:'How to install?',channel:'website',reason:'low_confidence'},
    {intent:'Pricing',channel:'email',reason:'low_confidence'}
  ];
  const groups=summarizeQualityGaps(rows);
  assert.equal(groups.length,2);
  assert.equal(groups[0].count,2);
  assert.equal(groups[0].handoffs,1);
  assert.equal(groups[0].lowConfidence,1);
  assert.ok(groups.every(group=>group.requiresOwnerApproval===true));
});

test('widget, server and owner UI use request-only safeguards for unverified workloads',()=>{
  const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
  const native=readFileSync(new URL('../native-calendar.mjs',import.meta.url),'utf8');
  const widget=readFileSync(new URL('../public/widget.js',import.meta.url),'utf8');
  const owner=readFileSync(new URL('../public/native-ai-operations.js',import.meta.url),'utf8');
  assert.match(server,/manualVerificationRequired:true/);
  assert.match(server,/if \(type === 'booking' && !serviceManualReview && actionAccess\.googleCalendar\)/);
  assert.match(server,/approvalRequired: type==='booking' && serviceManualReview/);
  assert.match(native,/manualVerified && note\.length<8/);
  assert.match(owner,/manualDuration\.type='number'/);
  assert.match(widget,/Selecting a slot does not reserve it/);
  assert.match(server,/app\.get\('\/api\/app\/native\/conversions',auth,ownerOnly,subscribed,nativeEndpoint/);
  assert.match(owner,/funnel\.actionRatePercent/);
});
