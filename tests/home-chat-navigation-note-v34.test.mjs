import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spiralHeroMarkup} from '../public/spiral-hero.js';
const read=(path)=>readFileSync(new URL('../public/'+path,import.meta.url),'utf8');

test('homepage explains how to navigate using the chat in Finnish, Swedish and English',()=>{
  for(const [lang,index,copy] of [
    ['fi',0,'Navigoi sivustolla oikean alakulman chatin kautta.'],
    ['sv',1,'Navigera på webbplatsen via chatten nere till höger.'],
    ['en',2,'Navigate this website using the chat in the bottom-right corner.']
  ]){
    const markup=spiralHeroMarkup((...languages)=>languages[index],lang);
    const hint='<p class="rs-chat-navigation-note">'+copy+'</p>';
    assert.ok(markup.includes(hint),lang);
    assert.ok(markup.indexOf(hint)>markup.indexOf('class="rs-first-order-link"'),lang);
    assert.equal((markup.match(/class="rs-first-order-link"/g)||[]).length,1);
    assert.ok(markup.includes('href="/assistant?lang='+lang+'"'));
  }
});
test('hint is lightweight, phone readable, with a fresh browser cache version',()=>{
  const css=read('home-finish-v13.css'),html=read('index.html');
  assert.match(css,/\.rs-chat-navigation-note/);
  assert.match(css,/@media\(max-width:600px\)/);
  assert.doesNotMatch(css,/@keyframes|scroll-snap-type/);
  assert.match(html,/home-finish-v13\.css\?v=[^"]*chat-navigation-note-v34/);
  assert.match(html,/app\.js\?v=[^"]*chat-navigation-note-v34/);
  assert.match(read('app.js'),/apple-home\.js\?v=[^']*chat-navigation-note-v34/);
  assert.match(read('apple-home.js'),/spiral-hero\.js\?v=[^']*chat-navigation-note-v34/);
});
