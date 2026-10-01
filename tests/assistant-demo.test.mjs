import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');

function assistantFunctionSource(){
  const start=app.indexOf('function assistantDemoPage()');
  const end=app.indexOf('async function dashboard()',start);
  assert.ok(start>=0 && end>start);
  return app.slice(start,end);
}

test('public try-the-bot page uses the purchased dashboard workspace structure',()=>{
  const source=assistantFunctionSource();
  assert.match(source,/dashboard-simple-shell assistant-demo-shell/);
  assert.match(source,/dashboard-topbar/);
  assert.match(source,/business-profile-form/);
  assert.match(source,/live-preview-panel/);
  assert.match(source,/knowledge-panel/);
  assert.match(source,/assistantDemoSectionSelect/);
  assert.match(app,/else if \(path === '\/assistant'\) html = assistantDemoPage\(\);/);
});

test('public demo supports live company-info and custom-answer testing without an account',()=>{
  assert.match(app,/assistantDemoPreviewForm/);
  assert.match(app,/\/api\/public\/demo-chat/);
  assert.match(app,/customFacts:demoFacts\.map/);
  assert.match(app,/assistantDemoKnowledgeForm/);
  assert.match(app,/data-demo-avatar/);
});

test('public assistant does not expose install HTML or widget credentials',()=>{
  const source=assistantFunctionSource();
  assert.doesNotMatch(source,/<code[\s>]/i);
  assert.doesNotMatch(source,/data-copy|copyInstall|installCode|widgetToken|widget-token/i);
  assert.doesNotMatch(source,/Kopioi koodi|Copy code|Kopiera kod/i);
  assert.match(source,/HTML-koodia/);
  assert.match(source,/Asennus avautuu tilauksen jälkeen/);
});

test('assistant workspace asset version is active',()=>{
  assert.match(html,/styles\.css\?v=20261001-assistant-workspace-v1/);
  assert.match(html,/app\.js\?v=20261001-assistant-workspace-v1/);
});
