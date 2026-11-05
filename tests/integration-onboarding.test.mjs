import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const guide=file('public/integration-onboarding.js');
const css=file('public/integration-onboarding.css');
const index=file('public/index.html');
const workspace=file('public/workspace-continuation-v24.js');
const app=file('public/app.js');
const server=file('server.mjs');
const pkg=JSON.parse(file('package.json'));

test('simple three-step onboarding supports every provider actually present in Respondo',()=>{
  const ids=['gmail','outlook','google_calendar','native_calendar','hubspot','pipedrive',
    'shopify','woocommerce','stripe','whatsapp','instagram','facebook',
    'freshdesk','zendesk','google_drive','sharepoint','webhooks'];
  for(const id of ids)assert.match(guide,new RegExp("id:'"+id+"'"),id);
  for(const group of ['mail','calendar','crm','commerce','payments','social','support','files','advanced'])
    assert.match(guide,new RegExp("id:'"+group+"',label:"),group);
  assert.match(guide,/chosenGroup='respondo',chosenProvider=null/);
  assert.match(guide,/data-integration-group/);
  assert.match(guide,/data-integration-provider/);
  assert.match(guide,/data-integration-open/);
  assert.match(guide,/rs-integration-selected/);
  assert.match(guide,/rs-integration-advanced/);
  assert.match(css,/not\(\.rs-integration-configuring\):not\(\.rs-integration-advanced\)/);
  assert.match(css,/\.rs-integration-onboarding/);
});

test('all guided actions lead to existing authorization or real authenticated configuration forms',()=>{
  const existing=['crm-integration','commerce-integration','booking-calendar','stripe-connect',
    'native-mail-connections','meta-native-connections','business-integrations','native-operations'];
  for(const id of existing){
    assert.match(workspace,new RegExp("\\['"+id+"'"),id);
    assert.match(app,new RegExp('id="'+id+'"'),id);
  }
  for(const oauth of [
    '/api/app/native/mail/gmail/start','/api/app/native/mail/outlook/start',
    '/api/app/google-calendar/start','/api/app/native/cloud/google_drive/start'
  ]){
    assert.ok(guide.includes(oauth),'guide uses '+oauth);
    assert.ok(server.includes(oauth.replace('/gmail/start','/:provider/start')
      .replace('/outlook/start','/:provider/start')
      .replace('/google_drive/start','/:provider/start')),oauth);
  }
  assert.match(guide,/tab\.click\(\)/);
  assert.match(guide,/inner\.click\(\)/);
  assert.match(guide,/select\.dispatchEvent\(new Event\('change'/);
});

test('automated status is read-only, tenant-scoped and never fabricates connected state',()=>{
  for(const endpoint of [
    '/api/app/connectors/crm','/api/app/native/mail/status',
    '/api/app/native/meta/status','/api/app/native/cloud/status',
    '/api/app/helpdesk/freshdesk','/api/app/helpdesk/zendesk',
    '/api/app/integrations/readiness'
  ]){
    assert.ok(guide.includes(endpoint),endpoint);
    assert.ok(server.includes(endpoint),endpoint+' exists on server');
  }
  assert.match(guide,/method:'GET',credentials:'same-origin',cache:'no-store'/);
  assert.doesNotMatch(guide,/method:'POST'|method:'PUT'|method:'DELETE'/);
  assert.doesNotMatch(guide,/localStorage\.setItem|token\.value|accessToken\.value|clientSecret/);
  assert.match(guide,/return t\.unknown/);
  assert.match(guide,/if\(result\.crm\?\.connected/);
  assert.match(guide,/channel\.configured/);
  assert.match(guide,/next\.set\(channel\.provider,'partial'\)/);
  assert.match(guide,/result\.freshdesk\?\.data\?\.connected/);
  assert.match(guide,/result\.zendesk\?\.data\?\.connected/);
  assert.match(guide,/respondo_pending_integration/);
});

test('plan-gated connectors remain locked when the old dashboard panels are relocated',()=>{
  assert.match(workspace,/workspace\.dataset\.integrationLocksStamped/);
  assert.match(workspace,/pane\?\.hidden\)pane\.dataset\.respondoPlanLocked='yes'/);
  assert.match(workspace,/if\(target\.dataset\.respondoPlanLocked==='yes'\)return false/);
  assert.match(guide,/target\?\.dataset\.respondoPlanLocked==='yes'/);
  assert.match(guide,/googlePlanLocked/);
  assert.match(guide,/\['restricted','notConfigured','unverified'\]\.includes\(status\(item\)\)/);
});

test('unneeded commerce credential inputs are hidden without deleting any existing values',()=>{
  assert.match(guide,/const fields=\{shopify:\['shopifyShopDomain','shopifyAccessToken'\]/);
  assert.match(guide,/woocommerce:\['wooBaseUrl','wooConsumerKey','wooConsumerSecret'\]/);
  assert.match(guide,/field\.hidden=provider!==kind/);
  assert.doesNotMatch(guide,/input\.value\s*=\s*''/);
  assert.match(css,/#commerce-integration \.field\[hidden\]\{display:none!important\}/);
});

test('FI/SV/EN, mobile styles, existing asset links and syntax check all wired',()=>{
  assert.match(guide,/fi:\{nativeTitle:/);
  assert.match(guide,/sv:\{nativeTitle:/);
  assert.match(guide,/en:\{nativeTitle:/);
  assert.match(css,/@media\(max-width:640px\)/);
  assert.match(index,/\/integration-onboarding\.js\?v=20261105-guided-setup-v7-native-private/);
  assert.match(index,/\/integration-onboarding\.css\?v=20261105-guided-setup-v1/);
  assert.match(app,/guided-integrations-v1/);
  assert.match(pkg.scripts.check,/node --check public\/integration-onboarding\.js/);
});
