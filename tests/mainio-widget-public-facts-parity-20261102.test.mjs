// Regression for an observed live delivery gap: Mainio's public Try Bot had
// correct 5-hour van prices but the embedded customer widget only read
// stored approved knowledge rows, which could be empty or incomplete.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {mainioPublicKnowledgeWithOfficialFacts} from '../mainio-official-public-facts.mjs';
import {mainioPublicFactAnswer} from '../mainio-public-fact-answer.mjs';
import {mainioBookingStatusQuestion} from '../mainio-moving-intake.mjs';

const official=mainioPublicKnowledgeWithOfficialFacts([]);
const questionCases=[
 ['Mitä paku maksaa viideksi tunniksi?',/13 m³ pakettiauto 70 euroa.*17 m³ pakettiauto 90 euroa.*20 m³ pakettiauto 110 euroa/],
 ['Paljonko maksaa 13 kuution paku 5 tunniksi?',/13 m³ pakettiauto 70 euroa/],
 ['Paljonko on 5 tunnin pakettiauton vuokra?',/13 m³ pakettiauto 70 euroa/],
 ['Paljonko maksaa pakettiauton 3 tunnin vuokra?',/13 m³ pakettiauto 50 euroa/],
 ['Paljonko pakettiauto maksaa 24h vuokralle?',/13 m³ pakettiauto 90 euroa/],
 ['Voiko pakettiauton vuokrata yöksi?',/sopia erikseen asiakaspalvelumme kanssa/],
 ['Mitä muuttolaatikoiden vuokra maksaa?',/0,20 euroa laatikolta vuorokaudessa/],
];
test('Mainio fallback prices are available without stored knowledge rows',()=>{
 for(const [q,expected] of questionCases){
  const reply=mainioPublicFactAnswer(official,q,'fi');
  assert.ok(reply&&!reply.handoff,q);
  assert.match(reply.answer,expected,q);
  assert.ok(reply.sourceIds.length===1 && reply.sourceIds[0].startsWith('demo-mainio-official-'),q);
  assert.match(reply.selected[0].source_url,/^https:\/\/www\.mainiomuuttopalvelu\.fi\//,q);
  assert.doesNotMatch(reply.answer,/varattu sinulle|vapaana huomenna|varaus vahvistettu/i,q);
 }
});
test('live booking status guard outranks tariffs even for an empty tenant knowledge table',()=>{
 for(const q of [
   'Onko 5 tunnin paku huomenna vapaana?',
   'Onko pakettiauto jo varattu minulle?',
   'Onko muuttolaatikot varmasti vapaana huomenna?'
 ]){
  assert.equal(mainioBookingStatusQuestion(q),true,q);
  assert.equal(mainioPublicFactAnswer(official,q,'fi'),null,q);
 }
});
test('Mainio official price fallback applies to public demo, signed-in preview and widget, never another tenant',async()=>{
 const source=await readFile(new URL('../server.mjs',import.meta.url),'utf8');
 assert.match(source,/const mainioPreviewRows=publicMainioDemo\s*\?\s*mainioPublicKnowledgeWithOfficialFacts\(demoMainioEvidence\(\)\)\s*:\s*previewMainioTenant\s*\?\s*mainioPublicKnowledgeWithOfficialFacts\(rows\)\s*:\s*rows/);
 assert.match(source,/const mainioTenant=isMainioMovingTenant\(t\);\s*[\s\S]{0,450}?const mainioWidgetRows=mainioTenant\s*\?\s*mainioPublicKnowledgeWithOfficialFacts\(safeKnowledgeRows\)\s*:\s*safeKnowledgeRows/);
 assert.match(source,/mainioPublicFactAnswer\(mainioWidgetRows,message,detectedLang\)/);
 assert.match(source,/mainioSemanticGroundedReply\(mainioWidgetRows,mainioInterpretation,detectedLang\)/);
 assert.match(source,/mainioPriorityDomesticRouteAnswer\(mainioWidgetRows,message,detectedLang,mainioInterpretation\)/);
 assert.match(source,/mainioPublicFactAnswer\(mainioPreviewRows,message,detectedLang\)/);
});
test('invalid unrelated or customer-provided sources cannot override verified FAQ facts',()=>{
 const invalid={
  id:'bad-claim',title:'Pakettiauton 5 tunnin vuokrahinnat',approved:false,
  source_type:'customer',source_url:'https://notmainio.example/price',
  answer:'13 m³ pakettiauto vain 1 euro.'
 };
 const rows=mainioPublicKnowledgeWithOfficialFacts([invalid]);
 const reply=mainioPublicFactAnswer(rows,'Mitä paku maksaa viideksi tunniksi?','fi');
 assert.ok(reply);
 assert.deepEqual(reply.sourceIds,official.filter(r=>r.title==='Pakettiauton 5 tunnin vuokrahinnat').map(r=>r.id));
 assert.doesNotMatch(reply.answer,/vain 1 euro/);
});
