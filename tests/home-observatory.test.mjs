import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spiralHeroMarkup} from '../public/spiral-hero.js';
import {appleHomeMarkup} from '../public/apple-home.js';

const read = (p) => readFileSync(new URL('../public/'+p,import.meta.url),'utf8');
const theme = read('home-observatory.css');
const motion = read('spiral-hero-motion.js');
const html = read('index.html');
const app = read('app.js');
const apple = read('apple-home.js');
const effects = read('effects.js');

for (const [lang,idx] of [['fi',0],['sv',1],['en',2]]) {
  test('Observatory hero stays clean without extra Ask Respondo button in '+lang,()=>{
    const t=(...args)=>args[idx];
    const hero=spiralHeroMarkup(t,lang);
    const page=appleHomeMarkup(t,lang,145,'<section id="pricing">REAL PRICES</section>');
    assert.equal((hero.match(/data-rs-card\b/g)||[]).length,10);
    assert.equal((hero.match(/data-rs-icon(?=\s)/g)||[]).length,10);
    assert.doesNotMatch(hero,/rs-hero-talk|data-open-site-assistant|Ask Respondo|Kysy Respondolta|Fråga Respondo/);
    assert.ok(hero.includes(t('AI-asiakaspalvelija, joka vastaa yrityksesi asiakkaiden kysymyksiin vuorokauden ympäri.','AI-kundservice som svarar dina kunder dygnet runt.','AI customer service that answers your customers, around the clock.')));
    assert.match(page,/<section id="pricing">REAL PRICES<\/section>/);
    assert.doesNotMatch(page,/respondo-search-overview|respondo-search-links/);
    assert.doesNotMatch(page,/apple-highlights|apple-lead-calculator|apple-bottom-cta/);
  });
}

test('Observatory styles load last and are homepage-scoped',()=>{
  assert.ok(html.indexOf('/home-observatory.css') > html.indexOf('/studio-home.css'));
  assert.match(html,/home-observatory\.css\?v=20261027-observatory-v1/);
  assert.match(html,/spiral-hero-motion\.js\?v=20261026-orbit10-v1-observatory-v1/);
  assert.match(html,/app\.js\?v=[^"]+-observatory-v1/);
  assert.match(app,/apple-home\.js\?v=20261027-no-hero-ask-v1/);
  assert.match(apple,/spiral-hero\.js\?v=20261027-no-hero-ask-v1/);
  assert.match(theme,/#app \.apple-home-page/);
  assert.match(theme,/max-width:600px/);
  assert.match(theme,/prefers-reduced-motion:reduce/);
  assert.match(theme,/--obs-blue:#a9cbff/);
  assert.doesNotMatch(theme,/#72f5bd|#a4ffdb|#8aefc2|#8deec1/i);
  assert.doesNotMatch(theme,/\.dashboard-page|\.signup-page|\.workspace-page/);
  assert.ok((theme.match(/{/g)||[]).length === (theme.match(/}/g)||[]).length);
});

test('ten icons remain in view during scroll and the intro button opens the actual first-party assistant',()=>{
  assert.match(motion,/const breathing = Math\.sin\(position/);
  assert.match(motion,/\+ \.09 \* orbitFlight \+ breathing/);
  assert.doesNotMatch(motion,/1 \+ \.95 \* orbitFlight/);
  assert.match(motion,/--rs-progress/);
  assert.match(motion,/icons\.forEach\(\(icon, i\) => icon\.classList\.toggle\('is-active', i === index\)/);
  assert.doesNotMatch(motion,/preventDefault\(|scrollTo\(|setInterval\(/);
  assert.match(effects,/\[data-open-site-assistant\]/);
  assert.match(html,/app\.js\?v=[^\"]+-no-hero-ask-v1/);
  assert.match(theme,/rs-spiral-bottom::after/);
});

test('existing production pricing and assistant infrastructure stay unchanged',()=>{
  assert.match(app,/appleHomeMarkup\(appText,currentLang\(\),FEATURE_COUNT,pricingSection\(\)\)/);
  assert.match(app,/card\('Advanced',49/);
  assert.match(app,/card\('Premium',129/);
  assert.match(app,/card\('Enterprise',149/);
  assert.match(html,/logo-reveal\.js/);
  assert.match(html,/effects\.js/);
});
