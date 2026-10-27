import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../public/'+p,import.meta.url),'utf8');
test('first mobile viewport has direct bot and full-menu actions before quick-access cards',()=>{
 const s=read('app.js');
 const h=s.indexOf('<section class="dashboard-head dashboard-view-section"');
 const e=s.indexOf('<section class="dashboard-entry dashboard-view-section"',h);
 assert.ok(h>=0&&e>h);
 const top=s.slice(h,e);
 assert.match(top,/data-dashboard-jump="live-preview"/);
 assert.match(top,/data-dashboard-open-menu aria-haspopup="dialog" aria-controls="dashboard-drawer"/);
 for(const label of ['Testaa bottia','Testa chatbotten','Test chatbot','Kaikki osiot','Alla avsnitt','All sections']) assert.ok(top.includes(label),label);
 assert.match(s,/document.querySelectorAll\('\[data-dashboard-jump\]'\)/);
});
test('first viewport buttons only on phones, keyboard accessible and no motion dependency',()=>{
 const css=read('dashboard-entry.css'),html=read('index.html');
 assert.match(css,/\.dashboard-head-mobile-links\{display:none\}/);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/\.dashboard-head-mobile-links button:focus-visible/);
 assert.match(css,/min-height:44px/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.equal(css.split('{').length,css.split('}').length);
 assert.match(html,/dashboard-entry\.css\?v=[^"]+-first-viewport-v4/);
 assert.match(html,/app\.js\?v=[^"]+-first-viewport-v4/);
});
