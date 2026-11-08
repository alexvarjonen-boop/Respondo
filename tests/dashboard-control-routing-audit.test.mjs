import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(name)=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const app=read('public/app.js');
const workspace=read('public/workspace-continuation-v24.js');
const orbit=read('public/workspace-orbit-v28.js');
const drawer=read('public/dashboard-drawer.js');
const guide=read('public/integration-onboarding.js');
const native=read('public/native-ai-operations.js');
const server=read('server.mjs');

const part=(source,start,end)=>{
  const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
  assert.ok(a>=0 && b>a,'Unable to locate '+start+' block');
  return source.slice(a,b);
};
const pages=part(workspace,'const pages={','const tabs={');
const tabs=part(workspace,'const tabs={','const primary={');
const pageIds=new Set([...pages.matchAll(/^\s*([a-z]+):translate\(/gm)].map(m=>m[1]));
const orbitIds=[...orbit.matchAll(/\{id:'([a-z-]+)',label:translate\(/g)].map(m=>m[1]);
const tabTargets=[...tabs.matchAll(/\['([a-z0-9-]+)',translate\(/g)].map(m=>m[1]);

test('all 12 orbit buttons are mapped to real workspace destinations',()=>{
  assert.equal(orbitIds.length,12);
  for(const destination of orbitIds){
    assert.ok(pageIds.has(destination),'Orbit destination missing: '+destination);
  }
  assert.match(orbit,/icons\.forEach\(\(item,index\)=>item\.addEventListener\('click'/);
  assert.match(orbit,/navigateTo\(section\.id\)/);
  assert.match(workspace,/navigate:selectView/);
  assert.match(workspace,/const button=event\.target\.closest\?\.\('\[data-workspace-nav\]'\)/);
  assert.match(workspace,/selectView\(button\.dataset\.workspaceNav\)/);
});

test('every workspace module tab points to an actual DOM panel',()=>{
  assert.ok(tabTargets.length>=18);
  for(const id of tabTargets){
    assert.match(app,new RegExp('id="'+id+'"'),'Missing module panel: '+id);
  }
  assert.match(workspace,/const tab=event\.target\.closest\?\.\('\[data-workspace-tab\]'\)/);
  assert.match(workspace,/showModuleTab\(tab\.dataset\.workspaceTab\)/);
  assert.match(workspace,/activePlaceholder\.replaceWith\(activePanel\)/);
});

test('dashboard deep links resolve to correct sections (including setup)',()=>{
  const match=app.match(/const legacySectionAliases=\{([\s\S]*?)\};\s*const view=legacySectionAliases\[section\]\|\|section\|\|'bot';/);
  assert.ok(match,'Expected canonical workspace deep-link mapping');
  const resolve=new Function('section',
    "const legacySectionAliases={"+match[1]+"};return legacySectionAliases[section]||section||'bot';");
  const expected={
    setup:'setup',account:'profile',integrations:'integrations',
    automation:'automation',customers:'customers',answers:'answers',
    install:'install',overview:'overview',conversations:'conversations',
    team:'team',billing:'billing',settings:'settings',profile:'profile',
    'business-profile':'settings','live-preview':'bot',
    knowledge:'answers',unanswered:'answers',leads:'customers',actions2:'automation'
  };
  for(const [input,output] of Object.entries(expected)){
    assert.equal(resolve(input),output,'Wrong target for ?section='+input);
    assert.ok(pageIds.has(output),'Unrecognized normalized workspace page '+output);
  }
  assert.equal(resolve(null),'bot');
  const drawerViews=drawer.match(/const views = \[([^\]]+)\]/)?.[1]||'';
  for(const view of drawerViews.match(/'([a-z]+)'/g)?.map(v=>v.slice(1,-1))||[]){
    assert.ok(pageIds.has(resolve(view)),'Drawer link points to missing page: '+view);
  }
});

test('all visible integration categories have modules and locked tabs explain access',()=>{
  for(const id of [
    'native-operations','crm-integration','business-integrations','commerce-integration',
    'booking-calendar','stripe-connect','native-mail-connections','meta-native-connections'
  ])assert.ok(tabTargets.includes(id),'Missing integration category '+id);
  assert.match(workspace,/dataset\.respondoPlanLocked==='yes'/);
  assert.match(workspace,/Feature unavailable/);
  assert.match(workspace,/requires Enterprise access/);
});

test('every dashboard button with an ID has at least one runtime reference',()=>{
  const buttons=[...app.matchAll(/<button\b[^>]*>/gi)].map(m=>m[0]);
  assert.ok(buttons.length>=130,'Significant button markup lost');
  const ids=[...new Set(buttons.map(markup=>markup.match(/\bid="([a-zA-Z0-9_-]+)"/)?.[1]).filter(Boolean))];
  assert.ok(ids.length>=35);
  for(const id of ids){
    const occurrences=app.split(id).length-1;
    assert.ok(occurrences>=2,'Button ID lacks an apparent binding: '+id);
  }
  assert.match(app,/document\.querySelectorAll\('\[data-dashboard-nav\]'\)/);
  assert.match(app,/document\.querySelectorAll\('\[data-dashboard-open\]'\)/);
  assert.match(app,/document\.querySelectorAll\('\[data-dashboard-jump\]'\)/);
  assert.match(workspace,/workspace\.addEventListener\('click'/);
});

test('built-in tools bind every tab and use a real render path',()=>{
  const match=native.match(/const kinds=\[([^\]]+)\]/);
  assert.ok(match);
  const kinds=[...match[1].matchAll(/'([a-z]+)'/g)].map(m=>m[1]);
  assert.equal(kinds.length,14);
  for(const kind of kinds){
    assert.match(native,new RegExp('\\b'+kind+':'),'Missing translation for native tab '+kind);
  }
  assert.match(native,/b\.addEventListener\('click'/);
  assert.match(native,/b\.dataset\.tab=kind/);
});

test('integration OAuth entrypoints use implemented backend routes',()=>{
  for(const id of ['gmail','outlook','google_calendar','google_drive']){
    assert.match(guide,new RegExp("id:'"+id+"'.*?href:'/api/app/"));
  }
  for(const route of [
    "/api/app/native/mail/:provider/start",
    "/api/app/native/cloud/:provider/start",
    "/api/app/google-calendar/start"
  ])assert.ok(server.includes(route),'Missing OAuth route: '+route);
  assert.match(guide,/oauthAvailable/);
  assert.match(guide,/not_configured/);
});

test('destructive account actions remain confirmation-gated',()=>{
  assert.match(app,/const openDeletionModal=\(target\)=>/);
  assert.match(app,/deletionForm\?\.addEventListener\('submit'/);
  assert.match(app,/password/);
  assert.match(app,/deleteModalBackdrop/);
});
