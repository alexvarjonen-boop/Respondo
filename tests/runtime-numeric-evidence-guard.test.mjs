import test from 'node:test';
import assert from 'node:assert/strict';
import { guardCitedNumericFacts } from '../runtime-numeric-evidence-guard.mjs';

const fact = (id, answer, category='Hinnat') => ({
  id, title:category, category, answer, approved:true
});
const reply = (answer, ids=['owned']) => ({
  answer, handoff:false, confidence:0.95, intent:'Asiakaskysymys',
  sourceIds:ids, selected:[]
});

test('verified Finnish rental price continues to reach the customer', () => {
  const rows=[fact('owned','Pakettiauton vuokraus maksaa 79 € / vuorokausi.')];
  const response=reply('Pakettiauton vuokraus maksaa 79 euroa vuorokaudessa.');
  assert.strictEqual(guardCitedNumericFacts(response,rows),response);
});

test('fabricated price is blocked in the live response, not only in offline QA', () => {
  const rows=[fact('owned','Pakettiauton vuokraus maksaa 79 € / vuorokausi.')];
  const original=reply('Pakettiauton vuokraus maksaa 99 euroa vuorokaudessa.');
  const guarded=guardCitedNumericFacts(original,rows);
  assert.equal(guarded.handoff,true);
  assert.equal(guarded.answer,'');
  assert.equal(guarded.qualityFlag,'numeric_evidence_conflict');
  assert.deepEqual(guarded.sourceIds,[]);
  assert.equal(original.answer,'Pakettiauton vuokraus maksaa 99 euroa vuorokaudessa.');
});

test('a matching Swedish price is preserved and an invented one is blocked', () => {
  const rows=[fact('owned','Pris 490 kr','Priser')];
  assert.strictEqual(guardCitedNumericFacts(reply('Det kostar 490 kronor.'),rows).handoff,false);
  assert.equal(guardCitedNumericFacts(reply('Det kostar 590 kronor.'),rows).handoff,true);
});

test('opening hours use the exact cited branch evidence', () => {
  const rows=[fact('owned','Turun toimipiste: ma–pe 09:00–17:00.','Aukioloajat')];
  assert.equal(guardCitedNumericFacts(reply('Auki 9–17.'),rows).handoff,false);
  assert.equal(guardCitedNumericFacts(reply('Auki 10–18.'),rows).handoff,true);
});

test('delivery promises not supported by the cited source are blocked', () => {
  const rows=[fact('owned','Delivery takes 3 days.','Delivery')];
  assert.equal(guardCitedNumericFacts(reply('Delivery takes 5 days.'),rows).handoff,true);
  assert.equal(guardCitedNumericFacts(reply('Delivery takes 3 days.'),rows).handoff,false);
});

test('unrelated tenants and unapproved rows never validate a source number', () => {
  const rows=[
    fact('owned','Price: 49 €'),
    fact('someone-else','Price: 99 €'),
    {...fact('draft','Price: 99 €'),approved:false}
  ];
  assert.equal(guardCitedNumericFacts(reply('The price is 99 €.'),rows).handoff,true);
  assert.equal(guardCitedNumericFacts(reply('The price is 49 €.'),rows).handoff,false);
});

test('nonfactual conversation, unsourced greetings and handoffs are unaffected', () => {
  const rows=[fact('owned','Price: 49 €')];
  const greeting=reply('Hei! Miten voin auttaa?',[]);
  const originalHandoff={...reply(''),handoff:true};
  const plain=reply('Voit pyytää tarjouksen sähköpostitse.');
  assert.strictEqual(guardCitedNumericFacts(greeting,rows),greeting);
  assert.strictEqual(guardCitedNumericFacts(originalHandoff,rows),originalHandoff);
  assert.strictEqual(guardCitedNumericFacts(plain,rows),plain);
});

test('a missing source is not silently replaced with another tenant fact', () => {
  const response=reply('49 €',['not-in-current-tenant']);
  assert.strictEqual(guardCitedNumericFacts(response,[fact('owned','49 €')]),response);
});

test('compactly concatenated source opening times still support correct weekday answers', () => {
  const rows=[fact('owned','Ma-Pe : 09:00–19:00La : 09:00 -17:00','Aukioloajat')];
  assert.equal(guardCitedNumericFacts(reply('Maanantai: 09:00 - 19:00.'),rows).handoff,false);
  assert.equal(guardCitedNumericFacts(reply('Maanantai: 10:00 - 19:00.'),rows).handoff,true);
});

test('warranty months remain grounded through Finnish to Swedish translation', () => {
  const rows=[fact('owned','Puttereilla on 3 kuukauden takuu.','Takuu')];
  assert.equal(guardCitedNumericFacts(reply('Ja. Puttrarna har 3 månaders garanti.'),rows).handoff,false);
  assert.equal(guardCitedNumericFacts(reply('Ja. Puttrarna har 6 månaders garanti.'),rows).handoff,true);
});
