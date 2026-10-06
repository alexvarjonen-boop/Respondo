import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server = await readFile(new URL('../server.mjs', import.meta.url), 'utf8');

test('first-party Respondo tenant rejects foreign authenticated website imports', () => {
  assert.match(server, /function respondoFirstPartyWebsiteAllowed\(value\)/);
  assert.match(server, /const allowed=new Set\(\['respondoai\.fi'\]\)/);
  assert.match(
    server,
    /function tenantWebsiteImportAllowed\(tenant,value\) \{[\s\S]*?!isFirstPartyRespondoTenant\(tenant\) \|\| respondoFirstPartyWebsiteAllowed\(value\)/,
  );

  const start = server.slice(
    server.indexOf("app.post('/api/app/import-website/start'"),
    server.indexOf("app.get('/api/app/import-website/status/")
  );
  assert.match(start, /SELECT id,name,slug,website FROM tenants/);
  assert.match(start, /tenantWebsiteImportAllowed\(tenantResult\.rows\[0\],website\)/);
  assert.match(start, /Testaa bottia/);

  const direct = server.slice(
    server.indexOf("app.post('/api/app/import-website',"),
    server.indexOf("app.post('/api/app/import-website/approve'")
  );
  assert.match(direct, /SELECT id,name,slug,website FROM tenants/);
  assert.match(direct, /tenantWebsiteImportAllowed\(tenantResult\.rows\[0\],website\)/);
});

test('first-party approval only accepts Respondo-owned source URLs while customer tenants remain host-scoped', () => {
  const approve = server.slice(
    server.indexOf("app.post('/api/app/import-website/approve'"),
    server.indexOf("app.post('/api/app/unanswered/")
  );
  assert.match(approve, /SELECT id,name,slug,website FROM tenants/);
  assert.match(
    approve,
    /if \(isFirstPartyRespondoTenant\(tenant\)\) \{\s*if \(!respondoFirstPartyWebsiteAllowed\(sourceUrl\)\) continue;\s*\} else if \(tenantWebsite && sourceHost !== normalizeHost\(tenantWebsite\)\) continue;/,
  );
});

test('first-party business profile cannot be switched to an unrelated company website', () => {
  const profile = server.slice(
    server.indexOf("app.post('/api/app/business-profile'"),
    server.indexOf("app.post('/api/app/business-email'")
  );
  assert.match(profile, /SELECT id,name,slug,website FROM tenants/);
  assert.match(profile, /website && !tenantWebsiteImportAllowed\(t\.rows\[0\],website\)/);
  assert.match(profile, /omaan työtilaan ei voi vaihtaa toisen yrityksen verkkosivua/);
});
