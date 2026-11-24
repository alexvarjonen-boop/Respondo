import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {demoFirstHero} from '../public/apple-home.js';
import {seoPricingMarkup} from '../public/seo-pricing-ssr.mjs';
const read=p=>readFileSync(new URL('../public/'+p,import.meta.url),'utf8');
for(const [lang,i,label] of [['fi',0,'Varaa demo'],['sv',1,'Boka demo'],['en',2,'Book a demo']]){
  test('demo-first homepage has booking and public bot actions '+lang,()=>{
    const markup=demoFirstHero((...v)=>v[i],lang);
    assert.ok(markup.includes(label));
    assert.ok(markup.includes('/yhteystiedot?intent=demo&amp;lang='+lang));
    assert.ok(markup.includes('/assistant?lang='+lang));
    assert.doesNotMatch(markup,/rs-hero-talk|data-open-site-assistant|Ask Respondo|rs-spiral/);
  });
  test('crawlable pricing displays one offer and safe demo path '+lang,()=>{
    const html=seoPricingMarkup(lang);
    assert.match(html,/350/);assert.match(html,/200/);
    assert.ok(html.includes('/yhteystiedot?intent=demo&amp;lang='+lang));
    assert.doesNotMatch(html,/\/tilaus|Advanced|Premium|Enterprise/);
  });
}
test('public pricing avoids legacy checkout while billing migration is pending',()=>{
  const app=read('app.js'),index=read('index.html'),css=read('demo-first-home.css');
  const pricing=app.slice(app.indexOf('function pricingSection()'),app.indexOf('function bindPricingPeriodSwitch()'));
  assert.match(pricing,/350/);assert.match(pricing,/200/);
  assert.match(pricing,/intent=demo/);assert.doesNotMatch(pricing,/\/tilaus|pricing-period-option/);
  assert.match(index,/demo-first-home\.css/);
  assert.match(css,/focus-visible/);assert.doesNotMatch(css,/@keyframes|scroll-snap-type/);
});
