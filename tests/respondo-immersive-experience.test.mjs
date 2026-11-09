import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  experienceLocale,experienceCopy,experienceRecommendations,
  minimalExperienceCopy,liveFirstExperienceCopy,mountRespondoExperience
} from '../public/respondo-experience.mjs';

const read=file=>readFileSync(new URL('../public/'+file,import.meta.url),'utf8');
const js=read('respondo-experience.mjs');
const css=read('respondo-experience.css');
const html=read('index.html');
const legacy=read('effects.js');
const packageJson=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));

test('visitor can immediately ask a real question with localized text and two secondary links',()=>{
  for(const lang of ['fi','sv','en']){
    const c=minimalExperienceCopy(lang);
    const live=liveFirstExperienceCopy(lang);
    assert.equal(experienceLocale(lang),lang);
    for(const k of ['heading','description','placeholder','send','fit','demo','pricing','discover']){
      assert.ok(live[k]?.trim(),lang+' : '+k);
    }
    for(const key of [
      'heading','description','ask','askDetail','fit','fitDetail','demo','demoDetail',
      'question1','question2','example','visitor','bot','next','exampleNote','resultTitle','resultNote'
    ])assert.ok(c[key]?.trim(),lang+': '+key);
    assert.equal(c.sampleTabs.length,3);
    assert.equal(c.samples.length,3);
    assert.ok(c.samples.every(item=>item.length===3&&item.every(Boolean)));
    for(const key of ['answers','leads','bookings'])assert.ok(c.results[key]?.trim());
    assert.ok(!/experience|immersive|dashboard/i.test(c.heading),'simple human-language title');
    assert.equal(experienceCopy(lang).plans.length,3,'existing plan data preserved separately');
  }
  assert.equal(experienceLocale('unknown'),'en');
  assert.equal(minimalExperienceCopy('de').heading,'How can I help?');
});

