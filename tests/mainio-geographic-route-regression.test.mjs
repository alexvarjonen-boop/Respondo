import test from 'node:test';
import assert from 'node:assert/strict';
import {mainioMovingRouteIntent,mainioRecognizedDomesticRoute,mainioInquiryActions} from '../mainio-moving-intake.mjs';
import {interpretMainioLocalIntent} from '../mainio-semantic-intent.mjs';
import {mainioVerifiedMovingRouteReply,mainioSemanticGroundedReply} from '../server.mjs';

const source={
  id:'mainio-approved-moving-area',
  category:'Muuttopalvelut',
  title:'Muuton toimialue',
  source_type:'website',
  source_url:'https://www.mainiomuuttopalvelu.fi/avaimet-kateen-muutto-vai-omatoiminen-muutto-vaihtoehdot-vertailussa',
  answer:'Mainio palvelee Turussa ja Varsinais-Suomessa, esimerkiksi Raisiossa, Kaarinassa, Liedossa, Maskussa ja Naantalissa. Muutot voivat suuntautua myös muualle Suomeen; tarkka reitti ja toteutus sovitaan erikseen.',
};
const international={
  id:'mainio-approved-international',
  category:'Muuttopalvelut',
  title:'Ulkomaanmuutto',
  source_type:'website',
  source_url:source.source_url,
  answer:'Mainion verkkosivujen mukaan muuttoja voi suunnitella myös ulkomaille tarpeen vaatiessa.',
};

test('Mainio routes from Pori to Turku and Rovaniemi to Turku use verified nationwide coverage',()=>{
  for(const question of [
    'onnistuuko muutto porista turkuun',
    'Onnistuuko muutto Rovaniemeltä Turkuun?',
    'voiko muuttaa Porista Turkuun',
    'ois muutto porista turkuun',
  ]){
    assert.equal(mainioMovingRouteIntent(question),true,question);
    const intent=interpretMainioLocalIntent(question);
    assert.equal(intent?.intent,'moving_route',question);
    // The free local classifier intentionally leaves the location scope
    // unknown; that must not throw away the already verified nationwide area.
    assert.equal(intent.route_scope,'unknown',question);
    assert.equal(mainioRecognizedDomesticRoute(question),true,question);
    // A route with two conservatively recognized Finnish cities uses the
    // direct verified answer before the semantic scope-unknown fallback.
    const result=mainioVerifiedMovingRouteReply([source],question,'fi');
    assert.ok(result,question);
    assert.equal(result.handoff,false);
    assert.deepEqual(result.sourceIds,[source.id]);
    assert.match(result.answer,/Turussa ja Varsinais-Suomessa/);
    assert.match(result.answer,/myös muualle Suomeen/);
    assert.match(result.answer,/tarkistamme erikseen/i);
    assert.equal(mainioInquiryActions(question,'fi')[0]?.mode,'mainio_move_form');
  }
});

test('direct verified domestic route answers in three languages include geographic coverage and safeguards',()=>{
  for(const lang of ['fi','sv','en']){
    const result=mainioVerifiedMovingRouteReply([source],'onnistuuko muutto porista turkuun',lang);
    assert.equal(result?.handoff,false,lang);
    assert.deepEqual(result?.sourceIds,[source.id],lang);
    assert.match(result.answer,/price|pris|hinnan/i);
    assert.match(result.answer,/date|datum|muuttopäivän/i);
    assert.doesNotMatch(result.answer,/confirmed booking|vahvistettu tilaus|bokningen är bekräftad/i);
  }
});

test('unknown route scope with missing nationwide proof does not invent coverage',()=>{
  const result=mainioSemanticGroundedReply([],{
    intent:'moving_route',route_scope:'unknown',confidence:96
  },'fi');
  assert.ok(result);
  assert.deepEqual(result.sourceIds,[]);
  assert.doesNotMatch(result.answer,/myös muualle Suomeen/);
});

test('explicitly international routes use international evidence, never domestic coverage as proof',()=>{
  const result=mainioSemanticGroundedReply([source,international],{
    intent:'moving_route',route_scope:'international',confidence:96
  },'fi');
  assert.ok(result);
  assert.deepEqual(result.sourceIds,[international.id]);
  assert.match(result.answer,/ulkomaanmuutosta/);
  assert.doesNotMatch(result.answer,/Turussa ja Varsinais-Suomessa/);
});
