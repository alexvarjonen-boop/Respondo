import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spiralHeroMarkup} from '../public/spiral-hero.js';
const read = name => readFileSync(new URL('../public/'+name, import.meta.url), 'utf8');
const app = read('app.js');
const css = read('home-finish-v13.css');
const index = read('index.html');
const pricing = app.slice(app.indexOf('function pricingSection()'),app.indexOf('function bindPricingPeriodSwitch()'));
const v16 = css.slice(css.indexOf('/* Observatory v16:'));

test('single-plan pricing gives localized factual guidance without popularity claims',()=>{
  assert.match(pricing,/Yksi selkeä kuukausihinta/);
  assert.match(pricing,/Ett tydligt månadspris/);
  assert.match(pricing,/One clear monthly price/);
  assert.doesNotMatch(pricing,/SUOSITUIN|POPULÄRAST|MOST POPULAR/);
});

test('one advertised price and optional setup link to demo instead of legacy checkout',()=>{
  assert.match(pricing,/350 €/);assert.match(pricing,/200 €/);
  assert.match(pricing,/intent=demo/);assert.doesNotMatch(pricing,/\/tilaus|pricing-period-option/);
});

test('v16 remains scoped, accessible and compatible with existing ten-scene homepage', () => {
  assert.ok(v16.startsWith('/* Observatory v16:'));
  assert.match(v16,/\.pricing-plan-fit/);
  assert.match(v16,/\.pricing-assist-links a/);
  assert.match(v16,/min-height:44px/);
  assert.match(v16,/@media\(max-width:900px\)/);
  assert.match(v16,/@media\(max-width:600px\)/);
  assert.match(v16,/@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(v16,/position:fixed|scroll-snap-type|@keyframes|backdrop-filter/);
  assert.equal(css.split('{').length,css.split('}').length);
  for(const [lang,n] of [['fi',0],['sv',1],['en',2]]){
    const markup=spiralHeroMarkup((...v)=>v[n],lang);
    assert.equal((markup.match(/data-rs-card\b/g)||[]).length,10);
    assert.equal((markup.match(/data-rs-icon(?=\s)/g)||[]).length,10);
    assert.equal((markup.match(/class="rs-first-order-link"/g)||[]).length,1);
  }
  assert.match(index,/home-finish-v13\.css\?v=20261028-observatory-balance-v15-plan-choice-v16/);
});
