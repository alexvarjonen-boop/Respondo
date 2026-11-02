// Deterministic 6,000+ variant stress suite. Exercises the SAME priority
// functions used by the production Mainio preview and widget, with approved
// WEBSITE FACT FIXTURES; this does NOT claim 6,000 real customer API calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mainioMovingRouteIntent,mainioRecognizedDomesticRoute,
  mainioBoxRentalIntent,mainioVanRentalIntent,mainioInquiryKind
} from '../mainio-moving-intake.mjs';
import {interpretMainioLocalIntent,mainioSemanticActions} from '../mainio-semantic-intent.mjs';
import {mainioPriorityDomesticRouteAnswer,mainioSemanticGroundedReply} from '../server.mjs';

const area={
  id:'source-approved-area',title:'Muuton toimialue',
  source_type:'website',approved:true,
  source_url:'https://www.mainiomuuttopalvelu.fi/avaimet-kateen-muutto-vai-omatoiminen-muutto-vaihtoehdot-vertailussa',
  answer:'Mainio palvelee Turussa ja Varsinais-Suomessa. Muutot voivat suuntautua myös muualle Suomeen; tarkka reitti ja toteutus sovitaan erikseen.'
};
const boxes={
  id:'source-approved-box-rental',title:'Muuttolaatikoiden hinta',
  category:'Muuttolaatikot',approved:true,source_type:'website',
  source_url:'https://www.mainiomuuttopalvelu.fi/muuttolaatikot-ja-tarvikkeet',
  answer:'Muuttolaatikoiden vuokra 0,20 euroa laatikolta vuorokaudessa; minimilaskutus 10 euroa.'
};
const van={
  id:'source-approved-van-rental',title:'Pakettiauton vuokrauslomake',
  category:'Pakettiautot',approved:true,source_type:'website',
  source_url:'https://www.mainiomuuttopalvelu.fi/pakettiautojen-vuokraus',
  answer:'Pakettiauton voi vuokrata verkkosivun varauslomakkeelta. Saatavuus varmistetaan erikseen.'
};
const rows=[area,boxes,van];

