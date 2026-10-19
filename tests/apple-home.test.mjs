import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { appleHomeMarkup } from '../public/apple-home.js';
import { respondoSiteNavigationActions } from '../respondo-site-navigation.mjs';

const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const styles=readFileSync(new URL('../public/apple-home.css',import.meta.url),'utf8');

for (const [index,lang,company] of [[0,'fi','Yrityksesi'],[1,'sv','Ditt företag'],[2,'en','Your company']]) {
  const t=(...translations)=>translations[index];
  test('homepage has only seven spiral cards, then pricing, in '+lang,()=>{
    const html=appleHomeMarkup(t,lang,145,'<section class="pricing-section" id="pricing">Plans</section>');
    assert.equal((html.match(/class="apple-feature-card /g)||[]).length,0);
    assert.equal((html.match(/data-rs-card\b/g)||[]).length,7);
    assert.ok(html.includes('class="apple-hero rs-spiral-section"'));
    assert.ok(html.includes('id="features"'));
    assert.ok(html.includes('class="rs-axis"'));
    assert.ok(!html.includes('data-respondo-hero-cta="signup"'));
    assert.doesNotMatch(html,/data-respondo-ask-form|data-respondo-ask-question|data-respondo-ask-status|rs-chat-entry/);
    assert.doesNotMatch(html,/apple-bottom-cta|Valmis vastaamaan|Aloita ilmainen kokeilu/);
    assert.ok(html.includes('class="pricing-section" id="pricing"'));
    assert.ok(html.indexOf('rs-spiral-section') < html.indexOf('class="pricing-section"'));
    assert.match(html, /class="rs-axis"[^>]*>[\s\S]*?<svg viewBox="0 0 256 256"/);
    assert.doesNotMatch(html, /apple-highlights|apple-lead-calculator|rg-growth-section/);
    assert.doesNotMatch(html, /<iframe|<canvas/);
    assert.doesNotMatch(html,/apple-learning-links|Mistä aloittaa tekoälyn kanssa/);
  });
  test('site directory is replaced by public assistant routes in '+lang,()=>{
    const footer=app.slice(app.indexOf('function footer()'),app.indexOf('function heroVisual()'));
    assert.doesNotMatch(footer,/publicFooterNavigationMarkup|footer-site-nav/);
    assert.doesNotMatch(footer,/data-open-site-assistant|footer-ask-respondo/);
    assert.ok(app.includes('class="public-header-login"'));
    const questions=[
      ['hinnat','/hinnat'],['yhteystiedot','/yhteystiedot'],
      ['tietoturva','/tietoturva'],['verkkokaupoille','/verkkokauppa-chatbot'],
      ['kirjaudu','/kirjaudu']
    ];
    for (const [question,path] of questions){
      const actions=respondoSiteNavigationActions(question,lang);
      assert.ok(actions.some(a=>new URL(a.url).pathname===path),question);
    }
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
