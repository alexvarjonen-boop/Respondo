import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const index=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
test('first-party inbox, calendar, task dashboard assets share new release cache key',()=>{
  assert.match(index,/native-ai-operations\.css\?v=20261104-native-ops-v4/);
  assert.match(index,/native-ai-operations\.js\?v=20261104-native-ops-v4/);
  assert.doesNotMatch(index,/native-ai-operations\.(?:css|js)\?v=20261104-native-ops-v1/);
});
