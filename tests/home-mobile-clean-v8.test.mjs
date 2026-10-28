import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spiralHeroMarkup} from '../public/spiral-hero.js';
const read=p=>readFileSync(new URL('../public/'+p,import.meta.url),'utf8');
test('iPhone uses one clean pricing link and a smaller centered orbit',()=>{
 const css=read('home-studio-v7.css');
 for(const part of ['Observatory v9','background:none!important','border-radius:0!important',
   '@media(max-width:600px)','top:50%;width:min(61vw,245px)',
   '@media(max-width:600px) and (max-height:700px)',
   '@media(prefers-reduced-motion:reduce)']) assert.ok(css.includes(part),part);
 for(const forbidden of ['rs-hero-actions','rs-hero-demo-link','@keyframes','scroll-snap-type'])
   assert.ok(!css.includes(forbidden),forbidden);
});
test('real chat launcher stays, while injected navigation guide disappears',()=>{
 const effects=read('effects.js'),styles=read('chat-first-home.css');
 assert.ok(effects.includes('class="fx-assistant-launch"'));
 assert.ok(effects.includes("launch.addEventListener('click'"));
 assert.ok(!effects.includes('fx-chat-nav-hint'));
 assert.ok(!effects.includes('Ask the bot to navigate'));
 assert.ok(!styles.includes('fx-chat-nav-hint'));
});
for(const [lang,index,pricing] of [
 ['fi',0,'Paketit alk. 49 €/kk'],['sv',1,'Paket från 49 €/mån'],['en',2,'Plans from €49/month']
]){
 test('localized hero keeps exactly one main link '+lang,()=>{
  const hero=spiralHeroMarkup((...t)=>t[index],lang);
  assert.equal(hero.split('class="rs-first-order-link"').length-1,1);
  assert.ok(hero.includes('href="#pricing"'));
  assert.ok(hero.includes(pricing));
  for(const unexpected of ['rs-hero-actions','rs-hero-demo-link','rs-hero-demo-icon','<span aria-hidden="true">↗'])
    assert.ok(!hero.includes(unexpected),unexpected);
  assert.equal(hero.split('data-rs-card data-index').length-1,10);
  assert.equal(hero.split('data-rs-icon data-index').length-1,10);
 });
}
test('index busts Safari assets, including both nested ES module imports',()=>{
 const html=read('index.html'),css=read('home-studio-v7.css');
 for(const asset of ['home-studio-v7.css','chat-first-home.css','effects.js','app.js']){
   const start=html.indexOf('/'+asset+'?v=');
   assert.ok(start>=0,asset);
   const assetUrl=html.slice(start,html.indexOf('"',start));
   if(asset==='app.js'){
     assert.ok(assetUrl.includes('-dashboard-entry-v1-all-sections-v3-first-viewport-v4'),asset);
     assert.ok(assetUrl.includes('-first-screen-actions-v5') && assetUrl.includes('-dashboard-brand-v7') && assetUrl.includes('-dashboard-ui-v9') && assetUrl.includes('-polish-v11') && assetUrl.includes('-hero-clarity-v17') && assetUrl.includes('-footer-rights-v18') && assetUrl.endsWith('-demo-v21-guided-prod-v22-public-demo-wizard-v23'),asset);
   } else assert.ok(assetUrl.endsWith('-mobile-simplify-v9'),asset);
 }
 assert.ok(read('app.js').includes('-mobile-simplify-v9'));
 assert.ok(read('apple-home.js').includes('-mobile-simplify-v9'));
 assert.equal(css.split('{').length,css.split('}').length);
});
