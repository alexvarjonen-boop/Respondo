import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read=name=>readFileSync(new URL('../public/'+name,import.meta.url),'utf8');
const effects=read('effects.js');
const styles=read('respondo-experience.css');
const index=read('index.html');
const start=effects.indexOf("    const send = async (text,{retryBubble=null}={}) => {");
const end=effects.indexOf("    document.querySelectorAll('.fx-quick button')",start);
assert.ok(start>0&&end>start,'send and form handlers are present in first-party chat');
const sendSource=effects.slice(start,end);

class FakeClassList{
  constructor(){this.values=new Set();}
  add(...values){values.forEach(value=>this.values.add(value));}
  remove(...values){values.forEach(value=>this.values.delete(value));}
  contains(value){return this.values.has(value);}
}
class FakeControl{
  constructor(tag='button'){
    this.tagName=tag.toUpperCase();
    this.type='';
    this.textContent='';
    this.className='';
    this.href='';
    this.disabled=false;
    this.handlers={};
    this.attrs={};
  }
  addEventListener(name,fn){(this.handlers[name]??=[]).push(fn);}
  setAttribute(name,value){this.attrs[name]=String(value);}
  removeAttribute(name){delete this.attrs[name];}
  async click(){for(const fn of this.handlers.click||[])await fn({preventDefault(){}});}
}
class FakeBubble{
  constructor(kind){
    this.kind=kind;
    this.classList=new FakeClassList();
    if(kind==='bot')this.classList.add('typing');
    this.attrs={};
    this.children=[];
    this._text='';
    this.firstChild={nodeType:3,nodeValue:''};
  }
  set textContent(value){
    this._text=String(value);
    this.firstChild={nodeType:3,nodeValue:this._text};
    this.children=[];
  }
  get textContent(){return this.firstChild?.nodeValue||this._text;}
  setAttribute(k,v){this.attrs[k]=String(v);}
  removeAttribute(k){delete this.attrs[k];}
  appendChild(item){this.children.push(item);}
  remove(){this.removed=true;}
}

function harness(fetchImpl){
  const elements=[];
  const messages={
    scrollTop:0,scrollHeight:600,clientHeight:400,
    insertAdjacentHTML(position,markup){
      assert.equal(position,'beforeend');
      const kind=markup.includes('fx-chat-bubble user')?'user':'bot';
      elements.push(new FakeBubble(kind));
      this.scrollHeight+=60;
    },
    get lastElementChild(){return elements.at(-1);},
    querySelectorAll(selector){
      assert.equal(selector,'.fx-chat-bubble');
      return elements.filter(e=>!e.removed);
    }
  };
  const input={value:'',disabled:false,placeholder:'Type a question…',focus(){this.focused=true;}};
  const form={message:input,handlers:{},addEventListener(name,fn){this.handlers[name]=fn;}};
  const smartHome={hidden:false};
  const newConversation=new FakeControl();
  let copyValue='';
  const history=[];
  const box={classList:new FakeClassList()};
  box.classList.add('open');
  const ctx={
    form, messages, smartHome,box,newConversation,updateJump(){},
    nearBottom:()=>true, siteAssistantHistory:history,
    lastSubmittedText:'',lastSubmittedAt:0,
    at:(fi,sv,en)=>en,uiLang:'en',
    fetch:fetchImpl,
    window:{matchMedia:()=>({matches:false})},
    navigator:{clipboard:{async writeText(value){copyValue=value;}}},
    location:{href:'https://respondoai.fi',hostname:'respondoai.fi',origin:'https://respondoai.fi'},
    document:{title:'Respondo AI',createElement:tag=>new FakeControl(tag)},
    URL, Date, JSON, Set
  };
  const api=vm.runInNewContext(sendSource+'\n({send})',ctx);
  const submit=value=>{
    form.message.value=value;
    form.handlers.submit({preventDefault(){}});
  };
  return {send:api.send,submit,form,input,messages,elements,box,history,
    newConversation,getCopied:()=>copyValue};
}

test('live answer is sent once and can be copied without including navigation controls',async()=>{
  const requests=[];
  const h=harness(async (url,opts)=>{
    requests.push({url,payload:JSON.parse(opts.body)});
    return {ok:true,json:async()=>({
      answer:'Respondo answers questions with approved company facts.',
      actions:[
        {url:'https://evil.example/action',label:'Malicious'},
        {url:'https://respondoai.fi/features?lang=en',label:'Features'}
      ]
    })};
  });
  await h.send('How does Respondo work?');
  assert.equal(requests.length,1);
  assert.equal(requests[0].url,'/api/public/respondo-assistant/chat');
  assert.equal(requests[0].payload.message,'How does Respondo work?');
  assert.equal(h.history.length,1);
  assert.equal(h.elements.filter(x=>x.kind==='user').length,1);
  const reply=h.elements.find(x=>x.kind==='bot');
  assert.ok(reply.textContent.includes('approved company facts'));
  assert.equal(reply.children.filter(x=>x.tagName==='A').length,1,'only first-party links are actions');
  assert.equal(reply.children.filter(x=>x.tagName==='A')[0].href,'/features?lang=en');
  const copy=reply.children.find(x=>x.className==='fx-assistant-copy');
  assert.ok(copy);
  await copy.click();
  assert.equal(h.getCopied(),'Respondo answers questions with approved company facts.');
  assert.equal(copy.textContent,'Copied');
  assert.equal(h.input.placeholder,'Ask a follow-up…');
  assert.equal(h.input.disabled,false);
});

