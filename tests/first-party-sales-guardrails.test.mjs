import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Guardrails for first-party sales answers: prevent stale plan names/prices
// from being reintroduced during future chatbot knowledge-base changes.
const server = readFileSync(new URL('../server.mjs', import.meta.url), 'utf8');
const readAnswer = (id) => {
  const start = server.indexOf("id:'" + id + "'");
  assert.ok(start >= 0, 'Missing first-party answer: ' + id);
  return server.slice(start, start + 1100);
};

test('monthly prices match the current three plans in all languages', () => {
  const answer = readAnswer('respondo-faq-monthly-pricing');
  for (const plan of ['Starter', 'Advanced', 'Business']) {
    assert.ok(answer.includes(plan), 'Missing plan ' + plan);
  }
  for (const amount of ['29,90', '39,90', '49,90', '29.90', '39.90', '49.90']) {
    assert.ok(answer.includes(amount), 'Missing amount ' + amount);
  }
  assert.doesNotMatch(answer, /Premium|Enterprise|129[,.]00|149[,.]00/);
});

test('annual prices are consistent with monthly prices without an annual discount', () => {
  const answer = readAnswer('respondo-faq-annual-pricing');
  for (const amount of ['358,80', '478,80', '598,80', '358.80', '478.80', '598.80']) {
    assert.ok(answer.includes(amount), 'Missing annual amount ' + amount);
  }
});

test('marketing pricing answers do not volunteer tax status', () => {
  for (const id of ['respondo-faq-monthly-pricing', 'respondo-faq-annual-pricing']) {
    const answer = readAnswer(id).split('};')[0];
    assert.doesNotMatch(answer, /arvonlisäver|alv\b|mervärdesskatt|\bVAT\b/i);
  }
});
