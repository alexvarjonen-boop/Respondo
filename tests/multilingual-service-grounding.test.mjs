import test from 'node:test';
import assert from 'node:assert/strict';
import { generateGroundedAnswer } from '../server.mjs';

const rows=[
  {
    id:'svc-1',
    category:'Palvelut',
    title:'Palvelut: M Cut',
    answer:'M Cut: Ylläpitävä hiustenleikkaus ilman suuria muutoksia. Sis. pesu ja viimeistely.',
    keywords:['palvelut','hiustenleikkaus','M Cut'],
    source_type:'website',
    source_url:'https://example.com/palvelut',
  },
  {
    id:'price-1',
    category:'Hinnat',
    title:'Hinnat: M Cut',
    answer:'M Cut™: 36 €',
    keywords:['hinta','M Cut','hiustenleikkaus'],
    source_type:'website',
    source_url:'https://example.com/palvelut',
  },
];

test('Swedish direct haircut question is grounded in imported service evidence',async()=>{
  const result=await generateGroundedAnswer({
    companyName:'Example Barber',
    rows,
    message:'Klipper ni hår?',
    history:[],
    lang:'sv',
  });
  assert.equal(result.handoff,false);
  assert.equal(result.intent,'Palvelut');
  assert.match(result.answer,/klipp|hår/i);
});

test('Swedish haircut price follow-up stays attached to the prior service',async()=>{
  const first=await generateGroundedAnswer({
    companyName:'Example Barber',
    rows,
    message:'Klipper ni hår?',
    history:[],
    lang:'sv',
  });
  const second=await generateGroundedAnswer({
    companyName:'Example Barber',
    rows,
    message:'Och vad kostar den?',
    history:[{question:'Klipper ni hår?',answer:first.answer}],
    lang:'sv',
  });
  assert.equal(second.handoff,false);
  assert.equal(second.intent,'Hinta');
  assert.match(second.answer,/36\s*€/);
});
