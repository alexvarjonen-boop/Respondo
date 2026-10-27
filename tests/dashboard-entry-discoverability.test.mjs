import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const read=path=>readFileSync(new URL('../public/'+path,import.meta.url),'utf8');
test('dashboard and public demo overview offer direct, accessible, localized navigation',()=>{
 const s=read('app.js');
 assert.match(s,/class="dashboard-entry dashboard-view-section" data-dashboard-view="overview"/);
 assert.match(s,/Valitse toiminto tästä tai avaa yläkulman Valikko/);
 assert.match(s,/Välj här eller öppna Meny/);
 assert.match(s,/Choose an action here, or open Menu/);
 assert.match(s,/Kokeile Respondoa\./);
 assert.match(s,/Explore Respondo\./);
 assert.match(s,/data-dashboard-jump="live-preview"/);
 for(const view of ['setup','answers']) assert.ok(s.includes('data-dashboard-open="'+view+'"'));
 assert.match(s,/data-dashboard-open="\$\{isDemo\?'install':'customers'\}"/);
 assert.match(s,/premiumIcon\('setup'\)/);
 assert.match(s,/premiumIcon\('answers'\)/);
 assert.match(s,/class="dashboard-entry-icon"/);
});
test('the test-chat shortcut opens the live preview in both public and logged-in dashboards',()=>{
 const s=read('app.js');
 const jumps=s.match(/document\.querySelectorAll\('\[data-dashboard-jump\]'\)/g)||[];
 assert.equal(jumps.length,2,'both handlers present');
 assert.match(s,/showDemoDashboardView\(view,\{scrollTop:false\}\)/);
 assert.match(s,/openDashboardTarget\(button\.dataset\.dashboardJump\)/);
 assert.match(s,/getElementById\(target\)\?\.scrollIntoView/);
 assert.match(s,/prefers-reduced-motion: reduce/);
});
test('menu is labelled in FI, SV and EN instead of three anonymous bars',()=>{
 const s=read('dashboard-drawer.js');
 assert.doesNotThrow(()=>new Script(s));
 assert.match(s,/class="dashboard-menu-label"/);
 assert.match(s,/words\('Valikko','Meny','Menu'\)/);
 assert.match(s,/aria-controls','dashboard-drawer'/);
 assert.match(s,/aria-expanded','false'/);
});
test('mobile cards and menu affordance are visible without opening the drawer',()=>{
 const css=read('dashboard-entry.css'),index=read('index.html');
 assert.match(css,/\.dashboard-entry-action\.dashboard-entry-primary/);
 assert.match(css,/\.dashboard-menu-label/);
 assert.match(css,/min-width:97px!important/);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/order:3!important/);
 assert.match(css,/\.dashboard-entry\.dashboard-view-hidden\{display:none!important\}/);
 assert.match(css,/@media\(max-width:350px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.doesNotMatch(css,/@keyframes|scroll-snap-type/);
 assert.equal(css.split('{').length,css.split('}').length);
 assert.match(index,/dashboard-entry\.css\?v=20261027-visible-dashboard-navigation-v1-quick-actions-first-v2-all-sections-v3/);
 assert.match(index,/app\.js\?v=[^"]+-dashboard-entry-v1-all-sections-v3/);
 assert.match(index,/dashboard-drawer\.js\?v=[^"]+-visible-menu-v1-all-sections-v3/);
});

test('overview shows its useful quick actions before passive metrics and reveals scrolled-to sections',()=>{
 const css=read('dashboard-entry.css');
 const entry=css.match(/\.dashboard-simple-main > \.dashboard-entry\[data-dashboard-view="overview"\]\{\s*order:(\d+)!important;/);
 const metrics=css.match(/\.dashboard-simple-main > \.stats\[data-dashboard-view="overview"\]\{\s*order:(\d+)!important;/);
 assert.ok(entry && metrics, 'explicit flex order required');
 assert.ok(Number(entry[1])<Number(metrics[1]),'first action comes before statistics');
 assert.match(css,/#live-preview,#business-profile,#knowledge,#install,#leads,#conversations/);
 assert.match(css,/scroll-margin-top:var\(--demo-sticky-header-space,180px\)/);
 assert.match(css,/\.dashboard-head\[data-dashboard-view="overview"\]\{/);
 assert.match(read('index.html'),/quick-actions-first-v2/);
});

test('all sections are one tap away from the visible dashboard footer in every language',()=>{
 const app=read('app.js'),drawer=read('dashboard-drawer.js');
 for(const text of ['Näytä kaikki osiot','Visa alla avsnitt','View all sections']) assert.ok(app.includes(text),text);
 for(const text of ['Kaikki muut toiminnot löytyvät valikosta.','Alla andra funktioner finns i menyn.','Find every other feature in the menu.']) assert.ok(app.includes(text),text);
 assert.match(app,/data-dashboard-open-menu aria-haspopup="dialog" aria-controls="dashboard-drawer"/);
 assert.match(app,/chat:'<path d=/);
 assert.match(app,/dashboard-entry-icon" aria-hidden="true">\$\{premiumIcon\('chat'\)\}/);
 assert.match(drawer,/app\.addEventListener\('click'/);
 assert.match(drawer,/event\.target\.closest\?\.\('\[data-dashboard-open-menu\]'\)/);
 assert.match(drawer,/app\.querySelector\('\.dashboard-menu-toggle'\)/);
 assert.match(drawer,/menu\.click\(\)/);
 assert.doesNotThrow(()=>new Script(drawer));
 const css=read('dashboard-entry.css');
 assert.match(css,/\.dashboard-entry-footer/);
 assert.match(css,/\.dashboard-entry-more/);
 assert.match(css,/min-height:44px/);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.equal(css.split('{').length,css.split('}').length);
});
