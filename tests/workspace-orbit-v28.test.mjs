import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const workspace=await readFile(new URL('../public/workspace-continuation-v24.js',import.meta.url),'utf8');
const orbit=await readFile(new URL('../public/workspace-orbit-v28.js',import.meta.url),'utf8');
const css=await readFile(new URL('../public/workspace-orbit-v28.css',import.meta.url),'utf8');
const index=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');

test('sphere appears below the real bot test and uses exact homepage orbit elements',()=>{
  assert.match(orbit,/botPage\.after\(orb\)/);
  assert.match(orbit,/rs-studio-orbit-art/);
  assert.match(orbit,/rs-studio-ring-a/);
  assert.match(orbit,/rs-studio-ring-b/);
  assert.match(orbit,/rs-studio-ring-c/);
  assert.match(orbit,/rs-axis-halo/);
  assert.match(orbit,/fill="white"/);
  assert.match(orbit,/data-rs-workspace-icon/);
  assert.match(css,/perspective\(1200px\)/);
  assert.match(css,/repeating-conic-gradient/);
  assert.match(css,/radial-gradient/);
});
test('native document scroll moves selected sphere chapter, no wheel interception',()=>{
  assert.match(orbit,/const progress=pinned\?currentIndex\/\(sections\.length-1\):clamp\(-rect\.top\/range,0,1\)/);
  assert.match(orbit,/const position=progress\*\(sections\.length-1\)/);
  assert.match(orbit,/window\.addEventListener\('scroll',onPageScroll,\{passive:true\}\)/);
  assert.match(orbit,/requestAnimationFrame\(draw\)/);
  assert.match(orbit,/--rs-orbit-spin/);
  assert.match(orbit,/--rs-icon-upright/);
  assert.match(css,/position:sticky;top:0/);
  assert.match(orbit,/if\(event\.key==='ArrowDown'/); // Keyboard handlers may prevent default; native page scroll never does.
  assert.match(orbit,/stage\.addEventListener\('wheel'/);
});
test('localized page name below sphere is clickable and opens each real page',()=>{
  for(const id of ['bot','overview','setup','answers','customers','automation','install','profile','billing','settings'])
    assert.ok(orbit.includes("id:'"+id+"'"),id);
  assert.match(orbit,/id="rsOrbitOpen"/);
  assert.match(orbit,/id="rsOrbitName"/);
  assert.match(orbit,/selectIndex\(Math\.round\(position\)\)/);
  assert.match(orbit,/button\.addEventListener\('click'/);
  assert.match(orbit,/navigateTo\(section\.id\)/);
  assert.match(orbit,/panel\.scrollIntoView/);
  assert.match(workspace,/orbit=createWorkspaceOrbit\(\{workspace,navigate:selectView,translate\}\)/);
  assert.match(workspace,/original\.requestSubmit\(\)/);
  assert.doesNotMatch(workspace,/id="respondoWorkspaceMenuToggle"/);
});
test('iPhone visual sizing and reduced motion still preserve accessibility',()=>{
  assert.match(css,/width:min\(67vw,285px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/:focus-visible/);
  assert.match(orbit,/aria-label/);
  assert.match(orbit,/aria-live="polite"/);
  assert.match(orbit,/reduced\.matches/);
  assert.match(index,/workspace-orbit-v28\.css\?v=20261028-mobile-pinned-v37/);
  assert.match(index,/home-helix-v31-hero-try-bot-v32-chat-navigation-note-v34-mobile-scroll-guard-v35-mobile-pinned-v37"><\/script>/);
  assert.match(app,/workspace-continuation-v24\.js\?v=20261028-mobile-pinned-v37/);
  assert.match(workspace,/workspace-orbit-v28\.js\?v=20261028-mobile-pinned-v37/);
});
