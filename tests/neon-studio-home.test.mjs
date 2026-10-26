import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spiralHeroMarkup} from '../public/spiral-hero.js';
import {appleHomeMarkup} from '../public/apple-home.js';
import {FEATURE_COUNT} from '../public/features-data.js';

const read = name => readFileSync(new URL('../public/' + name,import.meta.url),'utf8');

for (const lang of ['fi','sv','en']) {
  test('reference-film homepage keeps real content and no SEO text wall in ' + lang,()=>{
    const t=(fi,sv,en)=>({fi,sv,en})[lang];
    const hero=spiralHeroMarkup(t,lang);
    const page=appleHomeMarkup(t,lang,100,'<section class="pricing-section" id="pricing">Real plans</section>');
    assert.equal((hero.match(/data-rs-card\b/g)||[]).length,10);
    assert.equal((hero.match(/class="rs-studio-orbit-icon\b/g)||[]).length,10);
    assert.equal((hero.match(/class="rs-studio-card-art\b/g)||[]).length,10);
    assert.equal((hero.match(/data-rs-icon(?=\s)/g)||[]).length,10);
    assert.equal((hero.match(/data-rs-icon-label=/g)||[]).length,10);
    assert.match(hero,/--rs-scroll-height:1000svh/);
    assert.ok(hero.includes('>'+FEATURE_COUNT+'</div>'));
    assert.ok(FEATURE_COUNT>=140,'feature number must match the real documented count');
    assert.ok(hero.includes(t('Ominaisuudet samassa palvelussa.','Funktioner i samma tjänst.','Features in one platform.')));
    assert.ok(hero.includes(t('Tiedot suoraan sivustolta.','Information direkt från webbplatsen.','Knowledge from your website.')));
    assert.ok(hero.includes(t('Ajanvaraus chatissa.','Bokning i chatten.','Bookings in chat.')));
    assert.equal((hero.match(/<svg width="28" height="20"/g)||[]).length,3);
    assert.match(hero,/class="rs-studio-grid"/);
    assert.match(hero,/class="rs-studio-orbit-art"/);
    assert.match(hero,/rs-spiral-section/);
    assert.match(hero,/data-rs-announcement/);
    assert.ok(hero.includes(t('Kysy Respondolta hinnat','Fråga Respondo om priser','Ask Respondo about pricing')));
    assert.ok(page.indexOf('rs-spiral-section')<page.indexOf('Real plans'));
    assert.doesNotMatch(page,/respondo-search-overview|respondo-search-links|AI-asiakaspalvelija yrityksen verkkosivuille/);
    assert.doesNotMatch(page,/<canvas|<iframe|<script/i);
    assert.doesNotMatch(page,/Yodixa|Xezcreative/i);
  });
}

test('original navy Respondo palette and orbit motion are home-only',()=>{
  const css=read('studio-home.css');
  const index=read('index.html');
  const app=read('app.js');
  const apple=read('apple-home.js');
  const js=read('spiral-hero-motion.js');
  assert.match(css,/#app \.apple-home-page/);
  assert.match(css,/#05070d/);
  assert.match(css,/--rs-film-blue:#a9ccff/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(css,/\.rs-studio-orbit-art/);
  assert.match(css,/\.pricing-section/);
  assert.doesNotMatch(css,/#030b09|#72f5bd|#a4ffdb|#8aefc2|#8deec1/i);
  assert.doesNotMatch(css,/#app \.dashboard-page|\.workspace-page/);
  assert.match(index,/studio-home\.css\?v=20261026-orbit10-v1/);
  assert.match(index,/spiral-hero-motion\.js\?v=20261026-orbit10-v1/);
  assert.match(index,/app\.js\?v=[^"]+-orbit10-v1/);
  assert.match(app,/apple-home\.js\?v=20261026-orbit10-v1/);
  assert.match(apple,/spiral-hero\.js\?v=20261026-orbit10-v1/);
  assert.match(js,/--rs-orbit-spin/);
  assert.match(js,/--rs-grid-scale/);
  assert.match(js,/--rs-panel-turn/);
  assert.match(js,/requestAnimationFrame\(draw\)/);
});

test('real pricing checkout and first-party assistant remain unchanged',()=>{
 const app=read('app.js');
 const js=read('spiral-hero-motion.js');
 assert.match(app,/appleHomeMarkup\(appText,currentLang\(\),FEATURE_COUNT,pricingSection\(\)\)/);
 assert.match(app,/function bindPricingPeriodSwitch/);
 assert.match(app,/function pricingSection/);
 assert.match(app,/href="\/tilaus\?plan=\$\{code\}_monthly/);
 assert.match(js,/prefers-reduced-motion: reduce/);
 assert.doesNotMatch(js,/scrollTo\(|preventDefault\(|setInterval\(/);
});

test('SSR homepage first paint is the cinematic Respondo scene, not SEO link wall',()=>{
  const server = readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
  assert.ok(server.includes('spiralHeroMarkup((fi, sv, en)'));
  assert.match(server,/homepageFirstPaint/);
  assert.doesNotMatch(server,/homeSearchMarkup/);
  assert.match(server,/X-Respondo-Homepage/);
  assert.match(server,/CDN-Cache-Control/);
});
