import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateServiceRule,parseWindowFacts,missingWindowFact,estimateWindowDuration,
  fitServiceSlots,ensureServiceCapacitySchema,readServiceRule,saveServiceRule,
  serviceDialogue} from '../service-capacity.mjs';

const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const tenant='2a4e7d8c-39a8-4c91-801d-a3c6ce3137c9';
const visitor='visitor-test';
const rule={serviceKey:'window_cleaning',enabled:true,minutesPerWindow:7,
  baseMinutes:20,bufferMinutes:20,largeMultiplier:1.5,doubleSidedMultiplier:2,
  difficultAccessMinutes:30,maxWindows:80};
const iso=(hours)=>new Date(Date.now()+hours*3600000).toISOString();

test('company must explicitly configure time standards and enable the rule',()=>{
  assert.equal(validateServiceRule(rule).enabled,true);
  assert.equal(validateServiceRule({...rule,enabled:false}).enabled,false);
  assert.throws(()=>validateServiceRule({...rule,minutesPerWindow:-4}),TypeError);
  assert.throws(()=>validateServiceRule({...rule,maxWindows:99999}),TypeError);
  assert.throws(()=>validateServiceRule({...rule,serviceKey:'anything_else'}),TypeError);
});

test('natural Finnish and multilingual window-count phrases are understood without mistaking time 15:00 for count',()=>{
  const examples=[
    ['30 isoo ikkunaa',30,'large'],['30 isoa ikkunaa',30,'large'],
    ['30 ikkunaa',30,null],['30 large windows',30,'large'],
    ['30 fönster',30,null],['meillä on 30 isoja',30,'large'],
    ['ikkunoita 30',30,null]
  ];
  for(const [phrase,number,size] of examples){
    const facts=parseWindowFacts(phrase);
    assert.equal(facts.quantity,number,phrase);
    if(size)assert.equal(facts.size,size,phrase);
  }
  assert.equal(parseWindowFacts('perjantaina klo 15').quantity,undefined);
  assert.equal(parseWindowFacts('molemmilt puolilt ja normaalisti pääsee').sides,'both');
  assert.equal(parseWindowFacts('molemmilt puolilt ja normaalisti pääsee').access,'easy');
});

test('missing job facts prompt in strict order and must never imply certainty',()=>{
  let facts={};
  assert.equal(missingWindowFact(facts),'count');
  facts=parseWindowFacts('30 isoo ikkunaa',facts);
  assert.equal(missingWindowFact(facts),'sides');
  facts=parseWindowFacts('molemmilt puolilt ja normaalisti pääsee',facts);
  assert.equal(missingWindowFact(facts),null);
  assert.equal(estimateWindowDuration(rule,{}).status,'needs_details');
});

test('30 large double-sided windows with travel time exceed two hours',()=>{
  const facts=parseWindowFacts('molemmilt puolilt ja normaalisti pääsee',
    parseWindowFacts('30 isoo ikkunaa'));
  const estimate=estimateWindowDuration(rule,facts);
  assert.equal(estimate.status,'estimated');
  assert.equal(estimate.minutes,670);
  const twoHours=[{id:'short',starts_at:iso(24),ends_at:iso(26)}];
  assert.equal(fitServiceSlots(twoHours,estimate.minutes).length,0);
});

test('capacity requires one contiguous slot; conflicts reject events at beginning middle and end',()=>{
  const long=[{id:'long',starts_at:iso(24),ends_at:iso(29)}];
  assert.equal(fitServiceSlots(long,240).length,1);
  for(const offset of [24,26,28]){
    const conflict=[{start:iso(offset),end:iso(offset+0.5)}];
    assert.equal(fitServiceSlots(long,240,conflict).length,0);
  }
  assert.equal(fitServiceSlots(long,240,[{start:iso(30),end:iso(31)}]).length,1);
  assert.equal(fitServiceSlots(long,360).length,0);
  assert.equal(fitServiceSlots(long,240,[{start:'broken',end:iso(28)}]).length,0);
});

test('unsafe or unconfigured durations fall back to manual review',()=>{
  assert.throws(()=>estimateWindowDuration({...rule,enabled:false},{}),TypeError);
  assert.equal(estimateWindowDuration({...rule,maxWindows:20},{
    quantity:30,size:'large',sides:'both',access:'easy'}).status,'manual_review');
  assert.equal(estimateWindowDuration({...rule,minutesPerWindow:180},{
    quantity:30,size:'large',sides:'both',access:'easy'}).status,'manual_review');
});

test('RLS, strict tenant keys and no public Supabase Data API rights protect both tables',async()=>{
  const sql=[];const db={query:async q=>{sql.push(q);return {rows:[]};}};
  await ensureServiceCapacitySchema(db);
  for(const key of ['respondo_service_capacity','respondo_service_dialogues']){
    assert.ok(sql.some(x=>x.includes('CREATE TABLE IF NOT EXISTS public.'+key)));
    assert.ok(sql.includes('ALTER TABLE public.'+key+' ENABLE ROW LEVEL SECURITY'));
    assert.ok(sql.includes('REVOKE ALL PRIVILEGES ON TABLE public.'+key+
      ' FROM PUBLIC,anon,authenticated,service_role'));
  }
  assert.equal(sql.filter(x=>x.includes('REFERENCES public.tenants(id) ON DELETE CASCADE')).length,2);
});

