import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequestTrackingToken,verifyRequestTrackingToken,renderRequestStatusPage} from '../customer-portal-links.mjs';
const tenant='89c8ee53-fda7-46c4-ae21-79a4d6d6119c';
const request='0dd12609-5fc0-4186-bbfe-0435a039b3b5';
const secret='s'.repeat(64);
const now=1794390000000;
test('customer request tracking token is tenant-scoped, signed and expires',()=>{
 const token=createRequestTrackingToken({tenantId:tenant,requestId:request,secret,now});
 assert.deepEqual(verifyRequestTrackingToken(token,secret,{now:now+3000}),{tenantId:tenant,requestId:request});
 assert.equal(verifyRequestTrackingToken(token,secret,{now:now+31*24*3600000}),null);
 assert.equal(verifyRequestTrackingToken(token,'x'.repeat(64),{now}),null);
 assert.equal(verifyRequestTrackingToken(token+'junk',secret,{now}),null);
 assert.equal(verifyRequestTrackingToken('broken',secret,{now}),null);
});
test('invalid tenant request or secret cannot generate tracking tokens',()=>{
 assert.throws(()=>createRequestTrackingToken({tenantId:'bad',requestId:request,secret}),TypeError);
 assert.throws(()=>createRequestTrackingToken({tenantId:tenant,requestId:request,secret:'short'}),TypeError);
 assert.equal(verifyRequestTrackingToken('a'.repeat(700),secret),null);
});
test('tracking page is localized, private and does not promise a booking or payment',()=>{
 for(const lang of ['fi','sv','en']){
  const html=renderRequestStatusPage({token:'example.token',lang,type:'quote',status:'done'});
  assert.match(html,/noindex,nofollow,noarchive/);
  assert.doesNotMatch(html,/<form/);
  assert.match(html,/30/);
 }
 const html=renderRequestStatusPage({token:'abc.def',lang:'en',type:'booking',status:'new'});
 assert.match(html,/method="post"/);
 assert.match(html,/does not mean a confirmed price, booking or payment/);
});

test('preview status page is explicit, read-only, localized and has no live request action',()=>{
 for(const [lang,label] of [['fi','ESIKATSELU'],['sv','FÖRHANDSVISNING'],['en','PREVIEW']]){
   const page=renderRequestStatusPage({lang,preview:true,type:'quote',status:'in_progress'});
   assert.match(page,new RegExp(label));
   assert.match(page,/noindex,nofollow,noarchive/);
   assert.doesNotMatch(page,/<form|method="post"|\/request-status\//);
   assert.match(page,/In progress|Käsittelyssä|Under behandling/);
 }
});
