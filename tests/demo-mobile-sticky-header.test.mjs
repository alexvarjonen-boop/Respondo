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


test('mobile Try Bot header keeps one row instead of changing layout during scroll',()=>{
  const stable=fs.readFileSync(new URL('../public/mobile-header-stability.css',import.meta.url),'utf8');
  const drawer=fs.readFileSync(new URL('../public/dashboard-drawer.js',import.meta.url),'utf8');
  const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
  assert.ok(!app.includes('const syncDemoCompactHeader = () =>'));
  assert.ok(!app.includes("window.addEventListener('scroll',syncDemoCompactHeader"));
  assert.ok(app.includes("demoStickyHeader?.classList.remove('is-condensed')"));
  assert.ok(stable.includes('height:66px!important'));
  assert.ok(stable.includes('flex-wrap:nowrap!important'));
  assert.ok(stable.includes('.demo-dashboard-main > .demo-sticky-topbar'));
  assert.ok(stable.includes('> .dashboard-menu-toggle'));
  assert.ok(stable.includes('> .demo-public-actions'));
  assert.ok(drawer.includes("toggle.setAttribute('aria-controls','dashboard-drawer')"));
  assert.ok(drawer.includes("select.dispatchEvent(new Event('change'"));
  assert.ok(html.includes('/mobile-header-stability.css?v='));
});

test('public Try Bot never injects the separate Respondo marketing chat launcher',()=>{
  const effects=fs.readFileSync(new URL('../public/effects.js',import.meta.url),'utf8');
  const assistant=effects.slice(effects.indexOf('function assistant()'),effects.indexOf('function localizeStandaloneAssistant'));
  assert.match(assistant,/if \(isWorkspacePage\(\)\) \{[\s\S]*?\.fx-assistant-launch[\s\S]*?return;/);
  assert.ok(assistant.indexOf('if (isWorkspacePage())')<assistant.indexOf("document.body.insertAdjacentHTML('beforeend'"));
  const init=effects.slice(effects.indexOf('function init()'),effects.indexOf('let timer;',effects.indexOf('function init()')));
  assert.match(init,/if \(isWorkspacePage\(\)\) \{[\s\S]*?prepareStaticWorkspace\(\);[\s\S]*?assistant\(\);/);
});
