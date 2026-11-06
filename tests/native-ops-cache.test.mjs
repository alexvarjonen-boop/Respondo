import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const index=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
test('first-party dashboard script cache updates when native integration UI changes',()=>{
  assert.match(index,/native-ai-operations\.css\?v=20261104-native-ops-v4/);
  assert.match(index,/native-ai-operations\.js\?v=20261106-free-first-party-v6/);
  assert.match(index,/\/app\.js\?v=[^\"\s]*-native-integrations-v1/);
  assert.doesNotMatch(index,/native-ai-operations\.(?:css|js)\?v=20261104-native-ops-v1/);
});
