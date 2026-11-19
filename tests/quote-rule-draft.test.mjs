import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseQuoteRuleDraft} from '../public/quote-rule-draft.mjs';

test('supported pricing clauses become the same structured inputs across three languages', () => {
  for (const [text, unitLabel] of [
    ['15 €/ikkuna; matkakulu 25 €; yli 20 ikkunasta 10 % alennus pesutyöhön.', 'ikkuna'],
    ['Vi tar 15 € per fönster; reseavgift 25 €; över 20 fönster 10 % rabatt', 'fönster'],
    ['We charge €15 per window, travel fee €25, over 20 windows 10% discount', 'window'],
  ]) {
    assert.deepEqual(parseQuoteRuleDraft(text), {
      unitPrice:15, unitLabel, basePrice:25, discountOverQuantity:20, discountPercent:10
    });
  }
  assert.deepEqual(parseQuoteRuleDraft('0,60 €/km\nminimiveloitus 25,50 €'), {
    unitPrice:.60, unitLabel:'km', minPrice:25.50
  });
});

test('unsupported conditions and conflicting clauses cannot partially stage a price', () => {
  for (const text of [
    '45 €/tunti; 0,60 €/km',
    '15 €/ikkuna; viikonloppuna tuplahinta',
    '15 €/ikkuna; minimiveloitus kaksi tuntia',
    '15 €/ikkuna; perusmaksu 15 €; matkakulu 25 €',
    '15 €/ikkuna; yli 20 ikkunasta 110 % alennus',
    '15 €/ikkuna; yli 100001 ikkunasta 10 % alennus',
    '15,001 €/ikkuna; matkakulu 25 €',
    '15 €/ikkuna; matkakulu 25,001 €',
    '15 €/ikkuna; yli 20 ikkunasta 10,001 % alennus',
    '15 €/ikkuna; mikä tahansa ehto',
    'minimihinta 25 €',
  ]) assert.equal(parseQuoteRuleDraft(text),null,text);
});

test('drafting fills the editor and the normal save submits the two discount fields', () => {
  const app = readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
  const draft = app.slice(app.indexOf("$('#fillQuoteRuleDraft')?.addEventListener"),app.indexOf("quoteEngineForm?.addEventListener('submit'"));
  assert.match(draft,/form\.elements\[field\]\.value = value/);
  assert.doesNotMatch(draft,/api\(|requestSubmit/);
  assert.match(app,/discountOverQuantity:form\.get\('discountOverQuantity'\)/);
  assert.match(app,/discountPercent:form\.get\('discountPercent'\)/);
});

test('the unsaved example uses the authenticated, plan-gated server calculator', () => {
  const server = readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
  const route = server.slice(server.indexOf("app.post('/api/app/quote-engine/preview'"),server.indexOf("app.post('/api/app/quote-engine',"));
  assert.match(route,/auth, ownerOnly, subscribed/);
  assert.match(route,/requirePlanCapability\(req,res,'allCurrentFeatures'\)/);
  assert.match(route,/computeSafeQuote\(\{\.\.\.readDashboardQuotePricing\(body\),quantity\}\)/);
  assert.doesNotMatch(route,/UPDATE tenants|INSERT INTO/);
});
