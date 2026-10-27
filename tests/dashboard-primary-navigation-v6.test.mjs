import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../public/'+p,import.meta.url),'utf8');
const css=read('dashboard-entry.css'),app=read('app.js'),html=read('index.html');
test('mobile dashboard makes the test-bot action dominant, then setup and answers',()=>{
 const region=css.slice(css.indexOf('/* v6: Primary-first demo'));
 assert.ok(region.startsWith('/* v6: Primary-first demo'));
 assert.match(region,/@media\(max-width:760px\)/);
 assert.match(region,/\.dashboard-head-mobile-test\{[\s\S]*?grid-column:1\/-1!important/);
 assert.match(region,/\.dashboard-head-mobile-setup,\.dashboard-head-mobile-answers/);
 assert.match(region,/\.dashboard-head-mobile-menu\{[\s\S]*?grid-column:1\/-1!important/);
 assert.match(region,/\.dashboard-simple-main[\s\S]*?> \.dashboard-entry\[data-dashboard-view="overview"\]\{[\s\S]*?display:none!important/);
 assert.doesNotMatch(region,/@keyframes|scroll-snap-type|backdrop-filter/);
});
test('mobile visitors still have access to all sections without the redundant cards',()=>{
 const start=app.indexOf('<div class="dashboard-head-mobile-links"'),end=app.indexOf('</div>',start);
 assert.ok(start>0&&end>start);
 const nav=app.slice(start,end);
 assert.equal((nav.match(/<button /g)||[]).length,4);
 for(const action of ['data-dashboard-jump="live-preview"','data-dashboard-open="setup"','data-dashboard-open="answers"','data-dashboard-open-menu'])
  assert.ok(nav.includes(action),action);
 assert.match(read('dashboard-drawer.js'),/menu\.click\(\)/);
 assert.match(css,/@media\(max-width:350px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(html,/dashboard-entry\.css\?v=[^"]+-primary-navigation-v6/);
 assert.equal(css.split('{').length,css.split('}').length);
});
