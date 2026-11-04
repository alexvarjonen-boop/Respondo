import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateServiceRule,parseWindowFacts,missingWindowFact,
  estimateWindowDuration,fitServiceSlots,serviceDialogue,
  ensureServiceCapacitySchema,readServiceRule,saveServiceRule} from '../service-capacity.mjs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const rule={serviceKey:'window_cleaning',minutesPerWindow:5,baseMinutes:10,
  bufferMinutes:30,largeMultiplier:1.5,doubleSidedMultiplier:2,
  difficultAccessMinutes:30,maxWindows:60,enabled:true};
const tenant='4f4b19c3-59f7-448d-aa41-54b5bde8c1a5',visitor='visitor-123';
const slot=(id,start,end)=>({id,starts_at:start,ends_at:end});

test('Finnish colloquial customer describes 30 large windows; follow-up collects remaining facts',()=>{
  const first=parseWindowFacts('olisko perjantaina klo 3 aikaa ikkunanpesuun');
  assert.equal(missingWindowFact(first),'count');
  const second=parseWindowFacts('30 isoo ikkunaa',first);
  assert.deepEqual([second.quantity,second.size],[30,'large']);
  assert.equal(missingWindowFact(second),'sides');
  const third=parseWindowFacts('joo molemmilt puolilt ja iha normaalisti pääsee',second);
  assert.deepEqual([third.sides,third.access],['both','easy']);
  assert.equal(missingWindowFact(third),null);
  assert.deepEqual(parseWindowFacts('30 large windows, both sides, easy access'),{
    quantity:30,size:'large',sides:'both',access:'easy'
  });
});

test('duration comes only from tenant-approved formula, not the model',()=>{
  assert.equal(estimateWindowDuration(rule,{quantity:30,size:'large',sides:'both',access:'easy'}).minutes,490);
  assert.equal(estimateWindowDuration(rule,{quantity:30,size:'large',sides:'both',access:'difficult'}).minutes,520);
  assert.equal(estimateWindowDuration(rule,{quantity:10,size:'small',sides:'one',access:'easy'}).minutes,90);
  assert.equal(estimateWindowDuration(rule,{quantity:75,size:'large',sides:'both',access:'easy'}).status,'manual_review');
  assert.equal(estimateWindowDuration(rule,{quantity:4}).status,'needs_details');
  assert.throws(()=>estimateWindowDuration({...rule,enabled:false},{quantity:1}),TypeError);
});

test('rejects arbitrary pricing, unsupported services and unrealistic rates',()=>{
  assert.deepEqual(validateServiceRule(rule),rule);
  assert.throws(()=>validateServiceRule({...rule,minutesPerWindow:0}),TypeError);
  assert.throws(()=>validateServiceRule({...rule,largeMultiplier:90}),TypeError);
  assert.throws(()=>validateServiceRule({...rule,serviceKey:'remote_sql'}),TypeError);
  assert.throws(()=>validateServiceRule({...rule,maxWindows:3000}),TypeError);
});

test('2h Friday 15–17 never fits a 4h service, even if it appears free',()=>{
  const fridayTwo=slot('two','2026-11-06T13:00:00.000Z','2026-11-06T15:00:00.000Z');
  const mondayFour=slot('four','2026-11-09T08:00:00.000Z','2026-11-09T12:00:00.000Z');
  const now=Date.parse('2026-11-04T12:00:00Z');
  assert.deepEqual(fitServiceSlots([fridayTwo,mondayFour],240,[],now).map(x=>x.id),['four']);
  assert.deepEqual(fitServiceSlots([fridayTwo,mondayFour],490,[],now),[]);
});

