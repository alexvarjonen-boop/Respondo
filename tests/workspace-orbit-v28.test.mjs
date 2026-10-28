import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const workspace=await readFile(new URL('../public/workspace-continuation-v24.js',import.meta.url),'utf8');
const orbit=await readFile(new URL('../public/workspace-orbit-v28.js',import.meta.url),'utf8');
const css=await readFile(new URL('../public/workspace-orbit-v28.css',import.meta.url),'utf8');
const index=await readFile(new URL('../public/index.html',import.meta.url),'utf8');

test('post-setup screen renders the orbit below the real chat and scan status',()=>{
  assert.match(workspace,/import \{ createWorkspaceOrbit \} from '\.\/workspace-orbit-v28\.js\?v=20261028-after-chat-v29';/);
  assert.match(workspace,/orbit=createWorkspaceOrbit\(\{workspace,navigate:selectView,translate\}\);/);
  assert.match(workspace,/orbit\?\.sync\(selected\);/);
  assert.match(workspace,/chatHost\.appendChild\(preview\)/);
  assert.match(workspace,/modules\.appendChild\(section\)/);
  assert.match(workspace,/original\.requestSubmit\(\)/);
  assert.match(orbit,/botPage\.after\(orb\)/);
  assert.match(css,/display:flex!important;flex-direction:column/);
  assert.match(workspace,/page==='bot'/);
  assert.match(index,/workspace-orbit-v28\.css/);
});
test('scrolling, swiping, clicking and keyboard arrows navigate real sections',()=>{
  for(const id of ['bot','overview','setup','answers','customers','automation','install','billing','profile','settings']){
    assert.ok(orbit.includes("id:'"+id+"'"),id);
  }
  assert.match(orbit,/navigateTo\(sections\[nextIndex\]\.id\)/);
  assert.match(orbit,/data-orbit-page/);
  assert.match(orbit,/data-orbit-direction/);
  assert.match(orbit,/dial\.addEventListener\('wheel'/);
  assert.match(orbit,/dial\.addEventListener\('touchend'/);
  assert.match(orbit,/ArrowRight/);
  assert.match(orbit,/setNavigate/);
  assert.match(orbit,/aria-pressed/);
  assert.match(orbit,/aria-label/);
});
test('mobile stays legible; normal document scrolling is not hijacked',()=>{
  assert.match(orbit,/\{passive:false\}/);
  assert.match(css,/@media\(max-width:850px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/-webkit-text-fill-color:#f8f9fc!important/);
  assert.doesNotMatch(css,/scroll-snap-type/);
  assert.doesNotMatch(orbit,/window\.addEventListener\('wheel'/);
});

test('bot details and company settings remain separate, minimal and persistent',()=>{
  assert.match(workspace,/const visibleFields=scope==='setup'/);
  assert.match(workspace,/showSettings\(selected\)/);
  assert.match(workspace,/for\(const \[key\] of visibleFields\)/);
  assert.match(workspace,/original\.requestSubmit\(\)/);
});

test('direct mobile icon taps reveal their real panel and wheel exits at the dial edges',()=>{
  assert.match(orbit,/const revealMobileSection=\(\)=>/);
  assert.match(orbit,/page\.scrollIntoView/);
  assert.match(orbit,/revealMobileSection\(\);return/);
  assert.match(orbit,/index===sections\.length-1&&delta>0/);
});

test('rotating orbital icons remain upright and phone vertical swipes scroll normally',()=>{
  assert.match(css,/touch-action:pan-y/);
  assert.match(css,/rotate\(calc\(var\(--orbit-angle\) \+ var\(--orbit-turn/);
  assert.match(css,/rotate\(calc\(var\(--orbit-counter\) - var\(--orbit-turn/);
  assert.match(css,/transition:transform \.52s/);
  assert.match(orbit,/Math\.abs\(dx\)>32 && Math\.abs\(dx\)>Math\.abs\(dy\)\*1\.35/);
  assert.doesNotMatch(orbit,/move\(\(Math\.abs\(dy\)>Math\.abs\(dx\)/);
});

test('post-setup interface uses only the orb, not a hamburger or dropdown',()=>{
  assert.doesNotMatch(workspace,/id="respondoWorkspaceMenuToggle"/);
  assert.doesNotMatch(workspace,/class="respondo-workspace-menu-wrap"/);
  assert.doesNotMatch(workspace,/const closeMenu/);
  assert.match(orbit,/id:'overview'/);
  assert.match(orbit,/id:'automation'/);
  assert.match(orbit,/01 \/ 10/);
  assert.match(css,/respondo-workspace-chat-card #live-preview/);
  assert.match(css,/respondo-workspace-menu-toggle[^,]*,/);
  assert.doesNotMatch(css,/grid-template-columns:minmax\(245px,310px\) minmax\(0,1fr\)/);
});
test('orb reveals the active view after the chat and remains reachable while scrolling',()=>{
  assert.match(workspace,/element\.hidden=!\(page==='bot'/);
  assert.ok(orbit.includes("const page=content.querySelector('[data-workspace-page="));
  assert.doesNotMatch(workspace,/window\.scrollTo\(\{top:0/);
  assert.match(workspace,/original\.requestSubmit\(\)/);
});

test('all browser-facing URLs get a new mobile cache key',()=>{
  const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
  assert.match(index,/workspace-orbit-v28\.css\?v=20261028-after-chat-v29/);
  assert.match(index,/orbit-after-chat-v29"><\/script>/);
  assert.match(app,/workspace-continuation-v24\.js\?v=20261028-orbit-after-chat-v29/);
  assert.match(workspace,/workspace-orbit-v28\.js\?v=20261028-after-chat-v29/);
});
