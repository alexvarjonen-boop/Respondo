import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('lead dashboard is not served as a public static file', () => {
  const root = path.resolve(import.meta.dirname,'..');
  assert.equal(fs.existsSync(path.join(root,'public','leads.html')),false);
  assert.equal(fs.existsSync(path.join(root,'private-leads.html')),true);
});
test('lead dashboard route is protected by auth and ownerOnly', () => {
  const server = fs.readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
  assert.match(server,/app\.get\('\/app\/leads', auth, ownerOnly,/);
  assert.match(server,/sendFile\(path\.join\(__dirname,'private-leads\.html'\)\)/);
});
