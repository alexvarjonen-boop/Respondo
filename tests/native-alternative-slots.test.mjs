import test from 'node:test';
import assert from 'node:assert/strict';
import {suggestedNativeAlternatives} from '../native-calendar.mjs';
const now=Date.parse('2026-11-18T10:00:00Z');
const stamp=mins=>new Date(now+mins*60000).toISOString();
const slot=(id,start,length,status='open')=>({id,starts_at:stamp(start),ends_at:stamp(start+length),status});
test('only future, sufficient, unoccupied native slots are suggested',()=>{
 const request={requestedSlot:{slotId:'old'},serviceCapacity:{durationMinutes:60}};
 const slots=[slot('past',-100,60),slot('short',120,30),slot('old',130,90),slot('booked',140,120,'booked'),
   slot('blocked',200,90),slot('valid-1',350,90),slot('valid-2',500,60),slot('valid-3',700,60),slot('valid-4',800,60)];
 const events=[{starts_at:stamp(210),ends_at:stamp(240),status:'confirmed'}];
 assert.deepEqual(suggestedNativeAlternatives(request,slots,events,now).map(x=>x.slotId),['valid-1','valid-2','valid-3']);
});
test('never claim alternative availability without a company-verified service duration',()=>{
 assert.deepEqual(suggestedNativeAlternatives({serviceCapacity:{durationMinutes:null}},[slot('a',100,60)],[],now),[]);
 assert.deepEqual(suggestedNativeAlternatives({},[slot('a',100,60)],[],now),[]);
});
