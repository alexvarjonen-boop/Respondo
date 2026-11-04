import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  ensureNativeInboxSchema,nativeInboxOverview,nativeInboxThread,
  saveNativeInboxDraft,addNativeInboxNote,closeNativeInboxThread,
  nativeInboxDraftSuggestion,nativeInboxDraftFromSources,
  sendNativeWebsiteReply
} from '../native-inbox.mjs';
const TENANT='af65da90-85a5-4ae1-9260-14355ace433f';
const OTHER='2ced0ff2-399c-4c21-89b4-3f4c53de02ca';
const THREAD='1b78683e-20fd-422e-a570-26be5ad947d0';
const DELIVERY='3be2c8bd-7a0a-4ed5-abfc-b1a61a264a03';
const SOURCE='c5a4105e-05df-442b-b04b-1c3846f5c80e';
const goodSource={id:SOURCE,title:'Ikkunanpesu hinta ja toimitus',
  answer:'Ikkunanpesu alkaen 49 euroa.',keywords:['ikkunanpesu','hinta'],
  approved:true};

test('only source-supported candidate is shown as unapproved draft, not automatic reply',()=>{
  const hit=nativeInboxDraftSuggestion('Ikkunanpesu hinta',[
    goodSource,{...goodSource,id:'de79435f-67a1-486b-b250-a2406fadd2ad',
      title:'Ikkunanpesu hinta',answer:'999 €',approved:false}
  ],'sv');
  assert.equal(hit.sourceId,SOURCE);
  assert.equal(hit.approvedForSend,false);
  assert.equal(hit.requiresLanguageAndFactReview,true);
  assert.equal(hit.languageRequested,'sv');
  assert.equal(nativeInboxDraftSuggestion('foo',[]),null);
});
test('inbox schemas have tenant/thread FK, RLS and no public data API rights',async()=>{
  const statements=[];
  const db={query:async(sql)=>{
    statements.push(sql);
    if(sql.includes('SELECT rolname'))return {rows:[
      {rolname:'anon'},{rolname:'authenticated'},{rolname:'service_role'}]};
    return {rows:[]};
  }};
  await ensureNativeInboxSchema(db);
  const all=statements.join('\n');
  for(const table of ['respondo_native_inbox_drafts','respondo_native_inbox_notes',
    'respondo_native_inbox_deliveries'])assert.match(all,new RegExp(table));
  assert.equal(statements.filter(s=>s.includes('ENABLE ROW LEVEL SECURITY')).length,3);
  assert.match(all,/REFERENCES public.tenants\(id\) ON DELETE CASCADE/);
  assert.match(all,/REFERENCES public.chat_threads\(id\) ON DELETE CASCADE/);
  assert.match(all,/PRIMARY KEY\(tenant_id,delivery_id\)/);
  for(const role of ['anon','authenticated','service_role'])
    assert.match(all,new RegExp('FROM '+role+'(?:\\n|$)'));
});
test('overview shows internal website delivery availability, not external sending claims',async()=>{
  const db={query:async(sql,args)=>{
    assert.deepEqual(args,[TENANT]);assert.match(sql,/WHERE ct.tenant_id=\$1/);
    return {rows:[
      {id:THREAD,source_channel:'website',preview:'Hei',last_role:'user'},
      {id:THREAD,source_channel:'email',preview:'Subject line',last_role:'user'}
    ]};
  }};
  const r=await nativeInboxOverview(db,TENANT);
  assert.equal(r.threads[0].canDeliverWithinRespondo,true);
  assert.equal(r.threads[1].canDeliverWithinRespondo,false);
  assert.equal(r.threads[1].externalDeliveryConnected,false);
});
test('thread history and notes cannot cross tenant boundaries',async()=>{
  const calls=[];
  const db={query:async(sql,args)=>{
    calls.push([sql,args]);
    if(sql.includes('FROM chat_threads WHERE'))return {rows:[{id:THREAD,source_channel:'api'}]};
    return {rows:[]};
  }};
  const r=await nativeInboxThread(db,TENANT,THREAD);
  assert.equal(r.thread.source_channel,'api');
  assert.equal(r.thread.canDeliverWithinRespondo,false);
  assert.ok(calls.every(([,args])=>args[0]===TENANT&&args[1]===THREAD));
  assert.ok(calls.every(([sql])=>/tenant_id=\$1/.test(sql)));
  await assert.rejects(nativeInboxThread(db,OTHER,'bad-thread'),TypeError);
});
test('manual draft never sends and is saved only if this workspace owns the thread',async()=>{
  const calls=[];
  const db={query:async(sql,args)=>{
    calls.push([sql,args]);
    return {rows:[{text:args[2]}]};
  }};
  const r=await saveNativeInboxDraft(db,TENANT,THREAD,'owner',{text:'We will follow up.'});
  assert.equal(r.text,'We will follow up.');
  assert.match(calls[0][0],/FROM chat_threads WHERE id=\$2 AND tenant_id=\$1/);
  assert.doesNotMatch(calls[0][0],/INSERT INTO chat_messages/);
  await assert.rejects(saveNativeInboxDraft(db,TENANT,THREAD,'owner',{text:'x'.repeat(4001)}),TypeError);
});
test('private note stays separate from visitor-visible messages',async()=>{
  const calls=[];
  const db={query:async(sql,args)=>{
    calls.push([sql,args]);return {rows:[{id:SOURCE,note:args[2]}]};
  }};
  const r=await addNativeInboxNote(db,TENANT,THREAD,'owner',{note:'Call customer tomorrow'});
  assert.equal(r.note,'Call customer tomorrow');
  assert.match(calls[0][0],/INSERT INTO respondo_native_inbox_notes/);
  assert.doesNotMatch(calls[0][0],/INSERT INTO chat_messages/);
});
test('only open/closed tenant-owned thread status updates are allowed',async()=>{
  const db={query:async(sql,args)=>({rows:[{id:args[1],status:args[2]}]})};
  assert.equal((await closeNativeInboxThread(db,TENANT,THREAD,'closed')).status,'closed');
  await assert.rejects(closeNativeInboxThread(db,TENANT,THREAD,'deleted'),TypeError);
});
test('website reply goes to native chat with transactional idempotency and explicit owner',async()=>{
  const calls=[];
  const client={query:async(sql,args)=>{
    calls.push([sql,args]);
    if(sql.startsWith('SELECT source_channel'))return {rows:[{
      source_channel:'website',external_contact_id:'visitor-ref',visitor_ref:'visitor-ref',status:'open'
    }]};
    if(sql.includes('INSERT INTO respondo_native_inbox_deliveries'))
      return {rowCount:1,rows:[{delivery_id:DELIVERY}]};
    if(sql.includes('INSERT INTO chat_messages'))return {rows:[{
      id:args[0],role:'human',message:args[5]
    }]};
    return {rowCount:1,rows:[]};
  },release(){}};
  const db={connect:async()=>client};
  const result=await sendNativeWebsiteReply(db,TENANT,THREAD,'owner',{
    deliveryId:DELIVERY,text:'The window cleaning costs 49 €.'
  });
  assert.equal(result.sent,true);assert.equal(result.channel,'website');
  assert.equal(calls.at(-1)[0],'COMMIT');
  const send=calls.find(x=>x[0].includes('INSERT INTO chat_messages'));
  assert.equal(send[1][1],TENANT);
  assert.equal(send[1][2],THREAD);
  assert.equal(send[1][5],'The window cleaning costs 49 €.');
  assert.match(send[0],/'human'/);
  assert.equal(calls.filter(x=>x[0].includes('INSERT INTO chat_messages')).length,1);
});
test('external channels reject website reply without writing messages',async()=>{
  const calls=[];
  const client={query:async(sql,args)=>{
    calls.push([sql,args]);
    if(sql.startsWith('SELECT source_channel'))return {rows:[{source_channel:'email',status:'open'}]};
    return {rows:[],rowCount:0};
  },release(){}};
  await assert.rejects(sendNativeWebsiteReply({connect:async()=>client},TENANT,THREAD,'owner',{
    deliveryId:DELIVERY,text:'We will call you.'
  }),/External channels/);
  assert.equal(calls.filter(x=>x[0].includes('INSERT INTO chat_messages')).length,0);
  assert.ok(calls.some(x=>x[0]==='ROLLBACK'));
});
test('duplicate delivery ID returns original message and never creates second reply',async()=>{
  const calls=[];
  const client={query:async(sql,args)=>{
    calls.push([sql,args]);
    if(sql.startsWith('SELECT source_channel'))return {rows:[{
      source_channel:'website',visitor_ref:'ref',external_contact_id:'ref',status:'open'
    }]};
    if(sql.includes('INSERT INTO respondo_native_inbox_deliveries'))return {rowCount:0,rows:[]};
    if(sql.includes('SELECT thread_id,message_id'))return {rows:[{
      thread_id:THREAD,message_id:SOURCE
    }]};
    return {rows:[]};
  },release(){}};
  const result=await sendNativeWebsiteReply({connect:async()=>client},TENANT,THREAD,'owner',{
    deliveryId:DELIVERY,text:'A reply.'
  });
  assert.equal(result.duplicate,true);
  assert.equal(result.messageId,SOURCE);
  assert.equal(calls.filter(x=>x[0].includes('INSERT INTO chat_messages')).length,0);
});
test('the native source suggestion queries only tenant-approved sources',async()=>{
  const calls=[];
  const db={query:async(sql,args)=>{
    calls.push([sql,args]);
    if(sql.includes('SELECT language'))return {rows:[{language:'fi'}]};
    if(sql.includes('FROM chat_messages'))return {rows:[{message:'Ikkunanpesu hinta'}]};
    return {rows:[goodSource]};
  }};
  const output=await nativeInboxDraftFromSources(db,TENANT,THREAD);
  assert.equal(output.suggestion.sourceId,SOURCE);
  assert.ok(calls.every(([,args])=>args[0]===TENANT));
  assert.ok(calls.some(([sql])=>sql.includes('approved=TRUE')));
});
test('owner-only inbox API and FI/SV/EN dashboard, no external delivery are wired',()=>{
  const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
  const entry=readFileSync(new URL('../server-entry.mjs',import.meta.url),'utf8');
  const ui=readFileSync(new URL('../public/native-ai-operations.js',import.meta.url),'utf8');
  assert.match(entry,/await ensureNativeInboxSchema\(pool\)/);
  for(const path of ['/api/app/native/inbox','/api/app/native/inbox/:id/draft',
    '/api/app/native/inbox/:id/reply','/api/app/native/inbox/:id/notes']){
    assert.ok(server.includes("'"+path+"'"));
  }
  assert.match(server,/sendNativeWebsiteReply\(pool,id,req.params.id,req.user.sub,req.body\|\|\{\}\)/);
  assert.match(ui,/inboxIntro:/);
  assert.match(ui,/inboxExternalOnly:/);
  assert.match(ui,/const INBOX=API\+'\/inbox'/);
  assert.match(ui,/renderInbox\(\)/);
  assert.match(ui,/crypto\.randomUUID\(\)/);
  assert.doesNotMatch(ui,/innerHTML\s*=/);
});
