import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {respondoSiteNavigationActions,respondoSiteNavigationAnswer} from '../respondo-site-navigation.mjs';

const read=(name)=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const app=read('public/app.js'),server=read('server.mjs'),
  effects=read('public/effects.js'),css=read('public/mobile-public-polish.css'),
  html=read('public/index.html');

const questions=[
  ['Etusivu','/'],
  ['Tuote','/asiakaspalvelubotti'],
  ['Ominaisuudet','/ominaisuudet'],
  ['Kokeile bottia','/assistant'],
  ['Verkkokaupoille','/verkkokauppa-chatbot'],
  ['Ajanvaraukset','/ajanvaraus-chatbot'],
  ['Hinnat','/hinnat'],
  ['Tietoturva','/tietoturva'],
  ['Yhteystiedot','/yhteystiedot'],
  ['Kirjaudu','/kirjaudu'],
  ['Luo tili','/tilaus'],
  ['Tietosuoja','/tietosuoja'],
  ['Käyttöehdot','/kayttoehdot'],
  ['Evästeet','/evasteet'],
  ['Tietojenkäsittely','/dpa']
];
for(const lang of ['fi','sv','en']){
  test('chat navigates every essential Respondo route in '+lang,()=>{
    for(const [question,path] of questions){
      const choices=respondoSiteNavigationActions(question,lang);
      const expected=path==='/ominaisuudet'?lang==='sv'?'/funktioner':lang==='en'?'/features':path:path;
      assert.ok(choices.some(c=>new URL(c.url).pathname===expected),question+' -> '+expected);
      for(const action of choices){
        const link=new URL(action.url);
        assert.equal(link.protocol,'https:');
        assert.match(link.hostname,/^(?:www\.)?respondoai\.fi$/);
        if(lang!=='fi')assert.equal(link.searchParams.get('lang'),lang);
      }
    }
  });
}
test('natural direct navigation works even without the owner workspace',()=>{
  const samples=[
    ['Haluan kirjautua','fi','/kirjaudu'],
    ['Miten voin luoda tilin?','fi','/tilaus'],
    ['Jag vill logga in','sv','/kirjaudu'],
    ['Testa botten','sv','/assistant'],
    ['I want to create an account','en','/tilaus'],
    ['How do I sign in?','en','/kirjaudu'],
    ['Try the bot','en','/assistant']
  ];
  for(const [message,lang,path] of samples){
    const result=respondoSiteNavigationAnswer(message,lang);
    assert.ok(result?.answer,message+' should have an answer');
    assert.ok(result.actions.some(a=>new URL(a.url).pathname===path),message+' should link to '+path);
  }
  assert.equal(respondoSiteNavigationAnswer('What kind of putter do you sell?','en'),null);
  assert.deepEqual(respondoSiteNavigationActions('irrelevant input','fi'),[]);
});
test('chat-first UI replaces site-pages footer but keeps essential legal access',()=>{
  const footer=app.slice(app.indexOf('function footer()'),app.indexOf('function heroVisual()'));
  assert.doesNotMatch(footer,/publicFooterNavigationMarkup|footer-site-nav|footer-site-links/);
  assert.doesNotMatch(footer,/data-open-site-assistant|footer-ask-respondo/);
  assert.match(app,/class="public-header-login"/);
  for(const path of ['/kayttoehdot','/tietosuoja','/evasteet','/dpa']){
    assert.ok(footer.includes('href="'+path+'?lang=${currentLang()}"'),path);
  }
  assert.match(effects,/respondo-assistant\/chat/);
  assert.match(effects,/Array\.isArray\(data\.actions\)/);
  assert.match(effects,/allowedPaths = new Set/);
  assert.match(effects,/data-open-site-assistant/);
  assert.match(effects,/createElement\('a'\)/);
  assert.doesNotMatch(effects,/const routes = \[/);
  assert.match(css,/\.public-header-login/);
  assert.match(css,/\.fx-site-action/);
  assert.match(server,/import \{ respondoSiteNavigationActions, respondoSiteNavigationAnswer, respondoCheckoutAction \}/);
  assert.match(server,/intent:'Respondo site navigation'/);
  const handler=server.indexOf("app.post('/api/public/respondo-assistant/chat'");
  const direct=server.indexOf('const navigation=respondoSiteNavigationAnswer(',handler);
  const tenant=server.indexOf('const ownerEmail=cleanEmail(',handler);
  assert.ok(handler>=0&&direct>handler&&tenant>direct,'navigation works before tenant lookup');
  assert.match(html,/effects\.js\?v=/);
});