test('recommendations remain source-grounded examples, not invented quotes or bookings',()=>{
  assert.deepEqual(
    {...experienceRecommendations('services','leads','fi')},
    {category:'services',priority:'leads',categoryText:'Palveluyritys',goalText:'Yhteydenotot'}
  );
  assert.equal(experienceRecommendations('ecommerce','answers','sv').categoryText,'Webbutik');
  assert.equal(experienceRecommendations('bookings','bookings','en').goalText,'Booking requests');
  assert.equal(experienceRecommendations('invalid','invalid','en').priority,'answers');
  assert.match(minimalExperienceCopy('en').resultNote,/company-approved information/);
  assert.match(minimalExperienceCopy('fi').samples[2][1],/jos kalenteri on yhdistetty/);
  assert.doesNotMatch(js,/fetch\(|stripe\.checkout|POST.*\/booking|new WebSocket/);
});

class FakeClassList{
  constructor(node){this.node=node;}
  values(){return new Set(this.node.className.split(/\s+/).filter(Boolean));}
  contains(value){return this.values().has(value);}
  add(...values){const x=this.values();values.forEach(v=>x.add(v));this.node.className=[...x].join(' ');}
  remove(...values){const x=this.values();values.forEach(v=>x.delete(v));this.node.className=[...x].join(' ');}
  toggle(value,force){
    const x=this.values();const on=force===undefined?!x.has(value):!!force;
    if(on)x.add(value);else x.delete(value);this.node.className=[...x].join(' ');return on;
  }
}
class FakeElement{
  constructor(tag='',className=''){
    this.tagName=tag.toUpperCase();this.className=className;this.classList=new FakeClassList(this);
    this.children=[];this.parentElement=null;this.attrs={};this.dataset={};this.listeners=new Map();
    this.textContent='';this.hidden=false;this.disabled=false;this.style={};
  }
  append(...elements){
    for(const element of elements){if(!element)continue;
      if(element.parentElement)element.parentElement.children=element.parentElement.children.filter(x=>x!==element);
      element.parentElement=this;this.children.push(element);
    }
  }
  appendChild(element){this.append(element);return element;}
  prepend(element){if(element.parentElement)element.parentElement.children=element.parentElement.children.filter(x=>x!==element);
    element.parentElement=this;this.children.unshift(element);return element;}
  replaceChildren(...elements){this.children.forEach(e=>e.parentElement=null);this.children=[];this.append(...elements);}
  insertBefore(element,before){
    if(element.parentElement)element.parentElement.children=element.parentElement.children.filter(x=>x!==element);
    const index=this.children.indexOf(before);element.parentElement=this;
    this.children.splice(index===-1?this.children.length:index,0,element);
  }
  setAttribute(k,v){this.attrs[k]=String(v);}
  getAttribute(k){return this.attrs[k]??null;}
  removeAttribute(k){delete this.attrs[k];}
  addEventListener(type,callback){const listeners=this.listeners.get(type)||[];listeners.push(callback);this.listeners.set(type,listeners);}
  click(){for(const callback of this.listeners.get('click')||[])callback({target:this,preventDefault(){}});}
  focus(){this.focused=true;}
  remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(x=>x!==this);this.parentElement=null;}
  getClientRects(){return [1];}
  querySelectorAll(selector){
    const answer=[];
    const isClass=selector.startsWith('.');
    const isInput=selector==='input[name="message"]';
    const isButton=selector==='button';
    const walk=node=>{
      for(const child of node.children){
        if(isClass&&child.classList.contains(selector.slice(1)) || isInput&&child.tagName==='INPUT' || isButton&&child.tagName==='BUTTON')answer.push(child);
        walk(child);
      }
    };
    walk(this);return answer;
  }
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
}
function mountFake(language='fi'){
  const body=new FakeElement('body');
  const box=new FakeElement('aside','fx-assistant fx-firstparty-smart');
  const header=new FakeElement('header','fx-assistant-head');
  const tools=new FakeElement('div','fx-smart-panel-tools');
  const close=new FakeElement('button','fx-assistant-close');
  tools.append(close);header.append(tools);
  const messages=new FakeElement('div','fx-assistant-messages');
  const form=new FakeElement('form','fx-assistant-form');
  const input=new FakeElement('input');form.append(input);
  box.append(header,messages,form);
  const launch=new FakeElement('button','fx-firstparty-launch');
  body.append(launch,box);
  const d={
    body,location:{pathname:'/',search:'?lang='+language},
    defaultView:{localStorage:{getItem:()=>language}},
    createElement:tag=>new FakeElement(tag),
    querySelector:selector=>selector==='#respondo-site-chat.fx-firstparty-smart'?box:
      selector==='.fx-firstparty-launch'?launch:null,
    querySelectorAll:()=>[],
    activeElement:null
  };
  return {d,box,form,input,launch,body};
}
test('home has one genuine editable question input, not three fake demo cards',()=>{
  const previous=globalThis.MutationObserver;
  globalThis.MutationObserver=class{observe(){}};
  try{
    const {d,box,form,input}=mountFake('en');
    let sent=0;
    form.requestSubmit=()=>{sent++;};
    assert.equal(mountRespondoExperience(d),true);
    assert.equal(mountRespondoExperience(d),false,'cannot mount twice');
    const stage=box.querySelector('.rx-experience-stage');
    assert.ok(stage);
    assert.equal(stage.querySelectorAll('.rx-ask-form').length,1);
    assert.equal(stage.querySelectorAll('.rx-ask-input').length,1);
    assert.equal(stage.querySelectorAll('.rx-experience-visual').length,0);
    assert.equal(stage.querySelectorAll('.rx-preview-card').length,0);
    assert.equal(stage.querySelectorAll('.rx-choice').length,0);
    const question=stage.querySelector('.rx-ask-input');
    question.value='How can Respondo help customers on my website?';
    const submit=stage.querySelector('.rx-ask-form').listeners.get('submit')[0];
    submit({preventDefault(){}});
    assert.equal(sent,1,'actual existing chat form gets exactly one submit');
    assert.equal(input.value,'How can Respondo help customers on my website?');
    assert.ok(box.classList.contains('rx-conversation-mode'));
    assert.equal(question.value,'');
    const returnButton=box.querySelector('.rx-experience-return');
    returnButton.click();
    assert.ok(box.classList.contains('rx-stage-mode'));
    assert.equal(sent,1,'returning does not resubmit any canned question');
    assert.ok(stage.querySelector('.rx-ask-input'));
  }finally{globalThis.MutationObserver=previous;}
});

test('empty questions and a busy assistant cannot generate an API request',()=>{
  const previous=globalThis.MutationObserver;
  globalThis.MutationObserver=class{observe(){}};
  try{
    const {d,box,form,input}=mountFake('fi');
    let submitted=0;
    form.requestSubmit=()=>submitted++;
    assert.equal(mountRespondoExperience(d),true);
    let ask=box.querySelector('.rx-ask-form');
    let question=box.querySelector('.rx-ask-input');
    const submit=ask.listeners.get('submit')[0];
    question.value='   ';
    submit({preventDefault(){}});
    assert.equal(submitted,0);
    question.value='Paljonko Respondo maksaa?';
    input.disabled=true;
    submit({preventDefault(){}});
    assert.equal(submitted,0);
    input.disabled=false;
    submit({preventDefault(){}});
    assert.equal(submitted,1);
    assert.ok(box.classList.contains('rx-conversation-mode'));
  }finally{globalThis.MutationObserver=previous;}
});

