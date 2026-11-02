import test from 'node:test';
import assert from 'node:assert/strict';
import {mainioPublicFactAnswer} from '../mainio-public-fact-answer.mjs';

const van='https://www.mainiomuuttopalvelu.fi/pakettiautojen-vuokraus';
const faq='https://www.mainiomuuttopalvelu.fi/usein-muutosta-kysyttya';
const boxes='https://www.mainiomuuttopalvelu.fi/muuttolaatikot-ja-tarvikkeet';
const row=(id,title,answer,source_url)=>({
 id,title,answer,source_url,source_type:'website',approved:true,category:'Mainio'
});
// These mimic imported source-page headings, NOT hand-curated FAQ headings.
const evidence=[
 row('van-price','Pakettiautojen hinnat 2026',
  '5 h vuokra: 13 m³ 70 euroa, 17 m³ 90 euroa, 20 m³ 110 euroa. Sisältää 100 km.',van),
 row('van-24h','Vuorokauden vuokrahinnat',
  '24 h vuokra: 13 m³ 90 euroa, 17 m³ 110 euroa ja 20 m³ 140 euroa.',van),
 row('overnight','Voiko auton vuokrata yön yli?',
  'Pakettiauton yön yli vuokrauksesta tulee sopia erikseen asiakaspalvelun kanssa; tämä ei onnistu verkkovarauksen kautta.',faq),
 row('boxes','Muuttolaatikot: hinta ja ehdot',
  'Muuttolaatikoiden vuokra on 0,20 euroa/laatikko/vrk, minimilaskutus 10 euroa.',boxes)
];

test('imported official Mainio fact titles can differ yet 5h rate remains source-bound',()=>{
 for(const q of ['Mitä paku maksaa viideksi tunniksi?','Paljonko 5h pakettiauton vuokra maksaa?','Pakettiauton 5 tunnin vuokra, mikä hinta?']){
  const reply=mainioPublicFactAnswer(evidence,q,'fi');
  assert.ok(reply&&!reply.handoff,q);
  assert.deepEqual(reply.sourceIds,['van-price'],q);
  assert.match(reply.answer,/70 euroa/);
  assert.match(reply.answer,/110 euroa/);
  assert.doesNotMatch(reply.answer,/varattu|vahvistettu varaus/i);
 }
});

test('public demo can explain overnight arrangements and complete box price units',()=>{
 const night=mainioPublicFactAnswer(evidence,'Voiko pakettiauton vuokrata yöksi?','fi');
 assert.ok(night);
 assert.deepEqual(night.sourceIds,['overnight']);
 assert.match(night.answer,/erikseen asiakaspalvelun kanssa/);
 const price=mainioPublicFactAnswer(evidence,'Mitä muuttolaatikoiden vuokra maksaa?','fi');
 assert.ok(price);
 assert.deepEqual(price.sourceIds,['boxes']);
 assert.match(price.answer,/0,20 euroa\/laatikko\/vrk/);
 assert.match(price.answer,/minimilaskutus 10 euroa/);
});

test('fallback refuses partially evidenced prices, unrelated page, unapproved and spoofed sources',()=>{
 const q='Mitä paku maksaa viideksi tunniksi?';
 const candidates=[
  {...evidence[0],answer:'Pakettiauton vuokra alkaen 70 euroa.'},
  {...evidence[0],source_url:'https://mainiomuuttopalvelu.fi.evil.example/pakettiautojen-vuokraus'},
  {...evidence[0],approved:false},
  {...evidence[0],source_type:'customer'},
  {...evidence[0],source_url:faq},
  {...evidence[0],answer:'24 h vuokra: 13 m³ 90 euroa, 17 m³ 110 euroa, 20 m³ 140 euroa.'}
 ];
 for(const candidate of candidates)
  assert.equal(mainioPublicFactAnswer([candidate],q,'fi'),null,JSON.stringify(candidate));
 const vague=row('box-vague','Muuttolaatikoiden hinnasto','Hinta 0,20 €',boxes);
 assert.equal(mainioPublicFactAnswer([vague],'Paljonko muuttolaatikon vuokra maksaa?','fi'),null);
 const offered=row('night-vague','Pakettiauton vuokraus','Pakettiauton vuokraushinnasto',faq);
 assert.equal(mainioPublicFactAnswer([offered],'Voiko pakun vuokrata yöksi?','fi'),null);
});

test('verified static price evidence never establishes an individual reservation or free date',()=>{
 for(const q of ['Onko pakettiauto vapaana huomenna?', 'Onko pakun vuokra jo varattu minulle?', 'Onko muuttolaatikot varmasti vapaana ensi viikolla?']){
  assert.equal(mainioPublicFactAnswer(evidence,q,'fi'),null,q);
 }
});
