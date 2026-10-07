import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  buildIntentUtteranceSeed,
  classifyIntentByGrammar,
  normalizeIntentPhrase,
} from '../intent-utterances.mjs';
import { generateGroundedAnswer } from '../server.mjs';

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
    answer:'Tuote: JAG One Putter. Hinta: 299 EUR. Saatavuus: Varastossa. Linkki: https://jagputters.fi/products/jag-one.',
    keywords:['tuote','putter','golf'],
    source_type:'website',
    source_url:'https://jagputters.fi/products/jag-one',
  },
];

test('generated multilingual intent lexicon contains tens of thousands of real utterances',()=>{
  const seed=buildIntentUtteranceSeed();
  assert.ok(seed.length>=80000,'expected at least 80k utterances, got '+seed.length);
  const unique=new Set(seed.map((x)=>x.language+'|'+x.normalized));
  assert.equal(unique.size,seed.length);
  for(const lang of ['fi','sv','en']){
    assert.ok(seed.some((x)=>x.language===lang && x.intent==='order'));
  }
});

test('order grammar covers noun-form and verb-form Finnish ordering questions',()=>{
  const cases=[
    'Miten tilaus tapahtuu',
    'Miten voin tilata',
    'Kuinka tilaus tehdään',
    'Miten tilaaminen toimii',
    'Mistä voin ostaa tämän',
    'Kuinka saan tuotteen tilattua',
  ];
  for(const message of cases){
    assert.equal(classifyIntentByGrammar(message),'order',message);
  }
});

test('order grammar covers equivalent English and Swedish wordings',()=>{
  const cases=[
    ['How can I order this?','order'],
    ['How does ordering work?','order'],
    ['Where can I buy the product?','order'],
    ['Hur kan jag beställa den här?','order'],
    ['Hur fungerar beställningen?','order'],
    ['Var kan jag köpa produkten?','order'],
  ];
  for(const [message,intent] of cases){
    assert.equal(classifyIntentByGrammar(message),intent,message);
  }
});

test('pictured order-process wording never falls through to handoff for an ecommerce import',async()=>{
  for(const message of ['Miten tilaus tapahtuu','Miten voin tilata']){
    const result=await generateGroundedAnswer({
      rows,
      message,
      history:[],
      lang:'fi',
    });
    assert.equal(result.handoff,false,message+' '+JSON.stringify(result));
    assert.equal(result.intent,'Tuotteet');
    assert.match(result.answer,/verkkokaupasta/i);
  }
});

test('intent lexicon table is private, indexed and loaded before the server starts',()=>{
  const server=fs.readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
  assert.match(server,/CREATE TABLE IF NOT EXISTS intent_utterances/);
  assert.match(server,/ENABLE ROW LEVEL SECURITY/);
  assert.match(server,/idx_intent_utterances_language_normalized/);
  assert.match(server,/REVOKE ALL PRIVILEGES ON TABLE public\.intent_utterances FROM anon/);
  assert.match(server,/seedAndLoadIntentUtterances\(\)/);
  assert.match(server,/Intent utterances loaded/);
});

test('normalizer keeps the same punctuation-insensitive form used by chat matching',()=>{
  assert.equal(normalizeIntentPhrase('  Miten tilaus tapahtuu?!  '),'miten tilaus tapahtuu');
  assert.equal(normalizeIntentPhrase('Hur fungerar beställningen?'),'hur fungerar bestallningen');
});
