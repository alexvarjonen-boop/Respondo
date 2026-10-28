import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
const workspace = await readFile(new URL('../public/workspace-continuation-v24.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../public/workspace-continuation-v24.css', import.meta.url), 'utf8');
const index = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');

test('five-card wizard has localized website, email and opening-hours examples', () => {
  assert.match(app, /https:\/\/yritys\.fi.*https:\/\/foretag\.se.*https:\/\/company\.fi/);
  assert.match(app, /info@yritys\.fi.*info@foretag\.se.*info@company\.fi/);
  assert.match(app, /Ma–Pe 8–17.*Mån–Fre 8–17.*Mon–Fri 8–17/);
});

test('completing public and authenticated guided setup opens working chat, not legacy dashboard', () => {
  assert.match(app, /activateRespondoWorkspace\(\{demo:true,view:'bot'\}\)/);
  assert.match(app, /activateRespondoWorkspace\(\{view:'bot'\}\)/);
  const formStart=app.indexOf("const guidedForm = $('#guidedSetupForm');");
  const formEnd=app.indexOf("if (new URLSearchParams(location.search).get('guidedImport')",formStart);
  assert.ok(formStart>0 && formEnd>formStart);
  assert.doesNotMatch(app.slice(formStart,formEnd), /location\.href\s*=\s*['"]\/app\?section=setup/);
  assert.match(app, /if \(!\$\('#guidedSetup'\)\) \{/);
});

test('workspace relocates the original live preview, keeps existing scan API and provides top-right navigation', () => {
  assert.match(workspace, /chatHost\.appendChild\(preview\)/);
  assert.match(workspace, /modules\.appendChild\(section\)/);
  for (const view of ['overview','bot','profile','billing','settings']) {
    assert.match(workspace, new RegExp("data-workspace-nav|nav\\('"+view+"'"));
  }
  assert.match(workspace, /importButton\?\.addEventListener\('click'/);
  assert.match(app, /\/api\/app\/import-website\/start/);
  assert.match(app, /\/api\/public\/demo-import-website/);
});

test('dark theme provides readable controls, stable hidden states and mobile layout', () => {
  assert.match(styles, /\.respondo-workspace-active \.dashboard-topbar/);
  assert.match(styles, /\.respondo-workspace \[hidden\]\{display:none!important\}/);
  assert.match(styles, /\.guided-setup-active \.guided-card \.guided-upload/);
  assert.match(styles, /\.respondo-workspace-chat-card \.preview-form input/);
  assert.match(styles, /@media\(max-width:650px\)/);
  assert.match(index, /workspace-continuation-v24\.css/);
  assert.match(app, /workspace-continuation-v24\.js/);
});
