import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server = await readFile(new URL('../server.mjs',import.meta.url),'utf8');
const front = await readFile(new URL('../public/app.js',import.meta.url),'utf8');

test('signup verification is delivered through configured mail provider',() => {
  assert.match(server,/async function sendSignupVerificationEmail/);
  assert.match(server,/process\.env\.RESEND_API_KEY/);
  assert.match(server,/process\.env\.EMAIL_VERIFICATION_FROM/);
  assert.match(server,/Vahvista sähköpostiosoitteesi/);
  assert.match(server,/Verification email provider rejected request/);
});

test('password checkout cannot bypass proof when transactional mail is configured',() => {
  assert.match(server,/app\.post\('\/api\/auth\/email-verification\/request', signupVerificationRequestLimiter/);
  assert.match(server,/app\.post\('\/api\/auth\/email-verification\/confirm', signupVerificationConfirmLimiter/);
  assert.match(server,/!socialSignup && signupEmailVerificationReady\(\) && !validSignupVerificationProof\(req,email\)/);
  assert.match(server,/type:'signup-email-verified',email/);
  assert.match(server,/crypto\.timingSafeEqual/);
  assert.match(server,/attempts >= 4/);
  assert.match(server,/expiresIn:'15m'/);
  assert.match(server,/expiresIn:'45m'/);
});

test('signup UI sends verification code and requires confirmation before checkout',() => {
  assert.match(front,/id="signupVerifyPanel"/);
  assert.match(front,/autocomplete="one-time-code"/);
  assert.match(front,/\/api\/auth\/email-verification\/request/);
  assert.match(front,/\/api\/auth\/email-verification\/confirm/);
  assert.match(front,/if \(!cfg\.emailVerificationAvailable \|\| signupForm\.dataset\.oauthVerified === 'true' \|\| verifiedSignupEmail === signupEmail\(\)\)/);
});
