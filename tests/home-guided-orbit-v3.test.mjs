import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spiralHeroMarkup} from '../public/spiral-hero.js';

const read = path => readFileSync(new URL('../public/'+path, import.meta.url), 'utf8');

for (const [lang,index,expected] of [
  ['fi',0,'SEURAAVAKSI'],['sv',1,'NÄSTA'],['en',2,'UP NEXT']
]) {
  test('Observatory v3 guides users to the next chapter in '+lang,()=>{
    const t=(...values)=>values[index];
    const markup=spiralHeroMarkup(t,lang);
    assert.equal((markup.match(/data-rs-card\b/g)||[]).length,10);
    assert.equal((markup.match(/data-rs-icon(?=\s)/g)||[]).length,10);
    assert.equal((markup.match(/data-rs-next-label=/g)||[]).length,10);
    assert.match(markup, /class="rs-orbit-beacon" aria-hidden="true"/);
    assert.match(markup, /data-rs-next/);
    assert.ok(markup.includes(expected));
    assert.ok(markup.includes('RESPONDO AI <span aria-hidden="true">/</span> 24/7'));
    assert.ok(markup.includes(t('HINNAT','PRISER','PRICING')));
    assert.doesNotMatch(markup,/rs-hero-talk|Ask Respondo|data-open-site-assistant/);
  });
}

test('feature cues remain synchronized to existing scroll chapter index',()=>{
  const motion=read('spiral-hero-motion.js');
  assert.match(motion,/nextCue\.textContent = cards\[index\]\.getAttribute\('data-rs-next-label'\)/);
  assert.match(motion,/icons\.forEach\(\(icon, i\) => icon\.classList\.toggle\('is-active', i === index\)/);
  assert.doesNotMatch(motion,/setInterval\(/);
});

test('home polish is cached afresh, homepage-scoped and motion-safe',()=>{
  const css=read('home-observatory.css'),html=read('index.html');
  assert.match(css,/Observatory v3/);
  assert.match(css,/#app \.apple-home-page \.rs-enhanced \.rs-orbit-beacon/);
  assert.match(css,/max-width:600px/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.doesNotMatch(css,/\.rs-spiral-section\[data-rs-mode="fullscreen"\]\.rs-enhanced \.rs-studio-orbit-art\{\s*filter:/);
  assert.doesNotMatch(css,/@keyframes|animation:\s*[^n]/);
  assert.match(html,/home-observatory\.css\?v=20261027-observatory-polish-v2-guided-orbit-v3-perf/);
  assert.match(html,/spiral-hero-motion\.js\?v=20261026-orbit10-v1-observatory-v1-guided-orbit-v3/);
  assert.match(html,/app\.js\?v=[^"]+-guided-orbit-v3/);
  assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});
