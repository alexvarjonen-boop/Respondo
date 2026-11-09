import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../public/'+name,import.meta.url),'utf8');
const motion=read('spiral-hero-motion.js');
const css=read('home-clarity-theme.css');
const html=read('index.html');
const cards=read('spiral-hero.js');
const scrollStyles=read('spiral-hero.css');

test('opening viewport hides the 24/7 chapter but keeps hero and orbit visible',()=>{
  assert.match(cards,/\['24\/7', t\(/);
  assert.match(cards,/class="rs-spiral-heading"/);
  assert.match(cards,/rs-spiral-cards/);
  assert.match(css,/#app \.apple-home-page \.rs-spiral-section\[data-rs-mode="fullscreen"\]\.rs-enhanced:not\(\.rs-first-revealed\) \.rs-spiral-card:first-child\{/);
  assert.match(css,/\.rs-spiral-card:first-child\{[\s\S]*?opacity:0!important;[\s\S]*?visibility:hidden!important;[\s\S]*?pointer-events:none!important;/);
  assert.match(css,/\.rs-enhanced\.rs-first-revealed \.rs-spiral-heading\{[\s\S]*?opacity:0!important;[\s\S]*?visibility:hidden!important/);
  assert.doesNotMatch(css,/\.rs-spiral-section.*\.rs-studio-orbit-art\{display:none/);
});

test('first downward wheel gesture reveals 24/7 instead of skipping to chapter two',()=>{
  const reveal=motion.indexOf("if (direction > 0 && index === 0 && !section.classList.contains('rs-first-revealed'))");
  const glide=motion.indexOf('glideTo(Math.round(target));',reveal);
  assert.ok(reveal>0 && glide>reveal);
  assert.match(motion.slice(reveal,glide),/section\.classList\.add\('rs-first-revealed'\);[\s\S]*?firstChapterManuallyRevealed = true;[\s\S]*?schedule\(\);[\s\S]*?return;/);
  assert.match(motion,/if \(direction < 0 && index === 0 && position < \.08\) \{/);
  assert.match(motion,/section\.classList\.remove\('rs-first-revealed'\);\s*firstChapterManuallyRevealed = false;/);
  assert.match(motion,/section\.classList\.toggle\('rs-first-revealed', index === 0\);/);
});

test('native mobile, scrollbar and keyboard scrolling reveal first chapter after actual movement',()=>{
  assert.match(motion,/const firstScrollThreshold = Math\.min\(viewport \* \.10, 72\);/);
  assert.match(motion,/if \(mobile\) \{\s*section\.classList\.toggle\('rs-first-revealed', -rect\.top >= firstScrollThreshold\);/);
  assert.match(motion,/else if \(-rect\.top >= firstScrollThreshold\) \{/);
  assert.match(motion,/else if \(rect\.top >= -1 && !firstChapterManuallyRevealed\) \{/);
  assert.match(motion,/if \(closestIndex === 0 && !section\.classList\.contains\('rs-first-revealed'\)\) \{\s*cards\[0\]\.setAttribute\('aria-hidden', 'true'\);/);
  assert.match(motion,/addEventListener\('scroll', schedule, \{ passive:true \}\)/);
  assert.match(motion,/coarse\.matches \|\| innerWidth < 760/);
});

test('only chapter one is hidden initially; normal/static, reduced-motion and 10-step progression remain',()=>{
  assert.match(css,/\.rs-spiral-card:first-child/);
  assert.doesNotMatch(css,/\.rs-spiral-card:nth-child\(2\)/);
  assert.match(motion,/const position = normalized \* \(cards\.length - 1\);/);
  assert.match(motion,/const next = clamp\(index \+ direction, 0, cards\.length - 1\);/);
  assert.match(motion,/safeStaticMode\(\)/);
  assert.match(scrollStyles,/\.rs-spiral-card\.rs-in-scene/);
  assert.match(cards,/data-rs-card data-index="\$\{i\}"/);
  assert.match(cards,/rs-studio-orbit-icon/);
});

test('versioned CSS and JS arrive before page bootstrap, without touching unrelated pages',()=>{
  assert.match(html,/home-clarity-theme\.css\?v=20261109-graphite-white-violet-v1-first-scroll-247-v2/);
  assert.match(html,/spiral-hero-motion\.js\?v=[^"]*first-scroll-247-v3/);
  assert.ok(html.indexOf('/home-clarity-theme.css')<html.indexOf('</head>'));
  assert.match(motion,/if \(location\.pathname !== '\/'\) return;/);
  assert.match(css,/#app \.apple-home-page/);
  assert.match(css,/\.rs-enhanced:not\(\.rs-first-revealed\)/);
});
