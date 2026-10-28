import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
const css=await readFile(new URL('../public/guided-finish-v27.css',import.meta.url),'utf8');
const wizard=app.slice(app.indexOf('data-guided-step="3"'),app.indexOf('data-guided-step="4"'));

test('step 3 shows a single question and answer initially with a localized add button',()=>{
  assert.match(wizard,/\$\{\[1\]\.map\(\(i\) =>/);
  assert.match(wizard,/data-guided-qa-row="\$\{i\}"/);
  assert.match(wizard,/data-guided-add-qa/);
  assert.match(wizard,/Lisää kysymys ja vastaus/);
  assert.match(wizard,/Lägg till en fråga och ett svar/);
  assert.match(wizard,/Add a question and answer/);
  assert.doesNotMatch(wizard,/\[1,2,3\]\.map/);
});
test('one button adds up to twenty editable and removable FAQ pairs',()=>{
  assert.match(app,/function initGuidedQaRows\(form\)/);
  assert.match(app,/const maxRows=20/);
  assert.match(app,/first\.cloneNode\(true\)/);
  assert.match(app,/list\.appendChild\(newRow\)/);
  assert.match(app,/data-guided-remove-qa/);
  assert.match(app,/renumber\(\)/);
  assert.match(css,/\.guided-add-qa/);
  assert.match(css,/\.guided-qa-remove/);
});
test('both demo and production count, skip and persist every completed added row',()=>{
  assert.match(app,/const demoQaController=initGuidedQaRows\(demoGuidedForm\)/);
  assert.match(app,/const guidedQaController=initGuidedQaRows\(guidedForm\)/);
  assert.match(app,/const answers = guidedQaPairs\(demoGuidedForm\)\.length/);
  assert.match(app,/const answerCount = guidedQaPairs\(guidedForm\)\.length/);
  assert.match(app,/demoQaController\.reset\(\)/);
  assert.match(app,/guidedQaController\.reset\(\)/);
  assert.match(app,/of guidedQaPairs\(demoGuidedForm\)/);
  assert.match(app,/of guidedQaPairs\(guidedForm\)/);
  assert.match(app,/savedGuidedAnswers\.get\(i\)/);
  assert.match(app,/savedGuidedAnswers\.set\(i,answerFingerprint\)/);
  assert.match(app,/demoFacts\.push\(\{title,answer/);
});
test('iPhone sees the updated JavaScript and CSS instead of old three-row assets',()=>{
  assert.match(html,/qa-on-demand-v30/);
  assert.ok(html.indexOf('guided-finish-v27.css')>html.indexOf('guided-setup-v22.css'));
  assert.match(css,/guided-add-qa\[hidden\]/);
});
