import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const guide=read('public/integration-onboarding.js');
const workspace=read('public/workspace-continuation-v24.js');
const app=read('public/app.js');
const html=read('public/index.html');

test('blocked Outlook never pretends to be on the last connection step',()=>{
  const selected=guide.slice(guide.indexOf('}else{\n        const item=providers.find(p=>p.id===chosenProvider);'),guide.indexOf('    function focusExisting(item)'));
  assert.match(selected,/const availability=status\(item\)/);
  assert.match(selected,/if\(\['restricted','notConfigured','unverified'\]\.includes\(availability\)\)\{/);
  assert.match(selected,/addStepTitle\(item\.name\)/);
  assert.match(selected,/return;\s*\}\s*addStepTitle\(t\.third\+' · '\+item\.name\)/);
  assert.match(selected,/mailboxFeedback\(lang,'not_configured',item\.id\)/);
});

test('provider missing-configuration error is never shown twice on the same screen',()=>{
  assert.match(guide,/if\(callbackMsg && !\(oauthCode==='not_configured'&&\['gmail','outlook'\]\.includes\(oauthProvider\)\)\)/);
  assert.match(guide,/content\.appendChild\(alert\)/);
  assert.match(guide,/if\(availability!=='restricted'\)alert\.setAttribute\('role','alert'\)/);
});

test('mail providers explain central activation to tenants in FI SV and EN',()=>{
  assert.match(guide,/Respondo ottaa yhteyden käyttöön keskitetysti/);
  assert.match(guide,/Respondo aktiverar anslutningen centralt/);
  assert.match(guide,/Respondo must activate it centrally/);
  assert.match(guide,/Sinun ei tarvitse määrittää sovellustunnuksia tai API-avaimia/);
});

test('integration OAuth return highlights Integrations in workspace orbit',()=>{
  const direct=workspace.slice(workspace.indexOf("if(!demo && initialSection==='integrations'"),workspace.indexOf('  if(status && importButton?.disabled)'));
  assert.match(direct,/orbit\?\.suspendPin\?\.\(\)/);
  assert.match(direct,/target\.scrollIntoView\(\{behavior:'auto',block:'start'\}\)/);
  assert.match(direct,/orbit\?\.sync\('integrations'\)/);
});

test('outlook UX fixes have updated browser scripts to bypass stale pages',()=>{
  assert.match(app,/workspace-continuation-v24\.js\?v=[^']+-outlook-unavailable-ux-v1'/);
  assert.match(html,/integration-onboarding\.js\?v=[^"]+-outlook-unavailable-ux-v1"/);
  assert.match(html,/app\.js\?v=[^"]+-outlook-unavailable-ux-v1-movexa-v1"/);
});
