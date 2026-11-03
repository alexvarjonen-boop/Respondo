import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
const server=await readFile(new URL('../server.mjs',import.meta.url),'utf8');

test('website importer runs tenant-scoped actual bot validation automatically',()=>{
  assert.match(app,/api\('\/api\/app\/import-website\/validate\/\x27\+encodeURIComponent\(result\.jobId\)/);
  assert.match(app,/if\(result\.jobId\)/);
  assert.match(server,/app\.post\('\/api\/app\/import-website\/validate\/:jobId', auth, ownerOnly, subscribed/);
  assert.match(server,/job\.userId!==req\.user\.sub \|\| job\.tenantId!==tenant\.id/);
});

test('quality UI distinguishes source-backed candidates from proven correctness',()=>{
  assert.match(app,/grounded_candidate/);
  assert.match(app,/A citation does not prove factual correctness/);
  assert.match(app,/websiteImportQualityReport/);
  assert.match(app,/websiteImportValidationStatus/);
  assert.match(app,/details\.appendChild\(items\)/);
});
test('import approval remains available and quality audit is non-blocking',()=>{
  assert.match(app,/review\.prepend\(audit\)/);
  assert.match(app,/\.catch\(\(\)=>\{/);
  assert.match(app,/approveWebsiteImport/);
  assert.match(app,/fallback scan/);
});
