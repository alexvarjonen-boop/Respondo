import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeMailboxProvider,getNativeMailboxMessages,storeNativeMailboxMessages} from '../native-mail-bridge.mjs';
test('only delegated Gmail/Outlook are eligible mailboxes',()=>{
 assert.equal(nativeMailboxProvider('gmail'),true);
 assert.equal(nativeMailboxProvider('outlook'),true);
 assert.equal(nativeMailboxProvider('whatsapp'),false);
});
test('Outlook inbox metadata can be normalized without sending',async()=>{
 const fetcher=async (url,opts)=>{
  assert.equal(opts.method,'GET');assert.equal(opts.redirect,'error');
  return {ok:true,headers:{get:()=>null},text:async()=>JSON.stringify({value:[
   {id:'x123',subject:'Booking request',bodyPreview:'Can you come Friday?',
    from:{emailAddress:{address:'client@example.com'}}}
  ]})};
 };
 const r=await getNativeMailboxMessages('outlook','test-fake-oauth-token',{fetcher});
 assert.equal(r.length,1);assert.equal(r[0].email,'client@example.com');
});
test('mailbox drafts are scoped and idempotent at DB event claim',async()=>{
 const statements=[],params=[];let duplicate=false;
 const client={query:async(sql,p)=>{
  statements.push(sql);params.push(p);
  if(sql.includes('INSERT INTO respondo_native_mail_events'))return {rowCount:duplicate?0:1,rows:duplicate?[]:[{message_id:'m1'}]};
  if(sql.includes('INSERT INTO chat_threads'))return {rowCount:1,rows:[{id:'11111111-1111-4111-8111-111111111111'}]};
  return {rowCount:1,rows:[]};
 },release:()=>{}};
 const db={connect:async()=>client};
 const tenant='22222222-2222-4222-8222-222222222222';
 const items=[{externalId:'m1',email:'client@example.com',title:'Hello',snippet:'Question'}];
 const first=await storeNativeMailboxMessages(db,tenant,'gmail',items);
 assert.equal(first.imported,1);assert.equal(first.autoSent,false);
 duplicate=true;
 const second=await storeNativeMailboxMessages(db,tenant,'gmail',items);
 assert.equal(second.imported,0);
 assert(statements.some(s=>s.includes('ON CONFLICT DO NOTHING')));
 assert(statements.some(s=>s.includes("'human'")));
 assert(params.some(p=>Array.isArray(p)&&p.includes(tenant)));
});
test('mailbox integration ignores missing sender identities and invalid tenants',async()=>{
 const db={connect:()=>{throw Error('should not connect')}};
 await assert.rejects(storeNativeMailboxMessages(db,'invalid','gmail',[]),/Invalid mailbox/);
 const result=await storeNativeMailboxMessages(db,'22222222-2222-4222-8222-222222222222',
  'gmail',[{externalId:'m2',email:'bad',title:'Hello',snippet:'World'}]);
 assert.equal(result.imported,0);
});
