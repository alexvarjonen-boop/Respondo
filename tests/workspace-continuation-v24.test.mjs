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

test('iPhone onboarding card headings stay visible and the redundant light dashboard header is hidden', () => {
  assert.match(styles, /guided-setup-form > \.guided-card h1,/);
  assert.match(styles, /-webkit-text-fill-color:#f7f8fb!important/);
  assert.match(styles, /guided-setup-form > \.guided-card > p/);
  assert.match(styles, /guided-setup-active > \.dashboard-simple-main > \.dashboard-topbar\.dashboard-has-drawer/);
  assert.match(styles, /display:none!important;\s*visibility:hidden!important/);
  assert.match(index, /onboarding-contrast-v25/);
});


test('each menu section has a real isolated destination instead of recycling the answers panel', () => {
  assert.match(workspace,/function selectView\(next\)/);
  assert.match(workspace,/const primary=\{/);
  assert.match(workspace,/showModuleTab\(primary\[selected\]\)/);
  assert.match(workspace,/park\(\);\s*card\.replaceChildren\(\)/);
  assert.match(workspace,/storage\.appendChild\(activePanel\)/);
  assert.match(workspace,/card\.appendChild\(target\)/);
  assert.match(workspace,/const details=\{/);
  assert.match(workspace,/callout\(pages\[selected\],details\[selected\]\)/);
  assert.match(styles,/#respondoWorkspaceModules \.dashboard-view-section \{/);
  assert.match(styles,/#respondoWorkspaceCardBody > \.dashboard-view-section/);
});

test('clean workspace uses one header and a compact functional settings form', () => {
  assert.match(workspace,/original\.requestSubmit\(\)/);
  assert.match(workspace,/if\(demo\)\{/);
  assert.match(workspace,/const fields=\[/);
  assert.match(workspace,/rsSimpleSettingsForm/);
  assert.match(workspace,/workspace\.addEventListener\('click'/);
  assert.match(styles,/#app \.dashboard-premium-shell\.respondo-workspace-active > \.dashboard-simple-main > \.dashboard-topbar\.dashboard-has-drawer/);
  assert.match(styles,/\.respondo-workspace-brand-logo img/);
  assert.match(styles,/\.rs-simple-field input/);
  assert.match(styles,/rs-knowledge-collapsed/);
  assert.match(index,/onboarding-contrast-v25-minimal-v26/);
});
