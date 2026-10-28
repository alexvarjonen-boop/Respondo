import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spiralHeroMarkup} from '../public/spiral-hero.js';
const read = name => readFileSync(new URL('../public/'+name, import.meta.url), 'utf8');
const app = read('app.js');
const css = read('home-finish-v13.css');
const index = read('index.html');
const pricing = app.slice(app.indexOf('function pricingSection()'),app.indexOf('function pricingSection()')+16000);
const v16 = css.slice(css.indexOf('/* Observatory v16:'));

test('v16 presents grounded, localized audience guidance instead of an invented popularity claim', () => {
  assert.ok(pricing.includes("tier==='Advanced'"));
  assert.ok(pricing.includes("tier==='Premium'"));
  assert.ok(pricing.includes('AI-asiakaspalvelun aloittamiseen.'));
  assert.ok(pricing.includes('För kundserviceteam som arbetar tillsammans.'));
  assert.ok(pricing.includes('For commerce and broader integrations.'));
  assert.match(pricing,/class="pricing-plan-fit">\$\{planFit\}<\/p>/);
  assert.ok(pricing.includes("appText('TIIMEILLE','FÖR TEAM','FOR TEAMS')"));
  assert.doesNotMatch(pricing,/SUOSITUIN|POPULÄRAST|MOST POPULAR/);
});

test('v16 preserves monthly and annual plan amounts, seats and checkout options', () => {
  for (const source of ["card('Advanced',49,2","card('Premium',129,10","card('Enterprise',149,20"]) {
    assert.ok(pricing.includes(source),source);
  }
  assert.match(pricing,/const yearlyMonthly=monthly-10/);
  assert.match(pricing,/const yearlyTotal=yearlyMonthly\*12/);
  assert.match(pricing,/\/tilaus\?plan=\$\{code\}_monthly/);
  assert.match(pricing,/data-yearly-note=/);
  assert.match(pricing,/data-billing-period="yearly"/);
  assert.match(pricing,/\/assistant\?lang=\$\{currentLang\(\)\}/);
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
