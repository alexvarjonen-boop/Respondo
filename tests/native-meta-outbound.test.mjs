import test from 'node:test';
import assert from 'node:assert/strict';
import {buildApprovedMetaReply,sendApprovedNativeMeta} from '../native-meta-outbound.mjs';
const ids={tenantId:'22222222-2222-4222-8222-222222222222',
 threadId:'33333333-3333-4333-8333-333333333333',
 deliveryId:'44444444-4444-4444-8444-444444444444'};
test('WhatsApp sends a text via the verified phone number ID',()=>{
 const r=buildApprovedMetaReply({provider:'whatsapp',resourceId:'12345678901',
  recipient:'358401234567',accessToken:'valid-fake-token',text:'Please clarify the quantity.'});
 assert.equal(new URL(r.url).host,'graph.facebook.com');
 assert.deepEqual(JSON.parse(r.options.body),{messaging_product:'whatsapp',
  to:'358401234567',type:'text',text:{body:'Please clarify the quantity.'}});
 assert.equal(r.options.redirect,'error');
});
test('Facebook and Instagram have distinct send contracts',()=>{
 for(const provider of ['facebook','instagram']){
  const r=buildApprovedMetaReply({provider,resourceId:'1234567',recipient:'7654321',
   accessToken:'valid-fake-token',text:'Hello'});
  const body=JSON.parse(r.options.body);
  assert.equal(body.recipient.id,'7654321');
  assert.equal(body.message.text,'Hello');
  assert.equal(body.messaging_type,provider==='facebook'?'RESPONSE':undefined);
 }
 assert.throws(()=>buildApprovedMetaReply({provider:'instagram',resourceId:'1234567',
  recipient:'7654321',accessToken:'valid-fake-token',text:'x'.repeat(1001)}),/Invalid/);
});
test('Meta refuses unsigned consent, invalid IDs and fake user-scoped identifiers',async()=>{
 assert.throws(()=>buildApprovedMetaReply({provider:'whatsapp',resourceId:'not-an-id',
  recipient:'7654321',accessToken:'valid-fake-token',text:'Hello'}),/Invalid/);
 const db={connect:async()=>{throw Error('no connection should be opened')}};
 await assert.rejects(sendApprovedNativeMeta(db,{...ids,approved:false,text:'Hello'}),/explicit approval/);
});
function fakeDb({claimed=true,age=1000}={}){
 const statements=[];
 const client={query:async(sql,p)=>{
  statements.push({sql,params:p});
  if(sql.includes('FROM chat_threads'))return {rows:[{source_channel:'whatsapp',
    external_contact_id:'358401234567',status:'open'}],rowCount:1};
  if(sql.includes('FROM chat_messages'))return {rows:[{created_at:new Date(1700000000000),metadata:{providerTimestampMs:1700000000000-age}}],rowCount:1};
  if(sql.includes('FROM respondo_meta_connections'))return {rows:[{resource_id:'12345678901',access_token_encrypted:'ciphertext'}],rowCount:1};
  if(sql.includes('INSERT INTO respondo_native_meta_deliveries'))return {rows:claimed?[{delivery_id:ids.deliveryId}]:[],rowCount:claimed?1:0};
  if(sql.includes('SELECT thread_id,status'))return {rows:[{thread_id:ids.threadId,status:'unknown'}],rowCount:1};
  if(sql.includes("SET status='sent'"))return {rows:[{provider:'whatsapp',recipient:'358401234567',text:'Thanks'}],rowCount:1};
  return {rows:[],rowCount:1};
 },release:()=>{}};
 return {db:{connect:async()=>client},statements};
}
test('Meta customer-care window is enforced before credential use',async()=>{
 const {db}=fakeDb({age:24*3600000});
 await assert.rejects(sendApprovedNativeMeta(db,{...ids,userId:'owner',approved:true,
  text:'Thanks',now:1700000000000,getAccessToken:()=>{throw Error('should not decrypt')}}),/window expired/);
});
test('Meta sent reply is audited and unknown deliveries never automatically retry',async()=>{
 const {db,statements}=fakeDb();
 let sent=0;
 const r=await sendApprovedNativeMeta(db,{...ids,userId:'owner',approved:true,
  text:'Thanks',now:1700000000000,getAccessToken:()=> 'valid-fake-token',
  fetcher:async(url,opts)=>{sent++;assert.equal(opts.method,'POST');return {ok:true,json:async()=>({messages:[{id:'wamid.abc'}]})}}});
 assert.equal(sent,1);assert.equal(r.status,'sent');
 assert(statements.some(x=>x.sql.includes('INSERT INTO chat_messages')));
 const x=fakeDb({claimed:false});sent=0;
 const second=await sendApprovedNativeMeta(x.db,{...ids,userId:'owner',approved:true,
  text:'Thanks',now:1700000000000,getAccessToken:()=> 'valid-fake-token',
  fetcher:async()=>{sent++;throw Error('must not send')}});
 assert.equal(second.status,'unknown');assert.equal(second.duplicate,true);assert.equal(sent,0);
});
