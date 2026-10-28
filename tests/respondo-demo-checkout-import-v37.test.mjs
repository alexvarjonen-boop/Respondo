import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {respondoCheckoutAction} from '../respondo-site-navigation.mjs';
const read=(name)=>readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('purchase and price enquiries produce a real Respondo signup link',()=>{
  const samples=[
    ['fi','Miten saan Respondon käyttöön?'],
    ['fi','Hinnat'],
    ['fi','Haluan tilata Respondon'],
    ['sv','Hur kan jag beställa Respondo?'],
    ['sv','Vad kostar Respondo?'],
    ['en','How much does Respondo cost?'],
    ['en','How can I subscribe?']
  ];
  for(const [lang,message] of samples){
    const action=respondoCheckoutAction(message,lang);
    assert.equal(action?.type,'site_signup',message);
    const url=new URL(action.url);
    assert.equal(url.pathname,'/tilaus');
    if(lang!=='fi')assert.equal(url.searchParams.get('lang'),lang);
  }
});
test('old demo browser field can use only matching trusted imported domain for order button',()=>{
  const server=read('server.mjs');
  const handler=server.slice(server.indexOf("app.post('/api/public/demo-chat'"),server.indexOf("\napp.",server.indexOf("app.post('/api/public/demo-chat'")+100));
  assert.match(handler,/if\(imported\?\.website && currentDemoWebsite &&[\s\S]*?imported=null/);
  assert.match(handler,/trustedImportedDemoWebsite=imported\?\.website\|\|''/);
  assert.match(handler,/enteredDemoHost==='respondoai.fi'/);
  assert.match(handler,/!enteredDemoHost && importedDemoHost==='respondoai.fi'/);
  assert.match(handler,/const orderAction=firstPartyRespondoPreview/);
  assert.match(handler,/actions\.unshift\(orderAction\)/);
  assert.match(handler,/answer\.length>310/);
  assert.match(handler,/canLeaveContact: Boolean\(handoff\)/);
});
test('both public demo and paid preview actually render click-through anchors',()=>{
  const app=read('public/app.js');
  assert.match(app,/wrap\.className='preview-actions'/);
  assert.match(app,/link\.className='preview-action-link'/);
  assert.match(app,/link\.href=action\.url/);
  assert.match(app,/actionWrap\.appendChild\(link\)/);
});
