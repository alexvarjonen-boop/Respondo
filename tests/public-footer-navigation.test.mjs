import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { publicFooterNavigationMarkup } from '../public/apple-nav.js';
import { spiralHeroMarkup } from '../public/spiral-hero.js';

const read = path => readFileSync(new URL('../public/'+path, import.meta.url), 'utf8');
const app=read('app.js'),styles=read('mobile-public-polish.css'),index=read('index.html');
const nav=app.slice(app.indexOf('function nav()'),app.indexOf('// The homepage CTA',app.indexOf('function nav()')));
const footer=app.slice(app.indexOf('function footer()'),app.indexOf('function heroVisual()',app.indexOf('function footer()')));
for (const [lang,idx] of [['fi',0],['sv',1],['en',2]]) {
  const tr=(...v)=>v[idx];
  test('public nav links move into the footer for '+lang,()=>{
    const html=publicFooterNavigationMarkup(tr,lang);
    const expected=['/','/asiakaspalvelubotti','/ominaisuudet','/assistant',
      '/verkkokauppa-chatbot','/ajanvaraus-chatbot','/hinnat',
      '/tietoturva','/yhteystiedot','/kirjaudu'];
    assert.equal((html.match(/<a href=/g)||[]).length,10);
    for(const route of expected)assert.ok(html.includes('href="'+route+(route==='/'?'':'?lang='+lang)+'"'),route);
    assert.match(html,/<nav class="footer-site-nav"/);
    assert.ok(footer.includes('publicFooterNavigationMarkup(appText,currentLang())'));
    const hero=spiralHeroMarkup(tr,lang);
    assert.ok(!hero.includes('data-respondo-hero-cta="signup"'));
    assert.ok(hero.includes('data-respondo-hero-cta="demo"'));
    assert.ok(hero.includes('/assistant?lang='+lang));
  });
}
test('public header is minimal and fullscreen menu is unmounted',()=>{
  assert.ok(nav.includes('${logo()}'));
  assert.ok(nav.includes('${languageSwitch()}'));
  assert.doesNotMatch(nav,/apple-menu-toggle|apple-nav-overlay|publicMenuMarkup|nav-home-scroll-trial/);
  assert.doesNotMatch(app,/bindPublicMenu\(/);
  assert.doesNotMatch(app,/bindHomeScrollTrial\(/);
});
test('pricing and signup fixes load last and preserve readable contrast',()=>{
  assert.ok(index.includes('/mobile-public-polish.css'));
  assert.ok(index.indexOf('/mobile-public-polish.css')>index.indexOf('/spiral-hero.css'));
  assert.match(styles,/\.r-brand-signup-intro h1/);
  assert.match(styles,/-webkit-text-fill-color:#f7f9fe!important/);
  assert.match(styles,/\.price-top > span:last-child/);
  assert.match(styles,/\.section-kicker/);
  assert.match(styles,/\.footer-site-links/);
  assert.doesNotMatch(nav,/data-apple-menu-open/);
});