test('failed answer gets one-click retry that reuses the same bubble and history stays correct',async()=>{
  let attempts=0;
  const h=harness(async()=>{
    attempts++;
    if(attempts===1)throw Error('network problem');
    return {ok:true,json:async()=>({answer:'The service is available 24/7.',actions:[]})};
  });
  await h.send('Is it available around the clock?');
  assert.equal(h.history.length,0,'failed replies are not treated as trusted context');
  assert.equal(h.elements.filter(x=>x.kind==='user').length,1);
  const reply=h.elements.find(x=>x.kind==='bot');
  assert.ok(reply.textContent.includes('retry'));
  const retry=reply.children.find(x=>x.className==='fx-assistant-retry');
  assert.ok(retry);
  await retry.click();
  assert.equal(attempts,2);
  assert.equal(h.history.length,1);
  assert.equal(h.elements.filter(x=>x.kind==='user').length,1,'retry must not duplicate user question');
  assert.equal(h.elements.filter(x=>x.kind==='bot').length,1,'retry must reuse original response bubble');
  assert.ok(reply.textContent.includes('available 24/7'));
  assert.equal(reply.children.some(x=>x.className==='fx-assistant-retry'),false);
});

test('empty, busy and rapid duplicate questions retain draft instead of discarding it',async()=>{
  let resolveFetch;
  let calls=0;
  const h=harness(()=>{calls++;return new Promise(resolve=>resolveFetch=resolve);});
  h.submit('  ');
  assert.equal(calls,0);
  assert.equal(h.input.value,'  ','empty question is not removed');
  h.submit('Can Respondo handle Swedish questions?');
  assert.equal(calls,1);
  assert.equal(h.input.disabled,true);
  h.submit('My next question');
  assert.equal(calls,1,'cannot overlap active request');
  assert.equal(h.input.value,'My next question','draft remains visible when busy');
  resolveFetch({ok:true,json:async()=>({answer:'Yes, when configured.',actions:[]})});
  // Allow the async handler to settle before checking state.
  await new Promise(resolve=>setImmediate(resolve));
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(h.input.disabled,false);
  h.submit('Can Respondo handle Swedish questions?');
  assert.equal(calls,1,'rapid duplicate is ignored');
  assert.equal(h.input.value,'Can Respondo handle Swedish questions?','duplicate remains editable');
});

test('reset, navigation and jump controls are wired without modifying the customer widget',()=>{
  assert.match(effects,/newConversation\.addEventListener\('click',\(\)=>\{/);
  assert.match(effects,/siteAssistantHistory\.length=0/);
  assert.match(effects,/if\(bubble!==initialGreeting\)bubble\.remove\(\)/);
  assert.match(effects,/messages\.setAttribute\('role','log'\)/);
  assert.match(effects,/messages\.addEventListener\('scroll',updateJump,\{passive:true\}\)/);
  assert.match(effects,/jumpToLatest\.addEventListener\('click'/);
  assert.match(effects,/newConversation\.disabled=true/);
  assert.match(effects,/newConversation\.disabled=false/);
  assert.match(effects,/if\(box\.classList\.contains\('open'\) && !window\.matchMedia\?\./);
  assert.doesNotMatch(sendSource,/widget\.js|\/api\/public\/demo-chat/);
  assert.match(styles,/\.fx-assistant-retry/);
  assert.match(styles,/\.fx-assistant-copy/);
  assert.match(styles,/\.fx-assistant-jump\[hidden\]/);
  assert.match(styles,/body\.assistant-standalone #respondo-site-chat \.fx-assistant-new/);
  assert.match(styles,/@media\(prefers-reduced-motion:reduce\)/);
});

test('asset versions invalidate old cached first-party chat, without affecting pricing',()=>{
  assert.match(index,/respondo-experience\.css\?v=20261109-live-first-single-surface-v3-chat-ux-v4/);
  assert.match(index,/firstparty-smart-assist-v1-customer-benefits-v2-clean-chat-v3-mobile-simplify-v9-retry-copy-reset-v4/);
  assert.match(effects,/const allowedPaths = new Set/);
});
