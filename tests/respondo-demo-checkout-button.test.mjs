import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {respondoCheckoutAction,respondoSiteNavigationActions,respondoSiteNavigationAnswer} from '../respondo-site-navigation.mjs';
const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('real subscription action appears for pricing, purchase and onboarding requests in each language',()=>{
  for(const [lang,question,label] of [
    ['fi','Paljonko maksaa Respondo?','Tilaa Respondo'],
    ['fi','Miten voin ottaa Respondon käyttöön?','Tilaa Respondo'],
    ['fi','Miten tämän voi tilata?','Tilaa Respondo'],
    ['sv','Vad kostar Respondo?','Beställ Respondo'],
    ['sv','Hur kan jag beställa?','Beställ Respondo'],
    ['en','How much does Respondo cost?','Subscribe to Respondo'],
    ['en','How can I subscribe?','Subscribe to Respondo'],
  ]){
    const action=respondoCheckoutAction(question,lang);
    assert.ok(action,lang+': '+question);
    assert.equal(action.type,'site_signup');
    assert.equal(action.label,label);
    assert.equal(new URL(action.url).pathname,'/tilaus');
    if(lang!=='fi')assert.equal(new URL(action.url).searchParams.get('lang'),lang);
    const actions=respondoSiteNavigationActions(question,lang);
    assert.ok(actions.some(a=>new URL(a.url).pathname==='/tilaus'),question);
    assert.ok(actions.length<=4);
  }
});
test('pricing answer includes both pricing and checkout buttons on the marketing site',()=>{
  const actions=respondoSiteNavigationActions('Hinnat','fi');
  assert.ok(actions.some(a=>new URL(a.url).pathname==='/hinnat'));
  assert.ok(actions.some(a=>new URL(a.url).pathname==='/tilaus'));
  assert.equal(respondoCheckoutAction('Mikä on tietosuojaseloste?','fi'),null);
  assert.equal(respondoCheckoutAction('How do I view your contact details?','en'),null);
  const answer=respondoSiteNavigationAnswer('Miten otan sen käyttöön?','fi');
  assert.match(answer?.answer||'',/painikkeesta/);
  assert.ok(answer?.actions.some(a=>new URL(a.url).pathname==='/tilaus'));
});
test('public demo checkout CTA only applies when testing actual respondoai.fi',()=>{
  const server=read('server.mjs');
  const demo=server.slice(server.indexOf("app.post('/api/public/demo-chat'"),server.indexOf("\napp.",server.indexOf("app.post('/api/public/demo-chat'")+100));
  assert.match(demo,/const enteredDemoHost=normalizeHost\(profile.website\)/);
  assert.match(demo,/const importedDemoHost=normalizeHost\(trustedImportedDemoWebsite\)/);
  assert.match(demo,/enteredDemoHost==='respondoai.fi'/);
  assert.match(demo,/!enteredDemoHost && importedDemoHost==='respondoai.fi'/);
  assert.match(demo,/const firstPartyRespondoPreview=isRespondoDemoWebsite\|\|previewIsFirstPartyRespondo/);
  assert.match(demo,/firstPartyRespondoPreview\s*\? respondoCheckoutAction\(message,detectedLang,previewFaq\?\.id\|\|'',SEO_CANONICAL_ORIGIN\)/);
  assert.match(demo,/actions\.unshift\(orderAction\)/);
  assert.match(demo,/const previewFaq=firstPartyRespondoPreview/);
  assert.match(demo,/canLeaveContact: Boolean\(handoff\)/);
  const app=read('public/app.js');
  assert.match(app,/wrap\.className='preview-actions'/);
  assert.match(app,/link\.className='preview-action-link'/);
  assert.match(app,/link\.href=action\.url/);
});

test('first-party ordering CTA stays visible below a short answer, never for a merchant',()=>{
  const server=read('server.mjs');
  const demo=server.slice(server.indexOf("app.post('/api/public/demo-chat'"),server.indexOf("\napp.",server.indexOf("app.post('/api/public/demo-chat'")+100));
  assert.match(demo,/trustedImportedDemoWebsite=imported\?\.website\|\|''/);
  assert.match(demo,/if\(handoff \|\| answer\.length>310\)/);
  assert.match(demo,/actions\.unshift\(orderAction\)/);
  assert.match(demo,/firstPartyRespondoPreview\s*\? respondoCheckoutAction/);
  const css=read('public/workspace-continuation-v24.css');
  assert.match(css,/\.preview-action-link\{/);
  assert.match(css,/-webkit-text-fill-color:#101b2e!important/);
  assert.match(read('public/index.html'),/workspace-continuation-v24\.css\?v=[^"]*subscribe-cta-v37/);
});

test('previously missed Finnish purchase inflections open the real signup page',()=>{
  for(const message of [
    'Miten saan Respondon tilattua?',
    'Miten tilaan tämän?',
    'Mistä sen saa tilattua?',
    'Miten pääsen tilaamaan Respondon?',
    'Olen tilaamassa Respondoa'
  ]) {
    const result=respondoCheckoutAction(message,'fi');
    assert.equal(new URL(result?.url).pathname,'/tilaus',message);
    assert.ok(respondoSiteNavigationActions(message,'fi').some(action=>action.type==='site_signup'),message);
  }
});
test('public demo purchase answer bypasses ecommerce product generation for Respondo only',()=>{
  const server=read('server.mjs');
  const demo=server.slice(server.indexOf("app.post('/api/public/demo-chat'"),server.indexOf("\napp.",server.indexOf("app.post('/api/public/demo-chat'")+100));
  assert.match(demo,/const directSubscribe=firstPartyRespondoPreview/);
  assert.match(demo,/if\(directSubscribe\)\{/);
  assert.match(demo,/actions:\[directSubscribe\],products:\[\]/);
  assert.ok(demo.indexOf('if(directSubscribe)')<demo.indexOf('await generateGroundedAnswer({'));
  assert.match(demo,/enteredDemoHost==='respondoai.fi'/);
});
test('first-party website widget shows subscription rather than unrelated ecommerce cards',()=>{
  const server=read('server.mjs');
  const chat=server.slice(server.indexOf("app.post('/api/public/:slug/chat'"),server.indexOf("\napp.",server.indexOf("app.post('/api/public/:slug/chat'")+100));
  assert.match(chat,/const widgetSubscribe=firstPartyRespondo/);
  assert.match(chat,/let actions = widgetSubscribe/);
  assert.match(chat,/products:widgetSubscribe \? \[\] : await hydratedProductCards\(result\)/);
});
