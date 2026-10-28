import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../public/'+name,import.meta.url),'utf8');
const orb=read('workspace-orbit-v28.js'),css=read('workspace-orbit-v28.css'),
 app=read('app.js'),ws=read('workspace-continuation-v24.js'),html=read('index.html');

test('iPhone entering from either side pins the sphere before inertial overscroll',()=>{
 assert.match(orb,/const entersFromTop=y>previousY/);
 assert.match(orb,/const entersFromBottom=y<previousY/);
 assert.match(orb,/pinSphere\(\)/);
 assert.match(orb,/Object\.assign\(document\.body\.style,\{position:'fixed'/);
 assert.match(orb,/document\.documentElement\.style\.overflow='hidden'/);
 assert.match(css,/rs-orbit-mobile-pinned \.rs-workspace-helix-stage/);
 assert.match(css,/position:fixed!important/);
 assert.match(css,/touch-action:none!important/);
 assert.match(css,/height:100svh!important/);
});
test('each touch/wheel gesture selects one chapter, and last/first swipe exits normally',()=>{
 assert.match(orb,/const next=currentIndex\+direction/);
 assert.match(orb,/moveSection\(dy<0\?1:-1\)/);
 assert.match(orb,/moveSection\(event\.deltaY>0\?1:-1\)/);
 assert.match(orb,/stage\.addEventListener\('touchmove'/);
 assert.match(orb,/stage\.addEventListener\('touchend'/);
 assert.match(orb,/stage\.addEventListener\('wheel'/);
 assert.match(orb,/releasePin\(\)/);
 assert.match(orb,/next<0 \|\| next>=sections\.length/);
 assert.match(orb,/navigateTo\(section\.id\)/);
 assert.match(orb,/pagehide',releasePin/);
});
test('all iPhone assets get fresh URLs and the existing functional preview stays intact',()=>{
 assert.match(html,/workspace-orbit-v28\.css\?v=20261028-mobile-pinned-v37/);
 assert.match(html,/app\.js\?v=[^"]+mobile-pinned-v37/);
 assert.match(app,/workspace-continuation-v24\.js\?v=20261028-mobile-pinned-v37/);
 assert.match(ws,/workspace-orbit-v28\.js\?v=20261028-mobile-pinned-v37/);
 assert.match(ws,/original\.requestSubmit\(\)/);
});
