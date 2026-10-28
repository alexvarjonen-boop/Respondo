import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spiralHeroMarkup} from '../public/spiral-hero.js';
const read = file => readFileSync(new URL('../public/' + file, import.meta.url), 'utf8');
const css=read('home-finish-v13.css');
const v17=css.slice(css.indexOf('/* Observatory v17'));
const index=read('index.html');
const app=read('app.js');
const home=read('apple-home.js');

test('homepage describes concrete website-grounded AI answers and enquiries in FI/SV/EN',()=>{
  const copy=[
    ['fi','Respondo vastaa asiakkaidesi kysymyksiin yrityksesi tiedoilla 24/7 ja ottaa yhteydenotot talteen.'],
    ['sv','Respondo svarar på kundfrågor med företagets information dygnet runt och tar emot förfrågningar.'],
    ['en','Respondo answers questions using your business information, 24/7, and captures customer enquiries.']
  ];
  for(const [lang,phrase] of copy){
    const i=['fi','sv','en'].indexOf(lang);
    const markup=spiralHeroMarkup((...xs)=>xs[i],lang);
    assert.ok(markup.includes(phrase),lang);
    assert.equal((markup.match(/class="rs-first-order-link"/g)||[]).length,1);
    assert.equal((markup.match(/data-rs-card\b/g)||[]).length,10);
    assert.equal((markup.match(/data-rs-icon(?=\s)/g)||[]).length,10);
    assert.doesNotMatch(markup,/rs-hero-demo-link|Ask Respondo/);
  }
});
test('v17 makes first-frame native-scroll direction visible, then returns to next-chapter guidance',()=>{
  assert.ok(v17.startsWith('/* Observatory v17'));
  assert.match(v17,/\.rs-enhanced:not\(\.rs-intro-past\)[\s\S]*?\.rs-scroll-static\s*\{[\s\S]*?display:inline!important/);
  assert.match(v17,/\.rs-enhanced:not\(\.rs-intro-past\)[\s\S]*?\.rs-next-caption\s*\{[\s\S]*?display:none!important/);
  assert.match(v17,/\.rs-enhanced:not\(\.rs-intro-past\)[\s\S]*?\.rs-scroll-invite\s*\{[\s\S]*?display:inline-flex!important/);
  const motion=read('spiral-hero-motion.js');
  assert.match(motion,/section\.classList\.toggle\('rs-intro-past', index > 0\)/);
  assert.doesNotMatch(v17,/scrollTo\(|preventDefault\(|scroll-snap-type|@keyframes|position:fixed/);
});
test('v17 product demo remains reachable in both legacy and simplified pricing layouts',()=>{
  assert.match(v17,/\.pricing-section \.respondo-how-try/);
  assert.match(v17,/min-height:48px/);
  assert.match(v17,/\.respondo-how-try:focus-visible/);
  assert.match(v17,/@media\(max-width:600px\)/);
  assert.match(v17,/@media\(max-width:600px\) and \(max-height:710px\)/);
  assert.match(v17,/@media\(prefers-reduced-motion:reduce\)/);
  assert.equal(css.split('{').length,css.split('}').length);
  assert.match(app,/href="\/assistant\?lang=\$\{currentLang\(\)\}"/);
  assert.match(app,/class="pricing-assist-links"/);
  assert.match(app,/\/yhteystiedot\?lang=\$\{currentLang\(\)\}&amp;intent=demo/);
  for(const price of ["card('Advanced',49","card('Premium',129","card('Enterprise',149"])assert.ok(app.includes(price));
});
test('v17 asset cache keys reach Safari through both ES-module imports and stylesheet',()=>{
  assert.match(index,/home-finish-v13\.css\?v=[^"]*-hero-clarity-v17/);
  assert.match(index,/app\.js\?v=[^"]*-hero-clarity-v17/);
  assert.match(app,/apple-home\.js\?v=[^']*-hero-clarity-v17/);
  assert.match(home,/spiral-hero\.js\?v=[^']*-hero-clarity-v17/);
});
