import test from 'node:test';
import assert from 'node:assert/strict';
import {mainioPublicFactAnswer} from '../mainio-public-fact-answer.mjs';
import {mainioPublicKnowledgeWithOfficialFacts} from '../mainio-official-public-facts.mjs';
import {
  mainioMovingIntakeQuestion,mainioMovingOrderIntent,mainioInquiryActions,
  mainioMovingRouteIntent,mainioRecognizedDomesticRoute,mainioMovingAccessQuestion,
  mainioMovingConsentQuestion,mainioMovingConsentReply,mainioBookingStatusQuestion,
  mainioBoxRentalFollowupIntent
} from '../mainio-moving-intake.mjs';
import {interpretMainioLocalIntent,mainioSemanticActions} from '../mainio-semantic-intent.mjs';
import {mainioCustomerVoice} from '../mainio-customer-voice.mjs';

const rows=mainioPublicKnowledgeWithOfficialFacts([]);
function answer(question,previous=''){
  const reply=mainioPublicFactAnswer(rows,question,'fi',previous);
  assert.ok(reply&&!reply.handoff,question);
  assert.equal(reply.sourceIds.length,1,question);
  assert.ok(reply.selected[0].source_url.startsWith('https://www.mainiomuuttopalvelu.fi/'));
  return reply.answer;
}

