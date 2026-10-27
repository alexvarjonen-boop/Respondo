import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spiralHeroMarkup} from '../public/spiral-hero.js';
const read=filename=>readFileSync(new URL('../public/'+filename,import.meta.url),'utf8');
for(const [lang,n] of [['fi',0],['sv',1],['en',2]]){
 test('growth chapter shows honest business utility, not fabricated conversion lifts '+lang,()=>{
  const h=spiralHeroMarkup((...translations)=>translations[n],lang);
  assert.doesNotMatch(h,/\+52\s*%|Illustrative 6-month scenario|6 kk:n skenaario/);
  assert.equal((h.match(/data-rs-card\b/g)||[]).length,10);
  assert.equal((h.match(/data-rs-icon(?=\s)/g)||[]).length,10);
  const part=h.match(/data-rs-card data-index="3"[\s\S]*?<h2>[^<]+<\/h2><p>[^<]+<\/p>/)?.[0];
  assert.ok(part);
  assert.match(part,/rs-has-svg-metric/);
 });
}
test('mobile typography and orbit have a clear reading lane after intro fades',()=>{
 const css=read('home-polish-v11.css');
 assert.match(css,/@media\(max-width:600px\)/);
 assert.match(css,/@media\(max-width:600px\) and \(max-height:710px\)/);
 assert.match(css,/rs-intro-past \.rs-studio-orbit-art/);
 assert.match(css,/top:38%!important/);
 assert.match(css,/top:41%!important/);
 assert.match(css,/padding-bottom:54px!important/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.doesNotMatch(css,/@keyframes|scroll-snap-type|position:fixed/);
 assert.equal(css.split('{').length,css.split('}').length);
});
test('homepage polish ships with fresh css and complete nested browser cache versions',()=>{
 const html=read('index.html'),app=read('app.js'),apple=read('apple-home.js');
 assert.match(html,/home-polish-v11\.css\?v=20261027-spacing-clarity-v11/);
 assert.match(html,/app\.js\?v=[^"]+-polish-v11/);
 assert.match(app,/apple-home\.js\?v=[^']+-polish-v11/);
 assert.match(apple,/spiral-hero\.js\?v=[^']+-polish-v11/);
});
