import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const read=name=>readFileSync(new URL('../public/'+name,import.meta.url),'utf8');
const logo=read('logo-reveal.js'),css=read('logo-reveal.css'),html=read('index.html');
const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const effects=read('effects.js');

test('original cinematic arrow logo plays silently, with no sound control',()=>{
  assert.doesNotThrow(()=>new vm.Script(logo));
  const path=read('respondo-symbol.svg').match(/<path d="([^"]+)"/)?.[1];
  assert.ok(path&&logo.includes(path));
  assert.match(logo,/playIntro\(false\)/);
  assert.match(logo,/location\.pathname !== '\/'/);
  assert.match(logo,/prefers-reduced-motion: reduce/);
  assert.doesNotMatch(logo,/AudioContext|webkitAudioContext|playSound|stopSound|soundButton|rl-intro-sound|withSound/);
  assert.doesNotMatch(css,/\.rl-intro-sound/);
  assert.match(html,/logo-reveal\.js\?v=20261018-cinematic-silent-v5/);
  assert.match(html,/logo-reveal\.css\?v=20261018-cinematic-silent-v5/);
});

test('logo intro is not conditioned on any audio playback or user gesture',()=>{
  assert.match(logo,/sessionStorage\.setItem/);
  assert.match(logo,/aria-modal/);
  assert.match(logo,/clearOpening\(false\)/);
  assert.match(logo,/document\.body\.appendChild\(layer\)/);
  assert.doesNotMatch(logo,/new Audio\(|createOscillator|createBufferSource|playIntro\(true, true\)|Toista äänellä|Play with sound/);
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
