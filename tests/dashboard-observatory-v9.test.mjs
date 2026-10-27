import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../public/'+p,import.meta.url),'utf8');
const style=read('dashboard-observatory-v9.css'), html=read('index.html'), app=read('app.js');
test('dashboard uses the real Respondo navy and icy blue on demo and authenticated workspace',()=>{
 for(const part of ['.dashboard-premium-shell.dashboard-simple-shell','.dashboard-topbar.dashboard-has-drawer',
  '.dashboard-head[data-dashboard-view="overview"]','.dashboard-menu-toggle',
  '.dashboard-head-mobile-links','.dashboard-drawer-panel','.dashboard-entry',
  '#080f1d','#142b49','#b6d5ff'])
  assert.ok(style.includes(part),part);
 assert.doesNotMatch(style,/\.apple-home-page|\.rs-spiral-section|@keyframes|scroll-snap-type|@import/);
});
test('mobile dashboard is compact with one primary path and all destinations immediately visible',()=>{
 for(const part of ['@media(max-width:760px)','@media(max-width:370px)',
  '.dashboard-head-mobile-test','.dashboard-head-mobile-setup,.dashboard-head-mobile-answers',
  '.dashboard-head-mobile-menu','grid-column:1/-1!important',
  'min-height:0!important','display:none!important'])
  assert.ok(style.includes(part),part);
 assert.match(app,/data-dashboard-jump="live-preview"/);
 assert.match(app,/data-dashboard-open="setup"/);
 assert.match(app,/data-dashboard-open="answers"/);
 assert.match(app,/data-dashboard-open-menu aria-haspopup="dialog"/);
});
test('real white arrow brand replaces the old R badge in onboarding',()=>{
 assert.match(app,/<div class="welcome-mark" aria-hidden="true"><img src="\/respondo-symbol\.svg" alt="" width="44" height="44" loading="lazy"><\/div>/);
 assert.doesNotMatch(app,/<div class="welcome-mark">R<\/div>/);
 assert.match(style,/\.welcome-mark img/);
});
test('v9 loaded after v8 without leaking styles to public site or motion regressions',()=>{
 const v8=html.indexOf('/dashboard-observatory-v8.css');
 const v9=html.indexOf('/dashboard-observatory-v9.css');
 assert.ok(v8>=0&&v9>v8);
 assert.match(html,/dashboard-observatory-v9\.css\?v=20261027-dark-workspace-ui-v9/);
 assert.match(html,/app\.js\?v=[^"]+-dashboard-ui-v9/);
 assert.match(style,/@media\(prefers-reduced-motion:reduce\)/);
 assert.equal(style.split('{').length,style.split('}').length);
});
