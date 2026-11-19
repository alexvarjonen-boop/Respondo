import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spiralHeroMarkup} from '../public/spiral-hero.js';
const read=(path)=>readFileSync(new URL('../public/'+path,import.meta.url),'utf8');

test('homepage has only the bot CTA, not a features button, in all languages',()=>{
  for(const [lang,index] of [['fi',0],['sv',1],['en',2]]){
    const markup=spiralHeroMarkup((...languages)=>languages[index],lang);
    assert.equal((markup.match(/class="rs-first-order-link"/g)||[]).length,1,lang);
    assert.ok(markup.includes('href="/assistant?lang='+lang+'"'),lang);
    assert.doesNotMatch(markup,/rs-chat-navigation-note|Katso kaikki ominaisuudet|Se alla funktioner|Explore all features/,lang);
  }
});

test('homepage module cache is refreshed while dedicated feature pages remain available',()=>{
  const html=read('index.html'),app=read('app.js'),appleHome=read('apple-home.js');
  assert.match(html,/app\.js\?v=[^"]*20261119-hide-hero-features-link-v1/);
  assert.match(app,/apple-home\.js\?v=[^']*direct-features-v36-hide-hero-features-link/);
  assert.match(appleHome,/spiral-hero\.js\?v=[^']*direct-features-v36-hide-hero-features-link/);
  assert.match(app,/\/ominaisuudet/);
});
