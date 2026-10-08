import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server=fs.readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');

test('Try Bot website import really scans and feeds imported facts into demo chat',()=>{
  assert.match(server,/app\.post\('\/api\/public\/demo-import-website'/);
  assert.match(server,/fetchWebsiteBundle\([\s\S]{0,120}website,[\s\S]{0,80}40,[\s\S]{0,80}12000/);
  assert.match(server,/websiteKnowledgeCandidates\(bundle\)/);
  assert.match(server,/source_url:\s*normalizeWebUrl\(meta\.sourceUrl,false\)/);
  assert.match(server,/demoWebsiteImports\.set\(demoImportId/);
  assert.match(server,/demoWebsiteImports\.get\(demoImportId\)/);
  assert.match(server,/chatActions\(rows, message, handoff, detectedLang, result\.selected \|\| \[\]\)/);

  assert.match(app,/\/api\/public\/demo-import-website/);
  assert.match(app,/sourceType:'demo_import'/);
  assert.match(app,/demoImportId=String\(result\.demoImportId\|\|''\)\.trim\(\)/);
  assert.match(app,/demoImportId,/);
  assert.match(app,/customFacts:previewFallbackFacts\(question\)/);
  assert.match(app,/const previewFallbackFacts=\(question\)=>/);
  assert.match(app,/category:String\(fact\.category\|\|''\)\.slice\(0,64\)/);
  assert.match(app,/sourceUrl:String\(fact\.sourceUrl\|\|''\)\.slice\(0,350\)/);
  assert.doesNotMatch(app,/Automaattinen verkkosivun tietojen haku avautuu tilauksen yhteydessä/);
});


test('mobile Try Bot header remains pinned but does not duplicate large section dropdown above the tabs',()=>{
  const css=fs.readFileSync(new URL('../public/styles.css',import.meta.url),'utf8');
  const responsive=css.slice(css.lastIndexOf('/* Keep the Try Bot preview usable on small phones:'));
  assert.match(responsive,/@media\(max-width:760px\)/);
  assert.match(responsive,/\.demo-sticky-topbar \.dashboard-section-picker\s*\{\s*display:none!important;/);
  assert.match(responsive,/\.demo-sticky-topbar \.demo-section-strip\s*\{[^}]*grid-row:2!important;/s);
  assert.match(responsive,/\.demo-sticky-topbar \.demo-public-actions\s*\{[^}]*grid-row:1!important;/s);
  assert.match(css,/\.demo-dashboard-main > \.demo-sticky-topbar\s*\{[^}]*position:fixed!important;/s);
  assert.match(app,/demo-sticky-header-space/);
});
