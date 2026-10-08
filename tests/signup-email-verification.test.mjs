import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server=fs.readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');

test('password signups are blocked until ownership is verified and OAuth email is distinct',()=>{
  const start=server.indexOf("app.post('/api/auth/start-checkout'");
  const end=server.indexOf("app.get('/api/auth/checkout-success'",start);
  const checkout=server.slice(start,end);
  assert.match(checkout,/!socialSignup && !signupEmailVerified\(req,email\)/);
  assert.match(checkout,/EMAIL_VERIFICATION_REQUIRED/);
  assert.ok(checkout.indexOf('signupEmailVerified')<checkout.indexOf("INSERT INTO users("));
  assert.ok(checkout.indexOf('signupEmailVerified')<checkout.indexOf("stripe.checkout.sessions.create"));
  assert.match(checkout,/email_verified_at[\s\S]*NOW\(\)/);
  assert.match(checkout,/clearCookie\(VERIFIED_EMAIL_COOKIE\)/);
});

test('email challenge links are random, hashed, expire and are one-time',()=>{
  assert.match(server,/crypto\.randomBytes\(32\)\.toString\('base64url'\)/);
  assert.match(server,/crypto\.createHash\('sha256'\)\.update\(raw\)\.digest\('hex'\)/);
  assert.match(server,/NOW\(\)\+INTERVAL '30 minutes'/);
  assert.match(server,/SELECT id,email,user_id,purpose FROM email_verification_tokens WHERE token_hash=\$1 AND used_at IS NULL AND expires_at>NOW\(\) FOR UPDATE/);
  assert.match(server,/UPDATE email_verification_tokens SET used_at=NOW\(\) WHERE id=\$1/);
  assert.match(server,/res\.cookie\(VERIFIED_EMAIL_COOKIE,jwt\.sign/);
  assert.match(server,/validVerificationAddress\(payload\.email\)===email/);
  assert.match(server,/MAX_HOURLY=4/);
});

test('email scanners cannot confirm through a mere GET and user must click POST',()=>{
  assert.match(server,/app\.get\('\/api\/auth\/email-verification\/confirm'/);
  assert.match(server,/form method="POST" action="\/api\/auth\/email-verification\/confirm"/);
  assert.match(server,/app\.post\('\/api\/auth\/email-verification\/confirm', checkoutLimiter/);
  assert.match(server,/res\.redirect\(303,'\/tilaus\?email_verified=1'\)/);
});

test('email change is not applied before the new address is verified',()=>{
  const start=server.indexOf("app.post('/api/app/account/email'");
  const end=server.indexOf("app.post('/api/app/account/password'",start);
  const route=server.slice(start,end);
  assert.match(route,/bcrypt\.compare\(currentPassword,rr\.rows\[0\]\.password_hash\)/);
  assert.match(route,/issueEmailVerificationToken\(/);
  assert.doesNotMatch(route,/UPDATE users[\s\S]*SET email=\$1/);
  assert.match(server,/UPDATE users SET email=\$1,email_verified_at=NOW\(\),session_version=session_version\+1/);
});

test('unconfigured email provider fails closed and signup UI explains verification',()=>{
  assert.match(server,/if\(!verificationEmailAvailable\(\)\)/);
  assert.match(server,/publicStatus:503/);
  assert.match(app,/if\(err\.status===403\)/);
  assert.match(app,/\/api\/auth\/email-verification\/request/);
  assert.match(app,/email_verified/);
});
