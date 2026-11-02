import test from 'node:test';
import assert from 'node:assert/strict';
import {mainioPublicFactAnswer} from '../mainio-public-fact-answer.mjs';
import {mainioOfficialPublicFacts,mainioPublicKnowledgeWithOfficialFacts} from '../mainio-official-public-facts.mjs';
import {
  mainioBoxRentalFollowupIntent,mainioMovingRouteIntent,
  mainioRecognizedDomesticRoute,mainioInquiryActions
} from '../mainio-moving-intake.mjs';
import {interpretMainioLocalIntent,mainioSemanticActions} from '../mainio-semantic-intent.mjs';

const official=mainioOfficialPublicFacts();
const rows=mainioPublicKnowledgeWithOfficialFacts([]);
const byTitle=new Map(official.map(row=>[row.title,row]));
const factCases=[
 ['Muuttolaatikoiden hinta',[
  'Paljonko muuttolaatikoiden vuokra maksaa','Mitä muuttolaatikoiden vuokra maksaa','Paljonko laatikoiden vuokra on','Mikä on muuttolaatikoiden hinta','Mitä yksi muuttolaatikko maksaa vuorokaudessa','Paljonko laatikot maksavat vuokralle','Laatikoiden vuokrahinta','Onko muuttolaatikoissa minimiveloitus','Paljonko muuttolaatikoiden vuokraus maksaa']],
 ['Muuttolaatikoiden mitat',[
  'Mitkä ovat muuttolaatikoiden mitat','Minkä kokoiset muuttolaatikot ovat','Mitä mittoja muuttolaatikoissa on','Mikä on laatikoiden koko','Kuinka suuria muuttolaatikot ovat','Millaiset mitat muuttolaatikoissa on','Minkä kokoisia vuokralaatikot ovat','Paljonko yhden muuttolaatikon mitat ovat','Muuttolaatikoiden koko ja mitat']],
 ['Kuinka monta muuttolaatikkoa tarvitsen?',[
  'Montako muuttolaatikkoa tarvitsen','Kuinka monta laatikkoa tarvitsen','Paljonko laatikoita tarvitsen','Kuinka paljon laatikoita pitää varata','Mikä on muuttolaatikoiden määrä','Montako laatikkoa tarvitaan','Kuinka monta laatikkoa 60 neliön asuntoon tarvitaan','Kuinka paljon laatikoita kannattaa varata','Laatikoiden menekki neliöiden mukaan']],
 ['Laatikoiden kuljetusmaksu',[
  'Paljonko muuttolaatikoiden kuljetus maksaa','Mikä on laatikoiden toimitusmaksu','Onko laatikoiden kotiinkuljetus maksullinen','Paljonko laatikoiden kuljetus maksaa','Mitä laatikoiden toimitus maksaa','Mikä on kuljetuskulu laatikoille','Paljonko kotiinkuljetus maksaa laatikoille','Onko laatikoiden kuljetus ilmainen','Laatikoiden kuljetusmaksu']],
 ['Laatikoiden toimitus ja palautus',[
  'Toimitatteko muuttolaatikot kotiin','Miten laatikoiden toimitus ja palautus hoidetaan','Tuotteko laatikot meille ja haetteko pois','Saako laatikot kotiin','Noudatteko laatikot muuton jälkeen','Miten laatikot palautetaan','Onko laatikoiden kuljetus mahdollista','Voiko laatikot tilata kotiin','Toimitetaanko laatikot osoitteeseen']],
 ['Muuttolaatikkojen noutopäivät',[
  'Milloin muuttolaatikot toimitetaan ja noudetaan','Mitkä ovat laatikoiden toimituspäivät','Milloin laatikoita voi noutaa','Mille päiville laatikoiden nouto onnistuu','Milloin laatikot tuodaan','Mitkä päivät laatikoiden toimitukseen','Milloin muuttolaatikoiden nouto onnistuu','Mihin aikaan laatikot toimitetaan','Mitkä ovat muuttolaatikoiden noutopäivät']],
 ['Pakettiautojen omavastuu',[
  'Mikä on pakettiauton omavastuu','Paljonko paku omavastuu on','Mikä omavastuu vuokra-autossa','Onko pakettiautossa omavastuu','Paljonko pakettiauton vahingon omavastuu on','Miten vuokra-auton omavastuu määräytyy','Saako omavastuun pienemmäksi pakettiautossa','Voiko pakettiauton omavastuun puolittaa','Mitä pakun omavastuu tarkoittaa']],
 ['Pakettiautojen ajokortti',[
  'Saako pakettiautoa ajaa B-ajokortilla','Mitä ajokorttia pakettiauton ajoon tarvitaan','Riittääkö B-kortti pakettiautoon','Voiko paku ajaa B-kortilla','Millä kortilla vuokra-autoa saa ajaa','Onko B-ajokortti riittävä pakettiautolle','Tarvitaanko C-kortti pakettiautoon','Mikä ajokortti pakettiauton vuokraamiseen tarvitaan','Saako vuokrapakua ajaa tavallisella kortilla']],
 ['Pakettiautojen yövuokraus',[
  'Voiko pakettiauton vuokrata yön yli','Saako paku olla yön yli','Onko pakettiautojen yövuokraus mahdollista','Voinko vuokrata pakettiauton yöksi','Miten yön yli vuokraus onnistuu pakulla','Voiko pakettiauton pitää yön yli','Saako vuokra-auton yöksi','Onko yövuokraus mahdollinen pakettiautolle','Voiko pakun palauttaa vasta seuraavana aamuna']],
 ['Pakettiauton nouto- ja palautusosoite',[
  'Mistä pakettiauto noudetaan ja palautetaan','Missä paku noudetaan','Mihin pakettiauto palautetaan','Mistä vuokra-auto haetaan','Mistä auton saa noudettua','Mihin auton voi palauttaa','Mikä on pakettiauton nouto-osoite','Missä pakettiauton noutopaikka on','Mistä paku haetaan ja mihin palautetaan']],
 ['Pakettiauton 5 tunnin vuokrahinnat',[
  'Paljonko pakettiauto maksaa viideksi tunniksi','Mikä on paku viiden tunnin hinta','Mitä maksaa 5 tunnin vuokra pakettiautolle','Paljonko 5h vuokra maksaa pakettiautolla','Mitä viiden tunnin pakettiauton vuokra maksaa','Paljonko pakettiauton vuokra on viideltä tunnilta','5 tunnin pakettiauton vuokrahinta','Paljonko paku maksaa viideksi tunniksi','Mitä 5 h pakettiauton vuokra maksaa']],
 ['Paljonko pakettiauton 3 tunnin vuokra maksaa?',[
  'Paljonko pakettiauto maksaa kolmeksi tunniksi','Mikä on paku kolmen tunnin hinta','Mitä maksaa 3 tunnin vuokra pakettiautolle','Paljonko 3h vuokra maksaa pakettiautolla','Mitä kolmen tunnin pakettiauton vuokra maksaa','Paljonko pakettiauton vuokra on kolmelta tunnilta','3 tunnin pakettiauton vuokrahinta','Paljonko paku maksaa kolmeksi tunniksi','Mitä 3 h pakettiauton vuokra maksaa']],
 ['Pakettiauton vuorokausivuokra',[
  'Paljonko pakettiauto maksaa vuorokaudeksi','Mikä on pakettiauton vuorokausivuokra','Mitä maksaa paku 24 tunniksi','Mitä pakettiauton päivävuokra maksaa','Paljonko paku maksaa päivävuokralla','Paljonko vuokra-auto maksaa vuorokaudessa','Mikä on 24h pakettiauton hinta','Paljonko pakettiauton vuokra on päiväksi','Mitä yhden vuorokauden pakettiautovuokra maksaa']],
 ['Kierrätyksen alkaen hinta',[
  'Paljonko kierrätyspalvelu maksaa','Mikä on kierrätyksen alkaen hinta','Mistä kierrätyspalvelun hinta muodostuu','Paljonko jätteiden nouto maksaa','Mitä jätepalvelu maksaa','Paljonko kierrätys maksaa','Mikä on kierrätyspalvelun lähtöhinta','Paljonko tavaroiden kierrätys maksaa','Mitä jätteiden kierrätys maksaa']],
 ['Voiko jätteen noutaa pakkaamatta?',[
  'Voitteko noutaa jätteet ilman pakkaamista','Tarvitseeko kierrätettävät tavarat pakata','Voiko jätteen noutaa pakkaamatta','Noudatteko jätteet pakkaamattomina','Pitääkö kierrätystavarat pakata ennen noutoa','Voiko tavarat antaa sellaisenaan kierrätykseen','Noudatteko kierrätettävät tavarat ilman pakkausta','Tarvitseeko jätteet pakata','Voiko irtaimiston noutaa ilman pakkaamista']],
 ['Kierrätyspalvelu',[
  'Mitä kierrätyspalveluun kuuluu','Onko teillä kierrätyspalvelu','Millaista kierrätyspalvelua tarjoatte','Voitteko noutaa jätteitä','Teettekö jätteiden noutoja','Mitä tavaroita voitte hakea kierrätykseen','Onko jätteiden noutopalvelu','Voiko kierrätettäviä tavaroita tilata noudettavaksi','Mitä kierrätyksessä voidaan noutaa']],
 ['Välivarastointi ennen muuttoa',[
  'Tarjoatteko välivarastointia ennen muuttoa','Voiko tavaroita varastoida muuton välissä','Onko välivarastointi mahdollista','Voitteko säilyttää tavaroita muuton ajan','Tarjoatteko väliaikaista varastointia muuton yhteydessä','Saako tavarat varastoon ennen uuteen kotiin pääsyä','Voiko irtaimiston jättää välivarastoon','Onko teillä muuttovarastointia','Tarvitsen välivaraston muuton ajaksi']],
 ['Kalusteiden purkaminen ja kokoaminen',[
  'Puratteko ja kokoatteko huonekaluja','Saako kalusteiden purku- ja kokoamispalvelua','Voitteko koota kaapin muuton yhteydessä','Asennatteko huonekaluja','Voitteko purkaa sängyn ja koota sen uudessa kodissa','Onnistuuko sohvan ja kaapin siirtäminen ja asennus','Tarjoatteko kalusteasennuksia','Voiko huonekalut purkaa muuton yhteydessä','Kokoatteko huonekalut uudessa asunnossa']],
 ['TV ja reititinasennukset',[
  'Teettekö luvanvaraisia sähkötöitä','Voitteko tehdä putkitöitä','Saako teiltä TV:n ja reitittimen asennusapua','Voitteko asentaa television ja reitittimen','Onko TV:n asennus mahdollista muuton yhteydessä','Autatteko reitittimen asennuksessa','Asennatteko TV:tä ja reititintä','Voitteko auttaa television kytkemisessä','Teettekö sähköasennuksia']],
 ['Muuttopäivän kulku',[
  'Miten muuttopäivä etenee','Mitä tapahtuu muuttopäivänä','Kuinka muuttopäivä sujuu','Millainen on muuttopäivän kulku','Miten muuttopäivä yleensä toimii','Mitä muuttopäivänä pitää tehdä','Miten muutto hoidetaan muuttopäivänä','Millaiset ohjeet muuttopäivään saa','Miten muuttopäivän työ etenee']],
 ['Muuton kesto',[
  'Kuinka kauan muutto kestää','Kauanko muutto kestää','Miten pitkään muuttopalvelu kestää','Paljonko aikaa muuttoon kuluu','Mikä on muuton arvioitu kesto','Kuinka pitkä muuttopäivä on','Kauanko tavaroiden muutto kestää','Mistä muuton kesto riippuu','Kuinka kauan asunnon muutto yleensä vie']],
 ['Pakkaus- ja kantoapu',[
  'Tarjoatteko pakkaus- ja kantoapua','Onko teillä pakkauspalvelu','Voitteko pakata tavarat','Tarvitsen apua tavaroiden kantamiseen','Saako teiltä kantoapua muuttoon','Autatteko pakkaamisessa ja kantamisessa','Voitteko kantaa huonekalut','Onko pakkaaminen mahdollista tilata teiltä','Tarjoatteko apua muuton pakkaamiseen']],
 ['Hissittömän muuton suunnittelu',[
  'Onko muutto hissittömään taloon mahdollista','Miten muutto onnistuu ilman hissiä','Muutto kolmanteen kerrokseen ilman hissiä','Miten huomioitte hissittömän talon muutossa','Vaikuttaako hissin puuttuminen muuton hintaan','Voitteko hoitaa muuton kerrostalossa ilman hissiä','Mitä pitää huomioida jos talossa ei ole hissiä','Miten muutto onnistuu viidennestä kerroksesta','Meillä ei ole hissiä, onnistuuko muutto']],
 ['Pakettiauton tavaratilan koko',[
  'Paljonko pakettiauton tavaratilaan mahtuu','Mikä on pakettiauton kuutiotilavuus','Kuinka iso tavaratila pakettiautossa on','Minkä kokoisia pakettiautoja on vuokralla','Onko paku 13 m3','Mitä pakettiauton tavaratilaan mahtuu','Minkä kokoinen on vuokrapakun kuormatila','Mitä eri pakettiautokokoja löytyy','Paljonko kuutioita pakettiautossa on']],
 ['Muuton hinta',[
  'Paljonko muutto maksaa','Mikä on muuton hinta','Mistä muuton hinta muodostuu','Paljonko maksaa muutto Turusta Helsinkiin','Miten muuton hinta lasketaan','Mitä kotimuutto maksaa','Kuinka paljon muutto maksaa','Mikä vaikuttaa muuton kustannuksiin','Paljonko muuttopalvelu maksaa']],
 ['Täyden palvelun avaimet käteen -muutto',[
  'Voitteko hoitaa koko muuton avaimet käteen','Pakkaatteko kaikki tavarat','Voitteko hoitaa pakkaamisen ja koko muuton puolestani','Onko teillä avaimet käteen -muutto','Hoidatteko koko muuton alusta loppuun','Saako muuton kaikki vaiheet samalta yritykseltä','Voitteko hoitaa pakkaamisen ja muuton','Tarjoatteko täyden palvelun muuttoa','Onnistuuko muutto niin ettei minun tarvitse pakata itse']]
];

