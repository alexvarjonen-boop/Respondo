// Adversarial, synthetic regression. Every variant uses the same production
// Mainio intent / factual response functions, but NOT live customer API calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mainioInquiryKind,mainioMovingRouteIntent,mainioRecognizedDomesticRoute,
  mainioInquiryActions} from '../mainio-moving-intake.mjs';
import {mainioPriorityDomesticRouteAnswer} from '../server.mjs';
import {mainioPublicFactAnswer} from '../mainio-public-fact-answer.mjs';

const website='https://www.mainiomuuttopalvelu.fi/';
const boxes=website+'muuttolaatikot-ja-tarvikkeet';
const vans=website+'pakettiautojen-vuokraus';
const faq=website+'usein-muutosta-kysyttya';
const rows=[
 {id:'verified-service-area',title:'Muuton toimialue',category:'Muuttopalvelut',
  approved:true,source_type:'website',source_url:website+'avaimet-kateen-muutto-vai-omatoiminen-muutto-vaihtoehdot-vertailussa',
  answer:'Mainio palvelee Turussa ja Varsinais-Suomessa. Muutot voivat suuntautua myös muualle Suomeen; tarkka reitti ja toteutus sovitaan erikseen.'},
 {id:'rental-price',title:'Muuttolaatikoiden hinta',category:'Muuttolaatikot',
  approved:true,source_type:'website',source_url:boxes,
  answer:'Mainion muuttolaatikoiden vuokra on 0,20 €/laatikko/vrk, minimilaskutus 10 €.'},
 {id:'box-delivery',title:'Laatikoiden kuljetusmaksu',category:'Muuttolaatikot',
  approved:true,source_type:'website',source_url:boxes,
  answer:'Muuttolaatikoiden kuljetus Turkuun, Raisioon, Kaarinaan, Maskuun, Lietoon ja Naantaliin maksaa 25 euroa ajokerralta. Muualle sopimuksen mukaan.'},
 {id:'box-estimate',title:'Kuinka monta muuttolaatikkoa tarvitsen?',category:'Muuttolaatikot',
  approved:true,source_type:'website',source_url:faq,
  answer:'Arvio 0,8–1 laatikkoa neliötä kohden. Todellinen määrä riippuu tavaroista.'},
 {id:'van-5h',title:'Pakettiauton 5 tunnin vuokrahinnat',category:'Pakettiautot',
  approved:true,source_type:'website',source_url:vans,
  answer:'13 m3 70 euroa / 5h, 17 m3 90 euroa / 5h, 20 m3 110 euroa / 5h; 100 km mukana.'},
 {id:'van-24h',title:'Pakettiauton vuorokausivuokra',category:'Pakettiautot',
  approved:true,source_type:'website',source_url:vans,
  answer:'13 m3 90 euroa/vrk, 17 m3 110 euroa/vrk, 20 m3 140 euroa/vrk; 150 km mukana.'},
 {id:'van-license',title:'Pakettiautojen ajokortti',category:'Pakettiautot',
  approved:true,source_type:'website',source_url:faq,
  answer:'Kaikkia Mainion vuokra-autoja voi ajaa B-ajokortilla.'},
 {id:'van-overnight',title:'Pakettiautojen yövuokraus',category:'Pakettiautot',
  approved:true,source_type:'website',source_url:faq,
  answer:'Pakettiauton yön yli vuokraamisesta pitää sopia erikseen; se ei onnistu nettivarauksen kautta.'},
 {id:'van-deductible',title:'Pakettiautojen omavastuu',category:'Pakettiautot',
  approved:true,source_type:'website',source_url:vans,
  answer:'Omavastuu 1300 euroa vahinkoa kohden. Sen voi alentaa 650 euroon 25 euron lisämaksusta.'},
 {id:'recycling-price',title:'Kierrätyksen alkaen hinta',category:'Kierrätys',
  approved:true,source_type:'website',source_url:faq,
  answer:'Kierrätyspalvelun hinnat alkavat 25 eurosta. Lopullinen hinta vahvistetaan erikseen.'},
 {id:'recycling-no-packing',title:'Voiko jätteen noutaa pakkaamatta?',category:'Kierrätys',
  approved:true,source_type:'website',source_url:faq,
  answer:'Kierrätystavaroita ei tarvitse pakata. Tavarat voidaan noutaa sellaisenaan.'}
];
const townPairs=[
 ['Turusta','Turkuun'],['Porista','Poriin'],['Rovaniemeltä','Rovaniemelle'],
 ['Kuopiosta','Kuopioon'],['Helsingistä','Helsinkiin'],['Tampereelta','Tampereelle'],
 ['Oulusta','Ouluun'],['Espoosta','Espooseen'],['Vantaalta','Vantaalle'],
 ['Jyväskylästä','Jyväskylään'],['Vaasasta','Vaasaan'],['Kaarinasta','Kaarinaan'],
 ['Raisiosta','Raisioon'],['Naantalista','Naantaliin'],['Salosta','Saloon'],
 ['Kotkasta','Kotkaan'],['Kouvolasta','Kouvolaan'],['Mikkelistä','Mikkeliin'],
 ['Porvoosta','Porvooseen'],['Seinäjoelta','Seinäjoelle'],
 ['Lappeenrannasta','Lappeenrantaan'],['Hämeenlinnasta','Hämeenlinnaan'],
 ['Joensuusta','Joensuuhun'],['Lahdesta','Lahteen'],
];
const prefixes=[x=>x,x=>'Moi, '+x,x=>'Hei! '+x];
const requireFact=(question,expectedId,phrase)=>{
  const a=mainioPublicFactAnswer(rows,question,'fi');
  assert.ok(a&&!a.handoff,question);
  assert.deepEqual(a.sourceIds,[expectedId],question);
  if(phrase)assert.match(a.answer,phrase,question);
  return a;
};

