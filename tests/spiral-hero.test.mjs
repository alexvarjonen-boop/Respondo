import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { pathToFileURL } from 'node:url';

const publicDir = path.resolve(import.meta.dirname, '..', 'public');
const read = file => fs.readFileSync(path.join(publicDir, file), 'utf8');

test('spiral page renders 7 real feature cards after logo reveal in all languages', async () => {
  const { appleHomeMarkup } = await import(pathToFileURL(path.join(publicDir, 'apple-home.js')).href);
  const { spiralHeroMarkup } = await import(pathToFileURL(path.join(publicDir, 'spiral-hero.js')).href);
  for (const lang of ['fi', 'sv', 'en']) {
    const t = (fi, sv, en) => ({fi,sv,en})[lang];
    const markup = appleHomeMarkup(t, lang, 145, '<section class="pricing-section">PLANS</section>');
    const hero = spiralHeroMarkup(t, lang);
    assert.match(hero, /class="apple-hero rs-spiral-section"/);
    assert.equal((hero.match(/data-rs-card\b/g) || []).length, 7);
    assert.ok(!hero.includes('data-respondo-hero-cta="signup"'));
    assert.doesNotMatch(hero,/data-respondo-ask-form|respondo-home-question|data-respondo-ask-question|rs-chat-entry/);
    assert.ok(!hero.includes('data-respondo-hero-cta="demo"'));
    assert.ok(!hero.includes('/tilaus?lang=' + lang));
    assert.ok(hero.includes('viewBox="0 0 256 256"'));
    assert.ok(markup.includes('rs-spiral-section'));
    assert.doesNotMatch(markup, /apple-highlights|apple-lead-calculator|rg-growth-section/);
    assert.ok(markup.indexOf('rs-spiral-section') < markup.indexOf('PLANS'));
    assert.equal((markup.match(/data-rs-card\b/g)||[]).length, 7);
    assert.ok(!markup.includes('apple-bottom-cta'));
    assert.ok(hero.includes(t('ei mitattu asiakastulos','inget uppmätt kundresultat','not a measured customer result')));
  }
});

test('language card shows three real flag graphics, never letter substitutes', async () => {
  const { spiralHeroMarkup } = await import(pathToFileURL(path.join(publicDir, 'spiral-hero.js')).href);
  for (const lang of ['fi', 'sv', 'en']) {
    const t = (fi, sv, en) => ({fi,sv,en})[lang];
    const markup = spiralHeroMarkup(t, lang);
    const start = markup.indexOf('class="rs-language-flags"');
    assert.ok(start >= 0, 'Language-card graphics must be present');
    const flags = markup.slice(start, markup.indexOf('</span></div>', start) + '</span></div>'.length);
    assert.equal((flags.match(/<svg width="28" height="20" viewBox="0 0 22 16"/g) || []).length, 3);
    assert.doesNotMatch(flags, /🇬🇧|🇫🇮|🇸🇪|>\\s*(?:EN|FI|SV)\\s*</);
    assert.match(flags, /fill="#003580"/);
    assert.match(flags, /fill="#006AA7"/);
    assert.match(flags, /fill="#012169"/);
  }
  const css = read('spiral-hero.css');
  assert.match(css, /#app \\.rs-language-flags>span svg\\{display:block;width:28px;height:20px/);
});

test('central white arrow is exactly the official symbol', async () => {
  const source = read('respondo-symbol.svg');
  const official = source.match(/<path d="([^"]+)"/)?.[1];
  const spiralFile = read('spiral-hero.js');
  const embedded = spiralFile.match(/const arrow = '([^']+)'/)?.[1];
  assert.ok(official);
  assert.equal(embedded, official);
});

test('lightweight spiral uses a bounded, scroll-driven frame and fails safely', () => {
  const js = read('spiral-hero-motion.js');
  assert.doesNotThrow(() => new vm.Script(js));
  assert.match(js, /prefers-reduced-motion: reduce/);
  assert.match(js, /saveData/);
  assert.match(js, /requestAnimationFrame\(draw\)/);
  assert.match(js, /new MutationObserver\(queueMount\)/);
  assert.match(js, /childList:true/);
  assert.match(js, /passive:true/);
  assert.doesNotMatch(js, /WebGL|three\.js|scrollIntoView|scrollTo\(|preventDefault\(|setInterval\(|requestAnimationFrame\(update\)/);
});

test('spiral styles keep a static accessible fallback and preserve navigation', () => {
  const css = read('spiral-hero.css');
  const index = read('index.html');
  assert.match(css, /rs-enhanced/);
  assert.match(css, /position:sticky/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /pointer-events:auto!important/);
  assert.doesNotMatch(css, /scroll-snap-type|backdrop-filter|filter:blur\(/);
  assert.ok(index.includes('spiral-hero.css'));
  assert.ok(index.includes('spiral-hero-motion.js'));
  assert.ok(index.indexOf('spiral-hero.css') > index.indexOf('minimal-cinematic.css'));
  assert.ok(index.indexOf('spiral-hero-motion.js') > index.indexOf('logo-reveal.js'));
  assert.ok(index.includes('-spiral-tree-hero-v1'));
});
