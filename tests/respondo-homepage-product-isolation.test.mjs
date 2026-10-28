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
  assert.match(fi.answer,/respondoai\.fi\/tilaus/i);
  assert.doesNotMatch(fi.answer,/Kokeile ilmaiseksi|3 päivän|vähäisen liiketoiminnan|arvonlisävero/i);
  assert.ok(fi.answer.length<210,fi.answer);
  assert.match(fi.answer,/Advanced maksaa 49 €\/kk/);
  assert.match(fi.answer,/Premium 129 €\/kk/);
  assert.match(fi.answer,/Enterprise 149 €\/kk/);
  assert.doesNotMatch(fi.answer,/jätä.*yhteystiet|puhelinnumeron tai sähköpostin/i);

  const en=respondoProductFaqMatch('How can I buy this?','en',[]);
  assert.ok(en);
  assert.equal(en.id,'respondo-faq-buy');
  assert.match(en.answer,/respondoai\.fi\/tilaus/i);
  assert.doesNotMatch(en.answer,/Try for free|VAT|3-day trial/i);
  assert.ok(en.answer.length<210,en.answer);
  assert.doesNotMatch(en.answer,/leave your contact/i);
});


test('Respondo homepage benefit questions return useful benefits instead of contact details',()=>{
  const fi=respondoProductFaqMatch('Listaa jotain hyötyjä','fi',[]);
  assert.ok(fi);
  assert.equal(fi.id,'respondo-faq-benefits');
  assert.match(fi.answer,/24\/7/);
  assert.match(fi.answer,/toistuvaa asiakaspalvelutyötä/i);
  assert.match(fi.answer,/puuttuvat kysymykset/i);
  assert.doesNotMatch(fi.answer,/ota yhteyttä|sähköpostitse osoitteeseen/i);

  const followup=respondoProductFaqMatch('Mitä hyötyä tästä on?','fi',[]);
  assert.ok(followup);
  assert.equal(followup.id,'respondo-faq-benefits');

  const en=respondoProductFaqMatch('List some benefits','en',[]);
  assert.ok(en);
  assert.equal(en.id,'respondo-faq-benefits');
  assert.match(en.answer,/Reduces repetitive customer-service work/i);
});


test('Respondo homepage B2B questions answer the business model directly',()=>{
  const fi=respondoProductFaqMatch('Onko tämä b2b','fi',[]);
  assert.ok(fi);
  assert.equal(fi.id,'respondo-faq-b2b');
  assert.match(fi.answer,/B2B-palvelu yrityksille/i);
  assert.doesNotMatch(fi.answer,/verkkosivu on https?:\/\//i);

  const en=respondoProductFaqMatch('Is this B2B?','en',[]);
  assert.ok(en);
  assert.equal(en.id,'respondo-faq-b2b');
  assert.match(en.answer,/B2B service for businesses/i);
});

test('Respondo purchase instructions are short, accurate and localized in all languages',()=>{
  const examples=[
    ['Miten voin tilata Respondon?','fi','49 €/kk'],
    ['Hur beställer jag Respondo?','sv','49 €/mån'],
    ['How can I subscribe to Respondo?','en','€49/month']
  ];
  for(const [q,lang,price] of examples){
    const r=respondoProductFaqMatch(q,lang,[]);
    assert.equal(r?.id,'respondo-faq-buy',lang);
    assert.ok(r.answer.includes('respondoai.fi/tilaus'),lang);
    assert.ok(r.answer.includes(price),lang);
    assert.ok(r.answer.length<210,lang);
    assert.doesNotMatch(r.answer,/Kokeile ilmaiseksi|Prova gratis|Try for free|vähäisen toiminnan|VAT|moms|arvonlisävero/i);
  }
});
