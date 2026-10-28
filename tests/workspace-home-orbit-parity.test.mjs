import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const file=name=>readFileSync(new URL('../public/'+name,import.meta.url),'utf8');
const home=file('spiral-hero.js');
const homeMotion=file('spiral-hero-motion.js');
const orbit=file('workspace-orbit-v28.js');
const workspace=file('workspace-continuation-v24.js');
const app=file('app.js');
const css=file('workspace-home-orbit-parity.css');
const html=file('index.html');

test('workspace sphere shares every actual homepage film layer and official arrow mark',()=>{
  for(const cls of ['rs-space','rs-studio-grid','rs-studio-haze','rs-studio-sweep','rs-space-glow',
    'rs-space-ellipse-a','rs-space-ellipse-b','rs-space-horizon','rs-kinetic-light',
    'rs-studio-orbit-art','rs-studio-ring-a','rs-studio-ring-b','rs-studio-ring-c',
    'rs-axis','rs-axis-halo','rs-axis-caption']){
    assert.ok(home.includes(cls),'Home source has '+cls);
    assert.ok(orbit.includes(cls),'OS sphere has '+cls);
  }
  const arrowHome=home.match(/const arrow = '([^']+)'/)?.[1];
  assert.ok(arrowHome,'Find the actual official logo SVG path');
  assert.ok(orbit.includes(arrowHome),'Center mark is the same SVG as home, not a lookalike');
  assert.match(orbit,/rs-helix-beacon/);
});

test('home and OS share identical dynamic optical effect formulae, anchored to the scroll-selected icon',()=>{
  for(const variable of ['--rs-intro-opacity','--rs-logo-opacity','--rs-logo-scale','--rs-arrow-turn',
    '--rs-orbit-opacity','--rs-orbit-scale','--rs-orbit-spin','--rs-icon-upright',
    '--rs-orbit-tilt','--rs-grid-angle','--rs-grid-scale','--rs-grid-shift',
    '--rs-haze-scale','--rs-haze-opacity','--rs-light-shift','--rs-light-scale',
    '--rs-light-strength','--rs-sweep-x','--rs-progress','--rs-orbit-fill']){
    assert.ok(homeMotion.includes(variable),'Homepage motion contains '+variable);
    assert.ok(orbit.includes(variable),'Workspace orbit contains '+variable);
  }
  assert.match(orbit,/const opening=1-ease\(clamp\(position\/1\.05,0,1\)\)/);
  assert.match(orbit,/const orbitFlight=ease\(clamp\(position\/1\.75,0,1\)\)/);
  assert.match(orbit,/const breathing=Math\.sin\(position\*\.65\)\*\(mobile\?\.035:\.055\)/);
  assert.match(orbit,/const angle=360\/sections\.length/);
  assert.match(orbit,/if\(!reduced\.matches\)\{/);
  assert.match(orbit,/window\.addEventListener\('scroll',onPageScroll,\{passive:true\}\)/);
  assert.match(orbit,/if\(!frame && orb\.isConnected\)frame=requestAnimationFrame\(draw\)/);
  assert.doesNotMatch(orbit,/setInterval\s*\(/);
});

test('homepage atmospheric light and glass rings are scoped to account orbit',()=>{
  for(const effect of ['.rs-workspace-helix-stage::before','.rs-workspace-helix-stage::after',
   '.rs-space','.rs-studio-grid','.rs-studio-haze','.rs-studio-sweep','.rs-space-glow',
   '.rs-space-ellipse','.rs-space-horizon','.rs-kinetic-light','.rs-helix-beacon',
   '.rs-studio-orbit-icon[data-rs-workspace-icon].is-active','.rs-axis']){
    assert.ok(css.includes('#app .rs-workspace-scroll-helix '+effect),'Styles the home effect '+effect);
  }
  for(const token of ['perspective(900px)','rotateX(64deg)','radial-gradient','--rs-grid-angle',
    '--rs-haze-scale','--rs-sweep-x','--rs-light-shift','--rs-arrow-turn',
    '--rs-orbit-opacity','repeating-conic-gradient','--rs-orbit-fill']){
    assert.ok(css.includes(token)||file('workspace-orbit-v28.css').includes(token),'Homepage material token '+token);
  }
  assert.match(css, /width:100vw!important/);
  assert.match(css, /margin-left:calc\(50% - 50vw\)!important/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css, /@media\(max-width:850px\) and \(pointer:coarse\)/);
});

test('home parity does not change real authenticated destinations, working bot or mobile chapter trapping',()=>{
  for(const id of ['bot','overview','setup','answers','customers','automation','install','profile','billing','settings'])
    assert.ok(orbit.includes("id:'"+id+"'"),'Route '+id);
  assert.match(orbit,/botPage\.after\(orb\)/);
  assert.match(orbit,/navigateTo\(section\.id\)/);
  assert.match(orbit,/next<0 \|\| next>=sections\.length/);
  assert.match(orbit,/selectIndex\(enterFromBottom\?sections\.length-1:0\)/);
  assert.match(orbit,/stage\.addEventListener\('touchend'/);
  assert.match(workspace,/original\.requestSubmit\(\)/);
  assert.match(app,/workspace-continuation-v24\.js\?v=20261028-owner-subscribe-v38-orbit-home-parity-v39/);
  assert.match(workspace,/workspace-orbit-v28\.js\?v=20261028-mobile-pinned-v37-home-parity-v39/);
  assert.match(html,/workspace-home-orbit-parity\.css\?v=20261029-home-optical-parity-v39/);
  assert.match(html,/app\.js\?v=[^"]+orbit-home-parity-v39/);
});
