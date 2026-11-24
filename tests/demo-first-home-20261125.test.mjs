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
    assert.ok(html.includes('/yhteystiedot?intent=demo&amp;lang='+lang));
    assert.ok(html.includes('/assistant?lang='+lang));
    assert.equal((html.match(/data-rs-card\b/g)||[]).length,10);
    assert.ok(html.includes('id="pricing"'));
    assert.match(html,/rs-studio-orbit-art/);assert.match(html,/class="rs-book-demo"/);assert.doesNotMatch(html,/rs-product-journeys|\/tilaus/);
    assert.ok(html.startsWith(demoFirstHero(t,lang)));
    const pricing=seoPricingMarkup(lang);
    assert.match(pricing,/350/);assert.match(pricing,/200/);
    assert.doesNotMatch(pricing,/Advanced|Premium|Enterprise|\/tilaus/);
  });
}
test('homepage SSR, client and asset integration',()=>{
  const server=fs.readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
  const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
  const index=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
  assert.ok(server.includes('demoFirstHero((fi, sv, en)'));
  assert.ok(app.includes('appleHomeMarkup(appText,currentLang(),FEATURE_COUNT,pricingSection())'));
  assert.ok(app.includes('class="df-header-demo"'));
  assert.ok(index.includes('/demo-first-home.css'));
});
