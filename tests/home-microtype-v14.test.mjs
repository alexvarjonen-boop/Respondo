import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spiralHeroMarkup} from '../public/spiral-hero.js';

const read = file => readFileSync(new URL('../public/' + file, import.meta.url), 'utf8');
const css = read('home-polish-v11.css');
const finish = css.slice(css.indexOf('/* Observatory v14'));
const index = read('index.html');

test('v14 corrects the legacy hero CTA text sizing in all three languages', () => {
  assert.ok(finish.startsWith('/* Observatory v14'));
  assert.match(finish, /\.rs-first-order-link > span:only-child\s*\{[^}]*font-size:inherit!important/s);
  assert.doesNotMatch(finish, /\.rs-first-order-link::after/);
  for (const [lang, i, label] of [['fi', 0, 'Paketit alk. 49 €/kk'], ['sv', 1, 'Paket från 49 €/mån'], ['en', 2, 'Plans from €49/month']]) {
    const hero = spiralHeroMarkup((...texts) => texts[i], lang);
    assert.equal((hero.match(/class="rs-first-order-link"/g) || []).length, 1);
    assert.match(hero, /href="#pricing"/);
    assert.ok(hero.includes(label));
    assert.match(hero, /class="rs-first-order-link"[^>]*>\s*<span>[^<]+<\/span>\s*<\/a>/);
  }
});

test('v14 improves mobile chapter and pricing readability without layout churn', () => {
  assert.match(finish, /rs-spiral-card-kicker/);
  assert.match(finish, /respondo-how-steps p/);
  assert.match(finish, /pricing-select-btn:hover/);
  assert.match(finish, /@media\(max-width:600px\)/);
  assert.match(finish, /@media\(max-width:360px\)/);
  assert.match(finish, /@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(finish, /@keyframes|scroll-snap-type|position:fixed|scrollTo\(|preventDefault\(/);
  assert.equal(css.split('{').length, css.split('}').length);
});

test('v14 stylesheet version reaches iOS Safari after existing v13 finishing CSS', () => {
  assert.match(index, /home-polish-v11\.css\?v=20261027-spacing-clarity-v11-legibility-v12-microtype-v14/);
  assert.match(index, /home-finish-v13\.css\?v=20261028-home-finish-v13/);
  assert.match(index, /spiral-hero-motion\.js/);
  const app = read('app.js');
  for (const price of ["card('Advanced',49", "card('Premium',129", "card('Enterprise',149"]) {
    assert.ok(app.includes(price));
  }
});