test('only owning tenant can fetch and save duration rules',async()=>{
  const calls=[];
  const db={query:async(query,args)=>{
    calls.push([query,args]);
    return query.includes('SELECT config')?{rows:[{config:rule,enabled:true}]}:
      {rows:[{config:rule,enabled:true}]};
  }};
  assert.equal((await readServiceRule(db,tenant)).minutesPerWindow,7);
  assert.equal((await saveServiceRule(db,tenant,rule)).enabled,true);
  assert.ok(calls.every(x=>x[1][0]===tenant));
  assert.ok(calls.every(x=>x[0].includes('tenant_id')));
});

test('multi-turn dialogue asks questions and provides tentative options only after full intake',async()=>{
  let facts=null,writeCount=0;
  const db={query:async(query,args)=>{
    if(query.includes('FROM respondo_service_capacity'))return {rows:[{config:rule,enabled:true}],rowCount:1};
    if(query.includes('SELECT facts FROM respondo_service_dialogues'))
      return facts?{rows:[{facts}],rowCount:1}:{rows:[],rowCount:0};
    if(query.includes('INSERT INTO respondo_service_dialogues')){
      facts=JSON.parse(args[2]);writeCount++;return {rows:[],rowCount:1};
    }
    throw Error('unexpected SQL: '+query.slice(0,40));
  }};
  let availableCalls=0;
  const available=async minutes=>{availableCalls++;return fitServiceSlots([
    {id:'short',starts_at:iso(24),ends_at:iso(26)},
    {id:'long',starts_at:iso(48),ends_at:iso(64)}
  ],minutes);};
  const first=await serviceDialogue(db,tenant,visitor,'Olisiko perjantaina klo 15 aikaa ikkunanpesuun?','fi',available);
  assert.equal(first.status,'needs_details');
  assert.match(first.answer,/monta ikkunaa/);
  const second=await serviceDialogue(db,tenant,visitor,'30 isoo ikkunaa','fi',available);
  assert.equal(second.status,'needs_details');
  assert.match(second.answer,/puolilta/);
  const done=await serviceDialogue(db,tenant,visitor,'molemmilt puolilt ja normaalisti pääsee','fi',available);
  assert.equal(done.status,'proposed');
  assert.match(done.answer,/arviolta/);
  assert.equal(availableCalls,1);
  assert.equal(writeCount,3);
  assert.ok(!done.answer.includes('varattu'));
  assert.equal((await serviceDialogue(db,tenant,visitor,'kiitos!','fi',available)),null);
});

test('price inquiry must not be trapped into unrelated scheduling questions',async()=>{
  const db={query:async q=>{
    if(q.includes('FROM respondo_service_capacity'))return {rows:[{config:rule,enabled:true}]};
    return {rows:[],rowCount:0};
  }};
  assert.equal(await serviceDialogue(db,tenant,visitor,'Mitä ikkunanpesu maksaa?','fi',async()=>[]),null);
});

test('failed Google Calendar lookup never produces a phantom free appointment',async()=>{
  let facts={quantity:30,size:'large',sides:'both',access:'easy'};
  const db={query:async query=>{
    if(query.includes('FROM respondo_service_capacity'))return {rows:[{config:rule,enabled:true}]};
    if(query.includes('SELECT facts FROM'))return {rowCount:1,rows:[{facts}]};
    return {rowCount:1,rows:[]};
  }};
  const result=await serviceDialogue(db,tenant,visitor,'perjantaina klo 15','fi',
    async()=>{throw Error('Google calendar unavailable');});
  assert.equal(result.status,'calendar_unverified');
  assert.match(result.answer,/en voi luvata aikaa/);
});

test('browser, server and owner interface use the same server-side capacity rules',()=>{
  const server=file('server.mjs'),widget=file('public/widget.js'),app=file('public/app.js');
  const index=file('public/index.html'),boot=file('server-entry.mjs');
  assert.match(server,/serviceDialogue\(pool,t.id,visitorRef,message,detectedLang/);
  assert.match(server,/fitServiceSlots\(slots,requiredMinutes,busy\)/);
  assert.match(server,/estimateWindowDuration\(rule,state.rows\[0\]\.facts\)/);
  assert.match(server,/Varausta varten tarvitaan ensin työn laajuuden arviointi chatissa|Työn laajuus pitää selvittää chatissa/);
  assert.match(server,/serviceManualReview=true/);
  assert.match(server,/if\(serviceManualReview\)/);
  assert.match(server,/Google Calendar availability filter failed/);
  assert.match(widget,/visitorRef=' \+ encodeURIComponent\(visitorRef\)/);
  assert.match(app,/id="respondoServiceCapacityMount"/);
  assert.match(index,/service-capacity-ui\.js\?v=/);
  assert.match(boot,/await ensureServiceCapacitySchema\(pool\)/);
});

test('no-cost internal engine does not attempt external AI transcription or new paid integrations',()=>{
  const source=file('service-capacity.mjs');
  assert.doesNotMatch(source,/api\.openai|anthropic|stripe|zapier|make\.com|fetch\(/i);
});
