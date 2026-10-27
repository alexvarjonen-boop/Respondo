import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../public/'+p,import.meta.url),'utf8');
const css=read('dashboard-respondo-brand-v7.css');
const html=read('index.html');
const app=read('app.js');
test('logged-in dashboard welcome becomes a helpful Respondo workspace identity in every locale',()=>{
 for(const title of ['Asiakaspalvelu hallinnassa.','Kundservice under kontroll.','Customer service, in control.'])
  assert.ok(app.includes(title),title);
 for(const id of ['data-dashboard-jump="live-preview"','data-dashboard-open="setup"',
  'data-dashboard-open="answers"','data-dashboard-open-menu'])
  assert.ok(app.includes(id),id);
});
test('deep navy theme targets dashboard and accessible discovery, without overriding public homepage',()=>{
 for(const word of ['.dashboard-premium-shell.dashboard-simple-shell',
 '.dashboard-topbar.dashboard-has-drawer',
 '.dashboard-head[data-dashboard-view="overview"]',
 '.dashboard-head-mobile-test',
 '.dashboard-head-mobile-menu',
 '.dashboard-entry',
 '.stat',
 '.dashboard-drawer-panel',
 '.dashboard-drawer-link.active',
 '@media(max-width:760px)',
 '@media(prefers-reduced-motion:reduce)'])
  assert.ok(css.includes(word),word);
 for(const word of ['background:#08111f','color:#f7faff','border-radius:24px',
  '.dashboard-premium-shell :is(.panel,.onboarding-card,.welcome-card)'])
  assert.ok(css.includes(word),word);
 assert.doesNotMatch(css,/@keyframes|scroll-snap-type|\.apple-home-page|\.rs-spiral/);
 assert.equal(css.split('{').length,css.split('}').length);
});
test('the CSS is deployed last in the stylesheet stack with an updated app module version',()=>{
 assert.match(html,/dashboard-respondo-brand-v7\.css\?v=20261027-workspace-observatory-v7/);
 assert.match(html,/app\.js\?v=[^"]+-dashboard-brand-v7/);
 const entry=html.indexOf('/dashboard-entry.css?');
 const branded=html.indexOf('/dashboard-respondo-brand-v7.css?');
 assert.ok(branded>entry);
 assert.match(read('dashboard-drawer.js'),/data-dashboard-open-menu/);
 assert.match(read('dashboard-entry.css'),/v6: Primary-first demo/);
});
