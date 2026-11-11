import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const widget=readFileSync(new URL('../public/widget.js',import.meta.url),'utf8');
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');

test('Smart Assist is available by default; installed websites can opt into Classic or Immersive',()=>{
  assert.match(widget,/script\.dataset\.experience \|\| 'smart'/);
  assert.match(widget,/\['classic','smart','immersive'\]\.includes\(requestedExperience\)/);
  assert.match(widget,/class="wrap experience-\$\{experienceMode\}"/);
  assert.match(widget,/\.experience-classic \.experience-home\{display:none!important\}/);
  assert.match(widget,/\.experience-immersive \.panel/);
});

test('Smart Assist remains isolated in Shadow DOM and does not alter the customer site',()=>{
  assert.match(widget,/root\.attachShadow\(\{ mode: 'open' \}\)/);
  assert.match(widget,/\.experience-smart \.panel/);
  assert.match(widget,/width:calc\(100vw - 12px\);height:calc\(100dvh - 112px\)/);
  assert.match(widget,/prefers-reduced-motion:reduce/);
  assert.match(widget,/panelClose\.addEventListener\('click'/);
  assert.match(widget,/shadow\.addEventListener\('keydown'/);
  assert.match(widget,/aria-pressed="false"/);
});

test('Smart Assist tiles are prompts through existing chat, not unauthorized quotes, bookings or leads',()=>{
  const start=widget.indexOf('function renderExperienceHome()');
  const end=widget.indexOf('  panelClose.addEventListener',start);
  assert.ok(start>0&&end>start);
  const body=widget.slice(start,end);
  assert.match(body,/experienceTiles\.replaceChildren\(\)/);
  assert.match(body,/tile\.addEventListener\('click'/);
  assert.match(body,/sendMessage\(option\.question\)/);
  assert.match(body,/experienceText\('Palvelut'/);
  assert.match(body,/experienceText\('Hinnat'/);
  assert.match(body,/experienceText\('Yhteystiedot'/);
  assert.doesNotMatch(body,/fetch\(|action-request|booking-slots|\.innerHTML\s*=/);
  assert.match(widget,/experienceConversationStarted = true/);
  assert.match(widget,/experienceHome\.hidden = true/);
  assert.match(widget,/const hasProducts=renderProducts\(data\.products \|\| \[\]\)/);
  assert.match(widget,/const existing=\(data\.actions\|\|\[\]\)\.filter/);
  assert.match(widget,/renderActions\(filtered,message\)/);
  assert.match(widget,/renderActions\(existing,message\)/);
  assert.match(widget,/showMainioMovingForm\(question\)/);
});

test('contextual prompts use bounded live page heading without presenting it as a verified business fact',()=>{
  const start=widget.indexOf('  function currentPageTopic()');
  const end=widget.indexOf('  function renderExperienceHome()',start);
  assert.ok(start>0&&end>start);
  const fn=Function('document',widget.slice(start,end)+'return currentPageTopic;');
  assert.equal(fn({querySelector:()=>({textContent:'  Roof washing   options ' }),title:'Fallback'})(),'Roof washing options');
  assert.equal(fn({querySelector:()=>({textContent:'  Home ' }),title:'Fallback'})(),'');
  assert.equal(fn({querySelector:()=>({textContent:'A'.repeat(81)}),title:'Fallback'})(),'');
  assert.equal(fn({querySelector:()=>null,title:'Delivery and returns'})(),'Delivery and returns');
  assert.match(widget,/pageContext\.url = String\(window\.location\.href/);
  assert.match(widget,/pageContext\.title = String\(document\.title/);
});

test('Smart Assist visual copy is translated to Finnish, Swedish and English',()=>{
  const start=widget.indexOf('  function experienceText(');
  const end=widget.indexOf('  const ROBOT_AVATARS',start);
  assert.ok(start>0&&end>start);
  for(const [lang,expected] of [['fi','Palvelut'],['sv','Tjänster'],['en','Services']]){
    const tx=Function('widgetLang',widget.slice(start,end)+'return experienceText;')(lang);
    assert.equal(tx('Palvelut','Tjänster','Services'),expected);
  }
  assert.match(widget,/experienceText\('Miten voin auttaa\?', 'Hur kan jag hjälpa dig\?', 'How can I help\?'/);
});

test('dashboard presents all 3 appearance choices and only changes the selected installation script',()=>{
  assert.match(app,/id="installExperienceMode"/);
  for(const name of ['smart','immersive','classic'])assert.match(app,new RegExp('<option value="'+name+'"'));
  assert.match(app,/data-experience="\$\{esc\(installExperienceMode\(t\.id\)\)\}"/);
  assert.match(app,/\['classic','smart','immersive'\]\.includes\(select\.value\)/);
  assert.match(app,/code\.textContent=String\(code\.textContent\|\|''\)\.replace/);
  assert.match(app,/localStorage\.setItem\('respondo-install-experience-'/);
  assert.match(app,/widget\.js\?v=20261109-smart-experience-v1/);
  assert.match(widget,/\/widget-token\?lang=/);
});
