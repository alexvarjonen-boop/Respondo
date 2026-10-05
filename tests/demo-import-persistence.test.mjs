import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server=fs.readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');

test('Try Bot website imports survive deploys through database persistence',()=>{
  assert.match(server,/CREATE TABLE IF NOT EXISTS demo_website_imports/);
  assert.match(server,/INSERT INTO demo_website_imports\(id,website,candidates,created_at\)/);
  assert.match(server,/SELECT website,candidates,created_at[\s\S]*FROM demo_website_imports/);
  assert.match(server,/imported=await loadDemoWebsiteImport\(demoImportId\)/);
});

test('public imported demo never mixes in authenticated owner knowledge',()=>{
  assert.match(
    server,
    /if \(!demoImportId\) \{[\s\S]*?SELECT id,category,title,answer,keywords,source_type,source_url FROM knowledge/
  );
  assert.match(server,/Public Try Bot imports must stay isolated from the logged-in owner's own/);
});


test('an already-open Try Bot session sends a compact inline copy of imported facts',()=>{
  assert.match(app,/customFacts:demoFacts\.slice\(0,350\)\.map/);
  assert.doesNotMatch(app,/customFacts:demoFacts\.filter\(x=>x\.sourceType!==['"]demo_import['"]\)/);
});
