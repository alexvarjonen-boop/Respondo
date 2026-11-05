import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  validateServiceRule,estimateServiceDuration,fitServiceSlots,
  serviceDialogue,readServiceRule,listServiceRules
} from '../service-capacity.mjs';

const tenant='88da5922-c738-46e1-93c1-5af6f4a9f611';
const rule={
  serviceKey:'custom_kotisiivous',serviceName:'Kotisiivous',
  aliases:'siivous, home cleaning',calculation:'quantity',unitLabel:'m²',
  minutesPerUnit:2,baseMinutes:20,bufferMinutes:30,maxUnits:300,enabled:true
};

function memoryDB(ruleList=[rule]){
  const history=[];
  let state=null;
  const db={query:async(sql,args)=>{
    history.push({sql,args});
    if(sql.includes('SELECT config,enabled')){
      const rows=ruleList.filter(x=>x.serviceKey===args?.[1]||args?.[1]===undefined)
        .map(x=>({config:x,enabled:x.enabled}));
      return {rows,rowCount:rows.length};
    }
    if(sql.includes('SELECT facts,preferred_text FROM')){
      return {rows:state?[state]:[],rowCount:state?1:0};
    }
    if(sql.includes('INSERT INTO respondo_service_dialogues')){
      state={facts:JSON.parse(args.length===5?args[3]:args[2]),
        preferred_text:args.length===5?args[4]:args[3]};
      return {rows:[],rowCount:1};
    }
    return {rows:[],rowCount:0};
  }};
  return {db,history};
}

test('industry-neutral fixed and quantity rules accept real business services',()=>{
  assert.deepEqual(validateServiceRule(rule),rule);
  assert.equal(estimateServiceDuration(rule,{quantity:80}).minutes,210);
  assert.equal(estimateServiceDuration(rule,{quantity:0}).status,'needs_details');
  assert.equal(estimateServiceDuration(rule,{quantity:301}).status,'manual_review');
});

test('a fixed-duration hair appointment requires no fictitious window count',()=>{
  const hair={...rule,serviceKey:'custom_haircut',serviceName:'Hiustenleikkuu',
    unitLabel:'käynti',calculation:'fixed',minutesPerUnit:45,
    baseMinutes:0,bufferMinutes:10};
  const result=estimateServiceDuration(hair,{});
  assert.equal(result.status,'estimated');
  assert.equal(result.minutes,55);
});

test('unknown service and invalid estimates fail closed',()=>{
  assert.throws(()=>validateServiceRule({...rule,serviceKey:'remote_sql'}),TypeError);
  assert.throws(()=>validateServiceRule({...rule,minutesPerUnit:99999}),TypeError);
  assert.throws(()=>validateServiceRule({...rule,serviceName:'a'}),TypeError);
  assert.throws(()=>validateServiceRule({...rule,aliases:'a'}),TypeError);
  assert.throws(()=>estimateServiceDuration({...rule,enabled:false},{quantity:8}),TypeError);
  assert.equal(estimateServiceDuration({...rule,minutesPerUnit:720},{quantity:8}).status,'manual_review');
});

test('custom service dialogue collects the company-approved area and never offers a two-hour slot for a 210-minute visit',async()=>{
  const state=memoryDB();
  const result=await serviceDialogue(state.db,tenant,'visitor1',
    'Olisko perjantaina klo 15 aikaa kotisiivous 80 m²?','fi',async minutes=>{
      assert.equal(minutes,210);
      return fitServiceSlots([{
        starts_at:'2026-11-06T13:00:00Z',
        ends_at:'2026-11-06T15:00:00Z',
        status:'open'
      }],minutes,[],Date.parse('2026-11-05'));
    });
  assert.equal(result.status,'no_slots');
  assert.match(result.answer,/3 h 30 min/);
  assert.equal(result.facts.quantity,80);
  assert.ok(state.history.every(({args})=>args?.[0]===tenant));
});

test('generic availability starts by asking which configured service is required',async()=>{
  const state=memoryDB();
  const start=await serviceDialogue(state.db,tenant,'visitor2',
    'Onko perjantaina klo 15 aikaa?','fi',async()=>[]);
  assert.equal(start.status,'needs_service');
  assert.match(start.answer,/Kotisiivous/);
});

test('disabled service rules do not turn a random booking question into a duration estimate',async()=>{
  const state=memoryDB([{...rule,enabled:false}]);
  assert.equal(await serviceDialogue(state.db,tenant,'visitor3',
    'Perjantaina klo 15 siivous?','fi',async()=>[]),null);
});

test('backend checks approved service-specific durations before requests',()=>{
  const src=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
  assert.match(src,/listServiceRules\(pool,tenant\.id\)/);
  assert.match(src,/estimateServiceDuration\(matchedRule,facts\)/);
  assert.match(src,/estimateServiceDuration\(rule,facts\)/);
  assert.match(src,/approvalRequired:true/);
  const ui=readFileSync(new URL('../public/service-capacity-ui.js',import.meta.url),'utf8');
  assert.match(ui,/serviceName/);
  assert.match(ui,/unitLabel/);
  assert.match(ui,/calculation/);
  assert.doesNotMatch(ui,/subtitle:'Window cleaning:/);
});

test('service FAQ stays in normal bot rather than being hijacked by scheduling',async()=>{
  const state=memoryDB();
  const answer=await serviceDialogue(state.db,tenant,'visitor4',
    'Teettekö kotisiivousta?','fi',async()=>[]);
  assert.equal(answer,null);
});

test('enabled custom service uses tenant-scoped rules and safely exposes all configured services',async()=>{
  const state=memoryDB();
  const list=await listServiceRules(state.db,tenant);
  assert.equal(list[0].serviceName,'Kotisiivous');
  assert.equal((await readServiceRule(state.db,tenant,'custom_kotisiivous')).enabled,true);
  assert.ok(state.history.every(({args})=>args[0]===tenant));
});
