// Counterexamples from 2026-11-02 browser testing of the real public demo,
// plus broad deterministic variants. No live customer data, accounts or bookings.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mainioOfficialPublicFacts,mainioPublicKnowledgeWithOfficialFacts} from '../mainio-official-public-facts.mjs';
import {mainioPublicFactAnswer} from '../mainio-public-fact-answer.mjs';
import {mainioPriorityDomesticRouteAnswer} from '../server.mjs';
import {mainioBookingStatusQuestion,mainioBookingStatusReply,mainioInquiryActions} from '../mainio-moving-intake.mjs';
const rows=mainioOfficialPublicFacts();
const by=(q)=>mainioPublicFactAnswer(rows,q,'fi');
function check(q,id,pattern){
 const result=by(q);
 assert.ok(result&&!result.handoff,q);
 assert.equal(result.sourceIds[0],id,q+' -> '+result.answer);
 if(pattern)assert.match(result.answer,pattern,q);
 return result;
}
const factId=(title)=>rows.find(row=>row.title===title)?.id;
test('every curated fact is traceable to official Mainio website and only there',()=>{
 assert.equal(rows.length,22);
 const ids=new Set();
 for(const row of rows){
   assert.equal(row.source_type,'website');
   assert.equal(row.approved,true);
   assert.ok(row.answer.length>=12);
   const parsed=new URL(row.source_url);
   assert.equal(parsed.protocol,'https:');
   assert.equal(parsed.hostname,'www.mainiomuuttopalvelu.fi');
   assert.ok(!ids.has(row.id),row.id);
   ids.add(row.id);
 }
});

test('browser failure #1: moving route with needed boxes is NOT a box-count FAQ',()=>{
 const q='Onnistuuko muutto Rovaniemeltä Turkuun ja tarvitsen samalla muuttolaatikoita?';
 assert.equal(by(q),null);
 const route=mainioPriorityDomesticRouteAnswer(rows,q,'fi');
 assert.ok(route&&!route.handoff);
 assert.equal(route.sourceIds[0],factId('Muuton toimialue'));
 assert.match(route.answer,/myös muualle Suomeen/);
 assert.match(route.answer,/tarkistamme erikseen/);
 assert.doesNotMatch(route.answer,/vahvistettu varaus|onnistuu varmasti|on varmasti varattu/i);
 assert.equal(mainioInquiryActions(q,'fi')[0]?.mode,'mainio_move_form');
});

test('browser failure #6: overnight van rental explains separate booking and excludes fake online booking',()=>{
 const quotes=[
  'Voiko pakettiauton vuokrata yön yli?',
  'Onnistuuko pakun vuokraus yöksi?',
  'Saako pakettiautoa käyttää yön yli?',
  'Voinko vuokrata pakun yöksi?',
  'Entä pakettiauton vuokraus yön yli?',
 ];
 for(const q of quotes)check(q,factId('Pakettiautojen yövuokraus'),/asiakaspalvelumme kanssa/);
});

test('browser failure #7: van deductible returns 1300/650/25, NEVER driver license info',()=>{
 const qs=[
   'Mikä on pakettiauton omavastuu?',
   'Paljonko on vuokrapakun omavastuu?',
   'Mitä pakettiauton omavastuu maksaa?',
   'Pakettiauton vuokrauksen omavastuu?',
 ];
 for(const q of qs){
   const a=check(q,factId('Pakettiautojen omavastuu'),/1300 euroa/);
   assert.match(a.answer,/650 euroon/);
   assert.match(a.answer,/25 euron/);
   assert.doesNotMatch(a.answer,/ajokortin ennen/i);
 }
});

test('browser failure #10: no restricted electrical work, no unhelpful lead fallthrough',()=>{
 for(const q of [
   'Teettekö luvanvaraisia sähkötöitä?',
   'Voitteko tehdä sähköasennuksia?',
   'Onko teillä luvanvaraisia sähkötöitä?',
   'Teettekö luvanvaraisia putkitöitä?',
 ]){
  const reply=check(q,factId('TV ja reititinasennukset'),/Emme tee luvanvaraisia sähkö- tai putkitöitä/);
  assert.doesNotMatch(reply.answer,/jätä yhteystiedot/i);
 }
});

