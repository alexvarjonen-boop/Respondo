import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(name)=>readFileSync(new URL('../public/'+name,import.meta.url),'utf8');
const orbit=read('workspace-orbit-v28.js');
const css=read('workspace-orbit-v28.css');
const app=read('app.js');
const index=read('index.html');
const ws=read('workspace-continuation-v24.js');

test('Safari stays on the sphere and moves exactly one section per swipe',()=>{
  assert.match(css,/scroll-snap-type:y proximity/);
  assert.match(css,/scroll-snap-stop:always/);
  assert.match(css,/touch-action:pan-x pinch-zoom/);
  assert.match(orbit,/data-rs-snap-index/);
  assert.match(orbit,/updateSnapPoints\(\)/);
  assert.match(orbit,/stage\.addEventListener\('touchmove'/);
  assert.match(orbit,/stage\.addEventListener\('touchend'/);
  assert.match(orbit,/\{passive:false\}/);
  assert.match(orbit,/const next=currentIndex\+\(dy<0\?1:-1\)/);
  assert.match(orbit,/scrollToChapter\(next\)/);
  assert.match(orbit,/window\.scrollTo\(/);
  assert.match(orbit,/next>=0 && next<sections\.length/);
  assert.match(orbit,/temporarilyDisableSnap\(\)/);
});
test('last swipe can exit to content and tapping the name still navigates',()=>{
  assert.match(orbit,/orbitTop\+orb\.offsetHeight\+12/);
  assert.match(orbit,/button\.addEventListener\('click'/);
  assert.match(orbit,/navigateTo\(section\.id\)/);
  assert.match(orbit,/panel\.scrollIntoView/);
  assert.match(orbit,/touchcancel/);
  assert.match(orbit,/scrollend/);
  assert.doesNotMatch(orbit,/<span aria-hidden="true">↗<\/span>/);
});
test('all updated versions reach iOS caches and keep the original preview',()=>{
  assert.match(index,/workspace-orbit-v28\.css\?v=20261028-preview-readable-v36/);
  assert.match(index,/app\.js\?v=[^"]+mobile-scroll-guard-v35/);
  assert.match(app,/workspace-continuation-v24\.js\?v=20261028-mobile-scroll-guard-v35/);
  assert.match(ws,/workspace-orbit-v28\.js\?v=20261028-mobile-scroll-guard-v35/);
  assert.match(ws,/original\.requestSubmit\(\)/);
});
