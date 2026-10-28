import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../public/guided-setup-v22.css', import.meta.url), 'utf8');
const index = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');

test('public demo starts with a clean website card, logo and all language controls', () => {
  assert.match(app, /const showGuidedSetup = !hasWebsite && \(!isDemo \|\| !new URLSearchParams\(location\.search\)\.has\('section'\)\)/);
  assert.ok(app.includes('class="guided-demo-toolbar"'));
  assert.ok(app.includes('class="guided-demo-lang"'));
  assert.ok(app.includes('${languageSwitch()}'));
  assert.ok(css.includes('#app .demo-dashboard-shell.guided-setup-active .dashboard-topbar,'));
  assert.ok(css.includes('#app .demo-dashboard-shell.guided-setup-active .dashboard-premium-sidebar'));
});

test('public wizard opens the existing chatbot after a successful website scan', () => {
  assert.ok(app.includes('let openChatAfterGuidedImport = false;'));
  assert.ok(app.includes('openChatAfterGuidedImport = true;'));
  assert.ok(app.includes('if (openChatAfterGuidedImport) {'));
  assert.ok(app.includes("document.getElementById('live-preview')?.scrollIntoView"));
  const from = app.indexOf("$('#importWebsite')?.addEventListener('click',async(event)=>{");
  const to = app.indexOf('const renderDemoKnowledge=', from);
  const importer = app.slice(from, to);
  assert.ok(importer.indexOf('setProgress(100,') < importer.indexOf('if (openChatAfterGuidedImport) {'));
  assert.ok(importer.includes("api('/api/public/demo-import-website'"));
});

test('public demo is isolated and Safari can load the new assets', () => {
  assert.match(app, /const demoGuidedForm = \$\('#guidedSetupForm'\);/);
  assert.match(app, /demoGuidedForm\.noValidate = true/);
  assert.match(app, /importButton\.click\(\)/);
  assert.ok(index.includes('guided-setup-v22.css?v=20261028-public-demo-clean-flow-v24'));
  assert.ok(index.includes('public-demo-clean-flow-v24'));
});
