import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../public/guided-setup-v22.css', import.meta.url), 'utf8');
const index = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');

test('public first card keeps Respondo brand and three language flags without the old iPhone menu', () => {
  assert.match(app, /guided-demo-brandname.*\$\{logo\(\)\}.*guided-demo-languages.*\$\{languageSwitch\(\)\}/);
  assert.match(css, /#app \.dashboard-premium-shell\.demo-dashboard-shell\.guided-setup-active \.dashboard-topbar/);
  assert.match(css, /display:none!important/);
  assert.match(css, /\.guided-demo-brandname \.logo \.brand-word/);
});

test('Safari reloads the public demo app and wizard styles after the update', () => {
  assert.match(index, /guided-setup-v22\.css\?v=20261028-public-demo-auto-chat-v25/);
  assert.match(index, /demo-v21-guided-prod-v22-public-demo-auto-chat-v25/);
});

test('authenticated dashboard remains independent of demo-only header changes', () => {
  assert.match(app, /const showGuidedSetup = !hasWebsite && \(!isDemo \|\| !new URLSearchParams/);
  assert.match(css, /#app \.dashboard-premium-shell\.demo-dashboard-shell\.guided-setup-active/);
});
