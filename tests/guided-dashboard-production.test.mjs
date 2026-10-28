import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
const css=await readFile(new URL('../public/guided-setup-v22.css',import.meta.url),'utf8');
const index=await readFile(new URL('../public/index.html',import.meta.url),'utf8');

test('production dashboard asks only for website on the first setup card',()=>{
  assert.match(app,/const showGuidedSetup = !hasWebsite &&/);
  assert.match(app,/data-guided-step="1"[\s\S]*name="website"[\s\S]*data-guided-next/);
  assert.match(css,/\.guided-setup-active \.dashboard-view-section/);
});
test('separate steps for identity, optional answers and final create',()=>{
  assert.match(app,/data-guided-step="2"[\s\S]*name="botName"[\s\S]*data-guided-avatar/);
  assert.match(app,/data-guided-step="3"[\s\S]*OPTIONAL[\s\S]*name="question\$\{i\}"/);
  assert.match(app,/guided-skip/);
  assert.match(app,/await api\('\/api\/app\/business-profile'/);
  assert.match(app,/await api\('\/api\/app\/knowledge'/);
  assert.match(app,/guidedImport=1/);
  assert.match(app,/document\.getElementById\('importWebsite'\)/);
});
test('profile sidebar offers companies subscription and settings without merging old main branch',()=>{
  for(const target of ['workspaces','billing','account-security'])assert.ok(app.includes('data-account-target="'+target+'"'));
  assert.match(app,/dashboard-profile-toggle/);
  assert.match(index,/guided-setup-v22\.css/);
});