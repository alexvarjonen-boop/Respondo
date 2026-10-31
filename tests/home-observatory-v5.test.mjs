import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spiralHeroMarkup } from '../public/spiral-hero.js';

const read=path=>readFileSync(new URL('../public/'+path,import.meta.url),'utf8');
for(const [lang,index] of [['fi',0],['sv',1],['en',2]]){
  test('ten real illustrated features render in '+lang,()=>{
    const html=spiralHeroMarkup((...v)=>v[index],lang);
    assert.equal((html.match(/class="rs-scene-signature"/g)||[]).length,10);
    assert.equal((html.match(/class="rs-scene-glyph"/g)||[]).length,10);
    assert.equal((html.match(/data-rs-card\b/g)||[]).length,10);
    assert.equal((html.match(/data-rs-icon(?=\s)/g)||[]).length,10);
    assert.equal((html.match(/class="rs-kinetic-light"/g)||[]).length,1);
    assert.doesNotMatch(html,/rs-hero-talk|Ask Respondo|data-open-site-assistant/);
  });
}
test('scroll moves light on compositor properties, respects accessibility and does not trap scrolling',()=>{
  const js=read('spiral-hero-motion.js');
  assert.match(js,/--rs-light-shift/);
  assert.match(js,/--rs-light-scale/);
  assert.match(js,/--rs-light-strength/);
  assert.match(js,/prefers-reduced-motion: reduce/);
  assert.match(js,/saveData/);
  assert.doesNotMatch(js,/setInterval\(/);
});
test('v5 is scoped to the homepage, mobile aware and fresh in production cache',()=>{
  const css=read('home-observatory.css');
  const html=read('index.html');
  assert.match(css,/Observatory v5/);
  assert.match(css,/#app \.apple-home-page \.rs-kinetic-light/);
  assert.match(css,/\.rs-scene-signature/);
  assert.match(css,/@media\(max-width:600px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(css,/@keyframes|animation:\s*[^n]/);
  assert.equal((css.match(/{/g)||[]).length,(css.match(/}/g)||[]).length);
  assert.match(html,/home-observatory\.css\?v=[^"]*-optical-v5/);
  assert.match(html,/spiral-hero-motion\.js\?v=[^"]*-optical-v5/);
  assert.match(html,/app\.js\?v=[^"]*-optical-v5/);
});
test('production SEO smoke checks English default and explicit Finnish and Swedish',()=>{
 const smoke=readFileSync(new URL('../scripts/production-smoke.mjs',import.meta.url),'utf8');
 assert.match(smoke,/lang === 'en' \? '' : '\?lang=' \+ lang/);
 assert.match(smoke,/for \(const lang of \['fi', 'sv', 'en'\]\)/);
});
