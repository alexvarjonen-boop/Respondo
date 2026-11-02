import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(name)=>readFileSync(new URL('../public/'+name,import.meta.url),'utf8');
const sphere=read('workspace-orbit-v28.js');
const account=read('workspace-continuation-v24.js');
const css=read('workspace-orbit-v28.css');
const workspaceCss=read('workspace-continuation-v24.css');
const index=read('index.html');
const app=read('app.js');

const names=['overview','customers','conversations','team','setup','answers','automation','install','integrations','billing','settings','profile'];

test('the sphere exposes twelve ordered, distinct and accessible sections',()=>{
  const entries=[...sphere.matchAll(/\{id:'(overview|customers|conversations|team|setup|answers|automation|install|integrations|billing|settings|profile)',label:translate\(/g)]
    .map(match=>match[1]);
  assert.deepEqual(entries,names);
  assert.equal(new Set(entries).size,12);
  assert.match(sphere,/data-rs-workspace-icon data-index/);
  assert.match(sphere,/return '<button type="button" class="rs-studio-orbit-icon/);
  assert.match(sphere,/data-workspace-target/);
  assert.match(sphere,/aria-label/);
  assert.match(sphere,/icons\.forEach\(\(item,index\)=>item\.addEventListener\('click'/);
  assert.match(sphere,/openSection\(index\)/);
  assert.match(sphere,/navigateTo\(section\.id\)/);
  assert.match(sphere,/button\.addEventListener\('click',\(\)=>openSection\(currentIndex\)\)/);
  assert.match(sphere,/const position=progress\*\(sections\.length-1\)/);
  assert.match(sphere,/moveSection\(dy<0\?1:-1\)/);
  assert.doesNotMatch(sphere,/\b01 \/ 10\b/);
});
test('the existing visual orbit remains while icon hit testing and focus are enabled',()=>{
  assert.match(sphere,/rs-studio-orbit-ring rs-studio-ring-a/);
  assert.match(sphere,/rs-studio-orbit-ring rs-studio-ring-b/);
  assert.match(sphere,/rs-studio-orbit-ring rs-studio-ring-c/);
  assert.match(sphere,/rs-helix-beacon/);
  assert.match(sphere,/rs-axis-halo/);
  assert.match(css,/\[data-rs-workspace-icon\]\s*\{\s*appearance:none/);
  assert.match(css,/pointer-events:auto;cursor:pointer/);
  assert.match(css,/focus-visible/);
  assert.match(css,/rs-orbit-mobile-pinned/);
  assert.match(sphere,/releasePin\(\);[\s\S]*navigateTo\(section\.id\)/);
});
test('clicking any icon keeps its correct chapter highlighted during panel smooth scroll',()=>{
  assert.match(sphere,/let navigationFreeze=false/);
  assert.match(sphere,/navigationFreeze=true;[\s\S]{0,300}selectIndex\(index\)/);
  assert.match(sphere,/const progress=\(pinned\|\|navigationFreeze\)\?currentIndex\/\(sections\.length-1\)/);
  assert.match(sphere,/if\(!pinned && !navigationFreeze\)selectIndex\(Math\.round\(position\)\)/);
  assert.match(sphere,/navigationFreeze=false;[\s\S]{0,100}return/);
  assert.match(account,/workspace-orbit-v28\.js\?v=[^'"]*selected-state-v45/);
  assert.match(app,/workspace-continuation-v24\.js\?v=[^'"]*selected-state-v45/);
  assert.match(index,/app\.js\?v=[^"]*selected-state-v45/);
});
test('real tenant analytics, leads, conversations and staff editor are reachable',()=>{
  assert.match(account,/respondoWorkspaceOverviewStats/);
  assert.match(account,/const overviewMetrics=\['stats','respondo-intelligence','dashboard-insights'\]/);
  assert.match(account,/if\(selected==='overview' && !demo\)showOverviewMetrics\(\)/);
  assert.match(account,/restoreOverviewMetrics\(\)/);
  assert.match(account,/customers:'leads'/);
  assert.match(account,/conversations:'conversations'/);
  assert.match(account,/team:'support-team'/);
  assert.match(account,/integrations:'business-integrations'/);
  assert.match(account,/\['live-inbox',translate\('Live-keskustelut'/);
  assert.match(app,/id="support-team"/);
  assert.match(app,/id="leads"/);
  assert.match(app,/id="live-inbox"/);
  assert.match(app,/class="stats dashboard-view-section"/);
  assert.match(account,/if\(demo && \['customers','conversations','team'/);
});
test('enterprise integration panel reparenting does not destroy form state or bypass plan restrictions',()=>{
  assert.match(account,/if\(target\.parentElement\?\.id==='actions2' && target\.hidden\)return false/);
  assert.match(account,/createComment\('respondo-module-return:/);
  assert.match(account,/activePlaceholder\.replaceWith\(activePanel\)/);
  assert.match(account,/target\.style\.setProperty\('display','block','important'\)/);
  assert.match(app,/id="commerceForm"/);
  assert.match(app,/id="integrationsForm"/);
});
test('overview surfaces owner-only pseudonymous day and month visitors without leaking analytics',()=>{
  assert.ok(account.includes("fetch('/api/owner/traffic',{credentials:'same-origin'})"));
  assert.match(account,/response\.ok\?response\.json\(\):null/);
  assert.match(account,/result\?\.summary/);
  assert.match(account,/summary\.today_unique/);
  assert.match(account,/summary\.month_unique/);
  assert.ok(account.includes("link.href='/trafic'"));
  assert.match(account,/if\(panel\.hasAttribute\('data-rs-owner-traffic'\)\)continue/);
});
test('dark commerce input labels use an accessible light foreground without redesign',()=>{
  assert.match(workspaceCss,/#commerce-integration \.formgrid \.field > label/);
  assert.match(workspaceCss,/color:#e6ebf4!important;-webkit-text-fill-color:#e6ebf4!important/);
  assert.match(workspaceCss,/#commerce-integration \.formgrid input::placeholder/);
  assert.match(workspaceCss,/rs-overview-stats/);
});
test('asset cache keys refresh every changed browser asset',()=>{
  assert.match(account,/workspace-orbit-v28\.js\?v=20261028-mobile-pinned-v37-home-parity-v39-logical-12-clickable-icons-v40/);
  assert.match(app,/workspace-continuation-v24\.js\?v=20261028-owner-subscribe-v38-orbit-home-parity-v39-owner-cta-demo-only-v40-avatar-after-setup-v41-logical-overview-team-integrations-v40/);
  assert.match(index,/workspace-continuation-v24\.css\?v=20261028-dark-workspace-v24-onboarding-contrast-v25-minimal-v26-subscribe-cta-v37-owner-subscribe-v38-avatar-after-setup-v41-avatar-logo-fit-v42-logical-analytics-label-contrast-v40/);
  assert.match(index,/workspace-orbit-v28\.css\?v=20261028-mobile-pinned-v37-clickable-sphere-v40/);
});
