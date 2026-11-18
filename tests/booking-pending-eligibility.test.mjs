import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pendingBookingEligibility} from '../native-calendar.mjs';

test('expired or invalid customer booking requests cannot be confirmed from owner dashboard',()=>{
  const now=Date.parse('2026-11-18T12:00:00Z');
  const request={requestedSlot:{startsAt:'2026-11-18T13:00:00Z',endsAt:'2026-11-18T14:00:00Z'},
    serviceCapacity:{approvalRequired:true,durationMinutes:60}};
  assert.deepEqual(pendingBookingEligibility(request,now),{canConfirm:true,reason:null});
  assert.equal(pendingBookingEligibility({...request,requestedSlot:{...request.requestedSlot,startsAt:'2026-11-18T11:00:00Z'}},now).canConfirm,false);
  assert.deepEqual(pendingBookingEligibility({...request,serviceCapacity:{}},now),{canConfirm:false,reason:'duration_unverified'});
  assert.equal(pendingBookingEligibility({...request,requestedSlot:{startsAt:'oops',endsAt:'oops'}},now).reason,'invalid_requested_time');
});

test('bookings display expiry state before allowing owner confirmation',()=>{
  const ui=readFileSync(new URL('../public/native-ai-operations.js',import.meta.url),'utf8');
  const server=readFileSync(new URL('../native-calendar.mjs',import.meta.url),'utf8');
  assert.match(server,/pendingBookingEligibility\(\{requestedSlot:x\.requested_slot/);
  assert.match(ui,/if\(item\.canConfirm===false\)/);
  assert.match(ui,/confirm\.disabled=true/);
  assert.match(ui,/requested time has passed/);
});
