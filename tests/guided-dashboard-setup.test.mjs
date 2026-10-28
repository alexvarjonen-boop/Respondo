import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');

test('new workspaces start with website-only guided setup', () => {
  assert.match(app, /const showGuidedSetup = !isDemo && !hasWebsite/);
  assert.match(app, /data-guided-step="1"[\s\S]*name="website"[\s\S]*data-guided-next/);
  assert.match(css, /\.guided-setup-active \.dashboard-view-section\{display:none!important\}/);
});

test('guided setup advances through bot identity and optional answers', () => {
  assert.match(app, /data-guided-step="2"[\s\S]*name="botName"[\s\S]*data-guided-avatar/);
  assert.match(app, /data-guided-step="3"[\s\S]*VAPAAEHTOINEN[\s\S]*name="question\$\{i\}"[\s\S]*name="answer\$\{i\}"/);
  assert.match(app, /data-guided-step="5"[\s\S]*guided-submit/);
  assert.match(app, /await api\('\/api\/app\/business-profile'/);
  assert.match(app, /await api\('\/api\/app\/knowledge'/);
});

test('dashboard has persistent navigation and profile subpages', () => {
  for (const label of ['Hallintapaneeli','Botti','Vastaukset','Asiakkaat','Toiminnot','Asennus','Profiili','Tilaus','Asetukset']) {
    assert.ok(app.includes(label), `${label} should be available in dashboard navigation`);
  }
  assert.match(app, /data-account-target="billing"/);
  assert.match(app, /data-account-target="account-security"/);
  assert.match(css, /\.dashboard-profile-subnav/);
});
