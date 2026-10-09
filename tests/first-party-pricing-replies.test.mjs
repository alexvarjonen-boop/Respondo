import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const server = readFileSync(new URL('../server.mjs', import.meta.url), 'utf8');
const faq = readFileSync(new URL('../respondo-faq.mjs', import.meta.url), 'utf8');
const firstParty = server.slice(
  server.indexOf('function respondoProductFaqMatch('),
  server.indexOf('\nfunction knowledgeTopic(')
);

test('first-party pricing answers avoid unsolicited tax commentary in all languages', () => {
  const ids = [
    'respondo-faq-buy',
    'respondo-faq-annual-pricing',
    'respondo-faq-monthly-pricing',
    'respondo-faq-pricing'
  ];
  for (const id of ids) {
    const start = firstParty.indexOf("id:'" + id + "'");
    assert.ok(start >= 0, id + ' is present');
    const answerStart = firstParty.indexOf('answer:answer(', start);
    const answerEnd = firstParty.indexOf('\n      )', answerStart);
    assert.ok(answerEnd > answerStart, id + ' has an answer');
    const answer = firstParty.slice(answerStart, answerEnd);
    assert.match(answer, /29,90/);
    assert.doesNotMatch(answer, /arvonlisäver|\\balv\\b|\\bmoms\\b|\\bvat\\b|small-scale business exemption|vähäisen liiketoiminnan vuoksi/i, id);
  }
});

test('FAQ standard monthly and yearly prices omit tax explanations; tax questions retain answers', () => {
  const firstPriceQuestion = faq.indexOf('"Mitä Respondo maksaa kuukaudessa?"');
  const taxQuestion = faq.indexOf('"Sisältääkö hinta ALV:n?"');
  assert.ok(firstPriceQuestion >= 0 && taxQuestion > firstPriceQuestion);
  const ordinaryPricing = faq.slice(firstPriceQuestion, taxQuestion);
  assert.match(ordinaryPricing, /49,90/);
  assert.doesNotMatch(ordinaryPricing, /arvonlisäver|\\balv\\b|\\bmoms\\b|\\bvat\\b|small-scale business exemption|vähäisen toiminnan vuoksi/i);
  assert.match(faq.slice(taxQuestion, taxQuestion + 800), /arvonlisäveroa/i);
});
