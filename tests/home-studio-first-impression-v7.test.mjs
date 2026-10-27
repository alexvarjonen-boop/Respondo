import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spiralHeroMarkup} from '../public/spiral-hero.js';
import {appleHomeMarkup} from '../public/apple-home.js';
const read=p=>readFileSync(new URL('../public/'+p,import.meta.url),'utf8');
for(const [lang,idx,demo,pricing] of [
 ['fi',0,'Kokeile bottia','Paketit alk. 49 €/kk'],
 ['sv',1,'Testa chatbotten','Paket från 49 €/mån'],
 ['en',2,'Try the chatbot','Plans from €49/month'],
]){
 test('homepage v7 balances real demo and pricing actions in '+lang,()=>{
   const t=(...s)=>s[idx],m=spiralHeroMarkup(t,lang);
   assert.match(m,/class="rs-hero-actions"/);
   assert.ok(m.includes('href="/assistant?lang='+lang+'"'));
   assert.ok(m.includes('href="#pricing"'));
   assert.ok(m.includes(demo));assert.ok(m.includes(pricing));
   assert.equal((m.match(/data-rs-icon(?=\s)/g)||[]).length,10);
   assert.equal((m.match(/data-rs-card\b/g)||[]).length,10);
   assert.match(m,/RESPONDO AI <span aria-hidden="true">\/<\/span> 24\/7/);
   assert.doesNotMatch(m,/rs-hero-talk|data-open-site-assistant|Ask Respondo|data-respondo-ask-form/);
   const page=appleHomeMarkup(t,lang,100,'<section id="pricing">Plans</section>');
   assert.equal(page.split('<section id="pricing">Plans</section>').length-1,1);
   assert.equal(page.slice(page.indexOf('</section>')+10,page.indexOf('<section id="pricing">')).trim(),'');
 });
}
test('homepage v7 styles scope to Respondo and respect mobile and reduced motion',()=>{
 const css=read('home-studio-v7.css'),html=read('index.html');
 assert.match(css,/#app \.apple-home-page \.rs-spiral-heading \.rs-hero-actions/);
 assert.match(css,/@media\(max-width:600px\)/);
 assert.match(css,/@media\(max-width:340px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.doesNotMatch(css,/@keyframes|scroll-snap-type|backdrop-filter/);
 assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
 assert.match(html,/home-studio-v7\.css\?v=20261027-premium-first-impression-v7/);
 assert.match(html,/app\.js\?v=[^"]*-studio-v7/);
 assert.match(read('apple-home.js'),/spiral-hero\.js\?v=[^']*-studio-v7/);
 assert.match(read('app.js'),/apple-home\.js\?v=[^']*-studio-v7/);
});
