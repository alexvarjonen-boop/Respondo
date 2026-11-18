import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('connector guide distinguishes a saved credential from a broken mailbox sync',()=>{
  const guide=readFileSync(new URL('../public/integration-onboarding.js',import.meta.url),'utf8');
  const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
  assert.match(server,/last_verified_at,last_synced_at,last_sync_error FROM respondo_native_mail_credentials/);
  assert.match(server,/lastSyncError:x\.last_sync_error\|\|null/);
  assert.match(guide,/account\.lastSyncError\?'attention':'partial'/);
  assert.match(guide,/Connection needs attention — message sync failed/);
  assert.match(guide,/if\(!readinessLoaded \|\| prerequisites\.get\(item\.id\)!==true/);
});
