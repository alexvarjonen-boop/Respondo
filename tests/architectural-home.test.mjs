import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spiralHeroMarkup} from '../public/spiral-hero.js';

const source=(name)=>readFileSync(new URL('../public/'+name,import.meta.url),'utf8');

for (const [lang,index] of [['fi',0],['sv',1],['en',2]]) {
  test('architectural homepage keeps all seven chapters in '+lang,()=>{
    const t=(...translations)=>translations[index];
    const hero=spiralHeroMarkup(t,lang);
    assert.match(hero,/data-ra-design="architectural"/);
    assert.match(hero,/data-ra-scene="support"/);
    assert.match(hero,/class="ra-room"/);
    assert.match(hero,/class="ra-console"/);
    assert.match(hero,/class="ra-panel-support"/);
    assert.match(hero,/class="ra-panel-knowledge"/);
    assert.match(hero,/class="ra-panel-languages"/);
    assert.match(hero,/class="ra-panel-growth"/);
    assert.equal((hero.match(/data-ra-tab=/g)||[]).length,4);
    assert.equal((hero.match(/data-rs-card/g)||[]).length,7);
    assert.match(hero,/data-rs-announcement/);
    assert.match(hero,/aria-hidden="true"/);
    assert.doesNotMatch(hero,/<canvas|<iframe|data-respondo-ask-form/);
    assert.match(hero,lang==='en'?/Reimagined\./:lang==='fi'?/Uudelleen ajateltuna\./:/Nytänkande\./);
  });
}
test('showroom is isolated from pricing and workspace pages',()=>{
  const css=source('ra-architectural-home.css');
  const js=source('ra-architectural-home.js');
  const html=source('index.html');
  const home=source('apple-home.js');
  assert.match(css,/#app \.rs-spiral-section\[data-ra-design="architectural"\]/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(js,/fetch\(|WebSocket|setInterval\(/);
  assert.match(js,/if \(location\.pathname !== '\/'\) return/);
  assert.match(js,/scrollY \+ rect\.top/);
  assert.match(html,/ra-architectural-home\.css\?v=20261026/);
  assert.match(html,/ra-architectural-home\.js\?v=20261026/);
  assert.match(home,/\$\{pricingMarkup\}/);
});
