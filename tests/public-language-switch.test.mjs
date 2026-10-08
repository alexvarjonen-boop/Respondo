import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const index=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const first=app.indexOf('function languageChangeUrl(');
const last=app.indexOf('\nfunction bindLanguageSwitch()',first);
assert.ok(first>=0 && last>first, 'Expected shared language URL helper');
const languageChangeUrl=Function('location',app.slice(first,last)+'\nreturn languageChangeUrl')({origin:'https://www.respondoai.fi'});

for(const page of [
  '/', '/yhteystiedot', '/hinnat', '/ominaisuudet', '/features', '/funktioner',
  '/asiakaspalvelubotti', '/verkkokauppa-chatbot', '/ajanvaraus-chatbot',
  '/tietoturva', '/tietosuoja', '/kayttoehdot', '/dpa', '/evasteet',
  '/kirjaudu', '/tilaus', '/assistant'
]){
  test('language switch overrides a stale ?lang and keeps the current page: '+page,()=>{
    const origin='https://www.respondoai.fi';
    for (const lang of ['fi','sv','en']) {
      const result=new URL(languageChangeUrl(lang,origin+page+'?plan=advanced_yearly&lang=fi&ref=TEST#content'),origin);
      assert.equal(result.searchParams.get('lang'),lang);
      assert.equal(result.searchParams.get('plan'),'advanced_yearly');
      assert.equal(result.searchParams.get('ref'),'TEST');
      assert.equal(result.hash,'#content');
      if(['/ominaisuudet','/features','/funktioner'].includes(page)){
        assert.equal(result.pathname,lang==='en'?'/features':lang==='sv'?'/funktioner':'/ominaisuudet');
      }else{
        assert.equal(result.pathname,page);
      }
    }
  });
}

test('flags update the URL before broadcasting the selected language and rerender just once',()=>{
  const from=app.indexOf('function bindLanguageSwitch()');
  const until=app.indexOf('\nfunction nav()',from);
  const code=app.slice(from,until);
  assert.match(code,/history\.replaceState\(history\.state, '', nextUrl\)/);
  assert.ok(code.indexOf('history.replaceState')<code.indexOf('window.RespondoI18n.setLanguage(lang)'));
  assert.match(code,/else route\(\)/);
  assert.doesNotMatch(code,/\}\s*route\(\);\s*\};/);
  assert.match(index,/app\.js\?v=[^"]+lang-switch-v1-legal-feature-sync-v1/);
});

test('contact page stays translated from currentLang after a language change',()=>{
  const start=app.indexOf('function contactPage()');
  const end=app.indexOf('\nfunction footer()',start);
  const page=app.slice(start,end);
  assert.match(page,/Miten voimme auttaa\?/);
  assert.match(page,/Hur kan vi hjälpa dig\?/);
  assert.match(page,/How can we help\?/);
  assert.match(page,/appText\('Nimi','Namn','Name'\)/);
});
