import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {appleHomeMarkup} from '../public/apple-home.js';

const read=(path)=>readFileSync(new URL('../public/'+path,import.meta.url),'utf8');
const app=read('app.js');
const css=read('mobile-public-polish.css');
const index=read('index.html');

for(const [lang,indexLang] of [['fi',0],['sv',1],['en',2]]){
  test('homepage ends at pricing without extra trial CTA for '+lang,()=>{
    const tx=(...args)=>args[indexLang];
    const marker='<section id="pricing" class="pricing-section">Plan</section>';
    const markup=appleHomeMarkup(tx,lang,7,marker);
    assert.ok(markup.includes('rs-spiral-section'));
    assert.ok(markup.includes(marker));
    assert.equal((markup.match(/data-rs-card\b/g)||[]).length,7);
    assert.equal(markup.slice(markup.indexOf(marker)+marker.length).trim(),'');
    assert.doesNotMatch(markup,/apple-bottom-cta|Valmis vastaamaan|Aloita ilmainen kokeilu|Ready for your first conversation/);
  });
}
test('public header offers sign-in directly and keeps the language selector',()=>{
  const nav=app.slice(app.indexOf('function nav()'),app.indexOf('function bindHomeHeroActions()'));
  assert.match(nav,/class="container navin public-simple-navin"/);
  assert.match(nav,/\$\{logo\(\)\}/);
  assert.match(nav,/\$\{languageSwitch\(\)\}/);
  assert.match(nav,/class="public-header-login"/);
  assert.match(nav,/href="\/kirjaudu\?lang=\$\{currentLang\(\)\}"/);
  assert.match(nav,/appText\('Kirjaudu','Logga in','Log in'\)/);
  assert.doesNotMatch(nav,/apple-menu-toggle|publicMenuMarkup/);
  assert.match(css,/grid-template-columns:minmax\(0,1fr\) auto minmax\(0,1fr\)/);
  assert.match(css,/\.public-simple-navin > \.public-header-login/);
  assert.match(css,/@media\(max-width:680px\)/);
});
test('footer ends after standard product company legal information',()=>{
  const footer=app.slice(app.indexOf('function footer()'),app.indexOf('function heroVisual()'));
  assert.doesNotMatch(footer,/footer-ask-respondo|footer-chat-open|data-open-site-assistant/);
  assert.match(footer,/href="\/tietosuoja"/);
  assert.match(footer,/href="\/kayttoehdot"/);
  assert.match(footer,/cookie-settings-link/);
  assert.match(footer,/class="legalbar"/);
  assert.match(index,/app\.js\?v=[^"]*header-login-v5/);
  assert.match(index,/mobile-public-polish\.css\?v=[^"]*header-login-v5/);
  assert.match(app,/apple-home\.js\?v=20261020-language-flags-v1/);
});
