import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const read=(filename)=>readFileSync(new URL('../'+filename,import.meta.url),'utf8');
const intro=read('public/logo-reveal.js');
const css=read('public/logo-reveal.css');
const html=read('public/index.html');
const effects=read('public/effects.js');
const server=read('server.mjs');

test('the original official logo reveal is silent with no sound button or audio dependencies',()=>{
  assert.doesNotThrow(()=>new vm.Script(intro));
  assert.match(intro,/rl-intro-graphic/);
  assert.match(intro,/playIntro\(false\)/);
  assert.match(intro,/sessionStorage\.setItem/);
  assert.match(intro,/prefers-reduced-motion: reduce/);
  assert.doesNotMatch(intro,/AudioContext|webkitAudioContext|createOscillator|createBufferSource|playSound|stopSound|rl-intro-sound|withSound|Toista äänellä|Spela med ljud|Play with sound/);
  assert.doesNotMatch(css,/\.rl-intro-sound/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(html,/logo-reveal\.js\?v=20261018-cinematic-silent-v5/);
  assert.match(html,/logo-reveal\.css\?v=20261018-cinematic-silent-v5/);
});

test('home intro works normally and never tries audio, even if Web Audio exists',()=>{
  let activeAudio=0;
  const nodes=[],pending=[];
  const home={isConnected:true,querySelector(sel){return sel==='.apple-hero'?{}:null}};
  const app={querySelector(sel){return sel==='.apple-home-page'?home:null}};
  const classes=()=>({add(){},remove(){}});
  const document={
    readyState:'complete',
    documentElement:{lang:'fi'},
    getElementById(id){return id==='app'?app:null},
    body:{classList:classes(),appendChild(n){nodes.push(n)}},
    createElement(){return {className:'',innerHTML:'',setAttribute(){},classList:classes(),remove(){}}}
  };
  const context={
    document,location:{pathname:'/',search:''},URLSearchParams,
    sessionStorage:{getItem(){return null},setItem(){}},
    localStorage:{getItem(){return null}},
    window:null,MutationObserver:class{observe(){}},
    requestAnimationFrame(callback){pending.push(callback);return pending.length},
    setTimeout(){return 1},clearTimeout(){},
    AudioContext:class{constructor(){activeAudio++}},
    addEventListener(){},matchMedia(){return {matches:false}},
  };
  context.window=context;
  vm.runInNewContext(intro,context);
  while(pending.length) pending.shift()();
  assert.equal(nodes.length,1,'silent original intro renders');
  assert.equal(activeAudio,0,'no sound can play');
  assert.doesNotMatch(nodes[0].innerHTML,/rl-intro-sound|Toista äänellä|Play with sound/);
  assert.match(nodes[0].innerHTML,/RESPONDO AI/);
});

test('feature overview keeps its verified page button without repeating the raw URL',()=>{
  const begin=server.indexOf('function respondoProductFaqMatch(');
  const end=server.indexOf('\nfunction ',begin+10);
  assert.ok(begin>=0&&end>begin);
  const faq=server.slice(begin,end);
  assert.match(faq,/id:'respondo-faq-features-overview'/);
  assert.doesNotMatch(faq,/https:\/\/respondoai\.fi\/(?:ominaisuudet|funktioner|features)/);
  assert.match(effects,/Array\.isArray\(data\.actions\)/);
  assert.match(effects,/let displayedAnswer = answer/);
  assert.match(effects,/used\.has\(destination\.pathname\)/);
  assert.match(effects,/typing\.firstChild\.nodeValue = displayedAnswer/);
  assert.match(html,/effects\.js\?v=[^"]+-logo-sound-cleanlinks-v2/);
});
