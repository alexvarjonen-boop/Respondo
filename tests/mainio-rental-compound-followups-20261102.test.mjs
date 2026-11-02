import test from 'node:test';
import assert from 'node:assert/strict';
import {mainioPublicFactAnswer} from '../mainio-public-fact-answer.mjs';
import {mainioPublicKnowledgeWithOfficialFacts} from '../mainio-official-public-facts.mjs';
import {mainioInquiryActions} from '../mainio-moving-intake.mjs';
import {mainioSemanticActions} from '../mainio-semantic-intent.mjs';

const rows=mainioPublicKnowledgeWithOfficialFacts([]);
const firstQuestion='Voinko vuokrata pakettiauton kolmeksi tunniksi ja muuttolaatikoita?';

test('one compound question answers both van and moving-box rental from separate official facts',()=>{
 const reply=mainioPublicFactAnswer(rows,firstQuestion,'fi');
 assert.ok(reply&&!reply.handoff);
 assert.match(reply.answer,/Kyllä, molempia voi vuokrata/);
 assert.match(reply.answer,/13 m³ pakettiauto 50 euroa/);
 assert.match(reply.answer,/17 m³ pakettiauto 70 euroa/);
 assert.match(reply.answer,/100 km/);
 assert.match(reply.answer,/0,20 euroa laatikolta vuorokaudessa/);
 assert.match(reply.answer,/minimilaskutus 10 euroa/i);
 assert.equal(reply.sourceIds.length,2);
 assert.equal(reply.selected.length,2);
 assert.ok(reply.sourceIds.includes('demo-mainio-official-13'));
 assert.ok(reply.sourceIds.includes('demo-mainio-official-02'));
});

test('a short follow-up resolves the van and inherits only its requested three-hour duration',()=>{
 const reply=mainioPublicFactAnswer(rows,'Entä se pakettiauto?','fi',firstQuestion);
 assert.ok(reply&&!reply.handoff);
 assert.match(reply.answer,/13 m³ pakettiauto 50 euroa/);
 assert.match(reply.answer,/17 m³ pakettiauto 70 euroa/);
 assert.doesNotMatch(reply.answer,/muuttolaatikoiden vuokra/);
 assert.deepEqual(reply.sourceIds,['demo-mainio-official-13']);
});

test('a short van follow-up preserves a different previously asked duration',()=>{
 const previous='Mitä maksaa pakettiauton vuokra viideksi tunniksi?';
 const reply=mainioPublicFactAnswer(rows,'Entäs se paku?','fi',previous);
 assert.ok(reply&&!reply.handoff);
 assert.match(reply.answer,/13 m³ pakettiauto 70 euroa/);
 assert.match(reply.answer,/17 m³ pakettiauto 90 euroa/);
 assert.match(reply.answer,/20 m³ pakettiauto 110 euroa/);
});

test('spoken Finnish duration inflections and compact hour forms resolve three-hour pricing',()=>{
 for(const q of [
  'Voinko vuokrata pakettiauton kolmeksi tunniksi?',
  'Mitä maksaa pakettiauto 3 tunniksi?',
  'Paljonko paku maksaa 3h?'
 ]){
  const reply=mainioPublicFactAnswer(rows,q,'fi');
  assert.ok(reply&&!reply.handoff,q);
  assert.match(reply.answer,/13 m³ pakettiauto 50 euroa/,q);
  assert.match(reply.answer,/17 m³ pakettiauto 70 euroa/,q);
 }
});

test('a van follow-up does not borrow duration from an unrelated prior topic',()=>{
 assert.equal(mainioPublicFactAnswer(rows,'Entä se pakettiauto?','fi','Mitä muuttolaatikoiden vuokra maksaa?'),null);
 assert.equal(mainioPublicFactAnswer(rows,'Entä se pakettiauto?','fi'),null);
});

test('compound rental and short van follow-up keep the correct action links',()=>{
 const compound=mainioInquiryActions(firstQuestion,'fi');
 assert.deepEqual(compound.map(x=>x.url),[
  'https://www.mainiomuuttopalvelu.fi/pakettiautojen-vuokraus',
  'https://www.mainiomuuttopalvelu.fi/muuttolaatikot-ja-tarvikkeet'
 ]);
 const initialSemantic=mainioSemanticActions({intent:'box_rental'},'fi',firstQuestion);
 assert.deepEqual(initialSemantic.map(x=>x.url),compound.map(x=>x.url));
 const followup=mainioSemanticActions({intent:'clarify'},'fi','Entä se pakettiauto?');
 assert.deepEqual(followup.map(x=>x.url),[
  'https://www.mainiomuuttopalvelu.fi/pakettiautojen-vuokraus'
 ]);
});

test('colloquial vehicle pickup question answers with the official address and instructions',()=>{
 const reply=mainioPublicFactAnswer(rows,'Mistä auto haetaan jos vuokraan?','fi');
 assert.ok(reply&&!reply.handoff);
 assert.match(reply.answer,/Tavarakatu 1, 20250 Turku/);
 assert.match(reply.answer,/tekstiviestillä/);
 assert.match(reply.answer,/nouto- ja palautusohjeet/);
 assert.equal(reply.sourceIds[0],'demo-mainio-official-11');
 const actions=mainioInquiryActions('Mistä auto haetaan jos vuokraan?','fi');
 assert.deepEqual(actions.map(x=>x.url),[
  'https://www.mainiomuuttopalvelu.fi/pakettiautojen-vuokraus'
 ]);
});

test('contextual tariff answers never imply live booking availability',()=>{
 const reply=mainioPublicFactAnswer(rows,'Onko 3 tunnin pakettiauto huomenna vapaana?','fi',firstQuestion);
 assert.equal(reply,null);
});
