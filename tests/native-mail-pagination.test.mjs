import test from 'node:test';
import assert from 'node:assert/strict';
import {getNativeMailboxMessages} from '../native-mail-bridge.mjs';

const reply=(data)=>({ok:true,headers:{get:()=>null},text:async()=>JSON.stringify(data)});
test('Gmail paginates safely and reads every listed message',async()=>{
 const called=[];
 const fetcher=async(url,opts)=>{
  called.push(url);
  assert.equal(opts.method,'GET');
  assert.equal(opts.redirect,'error');
  const u=new URL(url);
  assert.equal(u.host,'gmail.googleapis.com');
  if(u.pathname.endsWith('/messages')){
   return reply(u.searchParams.get('pageToken')==='next_2'
    ?{messages:[{id:'msg2'}]}
    :{messages:[{id:'msg1'}],nextPageToken:'next_2'});
  }
  const id=u.pathname.split('/').at(-1);
  return reply({payload:{headers:[
   {name:'From',value:'Jane <jane@example.com>'},
   {name:'Subject',value:'Cleaning'}
  ]},snippet:id});
 };
 const messages=await getNativeMailboxMessages('gmail','test-fake-oauth-token',{limit:30,fetcher});
 assert.deepEqual(messages.map(x=>x.externalId),['msg1','msg2']);
 assert.equal(messages[0].email,'jane@example.com');
 assert.equal(called.filter(x=>x.includes('pageToken=next_2')).length,1);
});

test('Outlook follows only Graph inbox continuation URLs',async()=>{
 const next='https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$skiptoken=safe_2';
 const fetcher=async(url,opts)=>{
  assert.equal(opts.method,'GET');
  assert.equal(opts.redirect,'error');
  return reply(url.includes('skiptoken')?{value:[{id:'m2',subject:'Two',bodyPreview:'Hello',
   from:{emailAddress:{address:'b@example.com'}}}]}:
   {value:[{id:'m1',subject:'One',bodyPreview:'Hi',
   from:{emailAddress:{address:'a@example.com'}}}],'@odata.nextLink':next});
 };
 const items=await getNativeMailboxMessages('outlook','test-fake-oauth-token',{limit:30,fetcher});
 assert.deepEqual(items.map(x=>x.externalId),['m1','m2']);
});

test('rejects forged Graph continuation instead of leaking bearer token',async()=>{
 let called=0;
 const fetcher=async()=>{
  called++;
  return reply({value:[{id:'a',subject:'Hello',bodyPreview:'Question',
   from:{emailAddress:{address:'a@example.com'}}}],
   '@odata.nextLink':'https://evil.example/v1.0/me/mailFolders/inbox/messages'});
 };
 await assert.rejects(
  getNativeMailboxMessages('outlook','test-fake-oauth-token',{limit:30,fetcher}),
  /invalid_mail_cursor/
 );
 assert.equal(called,1);
});

test('mail pagination has a hard bound',async()=>{
 await assert.rejects(getNativeMailboxMessages('gmail','test-fake-oauth-token',{limit:61}),
  /Mailbox limit/);
});
