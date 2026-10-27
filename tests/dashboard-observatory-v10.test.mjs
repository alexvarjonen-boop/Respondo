import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../public/'+p,import.meta.url),'utf8');
const css=read('dashboard-observatory-v10.css'),app=read('app.js'),index=read('index.html');
test('Respondo navy workspace is consistently branded across demo and real overview',()=>{
 for(const piece of ['.dashboard-premium-shell.dashboard-simple-shell','.dashboard-head[data-dashboard-view="overview"]',
   '.onboarding-card,.welcome-card','.onboarding-progress','.onboarding-step','.dashboard-drawer-panel',
   '.dashboard-menu-toggle','#0b1527','#162d4c','#d9ecff']) assert.ok(css.includes(piece),piece);
 assert.doesNotMatch(css,/\.apple-home-page|\.rs-spiral-section|@keyframes|scroll-snap-type|@import/);
});
test('mobile first viewport keeps all four working direct actions and visible menu',()=>{
 for(const pattern of [/data-dashboard-jump="live-preview"/,/data-dashboard-open="setup"/,
   /data-dashboard-open="answers"/,/data-dashboard-open-menu aria-haspopup="dialog"/]){
   assert.match(app,pattern);
 }
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/\.dashboard-head-mobile-test/);
 assert.match(css,/\.dashboard-head-mobile-menu/);
 assert.match(css,/min-height:0!important/);
 assert.match(read('dashboard-drawer.js'),/words\('Valikko','Meny','Menu'\)/);
});
test('editor and preview inputs retain accessible light surfaces and original handlers',()=>{
 assert.doesNotMatch(css,/\.knowledge-panel\s*\{|\.preview-form\s*input\s*\{|input\s*\{/);
 assert.match(css,/live-preview-panel,.preview-device/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(index,/dashboard-observatory-v10\.css\?v=20261027-consistent-respondo-os-v10/);
 assert.ok(index.indexOf('/dashboard-observatory-v10.css')>index.indexOf('/dashboard-observatory-v9.css'));
 assert.equal(css.split('{').length,css.split('}').length);
});
