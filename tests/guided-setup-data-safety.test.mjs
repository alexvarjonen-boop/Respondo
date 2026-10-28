import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
const server = await readFile(new URL('../server.mjs', import.meta.url), 'utf8');
const css = await readFile(new URL('../public/guided-setup-v22.css', import.meta.url), 'utf8');

test('guided wizard preserves previously verified merchant profile fields', () => {
  assert.match(server, /DELETE FROM knowledge WHERE tenant_id=\$1 AND category='Yrityksen perustiedot'/);
  assert.match(app, /const guidedExistingProfile = \{/);
  for (const name of ['pricing','services','serviceArea','address','quoteRequestUrl','bookingUrl','notes','tone','averageLeadValue','botColor']) {
    assert.match(app, new RegExp(name + ':'));
  }
  assert.match(app, /data-existing-profile="\$\{esc\(JSON\.stringify\(guidedExistingProfile\)\)\}"/);
  assert.match(app, /let existingProfile = \{\};/);
  assert.match(app, /\.\.\.existingProfile,[\s\S]*website:values\.get\('website'\)/);
  assert.match(app, /existingProfile\.phone/);
  assert.match(app, /existingProfile\.email/);
  assert.match(app, /existingProfile\.hours/);
  assert.doesNotMatch(app.slice(app.indexOf('const profilePayload = JSON.stringify('), app.indexOf('if (savedProfilePayload !== profilePayload)')), /botColor:'#111113'/);
});

test('pressing Enter in earlier onboarding cards does not submit an incomplete bot', () => {
  assert.match(app, /guidedForm\.addEventListener\('submit', async \(event\) => \{[\s\S]*if \(guidedStep !== 5\) \{[\s\S]*showGuidedStep\(guidedStep \+ 1\);[\s\S]*return;/);
});

test('retrying optional knowledge saves never resends a previously confirmed answer', () => {
  assert.match(app, /const savedGuidedAnswers = new Map\(\)/);
  assert.match(app, /if \(savedGuidedAnswers\.get\(i\) === answerFingerprint\) continue;/);
  assert.match(app, /savedGuidedAnswers\.set\(i,answerFingerprint\)/);
  assert.match(app, /if \(savedProfilePayload !== profilePayload\)/);
});

test('partial FAQ failure lets owner open the saved dashboard and scan website', () => {
  assert.match(app, /id="guidedFinishDashboard" href="\/app\?section=setup&guidedImport=1" hidden/);
  assert.match(app, /if \(recover && savedProfilePayload\) recover\.hidden = false;/);
  assert.match(css, /\.guided-resume-link:not\(\[hidden\]\)/);
});
