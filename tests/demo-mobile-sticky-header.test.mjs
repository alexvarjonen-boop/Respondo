import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../public/styles.css',import.meta.url),'utf8');

test('public demo header stays fixed on phone and tablet widths and reserves its height',()=>{
  assert.match(css,/@media\(max-width:1024px\)[\s\S]*?\.demo-dashboard-main\s*>\s*\.demo-sticky-topbar\s*\{[\s\S]*?position:fixed!important/i);
  assert.match(css,/padding-top:var\(--demo-sticky-header-space,164px\)!important/i);
  assert.match(css,/top:max\(8px,env\(safe-area-inset-top\)\)!important/i);
  assert.match(css,/border-radius:22px!important/i);
  assert.match(app,/const syncDemoStickyHeaderSpace = \(\) =>/);
  assert.match(app,/matchMedia\('\(max-width:1024px\)'\)\.matches/);
  assert.match(app,/getBoundingClientRect\(\)\.height/);
  assert.match(app,/new ResizeObserver\(syncDemoStickyHeaderSpace\)/);
});


test('mobile Try Bot keeps one stable header with accessible navigation while scrolling',()=>{
  // The old condensed-layout scroll toggle broke the iOS hamburger menu.
  // The persistent header and dashboard drawer replace that behavior.
  assert.match(app,/demoStickyHeader\?\.classList\.remove\('is-condensed'\)/);
  assert.doesNotMatch(app,/const syncDemoCompactHeader = \(\) =>/);
  assert.match(app,/const dashboardSelect = \$\('#dashboardSectionSelect'\)/);
  assert.match(app,/class="demo-section-strip" aria-label=/);
  assert.match(app,/const validDashboardViews = new Set/);
  assert.match(css,/\.demo-dashboard-main\s*>\s*\.demo-sticky-topbar/);
});

test('public Try Bot never injects the separate Respondo marketing chat launcher',()=>{
  const effects=fs.readFileSync(new URL('../public/effects.js',import.meta.url),'utf8');
  const assistant=effects.slice(effects.indexOf('function assistant()'),effects.indexOf('function localizeStandaloneAssistant'));
  assert.match(assistant,/if \(isWorkspacePage\(\)\) \{[\s\S]*?\.fx-assistant-launch[\s\S]*?return;/);
  assert.ok(assistant.indexOf('if (isWorkspacePage())')<assistant.indexOf("document.body.insertAdjacentHTML('beforeend'"));
  const init=effects.slice(effects.indexOf('function init()'),effects.indexOf('let timer;',effects.indexOf('function init()')));
  assert.match(init,/if \(isWorkspacePage\(\)\) \{[\s\S]*?prepareStaticWorkspace\(\);[\s\S]*?assistant\(\);/);
});
