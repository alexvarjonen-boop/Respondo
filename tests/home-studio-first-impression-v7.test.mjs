import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spiralHeroMarkup} from '../public/spiral-hero.js';
import {appleHomeMarkup} from '../public/apple-home.js';
const read=p=>readFileSync(new URL('../public/'+p,import.meta.url),'utf8');
for(const [lang,index,price] of [
 ['fi',0,'Paketit alk. 49 €/kk'],['sv',1,'Paket från 49 €/mån'],['en',2,'Plans from €49/month']
]){
 test('hero restored to one restrained CTA in '+lang,()=>{
  const t=(...s)=>s[index],h=spiralHeroMarkup(t,lang);
  assert.ok(h.includes(price));
  assert.ok(h.includes('href="#pricing"'));
  assert.equal(h.split('class="rs-first-order-link"').length-1,1);
  assert.ok(!h.includes('rs-hero-demo-link'));
  assert.ok(!h.includes('rs-hero-actions'));
  assert.ok(h.includes('RESPONDO AI <span aria-hidden="true">/</span> 24/7'));
  assert.equal(h.split('data-rs-card data-index').length-1,10);
  assert.equal(h.split('data-rs-icon data-index').length-1,10);
  const plans='<section id="pricing">Plans</section>';
  const page=appleHomeMarkup(t,lang,100,plans);
  assert.equal(page.split(plans).length-1,1);
  assert.ok(page.indexOf(plans)>page.indexOf('</section>'));
 });
}
test('focused visual repair preserves responsive site and plan buttons',()=>{
 const css=read('home-studio-v7.css'),html=read('index.html');
 for(const word of ['Observatory v9','.rs-first-order-link','max-width:600px','max-height:700px','prefers-reduced-motion:reduce'])
  assert.ok(css.includes(word),word);
 for(const word of ['@keyframes','scroll-snap-type','backdrop-filter'])
  assert.ok(!css.includes(word),word);
 assert.ok(html.includes('home-studio-v7.css?v='));
 assert.ok(html.includes('-mobile-simplify-v9'));
 assert.equal(css.split('{').length,css.split('}').length);
});
