import test from 'node:test';
import assert from 'node:assert/strict';
import { computeSafeQuote, parseQuoteQuantity } from '../smart-quote-guard.mjs';

test('calculates tenant-configured net, VAT and total', () => {
  assert.deepEqual(computeSafeQuote({base:20,unit:10,quantity:3,minimum:35,vatPercent:25.5}),
    {net:50,vatPercent:25.5,vat:12.75,total:62.75,totalCents:6275,quantity:3,currency:'EUR'});
});
test('respects minimum and a fractional service quantity', () => {
  assert.equal(computeSafeQuote({base:5,unit:10,minimum:40,quantity:2.5}).total,40);
});
test('does not invent a price without a configured pricing rule', () => {
  assert.equal(computeSafeQuote({quantity:2}), null);
});
test('rejects invalid or oversized quantities before a quote is created', () => {
  for (const value of [-1,'-1','1e100','Infinity','abc',true,{},Infinity,NaN,100001]) {
    assert.throws(()=>parseQuoteQuantity(value),RangeError);
  }
  assert.equal(parseQuoteQuantity(' 2.5 '),2.5);
});
test('rejects broken or implausible tenant price configuration', () => {
  for (const settings of [
    {base:Infinity},{base:NaN},{unit:-2},{minimum:-1},
    {base:10,vatPercent:101},{unit:1000000,quantity:10000}
  ]) assert.throws(()=>computeSafeQuote(settings),RangeError);
});
