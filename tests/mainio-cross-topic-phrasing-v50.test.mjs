// A second, independent real-wording corpus. Each named customer topic must
// resolve to its OWN official Mainio source row rather than a nearby FAQ.
// Matrix entries are intentionally hand-written colloquial formulations,
// not a template repeated thousands of times.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mainioPublicFactAnswer} from '../mainio-public-fact-answer.mjs';
import {mainioOfficialPublicFacts} from '../mainio-official-public-facts.mjs';
import {mainioBusinessMoveProcessQuestion} from '../mainio-business-move-process.mjs';

const rows=mainioOfficialPublicFacts();
const CASES=[
  {title:'Muuttolaatikoiden hinta',phrases:[
    'Mitä muuttolaatikoiden vuokra maksaa?',
    'Mites ne muuttolaatikot, mitä maksaa?',
    'Paljonko on laatikon vuokra?',
    'Kuinka paljon laatikot maksaa?',
    'Mikä laatikoiden vuokrahinta on?',
  ]},
  {title:'Laatikoiden kuljetusmaksu',phrases:[
    'Mitä maksaa laatikoiden toimitus?',
    'Paljonko laatikoiden kotiinkuljetus maksaa?',
    'Mikä on laatikoiden kuljetusmaksu?',
    'Onko laatikoiden toimitus ilmainen?',
    'Miten kallis on laatikoiden kuljetus?',
  ]},
  {title:'Muuttolaatikoiden mitat',phrases:[
    'Mitkä ovat muuttolaatikoiden mitat?',
    'Minkä kokoisia muuttolaatikot on?',
    'Miten isoja teidän laatikot on?',
    'Millainen koko muuttolaatikoissa on?',
    'Paljonko laatikoilla on tilavuutta?',
  ]},
  {title:'Muuttolaatikkojen noutopäivät',phrases:[
    'Milloin laatikot toimitetaan?',
    'Milloin muuttolaatikot noudetaan?',
    'Minä päivänä laatikot haetaan?',
    'Koska noudatte laatikot?',
    'Mihin aikaan laatikot toimitetaan?',
  ]},
  {title:'Laatikoiden toimitus ja palautus',phrases:[
    'Tuotteko laatikot kotiin?',
    'Noudatteko vuokralaatikot myös pois?',
    'Kuinka palautan muuttolaatikot?',
    'Saako laatikot toimitettuna?',
    'Miten muuttolaatikot palautetaan?',
  ]},
  {title:'Pakettiautojen omavastuu',phrases:[
    'Paljonko pakun omavastuu on?',
    'Mikä on pakettiauton omavastuu?',
    'Millainen omavastuu vuokrapakussa on?',
    'Miten paljon pakettiauton omavastuu on?',
  ]},
  {title:'Pakettiautojen ajokortti',phrases:[
    'Saako pakulla ajaa B-kortilla?',
    'Tarviiko pakun vuokraan ajokortin?',
    'Riittääkö tavallinen ajokortti pakettiautolle?',
    'Millainen ajokortti tarvitaan pakun ajoon?',
  ]},
  {title:'Pakettiautojen yövuokraus',phrases:[
    'Voiko vuokrapakun pitää yön yli?',
    'Saanko pakettiauton yöksi?',
    'Pystyykö pakun vuokraamaan yön yli?',
    'Onnistuuko pakettiauton yövuokra?',
  ]},
  {title:'Pakettiauton nouto- ja palautusosoite',phrases:[
    'Mistä pakun saa hakea?',
    'Mihin paku palautetaan?',
    'Missä pakettiauton nouto on?',
    'Mistä vuokra-auto haetaan?',
    'Missä osoitteessa noudan pakettiauton?',
  ]},
  {title:'Paljonko pakettiauton 3 tunnin vuokra maksaa?',phrases:[
    'Paljonko pakun kolmen tunnin vuokra maksaa?',
    'Mitä 3h pakettiauto maksaa?',
    'Mikä on kolmen tunnin pakun hinta?',
    'Paljonko maksaa pakettiauto kolmeks tunniks?',
  ]},
  {title:'Pakettiauton 5 tunnin vuokrahinnat',phrases:[
    'Mikä on viiden tunnin pakun vuokrahinta?',
    'Mitä maksaa paku 5h?',
    'Paljonko pakettiauton vuokra maksaa viideksi tunniksi?',
    'Paljonko viisi tuntia pakettiautolla maksaa?',
  ]},
  {title:'Pakettiauton vuorokausivuokra',phrases:[
    'Mitä maksaa paku vuorokaudeksi?',
    'Pakettiauton vuorokausivuokran hinta?',
    'Paljonko pakun vuokra maksaa päiväksi?',
    'Mikä on 24 h pakettiauton vuokrahinta?',
  ]},
  {title:'Pakettiauton tavaratilan koko',phrases:[
    'Miten iso pakettiauton tavaratila on?',
    'Paljonko pakun tavaratilaan mahtuu?',
    'Minkä kokoisia pakettiautoja teillä on?',
    'Minkä kokoiset pakut on vuokrattavissa?',
  ]},
  {title:'Muuton kesto',phrases:[
    'Kauanko muutto kestää?',
    'Kuinka monta tuntia muutto kestää?',
    'Miten pitkään muutto voi kestää?',
    'Kestääkö muutto pitkään?',
    'Mikä on muuton kesto?',
  ]},
  {title:'Muuton hinta',phrases:[
    'Paljonko muutto maksaa?',
    'Mistä muuton hinta koostuu?',
    'Mitä muutto maksais?',
    'Miten paljon muuttopalvelu maksaa?',
    'Mitkä asiat vaikuttaa muuton hintaan?',
  ]},
  {title:'Välivarastointi ennen muuttoa',phrases:[
    'Voitteko varastoida tavarat muuton ajaksi?',
    'Tarjoatteko välivarastointia?',
    'Onko mahdollista säilyttää kamat varastossa ennen muuttoa?',
    'Saako teiltä varastointia muuton ajaksi?',
  ]},
  {title:'Kierrätyspalvelu',phrases:[
    'Noudatteko tavarat kierrätykseen?',
    'Mitä kaikkea kierrätätte?',
    'Onko teillä kierrätyspalvelua?',
    'Voitteko hakea tavarat kierrätettäväksi?',
  ]},
  {title:'Kalusteiden purkaminen ja kokoaminen',phrases:[
    'Purkavatko muuttomiehet kaapit?',
    'Voitteko koota sohvan?',
    'Teettekö kalusteasennuksia?',
    'Hoituuko huonekalujen purkaminen?',
  ]},
  {title:'Pakkaus- ja kantoapu',phrases:[
    'Saako teiltä kantoapua?',
    'Voitteko auttaa pakkaamisessa?',
    'Hoidatteko tavaroiden kantamisen?',
    'Tarjoatteko pakkausapua?',
  ]},
  {title:'Hissittömän muuton suunnittelu',phrases:[
    'Miten muutto onnistuu ilman hissiä?',
    'Onko hissitön kerrostalomuutto ongelma?',
    'Mitä jos muutossa ei ole hissiä?',
    'Miten muutto sujuu hissittömään kerrostaloon?',
  ]},
  {title:'Täyden palvelun avaimet käteen -muutto',phrases:[
    'Voitteko hoitaa muuton alusta loppuun?',
    'Pakkaatteko kaikki tavarat muutossa?',
    'Onko avaimet käteen muutto mahdollinen?',
    'Voitteko hoitaa koko muuton ja pakkaamisen?',
  ]},
];
test('realistic customer phrasings across 21 distinct moving-service topics stay source-locked',()=>{
  const failed=[];let checked=0,topics=0;
  for(const {title,phrases} of CASES){
    const official=rows.find(r=>r.title===title);
    assert.ok(official,'Missing official evidence for '+title);
    topics++;
    for(const phrase of phrases)for(const prefix of ['', 'Hei, ', 'Moi, ', 'Kysymys: ']){
      checked++;
      const q=prefix+phrase;
      try{
        assert.equal(mainioBusinessMoveProcessQuestion(q),false,'WRONG_PROCESS '+q);
        const reply=mainioPublicFactAnswer(rows,q,'fi');
        assert.ok(reply&&!reply.handoff,'NO_ANSWER '+q);
        assert.deepEqual(reply.sourceIds,[official.id],'WRONG_SOURCE '+title+' '+q);
        assert.ok(reply.answer.trim().length>=16,'EMPTY '+q);
        assert.doesNotMatch(reply.answer,/yritysmuutto etenee n[aä]in/i);
      }catch(e){failed.push({topic:title,question:q,reason:e.message.slice(0,260)});}
    }
  }
  assert.ok(topics>=20);
  assert.ok(checked>=300);
  assert.equal(failed.length,0,JSON.stringify({checked,topics,failed:failed.length,samples:failed.slice(0,55)},null,2));
});
