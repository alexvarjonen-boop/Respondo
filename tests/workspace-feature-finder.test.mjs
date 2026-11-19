import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../public/'+name,import.meta.url),'utf8');

test('owner always has a visible shortcut to search for real capabilities in three languages',()=>{
  const source=read('workspace-continuation-v24.js');
  assert.match(source,/respondo-workspace-header[\s\S]*rs-workspace-search/);
  assert.match(source,/Hae toimintoa.*Sök funktion.*Search features/);
  assert.match(source,/respondoWorkspaceFeatureFinder/);
  assert.match(source,/input type="search" autocomplete="off"/);
  assert.match(source,/search\.addEventListener\('input',render\)/);
  assert.match(source,/translate\('Toimintoa ei löytynyt/);
  assert.match(source,/focus\(\{preventScroll:true\}\)/);
});

test('feature finder routes to supported panels and disables locked or unconfigured modules',()=>{
  const ui=read('workspace-continuation-v24.js'),app=read('app.js');
  const destinations=['knowledge','unanswered','leads','conversations','live-inbox','booking-calendar',
    'crm-integration','business-integrations','commerce-integration',
    'meta-native-connections','actions2','native-operations','install','support-team','billing',
    'workspaces','account-security'];
  for(const id of destinations){
    assert.match(ui,new RegExp("'"+id+"'"),id+' must be mapped');
    assert.match(app,new RegExp('id="'+id+'"'),id+' must exist in the real dashboard');
  }
  assert.match(ui,/const isAvailable=entry=>!entry\[2\]\|\|moduleTabAvailable\(entry\[2\]\)/);
  assert.match(ui,/item\.disabled=!available/);
  assert.match(ui,/const matches=catalog\.filter/);
  assert.match(ui,/navigateOwner\(keyFor\(entry\)\)/);
  assert.match(ui,/respondo:provider-availability/);
  assert.match(ui,/orbit\?\.suspendPin\?\.\(\)/);
  assert.doesNotMatch(ui,/fetch\(\s*['"]\/api\/app\/native\/mail\/:provider\/connect/);
});

test('feature search stays readable on mobile and updated CSS/JS URLs defeat stale cache',()=>{
  const css=read('workspace-continuation-v24.css');
  const html=read('index.html'),app=read('app.js');
  assert.match(css,/\.rs-workspace-search-results\{[\s\S]*position:absolute;/);
  assert.match(css,/\.rs-feature-finder-item:disabled/);
  assert.match(css,/\.rs-workspace-search input::placeholder/);
  assert.match(css,/\.rs-workspace-directory\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(html,/workspace-continuation-v24\.css\?v=[^"]*feature-finder-v49/);
  assert.match(html,/app\.js\?v=[^"]*feature-finder-v49/);
  assert.match(app,/workspace-continuation-v24\.js\?v=[^']*feature-finder-v49/);
});

test('owners get grouped navigation, while the demo keeps the bot and orbit flow',()=>{
  const ui=read('workspace-continuation-v24.js'),app=read('app.js');
  assert.match(app,/const view=legacySectionAliases\[section\]\|\|section\|\|'overview'/);
  assert.match(ui,/if\(demo\)orbit=createWorkspaceOrbit/);
  assert.match(ui,/page==='bot' && \(demo\|\|selected==='bot'\)/);
  for(const name of ['Botti','Asiakkaat','Myynti ja työt','Asetukset'])assert.ok(ui.includes(name));
  assert.match(ui,/'automation','quote-engine','[^']*€\/ikkuna/);
  assert.match(ui,/groupFor\(entry\[1\],entry\[2\]\)\)===activeGroup && isAvailable\(entry\)/);
});

test('owner tools have independent browser routes and nested forms stay off the request page',()=>{
  const ui=read('workspace-continuation-v24.js');
  const css=read('workspace-continuation-v24.css');
  const native=read('native-ai-operations.js');
  assert.match(ui,/const hashPrefix='#dashboard\/'/);
  assert.match(ui,/history\.pushState/);
  assert.match(ui,/window\.addEventListener\('hashchange',onHistory\)/);
  assert.match(ui,/if\(!tab&&available\?\.length\)/);
  assert.match(css,/#respondoWorkspaceCardBody > #actions2 > :not\(\.action-inbox-panel\)\{\s*display:none!important/);
  assert.match(native,/kinds\.includes\(kind\)/);
  assert.match(native,/addEventListener\('respondo:select-native-tab',selectRequestedTool\)/);
});
