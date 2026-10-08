import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(new URL('../public/' + file, import.meta.url), 'utf8');
const css = read('styles.css');
const effects = read('effects.css');
const widget = read('widget.js');
const app = read('app.js');
const html = read('index.html');

test('iPhone dashboard chat input uses at least 16px and does not trigger Safari focus zoom', () => {
  const localFix = css.match(/\/\* Mobile Safari automatically zooms[\s\S]*?\}\s*\}/)?.[0] || '';
  assert.match(localFix, /\.preview-form input/);
  assert.match(localFix, /\.preview-leadbox input/);
  assert.match(localFix, /font-size:16px!important/);

  const finalGuard = effects.split('/* 2026-10-08: Keep iOS Safari from auto-zooming')[1] || '';
  assert.match(finalGuard, /@media \(max-width:1024px\), \(hover:none\) and \(pointer:coarse\)/);
  assert.match(finalGuard, /input:not\(\[type="checkbox"\]\)/);
  assert.match(finalGuard, /textarea,\s*select\s*\{\s*font-size:16px!important/);
});

test('embedded widget inputs remain readable on iOS and preserve normal pinch zoom', () => {
  assert.match(widget, /\.composer input,\.leadbox input,\.actionbox input,\.actionbox textarea,\.actionbox select\{font-size:16px\}/);
  assert.doesNotMatch(html, /user-scalable=no|maximum-scale=1/i);
  assert.match(app, /widget\.js\?v=20261008-ios-focus-nozoom-v1/);
});

test('updated CSS and JS references invalidate old mobile caches', () => {
  assert.match(html, /styles\.css\?v=20261008-ios-focus-nozoom-v1/);
  assert.match(html, /effects\.css\?v=20261008-ios-focus-nozoom-v1/);
  assert.match(html, /app\.js\?v=20261008-apple-three-cards-v1/);
});
