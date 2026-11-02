import test from 'node:test';
import assert from 'node:assert/strict';
import {mainioConversationContextQuestion, mainioBoxRentalFollowupKind} from '../mainio-moving-intake.mjs';
import {mainioPublicFactAnswer} from '../mainio-public-fact-answer.mjs';
import {mainioOfficialPublicFacts} from '../mainio-official-public-facts.mjs';

const rows=mainioOfficialPublicFacts();
const prior=[
 {question:'Voiko pakettiauton vuokrata yön yli?'},
 {question:'Entä laatikot?'},
 {question:'Paljonko ne maksaa?'},
 {question:'Toimitatteko kotiin?'},
];

test('live production counterexample: logistics fee inherits box context across 4 preceding turns',()=>{
  const context=mainioConversationContextQuestion(prior);
  assert.match(context,/muuttolaatik/i,context);
  for(const q of ['Mitä kuljetus maksaa?','Paljonko kuljetus maksaa?','Mikä kuljetusmaksu?']){
    const kind=mainioBoxRentalFollowupKind(q,context);
    assert.equal(kind,'transport_fee',q+' -> '+kind);
    const reply=mainioPublicFactAnswer(rows,q,'fi',context);
    assert.ok(reply&&!reply.handoff,q);
    assert.deepEqual(reply.sourceIds,['demo-mainio-official-05'],q);
    assert.match(reply.answer,/25 euroa ajokerralta/,q);
    assert.doesNotMatch(reply.answer,/asunnon tyhjennyks|kuolinpes|tavaramäärästä/i,q);
  }
});

test('after omitted-subject delivery question, contextual delivery and return retain verified box facts',()=>{
  const context=mainioConversationContextQuestion(prior.slice(0,3));
  assert.match(context,/muuttolaatik/i);
  const reply=mainioPublicFactAnswer(rows,'Toimitatteko kotiin?','fi',context);
  assert.ok(reply);
  assert.deepEqual(reply.sourceIds,['demo-mainio-official-06']);
  assert.match(reply.answer,/Toimitamme muuttolaatikot/i);
  const longer=[...prior,{question:'Mitä kuljetus maksaa?'}];
  const context2=mainioConversationContextQuestion(longer);
  const after=mainioPublicFactAnswer(rows,'Milloin ne toimitetaan?','fi',context2);
  assert.ok(after);
  assert.match(after.answer,/maanantai, keskiviikko ja perjantai/);
});

test('unrelated subject interrupts inherited box logistics: no false box-delivery tariff',()=>{
  for(const history of [
    [...prior.slice(0,3),{question:'Mikä sähköpostiosoitteenne on?'}],
    [{question:'Mistä pakettiauto haetaan?'}],
    [{question:'Mistä paku haetaan?'}],
    [{question:'Mitä asunnon tyhjennyksen hinta on?'}],
    [{question:'Miten pahvilaatikot kierrätetään?'}],
  ]){
    const context=mainioConversationContextQuestion(history);
    assert.notEqual(mainioBoxRentalFollowupKind('Mitä kuljetus maksaa?',context),'transport_fee',JSON.stringify(history));
    assert.equal(mainioPublicFactAnswer(rows,'Mitä kuljetus maksaa?','fi',context),null,JSON.stringify(history));
  }
});
