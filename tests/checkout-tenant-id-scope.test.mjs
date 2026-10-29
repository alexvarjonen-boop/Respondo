import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const server = readFileSync(new URL('../server.mjs', import.meta.url), 'utf8');
const start = server.indexOf("app.post('/api/auth/start-checkout'");
const end = server.indexOf("app.get('/api/auth/checkout-success'", start);

test('checkout tenant ID survives transaction scope for signed checkout cookie', () => {
  assert.ok(start >= 0 && end > start, 'signup checkout route exists');
  const route = server.slice(start, end);
  const client = route.indexOf('const client = await pool.connect();');
  const declaration = route.indexOf('let tenantId;', client);
  const assignment = route.indexOf('tenantId = uid();', declaration);
  const release = route.indexOf('client.release();', assignment);
  const cookie = route.indexOf('jwt.sign({ sessionId:session.id,userId:id,tenantId }', release);
  assert.ok(client >= 0 && declaration > client, 'tenantId declared in outer checkout scope');
  assert.ok(assignment > declaration, 'tenantId assigned to the inserted tenant');
  assert.ok(release > assignment, 'transaction completes before cookie');
  assert.ok(cookie > release, 'checkout cookie can read tenantId after transaction');
  assert.doesNotMatch(route.slice(declaration, cookie), /\bconst tenantId\s*=/,
    'inner transaction must not shadow tenantId used by checkout cookie');
});
