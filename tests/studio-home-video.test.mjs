import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spiralHeroMarkup} from '../public/spiral-hero.js';
import {appleHomeMarkup} from '../public/apple-home.js';

const file=name=>readFileSync(new URL('../public/'+name,import.meta.url),'utf8');
const css=file('studio-home.css');
const index=file('index.html');

for(const [lang,n] of [['fi',0],['sv',1],['en',2]]){
  test('emerald studio homepage retains functioning translated feature story and pricing for '+lang,()=>{
    const t=(...languages)=>languages[n];
    const home=appleHomeMarkup(t,lang,145,'<section class="pricing-section">LIVE PRICING</section>');
    const hero=spiralHeroMarkup(t,lang);
    assert.equal((hero.match(/data-rs-card\b/g)||[]).length,10);
    assert.equal((hero.match(/class="rs-studio-orbit-icon/g)||[]).length,10);
    assert.equal((hero.match(/class="rs-studio-card-art/g)||[]).length,10,'one decorative art per feature chapter');
    assert.match(hero,/rs-studio-grid/);
    assert.match(hero,/rs-studio-haze/);
    assert.match(hero,/rs-studio-orbit-label/);
    assert.ok(home.indexOf('rs-spiral-section')<home.indexOf('LIVE PRICING'));
    assert.doesNotMatch(hero,/<canvas|<iframe|data-respondo-ask-form|data-respondo-hero-cta/);
    assert.match(home, /rs-spiral-section/);
  });
}

test('emerald visuals layer after existing public brand and preserve native scroll fallback',()=>{
  assert.ok(index.indexOf('/studio-home.css')>index.indexOf('/respondo-unified-brand.css'));
  assert.match(css,/\.apple-home-page \.rs-spiral-section/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(css,/@media\(max-width:600px\)/);
  assert.match(css,/\.pricing-section \.pricing-period-option\.is-active/);
  assert.match(css,/\.pricing-section \.pricing-select-btn/);
  assert.doesNotMatch(css,/scroll-snap-type|overflow-y:hidden!important|pointer-events:none!important;\s*}\s*#app \.apple-home-page \.pricing-section/);
});

test('reference aesthetic preserves official approved logo, real plans and first-party bot',()=>{
  const official=file('respondo-symbol.svg').match(/<path d="([^"]+)"/)?.[1];
  assert.ok(official);
  assert.match(file('spiral-hero.js'),/const arrow = '/);
  assert.ok(file('spiral-hero.js').includes(official));
  const app=file('app.js');
  assert.match(app,/appleHomeMarkup\(appText,currentLang\(\),FEATURE_COUNT,pricingSection\(\)\)/);
  assert.match(app,/card\('Advanced',49/);
  assert.match(app,/card\('Premium',129/);
  assert.match(app,/card\('Enterprise',149/);
  assert.match(index,/spiral-hero-motion\.js/);
  assert.match(index,/logo-reveal\.js/);
});
