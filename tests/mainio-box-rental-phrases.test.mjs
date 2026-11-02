import test from 'node:test';
import assert from 'node:assert/strict';
import {mainioBoxRentalIntent,mainioInquiryKind,mainioInquiryActions,mainioMovingOrderIntent} from '../mainio-moving-intake.mjs';
import {interpretMainioLocalIntent,mainioSemanticActions} from '../mainio-semantic-intent.mjs';
import {mainioSemanticGroundedReply} from '../server.mjs';

const approvedBox={
 id:'verified-mainio-boxes',category:'Muuttolaatikot',
 title:'Muuttolaatikoiden hinta',source_type:'website',
 source_url:'https://www.mainiomuuttopalvelu.fi/muuttolaatikot-ja-tarvikkeet',
 answer:'Mainion muuttolaatikoiden hinnasto: vuokra 0,20 euroa laatikolta vuorokaudessa ja minimilaskutus 10 euroa. Vuokraus- ja toimitusehdot tarkistetaan yritykseltä.'
};

const boxQuestions=[
 'saako teiltä vuokrattua laatikot',
 'Saako teiltä vuokrattua laatikoita?',
 'Voiko teiltä vuokrata laatikoita?',
 'saaks teilt laatikoita vuokralle',
 'Vuokraatteko laatikoita?',
 'Haluaisin lainata muuttolaatikoita',
 'Onko teillä muuttolaatikoita vuokrattavana?',
 'Can I rent boxes from you?',
 'Can I rent moving boxes?',
 'Kan jag hyra lådor av er?',
 'Hyr ni flyttlådor?'
];

test('Mainio box rental recognises colloquial FI, SV and EN phrasing rather than requiring muuttolaatikot',()=>{
 for(const q of boxQuestions){
  assert.equal(mainioBoxRentalIntent(q),true,q);
  assert.equal(mainioInquiryKind(q),'boxes',q);
  assert.equal(mainioMovingOrderIntent(q),false,q);
  const intent=interpretMainioLocalIntent(q);
  assert.equal(intent?.intent,'box_rental',q);
  assert.ok(intent.confidence>=82,q);
  const links=mainioSemanticActions(intent,'fi');
  assert.equal(links.length,1,q);
  assert.equal(links[0].url,'https://www.mainiomuuttopalvelu.fi/muuttolaatikot-ja-tarvikkeet',q);
 }
});

test('Mainio verified box rental answer is concise, first-party and grounded in company own source',()=>{
 for(const [lang,required] of [
  ['fi',/^Kyllä, meiltä voi vuokrata muuttolaatikoita!/],
  ['sv',/^Ja, du kan hyra flyttlådor av oss!/],
  ['en',/^Yes, you can rent moving boxes from us!/]
 ]){
  const reply=mainioSemanticGroundedReply([approvedBox],
    {intent:'box_rental',confidence:95,route_scope:'unknown'},lang);
  assert.ok(reply);
  assert.equal(reply.handoff,false);
  assert.deepEqual(reply.sourceIds,[approvedBox.id]);
  assert.match(reply.answer,required);
  assert.doesNotMatch(reply.answer,/Mainio (?:voi|vahvistaa|tarjoaa)|price|0,20|10 euroa/i);
 }
});

test('box rental must not swallow purchase, packaging, pricing or unrelated moving questions',()=>{
 for(const q of [
  'Myyttekö pahvilaatikoita?',
  'Miten pakkaan tavarat laatikkoon?',
  'Onko teillä laatikoita kierrätykseen?',
  'Muuttaako yritys aukioloaikoja?',
  'Kuinka monta laatikkoa tarvitsen?',
 ]){
  assert.equal(mainioBoxRentalIntent(q),false,q);
 }
 assert.deepEqual(mainioInquiryActions('Mitä pakettiauton vuokra maksaa?','fi')[0]?.url,
 'https://www.mainiomuuttopalvelu.fi/pakettiautojen-vuokraus');
});

test('unsupported or unapproved scraped box facts cannot create source-backed yes',()=>{
 const altered={...approvedBox,id:'unapproved',approved:false};
 const reply=mainioSemanticGroundedReply([altered],{intent:'box_rental'},'fi');
 assert.ok(reply);
 assert.deepEqual(reply.sourceIds,[]);
 assert.doesNotMatch(reply.answer,/^Kyllä,/);
});
