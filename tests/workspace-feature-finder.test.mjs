import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../public/'+name,import.meta.url),'utf8');

test('owner always has a visible shortcut to search for real capabilities in three languages',()=>{
  const source=read('workspace-continuation-v24.js');
  assert.match(source,/data-workspace-nav="overview"/);
  assert.match(source,/Hae toiminto.*Sök funktion.*Find a feature/);
  assert.match(source,/respondoWorkspaceFeatureFinder/);
  assert.match(source,/search\.type='search'/);
  assert.match(source,/search\.addEventListener\('input',render\)/);
  assert.match(source,/translate\('Toimintoa ei löytynyt/);
  assert.match(source,/focus\(\{preventScroll:true\}\)/);
});

test('feature finder routes to supported panels and disables locked or unconfigured modules',()=>{
  const ui=read('workspace-continuation-v24.js'),app=read('app.js');
  const destinations=['knowledge','unanswered','leads','conversations','live-inbox','booking-calendar',
    'native-mail-connections','crm-integration','business-integrations','commerce-integration',
    'meta-native-connections','actions2','native-operations','install','support-team','billing',
    'workspaces','account-security'];
  for(const id of destinations){
    assert.match(ui,new RegExp("'"+id+"'"),id+' must be mapped');
    assert.match(app,new RegExp('id="'+id+'"'),id+' must exist in the real dashboard');
  }
  assert.match(ui,/const available=!tab\|\|moduleTabAvailable\(tab\)/);
  assert.match(ui,/item\.disabled=!available/);
  assert.match(ui,/const matches=catalog\.filter/);
  assert.match(ui,/const finder=button\.classList\.contains\('rs-workspace-find-toggle'\)/);
  assert.match(ui,/respondo:provider-availability/);
  assert.match(ui,/orbit\?\.suspendPin\?\.\(\)/);
  assert.doesNotMatch(ui,/fetch\(\s*['"]\/api\/app\/native\/mail\/:provider\/connect/);
});

test('feature search stays readable on mobile and updated CSS/JS URLs defeat stale cache',()=>{
  const css=read('workspace-continuation-v24.css');
  const html=read('index.html'),app=read('app.js');
  assert.match(css,/\.rs-feature-finder-results\{display:grid;grid-template-columns:repeat\(2/);
  assert.match(css,/\.rs-feature-finder-item:disabled/);
  assert.match(css,/\.rs-feature-finder-label input:focus-visible/);
  assert.match(css,/@media\(max-width:650px\)/);
  assert.match(css,/\.rs-feature-finder-results\{grid-template-columns:1fr\}/);
  assert.match(html,/workspace-continuation-v24\.css\?v=[^"]*feature-finder-v49/);
  assert.match(app,/workspace-continuation-v24\.js\?v=[^']*feature-finder-v49/);
});
