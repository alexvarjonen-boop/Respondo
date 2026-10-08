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
    /if \(!isPublicDemo && !demoImportId\) \{[\s\S]*?SELECT id,category,title,answer,keywords,source_type,source_url FROM knowledge/
  );
  assert.match(server,/Public Try Bot imports must stay isolated from the logged-in owner's own/);
});

test('an already-open Try Bot session sends a compact inline copy of imported facts',()=>{
  assert.match(app,/customFacts:previewFallbackFacts\(question\)/);
  assert.match(app,/\.filter\(f=>f\.sourceType==='demo_import'\)/);
  assert.match(app,/\.slice\(0,32\)/);
  assert.match(app,/answer:String\(fact\.answer\|\|''\)\.slice\(0,650\)/);
  assert.doesNotMatch(app,/customFacts:demoFacts\.slice\(0,350\)/);
  assert.doesNotMatch(app,/customFacts:demoFacts\.filter\(x=>x\.sourceType!==['"]demo_import['"]\)/);
});

test('public Try Bot requests are isolated after reload and from older tabs',()=>{
  assert.match(app,/publicDemo:true/);
  assert.match(app,/sessionStorage\.getItem\('respondo-public-demo-import-id'\)/);
  assert.match(app,/sessionStorage\.setItem\('respondo-public-demo-import-id',demoImportId\)/);
  assert.match(server,/refererPath === '\/assistant'/);
  assert.match(server,/body\.publicDemo === true/);
});

test('old Try Bot tabs can recover product facts from the restored website field',()=>{
  assert.match(server,/if \(isPublicDemo && broadProductQuestion\(message\)\)/);
  assert.match(server,/fetchWebsiteBundle\([\s\S]{0,120}website,[\s\S]{0,80}30,[\s\S]{0,80}10000/);
  assert.match(server,/Public demo self-heal scan failed/);
});
