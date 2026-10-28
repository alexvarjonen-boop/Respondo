import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const root=new URL('../public/',import.meta.url);
const app=await readFile(new URL('app.js',root),'utf8');
const workspace=await readFile(new URL('workspace-continuation-v24.js',root),'utf8');
const orbit=await readFile(new URL('workspace-orbit-v28.js',root),'utf8');
const css=await readFile(new URL('workspace-orbit-v28.css',root),'utf8');
const index=await readFile(new URL('index.html',root),'utf8');

test('the post-onboarding workspace imports the real interactive orbit',()=>{
  assert.match(workspace,/import \{ mountWorkspaceOrbit \} from '\.\/workspace-orbit-v28\.js/);
  assert.match(workspace,/const orbit=mountWorkspaceOrbit\(workspace,\{onNavigate:\(id\)=>selectView\(id\)\}\)/);
  assert.match(workspace,/orbit\?\.setActive\(selected\)/);
  assert.match(app,/workspace-continuation-v24\.js\?v=20261028-orbit-v28/);
  assert.ok(index.indexOf('workspace-orbit-v28.css')>index.indexOf('workspace-continuation-v24.css'));
});
test('orbit includes all ten real destinations, including billing and bot details',()=>{
  const ids=['bot','overview','setup','answers','customers','automation','install','profile','billing','settings'];
  for(const id of ids)assert.match(orbit,new RegExp("id:'"+id+"'"));
  assert.match(orbit,/data-rs-orbit-open/);
  assert.match(orbit,/Scroll through the sections or tap an icon/);
  assert.match(orbit,/window\.addEventListener\('scroll',onScroll,\{passive:true\}\)/);
  assert.doesNotMatch(orbit,/preventDefault\(\)[\s\S]*wheel\.addEventListener\('wheel'/);
});
test('orbital navigation reuses original authenticated views and does not fake billing data',()=>{
  assert.match(workspace,/showPanel\(primary\[selected\]\)/);
  assert.match(workspace,/original\.requestSubmit\(\)/);
  assert.match(workspace,/if\(demo && \['customers','automation','install','billing','profile'\]/);
  assert.match(orbit,/onNavigate\(id\)/);
  assert.doesNotMatch(orbit,/\/api\//);
});
test('dark responsive workspace and motion settings retain contrast and mobile support',()=>{
  assert.match(css,/@media\(max-width:700px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/-webkit-text-fill-color:#f6f8fc!important/);
  assert.match(css,/\.rs-orbit-node\.is-active/);
  assert.match(orbit,/ResizeObserver/);
  assert.match(orbit,/ArrowRight/);
});
test('bot details and company settings are distinct compact forms without discarding profile fields',()=>{
  assert.match(workspace,/const visibleFields=scope==='setup'/);
  assert.match(workspace,/showSettings\(selected\)/);
  assert.match(workspace,/for\(const \[key\] of visibleFields\)/);
});
