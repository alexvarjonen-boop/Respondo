import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { appleHomeMarkup } from '../public/apple-home.js';
import { publicMenuMarkup } from '../public/apple-nav.js';

const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const styles=readFileSync(new URL('../public/apple-home.css',import.meta.url),'utf8');

for (const [index,lang,company] of [[0,'fi','Yrityksesi'],[1,'sv','Ditt företag'],[2,'en','Your company']]) {
  const t=(...translations)=>translations[index];
  test('homepage renders three primary feature cards and seven helix cards in '+lang,()=>{
    const html=appleHomeMarkup(t,lang,145);
    assert.equal((html.match(/class="apple-feature-card /g)||[]).length,3);
    assert.equal((html.match(/data-rs-card\b/g)||[]).length,7);
    assert.ok(html.includes('class="apple-hero rs-spiral-section"'));
    assert.ok(html.includes('class="rs-axis"'));
    assert.ok(html.includes('data-respondo-hero-cta="signup"'));
    assert.ok(html.includes('/assistant?lang='+lang));
    assert.ok(html.includes('/ominaisuudet?lang='+lang));
    assert.ok(html.includes('href="/tilaus"'));
    assert.match(html, /class="apple-orbit-core"><svg[^>]*viewBox="0 0 256 256"/);
    assert.doesNotMatch(html, /class="apple-orbit-core"><img/);
    assert.doesNotMatch(html, /class="apple-orbit-core"><svg[^>]*<rect/);
    assert.doesNotMatch(html, /class="apple-orbit-core">R<\/div>/);
    assert.doesNotMatch(html,/<iframe|<canvas/);
    assert.doesNotMatch(html,/apple-learning-links|Mistä aloittaa tekoälyn kanssa/,'guide promo should not appear on the homepage');
  });
  test('fullscreen menu keeps every secondary route accessible in '+lang,()=>{
    const html=publicMenuMarkup(t,lang);
    assert.equal((html.match(/class="apple-menu-links"/g)||[]).length,1);
    assert.ok(html.includes('/hinnat?lang='+lang));
    assert.ok(html.includes('/yhteystiedot?lang='+lang));
    assert.ok(html.includes('/tietoturva?lang='+lang));
    assert.ok(html.includes('/verkkokauppa-chatbot?lang='+lang));
    assert.ok(html.includes('/kirjaudu?lang='+lang));
    assert.match(html,/aria-hidden="true" inert/);
    assert.doesNotMatch(html,/apple-menu-language|apple-menu-lang-buttons|data-lang-button=/, 'language controls belong only in the header');
    assert.ok(!html.includes('↗'), 'fullscreen navigation should display labels without arrow icons');
  });
}

test('public header retains its language switch',()=>{
  const nav=app.slice(app.indexOf('function nav()'),app.indexOf('\nfunction bindHomeHeroActions()',app.indexOf('function nav()')));
  assert.match(nav,/\$\{languageSwitch\(\)\}/);
});

test('homepage remains compact while dedicated routes retain pricing and contact functionality',()=>{
  const start=app.indexOf('async function home()');
  const end=app.indexOf('\n\nfunction signup()',start);
  const home=app.slice(start,end);
  assert.ok(start>=0 && end>start);
  assert.match(home,/appleHomeMarkup\(appText,currentLang\(\),FEATURE_COUNT,pricingSection\(\)\)/);
  assert.doesNotMatch(home,/contactSection\(\)|calculatorSection\(\)/);
  assert.match(app,/path === '\/hinnat'/);
  assert.match(app,/path === '\/yhteystiedot'/);
  assert.ok(server.includes("'/hinnat'"));
  assert.ok(server.includes("'/yhteystiedot'"));
  assert.match(styles,/@media\(max-width:520px\)/);
  assert.match(styles, /prefers-reduced-motion:reduce/);
});
