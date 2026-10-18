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

test('cinematic audio is opt-in, synchronized and localized',()=>{
  assert.doesNotThrow(()=>new vm.Script(intro));
  assert.match(intro,/sound:'Toista äänellä'/);
  assert.match(intro,/sound:'Spela med ljud'/);
  assert.match(intro,/sound:'Play with sound'/);
  assert.match(intro,/soundButton\.addEventListener\('click'/);
  assert.match(intro,/playIntro\(true, true\)/);
  assert.match(intro,/if \(withSound\)/);
  assert.match(intro,/playSound\(\)/);
  assert.match(intro,/var startSweep = start \+ 0\.28/);
  assert.match(intro,/tone\('sine', 1\.15/);
  assert.match(intro,/tone\('sine', 1\.62/);
  assert.match(intro,/window\.AudioContext \|\| window\.webkitAudioContext/);
  assert.match(intro,/if \(reduced\) return/);
  assert.doesNotMatch(intro,/(?:new AudioContext\(|new webkitAudioContext\(|playSound\(\);\s*playIntro\(false\))/);
  assert.match(css,/\.rl-intro-sound\s*\{/);
  assert.match(css,/min-height:44px/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(html,/logo-reveal\.js\?v=20261018-cinematic-sound-v4/);
  assert.match(html,/logo-reveal\.css\?v=20261018-cinematic-sound-v4/);
});

test('iPhone-compatible audio does not start before a real tap',()=>{
  const buttonEvents=[];
  const openingNodes=[];
  const app={querySelector(sel){return sel==='.apple-home-page'?home:null}};
  const home={isConnected:true,querySelector(sel){return sel==='.apple-hero'?{}:null}};
  const events=new Map();
  const scheduled=[];
  let audioContexts=0,played=0;
  const param=()=>({setValueAtTime(){},exponentialRampToValueAtTime(){}});
  class MockAudioContext{
    constructor(){audioContexts++;this.currentTime=.05;this.sampleRate=8000;this.destination={};this.state='running';}
    createGain(){return {gain:param(),connect(){}}}
    createOscillator(){return {type:'',frequency:param(),connect(){},start(){played++},stop(){}}}
    createBuffer(ch,length){return {getChannelData(){return new Float32Array(length)}}}
    createBufferSource(){return {connect(){},start(){played++},stop(){}}}
    createBiquadFilter(){return {type:'',Q:{value:0},frequency:param(),connect(){}}}
    close(){return Promise.resolve()}
  }
  const classes=()=>({add(){},remove(){}});
  const document={
    readyState:'complete',documentElement:{lang:'fi'},
    getElementById(key){return key==='app'?app:null},
    body:{classList:classes(),appendChild(node){openingNodes.push(node)}},
    createElement(){return {
      classList:{add(){}},innerHTML:'',
      setAttribute(){},remove(){this.removed=true},
      querySelector(sel){if(sel!=='.rl-intro-sound')return null;
        const button={addEventListener(event,callback){buttonEvents.push(callback)},remove(){this.removed=true}};
        return button;
      }
    }}
  };
  const context={
    document,location:{pathname:'/',search:''},URLSearchParams,
    sessionStorage:{getItem(){return null},setItem(){}},
    window:null,
    MutationObserver:class{observe(){}},
    requestAnimationFrame(callback){scheduled.push(callback);return scheduled.length},
    clearTimeout(){},
    setTimeout(){return 4},
    matchMedia(){return {matches:false}},
  };
  context.window=context;
  context.AudioContext=MockAudioContext;
  context.addEventListener=(name,cb)=>{events.set(name,cb)};
  vm.runInNewContext(intro,context);
  for(let i=0;i<5&&scheduled.length;i++)scheduled.shift()();
  assert.equal(openingNodes.length,1,'intro opens normally');
  assert.equal(audioContexts,0,'sound must not autoplay');
  assert.equal(buttonEvents.length,1,'button is available during intro');
  buttonEvents[0]({preventDefault(){}});
  assert.equal(openingNodes.length,2,'tap restarts visuals at time zero');
  assert.equal(audioContexts,1,'sound starts only from user activation');
  assert.ok(played>=4,'three tones and sweep are scheduled');
});

test('feature overview links use the verified button, not a second raw URL',()=>{
  const begin=server.indexOf('function respondoProductFaqMatch(');
  const end=server.indexOf('\nfunction ',begin+10);
  assert.ok(begin>=0&&end>begin);
  const matchBlock=server.slice(begin,end);
  assert.match(matchBlock,/id:'respondo-faq-features-overview'/);
  assert.doesNotMatch(matchBlock,/https:\/\/respondoai\.fi\/(?:ominaisuudet|funktioner|features)/);
  assert.match(effects,/Array\.isArray\(data\.actions\)/);
  assert.match(effects,/let displayedAnswer = answer/);
  assert.match(effects,/used\.has\(destination\.pathname\)/);
  assert.match(effects,/typing\.firstChild\.nodeValue = displayedAnswer/);
  assert.match(html,/effects\.js\?v=[^"]+-logo-sound-cleanlinks-v2/);
});
