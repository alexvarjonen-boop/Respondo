import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server=fs.readFileSync(new URL('../server.mjs',import.meta.url),'utf8');

test('site assistant always selects the Respondo workspace first',()=>{
  assert.match(
    server,
    /app\.post\('\/api\/public\/respondo-assistant\/chat'[\s\S]*?ORDER BY[\s\S]*?WHEN lower\(COALESCE\(t\.slug,''\)\) IN \('respondo','respondoai'\) THEN 0/
  );
});

test('site assistant only searches curated Respondo FAQ rows',()=>{
  assert.match(
    server,
    /app\.post\('\/api\/public\/respondo-assistant\/chat'[\s\S]*?source_type='respondo_seed'/
  );
  assert.match(server,/if\(!websiteQuestion && category\.endsWith\(' · Sivusto'\)\) return false/);
  assert.match(server,/if\(!websiteQuestion && looksLikeWebsiteDump\)/);
});


test('first-party seed generically quarantines approved foreign website/profile imports',()=>{
  assert.match(
    server,
    /SELECT id,source_url[\s\S]*FROM knowledge[\s\S]*source_type IN \('website','profile'\)[\s\S]*approved=true/
  );
  assert.match(server,/\.filter\(\(row\)=>!respondoFirstPartyWebsiteAllowed\(row\.source_url\)\)/);
  assert.match(
    server,
    /UPDATE knowledge SET approved=false,updated_at=NOW\(\) WHERE tenant_id=\$1 AND id=ANY\(\$2::uuid\[\]\)/
  );
});

test('first-party production tenant prefers the official Respondo domain over Railway URLs',()=>{
  assert.match(
    server,
    /process\.env\.NODE_ENV === 'production' \? 'https:\/\/www\.respondoai\.fi' : BASE/
  );
  const start=server.indexOf('function respondoOwnerSiteUrl()');
  assert.ok(start>=0);
  const body=server.slice(start,start+1200);
  assert.match(body,/process\.env\.RESPONDO_CANONICAL_URL/);
  assert.match(body,/SEO_CANONICAL_ORIGIN/);
  assert.ok(
    body.indexOf('SEO_CANONICAL_ORIGIN') < body.indexOf('process.env.BASE_URL'),
    'official canonical origin must be preferred before BASE_URL and Railway URLs'
  );
});
