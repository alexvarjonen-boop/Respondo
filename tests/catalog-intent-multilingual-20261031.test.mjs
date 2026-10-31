import test from 'node:test';
import assert from 'node:assert/strict';
import { generateGroundedAnswer } from '../server.mjs';

const rows = [
  {id:'putter',category:'Tuotteet',title:'JAG Satin Black - Putter',answer:'Tuote: JAG Satin Black - Putter. Tuoteryhmä: Putter. Hinta: 199 EUR. Linkki: https://shop.example/products/putter.',source_type:'website',source_url:'https://shop.example/products/putter',keywords:['putter','golf']},
  {id:'cover',category:'Tuotteet',title:'JAG Headcover',answer:'Tuote: JAG Headcover. Tuoteryhmä: Headcover. Hinta: 29 EUR. Linkki: https://shop.example/products/headcover.',source_type:'website',source_url:'https://shop.example/products/headcover',keywords:['headcover','golf']},
];

test('conversational catalog requests answer from the merchant catalog, not contact forms', async () => {
  for (const [lang,message] of [
    ['fi','Mitä teillä on myynnissä?'],
    ['fi','Mitä teiltä voi ostaa?'],
    ['fi','Mitäs te myytte?'],
    ['en','What can I buy from you?'],
    ['en','What do you carry?'],
    ['sv','Vad kan jag köpa hos er?'],
  ]) {
    const result=await generateGroundedAnswer({rows,lang,message,companyName:'JAG Putters'});
    assert.equal(result.handoff,false,message+' '+JSON.stringify(result));
    assert.equal(result.intent,'Tuotteet',message);
    assert.match(result.answer,/putter|headcover|mailansuoja|golf/i,message);
    assert.doesNotMatch(result.answer,/leave your name|jätä alle nimesi|lämna ditt namn/i);
  }
});

test('catalog discovery does not invent stock, discounts or merchant-specific policy', async () => {
  for (const [lang,message] of [
    ['fi','Mitä myytte?'],
    ['en','What do you sell?'],
    ['sv','Vad säljer ni?'],
  ]) {
    const result=await generateGroundedAnswer({rows,lang,message,companyName:'JAG Putters'});
    assert.equal(result.handoff,false,message);
    assert.match(result.answer,/putter|headcover|mailansuoja|golf/i);
    assert.doesNotMatch(result.answer,/free shipping|ilmainen toimitus|fri frakt|discount|alennus|rabatt|in stock|varastossa|i lager/i);
    assert.ok(Array.isArray(result.sourceIds),'response must provide source references');
  }
});

test('ordering instructions remain distinct from catalog discovery', async () => {
  for (const [lang,message] of [
    ['fi','Miten voin tilata?'],
    ['en','How can I order?'],
    ['sv','Hur kan jag beställa?'],
  ]) {
    const result=await generateGroundedAnswer({rows,lang,message,companyName:'JAG Putters'});
    assert.equal(result.handoff,false,message+' '+JSON.stringify(result));
    assert.match(result.answer,/tilata|order|beställa|verkkokaupasta|online store|webbutiken/i,message);
  }
});
