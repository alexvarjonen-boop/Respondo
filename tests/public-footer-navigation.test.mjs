import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { respondoSiteNavigationActions } from '../respondo-site-navigation.mjs';
import { spiralHeroMarkup } from '../public/spiral-hero.js';

const read = path => readFileSync(new URL('../public/'+path, import.meta.url), 'utf8');
const app=read('app.js'),styles=read('mobile-public-polish.css'),index=read('index.html');
const nav=app.slice(app.indexOf('function nav()'),app.indexOf('// The homepage CTA',app.indexOf('function nav()')));
const footer=app.slice(app.indexOf('function footer()'),app.indexOf('function heroVisual()',app.indexOf('function footer()')));
for (const [lang,idx] of [['fi',0],['sv',1],['en',2]]) {
  const tr=(...v)=>v[idx];
  test('site pages move into Respondo assistant for '+lang,()=>{
    assert.doesNotMatch(footer,/publicFooterNavigationMarkup|footer-site-nav|footer-site-links/);
    assert.doesNotMatch(footer,/data-open-site-assistant|footer-ask-respondo/);
    assert.match(nav,/class="public-header-login"/);
    assert.match(footer,/cookie-settings-link/);
    const paths=['/','/asiakaspalvelubotti','/ominaisuudet','/assistant',
      '/verkkokauppa-chatbot','/ajanvaraus-chatbot','/hinnat',
      '/tietoturva','/yhteystiedot','/kirjaudu'];
    const questions=['etusivu','tuote','ominaisuudet','kokeile bottia',
      'verkkokauppa','ajanvaraus','hinnat','tietoturva','yhteystiedot','kirjaudu'];
    for (let n=0;n<paths.length;n++){
      const actions=respondoSiteNavigationActions(questions[n],lang);
      assert.ok(actions.length>0,questions[n]);
      const urls=actions.map(a=>new URL(a.url));
      assert.ok(urls.some(u=>u.pathname===(
        paths[n]==='/ominaisuudet'?(lang==='sv'?'/funktioner':lang==='en'?'/features':'/ominaisuudet'):paths[n]
      )),questions[n]);
    }
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
  assert.match(styles,/\.public-header-login/);
  assert.doesNotMatch(nav,/data-apple-menu-open/);
});
