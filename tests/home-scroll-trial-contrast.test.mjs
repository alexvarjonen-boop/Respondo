import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const homeCss=readFileSync(new URL('../public/apple-home.css',import.meta.url),'utf8');
const iosCss=readFileSync(new URL('../public/ios-public.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');

test('homepage header has only brand and language switch, without hidden trial controls',()=>{
  const nav=app.slice(app.indexOf('function nav()'),app.indexOf('function bindHomeHeroActions()'));
  assert.match(nav,/\$\{logo\(\)\}/);
  assert.match(nav,/\$\{languageSwitch\(\)\}/);
  assert.doesNotMatch(nav,/nav-home-scroll-trial|apple-menu-toggle|apple-nav-overlay/);
  assert.doesNotMatch(app,/bindHomeScrollTrial\(\)/);
  assert.doesNotMatch(app,/bindPublicMenu\(\)/);
  assert.match(html,/app\.js\?v=[^"]*scroll-trial-v1/);
});
test('only the demo is accessible from the spiral hero',()=>{
  const spiral=readFileSync(new URL('../public/spiral-hero.js',import.meta.url),'utf8');
  assert.doesNotMatch(spiral,/data-respondo-hero-cta="signup"/);
  assert.match(spiral,/data-respondo-hero-cta="demo"/);
  assert.match(app,/bindHomeHeroActions\(\)/);
});
test('light signup and login color styles override old dark-theme variants',()=>{
  assert.match(iosCss,/#app \.formpage :is\(\.checkout-copy,\.login-copy\) h1\{/);
  assert.match(iosCss,/#app \.formpage \.checkout-steps small,/);
  assert.match(iosCss,/color:#1d1d1f!important/);
  assert.match(iosCss,/color:#4b5563!important/);
  assert.match(html,/ios-public\.css\?v=[^"]*checkout-contrast-v1/);
});