test('exact Firecrawl live demo 58 m² moving quote uses official move pricing, never estate clearing page',()=>{
  const a=answer('Mitä 58 neliön muutto maksais?');
  assert.match(a,/muuton lopullinen hinta riippuu/i);
  assert.match(a,/tarkka tarjous vahvistetaan erikseen/i);
  assert.doesNotMatch(a,/asunnon tyhjennys voi tulla/);
  assert.match(mainioInquiryActions('Mitä 58 neliön muutto maksais?')[1].url,/tarjous\.mainiomuuttopalvelu\.fi/);
});
test('lift-free third floor move receives truthful planning advice with a quote action',()=>{
  const q='Voisko muuttaa kolmannesta kerroksesta ilman hissiä?';
  const a=answer(q);
  assert.match(a,/hissit/i);
  assert.match(a,/tarkistamme toteutuksen/i);
  assert.equal(mainioMovingAccessQuestion(q),true);
  assert.equal(mainioInquiryActions(q)[0].mode,'mainio_move_form');
  assert.doesNotMatch(a,/varastoon kapea käytävä/);
});
test('packing and carrying help is verified directly on Mainio services page',()=>{
  const a=answer('Onks teillä pakkaus- ja kantoapua?');
  assert.match(a,/kyllä/i);
  assert.match(a,/pakkaamisella/i);
});
test('13 cubic meter van question cannot retrieve a water-meter moving checklist',()=>{
  const a=answer('Saako pakuun 13 kuutiota tavaraa?');
  assert.match(a,/13 m³/);
  assert.match(a,/mitoista ja kuormauksesta/i);
  assert.doesNotMatch(a,/vesilaitokselle|vesimittarien/i);
});
test('colloquial moving-details request is recognized and directed to the consent-gated quote',()=>{
  const q='Voitteks te kerää ne muuttotiedot tässä keskustelussa?';
  assert.equal(mainioMovingIntakeQuestion(q),true);
  assert.equal(mainioMovingOrderIntent(q),true);
  assert.equal(interpretMainioLocalIntent(q)?.intent,'moving_quote');
  assert.equal(mainioInquiryActions(q)[0].mode,'mainio_move_form');
});
test('heavy Finnish place-name typos trigger a safe route quote, not assumed domestic coverage',()=>{
  const q='Onnistuisko muutto Rovaniämelt Turkkusee?';
  assert.equal(mainioMovingRouteIntent(q),true);
  assert.equal(mainioRecognizedDomesticRoute(q),false);
  assert.equal(interpretMainioLocalIntent(q)?.intent,'moving_route');
  assert.equal(mainioInquiryActions(q)[0].mode,'mainio_move_form');
});
test('moving date cannot be confirmed in a static-source FAQ chatbot',()=>{
  assert.equal(mainioBookingStatusQuestion('Tarvitsisin muuton viikon päästä, voitteko vahvistaa sen tässä?'),true);
});
test('consent refusals are answered from the actual app workflow, not an unrelated FAQ',()=>{
  const q='Voitko kerätä tietoni ja lähettää ne Mainiolle ilman lupaa?';
  assert.equal(mainioMovingConsentQuestion(q),true);
  for(const [lang,rx] of [['fi',/vasta, kun hyväksyt/],['sv',/först när du/],['en',/only after you/]]){
    const reply=mainioMovingConsentReply(lang);
    assert.match(reply.answer,rx);
    assert.deepEqual(reply.actions,[]);
  }
  assert.equal(mainioMovingConsentQuestion('Paljonko muuttolaatikot maksaa?'),false);
});
test('live moving-day question uses the official FAQ rather than insurance advice',()=>{
  const a=answer('Miten muuttopäivä yleensä toimii?');
  assert.match(a,/kattavat muutto-ohjeet/);
  assert.doesNotMatch(a,/vakuutusyhtiöt|osoitteesi/i);
});
test('plain car rental 5-hour price matches van tariffs rather than deductible',()=>{
  for(const q of ['Mitä maksaa auton vuokra 5 tunniksi?','Paljonko auton vuokra on 5 tunniksi?']){
    const a=answer(q);
    assert.match(a,/13 m³ pakettiauto 70 euroa/);
    assert.match(a,/17 m³ pakettiauto 90 euroa/);
    assert.match(a,/20 m³ pakettiauto 110 euroa/);
    assert.doesNotMatch(a,/omavastuu|1300 euroa/i);
  }
});
test('moving duration question uses official duration factors',()=>{
  const a=answer('Kuinka kauan muutto kestää?');
  assert.match(a,/tavaramäärä/);
  assert.match(a,/hissit/);
  assert.doesNotMatch(a,/minuutissa varmasti/i);
});
test('short box follow-up after a Mainio van pickup question uses the verified box rental price',()=>{
  const previous='Mistä pakettiauto noudetaan ja palautetaan?';
  const q='entä laatikot';
  assert.equal(mainioBoxRentalFollowupIntent(q,previous),true);
  assert.equal(interpretMainioLocalIntent(q,previous)?.intent,'box_rental');
  const a=answer(q,previous);
  assert.match(a,/0,20 euroa laatikolta vuorokaudessa/i);
  assert.match(a,/minimilaskutus 10 euroa/i);
  const actions=mainioSemanticActions({intent:'box_rental',confidence:96},'fi',q,previous);
  assert.equal(actions[0].url,'https://www.mainiomuuttopalvelu.fi/muuttolaatikot-ja-tarvikkeet');
});
test('short box follow-up works after a moving-service question but not unrelated context',()=>{
  assert.equal(mainioBoxRentalFollowupIntent('entä laatikot','Onnistuuko muutto Turusta Helsinkiin?'),true);
  assert.equal(interpretMainioLocalIntent('entä laatikot','Onnistuuko muutto Turusta Helsinkiin?')?.intent,'box_rental');
  assert.equal(mainioBoxRentalFollowupIntent('entä laatikot','Mikä on yrityksenne sähköpostiosoite?'),false);
  assert.equal(interpretMainioLocalIntent('entä laatikot','Mikä on yrityksenne sähköpostiosoite?'),null);
});
test('first-person Mainio reply keeps both verbs correctly inflected',()=>{
  const original='Mainio tarkistaa tarjouspyynnön ja vahvistaa hinnan sekä muuttopäivän erikseen.';
  const transformed=mainioCustomerVoice(original,'fi');
  assert.equal(transformed,'Tarkistamme tarjouspyynnön ja vahvistamme hinnan sekä muuttopäivän erikseen.');
});
