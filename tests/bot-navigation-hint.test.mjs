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
    assert.equal((hero.match(/data-rs-card\b/g)||[]).length,10);
  }
  assert.doesNotMatch(index,/\/chat-first-home\.js\?v=/);
});
test('real assistant launches without the floating arrow and extra navigation text',()=>{
  assert.ok(!effects.includes('fx-chat-nav-hint'));
  assert.ok(!effects.includes('Ask the bot to navigate'));
  assert.ok(!effects.includes('Kysy botilta ja siirry sivuille'));
  assert.ok(!effects.includes('Fråga botten för att navigera'));
  assert.ok(effects.includes('fx-assistant-launch'));
  assert.ok(effects.includes("launch.addEventListener('click'"));
  assert.ok(effects.includes("launch.setAttribute('aria-expanded','true')"));
  assert.ok(effects.includes('[data-open-site-assistant]'));
  assert.ok(!styles.includes('fx-chat-nav-hint'));
  assert.ok(styles.includes('.pricing-wrap'));
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
  assert.match(read('app.js'),/apple-home\.js\?v=20261026-orbit10-v1/);
  assert.match(read('apple-home.js'),/spiral-hero\.js\?v=20261026-orbit10-v1/);
});
