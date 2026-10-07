import test from 'node:test';
import assert from 'node:assert/strict';
import { generateGroundedAnswer } from '../server.mjs';

const rows=[
  {
    id:'street',
    category:'Sijainti ja myymälät',
    title:'Osoite',
    answer:'Hallituskatu 11',
    keywords:['sijainti','osoite','address','adress'],
    source_type:'website',
    source_url:'https://example.fi/',
  },
  {
    id:'full',
    category:'Sijainti ja myymälät',
    title:'Osoite',
    answer:'Hallituskatu 11, 33200 Tampere',
    keywords:['sijainti','osoite','address','adress'],
    source_type:'website',
    source_url:'https://example.fi/contact',
  },
  {
    id:'postal',
    category:'Sijainti ja myymälät',
    title:'Osoite',
    answer:'33200 Tampere',
    keywords:['sijainti','osoite','address','adress'],
    source_type:'website',
    source_url:'https://example.fi/contact',
  },
];

test('Swedish vad har ni för adress is a direct physical-address lookup',async()=>{
  const result=await generateGroundedAnswer({
    companyName:'Example',
    rows,
    message:'Vad har ni för adress?',
    history:[],
    lang:'sv',
  });
  assert.equal(result.handoff,false);
  assert.equal(result.intent,'Sijainti');
  assert.match(result.answer,/Hallituskatu 11/);
  assert.match(result.answer,/33200 Tampere/);
});

test('full physical address never duplicates the street while combining candidates',async()=>{
  for(const [lang,message] of [
    ['fi','Mikä teidän osoite on?'],
    ['en','What is your address?'],
    ['sv','Vad har ni för adress?'],
  ]){
    const result=await generateGroundedAnswer({
      companyName:'Example',
      rows,
      message,
      history:[],
      lang,
    });
    assert.equal(result.handoff,false);
    assert.match(result.answer,/Hallituskatu 11, 33200 Tampere/);
    assert.doesNotMatch(result.answer,/Hallituskatu 11,\s*Hallituskatu 11/i);
  }
});
