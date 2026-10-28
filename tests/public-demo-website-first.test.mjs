import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../public/guided-setup-v22.css', import.meta.url), 'utf8');

test('public demo starts with the same website-first onboarding instead of the old menu', () => {
  assert.match(app, /const showGuidedSetup = isDemo \|\| !hasWebsite;/);
  assert.match(app, /isDemo \? `<div class="guided-demo-brand">/);
  assert.match(css, /\.demo-dashboard-shell\.guided-setup-active \.dashboard-topbar/);
  assert.match(css, /\.demo-dashboard-shell\.guided-setup-active \.dashboard-premium-sidebar/);
  assert.match(app, /<article class="guided-card" data-guided-step="1">[\s\S]*?name="website" type="url"/);
});

test('demo questions, avatar and website import remain in ephemeral preview', () => {
  assert.match(app, /const demoGuidedForm = \$\('#guidedSetupForm'\);/);
  assert.match(app, /demoGuidedForm\.querySelectorAll\('\[data-guided-avatar\]'\)/);
  assert.match(app, /sourceType:'demo_guided'/);
  assert.match(app, /await importDemoWebsite\(\$\('#importWebsite'\)\)/);
  assert.match(app, /if\(await importDemoWebsite[\s\S]*?openPreview\(\);return;/);
  const handler = app.slice(app.indexOf('const demoGuidedForm ='),app.indexOf("\$('#previewForm')?.addEventListener('submit'",app.indexOf('const demoGuidedForm =')));
  assert.doesNotMatch(handler, /\/api\/app\/business-profile|\/api\/app\/knowledge/);
});

test('Enter cannot create a bot early; failed demo scans may be retried or skipped explicitly', () => {
  assert.match(app, /if\(step!==5\)\{if\(valid\(\)\)go\(step\+1\);return;\}/);
  assert.match(app, /recover\.hidden=false;/);
  assert.match(app, /recover\.onclick=e=>\{e\.preventDefault\(\);openPreview\(\);\};/);
});
