import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');

test('iPhone back navigation clears stale homepage scroll scenes before reload',()=>{
  assert.match(app,/function isHistoryNavigation\(\)/);
  assert.match(app,/nav\?\.type==='back_forward'/);
  assert.match(app,/performance\.navigation\?\.type===2/);
  assert.match(app,/function neutralizeRestoredHomeScene\(\)/);
  assert.match(app,/home-history-restoring/);
  assert.match(app,/\.cinema-conversation,\.cinema-stage,\.story-horizontal,\.story-track,\.story-sticky/);
  assert.match(app,/window\.addEventListener\('pagehide',\(event\)=>/);
  assert.match(app,/sessionStorage\.setItem\(HOME_HISTORY_RESET_KEY,'suspended'\)/);
  assert.match(app,/resetState!=='suspended'/);
  assert.match(app,/sessionStorage\.setItem\(HOME_HISTORY_RESET_KEY,'reloading'\)/);
  assert.match(app,/requestAnimationFrame\(\(\)=>location\.reload\(\)\)/);
});
