import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeLeads } from '../lead-analytics.mjs';

test('empty dataset yields no invented conversion metrics', () => {
  assert.deepEqual(summarizeLeads([]), {
    qualified: 0,
    byIntent: {quote:0, booking:0, purchase:0, contact:0},
    averageScore: null
  });
});
test('counts qualified leads by intent without exposing PII', () => {
  const result = summarizeLeads([
    {qualified:true,intent:'quote',score:90,email:'a@example.com'},
    {qualified:true,intent:'booking',score:50,phone:'+358401234567'},
    {qualified:false,intent:'purchase',score:99},
    {qualified:true,intent:'support',score:90}
  ]);
  assert.equal(result.qualified,2);
  assert.equal(result.byIntent.quote,1);
  assert.equal(result.byIntent.booking,1);
  assert.equal(result.averageScore,70);
  assert.doesNotMatch(JSON.stringify(result), /example.com|358401234567/);
});
test('invalid scores do not corrupt averages', () => {
  assert.equal(summarizeLeads([{qualified:true,intent:'quote',score:Infinity}]).averageScore,null);
});
