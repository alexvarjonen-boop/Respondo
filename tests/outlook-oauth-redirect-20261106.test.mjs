import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const app=file('public/app.js');
const workspace=file('public/workspace-continuation-v24.js');
const backend=file('server.mjs');
const html=file('public/index.html');
const guide=file('public/integration-onboarding.js');

test('Outlook connect never navigates when Microsoft OAuth is not configured',()=>{
  assert.match(app,/data-native-mail-connect="outlook"/);
  assert.match(app,/const nativeMailOauthReady=\{gmail:false,outlook:false\}/);
  assert.match(app,/nativeMailOauthReady\.outlook=response\?\.oauthAvailable\?\.outlook===true/);
  assert.match(app,/if\(nativeMailOauthReady\[provider\]!==true\)\{[\s\S]*?return;[\s\S]*?\}/);
  assert.match(app,/location\.assign\('\/api\/app\/native\/mail\/'\+provider\+'\/start'\)/);
  assert.doesNotMatch(app,/<a class="btn dashboard-action" href="\/api\/app\/native\/mail\/outlook\/start"/);
});

test('Microsoft setup failure has readable Finnish, Swedish and English status',()=>{
  assert.match(app,/Outlook-yhdistäminen vaatii Microsoft-sovelluksen tunnukset/);
  assert.match(app,/Outlook kräver Microsoft-appens klientuppgifter/);
  assert.match(app,/Outlook needs Microsoft app credentials configured/);
  assert.match(app,/nativeMailOauthReady\.outlook=false;[\s\S]*?Mailbox status could not be verified/);
});

test('Outlook OAuth redirects return to matching provider and integrations section',()=>{
  assert.match(backend,/const nativeMailReturn=\(provider,result\)=>'\/app\?'\+new URLSearchParams/);
  assert.match(backend,/section:'integrations',provider:provider==='outlook'\?'outlook':'gmail',native_mail:result/);
  assert.match(backend,/return res\.redirect\(nativeMailReturn\(provider,'not_configured'\)\)/);
  assert.match(guide,/\(oauthCode&&\['gmail','outlook'\]\.includes\(oauthProvider\)\)/);
  assert.match(guide,/const recovered=providers\.find\(p=>p\.id===\(fromCallback\|\|pending\)\)/);
});

test('oauth return skips bot-first preview and scrolls the real integrations module into view',()=>{
  assert.match(app,/const section=new URLSearchParams\(location.search\)\.get\('section'\)/);
  assert.match(app,/activateRespondoWorkspace\(\{view\}\)/);
  assert.match(workspace,/selectView\(view\)/);
  assert.match(workspace,/initialSection==='integrations' && workspace\.dataset\.currentView==='integrations'/);
  assert.match(workspace,/workspace\.querySelector\('\[data-workspace-page="modules"\]'\)/);
  assert.match(workspace,/orbit\?\.suspendPin\?\.\(\)/);
  assert.match(workspace,/target\.scrollIntoView\(\{behavior:'auto',block:'start'\}\)/);
  assert.match(workspace,/\.rs-integration-oauth-feedback/);
  assert.match(workspace,/focusTarget\.focus\(\{preventScroll:true\}\)/);
});

test('updated module and app URL versions bypass browser caches',()=>{
  assert.match(app,/workspace-continuation-v24\.js\?v=[^']+-outlook-module-return-v1-outlook-unavailable-ux-v1'/);
  assert.match(html,/app\.js\?v=[^"]+-outlook-module-return-v1-outlook-unavailable-ux-v1-movexa-v1"/);
});
