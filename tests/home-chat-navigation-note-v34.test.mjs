import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spiralHeroMarkup} from '../public/spiral-hero.js';
const read=(path)=>readFileSync(new URL('../public/'+path,import.meta.url),'utf8');

test('homepage links directly to all features in Finnish, Swedish and English',()=>{
  for(const [lang,index,copy] of [
    ['fi',0,'Katso kaikki ominaisuudet →'],
    ['sv',1,'Se alla funktioner →'],
    ['en',2,'Explore all features →']
  ]){
    const markup=spiralHeroMarkup((...languages)=>languages[index],lang);
    const hint='<a class="rs-chat-navigation-note" href="/ominaisuudet?lang='+lang+'">'+copy+'</a>';
    assert.ok(markup.includes(hint),lang);
    assert.ok(markup.indexOf(hint)>markup.indexOf('class="rs-first-order-link"'),lang);
    assert.equal((markup.match(/class="rs-first-order-link"/g)||[]).length,1);
    assert.ok(markup.includes('href="/assistant?lang='+lang+'"'));
  }
});
test('direct feature link is phone readable and browser cache is refreshed',()=>{
  const css=read('home-finish-v13.css'),html=read('index.html');
  assert.match(css,/\.rs-chat-navigation-note/);
  assert.match(css,/@media\(max-width:600px\)/);
  assert.match(css,/text-decoration:underline/);
  assert.doesNotMatch(css,/@keyframes|scroll-snap-type/);
  assert.match(html,/home-finish-v13\.css\?v=[^"]*chat-navigation-note-v34/);
  assert.match(html,/home-finish-v13\.css\?v=[^"]*direct-features-v35/);
  assert.match(html,/app\.js\?v=[^"]*chat-navigation-note-v34/);
  assert.match(html,/app\.js\?v=[^"]*feature-finder-v49-direct-features-v35/);
  assert.match(read('app.js'),/apple-home\.js\?v=[^']*chat-navigation-note-v34/);
  assert.match(read('app.js'),/apple-home\.js\?v=[^']*direct-features-v35/);
  assert.match(read('apple-home.js'),/spiral-hero\.js\?v=[^']*chat-navigation-note-v34/);
  assert.match(read('apple-home.js'),/spiral-hero\.js\?v=[^']*direct-features-v35/);
});
