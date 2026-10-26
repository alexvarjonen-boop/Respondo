import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spiralHeroMarkup} from '../public/spiral-hero.js';
import {respondoSiteNavigationActions} from '../respondo-site-navigation.mjs';

const read=(name)=>readFileSync(new URL('../public/'+name,import.meta.url),'utf8');
const effects=read('effects.js'),styles=read('chat-first-home.css'),index=read('index.html');

test('homepage has no duplicate chat form or navigation pill box',()=>{
  for(const [lang,n] of [['fi',0],['sv',1],['en',2]]){
    const hero=spiralHeroMarkup((...args)=>args[n],lang);
    assert.doesNotMatch(hero,/rs-chat-entry|data-respondo-ask-form|respondo-home-question|rs-chat-suggestions|data-respondo-ask-question/);
    assert.equal((hero.match(/data-rs-card\b/g)||[]).length,7);
  }
  assert.doesNotMatch(index,/\/chat-first-home\.js\?v=/);
});
test('animated, accessible bot navigation arrow points at the actual chat launcher',()=>{
  assert.match(effects,/<button class="fx-chat-nav-hint" type="button" aria-controls="respondo-site-chat"/);
  assert.match(effects,/Ask the bot to navigate/);
  assert.match(effects,/Kysy botilta ja siirry sivuille/);
  assert.match(effects,/Fråga botten för att navigera/);
  assert.match(effects,/navHint\?\.addEventListener\('click', open\)/);
  assert.match(effects,/navHint\?\.setAttribute\('hidden',''\)/);
  assert.match(effects,/fx-assistant-launch/);
  assert.match(styles,/body:has\(#app \.rs-spiral-section\) \.fx-chat-nav-hint:not\(\[hidden\]\)/);
  assert.match(styles,/@keyframes fx-chat-nav-point/);
  assert.match(styles,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(styles,/\.pricing-wrap/);
});
test('assistant exposes valid navigation destinations in English, Finnish and Swedish',()=>{
  for(const lang of ['en','fi','sv']){
    for(const [message,path] of [['Pricing','/hinnat'],['Features',lang==='fi'?'/ominaisuudet':lang==='sv'?'/funktioner':'/features'],['Get started','/tilaus']]){
      const actions=respondoSiteNavigationActions(message,lang);
      assert.ok(actions.some(a=>new URL(a.url).pathname===path),lang+' '+message+' '+path);
    }
  }
  assert.match(effects,/Array\.isArray\(data\.actions\)/);
  assert.match(effects,/allowedPaths = new Set/);
});
test('changed UI modules are cache-busted at each nested import level',()=>{
  assert.match(index,/\/chat-first-home\.css\?v=[^"]+-20261019-bot-navigation-hint-v1/);
  assert.match(index,/\/effects\.js\?v=[^"]+-20261019-bot-navigation-hint-v1/);
  assert.match(index,/\/app\.js\?v=[^"]+-20261019-bot-navigation-hint-v1/);
  assert.match(read('app.js'),/apple-home\.js\?v=20261026-cinematic-blue-no-seo-v1/);
  assert.match(read('apple-home.js'),/spiral-hero\.js\?v=20261021-fullscreen-chapters-v1/);
});
