import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../public/'+p,import.meta.url),'utf8');
const c=read('dashboard-observatory-v8.css'),html=read('index.html');
test('Respondo workspace has one cohesive scoped navy interface, no white empty demo splash',()=>{
 assert.match(c,/background:\s*radial-gradient\(/);
 assert.match(c,/#app \.dashboard-premium-shell\.dashboard-simple-shell/);
 assert.match(c,/\.dashboard-head\[data-dashboard-view="overview"\]/);
 assert.match(c,/\.dashboard-head-mobile-links[\s\S]*?\.dashboard-head-mobile-test/);
 assert.match(c,/:has\(\.dashboard-head\[data-dashboard-view="overview"\]:not\(\.dashboard-view-hidden\)\)/);
 assert.doesNotMatch(c,/@keyframes|scroll-snap-type|@import|filter:blur/);
});
test('public mobile Try Bot keeps brand, centered languages and labelled menu visible in one row',()=>{
 assert.match(c,/@media\(min-width:351px\) and \(max-width:760px\)/);
 assert.match(c,/grid-template-columns:minmax\(42px,1fr\) auto minmax\(88px,1fr\)!important/);
 assert.match(c,/> \.premium-language-picker/);
 assert.match(c,/grid-column:2!important/);
 assert.match(c,/\.dashboard-menu-toggle\{[\s\S]*?grid-row:1!important;grid-column:3!important/);
 assert.match(read('dashboard-drawer.js'),/dashboard-menu-label/);
 assert.match(read('app.js'),/data-dashboard-open-menu aria-haspopup="dialog"/);
});
test('forms remain readable and all responsive states use current branded CSS',()=>{
 assert.match(c,/\.panel,\.onboarding-card,\.welcome-card/);
 assert.match(c,/background:linear-gradient\(155deg,#f4f8ff,#eaf2fc\)!important/);
 assert.match(c,/@media\(max-width:760px\)/);
 assert.match(c,/@media\(max-width:350px\)/);
 assert.match(c,/@media\(prefers-reduced-motion:reduce\)/);
 assert.equal(c.split('{').length,c.split('}').length);
 assert.match(html,/dashboard-observatory-v8\.css\?v=20261027-refined-dark-workspace-v8/);
 const first=html.indexOf('/dashboard-respondo-brand-v7.css');
 const last=html.indexOf('/dashboard-observatory-v8.css');
 assert.ok(first>0 && last>first);
});
