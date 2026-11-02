// Real handler functions, deterministic synthetic language stress.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {mainioBookingStatusQuestion,mainioBookingStatusReply,MAINIO_CONTACT_URL}
 from '../mainio-moving-intake.mjs';
import {mainioPublicFactAnswer} from '../mainio-public-fact-answer.mjs';

const rows=[
 {id:'van-price',title:'Pakettiauton 5 tunnin vuokrahinnat',
  source_type:'website',approved:true,source_url:'https://www.mainiomuuttopalvelu.fi/pakettiautojen-vuokraus',
  answer:'5 tunnin vuokra 70 euroa. Vuokra-ajankohdan saatavuus tarkistetaan erikseen.'},
 {id:'box-price',title:'Muuttolaatikoiden hinta',
  source_type:'website',approved:true,source_url:'https://www.mainiomuuttopalvelu.fi/muuttolaatikot-ja-tarvikkeet',
  answer:'0,20 €/laatikko/vrk.'},
];

test('Mainio booking status/availability catches hundreds of Finnish customer phrases',()=>{
 const subjects=['pakettiauto','paku','muutto','muuttolaatikot','laatikot','muuttoajat'];
 const predicates=[
   subject=>'Onko '+subject+' jo varattu minulle?',
   subject=>'Onko '+subject+' vapaana huomenna?',
   subject=>'Onko '+subject+' varmasti vapaana?',
   subject=>'Onko '+subject+' jo vahvistettu?',
   subject=>'Onko minun '+subject+' varattu ensi viikolle?',
   subject=>'Onks '+subject+' varattu mulle?',
   subject=>'Onko '+subject+' vuokrattu minulle?',
 ];
 const prefixes=[x=>x,x=>'Hei, '+x,x=>'Moi! '+x,x=>'Kysymys: '+x];
 let count=0;
 for(const subject of subjects)for(const phrase of predicates)for(const prefix of prefixes){
   const q=prefix(phrase(subject));
   assert.equal(mainioBookingStatusQuestion(q),true,q);
   count++;
 }
 assert.equal(count,168);
});

test('Mainio recognises English booking and availability questions',()=>{
 const subjects=['van','moving van','boxes','moving boxes','move','booking'];
 const phrases=[
  s=>'Is my '+s+' booked?',
  s=>'Are the '+s+' available tomorrow?',
  s=>'Is the '+s+' already confirmed?',
  s=>'Is the '+s+' free next week?',
  s=>'Do you have '+s+' available today?',
 ];
 const prefixes=[x=>x,x=>'Hello, '+x,x=>'Hi! '+x,x=>'Question: '+x];
 let count=0;
 for(const subject of subjects)for(const phrase of phrases)for(const prefix of prefixes){
   const q=prefix(phrase(subject));
   assert.equal(mainioBookingStatusQuestion(q),true,q);
   count++;
 }
 assert.equal(count,120);
});

test('Mainio Swedish personal booking and available slot questions are not mistaken for published policy',()=>{
 const subjects=['skåpbil','hyrbil','flytt','flyttlådor','bokning'];
 const phrases=[
  s=>'Är min '+s+' bokad?',
  s=>'Är '+s+' ledig i morgon?',
  s=>'Är '+s+' bekräftad?',
  s=>'Finns det '+s+' lediga på fredag?',
 ];
 const prefixes=[x=>x,x=>'Hej, '+x,x=>'Jag undrar: '+x];
 let count=0;
 for(const subject of subjects)for(const phrase of phrases)for(const prefix of prefixes){
   const q=prefix(phrase(subject));
   assert.equal(mainioBookingStatusQuestion(q),true,q);
   count++;
 }
 assert.equal(count,60);
});

test('all three locale responses refuse to invent customer booking confirmation and link original contact page',()=>{
 for(const [lang,fragment] of [
  ['fi',/En voi tarkistaa tästä chatista/],
  ['sv',/Jag kan inte kontrollera/],
  ['en',/I cannot check the status/],
 ]){
  const reply=mainioBookingStatusReply(lang);
  assert.match(reply.answer,fragment);
  assert.equal(reply.handoff,false);
  assert.deepEqual(reply.sourceIds,[]);
  assert.equal(reply.actions[0].url,MAINIO_CONTACT_URL);
  assert.match(reply.actions[0].url,/mainiomuuttopalvelu\.fi\/yhteystiedot/);
  assert.doesNotMatch(reply.answer,/already booked|vahvistettu varaus|on vapaa|on varattu|bokningen är bekräftad/i);
 }
});

test('ordinary price questions and enquiries about how to rent are not treated as personal booking status',()=>{
 for(const q of [
  'Paljonko muuttolaatikoiden vuokra maksaa?',
  'Mikä on pakettiauton 5 tunnin vuokrahinta?',
  'Mitä maksaa vuokrata paku päiväksi?',
  'Voinko vuokrata muuttolaatikoita?',
  'Mistä voin varata pakettiauton?',
  'Onko teillä pakettiautojen vuokrausta?',
  'Can I rent a van?',
  'How much does a van cost for five hours?',
  'Vad kostar det att hyra en skåpbil?',
  'Hyr ni flyttlådor?',
 ])assert.equal(mainioBookingStatusQuestion(q),false,q);
});

test('Mainio status guard outranks priced facts in both public demo, owner preview and live widget',async()=>{
 const code=await readFile(new URL('../server.mjs',import.meta.url),'utf8');
 assert.match(code,/mainioStatusPreview \? mainioStatusPreview : mainioRoutePreview/);
 assert.match(code,/mainioBookingReply \? mainioBookingReply : mainioRouteReply/);
 assert.match(code,/if\(mainioBookingReply\) actions=mainioBookingReply\.actions/);
 assert.match(code,/publicMainioDemo=isMainioPublicDemoWebsite\(/);
 assert.match(code,/isMainioPublicDemoWebsite\(\{/);
 const question='Onko minun pakettiauton 5 tunnin vuokra jo varattu?';
 assert.ok(mainioBookingStatusQuestion(question));
 // Source-locked rental prices do not prove an individual reservation.
 assert.equal(mainioPublicFactAnswer(rows,question,'fi'),null);
});
