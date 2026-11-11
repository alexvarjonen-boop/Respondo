import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  allowWorkspaceOrbitWrap,nextWorkspaceOrbitChapter
} from '../public/workspace-orbit-v28.js';

const read=path=>readFileSync(new URL('../public/'+path,import.meta.url),'utf8');
const orbit=read('workspace-orbit-v28.js');

test('Profile and every authenticated account module allow natural scrolling',()=>{
  for(const page of [
    'profile','settings','billing','install','integrations','automation',
    'answers','setup','team','conversations','customers','overview'
  ]){
    assert.equal(allowWorkspaceOrbitWrap(page),false,page);
  }
  assert.equal(allowWorkspaceOrbitWrap('bot'),true);
  assert.equal(allowWorkspaceOrbitWrap(undefined),false);
});

test('both desktop wheel wrap and trackpad momentum guard against active modules',()=>{
  const pageScroll=orbit.slice(orbit.indexOf('function onPageScroll()'),
    orbit.indexOf("window.addEventListener('scroll',onPageScroll"));
  const desktopWheel=orbit.slice(orbit.indexOf("stage.addEventListener('wheel'"),
    orbit.indexOf('function openSection('));
  assert.match(pageScroll,/allowWorkspaceOrbitWrap\(workspace\.dataset\.currentView\)/);
  assert.match(pageScroll,/allowWorkspaceOrbitWrap\(workspace\.dataset\.currentView\)\s*&&\s*performance\.now\(\)>=wrapCooldownUntil/);
  assert.match(desktopWheel,/currentIndex===sections\.length-1 &&\s*allowWorkspaceOrbitWrap\(workspace\.dataset\.currentView\)/);
  assert.match(desktopWheel,/now<wrapCooldownUntil && allowWorkspaceOrbitWrap\(workspace\.dataset\.currentView\)/);
});

test('explicit sphere navigation and mobile pinned chapter gestures remain functional',()=>{
  assert.equal(nextWorkspaceOrbitChapter(11,1,12),0);
  assert.equal(nextWorkspaceOrbitChapter(0,-1,12),-1);
  assert.match(orbit,/moveSection\(dy<0\?1:-1\)/);
  assert.match(orbit,/navigateTo\(section\.id\)/);
  assert.match(orbit,/panel\.scrollIntoView/);
  assert.match(orbit,/function releasePin\(\)/);
  assert.match(orbit,/function pinSphere\(\)/);
});

test('fresh app, workspace, and orbit import URLs bypass previous cached scroll trapping code',()=>{
  const html=read('index.html'),app=read('app.js'),workspace=read('workspace-continuation-v24.js');
  assert.match(html,/app\.js\?v=[^"]*profile-scroll-no-jump-v47/);
  assert.match(app,/workspace-continuation-v24\.js\?v=[^'"]*profile-scroll-no-jump-v47/);
  assert.match(workspace,/workspace-orbit-v28\.js\?v=[^'"]*profile-scroll-no-jump-v47/);
});
