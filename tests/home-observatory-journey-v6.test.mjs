import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spiralHeroMarkup} from '../public/spiral-hero.js';

const read=path=>readFileSync(new URL('../public/'+path,import.meta.url),'utf8');
for(const [lang,idx] of [['fi',0],['sv',1],['en',2]]){
  test('localized chapter readout matches existing orbit chapters in '+lang,()=>{
    const h=spiralHeroMarkup((...v)=>v[idx],lang);
    assert.equal((h.match(/data-rs-card\b/g)||[]).length,10);
    assert.equal((h.match(/data-rs-icon(?=\s)/g)||[]).length,10);
    assert.equal((h.match(/class="rs-orbit-progress"/g)||[]).length,1);
    assert.match(h,/pathLength="100"/);
    assert.match(h,/data-rs-orbit-index>01 \/ 10/);
    assert.match(h,/data-rs-orbit-title>/);
    const match=h.match(/<h2>([^<]+)<\/h2>/);
    assert.ok(match);
    assert.ok(h.includes('data-rs-orbit-title>'+match[1]+'</span>'));
    assert.doesNotMatch(h,/rs-hero-talk|data-open-site-assistant|Ask Respondo/);
  });
}
test('scroll updates orbit progress and label only on frame and chapter changes',()=>{
  const m=read('spiral-hero-motion.js');
  assert.match(m,/orbitTitle\.textContent = cards\[index\]\.querySelector\('h2'\)/);
  assert.match(m,/--rs-orbit-fill', \(normalized \* 100\)\.toFixed\(2\)/);
  assert.match(m,/--rs-orbit-fill','--rs-light-shift'/);
  assert.match(m,/requestAnimationFrame\(draw\)/);
  assert.doesNotMatch(m,/setInterval\(/);
});
test('premium journey dial is scoped, responsive, cached and reduced-motion safe',()=>{
  const css=read('home-observatory.css'),html=read('index.html');
  assert.match(css,/Observatory v6/);
  assert.match(css,/\.rs-orbit-progress circle/);
  assert.match(css,/@media\(min-width:1100px\) and \(min-height:781px\)/);
  assert.match(css,/@media\(max-width:600px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(css,/@keyframes|animation:\s*[^n]/);
  assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
  assert.match(html,/home-observatory\.css\?v=[^"]*-journey-v6/);
  assert.match(html,/spiral-hero-motion\.js\?v=[^"]*-journey-v6/);
  assert.match(html,/app\.js\?v=[^"]*-journey-v6/);
});
