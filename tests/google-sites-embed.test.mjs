import test from 'node:test';
import assert from 'node:assert/strict';
import {isGoogleSitesWebsite} from '../server.mjs';
test('recognizes published Google Sites URLs',()=>{
  assert.equal(isGoogleSitesWebsite('https://sites.google.com/view/viheri'),true);
  assert.equal(isGoogleSitesWebsite('https://example.org/viheri'),false);
});
