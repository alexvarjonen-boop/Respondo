import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server=fs.readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');

test('Try Bot website import really scans and feeds imported facts into demo chat',()=>{
  assert.match(server,/app\.post\('\/api\/public\/demo-import-website'/);
  assert.match(server,/fetchWebsiteBundle\(website,180,55000\)/);
  assert.match(server,/websiteKnowledgeCandidates\(bundle\)/);
  assert.match(server,/source_url:\s*normalizeWebUrl\(meta\.sourceUrl,false\)/);
  assert.match(server,/demoWebsiteImports\.set\(demoImportId/);
  assert.match(server,/demoWebsiteImports\.get\(demoImportId\)/);
  assert.match(server,/chatActions\(rows, message, handoff, detectedLang, result\.selected \|\| \[\]\)/);

  assert.match(app,/\/api\/public\/demo-import-website/);
  assert.match(app,/sourceType:'demo_import'/);
  assert.match(app,/demoImportId=String\(result\.demoImportId\|\|''\)\.trim\(\)/);
  assert.match(app,/demoImportId,/);
  assert.match(app,/customFacts:demoFacts\.slice\(0,350\)\.map\(x=>\(\{/);
  assert.match(app,/category:x\.category/);
  assert.match(app,/sourceUrl:x\.sourceUrl/);
  assert.doesNotMatch(app,/Automaattinen verkkosivun tietojen haku avautuu tilauksen yhteydessä/);
});
