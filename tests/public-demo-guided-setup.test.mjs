import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../public/guided-setup-v22.css', import.meta.url), 'utf8');

test('public demo starts with the real website-first guided card, not legacy action menu', () => {
  assert.match(app, /const showGuidedSetup = !hasWebsite;/);
  assert.match(app, /showGuidedSetup \? `<section class="guided-setup"/);
  assert.match(app, /data-guided-step="1"/);
  assert.match(app, /name="website" type="url"/);
  assert.match(css, /\.demo-dashboard-shell\.guided-setup-active \.dashboard-view-section\{display:none!important\}/);
});

test('demo wizard does not call authenticated tenant APIs; uses existing isolated public scan', () => {
  const from = app.indexOf("const demoGuidedForm = $('#guidedSetupForm');");
  const to = app.indexOf('const demoAvatarMarkup=', from);
  assert.ok(from > 0 && to > from);
  const wizard = app.slice(from,to);
  assert.match(wizard, /demoGuidedForm\.addEventListener\('submit'/);
  assert.match(wizard, /if\(step!==5\)\{if\(validate\(\)\)showStep\(step\+1\);return;\}/);
  assert.match(wizard, /demoProfile\.elements/);
  assert.match(wizard, /demoFacts\.push\(/);
  assert.match(wizard, /renderDemoKnowledge\(\)/);
  assert.match(wizard, /refreshDemoIdentity\(\)/);
  assert.match(wizard, /importButton\.click\(\)/);
  assert.doesNotMatch(wizard, /\/api\/app\//);
  assert.doesNotMatch(wizard, /location\.href\s*=\s*['"]\/app/);
});

test('public website-first setup has usable finishing state and profile continuity', () => {
  assert.match(css, /\.demo-dashboard-shell \.guided-setup\[hidden\]\{display:none!important\}/);
  assert.match(app, /uploadedAvatarData=avatar\.startsWith\('data:image\/'\)\?avatar:''/);
  assert.match(app, /activateRespondoWorkspace\(\{demo:true,view:'bot'\}\)/);
  assert.match(app, /Scan website & try bot/);
});