test('14,904 domestic city routes with accessory mentions keep moving quote/area, not box/van rental',()=>{
 let count=0;
 const templates=[
  (a,b)=>'Onnistuuko muutto '+a+' '+b+'?',
  (a,b)=>'Teettekö muuttoja '+a+' '+b+'?',
  (a,b)=>'Pitäisi muuttaa '+a+' '+b+'.',
 ];
 const extras=[' Tarvitsen myös muuttolaatikoita.',' Pakettiauto tarvitaan myös.',' Laatikoiden toimitus kiinnostaa.'];
 for(let a=0;a<townPairs.length;a++)for(let b=0;b<townPairs.length;b++){
   if(a===b)continue;
   for(const t of templates)for(const extra of extras)for(const wrap of prefixes){
     const q=wrap(t(townPairs[a][0],townPairs[b][1])+extra);
     count++;
     assert.equal(mainioInquiryKind(q),'moving',q);
     assert.equal(mainioMovingRouteIntent(q),true,q);
     assert.equal(mainioRecognizedDomesticRoute(q),true,q);
     const result=mainioPriorityDomesticRouteAnswer(rows,q,'fi');
     assert.ok(result&&!result.handoff,q);
     assert.deepEqual(result.sourceIds,['verified-service-area'],q);
     assert.match(result.answer,/tarkistamme erikseen/i,q);
     assert.equal(mainioInquiryActions(q,'fi')[0]?.mode,'mainio_move_form',q);
   }
 }
 assert.equal(count,14904);
});

test('international moves through a Finnish city cannot receive a domestic guarantee',()=>{
 let count=0;
 const foreign=['Tallinnaan','Tukholmaan','Osloon','Berliiniin','Lontooseen','Pariisiin'];
 const via=['Helsingin kautta','Turun kautta','Tampereen kautta','Oulun kautta','Porin kautta'];
 for(const origin of townPairs.slice(0,16))for(const goal of foreign)for(const stop of via){
   const q='Onnistuuko muutto '+origin[0]+' '+goal+' '+stop+'?';
   count++;
   assert.equal(mainioRecognizedDomesticRoute(q),false,q);
   assert.equal(mainioPriorityDomesticRouteAnswer(rows,q,'fi'),null,q);
 }
 assert.equal(count,480);
});

test('1,440 numeric box-needs questions must calculate a traceable area estimate',()=>{
 const sizes=Array.from({length:40},(_,i)=>(i+1)*5);
 const templates=[
  n=>'Montako muuttolaatikkoa tarvitsen '+n+' neliön asuntoon?',
  n=>'Kuinka monta laatikkoa tarvitsen '+n+'m2 asuntoon?',
  n=>'Paljonko laatikoita pitää varata '+n+' neliöön?',
  n=>'Kuinka paljon muuttolaatikoita tarvitsen '+n+' m² kaksioon?',
  n=>'Paljonko laatikoita tarvitaan '+n+' neliötä varten?',
  n=>'Montako laatikkoa tarvitaan '+n+' neliöiseen asuntoon?',
 ];
 const wrappers=[x=>x,x=>'Hei, '+x,x=>'Moi! '+x,x=>'Kysymys: '+x,x=>'Osaatteko sanoa: '+x,x=>x+' Kiitos!'];
 let count=0;
 for(const n of sizes)for(const template of templates)for(const wrap of wrappers){
   const q=wrap(template(n)),a=requireFact(q,'box-estimate',/suuntaa-antava/);
   const expectedLow=Math.ceil(n*.8);
   const expectedHigh=n;
   assert.ok(a.answer.includes(expectedLow+'–'+expectedHigh+' muuttolaatikkoa')||
     (expectedLow===expectedHigh&&a.answer.includes(expectedLow+' muuttolaatikkoa')),
     q+' => '+a.answer);
   count++;
 }
 assert.equal(count,1440);
});

