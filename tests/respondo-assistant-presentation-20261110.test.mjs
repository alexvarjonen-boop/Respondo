import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { respondoAssistantPresentation } from '../respondo-assistant-presentation.mjs';

test('verified monthly Finnish plan prices are rendered only from approved answer text',()=>{
  const answer='Kuukausihinnat ovat Advanced 49 €/kk, Premium 129 €/kk ja Enterprise 149 €/kk.';
  const result=respondoAssistantPresentation({
    question:'Mitä Respondo maksaa?', language:'fi',answer,verified:true,
    faqId:'respondo-faq-pricing'
  });
  assert.equal(result.language,'fi');
  assert.equal(result.cards.kind,'pricing');
  assert.deepEqual(result.cards.items.map(item=>item.price),['49','129','149']);
  assert.equal(result.suggestions.length,3);
  assert.ok(result.suggestions.every(question=>typeof question==='string'&&question.length>8));
});

test('English and Swedish price cards preserve amounts and localized next questions',()=>{
  const cases=[
    ['en','How much does Respondo cost?','Advanced €49/month, Premium €129/month, Enterprise €149/month.',['49','129','149']],
    ['sv','Vad kostar årsabonnemanget?','Årsplaner: Advanced 39 €/mån, Premium 119 €/mån och Enterprise 139 €/mån.',['39','119','139']]
  ];
  for(const [language,question,answer,prices] of cases){
    const result=respondoAssistantPresentation({question,language,answer,verified:true,faqId:'respondo-faq-pricing'});
    assert.deepEqual(result.cards.items.map(item=>item.price),prices);
    assert.equal(result.language,language);
    assert.ok(result.suggestions.every(suggestion=>suggestion!==question));
  }
});

test('pricing cards are suppressed when prices are missing or unverified',()=>{
  const base={question:'What does Respondo cost?',language:'en',verified:true,faqId:'respondo-faq-pricing'};
  assert.equal(respondoAssistantPresentation({...base,answer:'Advanced costs €49, contact us for other packages.'}).cards,null);
  assert.equal(respondoAssistantPresentation({...base,answer:'Advanced €49, Premium €129, Enterprise €149',verified:false}).cards,null);
  assert.equal(respondoAssistantPresentation({...base,answer:'Advanced €49, Premium €129, Enterprise €149',handoff:true}).cards,null);
  const fallback=respondoAssistantPresentation({question:'Unknown request',language:'en',answer:'I am not sure.',verified:false});
  assert.equal(fallback.suggestions.length,2);
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
