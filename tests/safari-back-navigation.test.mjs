import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');

test('Safari back-forward restore reloads the homepage and resets scroll position',()=>{
  assert.match(app,/history\.scrollRestoration='manual'/);
  assert.match(app,/window\.addEventListener\('pageshow',\(event\)=>/);
  assert.match(app,/location\.pathname!=='\/' \|\| !event\.persisted/);
  assert.match(app,/sessionStorage\.setItem\(HOME_HISTORY_RESET_KEY,'1'\)/);
  assert.match(app,/location\.reload\(\)/);
  assert.match(app,/navType==='back_forward'/);
  assert.match(app,/window\.scrollTo\(\{top:0,left:0,behavior:'auto'\}\)/);
});