test('van 5h and 24h colloquial price questions return the right tariff, not a confirmed reservation',()=>{
 let count=0;
 const groups=[
  {id:'van-5h',cost:/70 euroa/,q:[
   'Paljonko 5h pakettiauton vuokra maksaa?',
   'Mikä on pakettiauton 5 h vuokrahinta?',
   'Mitä paku maksaa viideksi tunniksi?',
   'Paljonko vuokra maksaa viiden tunnin ajaksi pakettiautolla?',
   '5 tunnin pakettiauton vuokra, mikä hinta?',
   'Viisi tuntia pakettiautolla, paljonko maksaa?',
  ]},
  {id:'van-24h',cost:/90 euroa/,q:[
   'Mitä pakettiauto maksaa 24h vuokralle?',
   'Paljonko vuokra maksaa 24 h pakettiautolle?',
   'Paljonko paku maksaa vuorokaudeksi?',
   'Mikä on pakettiauton vuorokausivuokran hinta?',
   'Paljonko vuokrapaku maksaa päiväksi?',
   'Mitä pakettiauton vuorokausi maksaa?',
  ]}
 ];
 for(const g of groups)for(const q of g.q)for(const wrap of prefixes){
   const answer=requireFact(wrap(q),g.id,g.cost);
   assert.doesNotMatch(answer.answer,/varattu sinulle|vahvistettu varaus/i);
   count++;
 }
 assert.equal(count,36);
});

test('rental terms and recycling are sourced to the correct FAQ row',()=>{
 const groups=[
 ['van-license',[
  'Riittääkö B-ajokortti pakettiauton vuokraukseen?',
  'Millä ajokortilla pakettiautoa saa ajaa?',
  'Voiko pakuja ajaa B-kortilla?']],
 ['van-overnight',[
  'Saako vuokrata pakettiauton yön yli?',
  'Onnistuuko pakun vuokraus yöksi?',
  'Voiko pakettiauton ottaa yöksi?']],
 ['van-deductible',[
  'Mikä on pakettiauton omavastuu?',
  'Paljonko on pakun omavastuu?',
  'Pakettiauton vuokrauksen omavastuu?']],
 ['recycling-price',[
  'Kuinka paljon kierrätys maksaa?',
  'Mistä kierrätyspalvelun hinnat alkavat?',
  'Mitä jätteiden kierrätys maksaa?']],
 ['recycling-no-packing',[
  'Voiko kierrätystavarat noutaa ilman pakkaamista?',
  'Täytyykö jätteet pakata ennen noutoa?',
  'Tarviiko kierrätettävät tavarat pakata?']]
 ];
 for(const [id,queries] of groups)for(const q of queries)for(const wrap of prefixes)
   requireFact(wrap(q),id);
});

test('availability and booking-status questions do not hallucinate reservations from price rows',()=>{
 const questions=[
  'Onko pakettiauto varmasti vapaana 5 tunniksi huomenna?',
  'Onko minun pakettiauton 5 tunnin vuokra jo varattu?',
  'Onko 24h paku vuokrattu minulle huomiseksi?',
  'Olenko varannut muuttolaatikot viikonlopuksi?',
  'Voiko pakettiauton noutaa heti, onko vapaana?',
  'Saanko muuttolaatikot varmasti tänään?',
  'Ovatko kaikki pakut varattuja huomenna?',
 ];
 for(const q of questions){
   const reply=mainioPublicFactAnswer(rows,q,'fi');
   assert.equal(reply,null,q+' => '+String(reply?.answer));
 }
});

test('factual snippets never use another host, customer claims or unapproved documents as evidence',()=>{
 const q='Paljonko muuttolaatikoiden vuokra maksaa?';
 for(const row of [
   {...rows[1],source_url:'https://mainiomuuttopalvelu.fi.evil.test/price'},
   {...rows[1],source_type:'customer'},
   {...rows[1],approved:false},
   {...rows[1],id:''},
 ]){
   assert.equal(mainioPublicFactAnswer([row],q,'fi'),null);
 }
 assert.equal(mainioPublicFactAnswer(rows,q,'en'),null);
 assert.equal(mainioPublicFactAnswer(rows,q,'sv'),null);
});
