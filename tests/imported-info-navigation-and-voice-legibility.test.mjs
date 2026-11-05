import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const workspace=read('public/workspace-continuation-v24.js');
const styles=read('public/workspace-continuation-v24.css');
const voice=read('public/voice-preview.js');
const index=read('public/index.html');
const app=read('public/app.js');

test('bot Review imported information opens the real import review, not settings or Overview',()=>{
  assert.match(workspace,/data-workspace-import-review="true"/);
  assert.doesNotMatch(workspace,/class="respondo-workspace-review-link" data-workspace-nav="settings"/);
  assert.match(workspace,/function openImportedReview\(\)\{/);
  assert.match(workspace,/selectView\('answers'\)/);
  assert.match(workspace,/showModuleTab\('knowledge'\)/);
  assert.match(workspace,/card\.prepend\(heading\)/);
  assert.match(workspace,/heading\.scrollIntoView\(\{behavior:'auto',block:'start'\}\)/);
  assert.match(workspace,/if\(review && workspace\.contains\(review\)\)\{/);
  assert.match(workspace,/openImportedReview\(\)/);
});

test('review uses the original interactive import candidates and restores them before navigating away',()=>{
  assert.match(workspace,/const source=\$\('#websiteImportReview'\)/);
  assert.match(workspace,/source\.before\(importedReviewMarker\)/);
  assert.match(workspace,/heading\.append\(source\)/);
  assert.match(workspace,/importedReviewMarker\.replaceWith\(importedReviewNode\)/);
  assert.match(workspace,/function selectView\(next\)\{\s*restoreImportedReview\(\)/);
  assert.match(workspace,/function showModuleTab\(id\)\{\s*restoreImportedReview\(\)/);
  // The real import approval and checkbox handlers are left intact on their
  // original nodes rather than creating fake copies of imported company data.
  assert.match(app,/id="approveWebsiteImport"/);
  assert.match(app,/document\.getElementById\('approveWebsiteImport'\)\?\.addEventListener/);
  assert.match(app,/\/api\/app\/import-website\/approve/);
  assert.match(app,/id="knowledgeList"/);
});

test('speech-language select remains legible on light composer in Chrome and Safari',()=>{
  assert.match(voice,/width:66px!important/);
  assert.match(voice,/-webkit-text-fill-color:#172638!important/);
  assert.match(voice,/color-scheme:light!important/);
  assert.match(voice,/appearance:menulist!important/);
  assert.match(voice,/padding-right:144px!important/);
  assert.match(voice,/\.respondo-voice-lang-picker option\{/);
  assert.match(voice,/\[\['fi','FI'\],\['sv','SV'\],\['en','EN'\]\]/);
  assert.match(voice,/voiceLanguageSelect\.value = initialSpeechLanguage\(\)/);
});

test('dark imported review remains readable and cached files are versioned',()=>{
  assert.match(styles,/\.rs-imported-review\{/);
  assert.match(styles,/\.rs-imported-review \.website-import-candidate/);
  assert.match(styles,/-webkit-text-fill-color:#cad5e5!important/);
  assert.match(index,/voice-preview\.js\?v=20261105-visible-speech-language-v3/);
  assert.match(index,/workspace-continuation-v24\.css\?v=[^"]*imported-review-v48/);
  assert.match(app,/workspace-continuation-v24\.js\?v=[^']*import-review-v2/);
  assert.match(index,/app\.js\?v=[^"]*imported-review-v2/);
});
