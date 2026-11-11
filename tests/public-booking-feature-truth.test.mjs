import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FEATURE_GROUPS,FEATURE_COUNT,publicPlanFeatureCount} from '../public/features-data.js';

test('public booking features distinguish tentative requests from confirmed reservations FI/SV/EN',()=>{
  const booking=FEATURE_GROUPS.find(x=>x.key==='booking');
  assert(booking && booking.items.length>=10);
  const tentative=booking.items.find(row=>/tentative appointment time/.test(row[2]));
  const receipt=booking.items.find(row=>/Booking request receipt/.test(row[2]));
  assert(tentative);
  assert(receipt);
  assert.match(tentative[0],/Alustavan/);
  assert.match(tentative[1],/preliminär/);
  assert.match(receipt[0],/vahvistetaan erikseen/);
  assert.match(receipt[1],/bekräftas separat/);
  assert.match(receipt[2],/confirmed separately/);
  assert(!booking.items.some(row=>row[2]==='Shows booking confirmation to customer'),
    'an unconfirmed booking request must not be sold as an instant confirmed reservation');
});
test('public catalogue count and pricing eligibility still derive from one approved data source',()=>{
  assert.equal(FEATURE_COUNT,FEATURE_GROUPS.reduce((n,g)=>n+g.items.length,0));
  assert(publicPlanFeatureCount('advanced')<=FEATURE_COUNT);
  assert(publicPlanFeatureCount('enterprise')<=FEATURE_COUNT);
  assert(publicPlanFeatureCount('enterprise')>=publicPlanFeatureCount('advanced'));
});
test('public integration guide explains provider setup and explicitly approved bookings in all three languages',()=>{
 const source=readFileSync(new URL('../public/global-resources.mjs',import.meta.url),'utf8');
 assert.match(source,/Respondo.s native booking and customer tools are distinct from external integrations/);
 assert.match(source,/Each business must still authorize and test its own account/);
 assert.match(source,/Ulkoiset yhteydet tulevat hallintapaneeliin näkyviin vain/);
 assert.match(source,/Respondos egna boknings- och kundverktyg/);
 assert.match(source,/A booking is confirmed only through a connected flow/);
});
