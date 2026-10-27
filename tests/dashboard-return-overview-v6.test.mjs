import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const read=p=>readFileSync(new URL('../public/'+p,import.meta.url),'utf8');
const js=read('dashboard-drawer.js'),css=read('dashboard-entry.css'),html=read('index.html');
test('section navigation exposes a localized return-to-overview action on mobile',()=>{
 assert.doesNotThrow(()=>new Script(js));
 for(const s of ['dashboard-return-home','Takaisin yleiskatsaukseen','Tillbaka till översikten','Back to overview','returnHome.hidden=select.value']) assert.ok(js.includes(s),s);
 assert.match(js,/main\?\.insertBefore\(returnHome/);
 assert.match(js,/select\.dispatchEvent\(new Event\('change',\{bubbles:true\}\)\)/);
 assert.match(js,/viewObserver\.observe\(document\.body,\{attributes:true,attributeFilter:\['data-dashboard-view'\]\}\)/);
 assert.match(js,/viewObserver\.disconnect\(\)/);
 assert.match(js,/returnHome\.remove\(\)/);
});
test('return action does not obstruct desktop navigation or mobile bot input',()=>{
 assert.match(css,/@media\(max-width:900px\)/);
 assert.match(css,/\.dashboard-return-home:not\(\[hidden\]\)/);
 assert.match(css,/min-height:44px!important/);
 assert.match(css,/\.dashboard-return-home:focus-visible/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.equal(css.split('{').length,css.split('}').length);
});
test('Safari loads new drawer and CSS without stale assets',()=>{
 assert.match(html,/dashboard-drawer\.js\?v=[^"]+-return-overview-v6/);
 assert.match(html,/dashboard-entry\.css\?v=[^"]+-return-overview-v6/);
});
