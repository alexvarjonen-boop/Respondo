import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const footer=app.slice(app.indexOf('function footer()'),app.indexOf('function heroVisual()'));
const expected=[
  ['Lakiasiat','Juridik','Legal'],
  ['Käyttöehdot','Användarvillkor','Terms of Service'],
  ['Tietosuojaseloste','Integritetspolicy','Privacy Policy'],
  ['Evästeet','Cookies','Cookies'],
  ['Evästeasetukset','Cookieinställningar','Cookie Settings'],
  ['Tietojenkäsittely','Personuppgiftsbehandling','Data Processing'],
  ['Tietoturva','Informationssäkerhet','Security'],
  ['Suomi','Finland','Finland']
];

test('footer translates all legal and security navigation labels across Finnish, Swedish and English',()=>{
  assert.ok(footer.startsWith('function footer()'));
  for(const trio of expected){
    assert.ok(footer.includes('appText('+trio.map(x=>JSON.stringify(x)).join(',')+')'),trio.join(' / '));
  }
});

test('legal footer navigation keeps original routes, cookie settings callback and a fresh script version',()=>{
  for(const path of ['/kayttoehdot','/tietosuoja','/evasteet','/dpa','/tietoturva']){
    assert.ok(footer.includes('href="'+path+'?lang=${currentLang()}"'),path);
  }
  assert.match(footer,/openRespondoCookieSettings\?\.\(\)/);
  assert.match(html,/app\.js\?v=[^"]+-pw-strength-20261029-v1-legal-footer-i18n-v1/);
});
