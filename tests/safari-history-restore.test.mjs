import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../public/styles.css',import.meta.url),'utf8');

test('Safari back-forward restore dismantles stale homepage compositor layers',()=>{
  assert.match(app,/window\.addEventListener\('pagehide',\(event\)=>\{/);
  assert.match(app,/if\(location\.pathname!=='\/' \|\| !event\.persisted\) return;/);
  assert.match(app,/sessionStorage\.setItem\(HOME_HISTORY_RESET_KEY,'suspended'\)/);
  assert.match(app,/window\.addEventListener\('pageshow',\(event\)=>\{/);
  assert.match(app,/resetState!=='suspended'/);
  assert.match(app,/requestAnimationFrame\(\(\)=>location\.reload\(\)\)/);
  assert.match(app,/\.cinema-conversation,\.cinema-stage,\.story-horizontal/);

  assert.match(css,/body\.home-history-restoring \.cinema-conversation,[\s\S]*?display:none!important/);
  assert.match(css,/body\.home-history-restoring \.cinema-stage,[\s\S]*?position:relative!important/);
  assert.match(css,/body\.home-history-restoring \.cinema-stage::before,[\s\S]*?display:none!important/);
});
