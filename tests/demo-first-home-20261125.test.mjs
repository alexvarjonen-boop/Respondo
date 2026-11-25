import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { demoFirstHero, appleHomeMarkup } from '../public/apple-home.js';
import { seoPricingMarkup } from '../public/seo-pricing-ssr.mjs';

for (const [lang,label] of [['fi','Varaa demo'],['sv','Boka demo'],['en','Book a demo']]) {
  test('restored orbit and localized demo CTA: '+lang,()=>{
    const t=(fi,sv,en)=>({fi,sv,en})[lang];
    const html=appleHomeMarkup(t,lang,0,'<section id="pricing">350 / 200</section>');
    assert.equal((html.match(/<h1\b/g)||[]).length,1);
    assert.ok(html.includes(label));
    assert.match(html,/class="df-landing"/);
    assert.match(html,/class="rs-book-demo df-primary"/);
    assert.match(html,/class="df-phone"/);
    assert.match(html,/class="df-benefits"/);
    assert.doesNotMatch(html,/class="(?:df-secondary|rs-chat-navigation-note)"/);
    assert.match(html,/class="rs-first-order-link"/);
    assert.match(html,/class="rs-book-demo" href="\/tilaus\?plan=respondo_monthly/);
    assert.ok(html.includes('/yhteystiedot?intent=demo&amp;lang='+lang));
    assert.ok(html.includes('/assistant?lang='+lang));
    assert.equal((html.match(/data-rs-card\b/g)||[]).length,10);
    assert.ok(html.includes('id="pricing"'));
    assert.match(html,/rs-studio-orbit-art/);assert.match(html,/class="rs-book-demo df-primary"/);assert.match(html,/\/tilaus\?plan=respondo_monthly/);assert.doesNotMatch(html,/rs-product-journeys/);
    assert.ok(html.startsWith(demoFirstHero(t,lang)));
    const pricing=seoPricingMarkup(lang);
    assert.match(pricing,/350/);assert.match(pricing,/200/);
    assert.match(pricing,/\/tilaus\?plan=respondo_monthly/);assert.doesNotMatch(pricing,/Advanced|Premium|Enterprise/);
  });
}
test('homepage SSR, client and asset integration',()=>{
  const server=fs.readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
  const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
  const index=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
  assert.ok(server.includes('demoFirstHero((fi, sv, en)'));
  assert.ok(app.includes('appleHomeMarkup(appText,currentLang(),FEATURE_COUNT,pricingSection())'));
  const nav=app.slice(app.indexOf('function nav()'),app.indexOf('function bindHomeHeroActions()'));
  assert.doesNotMatch(nav,/df-header-demo|intent=demo|Book a demo|Varaa demo|Boka demo/);
  assert.match(nav,/languageSwitch\(\)/);
  assert.match(nav,/public-header-login/);
  assert.ok(index.includes('/demo-first-home.css'));
});
