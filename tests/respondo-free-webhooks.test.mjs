import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {deriveFreeWebhookSecret,signFreeWebhookPayload,verifyFreeWebhook,
 rotateFreeWebhookKey,acceptFreeWebhookEvent} from '../respondo-free-webhooks.mjs';
const tenant='22222222-2222-4222-8222-222222222222';
const nonce='1'.repeat(36);
const master='local-test-master-secret-more-than-24-characters';
const secret=deriveFreeWebhookSecret(tenant,nonce,master);
const timestamp=1700000000,now=timestamp*1000;
const eventId='order:shopify:A100';
const body=Buffer.from(JSON.stringify({kind:'order_status',data:{
 source:'manual',reference:'#A100',customerEmail:'buyer@example.com',
 status:'processing',currency:'EUR',totalCents:10000
}}));
const signed=signFreeWebhookPayload(secret,timestamp,body);
test('HMAC is tenant and key scoped, with timestamp replay window',()=>{
 assert.match(secret,/^[a-f0-9]{64}$/);
 assert.notEqual(secret,deriveFreeWebhookSecret('33333333-3333-4333-8333-333333333333',nonce,master));
 const options={tenantId:tenant,nonce,master,rawBody:body,timestamp:String(timestamp),
  signature:signed,eventId,now};
 assert.equal(verifyFreeWebhook(options),true);
 assert.equal(verifyFreeWebhook({...options,tenantId:'33333333-3333-4333-8333-333333333333'}),false);
 assert.equal(verifyFreeWebhook({...options,signature:'sha256='+'a'.repeat(64)}),false);
 assert.equal(verifyFreeWebhook({...options,now:now+301000}),false);
 assert.equal(verifyFreeWebhook({...options,eventId:'../path'}),false);
 assert.equal(verifyFreeWebhook({...options,rawBody:Buffer.concat([body,Buffer.from('x')])}),false);
 assert.equal(verifyFreeWebhook({...options,rawBody:Buffer.alloc(30001)}),false);
});
test('signature is domain separated and cannot be forged with a modified body',()=>{
 assert.equal(signed,signFreeWebhookPayload(secret,timestamp,body));
 assert.notEqual(signed,signFreeWebhookPayload(secret,timestamp,Buffer.from('{}')));
 assert.notEqual(signed,signFreeWebhookPayload(secret,timestamp+1,body));
});
function fakeDb({claimed=true}={}){
 const calls=[];
 const client={query:async(sql,args)=>{
  calls.push({sql,args});
  if(sql.includes('INSERT INTO respondo_free_webhook_events'))
   return {rowCount:claimed?1:0,rows:claimed?[{id:'44444444-4444-4444-8444-444444444444'}]:[]};
  if(sql.includes('INSERT INTO respondo_native_order_snapshots'))
   return {rowCount:1,rows:[{id:tenant,status:'processing'}]};
  if(sql.includes('INSERT INTO respondo_native_tasks'))
   return {rowCount:1,rows:[{id:tenant}]};
  return {rowCount:1,rows:[]};
 },release:()=>{}};
 return {calls,db:{
  query:async(sql,args)=>{
   calls.push({sql,args});
   if(sql.includes('SELECT nonce FROM respondo_free_webhook_keys'))
    return {rowCount:1,rows:[{nonce}]};
   if(sql.includes('INSERT INTO respondo_free_webhook_keys'))
    return {rowCount:1,rows:[{enabled:true}]};
   return {rowCount:1,rows:[]};
  },connect:async()=>client
 }};
}
test('valid signed order event writes only tenant-owned snapshot and atomically claims event',async()=>{
 const {db,calls}=fakeDb();
 const r=await acceptFreeWebhookEvent(db,{tenantId:tenant,rawBody:body,
  eventId,timestamp:String(timestamp),signature:signed,master,now});
 assert.equal(r.accepted,true);assert.equal(r.duplicate,false);assert.equal(r.externalCalls,0);
 assert(calls.some(x=>x.sql.includes('INSERT INTO respondo_native_order_snapshots')&&x.args[0]===tenant));
 assert(calls.some(x=>x.sql.includes('INSERT INTO respondo_free_webhook_events')&&x.args[0]===tenant));
 assert(calls.some(x=>x.sql==='COMMIT'));
});
test('replayed signed events do not write a second order',async()=>{
 const {db,calls}=fakeDb({claimed:false});
 const r=await acceptFreeWebhookEvent(db,{tenantId:tenant,rawBody:body,
  eventId,timestamp:String(timestamp),signature:signed,master,now});
 assert.equal(r.duplicate,true);
 assert(!calls.some(x=>x.sql.includes('INSERT INTO respondo_native_order_snapshots')));
});
test('tampered signature causes no event write',async()=>{
 const {db,calls}=fakeDb();
 await assert.rejects(acceptFreeWebhookEvent(db,{tenantId:tenant,rawBody:body,
  eventId,timestamp:String(timestamp),signature:'sha256='+'0'.repeat(64),
  master,now}),/Invalid webhook signature/);
 assert(!calls.some(x=>x.sql.includes('INSERT INTO respondo_free_webhook_events')));
});
test('signed lead event creates only an internal contact and task',async()=>{
 const {db,calls}=fakeDb();
 const payload=Buffer.from(JSON.stringify({kind:'lead_captured',data:{
  name:'Anni',email:'anni@example.com',note:'Asked for quote'
 }}));
 const r=await acceptFreeWebhookEvent(db,{tenantId:tenant,rawBody:payload,
  eventId:'lead:external:12345',timestamp:String(timestamp),
  signature:signFreeWebhookPayload(secret,timestamp,payload),master,now});
 assert.equal(r.kind,'lead_captured');
 assert(calls.some(x=>x.sql.includes('INSERT INTO respondo_native_contacts')&&x.args[0]===tenant));
 assert(calls.some(x=>x.sql.includes('INSERT INTO respondo_native_tasks')&&x.args[0]===tenant));
});
test('key rotation requires a strong master and never persists the plaintext signing secret',async()=>{
 const {db,calls}=fakeDb();
 const r=await rotateFreeWebhookKey(db,tenant,master);
 assert.match(r.signingSecret,/^[0-9a-f]{64}$/);
 assert.equal(r.paidProviderRequired,false);
 assert(calls.some(x=>x.sql.includes('INSERT INTO respondo_free_webhook_keys')&&x.args[0]===tenant&&
   /^[0-9a-f]{36}$/.test(x.args[1])));
 assert(!calls.some(x=>x.args?.includes(r.signingSecret)));
 await assert.rejects(rotateFreeWebhookKey(db,tenant,'weak'),/master secret/);
});
test('inbound webhook requires rate limiting and owner rotation API',()=>{
 const s=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
 assert.match(s,/api\/webhooks\/respondo-native\/:tenantId',publicChatLimiter/);
 assert.match(s,/api\/app\/native\/free-webhook\/rotate',auth,ownerOnly,subscribed,nativeWriteLimiter/);
 assert.match(s,/req\.rawBody/);
});
