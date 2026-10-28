import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const workspace=await readFile(new URL('../public/workspace-continuation-v24.js',import.meta.url),'utf8');
const orbit=await readFile(new URL('../public/workspace-orbit-v28.js',import.meta.url),'utf8');
const css=await readFile(new URL('../public/workspace-orbit-v28.css',import.meta.url),'utf8');
const index=await readFile(new URL('../public/index.html',import.meta.url),'utf8');

test('post-setup screen renders new orb beside unchanged real chat, billing and forms',()=>{
  assert.match(workspace,/import \{ createWorkspaceOrbit \} from '\.\/workspace-orbit-v28\.js';/);
  assert.match(workspace,/orbit=createWorkspaceOrbit\(\{workspace,navigate:selectView,translate\}\);/);
  assert.match(workspace,/orbit\?\.sync\(selected\);/);
  assert.match(workspace,/chatHost\.appendChild\(preview\)/);
  assert.match(workspace,/modules\.appendChild\(section\)/);
  assert.match(workspace,/original\.requestSubmit\(\)/);
  assert.match(orbit,/content\.insertBefore\(orb,content\.firstChild\)/);
  assert.match(css,/grid-template-columns:minmax\(245px,310px\) minmax\(0,1fr\)/);
  assert.match(index,/workspace-orbit-v28\.css/);
});
test('scrolling, swiping, clicking and keyboard arrows navigate real sections',()=>{
  for(const id of ['bot','setup','answers','customers','install','billing','profile','settings']){
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
