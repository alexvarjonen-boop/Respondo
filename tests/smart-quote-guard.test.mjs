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
  assert.equal(parseQuoteQuantity('.5'),.5);
});
test('rejects broken or implausible tenant price configuration', () => {
  for (const settings of [
    {base:Infinity},{base:NaN},{unit:-2},{minimum:-1},
    {base:10,vatPercent:101},{unit:1000000,quantity:10000}
  ]) assert.throws(()=>computeSafeQuote(settings),RangeError);
});

test('volume discount applies strictly above the threshold to unit work only', () => {
  const pricing = {base:'25.00',unit:'15.00',discountOverQuantity:'20.000',discountPercent:'10.00'};
  const boundary = computeSafeQuote({...pricing,quantity:'20'});
  assert.equal(boundary.totalCents,32500);
  assert.equal(boundary.workDiscount,undefined);

  const quote = computeSafeQuote({...pricing,quantity:25});
  assert.equal(quote.totalCents,36250);
  assert.equal(quote.workDiscount,37.5);
  assert.equal(quote.workDiscountPercent,10);
  const withMinimum = computeSafeQuote({...pricing,minimum:380,vatPercent:25.5,quantity:25});
  assert.equal(withMinimum.totalCents,47690);
  assert.equal(withMinimum.minimumApplied,true);
});

test('quote calculations use decimal half-up rounding and calculate VAT on the rounded net', () => {
  const quote = computeSafeQuote({base:10,unit:.01,quantity:7.5,vatPercent:25.5});
  assert.equal(quote.net,10.08);
  assert.equal(quote.vat,2.57);
  assert.equal(quote.totalCents,1265);
  const small = computeSafeQuote({unit:.01,quantity:2.5,vatPercent:25.5});
  assert.equal(small.net,.03);
  assert.equal(small.vat,.01);
  assert.equal(small.totalCents,4);
});

test('rejects invalid discount configurations before pricing', () => {
  for (const rules of [
    {discountPercent:10},
    {discountOverQuantity:20,discountPercent:101},
    {discountOverQuantity:20,discountPercent:-1},
    {discountOverQuantity:20,discountPercent:true},
    {discountOverQuantity:20,discountPercent:2.001},
    {discountOverQuantity:-1,discountPercent:5},
    {discountOverQuantity:100001,discountPercent:10},
    {discountOverQuantity:1.0001,discountPercent:10},
    {discountOverQuantity:'2+5',discountPercent:10},
    {base:true},{unit:[15]},{minimum:'0x1'}
  ]) assert.throws(()=>computeSafeQuote({unit:15,quantity:25,...rules}),RangeError);
  assert.equal(computeSafeQuote({unit:15,quantity:1,discountOverQuantity:0,discountPercent:100}).totalCents,0);
});

test('travel adds a separate measured quantity without receiving the work discount', () => {
  const pricing = {unit:45, distancePrice:.60, quantity:2, discountOverQuantity:1, discountPercent:10, vatPercent:25.5};
  const quote = computeSafeQuote({...pricing,distanceKm:50});
  assert.equal(quote.travel,30);
  assert.equal(quote.net,111);
  assert.equal(quote.totalCents,13931);
  assert.equal(quote.workDiscount,9);
  assert.throws(()=>computeSafeQuote(pricing),RangeError);
  assert.throws(()=>computeSafeQuote({...pricing,distanceKm:2.1234}),RangeError);
  assert.equal(computeSafeQuote({...pricing,distanceKm:0}).travel,0);
});