test('individual moving and van bookings cannot be presumed confirmed from public web knowledge',()=>{
 for(const q of [
   'Onko muutto Rovaniemeltä Turkuun varmasti vahvistettu huomiseksi?',
   'Onko pakettiauto jo varattu minulle?',
   'Onko 5 tunnin pakettiauto huomenna vapaana?',
   'Onko minun muutto varattu viikonlopulle?',
 ]){
   assert.equal(mainioBookingStatusQuestion(q),true,q);
   const a=mainioBookingStatusReply('fi');
   assert.match(a.answer,/En voi tarkistaa tästä chatista/);
   assert.doesNotMatch(a.answer,/on vahvistettu|se on varattu/i);
 }
});

test('4,500 box-count variants use official 0.8–1 per m², not rental price or unrelated FAQ',()=>{
 const sizes=Array.from({length:100},(_,i)=>i+10);
 const queries=[
  n=>'Montako muuttolaatikkoa tarvitsen '+n+' neliön asuntoon?',
  n=>'Kuinka monta laatikkoa '+n+'m2 asuntoon tarvitaan?',
  n=>'Paljonko laatikoita pitää varata '+n+' neliöön?',
  n=>'Riittääkö '+n+' muuttolaatikkoa vai tarvitsenko enemmän?',
  n=>'Kuinka paljon muuttolaatikoita tarvitsen '+n+' m² asuntoon?',
  n=>'Mikä on laatikoiden määrä '+n+' neliön kaksioon?',
  n=>'Kuinka monta laatikkoa tarvitsen '+n+' neliöiseen asuntoon?',
  n=>'Montako laatikkoa tarvitaan '+n+' neliöistä asuntoa varten?',
  n=>'Kuinka monta muuttolaatikkoa '+n+' neliöiseen kotiin?',
 ];
 const wraps=[x=>x,x=>'Moi, '+x,x=>'Hei! '+x,x=>'Kysymys: '+x,x=>x+' Kiitos!'];
 let count=0;
 for(const n of sizes)for(const q of queries)for(const wrap of wraps){
  const question=wrap(q(n));
  const reply=check(question,factId('Kuinka monta muuttolaatikkoa tarvitsen?'),/suuntaa-antava/i);
  if(!question.includes('Riittääkö '+n+' muuttolaatikkoa')){
    const low=Math.ceil(n*.8),high=n;
    assert.ok(reply.answer.includes(low+'–'+high+' muuttolaatikkoa') ||
       (low===high&&reply.answer.includes(low+' muuttolaatikkoa')),question);
  }
  count++;
 }
 assert.equal(count,4500);
});

test('FI, SV and EN only receive grounded facts in right language handling',()=>{
 for(const q of ['Voiko pakettiauton vuokrata yön yli?','Mikä on pakettiauton omavastuu?']){
   assert.equal(mainioPublicFactAnswer(rows,q,'sv'),null);
   assert.equal(mainioPublicFactAnswer(rows,q,'en'),null);
 }
 for(const lang of ['fi','sv','en']){
   const b=mainioBookingStatusReply(lang);
   assert.ok(b.answer&&b.actions[0].url.includes('mainiomuuttopalvelu.fi'));
 }
});

test('curated official facts win over incomplete generic imported demo evidence',()=>{
 const contaminated=[
  {id:'demo-import-1',title:'Pakettiautojen omavastuu',source_type:'website',
   source_url:'https://www.mainiomuuttopalvelu.fi/pakettiautojen-vuokraus',
   answer:'Tarkistamme asiakkaan ajokortin.'},
  {id:'demo-import-2',title:'Muuton toimialue',source_type:'website',
   source_url:'https://www.mainiomuuttopalvelu.fi/muuttopalvelut',
   answer:'Kysy meiltä tarjousta.'}
 ];
 const merged=mainioPublicKnowledgeWithOfficialFacts(contaminated);
 assert.equal(merged.length,rows.length+2);
 assert.deepEqual(merged.slice(0,rows.length),rows);
 const reply=mainioPublicFactAnswer(merged,'Mikä on pakettiauton omavastuu?','fi');
 assert.match(reply.answer,/1300 euroa/);
 const route=mainioPriorityDomesticRouteAnswer(merged,'Onnistuuko muutto Rovaniemeltä Turkuun?','fi');
 assert.ok(route&&!route.handoff);
 assert.match(route.answer,/tarkistamme erikseen/);
});
