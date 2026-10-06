import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');

test('English dashboard timestamps use a 12-hour clock', () => {
  assert.match(app, /en:'en-GB-u-hc-h12'/);
});

test('dynamic dashboard status strings are localized before rendering', () => {
  assert.doesNotMatch(app, /\$\{actionRequests\.filter\([\s\S]{0,120}\} avoinna<\/span>/);
  assert.match(app, /appText\('avoinna','öppna','open'\)/);
  assert.match(app, /appText\('Integraatio','Integration','Integration'\)/);
  assert.match(app, /appText\('Merkitse hoidetuksi','Markera som klar','Mark as done'\)/);
  assert.match(app, /appText\('Varattu','Bokad','Booked'\)/);
  assert.match(app, /appText\('Vapaa','Ledig','Available'\)/);
});


test('owner dashboard renders a bound logout control', () => {
  assert.match(app, /id="logoutTop"/);
  assert.match(app, /class="dashboard-logout"/);
  assert.match(app, /\$\('#logoutTop'\)\?\.addEventListener\('click', doLogout\)/);
});


test('staff dashboard logout button is bound', () => {
  assert.match(app, /id="logoutAgent"/);
  assert.match(app, /\$\('#logoutAgent'\)\?\.addEventListener\('click', doLogout\)/);
});
