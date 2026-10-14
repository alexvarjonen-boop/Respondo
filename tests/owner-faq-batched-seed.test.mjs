import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server = await readFile(new URL('../server.mjs', import.meta.url), 'utf8');

test('multilingual owner FAQ seed uses bounded PostgreSQL insert batches', () => {
  const start = server.indexOf('async function seedOwnerRespondoKnowledge()');
  const end = server.indexOf('async function ensureRuntimeSchema()', start);
  assert.ok(start >= 0 && end > start);
  const seed = server.slice(start, end);
  assert.match(seed, /const seedBatchSize = 250;/);
  assert.match(seed, /for \(let start = 0; start < rows\.length; start \+= seedBatchSize\)/);
  assert.match(seed, /const batch = rows\.slice\(start, start \+ seedBatchSize\)/);
  assert.match(seed, /batch\.forEach\(\(row,index\) =>/);
  assert.doesNotMatch(seed, /rows\.forEach\(\(row,index\) =>/);
  assert.match(seed, /await client\.query\('BEGIN'\)/);
  assert.match(seed, /await client\.query\('COMMIT'\)/);
  assert.match(seed, /await client\.query\('ROLLBACK'\)/);
  assert.ok(250 * 8 < 65535, 'Each PostgreSQL batch must fit the bind parameter limit');
});
