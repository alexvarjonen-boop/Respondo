import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {verifyMetaSignature,extractMetaInbound} from '../meta-inbound.mjs';
const secret='long-example-meta-app-secret';
test('valid Meta HMAC is accepted, forged payload rejected',()=>{
 const body=Buffer.from(JSON.stringify({object:'page',entry:[]}));
 const signature='sha256='+crypto.createHmac('sha256',secret).update(body).digest('hex');
 assert.equal(verifyMetaSignature(body,signature,secret),true);
 assert.equal(verifyMetaSignature(Buffer.from('tampered'),signature,secret),false);
 assert.equal(verifyMetaSignature(body,'sha256=abc',secret),false);
});
test('WhatsApp text events are mapped to provider resource and sender',()=>{
 const data={object:'whatsapp_business_account',entry:[{changes:[{value:{
  metadata:{phone_number_id:'12345678901'},messages:[{id:'wamid.message1',from:'358401234567',type:'text',text:{body:'Hei, aika perjantaina?'}}]
 }}]}]};
 const a=extractMetaInbound(data);assert.equal(a.length,1);
 assert.equal(a[0].provider,'whatsapp');assert.equal(a[0].resourceId,'12345678901');
 assert.equal(a[0].externalMessageId,'wamid.message1');
});
test('Instagram and Facebook text DMs produce tenant lookup keys, echoes ignored',()=>{
 for(const type of ['instagram','page']){
  const e=extractMetaInbound({object:type,entry:[{id:'12345678901',messaging:[
   {sender:{id:'2222222222'},recipient:{id:'12345678901'},message:{mid:'m123',text:'Hello'}},
   {sender:{id:'12345678901'},recipient:{id:'2222222222'},message:{mid:'m124',text:'Echo',is_echo:true}}
  ]}]});
  assert.equal(e.length,1);assert.equal(e[0].resourceId,'12345678901');
  assert.equal(e[0].provider,type==='page'?'facebook':'instagram');
 }
});
test('unsupported payloads are ignored',()=>assert.deepEqual(extractMetaInbound({object:'unknown',entry:[]}),[]));

test('Meta event timestamps are preserved, webhook arrival cannot renew a 24-hour window',()=>{
 const oldSeconds=Math.floor((Date.now()-25*3600000)/1000);
 const event=extractMetaInbound({object:'whatsapp_business_account',entry:[{changes:[{value:{
  metadata:{phone_number_id:'12345678901'},messages:[{
   id:'wamid.timestamp',from:'358401234567',type:'text',
   text:{body:'Hello'},timestamp:String(oldSeconds)}]
 }}]}]});
 assert.equal(event.length,1);
 assert.equal(event[0].providerTimestampMs,oldSeconds*1000);
 const untrusted=extractMetaInbound({object:'whatsapp_business_account',entry:[{changes:[{value:{
  metadata:{phone_number_id:'12345678901'},messages:[{
   id:'wamid.missing',from:'358401234567',type:'text',text:{body:'Hello'}}]
 }}]}]});
 assert.equal(untrusted[0].providerTimestampMs,null);
});