const prefixes=['','Hei, ','Moi! ','Anteeksi, ','Yksi kysymys: ','Voitko kertoa: '];
const suffixes=['?','??',' kiitos',' vielä?',' nopeasti?'];
const casing=[s=>s,s=>s.toLowerCase(),s=>s.toUpperCase()];
const failures=[];
const categoryStats=[];
let generated=0,correct=0;
for(const [title,bases] of factCases){
  const expected=byTitle.get(title);
  assert.ok(expected,'Official fact missing: '+title);
  let localTotal=0,localCorrect=0;
  const localFailures=[];
  for(const base of bases){
    for(const prefix of prefixes)for(const suffix of suffixes)for(const changeCase of casing){
      const q=changeCase(prefix+base+suffix);
      const result=mainioPublicFactAnswer(rows,q,'fi');
      generated++;localTotal++;
      if(result?.sourceIds?.includes(expected.id)&&!result.handoff){
        correct++;localCorrect++;
      }else if(localFailures.length<12){
        localFailures.push({q,intent:result?.intent||null,sourceIds:result?.sourceIds||[],handoff:result?.handoff??null});
      }
    }
  }
  categoryStats.push({title,total:localTotal,correct:localCorrect,missed:localTotal-localCorrect,samples:localFailures});
}

const boxContexts=[
 'Mistä pakettiauto noudetaan ja palautetaan?','Voinko vuokrata pakettiauton?','Mitä paku maksaa?',
 'Onnistuuko muutto Turusta Helsinkiin?','Hoidatteko muutot?','Tarvitsen muuttoapua',
 'Muutto ensi viikolla','Saako pakettiauton vuokralle?','Miten pakettiauto palautetaan?',
 'Voitteko auttaa muutossa?','Muuttopalvelu Turku Helsinki','Paljonko muutto maksaa?'
];
const boxFollowups=['entä laatikot','entäs laatikot','entä ne laatikot','mites laatikot','mites ne laatikot','ja laatikot','sitten laatikot','entä muuttolaatikot','ja muuttolaatikot','mitä muuttolaatikoista','muuttolaatikoiden vuokra','laatikot vuokralle'];
let followupTotal=0,followupCorrect=0;
const followupFailures=[];
for(const previous of boxContexts)for(const q0 of boxFollowups){
  for(const prefix of ['','Hei, ','No entä ','Ja vielä '])for(const suffix of ['','?',' kiitos',' sitten?']){
    const q=prefix+q0+suffix;
    followupTotal++;
    const intent=interpretMainioLocalIntent(q,previous);
    const reply=mainioPublicFactAnswer(rows,q,'fi',previous);
    const action=mainioSemanticActions(intent,'fi',q,previous);
    const ok=intent?.intent==='box_rental'&&reply&&!reply.handoff&&
      reply.answer.includes('0,20 euroa laatikolta')&&
      action.some(x=>x.url==='https://www.mainiomuuttopalvelu.fi/muuttolaatikot-ja-tarvikkeet');
    if(ok)followupCorrect++;
    else if(followupFailures.length<120)followupFailures.push({previous,q,intent:intent?.intent||null,answer:reply?.answer||null,actions:action});
  }
}

