import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const read=name=>readFileSync(new URL('../public/'+name,import.meta.url),'utf8');
const logo=read('logo-reveal.js'),css=read('logo-reveal.css'),html=read('index.html');
const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const effects=read('effects.js');

test('cinematic logo audio is synchronized, original arrow remains and autoplay is not required',()=>{
  assert.doesNotThrow(()=>new vm.Script(logo));
  const path=read('respondo-symbol.svg').match(/<path d="([^"]+)"/)?.[1];
  assert.ok(path&&logo.includes(path));
  assert.match(logo,/AudioContext \|\| window\.webkitAudioContext/);
  assert.match(logo,/if \(reduced\) return/);
  assert.match(logo,/soundButton\.addEventListener\('click'/);
  assert.match(logo,/playIntro\(true, true\)/);
  assert.match(logo,/if \(withSound\)/);
  assert.match(logo,/playSound\(\)/);
  assert.match(logo,/sound:'Toista äänellä'/);
  assert.match(logo,/sound:'Spela med ljud'/);
  assert.match(logo,/sound:'Play with sound'/);
  assert.match(logo,/tone\('sine', 1\.15/);
  assert.match(logo,/tone\('sine', 1\.62/);
  assert.doesNotMatch(logo,/new Audio\(|new Howl\(|autoplay/);
  assert.match(css,/\.rl-intro-sound\s*\{/);
  assert.match(css,/safe-area-inset-bottom/);
  assert.match(css,/\.rl-intro-sound:focus-visible/);
  assert.match(html,/logo-reveal\.js\?v=20261018-cinematic-sound-v4/);
  assert.match(html,/logo-reveal\.css\?v=20261018-cinematic-sound-v4/);
});

test('iPhone-like page only unlocks generated sound after a real tap',()=>{
  let audioStarts=0;
  let audioContexts=0;
  const makeParam=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(){},linearRampToValueAtTime(){}});
  class AudioContextMock {
    constructor(){audioContexts++;this.currentTime=0;this.sampleRate=44100;this.state='running';this.destination={};}
    createGain(){return {gain:makeParam(),connect(){}};}
    createOscillator(){return {type:'sine',frequency:makeParam(),connect(){},start(){audioStarts++},stop(){}};}
    createBuffer(channels,length){return {getChannelData(){return new Float32Array(length)}};}
    createBufferSource(){return {buffer:null,connect(){},start(){audioStarts++},stop(){}};}
    createBiquadFilter(){return {type:'bandpass',Q:makeParam(),frequency:makeParam(),connect(){}};}
    close(){return Promise.resolve();}
  }
  const active=[];
  const classList={add(){},remove(){}};
  const fakeHome={isConnected:true,querySelector(selector){return selector==='.apple-hero'?{}:null}};
  const app={querySelector(selector){return selector==='.apple-home-page'?fakeHome:null}};
  const doc={
    readyState:'complete',documentElement:{lang:'fi'},
    getElementById(id){return id==='app'?app:null},
    body:{classList,appendChild(layer){active.push(layer);}},
    createElement(tag){
      assert.equal(tag,'div');
      const soundButton={listener:null,addEventListener(type,fn){if(type==='click')this.listener=fn},remove(){this.removed=true}};
      return {setAttribute(){},classList,innerHTML:'',isConnected:true,removed:false,querySelector(selector){return selector==='.rl-intro-sound'?soundButton:null},remove(){this.removed=true;},soundButton};
    },
    addEventListener(){}
  };
  const win={matchMedia(){return {matches:false}},AudioContext:AudioContextMock,
    addEventListener(){},setTimeout(){return 1;}};
  const context={window:win,document:doc,location:{pathname:'/',search:''},
    URLSearchParams,MutationObserver:class{observe(){}},
    clearTimeout(){},requestAnimationFrame(callback){callback();return 1}};
  vm.runInNewContext(logo,context);
  assert.equal(active.length,1,'one initial silent intro');
  assert.equal(audioContexts,0,'audio context must not be created on load');
  assert.equal(audioStarts,0,'no sound without touch gesture');
  assert.equal(typeof active[0].soundButton.listener,'function');
  active[0].soundButton.listener({preventDefault(){}});
  assert.equal(active.length,2,'tap restarts visual intro in sync with sound');
  assert.equal(active[0].removed,true);
  assert.equal(active[1].soundButton.removed,true,'no redundant replay button while sound is playing');
  assert.equal(audioContexts,1);
  assert.equal(audioStarts,4,'one soft whoosh and three synchronized tones');
});

test('chatbot shows the features destination only as a button',()=>{
  const start=server.indexOf('// First-party feature overview:');
  const end=server.indexOf('// Buying/subscribing questions',start);
  assert.ok(start>=0 && end>start);
  const featureCopy=server.slice(start,end);
  assert.doesNotMatch(featureCopy,/https:\/\/(?:www\.)?respondoai\.fi\/(?:ominaisuudet|funktioner|features)/);
  assert.match(featureCopy,/respondo-faq-features-overview/);
  assert.match(effects,/const used = new Set\(\)/);
  assert.match(effects,/displayedAnswer = answer\.replace/);
  assert.match(effects,/used\.has\(destination\.pathname\)/);
  assert.match(effects,/siteAssistantHistory\.push\(\{question:clean,answer:displayedAnswer\}\)/);
});
