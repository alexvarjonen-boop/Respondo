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


test('mobile Try Bot navigation collapses on scroll but keeps an accessible section picker',()=>{
  assert.match(app,/const syncDemoCompactHeader = \(\) =>/);
  assert.match(app,/classList\.toggle\('is-condensed',condensed\)/);
  assert.match(app,/window\.addEventListener\('scroll',syncDemoCompactHeader,\{passive:true\}\)/);
  assert.match(css,/\.demo-sticky-topbar\.is-condensed \.dashboard-section-picker/);
  assert.match(css,/\.demo-sticky-topbar\.is-condensed \.demo-section-strip/);
  assert.match(css,/\.demo-sticky-topbar\.is-condensed \.demo-header-trial/);
});

test('public Try Bot never injects the separate Respondo marketing chat launcher',()=>{
  const effects=fs.readFileSync(new URL('../public/effects.js',import.meta.url),'utf8');
  const assistant=effects.slice(effects.indexOf('function assistant()'),effects.indexOf('function localizeStandaloneAssistant'));
  assert.match(assistant,/if \(isWorkspacePage\(\)\) \{[\s\S]*?\.fx-assistant-launch[\s\S]*?return;/);
  assert.ok(assistant.indexOf('if (isWorkspacePage())')<assistant.indexOf("document.body.insertAdjacentHTML('beforeend'"));
  const init=effects.slice(effects.indexOf('function init()'),effects.indexOf('let timer;',effects.indexOf('function init()')));
  assert.match(init,/if \(isWorkspacePage\(\)\) \{[\s\S]*?prepareStaticWorkspace\(\);[\s\S]*?assistant\(\);/);
});
