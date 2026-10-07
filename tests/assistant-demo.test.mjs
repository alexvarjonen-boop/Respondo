import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const effects=readFileSync(new URL('../public/effects.js',import.meta.url),'utf8');

test('legacy standalone assistant never replaces the shared Try Bot dashboard',()=>{
  const initStart=effects.indexOf('function init()');
  const initSource=effects.slice(initStart,initStart+1200);
  assert.match(initSource,/if \(isWorkspacePage\(\)\)/);
  assert.doesNotMatch(initSource,/standaloneAssistant\(\)/);
  assert.match(effects,/document\.body\.classList\.remove\('assistant-standalone'\)/);
  assert.ok(html.includes('/effects.js?v=20261007-correct-home-chat-v2'));
});

test('public Try Bot has the same visible dashboard shell and default view as paid app',()=>{
  assert.match(app,/return `<div class="appshell dashboard-simple-shell">/);
  assert.doesNotMatch(app,/assistant-demo-shell/);
  const start=app.indexOf("if (path === '/assistant') {");
  const end=app.indexOf("if (path === '/kirjaudu') {",start);
  const source=app.slice(start,end);
  assert.match(source,/requestedView : 'overview'/);
  assert.match(source,/dashboardViewMeta/);
});
test('public Try Bot and paid app use the same dashboard renderer',()=>{
  assert.match(app,/async function dashboard\(options = \{\}\)/);
  assert.match(app,/const isDemo = Boolean\(options\.demo\)/);
  assert.match(app,/else if \(path === '\/assistant'\) html = await dashboard\(\{ demo:true \}\);/);
  assert.match(app,/else if \(path === '\/app'\) html = await dashboard\(\);/);
  assert.doesNotMatch(app,/function assistantDemoPage\(/);
  assert.doesNotMatch(app,/assistantDemoProfileForm|assistantDemoSectionSelect|assistantDemoPreviewForm/);
});

test('shared dashboard contains the full paid workspace navigation on demo too',()=>{
  for(const view of ['overview','setup','answers','customers','automation','install','account']){
    assert.match(app,new RegExp('<option value="'+view+'"'))
  }
  assert.match(app,/id="businessProfileForm"/);
  assert.match(app,/id="previewForm"/);
  assert.match(app,/id="knowledgeForm"/);
  assert.match(app,/id="billing"/);
});

test('demo keeps the paid installation layout but never exposes a usable install code',()=>{
  assert.doesNotMatch(app,/assistant-demo-install-lock/);
  assert.match(app,/Asennuskoodi saatavilla tilauksen jälkeen/);
  assert.match(app,/class="code-row"><code>\$\{appText\('Asennuskoodi saatavilla tilauksen jälkeen'/);
  assert.match(app,/button type="button" disabled aria-disabled="true">\$\{appText\('Kopioi'/);
  assert.match(app,/id="installCode"/);
  assert.match(app,/id="copyCode"/);
});

test('demo bindings use the same paid-dashboard element ids and public chat endpoint',()=>{
  const start=app.indexOf("if (path === '/assistant') {");
  const end=app.indexOf("if (path === '/kirjaudu') {",start);
  const source=app.slice(start,end);
  assert.match(source,/\$\('#dashboardSectionSelect'\)/);
  assert.match(source,/\$\('#businessProfileForm'\)/);
  assert.match(source,/\$\('#knowledgeForm'\)/);
  assert.match(source,/\$\('#previewForm'\)/);
  assert.match(source,/\/api\/public\/demo-chat/);
  assert.doesNotMatch(source,/\/api\/app\/business-profile|\/api\/app\/knowledge/);
});

test('shared dashboard demo assets are cache-busted',()=>{
  assert.match(html,/styles\.css\?v=20261006-[^\"]+/);
  assert.match(html,/app\.js\?v=20261006-flags-v2/);
});


test('agent dashboard stays independent from public demo state',()=>{
  const start=app.indexOf('async function agentDashboard(me)');
  const end=app.indexOf('async function dashboard(options = {})',start);
  const source=app.slice(start,end);
  assert.ok(start>=0 && end>start);
  assert.doesNotMatch(source,/\bisDemo\b|assistant-demo-shell/);
});