const routeTowns=[
 ['Turku','Turusta','Turkuun'],['Helsinki','Helsingistä','Helsinkiin'],['Tampere','Tampereelta','Tampereelle'],
 ['Oulu','Oulusta','Ouluun'],['Pori','Porista','Poriin'],['Rovaniemi','Rovaniemeltä','Rovaniemelle'],
 ['Kuopio','Kuopiosta','Kuopioon'],['Jyväskylä','Jyväskylästä','Jyväskylään'],
 ['Joensuu','Joensuusta','Joensuuhun'],['Vaasa','Vaasasta','Vaasaan'],['Lahti','Lahdesta','Lahteen'],
 ['Kaarina','Kaarinasta','Kaarinaan'],['Raisio','Raisiosta','Raisioon'],['Naantali','Naantalista','Naantaliin'],
 ['Salo','Salosta','Saloon'],['Espoo','Espoosta','Espooseen'],['Vantaa','Vantaalta','Vantaalle'],
 ['Porvoo','Porvoosta','Porvooseen'],['Mikkeli','Mikkelistä','Mikkeliin'],['Kouvola','Kouvolasta','Kouvolaan']
];
let routeTotal=0,routeCorrect=0;
const routeFailures=[];
for(const origin of routeTowns)for(const destination of routeTowns){
  const variants=[
    'Onnistuuko muutto '+origin[1]+' '+destination[2]+'?',
    'Ois muutto '+origin[1]+' '+destination[2]+', onnistuuko?',
    'Voitteko muuttaa tavarat '+origin[1]+' '+destination[2]+'?',
    'Muutto '+origin[1]+' '+destination[2]+' onnistuisiko?'
  ];
  for(const q of variants){
    routeTotal++;
    const detected=mainioMovingRouteIntent(q);
    const classified=interpretMainioLocalIntent(q);
    const action=mainioInquiryActions(q);
    const ok=detected&&classified?.intent==='moving_route'&&action.some(x=>x.url==='https://tarjous.mainiomuuttopalvelu.fi/');
    if(ok)routeCorrect++;
    else if(routeFailures.length<100)routeFailures.push({q,detected,intent:classified?.intent||null,actions:action});
  }
}

