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
    assert.equal((markup.match(/data-rs-card\b/g)||[]).length,10);
    const afterPricing=markup.slice(markup.indexOf(marker)+marker.length).trim();
    assert.equal(afterPricing,'', 'the homepage should end with pricing');
    assert.doesNotMatch(markup,/respondo-search-overview|respondo-search-links/);
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
  assert.match(footer,/href="\/tietosuoja\?lang=/);
  assert.match(footer,/href="\/kayttoehdot\?lang=/);
  assert.match(footer,/cookie-settings-link/);
  assert.match(footer,/class="legalbar"/);
  assert.match(index,/app\.js\?v=[^"]*header-login-v5/);
  assert.match(index,/mobile-public-polish\.css\?v=[^"]*header-login-v5/);
  assert.match(app,/apple-home\.js\?v=20261026-orbit10-v1/);
});


test('homepage hides the SEO product-link footer column while preserving legal links on other routes',()=>{
  const footer=app.slice(app.indexOf('function footer()'),app.indexOf('function heroVisual()'));
  assert.match(footer,/location\.pathname === '\/' \? ''/);
  assert.match(footer,/href="\/tekoaly-yrityksille\?lang=/);
  assert.match(footer,/href="\/verkkokauppa-chatbot\?lang=/);
  assert.match(footer,/href="\/tietosuoja\?lang=/);
  assert.match(index,/app\.js\?v=[^"]+-orbit10-v1-mobile-footer-pricing-v1/);
});

test('general pricing replies are exactly three localized monthly price lines',async()=>{
  const {respondoProductFaqMatch}=await import('../server.mjs');
  for (const [question,lang] of [
    ['Mitä paketit maksavat?','fi'],
    ['Mitä Respondo paketit maksavat?','fi'],
    ['Paljonko paketit maksavat?','fi'],
    ['Vad kostar abonnemangen?','sv'],
    ['What do the plans cost?','en']
  ]) {
    const result=respondoProductFaqMatch(question,lang,[]);
    assert.ok(result,'missing direct pricing FAQ for '+question);
    assert.equal(result.id,'respondo-faq-pricing','wrong intent for '+question);
    const expected={
      fi:'Advanced - 49€/kk\nPremium - 129€/kk\nEnterprise - 149€/kk',
      sv:'Advanced - 49 €/mån\nPremium - 129 €/mån\nEnterprise - 149 €/mån',
      en:'Advanced - €49/month\nPremium - €129/month\nEnterprise - €149/month'
    };
    assert.equal(result.answer,expected[lang]);
  }
});

test('explicit annual pricing keeps annual billing details; general monthly pricing does not',async()=>{
  const {respondoProductFaqMatch}=await import('../server.mjs');
  const monthly=respondoProductFaqMatch('Kuukausihinnat?', 'fi');
  assert.equal(monthly?.id,'respondo-faq-monthly-pricing');
  assert.equal(monthly?.answer,'Advanced - 49€/kk\nPremium - 129€/kk\nEnterprise - 149€/kk');
  const annual=respondoProductFaqMatch('Paljonko vuositilaus maksaa?', 'fi');
  assert.equal(annual?.id,'respondo-faq-annual-pricing');
  assert.match(annual?.answer||'',/39\s*€\/kk/);
  assert.match(annual?.answer||'',/vuosi/);
  const css=read('effects.css');
  assert.match(css,/#respondo-site-chat \.fx-chat-bubble\.bot \{ white-space: pre-line!important; \}/);
  assert.match(index,/effects\.css\?v=20261027-price-lines-v1/);
});
