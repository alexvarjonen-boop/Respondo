import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../public/'+path,import.meta.url),'utf8');
const css=read('public-observatory.css');
const html=read('index.html');
const app=read('app.js');
const homeTheme=read('home-observatory.css');

test('Observatory skin is included after the existing public and home CSS',()=>{
  assert.match(html,/public-observatory\.css\?v=20261027-minimal-public-v2/);
  assert.ok(html.indexOf('/public-observatory.css?')>html.indexOf('/home-observatory.css?'));
  assert.ok(html.indexOf('/public-observatory.css?')>html.indexOf('/respondo-unified-brand.css?'));
  assert.match(homeTheme,/Observatory v2/);
});

test('Every first-party public route family is styled, including localized privacy and terms',()=>{
  for(const selector of [
    '.pricing-page','.features-page','.contact-page','.seo-landing-page',
    '.global-guide-page','.audience-hub','.legalpage',
    '.r-brand-legal-toc','.r-brand-legal-copy','.formpage.login-page',
    '.formpage.signup-page','.notfound','.customer-bot-landing',
    '.ai-topic-body','.vertical-landing'
  ]) {
    assert.ok(css.includes(selector),'Missing family '+selector);
  }
  for(const route of [
    '/hinnat','/ominaisuudet','/features','/funktioner','/yhteystiedot',
    '/tietosuoja','/kayttoehdot','/evasteet','/dpa','/tietoturva',
    '/kirjaudu','/tilaus','/kenelle-sopii'
  ])assert.ok(app.includes(route),'Missing router path '+route);
});

test('Legal wording and UI functionality are untouched: visual-only CSS, readable dark policy chapters',()=>{
  assert.match(css,/#app \.legalpage \.legalcopy :is\(p,ul,ol,li\)/);
  assert.match(css,/#app \.legalpage \.legalcopy :is\(h2,h3\)/);
  assert.match(css,/#app \.legalpage \.r-brand-toc-links a/);
  assert.match(css,/color:var\(--ro-muted\)!important/);
  assert.match(css,/--ro-white:#f7faff/);
  assert.doesNotMatch(css,/\.appshell|\.dashboard-page|\.workspace-page|\.apple-home-page/);
  assert.doesNotMatch(css,/@keyframes|scrollTo\(|preventDefault\(/);
  assert.ok((css.match(/{/g)||[]).length===(css.match(/}/g)||[]).length);
});

test('Pricing, contact inputs, legal and mobile retain consistent accessible contrast',()=>{
  assert.match(css,/#app \.pricing-page \.pricing-billing-switch/);
  assert.match(css,/#app \.pricing-page \.pricing-select-btn/);
  assert.match(css,/#app \.contact-page \.home-contact-form :is\(input,textarea\)/);
  assert.match(css,/font-size:16px!important/);
  assert.match(css,/#app \.legalpage \.r-brand-legal-copy>\.r-brand-legal-section/);
  assert.match(css,/@media\(max-width:600px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(app,/card\('Advanced',49/);
  assert.match(app,/card\('Premium',129/);
  assert.match(app,/card\('Enterprise',149/);
});
