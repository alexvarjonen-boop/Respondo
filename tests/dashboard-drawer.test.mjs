import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const javascript = readFileSync(new URL('../public/dashboard-drawer.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../public/dashboard-drawer.css', import.meta.url), 'utf8');

test('dashboard menu is loaded from the public SPA shell', () => {
  assert.match(html, /dashboard-drawer\.css\?v=/);
  assert.match(html, /dashboard-drawer\.js\?v=/);
});

test('the drawer exposes all existing dashboard views in three languages', () => {
  for (const view of ['overview','setup','answers','customers','automation','install','account']) {
    assert.match(javascript, new RegExp("'" + view + "'"));
  }
  assert.match(javascript, /document\.documentElement\.lang/);
  assert.match(javascript, /select\.dispatchEvent\(new Event\('change'/);
});

test('navigation has escape/backdrop dismissal, focus handling and an accessible trigger', () => {
  assert.match(javascript, /aria-expanded/);
  assert.match(javascript, /aria-current/);
  assert.match(javascript, /e\\.key === 'Escape'/);
  assert.match(javascript, /e\\.key !== 'Tab'/);
  assert.match(javascript, /backdrop\.addEventListener\('click'/);
  assert.match(css, /\.dashboard-drawer-layer\.is-open/);
  assert.match(css, /max-width:560px/);
});

test('compact dashboard header removes the redundant selector and demo strip', () => {
  assert.match(css, /\.dashboard-section-picker,/);
  assert.match(css, /\.demo-section-strip \{ display:none!important;/);
});
