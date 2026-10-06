import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server = await readFile(new URL('../server.mjs', import.meta.url), 'utf8');
const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');

test('owner password reset uses one-time hashed expiring tokens', () => {
  assert.match(server, /CREATE TABLE IF NOT EXISTS password_reset_tokens/);
  assert.match(server, /token_hash TEXT NOT NULL UNIQUE/);
  assert.match(server, /expires_at TIMESTAMPTZ NOT NULL/);
  assert.match(server, /used_at TIMESTAMPTZ/);
  assert.match(server, /crypto\.createHash\('sha256'\)\.update\(rawToken\)\.digest\('hex'\)/);
  assert.match(server, /NOW\(\) \+ INTERVAL '30 minutes'/);
  assert.match(server, /prt\.expires_at > NOW\(\)/);
  assert.match(server, /prt\.used_at IS NULL/);
});

test('successful reset revokes existing owner sessions', () => {
  assert.match(
    server,
    /UPDATE users SET password_hash=\$1,session_version=session_version\+1,updated_at=NOW\(\) WHERE id=\$2/,
  );
  assert.match(
    server,
    /UPDATE password_reset_tokens SET used_at=NOW\(\) WHERE user_id=\$1 AND used_at IS NULL/,
  );
});

test('reset request does not reveal whether an account exists', () => {
  assert.match(
    server,
    /message:'Jos sähköpostilla löytyy tili, lähetämme salasanan palautuslinkin\.'/,
  );
  assert.match(server, /if \(!found\.rowCount \|\| found\.rows\[0\]\.status === 'pending'\) return res\.json\(generic\)/);
});

test('login UI exposes owner recovery and staff recovery guidance', () => {
  assert.match(app, /id="showPasswordReset"/);
  assert.match(app, /id="requestPasswordReset"/);
  assert.match(app, /id="confirmPasswordReset"/);
  assert.match(app, /\/api\/auth\/password-reset\/request/);
  assert.match(app, /\/api\/auth\/password-reset\/confirm/);
  assert.match(app, /Forgot the staff password\?/);
});
