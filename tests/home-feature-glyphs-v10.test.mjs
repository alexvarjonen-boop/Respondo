import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spiralHeroMarkup} from '../public/spiral-hero.js';
const read=(p)=>readFileSync(new URL('../public/'+p,import.meta.url),'utf8');
for(const [lang,i] of [['fi',0],['sv',1],['en',2]]){
 test('all symbolic chapter metrics reuse the exact same SVG glyph as their orbit icon '+lang,()=>{
  const hero=spiralHeroMarkup((...translations)=>translations[i],lang);
  const icon=(k)=>hero.match(new RegExp('<button type="button" class="rs-studio-orbit-icon[^"]*" data-rs-icon data-index="'+k+'"[^>]*><svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">([\\s\\S]*?)<\\/svg>'))?.[1];
  const card=(k)=>hero.match(new RegExp('<article class="rs-spiral-card[^"]*" role="listitem" data-rs-card data-index="'+k+'"[\\s\\S]*?<div class="rs-spiral-metric rs-has-svg-metric"><span class="rs-spiral-metric-glyph" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false" xmlns="http://www.w3.org/2000/svg">([\\s\\S]*?)<\\/svg>'))?.[1];
  for(const k of [3,4,5,6,8,9]){
    assert.ok(icon(k),lang+' icon '+k);
    assert.equal(card(k),icon(k),lang+' chapter '+k+' uses exact orbit glyph');
  }
  assert.doesNotMatch(hero,/class="rs-spiral-metric">(?:↙|↗|✦|◷)</);
  assert.equal((hero.match(/data-rs-card\b/g)||[]).length,10);
  assert.equal((hero.match(/data-rs-icon(?=\s)/g)||[]).length,10);
 });
}
test('hero preserves numeric, price-neutral facts and real language flags',()=>{
 const h=spiralHeroMarkup((fi,sv,en)=>en,'en');
 assert.match(h,/<div class="rs-spiral-metric">24\/7<\/div>/);
 assert.doesNotMatch(h,/\+52 %|Illustrative 6-month scenario|not a measured customer result/);
 assert.match(h,/class="rs-language-flags"/);
});
test('pricing keeps an accessible website-demo path without an extra fullscreen scene',()=>{
 const app=read('app.js'),css=read('home-refinements-v10.css'),html=read('index.html');
 assert.match(app,/class="section pricing-section"/);
 assert.match(app,/class="pricing-assist-links"/);
 assert.match(app,/href="\/assistant\?lang=\$\{currentLang\(\)\}"/);
 assert.match(app,/\/yhteystiedot\?lang=\$\{currentLang\(\)\}&amp;intent=demo/);
 // Older deployed builds had a three-step explainer; current simplified
 // pricing removes it. Both variants must preserve an actionable demo link.
 if(app.includes('class="respondo-how-it-works"')){
  assert.match(app,/respondo-how-steps/);
  assert.match(app,/Granska svaren/);
 }
 assert.match(css,/\.rs-has-svg-metric/);
 assert.match(css,/@media\(max-width:600px\)/);
 assert.match(css,/@media\(max-width:730px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.doesNotMatch(css,/@keyframes|scroll-snap-type/);
 assert.equal(css.split('{').length,css.split('}').length);
 assert.match(html,/home-refinements-v10\.css\?v=20261027-matching-feature-icons-how-it-works-v10/);
 assert.match(html,/app\.js\?v=[^"]+-icons-v10/);
 assert.match(read('app.js'),/apple-home\.js\?v=[^']+-icons-v10/);
 assert.match(read('apple-home.js'),/spiral-hero\.js\?v=[^']+-icons-v10/);
});
