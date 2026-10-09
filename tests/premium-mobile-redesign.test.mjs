import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/premium-mobile.css',import.meta.url),'utf8');
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
test('premium phone stylesheet loads last, overriding earlier iOS skin and OS hotfixes',()=>{
  assert.match(html,/premium-mobile\.css\?v=20261009-mobile-rebuild-v1/);
  const premium=html.indexOf('/premium-mobile.css');
  for(const sheet of ['/styles.css','/ios-workspace.css','/workspace-controls.css']){
    assert.ok(html.indexOf(sheet)>=0 && html.indexOf(sheet)<premium,sheet);
  }
});
test('mobile overview displays real chat ahead of statistics and onboarding',()=>{
  assert.match(css,/\.dashboard-premium-experience\{\s*order:3!important/);
  assert.match(css,/\.stats\{\s*order:4!important/);
  assert.match(css,/\.onboarding-card\{order:6!important/);
  assert.match(css,/\.demo-dashboard-shell \.stats,/);
  assert.match(app,/id="overviewPreviewHost"/);
  assert.equal((app.match(/id="previewForm"/g)||[]).length,1);
  assert.equal((app.match(/id="previewChat"/g)||[]).length,1);
});
test('iPhone header and navigation remain usable without overlapping chat',()=>{
  assert.match(css,/\.demo-dashboard-main\{\s*padding-top:var\(--demo-sticky-header-space/);
  assert.match(css,/\.demo-sticky-topbar\{\s*position:fixed!important/);
  assert.match(css,/\.ios-workspace-tabs\{\s*order:1!important/);
  assert.match(css,/\.premium-language-picker \.app-language-switch/);
  assert.match(css,/\.dashboard-logout::before/);
  assert.match(css,/\.demo-sticky-topbar\.is-condensed \.dashboard-section-picker/);
});
test('mobile styling never targets customer-facing embedded bot',()=>{
  assert.doesNotMatch(css,/\.respondo-widget|\.rchat/);
  assert.match(css,/#app \.dashboard-premium-shell/);
  assert.match(css,/font-size:16px!important/);
});
