import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../public/'+p,import.meta.url),'utf8');
const app=read('app.js'),css=read('dashboard-entry.css'),html=read('index.html');
test('four visible mobile dashboard navigation targets do not require hamburger discovery',()=>{
 const start=app.indexOf('<div class="dashboard-head-mobile-links"');
 const end=app.indexOf('</div>',start);
 assert.ok(start>0&&end>start);
 const nav=app.slice(start,end);
 assert.match(nav,/dashboard-head-mobile-hint/);
 assert.match(nav,/data-dashboard-jump="live-preview"/);
 assert.match(nav,/data-dashboard-open="setup"/);
 assert.match(nav,/data-dashboard-open="answers"/);
 assert.match(nav,/data-dashboard-open-menu aria-haspopup="dialog" aria-controls="dashboard-drawer"/);
 for(const phrase of ['ALOITA TÄSTÄ','BÖRJA HÄR','START HERE','Testaa bottia','Testa chatbotten','Test chatbot',
  'Yritys ja botti','Företag och bot','Business & bot',
  'Vastaukset','Svar','Answers',
  'Kaikki osiot','Alla avsnitt','All sections'])assert.ok(nav.includes(phrase),phrase);
 assert.equal((nav.match(/<button /g)||[]).length,4);
});
test('real and demo dashboard already bind the added setup and answers shortcut events',()=>{
 assert.equal((app.match(/document\.querySelectorAll\('\[data-dashboard-open\]'\)/g)||[]).length,2);
 assert.equal((app.match(/document\.querySelectorAll\('\[data-dashboard-jump\]'\)/g)||[]).length,2);
 const drawer=read('dashboard-drawer.js');
 assert.match(drawer,/\.dashboard-menu-toggle/);
 assert.match(drawer,/aria-expanded/);
});
test('iPhone viewport shows a compact two-column nav immediately after welcome with no giant header',()=>{
 assert.match(css,/v5: Real first-screen navigation/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
 assert.match(css,/min-height:0!important;max-height:none!important/);
 assert.match(css,/\.dashboard-head-mobile-setup/);
 assert.match(css,/\.dashboard-head-mobile-answers/);
 assert.match(css,/\.dashboard-head-mobile-links button:focus-visible/);
 assert.match(css,/@media\(max-width:365px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.doesNotMatch(css,/@keyframes|scroll-snap-type/);
 assert.equal(css.split('{').length,css.split('}').length);
 assert.match(html,/dashboard-entry\.css\?v=[^"]+-first-screen-actions-v5/);
 assert.match(html,/app\.js\?v=[^"]+-first-screen-actions-v5/);
});
