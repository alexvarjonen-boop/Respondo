import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeConversionData,conversionOverview} from '../respondo-conversion-analytics.mjs';

const TENANT='e6139f85-2222-4e56-b12f-d106c88cc172';

test('CRM wins are company-marked status, never inferred payment or revenue',()=>{
  const summary=summarizeConversionData(
    [{channel:'website',engaged:20,converted:5}],
    [{request_type:'booking',submitted:7,confirmed_bookings:2,paid_quotes:0},
     {request_type:'quote',submitted:4,confirmed_bookings:0,paid_quotes:1}],
    [{total:9}],
    [{stage:'won',total:3},{stage:'lost',total:2},{stage:'qualified',total:4}]
  );
  assert.equal(summary.engagedVisitors,20);
  assert.equal(summary.actionRatePercent,25);
  assert.equal(summary.submittedRequests,11);
  assert.equal(summary.confirmedBookings,2);
  assert.equal(summary.verifiedPayments,0);
  assert.equal(summary.reportedPaidQuotes,1);
  assert.equal(summary.paymentsLedgerVerified,false);
  assert.equal(summary.crmWonContacts,3);
  assert.equal(summary.crmStages.qualified,4);
  assert.equal(summary.salesConversionVerified,false);
  assert.equal(summary.revenueAttributed,false);
});

test('confirmation counts require explicit approval or an actually booked slot',async()=>{
  const seen=[];
  const db={query:async(sql,params)=>{
    seen.push({sql,params});
    if(sql.includes('WITH engaged AS'))return {rows:[{channel:'website',engaged:3,converted:1}]};
    if(sql.includes('FROM action_requests a'))return {rows:[{request_type:'booking',submitted:2,confirmed_bookings:1,paid_quotes:0}]};
    if(sql.includes('FROM respondo_native_contacts'))return {rows:[{stage:'won',total:1}]};
    return {rows:[{total:2}]};
  }};
  const report=await conversionOverview(db,TENANT,7);
  assert.equal(report.days,7);
  assert.equal(report.summary.confirmedBookings,1);
  assert.equal(report.summary.crmWonContacts,1);
  assert.equal(seen.length,4);
  assert.ok(seen.every(x=>x.params[0]===TENANT&&x.params[1]===7));
  const bookingQuery=seen.find(x=>x.sql.includes('FROM action_requests a')).sql;
  assert.match(bookingQuery,/respondo_native_calendar_events/);
  assert.match(bookingQuery,/status='confirmed'/);
  assert.match(bookingQuery,/booking_slots s/);
  assert.match(bookingQuery,/s\.status='booked'/);
  assert.doesNotMatch(bookingQuery,/payload\s*\?\s*'booking'/);
  assert.match(seen.find(x=>x.sql.includes('FROM respondo_native_contacts')).sql,/updated_at/);
});

test('untrusted CRM status or invalid counts cannot inflate metrics',()=>{
  const s=summarizeConversionData([],[],[],[
    {stage:'won',total:-5},{stage:'won',total:'not a number'},
    {stage:'won; DROP TABLE',total:500},{stage:'new',total:2}
  ]);
  assert.equal(s.crmWonContacts,0);
  assert.equal(s.crmStages.new,2);
  assert.equal(s.crmStages['won; DROP TABLE'],undefined);
});
