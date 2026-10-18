import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const read = name => readFileSync(new URL('../public/'+name,import.meta.url),'utf8');
const source=read('chat-first-home.js');

function fixture(lang='fi'){
  const handlers={};
  const status={textContent:''};
  const entry={querySelector(name){return name==='[data-respondo-ask-status]'?status:null;}};
  const message={disabled:false,value:''};
  const submitted=[];
  const chatForm={
    elements:{namedItem(n){return n==='message'?message:null;}},
    dispatchEvent(event){submitted.push(event);return !event.defaultPrevented;}
  };
  const panel={
    open:false,
    classList:{contains(n){return n==='open'&&panel.open;}},
    querySelector(sel){return sel==='.fx-assistant-form'?chatForm:null;}
  };
  const launch={click(){panel.open=true;}};
  const document={
    documentElement:{lang},
    addEventListener(n,fn){handlers[n]=fn;},
    querySelector(selector){return selector==='.fx-assistant-launch'?launch:selector==='#app .rs-chat-entry'?entry:null;},
    getElementById(id){return id==='respondo-site-chat'?panel:null;}
  };
  vm.runInNewContext(source,{
    location:{pathname:'/'},
    document,
    Event:class {constructor(type,opts){this.type=type;this.bubbles=opts.bubbles;this.cancelable=opts.cancelable;}}
  });
  const input={value:''};
  const heroForm={
    elements:{namedItem(n){return n==='question'?input:null;}},
    closest(sel){return sel==='.rs-chat-entry'?entry:null;}
  };
  function ask(question){
    input.value=question;
    const event={
      target:{closest(selector){return selector==='[data-respondo-ask-form]'?heroForm:null;}},
      preventDefault(){this.prevented=true;}
    };
    handlers.submit(event);return event;
  }
  function suggestion(question){
    const button={
      getAttribute(n){return n==='data-respondo-ask-question'?question:null;},
      closest(sel){return sel==='.rs-chat-entry'?entry:null;}
    };
    const event={
      target:{closest(selector){return selector==='[data-respondo-ask-question]'?button:null;}},
      preventDefault(){this.prevented=true;}
    };
    handlers.click(event);return event;
  }
  return {ask,suggestion,panel,message,submitted,input,status,handlers};
}

test('site question opens real assistant and submits through its existing chat form',()=>{
  const h=fixture();
  const event=h.ask('Paljonko Respondo maksaa?');
  assert.equal(event.prevented,true);
  assert.equal(h.panel.open,true);
  assert.equal(h.message.value,'Paljonko Respondo maksaa?');
  assert.equal(h.submitted.length,1);
  assert.equal(h.submitted[0].type,'submit');
  assert.equal(h.input.value,'');
});

test('homepage suggestions also route into site assistant without new API calls',()=>{
  const h=fixture('sv');
  h.suggestion('Vad kostar Respondo?');
  assert.equal(h.message.value,'Vad kostar Respondo?');
  assert.equal(h.submitted.length,1);
  assert.equal(h.panel.open,true);
  assert.doesNotMatch(source,/fetch\s*\(|XMLHttpRequest|WebSocket/);
});

test('a busy assistant does not drop an entered customer question',()=>{
  const h=fixture('en');
  h.message.disabled=true;
  h.ask('How do I get started?');
  assert.equal(h.submitted.length,0);
  assert.equal(h.input.value,'How do I get started?');
  assert.match(h.status.textContent,/Please wait/);
});

test('homepage copy explains asking the bot while preserving legal and checkout routes', async()=>{
  const {spiralHeroMarkup}=await import(new URL('../public/spiral-hero.js',import.meta.url));
  for(const lang of ['fi','sv','en']){
    const t=(fi,sv,en)=>({fi,sv,en})[lang];
    const html=spiralHeroMarkup(t,lang);
    assert.match(html,/data-respondo-ask-form/);
    assert.match(html,/type="search"/);
    assert.match(html,/data-respondo-ask-status/);
    assert.equal((html.match(/data-respondo-ask-question=/g)||[]).length,3);
    assert.match(html,/Kysy Respondolta|Fråga Respondo|Ask Respondo/);
    assert.match(html,/24\/7/);
  }
  const index=read('index.html');
  assert.match(index,/\/chat-first-home\.css\?/);
  assert.match(index,/\/chat-first-home\.js\?/);
  assert.ok(index.indexOf('/chat-first-home.css') > index.indexOf('/spiral-hero.css'));
});
