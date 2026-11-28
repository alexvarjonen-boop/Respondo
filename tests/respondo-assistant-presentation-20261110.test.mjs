import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { respondoAssistantPresentation } from '../respondo-assistant-presentation.mjs';

test('single subscription uses current localized follow-ups and no obsolete plan comparison',()=>{
  const cases=[['fi','Mitä Respondo maksaa?','Mitä Respondo AI:n tilaukseen sisältyy?'],['sv','Vad kostar Respondo?','Vad ingår i Respondo AI?'],['en','How much does Respondo cost?','What is included in Respondo AI?']];
  for(const [language,question,expected] of cases){
    const result=respondoAssistantPresentation({question,language,answer:'Respondo AI €350/month',verified:true,faqId:'respondo-faq-pricing'});
    assert.equal(result.cards,null);assert.ok(result.suggestions.includes(expected));assert.doesNotMatch(result.suggestions.join(' '),/Advanced|Premium|Enterprise/);
    assert.equal(respondoAssistantPresentation({question,language,answer:'Advanced €49, Premium €129, Enterprise €149',verified:true,faqId:'respondo-faq-pricing'}).cards,null);
  }
});

test('site assistant keeps verified message body, links, copy and new contextual buttons',()=>{
  const client=readFileSync(new URL('../public/effects.js',import.meta.url),'utf8');
  const css=readFileSync(new URL('../public/respondo-experience.css',import.meta.url),'utf8');
  const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
  assert.match(client,/typing\.textContent = answer/);
  assert.match(client,/typing\.firstChild\.nodeValue = displayedAnswer/);
  assert.match(client,/fx-verified-pricing/);
  assert.match(client,/fx-contextual-followups/);
  assert.match(client,/void send\(question\)/);
  assert.match(server,/respondoAssistantPresentation/);
  assert.match(css,/fx-verified-plan-amount/);
  assert.match(css,/fx-contextual-question:focus-visible/);
});
