import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const homeCss=readFileSync(new URL('../public/apple-home.css',import.meta.url),'utf8');
const iosCss=readFileSync(new URL('../public/ios-public.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');

test('home header has no login and only a conditionally visible trial CTA',()=>{
  assert.match(app,/const isHomePage = location\.pathname === '\/'/);
  assert.match(app,/isHomePage\s*\? `<a class="btn ink nav-home-scroll-trial"/);
  assert.match(app,/aria-hidden="true" tabindex="-1"/);
  assert.match(app,/if \(path === '\/'\) bindHomeScrollTrial\(\)/);
  assert.match(homeCss,/\.nav-home-scroll-trial\{display:none!important\}/);
  assert.match(homeCss,/\.nav-home-scroll-trial\.is-visible\{/);
  assert.match(homeCss,/@media\(max-width:800px\)[\s\S]*?\.nav-home-scroll-trial\.is-visible/);
  assert.match(html,/app\.js\?v=[^"]*scroll-trial-v1/);
});
test('hero crossing header threshold toggles sticky CTA and keyboard access',()=>{
  assert.match(app,/heroTrial\.getBoundingClientRect\(\)\.bottom/);
  assert.match(app,/heroBottom <= headerBottom/);
  assert.match(app,/stickyTrial\.classList\.toggle\('is-visible', show\)/);
  assert.match(app,/stickyTrial\.tabIndex = show \? 0 : -1/);
  assert.match(app,/addEventListener\('scroll', scheduleUpdate, \{ passive:true \}\)/);
});
test('light signup and login color styles override old dark-theme variants',()=>{
  assert.match(iosCss,/#app \.formpage :is\(\.checkout-copy,\.login-copy\) h1\{/);
  assert.match(iosCss,/#app \.formpage \.checkout-steps small,/);
  assert.match(iosCss,/color:#1d1d1f!important/);
  assert.match(iosCss,/color:#4b5563!important/);
  assert.match(html,/ios-public\.css\?v=[^"]*checkout-contrast-v1/);
});
