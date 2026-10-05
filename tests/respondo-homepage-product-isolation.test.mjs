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


test('Respondo homepage purchase question answers with signup instructions instead of contact collection',()=>{
  const fi=respondoProductFaqMatch('Miten tän voi ostaa','fi',[]);
  assert.ok(fi);
  assert.equal(fi.id,'respondo-faq-buy');
  assert.match(fi.answer,/Kokeile ilmaiseksi/i);
  assert.match(fi.answer,/3 päivän ilmaisen kokeilun/i);
  assert.match(fi.answer,/49,99/);
  assert.doesNotMatch(fi.answer,/jätä.*yhteystiet|puhelinnumeron tai sähköpostin/i);

  const en=respondoProductFaqMatch('How can I buy this?','en',[]);
  assert.ok(en);
  assert.equal(en.id,'respondo-faq-buy');
  assert.match(en.answer,/Try for free/i);
  assert.doesNotMatch(en.answer,/leave your contact/i);
});
