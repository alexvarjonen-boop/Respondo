import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spiralHeroMarkup } from '../public/spiral-hero.js';

const file=name=>readFileSync(new URL('../public/'+name,import.meta.url),'utf8');
const html=file('index.html'),app=file('app.js'),home=file('apple-home.js');
const css=file('mobile-public-polish.css');
const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');

for (const [lang,index] of [['fi',0],['sv',1],['en',2]]) {
  test('spiral invites the visitor to ask the existing site chatbot in '+lang,()=>{
    const markup=spiralHeroMarkup((...translations)=>translations[index],lang);
    assert.match(markup,/data-respondo-ask-form/);
    assert.match(markup,/id="respondo-home-question"/);
    assert.equal((markup.match(/data-respondo-ask-question=/g)||[]).length,3);
    assert.doesNotMatch(markup,/data-respondo-hero-cta="signup"|data-respondo-hero-cta="demo"/);
  });
}
test('all three cached module levels change when the spiral CTA changes',()=>{
  assert.match(home,/spiral-hero\.js\?v=20261019-chat-first-v1/);
  assert.match(app,/apple-home\.js\?v=20261019-chat-first-v1/);
  assert.match(html,/app\.js\?v=[^"]+-chat-first-home-20261019-v1/);
  assert.match(html,/mobile-public-polish\.css\?v=20261018-demo-only-v4/);
  assert.match(css,/rs-hero-actions a\[data-respondo-hero-cta="signup"\]\{display:none!important\}/);
  assert.match(server,/filePath\.endsWith\('apple-home\.js'\)/);
  assert.match(server,/filePath\.endsWith\('spiral-hero\.js'\)/);
});