test('guided solution remains working on the single surface without mock conversation',()=>{
  const previous=globalThis.MutationObserver;
  globalThis.MutationObserver=class{observe(){}};
  try{
    const {d,box}=mountFake('sv');
    assert.equal(mountRespondoExperience(d),true);
    const stage=box.querySelector('.rx-experience-stage');
    const links=stage.querySelectorAll('.rx-utility-links');
    assert.equal(links.length,1);
    const utilities=stage.querySelectorAll('.rx-utility-links')[0];
    const fit=utilities.querySelector('.rx-action');
    fit.click();
    let options=stage.querySelectorAll('.rx-fit-option');
    assert.equal(options.length,3);
    options[1].click(); // Online store
    options=stage.querySelectorAll('.rx-fit-option');
    assert.equal(options.length,3);
    options[1].click(); // Quote requests
    assert.ok(stage.querySelector('.rx-fit-result'));
    assert.match(stage.querySelector('.rx-result-main').textContent,/kontakt eller offert/);
    assert.equal(stage.querySelectorAll('.rx-preview-card').length,0);
    const demoLink=stage.querySelectorAll('.rx-fit-actions')[0].children.find(el=>el.tagName==='A');
    assert.match(demoLink.href,/\/assistant\?lang=sv/);
    stage.querySelector('.rx-back').click();
    assert.equal(stage.querySelectorAll('.rx-fit-option').length,3);
  }finally{globalThis.MutationObserver=previous;}
});

test('standalone demo, account dashboard, and customer embed remain untouched',()=>{
  assert.equal(mountRespondoExperience(null),false);
  assert.equal(mountRespondoExperience({body:null}),false);
  for(const path of ['/assistant','/app','/demo']){
    assert.equal(mountRespondoExperience({body:{classList:{contains:()=>false}},location:{pathname:path}}),false);
  }
  assert.match(js,/querySelector\('#respondo-site-chat\.fx-firstparty-smart'\)/);
  assert.match(js,/const form=box\.querySelector\('\.fx-assistant-form'\)/);
  assert.match(legacy,/\/api\/public\/respondo-assistant\/chat/);
  assert.match(legacy,/const allowedPaths = new Set/);
  assert.match(legacy,/siteAssistantHistory\.slice\(-6\)/);
  assert.match(js,/form\.addEventListener\('submit',focusChat,true\)/);
});

test('design is clean, responsive and accessible rather than a rotating 3D slideshow',()=>{
  assert.match(css,/background:#0B0D12!important/);
  assert.match(css,/\.rx-ask-form/);
  assert.match(css,/\.rx-ask-submit/);
  assert.match(css,/\.rx-hero-mark/);
  assert.doesNotMatch(css,/\.rx-experience-visual|\.rx-preview-card|background:linear-gradient\(140deg,#fafafb/);
  assert.match(css,/\.rx-fit-option/);
  assert.match(css,/\.rx-experience-backdrop/);
  assert.match(css,/@media\(max-width:610px\)/);
  assert.match(css,/height:100dvh!important/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/\.rx-ask-input\{[\s\S]*?font-size:16px!important/);
  assert.doesNotMatch(css,/@keyframes rx-ring-turn|\.rx-orbit-ring/);
  assert.doesNotMatch(js,/rx-orbit|rx-tab|rx-scene-selector|rx-plan-cards/);
  assert.match(js,/isOpen|opened\?'dialog':'region'/);
  assert.match(js,/box\.setAttribute\('aria-modal','true'\)/);
  assert.match(js,/event\.key!=='Tab'/);
  assert.match(js,/backdrop\.addEventListener\('click',\(\)=>close\.click\(\)\)/);
});

test('CSS and JS caches were bumped and full syntax checked in CI',()=>{
  assert.match(html,/respondo-experience\.css\?v=20261109-live-first-single-surface-v3/);
  assert.match(html,/respondo-experience\.mjs\?v=20261109-live-first-single-surface-v3/);
  assert.match(html,/firstparty-smart-assist-v1-customer-benefits-v2-clean-chat-v3-mobile-simplify-v9/);
  assert.match(packageJson.scripts.check,/node --check public\/respondo-experience\.mjs/);
  assert.match(legacy,/box\.classList\.add\('rx-has-user-message'\)/);
});
