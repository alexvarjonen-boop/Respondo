import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spiralHeroMarkup} from '../public/spiral-hero.js';

const read=path=>readFileSync(new URL('../public/'+path,import.meta.url),'utf8');

for(const [lang,index] of [['fi',0],['sv',1],['en',2]]){
  test('each of ten scenes has a semantically matching engraved icon in '+lang,()=>{
    const markup=spiralHeroMarkup((...v)=>v[index],lang);
    assert.equal((markup.match(/class="rs-scene-glyph"/g)||[]).length,10);
    assert.equal((markup.match(/data-rs-icon(?=\s)/g)||[]).length,10);
    assert.equal((markup.match(/data-rs-card\b/g)||[]).length,10);
    assert.ok(markup.includes('stroke-linejoin="round"'));
    assert.doesNotMatch(markup,/rs-hero-talk|data-open-site-assistant|Ask Respondo/);
  });
}

test('scroll storytelling gives outgoing scenes real three-dimensional depth without timers',()=>{
  const motion=read('spiral-hero-motion.js');
  assert.match(motion,/Math\.min\(320, innerWidth \* \.22\)/);
  assert.match(motion,/--rs-panel-depth/);
  assert.match(motion,/--rs-panel-roll/);
  assert.match(motion,/Math\.pow\(focus, 1\.2\)/);
  assert.match(motion,/prefers-reduced-motion: reduce/);
  assert.match(motion,/saveData/);
  assert.doesNotMatch(motion,/preventDefault\(|scrollTo\(|setInterval\(/);
});

test('engravings remain home-only and mobile remains GPU-light',()=>{
  const css=read('home-observatory.css');
  const html=read('index.html');
  assert.match(css,/Observatory v4/);
  assert.match(css,/\.rs-scene-glyph/);
  assert.match(css,/--rs-panel-depth/);
  assert.match(css,/@media\(max-width:600px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(css,/@keyframes|animation:\s*[^n]/);
  assert.equal((css.match(/{/g)||[]).length,(css.match(/}/g)||[]).length);
  assert.match(html,/home-observatory\.css\?v=[^"]*-helix-v4/);
  assert.match(html,/spiral-hero-motion\.js\?v=[^"]*-helix-v4/);
  assert.match(html,/app\.js\?v=[^"]*-helix-v4/);
});
