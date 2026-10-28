import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spiralHeroMarkup} from '../public/spiral-hero.js';
const read = name => readFileSync(new URL('../public/' + name, import.meta.url), 'utf8');
const css = read('home-finish-v13.css');
const balance = css.slice(css.indexOf('/* Observatory v15'));
const html = read('index.html');

test('v15 optically balances the same brand sphere, heading and chapter camera on desktop', () => {
  assert.ok(balance.startsWith('/* Observatory v15'));
  assert.match(balance, /@media\(min-width:1100px\)/);
  assert.match(balance, /\.rs-enhanced \.rs-studio-orbit-art/);
  assert.match(balance, /\.rs-enhanced \.rs-axis/);
  assert.match(balance, /\.rs-enhanced \.rs-orbit-beacon/);
  assert.match(balance, /left:73%!important/);
  assert.match(balance, /width:min\(42vw,620px\)!important/);
  assert.match(balance, /@media\(min-width:1100px\) and \(max-height:760px\)/);
  assert.match(balance, /@media\(min-width:601px\) and \(max-width:1099px\)/);
});
test('v15 keeps a separate reading lane on tall iPhones and small devices', () => {
  assert.match(balance, /@media\(max-width:600px\) and \(min-height:820px\)/);
  assert.match(balance, /\.rs-enhanced\.rs-intro-past \.rs-studio-orbit-art/);
  assert.match(balance, /top:43%!important/);
  assert.match(balance, /padding-bottom:clamp\(91px,12\.3svh,118px\)!important/);
  assert.match(balance, /@media\(max-width:360px\)/);
  assert.match(balance, /@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(balance, /scrollTo\(|preventDefault\(|setInterval\(|scroll-snap-type|@keyframes/);
  assert.equal(css.split('{').length,css.split('}').length);
});
test('v15 keeps the same localized hero, ten chapters and verified pricing contracts', () => {
  for (const [lang,i,cta] of [['fi',0,'Kokeile bottia'],['sv',1,'Testa botten'],['en',2,'Try the bot']]) {
    const markup = spiralHeroMarkup((...items)=>items[i],lang);
    assert.ok(markup.includes(cta));
    assert.ok(markup.includes('href="/assistant?lang='+lang+'"'));
    assert.equal((markup.match(/data-rs-card\b/g)||[]).length,10);
    assert.equal((markup.match(/data-rs-icon(?=\s)/g)||[]).length,10);
    assert.doesNotMatch(markup,/Ask Respondo|Kysy Respondolta|Fråga Respondo|\+52 %/);
  }
  assert.match(balance, /\.pricing-section \.pricing-wrap/);
  assert.match(balance, /\.pricing-section \.price-card\.featured/);
  assert.match(balance, /@media\(max-width:900px\)/);
  const app = read('app.js');
  for (const p of ["card('Advanced',49","card('Premium',129","card('Enterprise',149"]) assert.ok(app.includes(p));
  assert.match(html,/home-finish-v13\.css\?v=20261028-observatory-balance-v15[^\/\"]*/);
  assert.ok(html.indexOf('/home-finish-v13.css')>html.indexOf('/home-polish-v11.css'));
});
