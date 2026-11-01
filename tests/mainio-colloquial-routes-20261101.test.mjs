import test from 'node:test';
import assert from 'node:assert/strict';
import {mainioMovingRouteIntent,mainioInquiryActions} from '../mainio-moving-intake.mjs';
import {mainioVerifiedMovingRouteReply} from '../server.mjs';

const area={
  id:'approved-mainio-area',category:'Muuttopalvelut',
  title:'Muuton toimialue',
  source_type:'website',
  source_url:'https://www.mainiomuuttopalvelu.fi/avaimet-kateen-muutto-vai-omatoiminen-muutto-vaihtoehdot-vertailussa',
  answer:'Mainio palvelee Turussa ja Varsinais-Suomessa, esimerkiksi Raisiossa, Kaarinassa, Liedossa, Maskussa ja Naantalissa. Muutot voivat suuntautua myös muualle Suomeen; tarkka reitti ja toteutus sovitaan erikseen.'
};
const contact={
  id:'approved-mainio-contact',category:'Yritystiedot',
  title:'Mainio Muuttopalvelu yhteystiedot',
  source_type:'website',source_url:'https://www.mainiomuuttopalvelu.fi/yhteystiedot',
  answer:'Mainio Muuttopalvelun puhelinnumero on 044 566 5937. Toimipaikka on Turussa.'
};

const examples=[
  'onnistuuko muutto rovaniemeltä turkuun',
  'Onnistusko muutto Rovaniemeltä Turkuun?',
  'Ois muutto Oulusta Helsinkiin, mitenhän sen sais hoidettua?',
  'Pitäis muuttaa Tampereelta Kuopioon, voitteko auttaa?',
  'Teettekö muuttoja Joensuusta Turkuun?',
  'Mummolla olisi muutto Rovaniemeltä, Turkuun.',
  'Can you arrange a moving service from Rovaniemi to Turku?',
  'Kan ni ordna flytt från Rovaniemi till Åbo?',
];
for(const question of examples){
  test('colloquial route inquiry uses Mainio approved national service area: '+question,()=>{
    assert.equal(mainioMovingRouteIntent(question),true);
    const result=mainioVerifiedMovingRouteReply([contact,area],question,'fi');
    assert.ok(result);
    assert.equal(result.handoff,false);
    assert.deepEqual(result.sourceIds,[area.id]);
    assert.match(result.answer,/myös muualle Suomeen/);
    assert.match(result.answer,/Mainio tarkistaa erikseen/);
    assert.doesNotMatch(result.answer,/vahvistettu tilaus|onnistuu varmasti|044 566|tavarakatu/i);
    assert.ok(mainioInquiryActions(question,'fi').some(action=>action.mode==='mainio_move_form'));
  });
}

for(const question of [
  'missä päin toimitte',
  'Onnistuuko muutto hissittömästä talosta?',
  'Milloin teillä on auki?',
  'Voinko vuokrata pakettiauton Oulusta Helsinkiin?',
  'Onnistuuko muuttolaatikoiden vuokraus Rovaniemeltä Turkuun?'
]){
  test('non-route question does not trigger national route claims: '+question,()=>{
    assert.equal(mainioMovingRouteIntent(question),false);
    assert.equal(mainioVerifiedMovingRouteReply([area,contact],question,'fi'),null);
  });
}

test('national coverage not verified means no national service claim',()=>{
  const localOnly={...area,answer:'Palvelemme ainoastaan Turussa ja Kaarinassa.'};
  assert.equal(mainioVerifiedMovingRouteReply([localOnly,contact],examples[0],'fi'),null);
  assert.equal(mainioVerifiedMovingRouteReply([contact],examples[0],'fi'),null);
});

test('same grounded route reply is available in Finnish, Swedish and English without confirmed price/date',()=>{
  for(const [lang,pattern] of [['fi',/Mainio tarkistaa/],['sv',/Mainio bekräftar/],['en',/Mainio must confirm/]]){
    const reply=mainioVerifiedMovingRouteReply([area],examples[0],lang);
    assert.match(reply.answer,pattern);
    assert.deepEqual(reply.sourceIds,[area.id]);
  }
});
