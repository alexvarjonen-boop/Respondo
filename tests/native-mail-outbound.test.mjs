import test from 'node:test';
import assert from 'node:assert/strict';
import {buildApprovedMailRequest,sendApprovedNativeMail} from '../native-mail-outbound.mjs';

const ids={tenantId:'22222222-2222-4222-8222-222222222222',
 threadId:'33333333-3333-4333-8333-333333333333',
 deliveryId:'44444444-4444-4444-8444-444444444444'};
test('Gmail uses reply threading and MIME references, not an invented appointment',()=>{
 const req=buildApprovedMailRequest({provider:'gmail',token:'fake-valid-auth-token',
 recipient:'customer@example.com',text:'Please confirm your service details.',
 messageId:'ab123',threadId:'thread123',originalRfcId:'<original@example.com>',subject:'Booking'});
 assert.equal(new URL(req.url).host,'gmail.googleapis.com');
 const data=JSON.parse(req.options.body);
 const mime=Buffer.from(data.raw,'base64url').toString('utf8');
 assert.match(mime,/To: customer@example.com/);
 assert.match(mime,/In-Reply-To: <original@example.com>/);
 assert.equal(data.threadId,'thread123');
 assert.match(mime,/UGxlYXNlIGNvbmZpcm0/);
});
test('Outlook replies only to the identified incoming message',()=>{
 const req=buildApprovedMailRequest({provider:'outlook',token:'fake-valid-auth-token',
 recipient:'customer@example.com',text:'Thanks, please specify quantity.',
 messageId:'AAMk=123+/abcdef',subject:'Request'});
 assert.match(req.url,/graph.microsoft.com\/v1.0\/me\/messages\//);
 assert.equal(req.options.method,'POST');
 assert.deepEqual(JSON.parse(req.options.body),{comment:'Thanks, please specify quantity.'});
});
test('blocks email header injection and invalid original identity',()=>{
 assert.throws(()=>buildApprovedMailRequest({provider:'gmail',token:'fake-valid-auth-token',
 recipient:'x@example.com\r\nBcc:evil@example.com',text:'Hello',messageId:'m',
 threadId:'t',originalRfcId:'<x@example.com>',subject:'Hello'}),/Invalid/);
});
function mockDb({claimed=true}={}){
 const statements=[];let sends=0;
 const client={
  query:async(sql,params)=>{
   statements.push({sql,params});
   if(sql.includes('FROM chat_threads WHERE id='))return {rows:[{id:ids.threadId,source_channel:'email',external_contact_id:'outlook:client@example.com',status:'open'}],rowCount:1};
   if(sql.includes('FROM chat_messages'))return {rows:[{metadata:{provider:'outlook',providerMessageId:'msg123',subject:'Request'}}],rowCount:1};
   if(sql.includes('INSERT INTO respondo_native_mail_deliveries'))return {rows:claimed?[{delivery_id:ids.deliveryId}]:[],rowCount:claimed?1:0};
   if(sql.includes('SELECT thread_id,status'))return {rows:[{thread_id:ids.threadId,status:'unknown'}],rowCount:1};
   if(sql.includes("SET status='sent'"))return {rows:[{thread_id:ids.threadId,provider:'outlook',recipient:'client@example.com',text:'Please specify the number of windows.'}],rowCount:1};
   return {rows:[],rowCount:1};
  },release:()=>{}};
 return {db:{connect:async()=>client,query:async(sql,p)=>{statements.push({sql,params:p});return {rowCount:1}}},statements,getSends:()=>sends};
}
test('owner-approved reply claimed before external delivery, success audited',async()=>{
 const {db,statements}=mockDb();
 let called=0;
 const result=await sendApprovedNativeMail(db,{...ids,userId:'owner',approved:true,
  text:'Please specify the number of windows.',token:'fake-valid-auth-token',
  fetcher:async()=>{called++;assert(statements.some(s=>s.sql.includes('INSERT INTO respondo_native_mail_deliveries')));return {ok:true,status:202}}});
 assert.equal(called,1);assert.equal(result.status,'sent');
 assert(statements.some(s=>s.sql.includes("SET status='sent'")));
});
test('an unknown original delivery never automatically retries',async()=>{
 const {db}=mockDb({claimed:false});let called=0;
 const r=await sendApprovedNativeMail(db,{...ids,userId:'owner',approved:true,
  text:'Please confirm.',token:'fake-valid-auth-token',fetcher:async()=>{called++;throw Error('should not fetch')}});
 assert.equal(r.status,'unknown');assert.equal(r.duplicate,true);assert.equal(called,0);
});
test('transport timeout is unknown, not falsely marked sent',async()=>{
 const {db,statements}=mockDb();
 const r=await sendApprovedNativeMail(db,{...ids,userId:'owner',approved:true,
  text:'Please confirm.',token:'fake-valid-auth-token',fetcher:async()=>{throw Error('timeout')}});
 assert.equal(r.status,'unknown');assert.equal(r.autoRetry,false);
 assert(!statements.some(s=>s.sql.includes("SET status='sent'")));
});
test('never send without explicit approval',async()=>{
 const {db}=mockDb();await assert.rejects(
  sendApprovedNativeMail(db,{...ids,userId:'owner',approved:false,text:'Hello',token:'fake-valid-auth-token'}),
  /Explicit owner approval/);
});
