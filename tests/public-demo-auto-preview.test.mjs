import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
const index = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');

test('guided public demo triggers existing scan then opens the chat instead of leaving a menu', () => {
  assert.match(app,/let openChatAfterGuidedImport = false/);
  assert.match(app,/openChatAfterGuidedImport = true/);
  assert.match(app,/if \(openChatAfterGuidedImport\) \{/);
  assert.match(app,/document\.getElementById\('live-preview'\)\?\.scrollIntoView/);
  assert.match(app,/document\.querySelector\('#previewForm input\[name="question"\]'\)\?\.focus/);
  const from = app.indexOf("$('#importWebsite')?.addEventListener('click',async(event)=>{");
  const to = app.indexOf('const renderDemoKnowledge=', from);
  const importer = app.slice(from,to);
  assert.ok(from>0 && to>from);
  assert.ok(importer.indexOf('setProgress(100,') < importer.indexOf('if (openChatAfterGuidedImport) {'));
  assert.match(importer,/\/api\/public\/demo-import-website/);
});

test('scan failure does not send the visitor into an empty chat', () => {
  const from = app.indexOf("$('#importWebsite')?.addEventListener('click',async(event)=>{");
  const to = app.indexOf('const renderDemoKnowledge=', from);
  const importer = app.slice(from,to);
  assert.ok(importer.indexOf('if (openChatAfterGuidedImport) {') < importer.indexOf('}catch(error){'));
  assert.ok(importer.includes("if(review) review.innerHTML='<div class=\"notice error\">'"));
});

test('Safari receives updated public demo JavaScript and guided flow remains multilingual', () => {
  assert.ok(index.includes('public-demo-auto-chat-v25'));
  assert.ok(app.includes("appText('Usein kysytyt','Vanliga frågor','Frequently asked')"));
  assert.ok(app.includes("const showGuidedSetup = !hasWebsite && (!isDemo || !new URLSearchParams(location.search).has('section'))"));
});
