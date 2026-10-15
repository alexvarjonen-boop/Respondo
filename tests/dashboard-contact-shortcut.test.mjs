import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../public/styles.css', import.meta.url), 'utf8');

test('overview contact counter opens the actual customer lead list', () => {
  assert.match(app, /<button type="button" class="stat stat-contact-shortcut" id="dashboardContactShortcut"/);
  assert.match(app, /\$\('#dashboardContactShortcut'\)\?\.addEventListener\('click', \(\) => openDashboardTarget\('leads'\)\)/);
  assert.match(app, /'leads':'customers'/);
  assert.match(app, /data-dashboard-view="customers" id="leads"/);
  assert.match(app, /getElementById\(targetId\)\?\.scrollIntoView/);
  assert.match(css, /\.stat-contact-shortcut:focus-visible/);
});

test('public demo contact counter also opens the lead list', () => {
  assert.match(app, /showDemoDashboardView\('customers', \{scrollTop:false\}\)/);
  assert.match(app, /getElementById\('leads'\)\?\.scrollIntoView/);
});
