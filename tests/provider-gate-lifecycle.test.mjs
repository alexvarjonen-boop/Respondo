import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const app=read('public/app.js');
const workspace=read('public/workspace-continuation-v24.js');
const guide=read('public/integration-onboarding.js');

function getLiveGate(){
  const start=app.indexOf('    const setProviderPanelAvailability=');
  const end=app.indexOf('    const mailPanel=',start);
  assert(start>0 && end>start,'real production provider gate must exist');
  const source=app.slice(start,end);
  const dispatch=[];
  class Event {constructor(type,options){this.type=type;this.bubbles=options.bubbles;}}
  return {fn:new Function('CustomEvent',source+'\nreturn setProviderPanelAvailability;')(Event),dispatch};
}

test('provider panel initially hidden does not become permanent plan lock for an entitled owner',()=>{
  assert.match(workspace,/if\(pane\?\.dataset\.respondoProviderGated==='yes'\)/);
  assert.match(workspace,/if\(pane\.dataset\.respondoPlanAllowed!=='yes'\)pane\.dataset\.respondoPlanLocked='yes'/);
  assert.match(workspace,/else if\(pane\?\.hidden\)pane\.dataset\.respondoPlanLocked='yes'/);
  assert.match(guide,/target\.dataset\.respondoProviderGated==='yes' && target\.dataset\.respondoPlanAllowed==='yes'/);
});

test('actual production availability handler opens, hides and reopens provider tabs correctly',()=>{
  const {fn}=getLiveGate();let notifications=0;
  const panel={dataset:{respondoPlanAllowed:'yes'},hidden:true,
    dispatchEvent:e=>{assert.equal(e.type,'respondo:provider-availability');assert.equal(e.bubbles,true);notifications++;}
  };
  fn(panel,false);
  assert.equal(panel.hidden,true);
  assert.equal(panel.dataset.respondoConnectorAvailable,'no');
  assert.equal(notifications,1);
  fn(panel,true);
  assert.equal(panel.hidden,false);
  assert.equal(panel.dataset.respondoConnectorAvailable,'yes');
  assert.equal(notifications,2);
  fn(panel,true);
  assert.equal(notifications,2,'idempotent readiness check must not rebuild navigation');
  fn(panel,false);
  assert.equal(panel.hidden,true);
  assert.equal(notifications,3);
});

test('plan and configured provider must BOTH allow the mail and Meta panels',()=>{
  assert.match(app,/const enabled=permitted&&\(nativeMailOauthReady\.gmail\|\|nativeMailOauthReady\.outlook\)/);
  assert.match(app,/setProviderPanelAvailability\(mailPanel,enabled\)/);
  assert.match(app,/setProviderPanelAvailability\(panel,panel\?\.dataset\.respondoPlanAllowed==='yes'\)/);
  assert.match(app,/setProviderPanelAvailability\(panel,false\)/);
  assert.match(workspace,/target\.dataset\.respondoConnectorAvailable!=='yes'\)return false/);
  assert.match(workspace,/const moduleTabAvailable=id=>/);
  assert.match(workspace,/if\(target\.dataset\.respondoProviderGated==='yes'\)/);
  assert.match(workspace,/return target\.dataset\.respondoConnectorAvailable==='yes'/);
  assert.match(workspace,/workspace\.addEventListener\('respondo:provider-availability',refreshProviderTabs\)/);
});

test('unready provider shows accurate message, never a fake Enterprise paywall or connection success',()=>{
  assert.match(workspace,/Yhteyttä ei ole vielä käytettävissä/);
  assert.match(workspace,/The provider registration or readiness check is not complete/);
  assert.match(workspace,/if\(currentTab && !moduleTabAvailable\(currentTab\)\)showModuleTab\('native-operations'\)/);
  assert.match(guide,/prerequisites\.get\(item\.id\)!==true/);
  assert.match(guide,/oauthAvailable\.get\(item\.id\)!==true/);
});
