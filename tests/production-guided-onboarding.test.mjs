import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../public/dashboard-guided-v12.css', import.meta.url), 'utf8');
const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');

test('new business workspaces start with one website-only card', () => {
  assert.match(app, /const showGuidedSetup = !isDemo && !hasWebsite/);
  const firstCard = app.match(/<article class="guided-card" data-guided-step="1">([\s\S]*?)<\/article>/)?.[1];
  assert.ok(firstCard, 'First guided card should exist');
  assert.equal((firstCard.match(/<input\b/g) || []).length, 1);
  assert.match(firstCard, /name="website" type="url"/);
  assert.match(firstCard, /data-guided-next/);
  assert.match(css, /\.guided-setup-active \.dashboard-view-section/);
});

test('bot identity, optional Q&A and optional company details are separate steps', () => {
  assert.match(app, /data-guided-step="2"[\s\S]*name="botName"[\s\S]*data-guided-avatar/);
  assert.match(app, /data-guided-step="3"[\s\S]*VAPAAEHTOINEN[\s\S]*name="question\$\{i\}"[\s\S]*name="answer\$\{i\}"/);
  assert.match(app, /data-guided-step="4"[\s\S]*name="greeting"[\s\S]*name="phone"[\s\S]*name="email"/);
  assert.match(app, /data-guided-step="5"[\s\S]*guided-submit/);
  assert.match(app, /await api\('\/api\/app\/business-profile'/);
  assert.match(app, /await api\('\/api\/app\/knowledge'/);
});

test('profile menu navigates to companies, subscription and settings', () => {
  assert.match(app, /id="guidedProfileToggle"/);
  assert.match(app, /data-guided-account-target="workspaces"/);
  assert.match(app, /data-guided-account-target="billing"/);
  assert.match(app, /data-guided-account-target="account-security"/);
  assert.match(app, /guidedProfileToggle\?\.addEventListener\('click'/);
});

test('initial website scan keeps existing explicit review gate', () => {
  assert.match(app, /respondo-guided-import/);
  assert.match(app, /\/api\/app\/import-website\/start/);
  assert.match(app, /Imported content must be reviewed before it enters bot knowledge/);
  assert.match(css, /@media\(max-width:700px\)/);
  assert.match(html, /dashboard-guided-v12\.css/);
});
