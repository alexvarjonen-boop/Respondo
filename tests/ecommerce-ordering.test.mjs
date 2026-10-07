import test from 'node:test';
import assert from 'node:assert/strict';
import { generateGroundedAnswer, chatActions } from '../server.mjs';

const rows=[
  {
    id:'catalog-1',
    category:'Verkkokauppa',
    title:'Tuotekatalogi',
    answer:'https://jagputters.fi/collections/all',
    keywords:['tuotteet','verkkokauppa'],
    source_type:'website',
    source_url:'https://jagputters.fi/',
  },
  {
    id:'product-1',
    category:'Tuotteet',
    title:'JAG One Putter',
    answer:'Tuote: JAG One Putter. Hinta: 299 EUR. Tuoteryhmä: Putters. Saatavuus: Varastossa. Linkki: https://jagputters.fi/products/jag-one.',
    keywords:['tuote','putter','golf'],
    source_type:'website',
    source_url:'https://jagputters.fi/products/jag-one',
  },
];

test('generic ecommerce ordering question uses store catalog instead of handoff',async()=>{
  const result=await generateGroundedAnswer({
    rows,
    message:'Miten voin tilata?',
    history:[{question:'Mitä myytte?',answer:'Myymme golfvarusteita, esimerkiksi puttereita.'}],
    lang:'fi',
  });

  assert.equal(result.handoff,false,JSON.stringify(result));
  assert.equal(result.intent,'Tuotteet');
  assert.match(result.answer,/tilata tuotteet suoraan verkkokaupasta/i);

  const actions=chatActions(rows,'Miten voin tilata?',false,'fi',result.selected);
  assert.ok(actions.some((action)=>action.type==='catalog' && action.url==='https://jagputters.fi/collections/all'),JSON.stringify(actions));
});

test('ordering intent works for pronoun follow-ups and all supported languages',async()=>{
  const cases=[
    ['Miten sen voi tilata?','fi',/verkkokaupasta/i],
    ['How can I order it?','en',/online store/i],
    ['Hur kan jag beställa?','sv',/webbutiken/i],
  ];

  for(const [message,lang,expected] of cases){
    const result=await generateGroundedAnswer({rows,message,lang});
    assert.equal(result.handoff,false,message+' '+JSON.stringify(result));
    assert.equal(result.intent,'Tuotteet');
    assert.match(result.answer,expected);
  }
});
