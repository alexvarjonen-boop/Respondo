import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../public/styles.css', import.meta.url), 'utf8');
const begin = app.indexOf('function signup() {');
const end = app.indexOf('\nfunction login()', begin);
const signup = app.slice(begin, end);

test('signup opens directly with a working account creation form', () => {
  assert.ok(begin >= 0 && end > begin);
  assert.match(signup, /class="formpage signup-page"/);
  assert.match(signup, /class="container checkout-layout signup-layout"/);
  assert.match(signup, /<form class="formcard premium-form" id="signup">/);
  assert.doesNotMatch(signup, /class="checkout-copy"|class="checkout-steps"|class="seller-card"/);
  assert.match(signup, /name="email"/);
  assert.match(signup, /name="password"/);
  assert.match(signup, /name="plan"/);
  assert.ok(/name="terms"|checkoutBusinessTerms\('terms'/.test(signup));
  assert.match(signup, /signup-seller-note/);
  assert.ok(signup.indexOf('id="signup"') < signup.indexOf('signup-seller-note'));
  assert.match(css, /#app \.signup-page \.signup-layout/);
});
