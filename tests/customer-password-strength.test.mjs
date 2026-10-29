import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {customerPasswordChecks,customerPasswordValid,customerPasswordStrength,CUSTOMER_PASSWORD_MAX_LENGTH} from '../public/customer-password-policy.mjs';

const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const styles=readFileSync(new URL('../public/styles.css',import.meta.url),'utf8');

test('customer password policy: min 8, uppercase, lowercase, digit, true special character',()=>{
  assert.equal(CUSTOMER_PASSWORD_MAX_LENGTH,200);
  for(const invalid of [
    '', 'ABCd1!', 'abcdef12!', 'ABCDEFG1!', 'Abcdefg!', 'Abcdefg1',
    'Abcdefg1 ', 'Abcdefg1\t', 'A'.repeat(201)+'b9!',
  ])assert.equal(customerPasswordValid(invalid),false,JSON.stringify(invalid));
  for(const valid of ['Abcdef1!', 'H3llo-WøRlD!', 'ÄäBb12#$', 'S0methingReallyL0ng&Secure']){
    assert.equal(customerPasswordValid(valid),true,valid);
  }
  assert.deepEqual(customerPasswordChecks('Abcdef1!'),{
    length:true,upper:true,lower:true,digit:true,special:true,
  });
});

test('strength meter progresses sensibly without treating an invalid 8-character password as strong',()=>{
  assert.equal(customerPasswordStrength(''),0);
  assert.equal(customerPasswordStrength('abc'),1);
  assert.equal(customerPasswordStrength('Abcdef1!'),2);
  assert.equal(customerPasswordStrength('Abcdefgh1!'),3);
  assert.equal(customerPasswordStrength('Abcdefghijklm1!'),4);
});

test('signup customer password uses requirements and meter with consistent validation on API',()=>{
  assert.match(app,/id="signupPasswordField"/);
  assert.match(app,/name="password" type="password" data-customer-password minlength="8" maxlength="200"/);
  assert.match(app,/passwordStrengthMarkup\(\)/);
  assert.match(server,/!socialSignup && !setupService && !customerPasswordValid\(password\)/);
  assert.match(server,/import \{ customerPasswordValid \} from '\.\/public\/customer-password-policy\.mjs'/);
  assert.match(app,/bindCustomerPasswordStrength\(\);/);
  assert.match(app,/input\.setCustomValidity\(value && !customerPasswordValid\(value\)/);
});

test('password creation/changes use the same policy in password reset, Google setup and Settings',()=>{
  const backend=[
    ["app.post('/api/auth/password-reset/confirm'",'app.post(\'/api/auth/logout\''],
  ];
  assert.match(server,/if \(!customerPasswordValid\(newPassword\)\)/);
  assert.match(server,/if\(!customerPasswordValid\(newPassword\)\)/);
  assert.equal((server.match(/!customerPasswordValid\(newPassword\)/g)||[]).length,3);
  assert.match(app,/id="resetNewPassword" type="password" autocomplete="new-password" data-customer-password minlength="8"/);
  assert.match(app,/name="newPassword" type="password" autocomplete="new-password" data-customer-password required minlength="8"/);
  assert.equal((app.match(/if\(!customerPasswordValid\(newPassword\)\)/g)||[]).length,2);
  assert.match(app,/customerPasswordPolicyMessage\(\)/);
});

test('live Apple-style meter has four segments, localized rule list, five checks and light/dark responsive CSS',()=>{
  assert.match(app,/class="password-strength-bar" role="meter"/);
  assert.match(app,/aria-valuemax="4"/);
  assert.match(app,/<i><\/i><i><\/i><i><\/i><i><\/i>/);
  assert.match(app,/data-pw-rule/);
  assert.match(app,/Object\.entries\(PASSWORD_RULE_LABELS\)/);
  assert.match(app,/data\.met=String\(valid\)/);
  assert.match(app,/panel\.dataset\.strength=String\(score\)/);
  assert.match(app,/strong data-strength-label aria-live="polite"/);
  for(const text of ['Vähintään 8 merkkiä','Minst 8 tecken','At least 8 characters','Erikoismerkki','Specialtecken','Special character'])
    assert.ok(app.includes(text),text);
  assert.match(styles,/\.password-strength-panel\[data-strength="4"\]/);
  assert.match(styles,/\.signup-dark-shell \.password-strength-panel/);
  assert.match(styles,/@media\(max-width:570px\)/);
});

test('existing owner-issued temporary passwords and support-agent authentication are unchanged',()=>{
  assert.match(server,/if\(password\.length<14 \|\| password\.length>72/);
  assert.match(app,/const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'/m)===false;
  // Password policy must not accidentally block the owner-created setup codes
  // or require a customer password when assisted setup creates credentials.
  assert.match(server,/!socialSignup && !setupService && !customerPasswordValid\(password\)/);
});