test('conflicts, all-day blocks and unknown event dates fail closed',()=>{
  const from='2026-11-06T13:00:00.000Z',to='2026-11-06T17:00:00.000Z',now=Date.parse('2026-11-04');
  const one=slot('full',from,to);
  assert.equal(fitServiceSlots([one],240,[{start:'2026-11-06T15:00:00Z',end:'2026-11-06T16:00:00Z'}],now).length,0);
  assert.equal(fitServiceSlots([one],240,[{start:'invalid',end:'invalid'}],now).length,0);
  assert.equal(fitServiceSlots([one],240,[],now).length,1);
  assert.equal(fitServiceSlots([one],240,[],Date.parse('2026-11-07T00:00:00Z')).length,0);
});

test('database setup uses RLS and prevents direct Data API access',async()=>{
  const queries=[],db={query:async sql=>{queries.push(sql);return {rows:[]};}};
  await ensureServiceCapacitySchema(db);
  for(const name of ['respondo_service_capacity','respondo_service_dialogues']){
    assert.ok(queries.some(sql=>sql.includes('CREATE TABLE IF NOT EXISTS public.'+name)));
    assert.ok(queries.includes('ALTER TABLE public.'+name+' ENABLE ROW LEVEL SECURITY'));
    assert.ok(queries.includes('REVOKE ALL PRIVILEGES ON TABLE public.'+name+' FROM PUBLIC,anon,authenticated,service_role'));
  }
  assert.equal(queries.filter(sql=>sql.includes('REFERENCES public.tenants(id) ON DELETE CASCADE')).length,2);
});

test('tenant rule is not active without explicitly saved configuration',async()=>{
  const queries=[];
  const db={query:async(query,params)=>{
    queries.push({query,params});
    if(query.includes('SELECT config,enabled'))return {rows:[]};
    return {rows:[{config:rule,enabled:true}]};
  }};
  assert.equal(await readServiceRule(db,tenant),null);
  assert.deepEqual(await saveServiceRule(db,tenant,rule),rule);
  assert.ok(queries.every(q=>q.params[0]===tenant));
});

test('service bot asks questions across turns and proposes no phantom availability',async()=>{
  let facts={},hasSession=false;
  const queries=[];
  const db={query:async(query,params)=>{
    queries.push({query,params});
    if(query.includes('SELECT config,enabled'))return {rows:[{config:rule,enabled:true}],rowCount:1};
    if(query.includes('SELECT facts,preferred_text FROM respondo_service_dialogues'))
      return {rows:hasSession?[{facts}]:[],rowCount:hasSession?1:0};
    if(query.includes('INSERT INTO respondo_service_dialogues')){
      facts=JSON.parse(params[2]);hasSession=true;return {rows:[],rowCount:1};
    }
    throw Error('Unexpected DB query: '+query);
  }};
  const getSlots=async duration=>{assert.equal(duration,490);return [];};
  const first=await serviceDialogue(db,tenant,visitor,'Saako perjantaina klo 15 ikkunanpesun?','fi',getSlots);
  assert.equal(first.status,'needs_details');
  assert.match(first.answer,/monta/i);
  const second=await serviceDialogue(db,tenant,visitor,'30 isoo ikkunaa','fi',getSlots);
  assert.equal(second.status,'needs_details');
  assert.match(second.answer,/molemmilta/i);
  const done=await serviceDialogue(db,tenant,visitor,'molemmilt puolilt ja normaalisti pääsee','fi',getSlots);
  assert.equal(done.status,'no_slots');
  assert.match(done.answer,/8 h 10 min/);
  assert.match(done.answer,/riittävän pitkää/i);
  assert.equal(await serviceDialogue(db,tenant,visitor,'kiitos','fi',getSlots),null);
  assert.ok(queries.every(q=>q.params[0]===tenant));
});

test('calendar unavailability never becomes a confirmed offer',async()=>{
  let facts={quantity:30,size:'large',sides:'both',access:'easy'};
  const db={query:async(query)=>{
    if(query.includes('SELECT config,enabled'))return {rows:[{config:rule,enabled:true}]};
    if(query.includes('SELECT facts'))return {rows:[{facts}],rowCount:1};
    return {rows:[],rowCount:1};
  }};
  const result=await serviceDialogue(db,tenant,visitor,'entä perjantaina','fi',async()=>{throw Error('Calendar offline');});
  assert.equal(result.status,'calendar_unverified');
  assert.match(result.answer,/en voi luvata aikaa/i);
});

