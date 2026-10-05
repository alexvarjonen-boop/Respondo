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
  assert.match(app,/\.story-track,\.story-sticky,\.cinema-stage,\.world-sticky,\.motion-depth-sticky,\.trust-portal/);
  assert.match(app,/if\(!event\.persisted && !isHistoryNavigation\(\)\) return/);
  assert.match(app,/sessionStorage\.setItem\(HOME_HISTORY_RESET_KEY,'reloading'\)/);
  assert.match(app,/location\.reload\(\)/);
});
