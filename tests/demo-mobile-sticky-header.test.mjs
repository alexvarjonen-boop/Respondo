import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../public/styles.css',import.meta.url),'utf8');

test('public demo header stays fixed on mobile and reserves its height',()=>{
  assert.match(css,/\.demo-dashboard-main\s*>\s*\.demo-sticky-topbar\s*\{[\s\S]*?position:fixed!important/i);
  assert.match(css,/padding-top:var\(--demo-sticky-header-space,164px\)!important/i);
  assert.match(css,/top:max\(8px,env\(safe-area-inset-top\)\)!important/i);
  assert.match(css,/border-radius:22px!important/i);
  assert.match(app,/const syncDemoStickyHeaderSpace = \(\) =>/);
  assert.match(app,/getBoundingClientRect\(\)\.height/);
  assert.match(app,/new ResizeObserver\(syncDemoStickyHeaderSpace\)/);
});
