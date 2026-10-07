import test from 'node:test';
import assert from 'node:assert/strict';
import { generateGroundedAnswer } from '../server.mjs';

const source='https://example.test/location';
const rows=[
  {
    id:'service-cut',
    category:'Palvelut',
    title:'Palvelut: M Cut™: Ylläpitävä hiustenleikkaus',
    answer:'M Cut™: Ylläpitävä hiustenleikkaus, sis. pesu ja viimeistely.',
    keywords:['palvelut','hiustenleikkaus'],
    source_type:'website',
    source_url:source,
  },
  {
    id:'price-cut',
    category:'Hinnat',
    title:'Hinnat: M Cut™: 36 €',
    answer:'M Cut™: 36 €',
    keywords:['hinta','maksaa'],
    source_type:'website',
    source_url:source,
  },
  {
    id:'price-addon',
    category:'Hinnat',
    title:'Hinnat: M Cut™: M Relax 7 €',
    answer:'M Cut™: M Relax™ pidennetty päänhieronta 7 €',
    keywords:['hinta','maksaa'],
    source_type:'website',
    source_url:source,
  },
  {
    id:'street',
    category:'Sijainti ja myymälät',
    title:'Osoite',
    answer:'Maariankatu 3',
    keywords:['osoite','sijainti'],
    source_type:'website',
    source_url:source,
  },
  {
    id:'postal',
    category:'Sijainti ja myymälät',
    title:'Osoite',
    answer:'20100 Turku',
    keywords:['osoite','sijainti'],
    source_type:'website',
    source_url:source,
  },
];

test('Finnish direct location question returns the complete verified address',async()=>{
  const result=await generateGroundedAnswer({
    companyName:'Testi',
    rows,
    message:'Missä te sijaitsette?',
    history:[],
    lang:'fi',
  });
  assert.equal(result.handoff,false);
  assert.match(result.answer,/Maariankatu 3/);
  assert.match(result.answer,/20100 Turku/);
});

test('service price follow-up stays on the previously confirmed service',async()=>{
  const result=await generateGroundedAnswer({
    companyName:'Testi',
    rows,
    message:'Paljonko se maksaa?',
    history:[{question:'Leikkaatteko hiuksia?',answer:'Kyllä, leikkaamme hiuksia.'}],
    lang:'fi',
  });
  assert.equal(result.handoff,false);
  assert.match(result.answer,/M Cut/i);
  assert.match(result.answer,/36\s*€/);
  assert.doesNotMatch(result.answer,/7\s*€/);
});

test('English and Swedish price follow-ups preserve a named service from history',async()=>{
  const en=await generateGroundedAnswer({
    companyName:'Testi',
    rows,
    message:'How much does it cost?',
    history:[{question:'Do you cut hair?',answer:'M Cut is our maintenance haircut.'}],
    lang:'en',
  });
  assert.equal(en.handoff,false);
  assert.match(en.answer,/36\s*€/);

  const sv=await generateGroundedAnswer({
    companyName:'Testi',
    rows,
    message:'Vad kostar det?',
    history:[{question:'Klipper ni hår?',answer:'M Cut är vår vanliga klippning.'}],
    lang:'sv',
  });
  assert.equal(sv.handoff,false);
  assert.match(sv.answer,/36\s*€/);
});
