import test from 'node:test';
import assert from 'node:assert/strict';
import { respondoProductFaqMatch } from '../server.mjs';

test('Respondo homepage never answers a broad sales question as an ecommerce golf store',()=>{
  const fi=respondoProductFaqMatch('Mitä myytte','fi',[]);
  assert.ok(fi);
  assert.match(fi.answer,/AI-asiakaspalvelubottipalvelua/i);
  assert.doesNotMatch(fi.answer,/golf|putter|headcover|pyyhe/i);

  const en=respondoProductFaqMatch('What do you sell?','en',[]);
  assert.ok(en);
  assert.match(en.answer,/AI customer-service chatbot/i);
  assert.doesNotMatch(en.answer,/golf|putter|headcover|towel/i);
});
