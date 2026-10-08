import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const fx=fs.readFileSync(new URL('../public/effects.js',import.meta.url),'utf8');

test('website scan 400 validation errors do not silently retry or leave a fake 4% progress',()=>{
  assert.match(app,/error\.status = response\.status/);
  const start=app.indexOf("started=await api('/api/app/import-website/start'");
  const end=app.indexOf("if(!result){",start);
  const flow=app.slice(start,end);
  assert.ok(start>0 && end>start);
  assert.match(flow,/const retryable = \[404,405,500,502,503,504\]/);
  assert.match(flow,/if\(!retryable\) throw startError/);
  assert.doesNotMatch(flow,/setProgress\(4,/);
});

test('website scan errors are shown beside the import button, with tenant-safe next steps',()=>{
  assert.match(app,/id="websiteImportProgressError"/);
  assert.match(app,/progressError\.style\.display='block'/);
  assert.match(app,/if\(progress\) progress\.style\.display='none'/);
  assert.match(app,/demoLink\.href='\/assistant\?section=setup'/);
  assert.match(app,/addWorkspace\.click\(\)/);
});

test('marketing Respondo bubble is removed on paid and public workspace pages',()=>{
  const start=fx.indexOf('function assistant()');
  const end=fx.indexOf('const qLang',start);
  const code=fx.slice(start,end);
  assert.match(code,/if \(isWorkspacePage\(\)\)/);
  assert.match(code,/\.fx-assistant-launch/);
  assert.match(code,/\.fx-assistant/);
  assert.match(code,/return;/);
});
