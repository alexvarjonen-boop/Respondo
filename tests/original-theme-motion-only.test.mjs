import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const read = (p) => readFileSync(fileURLToPath(new URL('../' + p, import.meta.url)), 'utf8');
const html = read('public/index.html');
const css = read('public/original-theme-motion.css');
const js = read('public/original-theme-motion.js');
const home = read('public/apple-home.js');

test('the original homepage markup, Apple-style sheet and branding remain in use', () => {
  assert.match(html, /href="\/apple-home\.css\?/);
  assert.match(html, /src="\/app\.js\?/);
  assert.match(home, /spiralHeroMarkup\(t, lang\)/);
  assert.match(read('public/spiral-hero.js'), /<section class="apple-hero rs-spiral-section"/);
  assert.match(home, /<section class="apple-highlights"/);
  assert.match(home, /apple-lead-calculator/);
  assert.doesNotMatch(html, /\/cinematic-(home|inner-pages|marketing|product-scenes)\./);
});

test('the enhancement only loads its own isolated motion layer', () => {
  assert.match(html, /href="\/original-theme-motion\.css\?/);
  assert.match(html, /src="\/unified-motion\.js\?/);
  assert.match(html, /src="\/spiral-hero-motion\.js\?/);
  assert.match(js, /location\.pathname\s*!==\s*'\/'/);
  assert.match(js, /prefers-reduced-motion: reduce/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /\.apple-home-page\.motion-only-enabled/);
  assert.doesNotMatch(css, /(?:^|[;{])\s*(?:color|background(?:-color)?|font(?:-size|-family|-weight)?|border-radius|padding|margin|display|grid-template-columns)\s*:/m);
});

test('the enhancement never adds content sections, submits forms or calls APIs', () => {
  assert.doesNotMatch(js, /(?:insertAdjacentHTML|innerHTML\s*=|fetch\s*\(|api\s*\()/);
  assert.match(js, /IntersectionObserver/);
  assert.match(js, /requestAnimationFrame/);
});
