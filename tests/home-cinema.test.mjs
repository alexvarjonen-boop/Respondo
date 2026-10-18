import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { pathToFileURL } from 'node:url';

const dir=path.resolve(import.meta.dirname,'..','public');
const read=name=>fs.readFileSync(path.join(dir,name),'utf8');

test('cinematic script parses and leaves scroll, links and forms untouched',()=>{
  const source=read('home-cinema.js');
  assert.doesNotThrow(()=>new vm.Script(source));
  assert.match(source,/prefers-reduced-motion: reduce/);
  assert.match(source,/saveData/);
  assert.match(source,/requestAnimationFrame/);
  assert.match(source,/\.rg-growth-section/);
  assert.match(source,/\.pricing-section/);
  assert.doesNotMatch(source,/\bscrollTo\s*\(|scrollIntoView\s*\(|scroll-snap|preventDefault\s*\(|document\.body\.style\.overflow/);
});

test('all six homepage chapters remain in logical order',async()=>{
  const {appleHomeMarkup}=await import(pathToFileURL(path.join(dir,'apple-home.js')).href);
  const pricing='<section class="pricing-section" id="pricing"><a href="/tilaus?plan=basic_monthly">Plan</a></section>';
  for(const lang of ['fi','sv','en']){
    const translate=(fi,sv,en)=>({fi,sv,en})[lang];
    const html=appleHomeMarkup(translate,lang,100,pricing);
    const markers=['class="apple-hero"','class="apple-highlights"','class="apple-lead-calculator"','class="rg-growth-section"','class="pricing-section"','class="apple-bottom-cta"'];
    const indices=markers.map(marker=>html.indexOf(marker));
    assert.ok(indices.every(v=>v>=0),lang+': one or more scenes missing');
    assert.deepEqual(indices,[...indices].sort((a,b)=>a-b),lang+': scenes out of sequence');
    assert.match(html,/Havainnollistava|Illustrativ|Illustrative/);
    assert.match(html,/href="\/tilaus\?plan=basic_monthly"/);
    assert.match(html,/name="|aria-label=/);
  }
});

test('cinema assets load after existing homepage motion styles and scripts',()=>{
  const index=read('index.html');
  assert.ok(index.indexOf('/home-cinema.css')>index.indexOf('/dark-growth-20261018.css'));
  assert.ok(index.indexOf('/home-cinema.css')>index.indexOf('/original-theme-motion.css'));
  assert.ok(index.indexOf('/home-cinema.js')>index.indexOf('/original-theme-motion.js'));
  assert.ok(index.indexOf('/home-cinema.js')>index.indexOf('/cinematic-navigation.js'));
  assert.equal((index.match(/home-cinema\.css/g)||[]).length,1);
  assert.equal((index.match(/home-cinema\.js/g)||[]).length,1);
});

test('cinematic styles preserve functional controls and motion preferences',()=>{
  const css=read('home-cinema.css');
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(css,/pointer-events:none/);
  assert.match(css,/\.apple-lead-slider::-webkit-slider-runnable-track/);
  assert.match(css,/\.pricing-section \.price-card/);
  assert.match(css,/\.rg-line/);
  assert.ok(css.includes('.rf-film-hud'));
  assert.doesNotMatch(css,/scroll-snap-type|overflow:hidden!important\s*;\s*height:100vh|position:sticky!important/);
});
