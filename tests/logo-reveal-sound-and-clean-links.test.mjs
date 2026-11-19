import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=name=>readFileSync(new URL('../public/'+name,import.meta.url),'utf8');
const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const effects=read('effects.js');

test('chatbot shows the features destination only as a button',()=>{
  const start=server.indexOf('// First-party feature overview:');
  const end=server.indexOf('// Buying/subscribing questions',start);
  assert.ok(start>=0 && end>start);
  const featureCopy=server.slice(start,end);
  assert.doesNotMatch(featureCopy,/https:\/\/(?:www\.)?respondoai\.fi\/(?:ominaisuudet|funktioner|features)/);
  assert.match(featureCopy,/respondo-faq-features-overview/);
  assert.match(effects,/const used = new Set\(\)/);
  assert.match(effects,/displayedAnswer = answer\.replace/);
  assert.match(effects,/used\.has\(destination\.pathname\)/);
  assert.match(effects,/siteAssistantHistory\.push\(\{question:clean,answer:displayedAnswer\}\)/);
});
