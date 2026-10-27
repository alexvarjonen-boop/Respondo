import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../public/'+p,import.meta.url),'utf8');
const css=read('dashboard-mobile-calm-v11.css');
const index=read('index.html');
const app=read('app.js');
test('logged-in header uses distinct layout tracks, no overlapping select, flags or menu',()=>{
  for(const piece of ['.dashboard-topbar.dashboard-has-drawer > .dashboard-topbar-brand',
    'display:contents!important','grid-template-rows:48px minmax(44px,auto)!important',
    'grid-column:1!important;grid-row:1!important',
    'grid-column:1!important;grid-row:2!important',
    'grid-column:2!important;grid-row:1!important',
    'grid-column:2!important;grid-row:2!important',
    'position:static!important;inset:auto!important;transform:none!important',
    'max-width:min(43vw,162px)!important'])
    assert.ok(css.includes(piece),piece);
  assert.ok(css.includes('@media(max-width:360px)'));
  assert.ok(css.includes('grid-template-rows:46px 51px 38px!important'));
  assert.ok(css.includes('.workspace-switcher'));
});
test('mobile first screen has one Menu, one primary action and no redundant fourth action',()=>{
  assert.ok(css.includes('.dashboard-head-mobile-links .dashboard-head-mobile-menu'));
  assert.ok(css.includes('display:none!important'));
  assert.ok(css.includes('min-height:47px!important'));
  assert.ok(css.includes('.stats[data-dashboard-view="overview"] .stat'));
  for(const action of ['data-dashboard-jump="live-preview"','data-dashboard-open="setup"',
  'data-dashboard-open="answers"','data-dashboard-open-menu']) assert.ok(app.includes(action));
  assert.ok(app.includes('class="dashboard-head-mobile-links"'));
  assert.ok(read('dashboard-drawer.js').includes('dashboard-menu-toggle'));
});
test('late-scoped stylesheet wins existing cascade and leaves demo and desktop untouched',()=>{
  assert.ok(index.includes('/dashboard-mobile-calm-v11.css?v=20261028-mobile-workspace-no-overlap-v11'));
  assert.ok(index.indexOf('/dashboard-mobile-calm-v11.css')>index.indexOf('/dashboard-observatory-v10.css'));
  assert.ok(css.includes(':not(.demo-dashboard-shell)'));
  assert.ok(css.includes('@media(max-width:760px)'));
  assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
  assert.ok(!/@keyframes|scroll-snap-type|@import/.test(css));
  assert.equal(css.split('{').length,css.split('}').length);
});
