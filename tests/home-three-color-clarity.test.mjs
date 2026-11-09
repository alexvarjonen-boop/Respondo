import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = file => readFileSync(new URL('../public/'+file,import.meta.url),'utf8');
const css=read('home-clarity-theme.css');
const html=read('index.html');
const app=read('app.js');
const hero=read('spiral-hero.js');

test('homepage has exactly two main brand colors and one visible CTA accent',()=>{
  for(const declaration of [
    '--rh-bg:#0B0D12','--rh-light:#F5F7FA','--rh-accent:#7C8CFF'
  ])assert.ok(css.includes(declaration),'missing '+declaration);
  const hex=[...new Set(css.match(/#[0-9a-fA-F]{6}\b/g)?.map(v=>v.toUpperCase()))].sort();
  assert.deepEqual(hex,['#0B0D12','#7C8CFF','#F5F7FA']);
  assert.ok(!css.includes(':root{'),'must not rebrand admin, checkout or legal pages');
  assert.match(css,/#app \.apple-home-page/);
  assert.ok(!/#app \.dashboard/.test(css));
});

test('last stylesheet wins over the old layered blue hero without changing its markup',()=>{
  const experienceLink='/respondo-experience.css?v=20261109-clean-minimal-v2';
  const clarityLink='/home-clarity-theme.css?v=20261109-graphite-white-violet-v1';
  assert.ok(html.indexOf(experienceLink)>0);
  assert.ok(html.indexOf(clarityLink)>html.indexOf(experienceLink));
  assert.ok(html.indexOf(clarityLink)<html.indexOf('</head>'));
  assert.equal(html.match(/home-clarity-theme\.css/g)?.length,1);
  assert.match(html,/<meta name="theme-color" content="#0B0D12">/);
  for(const old of [
    '.rs-space-glow','.rs-studio-haze','.rs-studio-sweep',
    '.rs-kinetic-light','.rs-axis-halo','.rs-studio-grid',
    '.rs-spiral-stage::before','.rs-spiral-stage::after'
  ])assert.ok(css.includes(old),'not disabled: '+old);
  assert.match(css,/\.rs-spiral-heading h1 span\{/);
  assert.match(css,/-webkit-text-fill-color:var\(--rh-light\)!important/);
  assert.match(css,/text-shadow:none!important/);
  assert.match(css,/filter:none!important/);
  assert.match(css,/\.rs-first-order-link:hover\{/);
  assert.match(css,/\.rs-first-order-link:focus-visible\{/);
  assert.match(hero,/href="\/assistant\?lang=\$\{lang\}"/);
  assert.match(hero,/rs-spiral-section/);
});

test('navigation logo and visible header CTA follow the same theme',()=>{
  assert.match(css,/body\.public-nav-active #app \.apple-home-page \.nav/);
  assert.match(css,/\.nav \.apple-menu-toggle span/);
  assert.match(css,/\.nav \.app-language-switch/);
  assert.match(css,/\.nav \.navactions a\.btn\.ink/);
  assert.match(css,/\.apple-menu-overlay/);
  assert.match(css,/\.apple-menu-cta/);
  assert.match(css,/\.nav \.navactions a\.btn\.ink[\s\S]*?background:var\(--rh-accent\)!important/);
});

test('calculator, features, pricing and footer have consistent high-contrast surfaces',()=>{
  for(const selector of [
    '.value-calculator','.apple-lead-calculator','.calculator-shell',
    '.pricing-section','.pricing-choice-card','.price-card.featured',
    '.pricing-billing-switch','.pricing-period-option.is-active',
    '.pricing-select-btn','.respondo-how-it-works',
    '.respondo-search-overview','.footer','.legalbar'
  ]){
    // pricing-choice-card remains in live app markup; price-card is styled directly.
    assert.ok((css+app).includes(selector),'missing '+selector);
  }
  assert.match(css,/\.price-card\.featured[\s\S]*?border-color:rgba\(245,247,250,\.45\)!important/);
  assert.match(css,/\.pricing-select-btn[\s\S]*?background:var\(--rh-accent\)!important/);
  assert.match(css,/\.pricing-period-option\.is-active[\s\S]*?background:var\(--rh-light\)!important/);
});

test('prices, checkout routes and billing-period behavior remain unchanged',()=>{
  assert.match(app,/card\('Advanced',49,2,/);
  assert.match(app,/card\('Premium',129,10,/);
  assert.match(app,/card\('Enterprise',149,20,/);
  assert.match(app,/const yearlyMonthly=monthly-10/);
  assert.match(app,/function bindPricingPeriodSwitch\(\)/);
  assert.match(app,/section\.querySelectorAll\('\.pricing-choice-card'\)/);
  assert.match(app,/const params = new URLSearchParams\(\{plan:card\.dataset\.planCode/);
  assert.match(app,/return '<div class="home-page apple-home-page"/);
  assert.doesNotMatch(css,/pointer-events:none!important;[\s\S]*\.pricing-select-btn/);
});

test('small screens and reduced-motion styles preserve controls and readability',()=>{
  assert.match(css,/@media\(max-width:680px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/\.rs-first-order-link:focus-visible/);
  assert.match(css,/\.pricing-select-btn[\s\S]*?:focus-visible/);
  assert.match(css,/\.apple-lead-slider:focus-visible/);
  assert.doesNotMatch(css,/\.rs-spiral-section\{display:none/);
});
