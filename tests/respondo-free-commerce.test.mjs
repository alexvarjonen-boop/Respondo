import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nativeOrderEmailDigest,validateNativeOrderSnapshot,putFreeOrderSnapshot,
 lookupFreeOrderStatus,freeOrderOverview} from '../respondo-free-commerce.mjs';
const tenant='22222222-2222-4222-8222-222222222222';
const other='33333333-3333-4333-8333-333333333333';
const secret='test-only-domain-separated-strong-secret';
const order={source:'shopify',reference:'#A100',status:'shipped',
 customerEmail:'Buyer@Example.COM',currency:'EUR',totalCents:12000,approved:true};
test('order import is owner-approved, safe and does not use merchant API',()=>{
 assert.deepEqual(validateNativeOrderSnapshot(order),{
  source:'shopify',reference:'#A100',status:'shipped',
  customerEmail:'buyer@example.com',currency:'EUR',totalCents:12000});
 assert.throws(()=>validateNativeOrderSnapshot({...order,status:'refunded_and_sent'}),/Unsupported/);
 assert.throws(()=>validateNativeOrderSnapshot({...order,reference:'../../api'}),/Valid order reference/);
});
test('customer lookup email is hashed and scoped by company',()=>{
 const first=nativeOrderEmailDigest(tenant,'Buyer@Example.COM',secret);
 assert.match(first,/^[a-f0-9]{64}$/);
 assert.equal(first,nativeOrderEmailDigest(tenant,'buyer@example.com',secret));
 assert.notEqual(first,nativeOrderEmailDigest(other,'buyer@example.com',secret));
 assert.notEqual(first,nativeOrderEmailDigest(tenant,'wrong@example.com',secret));
 assert.throws(()=>nativeOrderEmailDigest(tenant,'buyer@example.com','short'),/not configured/);
});
test('owner update preserves no provider-real-time verification',async()=>{
 const calls=[];
 const db={query:async(sql,params)=>{
  calls.push({sql,params});
  return {rows:[{id:tenant,source:'shopify',external_ref:'#A100',
   status:'shipped',currency:'EUR',total_cents:12000,updated_at:new Date(0)}],rowCount:1};
 }};
 await assert.rejects(putFreeOrderSnapshot(db,tenant,{...order,approved:false},{secret}),/Owner approval/);
 const result=await putFreeOrderSnapshot(db,tenant,order,{secret});
 assert.equal(result.realTimeProviderVerified,false);
 assert.equal(result.paidExternalCalls,0);
 assert(calls[0].sql.includes('ON CONFLICT(tenant_id,source,external_ref)'));
 assert.equal(calls[0].params[0],tenant);
 assert(!calls[0].params.some(x=>String(x).toLowerCase().includes('buyer@')));
});
test('customer order lookup requires exact reference and hashed email and never asserts provider live state',async()=>{
 const calls=[];
 const db={query:async(sql,params)=>{
  calls.push({sql,params});
  if(params[2]!==nativeOrderEmailDigest(tenant,'buyer@example.com',secret))
   return {rows:[]};
  return {rows:[{status:'shipped',source:'shopify',updated_at:'2026-11-05T10:00:00Z',
   provider_live_verified:false}]};
 }};
 const good=await lookupFreeOrderStatus(db,tenant,'#A100','buyer@example.com',{secret});
 assert.equal(good.status,'shipped');
 assert.equal(good.liveProviderVerified,false);
 assert.equal(good.sellerProvidedSnapshot,true);
 assert.equal(good.shippingTrackingVerified,false);
 assert.equal(await lookupFreeOrderStatus(db,tenant,'#A100','wrong@example.com',{secret}),null);
 assert(calls.every(c=>c.params[0]===tenant));
});
test('dashboard overview exposes no stored plaintext email',async()=>{
 const db={query:async(sql,args)=>{
  assert(sql.includes('FROM respondo_native_order_snapshots'));
  assert.deepEqual(args,[tenant]);return {rows:[]};
 }};
 const r=await freeOrderOverview(db,tenant);
 assert.equal(r.externalCostsTriggered,0);
 assert.deepEqual(r.orders,[]);
});
test('public order status demands widget token and customer email',()=>{
 const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
 assert.match(server,/order-status',publicChatLimiter/);
 assert.match(server,/validWidgetToken\(req,tenant,req\.body\?\.widgetToken\)/);
 assert.match(server,/lookupFreeOrderStatus\(pool,tenant\.id/);
});