test('server routes and widget recheck exact duration and never promise unverified service bookings',()=>{
  const server=read('server.mjs'),widget=read('public/widget.js'),entry=read('server-entry.mjs');
  assert.match(entry,/ensureServiceCapacitySchema\(pool\)/);
  assert.match(server,/app\.put\('\/api\/app\/service-capacity',auth,ownerOnly,subscribed/);
  assert.match(server,/app\.get\('\/api\/app\/service-capacity',auth,ownerOnly,subscribed/);
  assert.match(server,/serviceDialogue\(pool,t\.id,visitorRef,message,detectedLang/);
  assert.match(server,/serviceManualReview=true/);
  assert.match(server,/availableMs<work\.minutes\*60000/);
  assert.match(server,/approvalRequired:true/);
  assert.match(server,/if\(serviceManualReview\)\{/);
  assert.match(server,/payload\.requestedSlot=/);
  assert.match(server,/calendarSync\.status==='synced'/);
  assert.match(server,/status\(503\)\.json\(\{error:'Kalenterin vapaita aikoja ei voitu varmistaa\.'/);
  assert.match(server,/if \(data\.nextPageToken\)/);
  assert.match(widget,/&visitorRef=' \+ encodeURIComponent\(visitorRef\)/);
});

test('owner can configure service rules with translated, readable controls',()=>{
  const ui=read('public/service-capacity-ui.js');
  const css=read('public/service-capacity-ui.css');
  const app=read('public/app.js');
  const index=read('public/index.html');
  assert.match(ui,/fi:\{title/);assert.match(ui,/sv:\{title/);assert.match(ui,/en:\{title/);
  assert.match(ui,/credentials:'same-origin'/);
  assert.match(ui,/enabled:checkbox\.checked/);
  assert.match(ui,/save\.disabled=true/);
  assert.match(css,/-webkit-text-fill-color:#172638!important/);
  assert.match(app,/id="respondoServiceCapacityMount"/);
  assert.match(index,/service-capacity-ui\.js\?v=/);
  assert.match(index,/service-capacity-ui\.css\?v=/);
  assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});

test('ambiguous 3 oclock availability first asks service and then confirms AM/PM',async()=>{
  let facts={},preferred_text='',session=false;
  const db={query:async(query,args)=>{
    if(query.includes('SELECT config,enabled'))
      return {rows:[{config:rule,enabled:true}],rowCount:1};
    if(query.includes('SELECT facts,preferred_text'))
      return {rows:session?[{facts,preferred_text}]:[],rowCount:session?1:0};
    if(query.includes('INSERT INTO respondo_service_dialogues')){
      facts=JSON.parse(args[2]);preferred_text=args[3]||'';session=true;
      return {rows:[],rowCount:1};
    }
    if(query.includes('DELETE FROM respondo_service_dialogues')){session=false;return {rows:[]};}
    throw Error('Unexpected SQL '+query);
  }};
  const start=await serviceDialogue(db,tenant,visitor,'Olisko teillä perjantaina kello 3 aikaa?','fi',async()=>[]);
  assert.equal(start.status,'needs_service');
  assert.match(start.answer,/ikkunanpesua/i);
  const count=await serviceDialogue(db,tenant,visitor,'30 isoo ikkunaa','fi',async()=>[]);
  assert.equal(count.status,'needs_details');
  assert.match(count.answer,/molemmilta/i);
  const clarification=await serviceDialogue(db,tenant,visitor,
    'joo molemmilt puolilt ja normaalisti pääsee','fi',async()=>[]);
  assert.equal(clarification.status,'needs_time');
  assert.match(clarification.answer,/klo 15/i);
  const final=await serviceDialogue(db,tenant,visitor,'klo 15','fi',async()=>[]);
  assert.equal(final.status,'no_slots');
  assert.match(final.answer,/riittävän pitkää/i);
});
