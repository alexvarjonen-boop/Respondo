import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');

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

test('demo locks only installation HTML while paid dashboard retains the real install code',()=>{
  const installMarker=app.indexOf('assistant-demo-install-lock');
  assert.ok(installMarker>0);
  const area=app.slice(installMarker-1200,installMarker+5000);
  assert.match(area,/isDemo \? `/);
  assert.match(area,/HTML-koodia/);
  assert.match(area,/widget-tunnistetta/);
  assert.match(area,/id="installCode"/);
  assert.match(area,/id="copyCode"/);
  assert.ok(area.indexOf('assistant-demo-install-lock') < area.indexOf('id="installCode"'));
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
  assert.match(html,/styles\.css\?v=20261001-shared-dashboard-demo-v1/);
  assert.match(html,/app\.js\?v=20261001-shared-dashboard-demo-v1/);
});
