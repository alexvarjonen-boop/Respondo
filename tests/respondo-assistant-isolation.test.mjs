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
