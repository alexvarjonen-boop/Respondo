import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spiralHeroMarkup} from '../public/spiral-hero.js';

const read=name=>readFileSync(new URL('../public/'+name,import.meta.url),'utf8');
test('homepage v13 uses the localized bot demo link and preserves the ten-feature story',()=>{
 const html=spiralHeroMarkup((fi,sv,en)=>en,'en');
 assert.equal((html.match(/class="rs-first-order-link"/g)||[]).length,1);
 assert.match(html,/class="rs-first-order-link" href="\/assistant\?lang=en"/);
 assert.equal((html.match(/data-rs-card\b/g)||[]).length,10);
 assert.equal((html.match(/data-rs-icon(?=\s)/g)||[]).length,10);
 assert.doesNotMatch(html,/Ask Respondo|rs-hero-demo-link/);
});
test('v13 premium finishing styles are homepage-scoped, mobile-aware and motion-safe',()=>{
 const css=read('home-finish-v13.css');
 assert.match(css,/#app \.apple-home-page \.rs-spiral-heading \.rs-first-order-link/);
 assert.match(css,/\.rs-spiral-card-kicker i/);
 assert.match(css,/\.rs-studio-orbit-icon\[data-rs-icon\]\.is-active/);
 assert.match(css,/@media\(max-width:600px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.doesNotMatch(css,/@keyframes|scroll-snap|position:fixed|preventDefault|setInterval|backdrop-filter/);
 assert.equal((css.match(/{/g)||[]).length,(css.match(/}/g)||[]).length);
});
test('v13 stylesheet has a new Safari-safe cache key after v12',()=>{
 const index=read('index.html');
 assert.match(index,/home-polish-v11\.css\?v=20261027-spacing-clarity-v11-legibility-v12/);
 assert.match(index,/home-finish-v13\.css\?v=20261028-[^\/\"]+/);
 assert.ok(index.indexOf('/home-polish-v11.css')<index.indexOf('/home-finish-v13.css'));
});