const negativeContexts=[
 'Mikä on yrityksenne sähköpostiosoite?','Missä yrityksenne sijaitsee?',
 'Paljonko auton huolto maksaa?','Miten pahvilaatikot kierrätetään?',
 'Voinko ostaa pahvilaatikoita?','Mitä laatikoita myytte?',
 'Onko teillä Netflixiä?','Mitä kello on?'
];
let negativeTotal=0,negativeCorrect=0;
const negativeFailures=[];
for(const previous of negativeContexts)for(const q of boxFollowups.slice(0,10)){
  negativeTotal++;
  const detected=mainioBoxRentalFollowupIntent(q,previous);
  const classified=interpretMainioLocalIntent(q,previous);
  const ok=!detected&&classified?.intent!=='box_rental';
  if(ok)negativeCorrect++;else if(negativeFailures.length<80)negativeFailures.push({previous,q,detected,intent:classified?.intent||null});
}

const pronounFollowups=[
  ['Paljonko ne maksaa?','0,20 euroa laatikolta'],
  ['Entä niiden hinta?','0,20 euroa laatikolta'],
  ['Saako ne kotiin?','Toimitamme muuttolaatikot'],
  ['Miten ne palautetaan?','noudamme ne pois'],
  ['Minkä kokoisia ne ovat?','600 × 400 × 300 mm'],
  ['Montako niitä tarvitaan?','0,8'],
  ['Milloin ne tuodaan?','maanantai, keskiviikko ja perjantai'],
  ['Entä toimitusmaksu?','25 euroa ajokerralta'],
];
test('Mainio remembers boxes across pronoun-only follow-ups and selects the correct fact',()=>{
  const previous='Haluaisin vuokrata muuttolaatikoita.';
  for(const [q,expected] of pronounFollowups){
    assert.equal(mainioBoxRentalFollowupIntent(q,previous),true,q);
    const classification=interpretMainioLocalIntent(q,previous);
    assert.equal(classification?.intent,'box_rental',q);
    const reply=mainioPublicFactAnswer(rows,q,'fi',previous);
    assert.ok(reply&&!reply.handoff,q);
    assert.ok(reply.answer.toLowerCase().includes(expected.toLowerCase()),q+' => '+reply.answer);
    const actions=mainioSemanticActions(classification,'fi',q,previous);
    assert.ok(actions.some(x=>x.url==='https://www.mainiomuuttopalvelu.fi/muuttolaatikot-ja-tarvikkeet'),q);
  }
});
test('Mainio recognizes box follow-ups after a van price question but not after cardboard recycling',()=>{
  const vanPrevious='Mitä paku maksaa?';
  const boxReply=mainioPublicFactAnswer(rows,'entä laatikot','fi',vanPrevious);
  assert.equal(interpretMainioLocalIntent('entä laatikot',vanPrevious)?.intent,'box_rental');
  assert.match(boxReply?.answer||'',/0,20 euroa laatikolta/);
  for(const previous of [
    'Miten pahvilaatikot kierrätetään?',
    'Voinko ostaa pahvilaatikoita?',
    'Mitä laatikoita myytte?',
    'Mikä on yrityksenne sähköpostiosoite?'
  ]){
    assert.equal(mainioBoxRentalFollowupIntent('entä laatikot',previous),false,previous);
    assert.equal(interpretMainioLocalIntent('entä laatikot',previous),null,previous);
  }
});

test('20,000+ generated Mainio question variants: report factual coverage, contextual follow-ups, routes and false positives',()=>{
  const total=generated+followupTotal+routeTotal+negativeTotal;
  console.log('[MAINIO_20K_AUDIT]',JSON.stringify({
    total,generated,correct,accuracy:Number((correct/generated*100).toFixed(2)),
    followupTotal,followupCorrect,followupAccuracy:Number((followupCorrect/followupTotal*100).toFixed(2)),
    routeTotal,routeCorrect,routeAccuracy:Number((routeCorrect/routeTotal*100).toFixed(2)),
    negativeTotal,negativeCorrect,negativeAccuracy:Number((negativeCorrect/negativeTotal*100).toFixed(2)),
    categoryStats,followupFailures,routeFailures,negativeFailures
  }));
  assert.ok(total>=20000,'Expected at least 20,000 generated cases, got '+total);
  assert.ok(generated>=20000,'Expected at least 20,000 factual variants, got '+generated);
  assert.ok(correct>0);
});
