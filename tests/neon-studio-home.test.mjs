import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spiralHeroMarkup} from '../public/spiral-hero.js';
import {appleHomeMarkup} from '../public/apple-home.js';

const read = name => readFileSync(new URL('../public/' + name,import.meta.url),'utf8');

for (const lang of ['fi','sv','en']) {
  test('reference-style homepage remains accessible and complete in ' + lang,()=>{
    const t=(fi,sv,en)=>({fi,sv,en})[lang];
    const hero=spiralHeroMarkup(t,lang);
    const page=appleHomeMarkup(t,lang,100,'<section class="pricing-section" id="pricing">Real plans</section>');
    assert.equal((hero.match(/data-rs-card\b/g)||[]).length,7);
    assert.equal((hero.match(/class="rs-studio-orbit-icon\b/g)||[]).length,8);
    assert.equal((hero.match(/class="rs-studio-card-art\b/g)||[]).length,7);
    assert.equal((hero.match(/<svg width="28" height="20"/g)||[]).length,3);
    assert.match(hero,/class="rs-studio-grid"/);
    assert.match(hero,/class="rs-studio-orbit-art"/);
    assert.match(hero,/rs-spiral-section/);
    assert.match(hero,/data-rs-announcement/);
    assert.ok(hero.includes(t('Kysy Respondolta hinnat','Fråga Respondo om priser','Ask Respondo about pricing')));
    assert.ok(page.indexOf('rs-spiral-section')<page.indexOf('Real plans'));
    assert.ok(page.indexOf('Real plans')<page.indexOf('respondo-search-overview'));
    assert.doesNotMatch(page,/<canvas|<iframe|<script/i);
    assert.doesNotMatch(page,/Yodixa|Xezcreative/i);
  });
}

test('neon style is scoped to the marketing homepage and not the dashboard',()=>{
  const css=read('studio-home.css');
  const index=read('index.html');
  const app=read('app.js');
  const apple=read('apple-home.js');
  assert.match(css,/#app \.apple-home-page/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(css,/\.rs-studio-orbit-art/);
  assert.match(css,/\.pricing-section/);
  assert.doesNotMatch(css,/#app \.dashboard-page|\.workspace-page/);
  assert.match(index,/studio-home\.css\?v=20261026-emerald-motion-v2/);
  assert.match(index,/app\.js\?v=[^"]+-emerald-reference-20261026/);
  assert.match(app,/apple-home\.js\?v=20261021-organic-discovery-v1-studio-green-20261026/);
  assert.match(apple,/spiral-hero\.js\?v=20261021-fullscreen-chapters-v1-studio-green-20261026/);
});

test('real pricing checkout and first-party assistant remain unchanged',()=>{
 const app=read('app.js');
 const js=read('spiral-hero-motion.js');
 assert.match(app,/appleHomeMarkup\(appText,currentLang\(\),FEATURE_COUNT,pricingSection\(\)\)/);
 assert.match(app,/function bindPricingPeriodSwitch/);
 assert.match(app,/function pricingSection/);
 assert.match(app,/href="\/tilaus\?plan=\$\{code\}_monthly/);
 assert.match(js,/requestAnimationFrame\(draw\)/);
 assert.match(js,/prefers-reduced-motion: reduce/);
 assert.doesNotMatch(js,/scrollTo\(|preventDefault\(|setInterval\(/);
});
