import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = (file) => readFileSync(new URL('../public/'+file,import.meta.url),'utf8');
const css = read('public-observatory.css');
const index = read('index.html');
const app = read('app.js');
const home = read('home-observatory.css');
const content = css.replace(/\/\*[\s\S]*?\*\//g,'');

test('new public Observatory theme loads last and leaves homepage-specific stylesheet intact',()=>{
  const old = index.indexOf('/home-observatory.css?v=20261027-observatory-polish-v2');
  const modern = index.indexOf('/public-observatory.css?v=20261027-all-public-v1');
  assert.ok(old>=0 && modern>old, 'new CSS must follow legacy public and home styles');
  assert.match(index,/respondo-unified-brand\.css/);
  assert.match(index,/brand-inner-pages\.css/);
  assert.match(index,/logo-reveal\.js/);
  assert.match(index,/spiral-hero-motion\.js/);
  assert.match(home,/Observatory v2/);
  assert.doesNotMatch(css,/\.apple-home-page|\.rs-studio-orbit|\.rs-hero-talk/);
});

test('all public navigation, feature, pricing, contact, content and legal routes receive styling',()=>{
  for(const selector of [
    '.pricing-page','.features-page','.contact-page','.seo-landing-page',
    '.global-guide-page','.audience-hub','.ai-topic-page','.vertical-landing',
    '.legalpage','.r-brand-legal','.r-brand-legal-toc',
    '.formpage.login-page','.formpage.signup-page',
    '.pricing-billing-switch','.pricing-period-option','.pricing-select-btn',
    '.feature-category','.home-contact-form','.r-brand-contact-banner',
    '.customer-bot-faq','.ai-topic-faq','.global-guide-card','.notfound'
  ])assert.ok(css.includes(selector),'not styled: '+selector);
  for(const route of [
    '/hinnat','/ominaisuudet','/yhteystiedot','/kenelle-sopii',
    '/tietosuoja','/kayttoehdot','/evasteet','/dpa','/tietoturva',
    '/kirjaudu','/tilaus'
  ])assert.ok(app.includes(route),'route removed: '+route);
});

test('no plan, translations, legal body text, checkout behavior or bot state changes',()=>{
  const price = app.slice(app.indexOf('function pricingSection()'),app.indexOf('function featuresPage()'));
  assert.match(price,/card\('Advanced',49/);
  assert.match(price,/card\('Premium',129/);
  assert.match(price,/card\('Enterprise',149/);
  assert.match(price,/pricing-billing-switch/);
  assert.match(price,/href="\/tilaus\?plan=\$\{code\}_monthly/);
  assert.match(app,/function legal\(type\)/);
  assert.match(app,/LEGAL_20261008\[type\]/);
  assert.match(app,/function contactPage\(\)/);
  assert.match(app,/id="homeContactForm"/);
  assert.match(app,/function signup\(\)/);
  assert.match(app,/function login\(\)/);
  assert.doesNotMatch(content,/\.dashboard-page|\.appshell|\.workspace-page|#respondo-site-chat|\.fx-assistant/);
  assert.doesNotMatch(css,/@keyframes|animation\s*:/);
});

test('high contrast, small screens, keyboard users and reduced motion remain supported',()=>{
  assert.match(css,/--ro-text:#f6f9ff/);
  assert.match(css,/--ro-night:#050711/);
  assert.match(css,/--ro-blue:#aacdff/);
  assert.match(css,/\.legalcopy :is\(p,ul,ol,li\)/);
  assert.match(css,/:focus-visible/);
  assert.match(css,/@media\(max-width:800px\)/);
  assert.match(css,/@media\(max-width:600px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(content,/#[a-fA-F\d]*?(?:72f5bd|a4ffdb|8af7bc|19c77b)/i);
  assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length,'CSS braces unbalanced');
});
