import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spiralHeroMarkup} from '../public/spiral-hero.js';
import {seoPricingMarkup} from '../public/seo-pricing-ssr.mjs';
const read=p=>readFileSync(new URL('../public/'+p,import.meta.url),'utf8');
for(const [lang,i,label] of [['fi',0,'Paketit alk. 49 €/kk'],['sv',1,'Paket från 49 €/mån'],['en',2,'Plans from €49/month']]){
  test('first-customer homepage clearly links to pricing while preserving the orbit and removed Ask CTA '+lang,()=>{
    const markup=spiralHeroMarkup((...v)=>v[i],lang);
    assert.ok(markup.includes(label));
    assert.match(markup,/class="rs-first-order-link" href="#pricing"/);
    assert.equal((markup.match(/data-rs-card\\b/g)||[]).length,10);
    assert.doesNotMatch(markup,/rs-hero-talk|data-open-site-assistant|Ask Respondo|data-respondo-hero-cta/);
  });
  test('crawlable pricing in '+lang+' lets every plan be ordered without client JavaScript',()=>{
    const html=seoPricingMarkup(lang);
    for(const code of ['basic','advanced','business']){
      assert.ok(html.includes('href="/tilaus?plan='+code+'_monthly&amp;lang='+lang+'"'),code+' monthly');
      assert.ok(html.includes('href="/tilaus?plan='+code+'_yearly&amp;lang='+lang+'"'),code+' yearly');
    }
    assert.ok(html.includes('href="/assistant'+(lang==='en'?'':'?lang='+lang)+'"'));
    assert.ok(html.includes('href="/yhteystiedot'+(lang==='en'?'':'?lang='+lang)+'"'));
  });
}
test('SPA checkout pricing paths, annual disclosure, and gentle alternate next actions are preserved',()=>{
  const app=read('app.js'),index=read('index.html'),css=read('home-observatory.css'),buyers=read('first-order.css');
  assert.match(app,/card\\('Advanced',49/);
  assert.match(app,/card\\('Premium',129/);
  assert.match(app,/card\\('Enterprise',149/);
  assert.match(app,/pricing-assist-links/);
  assert.match(index,/first-order\\.css\\?v=20261027-first-customer-v1/);
  assert.match(index,/app\\.js\\?v=[^"]+-first-order-v1/);
  assert.match(css,/rs-first-order-link/);
  assert.match(buyers,/seo-pricing-buy/);
  assert.doesNotMatch(buyers,/@keyframes|scroll-snap-type/);
});
