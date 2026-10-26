import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spiralHeroMarkup } from '../public/spiral-hero.js';

const css = readFileSync(new URL('../public/spiral-hero.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../public/spiral-hero-motion.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');

test('homepage features fill the viewport without visual cards in every language', () => {
  for (const lang of ['fi', 'sv', 'en']) {
    const t = (fi, sv, en) => ({fi, sv, en})[lang];
    const hero = spiralHeroMarkup(t, lang);
    assert.match(hero, /data-rs-mode="fullscreen"/);
    assert.equal((hero.match(/data-rs-card\b/g) || []).length, 7);
    assert.match(hero, /data-rs-announcement/);
  }
  assert.match(css, /RESPONDO FULLSCREEN CHAPTERS/);
  assert.match(css, /min-height:100svh/);
  assert.match(css, /background:transparent!important;border:0!important;border-radius:0!important/);
  assert.match(css, /\.rs-enhanced \.rs-spiral-card/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(js, /--rs-panel-y/);
  assert.match(js, /--rs-intro-opacity/);
  assert.match(js, /requestAnimationFrame\(draw\)/);
  assert.doesNotMatch(js, /scrollTo\(|preventDefault\(|setInterval\(/);
  assert.match(html, /spiral-hero\.css\?v=20261021-fullscreen-chapters-v1/);
  assert.match(html, /spiral-hero-motion\.js\?v=20261026-orbit-camera-v1/);
});
