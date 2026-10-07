import test from 'node:test';
import assert from 'node:assert/strict';
import { generateGroundedAnswer } from '../server.mjs';

const rows=[
  {
    id:'domestic-fi',
    category:'Toimitus ja seuranta',
    title:'Toimitusaika',
    answer:'Kotimaiset tilaukset saapuvat 3–5 arkipäivässä.',
    keywords:['toimitus','toimitusaika','delivery','leverans'],
    source_type:'website',
    source_url:'https://shop.example/shipping',
  },
  {
    id:'free-en',
    category:'Toimitus ja seuranta',
    title:'Toimitus',
    answer:'Free shipping available on orders over 280€',
    keywords:['toimitus','shipping','delivery'],
    source_type:'website',
    source_url:'https://shop.example/shipping',
  },
];

test('Finnish domestic delivery fact has deterministic English phrasing',async()=>{
  const result=await generateGroundedAnswer({
    companyName:'Shop',
    rows,
    message:'How long does delivery take?',
    history:[],
    lang:'en',
  });
  assert.equal(result.handoff,false,JSON.stringify(result));
  assert.equal(result.answer,'Domestic orders arrive in 3–5 business days.');
});

test('English free shipping wording preserves free shipping phrase',async()=>{
  const result=await generateGroundedAnswer({
    companyName:'Shop',
    rows,
    message:'How much does shipping cost?',
    history:[],
    lang:'en',
  });
  assert.equal(result.handoff,false,JSON.stringify(result));
  assert.match(result.answer,/free shipping/i);
  assert.match(result.answer,/280/);
});
