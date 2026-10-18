import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spiralHeroMarkup } from '../public/spiral-hero.js';

const file=name=>readFileSync(new URL('../public/'+name,import.meta.url),'utf8');
const html=file('index.html'),app=file('app.js'),home=file('apple-home.js');
const css=file('mobile-public-polish.css');
const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');

for (const [lang,index] of [['fi',0],['sv',1],['en',2]]) {
  test('spiral CTA only offers bot demo in '+lang,()=>{
    const markup=spiralHeroMarkup((...translations)=>translations[index],lang);
    const actions=markup.match(/<div class="apple-hero-actions rs-hero-actions">([\s\S]*?)<\/div>/)?.[1]||'';
    assert.ok(actions,'hero actions present');
    assert.match(actions,/data-respondo-hero-cta="demo"/);
    assert.match(actions,new RegExp('href="/assistant\\?lang='+lang+'"'));
    assert.doesNotMatch(actions,/data-respondo-hero-cta="signup"|\/tilaus|Kokeile 3 päivää ilmaiseksi|Prova gratis i 3 dagar|Try free for 3 days/);
    assert.equal((actions.match(/<a /g)||[]).length,1);
  });
}
test('all three cached module levels change when the spiral CTA changes',()=>{
  assert.match(home,/spiral-hero\.js\?v=20261018-demo-only-v4/);
  assert.match(app,/apple-home\.js\?v=20261018-demo-only-v4/);
  assert.match(html,/app\.js\?v=[^"]+-demo-only-v4/);
  assert.match(html,/mobile-public-polish\.css\?v=20261018-demo-only-v4/);
  assert.match(css,/rs-hero-actions a\[data-respondo-hero-cta="signup"\]\{display:none!important\}/);
  assert.match(server,/filePath\.endsWith\('apple-home\.js'\)/);
  assert.match(server,/filePath\.endsWith\('spiral-hero\.js'\)/);
});
