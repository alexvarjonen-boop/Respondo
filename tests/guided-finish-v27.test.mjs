import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
const css=await readFile(new URL('../public/guided-finish-v27.css',import.meta.url),'utf8');
const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');

test('the onboarding visual corrections load after the old workspace overrides',()=>{
  assert.ok(html.indexOf('/guided-finish-v27.css')>html.indexOf('/workspace-continuation-v24.css'));
  assert.match(css,/\.guided-setup-form/);
  assert.match(css,/\.guided-card/);
  assert.match(css,/@media\(max-width:760px\)/);
});
test('all guided form text inputs and textareas have visible text, caret and placeholder in iOS Safari',()=>{
  assert.match(css,/#guidedSetupForm \.guided-card input:not\(\[type="hidden"\]\):not\(\[type="file"\]\)/);
  assert.match(css,/#guidedSetupForm \.guided-card textarea/);
  assert.match(css,/color:#f8f9fc!important/);
  assert.match(css,/-webkit-text-fill-color:#f8f9fc!important/);
  assert.match(css,/caret-color:#f8f9fc!important/);
  assert.match(css,/input::placeholder/);
  assert.match(css,/input:-webkit-autofill/);
});
test('all five wizard cards still exist and final action starts existing scan',()=>{
  for(let i=1;i<=5;i++)assert.ok(app.includes('data-guided-step="'+i+'"'));
  assert.match(app,/Scan website & try bot/);
  assert.match(app,/activateRespondoWorkspace\(\{demo:true,view:'bot'\}\)/);
});
