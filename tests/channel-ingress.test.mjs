import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  validInboundEventId,reconstructedConversationHistory,ensureChannelIngressSchema,
  claimInboundEvent,completeInboundEvent,failInboundEvent
} from '../channel-ingress.mjs';

const tenant='c75bb41f-0277-4448-ae3b-dcebb568c53c';
const fakeTenant='0fc632f7-c027-44bf-87e5-3b4cc96f927f';
const eventId='mail.20261104.5c8f5f';

test('only safe opaque event IDs allowed, no email or URL leakage',()=>{
  assert.equal(validInboundEventId(eventId),true);
  assert.equal(validInboundEventId('abc'),false);
  assert.equal(validInboundEventId('liisa@example.com'),false);
  assert.equal(validInboundEventId('https://example.com?a=1'),false);
  assert.equal(validInboundEventId('a'.repeat(161)),false);
});
test('reconstruct only complete prior turns, not the just-appended user message',()=>{
  const rows=[
    {role:'assistant',message:'Old orphan reply'},
    {role:'user',message:'Mitä pakettiauto maksaa?'},
    {role:'assistant',message:'79 € vuorokausi.'},
    {role:'user',message:'Entä viikonloppuna?'}
  ];
  assert.deepEqual(reconstructedConversationHistory(rows),[{
    question:'Mitä pakettiauto maksaa?',answer:'79 € vuorokausi.',handoff:false
  }]);
});
test('interleaved human handoff preserves role and does not mispair unrelated replies',()=>{
  const rows=[
    {role:'user',message:'Can I book?'},
    {role:'human',message:'I can check availability.'},
    {role:'user',message:'First request without answer'},
    {role:'user',message:'Can you call me?'},
    {role:'assistant',message:'Please leave contact details.'},
    {role:'assistant',message:'An unpaired assistant reply'}
  ];
  assert.deepEqual(reconstructedConversationHistory(rows),[
    {question:'Can I book?',answer:'I can check availability.',handoff:true},
    {question:'Can you call me?',answer:'Please leave contact details.',handoff:false}
  ]);
});
test('channel ledger uses tenant FK, RLS, no Data API grants',async()=>{
  const sql=[];
  const db={query:async q=>{
    sql.push(q);
    if(q.includes('SELECT rolname'))return {rows:[{rolname:'anon'},{rolname:'authenticated'},{rolname:'service_role'}]};
    return {rows:[]};
  }};
  await ensureChannelIngressSchema(db);
  const text=sql.join('\n');
  assert.match(text,/tenant_id UUID NOT NULL REFERENCES public.tenants\(id\) ON DELETE CASCADE/);
  assert.match(text,/PRIMARY KEY\(tenant_id,channel,event_id\)/);
  assert.match(text,/ENABLE ROW LEVEL SECURITY/);
  assert.match(text,/FROM anon/);
  assert.match(text,/FROM authenticated/);
  assert.match(text,/FROM service_role/);
});
test('new event is claimed exactly once and later duplicates return cached result',async()=>{
  const calls=[];
  let saved=false,completed=false;
  const db={query:async(sql,args)=>{
    calls.push([sql,args]);
    if(sql.includes('INSERT INTO respondo_channel_ingest')){
      if(!saved){saved=true;return {rowCount:1,rows:[{status:'processing'}]};}
      return {rowCount:0,rows:[]};
    }
    if(sql.includes('SELECT status,response')){
      return {rows:[{status:completed?'completed':'processing',response:completed?{answer:'Correct answer'}:null}]};
    }
    if(sql.includes("SET status='completed'")){completed=true;return {rowCount:1,rows:[{event_id:eventId}]};}
    return {rowCount:1,rows:[]};
  }};
  assert.deepEqual(await claimInboundEvent(db,tenant,'email',eventId),{status:'new'});
  assert.deepEqual(await claimInboundEvent(db,tenant,'email',eventId),{status:'processing'});
  await completeInboundEvent(db,tenant,'email',eventId,{answer:'Correct answer'});
  assert.deepEqual(await claimInboundEvent(db,tenant,'email',eventId),{
    status:'completed',response:{answer:'Correct answer'}
  });
  assert.ok(calls.every(([,args])=>args?.[0]===tenant));
  assert.ok(calls.some(([sql])=>sql.includes("AND status='processing'")));
});
test('errors are held for manual reconciliation; no blind replay',async()=>{
  const calls=[];
  const db={query:async(sql,args)=>{
    calls.push([sql,args]);
    if(sql.includes('INSERT INTO'))return {rowCount:0,rows:[]};
    if(sql.includes('SELECT status,response'))return {rows:[{status:'failed',response:null}]};
    return {rowCount:1,rows:[]};
  }};
  assert.deepEqual(await claimInboundEvent(db,tenant,'api',eventId),{status:'failed'});
  await failInboundEvent(db,tenant,'api',eventId);
  assert.match(calls.at(-1)[0],/status='failed'/);
  assert.ok(calls.every(([,args])=>args[0]===tenant));
  await assert.rejects(claimInboundEvent(db,fakeTenant,'whatsapp',eventId),TypeError);
});
test('server and startup wire safe ingress, with backward compatible legacy callers',()=>{
  const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
  const entry=readFileSync(new URL('../server-entry.mjs',import.meta.url),'utf8');
  assert.match(entry,/ensureChannelIngressSchema\(pool\)/);
  assert.match(server,/reconstructedConversationHistory\(hr\.rows\.reverse\(\)\)/);
  assert.match(server,/claimInboundEvent\(pool,tenant\.id,channel,upstreamEventId\)/);
  assert.match(server,/completeInboundEvent\(pool,tenant\.id,channel,upstreamEventId,result\)/);
  assert.match(server,/detectConversationLanguage\(message,lang\)/);
  assert.match(server,/if\(upstreamEventId\)/);
  assert.match(server,/if\(claim\.status==='completed'\)/);
  assert.doesNotMatch(server,/channel = String\(req\.body\.channel[^;]+whatsapp/i);
});