const towns=[
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
const routeTemplates=[
 (a,b)=>'Onnistuuko muutto '+a+' '+b+'?',
 (a,b)=>'Teettekö muuttoja '+a+' '+b+'?',
 (a,b)=>'Muutatteko '+a+' '+b+'?',
 (a,b)=>'Voiko muuttaa '+a+' '+b+'?',
 (a,b)=>'Pitäisi muuttaa '+a+' '+b+'.',
 (a,b)=>'Ois muutto '+a+' '+b,
 (a,b)=>'Muuttaisittekö '+a+' '+b+'?',
 (a,b)=>'Saako muuton '+a+' '+b+'?',
 (a,b)=>'Onnistuisko muutto '+a+' '+b+'?',
 (a,b)=>'Voitteko hoitaa muuton '+a+' '+b+'?',
];

test('5,520 geographically distinct, evidence-backed Mainio moving-route questions',()=>{
 let total=0;
 for(let a=0;a<towns.length;a++)for(let b=0;b<towns.length;b++){
  if(a===b)continue;
  for(const template of routeTemplates){
   const q=template(towns[a][0],towns[b][1]);total++;
   assert.equal(mainioMovingRouteIntent(q),true,q);
   assert.equal(mainioRecognizedDomesticRoute(q),true,q);
   const intent=interpretMainioLocalIntent(q);
   assert.equal(intent?.intent,'moving_route',q);
   const answer=mainioPriorityDomesticRouteAnswer(rows,q,'fi',intent);
   assert.ok(answer&&!answer.handoff,q);
   assert.deepEqual(answer.sourceIds,[area.id],q);
   assert.match(answer.answer,/myös muualle Suomeen/,q);
   assert.match(answer.answer,/tarkistamme erikseen/i,q);
   assert.doesNotMatch(answer.answer,/onnistuu varmasti|vahvistettu varaus|varattu aika/i,q);
  }
 }
 assert.equal(total,5520);
});

test('hundreds of box-rental formulations respond with verified yes and the correct link',()=>{
 const things=['laatikot','laatikoita','laatikkoja','muuttolaatikot','muuttolaatikoita','muuttolaatikkoja'];
 const templates=[
  x=>'Saako teiltä vuokrattua '+x+'?',
  x=>'Voinko vuokrata '+x+'?',
  x=>'Vuokraatteko '+x+'?',
  x=>'Onnistuuko '+x+' vuokraus?',
  x=>'Saako '+x+' vuokralle?',
  x=>'Tarvitsisin '+x+' vuokralle.',
  x=>'Voisiko teiltä vuokrata '+x+'?',
  x=>'Haluaisin vuokrata '+x,
 ];
 const wrappers=[x=>x,x=>'Hei, '+x,x=>'Moi! '+x,x=>x+' Kiitos!',x=>'Olisi kysymys: '+x];
 let total=0;
 for(const noun of things)for(const template of templates)for(const wrapper of wrappers){
  const q=wrapper(template(noun));total++;
  assert.equal(mainioBoxRentalIntent(q),true,q);
  assert.equal(mainioInquiryKind(q),'boxes',q);
  const intent=interpretMainioLocalIntent(q);
  assert.equal(intent?.intent,'box_rental',q);
  const answer=mainioSemanticGroundedReply(rows,intent,'fi');
  assert.match(answer.answer,/^Kyllä, meiltä voi vuokrata muuttolaatikoita!/,q);
  assert.deepEqual(answer.sourceIds,[boxes.id],q);
  assert.equal(mainioSemanticActions(intent,'fi')[0]?.url,boxes.source_url,q);
 }
 const english=[
  x=>'Can I rent '+x+'?',x=>'Do you rent '+x+'?',
  x=>'I would like to rent '+x,x=>'Could we hire '+x+'?',
  x=>'Is it possible to rent '+x+'?',
 ];
 const swedish=[
  x=>'Kan jag hyra '+x+'?',x=>'Hyr ni '+x+'?',
  x=>'Vi vill hyra '+x+'.',x=>'Går det att hyra '+x+'?',
 ];
 for(const noun of ['boxes','moving boxes','box','crates','moving crates'])
  for(const template of english)for(const wrapper of wrappers.slice(0,3)){
   const q=wrapper(template(noun));total++;
   const intent=interpretMainioLocalIntent(q);
   assert.equal(intent?.intent,'box_rental',q);
   assert.match(mainioSemanticGroundedReply(rows,intent,'en').answer,/^Yes, you can rent moving boxes from us!/);
 }
 for(const noun of ['lådor','flyttlådor','flyttkartonger'])
  for(const template of swedish)for(const wrapper of wrappers.slice(0,3)){
   const q=wrapper(template(noun));total++;
   const intent=interpretMainioLocalIntent(q);
   assert.equal(intent?.intent,'box_rental',q);
   assert.match(mainioSemanticGroundedReply(rows,intent,'sv').answer,/^Ja, du kan hyra flyttlådor av oss!/);
 }
 assert.equal(total,351);
});

test('hundreds of van and paku rental questions use verified van booking rather than moving quote',()=>{
 const nouns=['pakun','pakettiauton','pakettiautoja','paku'];
 const templates=[
  x=>'Voinko vuokrata '+x+'?',
  x=>'Saako teiltä vuokrattua '+x+'?',
  x=>'Haluan vuokrata '+x,
  x=>'Vuokraatteko '+x+'?',
  x=>'Tarvisin '+x+' vuokralle.',
  x=>'Saaks '+x+' vuokralle?',
  x=>'Onnistuuko '+x+' vuokraus?',
 ];
 const wrappers=[x=>x,x=>'Moi, '+x,x=>'Hei! '+x,x=>x+' Kiitos!',x=>'Kysymys: '+x];
 let total=0;
 for(const noun of nouns)for(const template of templates)for(const wrapper of wrappers){
  const q=wrapper(template(noun));total++;
  assert.equal(mainioVanRentalIntent(q),true,q);
  assert.equal(mainioInquiryKind(q),'van',q);
  const intent=interpretMainioLocalIntent(q);
  assert.equal(intent?.intent,'van_rental',q);
  const answer=mainioSemanticGroundedReply(rows,intent,'fi');
  assert.ok(!answer.handoff,q);
  assert.deepEqual(answer.sourceIds,[van.id],q);
  assert.match(answer.answer,/meiltä voi vuokrata pakettiauton/i,q);
  assert.equal(mainioSemanticActions(intent,'fi')[0]?.url,van.source_url,q);
 }
 for(const noun of ['a van','vans','a moving van'])
  for(const template of [
   x=>'Can I rent '+x+'?',x=>'Do you rent '+x+'?',
   x=>'Could I hire '+x+'?',x=>'I would like to rent '+x
  ])for(const wrapper of wrappers.slice(0,3)){
   const q=wrapper(template(noun));total++;
   const intent=interpretMainioLocalIntent(q);
   assert.equal(intent?.intent,'van_rental',q);
   assert.match(mainioSemanticGroundedReply(rows,intent,'en').answer,/^Yes, you can rent a van from us/);
 }
 for(const noun of ['skåpbil','skåpbilar'])
  for(const template of [x=>'Kan jag hyra '+x+'?',x=>'Hyr ni '+x+'?',x=>'Vi vill hyra '+x])
   for(const wrapper of wrappers.slice(0,3)){
    const q=wrapper(template(noun));total++;
    assert.equal(interpretMainioLocalIntent(q)?.intent,'van_rental',q);
    assert.match(mainioSemanticGroundedReply(rows,{intent:'van_rental'},'sv').answer,/^Ja, du kan hyra en skåpbil av oss/);
   }
 assert.equal(total,194);
});

test('unsupported geography, price and quantity questions must not get invented yes or availability',()=>{
 let checks=0;
 for(const from of ['Helsingistä','Rovaniemeltä','Porista','Oulusta','Tampereelta'])
  for(const abroad of ['Tukholmaan','Tallinnaan','Osloon','Berliiniin','Lontooseen']){
   const q='Onnistuuko muutto '+from+' '+abroad+'?';checks++;
   assert.equal(mainioRecognizedDomesticRoute(q),false,q);
   assert.equal(mainioPriorityDomesticRouteAnswer(rows,q,'fi',interpretMainioLocalIntent(q)),null,q);
  }
 for(const q of [
  'Kuinka monta muuttolaatikkoa tarvitsen?','Paljonko muuttolaatikon vuokra maksaa?',
  'Mikä on pakettiauton vuokrahinta?','Paljonko maksaa pakun vuokra?',
  'Mikä on pakettiauton omavastuu?', 'Tarvitaanko pakun vuokraamiseen ajokortti?',
 ]){
  checks++;
  assert.equal(interpretMainioLocalIntent(q),null,q);
 }
 for(const q of [
  'Myyttekö pahvilaatikoita?','Ostaisin pahvilaatikoita.',
  'Saako teiltä kierrätyspahvia?','Kuinka monta laatikkoa tarvitsen?',
  'Voiko laatikon kierrättää?','Miten pakkaan laatikot?',
 ]){
  checks++;
  assert.equal(mainioBoxRentalIntent(q),false,q);
 }
 assert.equal(checks,37);
});
