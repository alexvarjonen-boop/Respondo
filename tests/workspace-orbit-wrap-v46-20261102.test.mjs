import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nextWorkspaceOrbitChapter} from '../public/workspace-orbit-v28.js';

const read=(name)=>readFileSync(new URL('../public/'+name,import.meta.url),'utf8');
const orbit=read('workspace-orbit-v28.js');
const workspace=read('workspace-continuation-v24.js');
const app=read('app.js');
const html=read('index.html');

test('all twelve chapters repeat from Profile to Overview, not the page footer',()=>{
  for(let index=0;index<11;index++)
    assert.equal(nextWorkspaceOrbitChapter(index,1,12),index+1);
  assert.equal(nextWorkspaceOrbitChapter(11,1,12),0);
  assert.equal(nextWorkspaceOrbitChapter(0,-1,12),-1);
  assert.equal(nextWorkspaceOrbitChapter(11,-1,12),10);
  assert.equal(nextWorkspaceOrbitChapter(0,0,12),0);
});

test('a finger swipe on the pinned mobile sphere loops the final chapter',()=>{
  assert.match(orbit,/function moveSection\(direction\)/);
  assert.match(orbit,/nextWorkspaceOrbitChapter\(currentIndex,direction,sections\.length\)/);
  assert.match(orbit,/if\(next<0\)return exitSphere\(direction\)/);
  assert.match(orbit,/moveSection\(dy<0\?1:-1\)/);
});

test('a desktop wheel gesture loops at the last native-scroll chapter',()=>{
  assert.match(orbit,/if\(!pinned && !phone\(\)\)/);
  assert.match(orbit,/event\.deltaY>0 && !navigationFreeze && currentIndex===sections\.length-1/);
  assert.match(orbit,/wrapToOverview\(\)/);
  assert.match(orbit,/window\.scrollTo\(\{top,behavior:'instant'\}\)/);
  assert.match(orbit,/selectIndex\(0\)/);
  assert.match(orbit,/wrapCooldownUntil=performance\.now\(\)\+900/);
  assert.match(orbit,/if\(event\.cancelable\)event\.preventDefault\(\)/);
});

test('noncancelable trackpad momentum cannot skip from Profile to page bottom',()=>{
  assert.match(orbit,/function onPageScroll\(\)/);
  assert.match(orbit,/performance\.now\(\)>=wrapCooldownUntil && currentIndex===sections\.length-1 && y>previousY\+1/);
  assert.match(orbit,/rect\.bottom<=window\.innerHeight\+8 && rect\.bottom>-window\.innerHeight\*\.35/);
  assert.match(orbit,/window\.addEventListener\('scroll',onPageScroll,\{passive:true\}\)/);
});

test('icon navigation to actual company panels still bypasses looping',()=>{
  assert.match(orbit,/navigationFreeze=true;/);
  assert.match(orbit,/navigateTo\(section\.id\)/);
  assert.match(orbit,/panel\.scrollIntoView/);
  assert.match(orbit,/!navigationFreeze && currentIndex===sections\.length-1/);
  assert.match(orbit,/function releasePin\(\)/);
});

test('fresh version parameters activate orbit-loop fixes for cached browsers',()=>{
  assert.match(workspace,/workspace-orbit-v28\.js\?v=[^'"]*profile-wrap-v46/);
  assert.match(app,/workspace-continuation-v24\.js\?v=[^'"]*profile-wrap-v46/);
  assert.match(html,/app\.js\?v=[^"]*profile-wrap-v46/);
});
