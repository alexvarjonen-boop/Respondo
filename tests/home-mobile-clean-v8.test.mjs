import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spiralHeroMarkup} from '../public/spiral-hero.js';
const read=path=>readFileSync(new URL('../public/'+path,import.meta.url),'utf8');
test('iPhone homepage has one main action and a secondary, calm text link',()=>{
 const styles=read('home-studio-v7.css');
 const mobile=styles.split('/* v8 mobile correction')[1]||'';
 assert.ok(mobile,'mobile correction must override former v7 same-row design');
 assert.match(mobile,/flex-direction:column/);
 assert.match(mobile,/min-height:44px/);
 assert.match(mobile,/\.rs-hero-demo-icon,[\s\S]*?\.rs-hero-demo-arrow\{\s*display:none!important;/);
 assert.doesNotMatch(mobile,/actions share one short row|flex-wrap:nowrap;margin-top:12px/);
 assert.match(mobile,/top:calc\(47% \+ 16px\)/);
 assert.match(mobile,/width:min\(59vw,245px\)/);
 assert.match(mobile,/@media\(max-width:600px\) and \(max-height:700px\)/);
 assert.match(styles,/@media\(prefers-reduced-motion:reduce\)/);
});
test('remove the extra assistant hint on small screens, preserve the actual chat launcher',()=>{
 const styles=read('home-studio-v7.css');
 assert.match(styles,/@media\(max-width:900px\)\{\s*body:has\(#app \.rs-spiral-section\) \.fx-chat-nav-hint:not\(\[hidden\]\)/);
 assert.doesNotMatch(styles,/\.fx-assistant-launch\s*\{\s*display:none/);
});
for(const [lang,index,pricing,demo] of [
 ['fi',0,'Paketit alk. 49 €/kk','Kokeile bottia'],
 ['sv',1,'Paket från 49 €/mån','Testa chatbotten'],
 ['en',2,'Plans from €49/month','Try the chatbot'],
]){
 test('all languages keep one real pricing button and one demo route '+lang,()=>{
  const markup=spiralHeroMarkup((...translations)=>translations[index],lang);
  assert.equal((markup.match(/class="rs-first-order-link"/g)||[]).length,1);
  assert.equal((markup.match(/class="rs-hero-demo-link"/g)||[]).length,1);
  assert.ok(markup.includes(pricing));
  assert.ok(markup.includes(demo));
  assert.ok(markup.includes('href="/assistant?lang='+lang+'"'));
  assert.match(markup,/href="#pricing"/);
  assert.equal((markup.match(/data-rs-card\b/g)||[]).length,10);
  assert.equal((markup.match(/data-rs-icon(?=\s)/g)||[]).length,10);
 });
}
test('production HTML busts stale iOS CSS cache without replacing the site design',()=>{
 const html=read('index.html'),css=read('home-studio-v7.css');
 assert.match(html,/home-studio-v7\.css\?v=20261027-premium-first-impression-v7-mobile-clean-v8/);
 assert.doesNotMatch(css,/scroll-snap-type|setInterval|@keyframes/);
 assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});
