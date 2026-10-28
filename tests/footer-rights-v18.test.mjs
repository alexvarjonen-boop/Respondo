import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = name => readFileSync(new URL('../public/'+name, import.meta.url), 'utf8');
const app = read('app.js');
const index = read('index.html');
const footer = app.slice(app.indexOf('function footer() {'), app.indexOf('function heroVisual() {'));

test('public footer shows localized copyright and all rights reserved on all pages', () => {
  assert.ok(footer.startsWith('function footer()'));
  assert.match(footer,/© \$\{new Date\(\)\.getFullYear\(\)\} RESPONDO AI/);
  assert.match(footer,/appText\("Kaikki oikeudet pidätetään\.","Alla rättigheter förbehållna\.","All rights reserved\."\)/);
  assert.equal((footer.match(/All rights reserved\./g)||[]).length,1);
  assert.match(footer,/<div class="legalbar">/);
});

test('copyright text does not replace the existing footer links or company identity', () => {
  for(const value of ['footer-brand-identity','/tietosuoja?lang=','/kayttoehdot?lang=','/evasteet?lang=','/dpa?lang=','mailto:']) {
    assert.ok(footer.includes(value),value);
  }
  assert.ok(!footer.includes('© 2026'));
  assert.match(index,/app\.js\?v=[^"]*-hero-clarity-v17-footer-rights-v18/);
});
