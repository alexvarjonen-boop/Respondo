import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const effects=readFileSync(new URL('../public/effects.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/effects.css',import.meta.url),'utf8');
const firstParty=readFileSync(new URL('../public/chat-first-home.js',import.meta.url),'utf8');

test('marketing and installed customer bots have distinct shells but the Respondo site now offers Smart Assist',()=>{
  assert.match(effects,/class="fx-assistant fx-firstparty-smart"/);
  assert.match(effects,/class="fx-assistant-launch fx-firstparty-launch"/);
  assert.match(effects,/class="fx-smart-home"/);
  assert.match(effects,/class="fx-smart-tiles"/);
  assert.match(effects,/class="fx-smart-guide"/);
  assert.match(effects,/class="fx-smart-expand"/);
  assert.match(effects,/class="fx-assistant-form"/);
  assert.match(effects,/\/api\/public\/respondo-assistant\/chat/);
  assert.match(effects,/if \(isWorkspacePage\(\)\)/);
});

test('first-party site assistant offers real page navigation and conversational tiles in FI, SV, EN',()=>{
  for(const key of [
    "at('Hinnat','Priser','Pricing')",
    "at('Ominaisuudet','Funktioner','Features')",
    "at('Kokeile','Testa','Try it')",
    "at('Yhteystiedot','Kontakt','Contact')",
  ])assert.ok(effects.includes(key),key);
  assert.match(effects,/href="\/hinnat\?lang=\$\{uiLang\}"/);
  assert.match(effects,/href="\/assistant\?lang=\$\{uiLang\}"/);
  assert.match(effects,/href="\/yhteystiedot\?lang=\$\{uiLang\}"/);
  assert.match(effects,/\/funktioner':uiLang==='en'\?'\/features':'\/ominaisuudet'/);
  assert.match(effects,/data-fx-smart-question/);
  assert.match(effects,/box\.addEventListener\('click',event=>\{/);
  assert.match(effects,/void send\(question\)/);
});

test('conversation remains grounded and preserves client FAQ navigation with no auto-booking or unapproved promises',()=>{
  assert.match(effects,/siteAssistantHistory\.slice\(-6\)/);
  assert.match(effects,/const allowedPaths = new Set/);
  assert.match(effects,/if \(!allowedPaths\.has\(destination\.pathname\)\) continue/);
  assert.match(effects,/if \(used\.size>=4\) break/);
  assert.match(effects,/typing\.textContent = answer/);
  assert.match(effects,/if\(smartHome\)smartHome\.hidden=true/);
  assert.match(effects,/if \(!clean \|\| form\.message\.disabled\) return/);
  assert.doesNotMatch(effects.slice(effects.indexOf('<section class="fx-smart-home"'),effects.indexOf('</section><div class="fx-quick"')),/action-request|booking-slots|\/api\/public\/.+\/lead/);
});

test('contextual page guidance is bounded, text-only, and sent as a normal question',()=>{
  const start=effects.indexOf('    const updatePageHint=()=>{');
  const end=effects.indexOf('    updatePageHint();',start);
  assert.ok(start>=0&&end>start);
  const body=effects.slice(start,end);
  assert.match(body,/title\.length<8 \|\| title\.length>90/);
  assert.match(body,/assistantTopic\.textContent=/);
  assert.match(body,/assistantTopic\.dataset\.fxSmartQuestion=/);
  assert.match(body,/assistantTopic\.hidden=false/);
  assert.doesNotMatch(body,/innerHTML|fetch\(/);
  assert.match(effects,/event\.target\.closest\?\.\('\[data-fx-smart-question\]'\)/);
});

test('mobile, keyboard, reduced-motion and standalone Try Bot views are retained',()=>{
  assert.match(css,/#respondo-site-chat\.fx-firstparty-smart/);
  assert.match(css,/grid-template-rows:auto minmax\(0,1fr\) auto!important/);
  assert.match(css,/@media\(max-width:620px\)/);
  assert.match(css,/height:calc\(100dvh - 100px\)!important/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/body\.assistant-standalone #respondo-site-chat \.fx-smart-expand\{display:none!important\}/);
  assert.match(effects,/aria-controls="respondo-site-chat" aria-expanded="false"/);
  assert.match(effects,/aria-pressed="false"/);
  assert.match(effects,/box\.addEventListener\('keydown', event => \{ if \(event\.key==='Escape'\)/);
  assert.match(firstParty,/document\.querySelector\('\.fx-assistant-launch'\)/);
  assert.match(firstParty,/document\.getElementById\('respondo-site-chat'\)/);
  assert.match(firstParty,/panel\?\.querySelector\('\.fx-assistant-form'\)/);
});

test('effects module parses as JavaScript after first-party Smart Assist upgrade',()=>{
  assert.doesNotThrow(()=>new Function(effects));
});
