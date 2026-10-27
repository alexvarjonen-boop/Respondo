import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spiralHeroMarkup} from '../public/spiral-hero.js';
const read=file=>readFileSync(new URL('../public/'+file,import.meta.url),'utf8');
test('Respondo v12 mobile keeps a single usable hero CTA and a legible reading lane',()=>{
 const css=read('home-polish-v11.css');
 const v12=css.slice(css.indexOf('/* Observatory v12'));
 assert.ok(v12.startsWith('/* Observatory v12'));
 assert.match(v12,/@media\(max-width:600px\)/);
 assert.match(v12,/@media\(max-width:600px\) and \(max-height:710px\)/);
 assert.match(v12,/\.rs-hero-description\{[\s\S]*?font-size:13px!important/);
 assert.match(v12,/\.rs-spiral-heading \.rs-first-order-link\{[\s\S]*?min-height:44px/);
 assert.match(v12,/\.rs-spiral-card p\{[\s\S]*?font-size:13px!important/);
 assert.match(v12,/\.rs-spiral-metric\.rs-has-svg-metric\{[\s\S]*?border-radius:50%!important/);
 assert.doesNotMatch(v12,/@keyframes|scroll-snap-type|position:fixed|backdrop-filter/);
 assert.match(v12,/@media\(prefers-reduced-motion:reduce\)/);
 assert.equal(css.split('{').length,css.split('}').length);
});
test('readable pricing does not mutate prices or introduce more homepage sections',()=>{
 const app=read('app.js'),css=read('home-polish-v11.css');
 assert.match(css,/\.price-card:focus-within/);
 for(const part of ["card('Advanced',49","card('Premium',129","card('Enterprise',149"]){
   assert.ok(app.includes(part),part);
 }
 const home=spiralHeroMarkup((fi,sv,en)=>en,'en');
 assert.equal((home.match(/class="rs-first-order-link"/g)||[]).length,1);
 assert.doesNotMatch(home,/rs-hero-demo-link|rs-hero-actions|Ask Respondo/);
 assert.equal((home.match(/data-rs-card\b/g)||[]).length,10);
});
test('fresh stylesheet cache key is sent to iOS Safari',()=>{
 const html=read('index.html');
 assert.match(html,/home-polish-v11\.css\?v=20261027-spacing-clarity-v11-legibility-v12/);
});
