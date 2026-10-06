import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server = await readFile(new URL('../server.mjs', import.meta.url), 'utf8');

test('owner FAQ seed is serialized and content-versioned across Railway services', () => {
  assert.match(server,/pg_advisory_lock\(hashtext\('respondo_owner_seed_v1'\)\)/);
  assert.match(server,/pg_advisory_unlock\(hashtext\('respondo_owner_seed_v1'\)\)/);
  assert.match(server,/withOwnerSeedLock\(\(\) => seedOwnerRespondoKnowledge\(\)\)/);
  assert.match(server,/respondo_seed_sha256/);
  assert.match(server,/state\.seed_hash === seedHash/);
  assert.match(server,/Number\(state\.target_count \|\| 0\) === rows\.length/);
  assert.match(server,/reason:'already_current'/);
});

test('seed self-heals duplicate or foreign seed rows instead of trusting hash alone', () => {
  assert.match(server,/foreign_count/);
  assert.match(server,/leaked_count/);
  assert.match(server,/Number\(state\.foreign_count \|\| 0\) === 0/);
  assert.match(server,/Number\(state\.leaked_count \|\| 0\) === 0/);
});
