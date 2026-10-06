import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server = await readFile(new URL('../server.mjs', import.meta.url), 'utf8');

test('integration encryption key is separated from session signing with legacy decrypt fallback', () => {
  assert.match(server, /process\.env\.DATA_ENCRYPTION_KEY/);
  assert.match(server, /DATA_ENCRYPTION_SECRET \|\| JWT/);
  assert.match(server, /LEGACY_SECRET_KEY = crypto\.createHash\('sha256'\)\.update\(JWT\)\.digest\(\)/);
  assert.match(server, /decryptSecretWithKey\(text, SECRET_KEY\)/);
  assert.match(server, /decryptSecretWithKey\(text, LEGACY_SECRET_KEY\)/);
});
