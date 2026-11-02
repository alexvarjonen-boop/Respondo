import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {mainioPublicWebsiteEvidence,mainioPublicFactAnswer} from '../mainio-public-fact-answer.mjs';
import {mainioPriorityDomesticRouteAnswer,mainioSemanticGroundedReply} from '../server.mjs';
import {interpretMainioLocalIntent} from '../mainio-semantic-intent.mjs';

const faq='https://www.mainiomuuttopalvelu.fi/usein-muutosta-kysyttya';
const site='https://www.mainiomuuttopalvelu.fi/';
const area={
 id:'area-from-mainio-site',title:'Muuton toimialue',source_type:'website',
 source_url:site+'avaimet-kateen-muutto-vai-omatoiminen-muutto-vaihtoehdot-vertailussa',
 answer:'Mainio palvelee Turussa ja Varsinais-Suomessa. Muutot voivat suuntautua myös muualle Suomeen; tarkka reitti ja toteutus sovitaan erikseen.'
};
const boxes={
 id:'faq-mainio',title:'Kuinka monta muuttolaatikkoa tarvitsen?',source_type:'website',
 source_url:faq,answer:'Arvio 0,8–1 laatikkoa / asuinneliö riippuen tavaroiden määrästä.'
};

test('Mainio public website demo never reuses unrelated or spoofed website facts',()=>{
 const rows=[area,boxes,
  {...area,id:'other-company',source_url:'https://othercompany.fi/faq'},
  {...area,id:'lookalike',source_url:'https://mainiomuuttopalvelu.fi.evil.test/faq'},
  {...area,id:'http',source_url:'http://www.mainiomuuttopalvelu.fi/page'},
  {...area,id:'user-claim',source_type:'customer'},
  {...area,id:'unapproved',approved:false},
  {...area,id:'no-evidence',source_url:''}
 ];
 const filtered=mainioPublicWebsiteEvidence(rows);
 assert.deepEqual(filtered.map(x=>x.id),['area-from-mainio-site','faq-mainio']);
});

test('public site FAQ evidence can calculate 60m2 needs and link the exact sourced answer',()=>{
 const answer=mainioPublicFactAnswer(mainioPublicWebsiteEvidence([boxes]),
  'Montako muuttolaatikkoa tarvitsen 60 neliön asuntoon?','fi');
 assert.ok(answer);
 assert.deepEqual(answer.sourceIds,[boxes.id]);
 assert.match(answer.answer,/48–60 muuttolaatikkoa/);
 assert.doesNotMatch(answer.answer,/vahvistettu varaus|päätetty määrä/i);
});

test('a combined Finland-wide moving route is handled with source evidence or safe quote clarification',()=>{
 const q='Onnistuuko muutto Rovaniemeltä Turkuun ja tarvitsen samalla muuttolaatikoita?';
 const direct=mainioPriorityDomesticRouteAnswer(mainioPublicWebsiteEvidence([area,boxes]),q,'fi');
 assert.ok(direct&&!direct.handoff);
 assert.deepEqual(direct.sourceIds,[area.id]);
 assert.match(direct.answer,/myös muualle Suomeen/);
 const intent=interpretMainioLocalIntent(q);
 assert.equal(intent?.intent,'moving_route');
 const withoutEvidence=mainioSemanticGroundedReply([],intent,'fi');
 assert.ok(withoutEvidence&&!withoutEvidence.handoff);
 assert.doesNotMatch(withoutEvidence.answer,/myös muualle Suomeen|varaus vahvistettu/i);
});

test('public Mainio demo is opt-in by exact website identity and never reads tenant knowledge',async()=>{
 const server=await readFile(new URL('../server.mjs',import.meta.url),'utf8');
 assert.match(server,/publicMainioDemo=isMainioPublicDemoWebsite\(/);
 assert.match(server,/mainioPublicWebsiteEvidence\(rows\)/);
 assert.match(server,/mainioPreviewRows=publicMainioDemo\s*\?\s*mainioPublicKnowledgeWithOfficialFacts\(demoMainioEvidence\(\)\)\s*:\s*previewMainioTenant\s*\?\s*mainioPublicKnowledgeWithOfficialFacts\(rows\)\s*:\s*rows/);
 assert.match(server,/previewMainioTenant\|\|publicMainioDemo/);
 assert.match(server,/if\(publicMainioDemo && result\.handoff\)/);
 // Public logic must not enable the external intent classification API.
 assert.match(server,/previewMainioTenant \? await classifyMainioSemanticIntent/);
});
