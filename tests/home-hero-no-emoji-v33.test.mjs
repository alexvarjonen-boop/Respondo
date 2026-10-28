import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spiralHeroMarkup} from '../public/spiral-hero.js';

const file=(name)=>readFileSync(new URL('../public/'+name,import.meta.url),'utf8');

test('homepage Try the bot action renders without an arrow emoji or pseudo glyph',()=>{
  const css=file('home-finish-v13.css');
  const index=file('index.html');
  assert.doesNotMatch(css,/rs-first-order-link::after/);
  assert.match(index,/home-finish-v13\.css\?v=[^"]*cta-no-arrow-v33/);
  for(const [lang,i,copy] of [['fi',0,'Kokeile bottia'],['sv',1,'Testa botten'],['en',2,'Try the bot']]){
    const hero=spiralHeroMarkup((...labels)=>labels[i],lang);
    const link=hero.match(/<a class="rs-first-order-link"[^>]*>[\s\S]*?<\/a>/)?.[0]||'';
    assert.ok(link.includes('href="/assistant?lang='+lang+'"'));
    assert.ok(link.includes('<span>'+copy+'</span>'));
    assert.doesNotMatch(link,/↗|➡️|🔗|🔼|⬆️|<img|<svg/);
  }
});
