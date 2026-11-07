import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../public/workspace-settings-minimal-v55.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');

test('workspace integration categories wrap instead of clipping horizontally', () => {
  const tabs = css.match(/#app \.respondo-workspace \.rs-module-tabs\{([^}]+)\}/)?.[1] || '';
  assert.match(tabs, /display:grid!important;/);
  assert.match(tabs, /grid-template-columns:repeat\(auto-fit,/);
  assert.match(tabs, /overflow:visible;/);
  assert.doesNotMatch(tabs, /overflow-x:auto|flex-wrap:nowrap/);
  assert.match(css, /\.rs-module-tabs\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\);\}/);
  assert.match(css, /\.rs-module-tabs button\{[^}]*white-space:normal;/);
  assert.match(html, /workspace-settings-minimal-v55\.css\?v=20261107-all-integration-tabs-visible-v1/);
});
