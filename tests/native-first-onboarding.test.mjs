import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ui=read('public/integration-onboarding.js');
const workspace=read('public/workspace-continuation-v24.js');
const backend=read('server.mjs');
const native=read('native-ai-operations.mjs');
const nativeUI=read('public/native-ai-operations.js');

test('Respondo own database tools are the default, external services are optional',()=>{
  assert.match(ui,/let chosenGroup='respondo',chosenProvider=null/);
  assert.match(ui,/if\(chosenGroup==='respondo'\)\{/);
  assert.match(ui,/data\.ownTool=item\.id/);
  assert.match(ui,/dataset\.ownTool=item\.id/);
  assert.match(ui,/externalSwitch\.addEventListener\('click'/);
  assert.match(ui,/chosenGroup=chosenGroup==='respondo'\?null:'respondo'/);
  assert.match(ui,/t\.externalToggle/);
  assert.match(ui,/nativeIntro:/);
  assert.match(ui,/fi:\{nativeTitle:/);
  assert.match(ui,/sv:\{nativeTitle:/);
  assert.match(ui,/en:\{nativeTitle:/);
  assert.match(workspace,/integrations:translate\('Respondon työkalut'/);
  assert.match(workspace,/integrations:'native-operations'/);
});

test('each native tool opens an existing local tab and not a third-party OAuth flow',()=>{
  const tools={
    rs_contacts:'contacts',rs_inbox:'inbox',rs_calendar:'calendar',
    rs_tickets:'tickets',rs_quotes:'quotes',rs_documents:'docs',
    rs_tasks:'tasks',rs_rules:'rules',rs_quality:'quality'
  };
  for(const [id,tab] of Object.entries(tools)){
    assert.match(ui,new RegExp("id:'"+id+"',nativeTab:'"+tab+"'"));
    assert.match(nativeUI,new RegExp("'"+tab+"'"));
  }
  assert.match(ui,/focusExisting\(\{tab:'native-operations',nativeTab:item\.nativeTab,nativeInternal:true\}\)/);
  assert.match(ui,/const inner=target\?\.querySelector\('\.native-tabs \[data-tab="/);
  assert.match(ui,/inner\.click\(\)/);
  assert.match(ui,/if\(item\.nativeInternal &&/);
  assert.doesNotMatch(ui.slice(ui.indexOf('const ownTools='),ui.indexOf('const providers=')),/\/api\/app\/native\/mail\/|api\.hubapi\.com|oauth|\/api\/app\/google-calendar\/start/);
});

test('native status is read from tenant-scoped database APIs, not optimistic UI claims',()=>{
  for(const [probe,endpoint] of [
    ['nativeOverview','/api/app/native'],['nativeInbox','/api/app/native/inbox'],
    ['nativeCalendar','/api/app/native/calendar'],['nativeTasks','/api/app/native/tasks'],
    ['nativeQuality','/api/app/native/quality']
  ]){
    assert.ok(ui.includes(probe+":'"+endpoint+"'"),probe);
    assert.ok(backend.includes("'"+endpoint+"'"),endpoint);
  }
  assert.match(ui,/ownStatus\.set\(item\.id,result\[item\.probe\]\?\.ok===true\)/);
  assert.match(ui,/ownStatus\.get\(item\.id\)===true\?'local':'unverified'/);
  assert.match(ui,/data\.respondoPlanLocked==='yes'/);
  assert.match(ui,/if\(chosenGroup!=='respondo'\)\{/);
  assert.match(ui,/method:'GET',credentials:'same-origin',cache:'no-store'/);
  assert.match(backend,/function nativeEndpoint\(handler,/);
  assert.match(backend,/auth,ownerOnly,subscribed,nativeEndpoint/);
});

test('native tools are tenant-owned, separate from Outlook, Meta, external payments',()=>{
  for(const table of ['respondo_native_contacts','respondo_native_tickets',
    'respondo_native_quotes','respondo_native_rules','respondo_native_documents']){
    assert.ok(native.includes('CREATE TABLE IF NOT EXISTS public.'+table),table);
  }
  assert.match(native,/REFERENCES public\.tenants\(id\) ON DELETE CASCADE/);
  assert.match(native,/ENABLE ROW LEVEL SECURITY/);
  assert.match(nativeUI,/const API='\/api\/app\/native'/);
  assert.match(ui,/Ei ulkoista sähköpostia/);
  assert.match(ui,/ei maksamista/);
});
