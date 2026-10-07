import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const effects=readFileSync(new URL('../public/effects.js',import.meta.url),'utf8');

function element(classes=[],properties={}) {
  const names=new Set(classes);
  const style=new Map(Object.entries(properties));
  style[Symbol.iterator]=style.keys.bind(style);
  style.removeProperty=name=>style.delete(name);
  const attributes=new Set(['data-reveal','data-tilt','data-fx-scene','data-fx-scene-index','data-fx-headline']);
  return {
    classList:{add:(...items)=>items.forEach(item=>names.add(item)),remove:(...items)=>items.forEach(item=>names.delete(item)),contains:name=>names.has(name)},
    style,dataset:{},attributes,removeAttribute:name=>attributes.delete(name),remove(){this.removed=true;},
  };
}

function runWorkspace(pathname,{shell=false,ready=true}={}) {
  const html=element([],{ '--fx-page':'.7','--scroll-progress':'.5','--brand-color':'purple' });
  html.dataset={deepScrollReady:'1',fxAtmosphere:'3'};
  const body=element(['assistant-standalone']);
  body.insertAdjacentHTML=()=>assert.fail('Workspace must not inject ambient effects or overlays');
  const panel=element(['panel','fx-scene','fx-headline','fx-depth-card','fx-magnetic'],{
    transform:'rotateY(8deg)',opacity:'.18',filter:'blur(11px)','--fx-pointer-x':'8deg','--mag-x':'12px','--tenant-color':'blue',
  });
  const decoration=element();
  const assistant=element(['fx-assistant-launch']);
  const app={children:ready?[panel]:[]};
  const listeners=[];
  let observer;
  const document={
    documentElement:html,body,
    querySelector(selector){
      if(selector==='#app')return app;
      if(selector==='#app .appshell')return shell?panel:null;
      if(selector==='.fx-assistant-launch')return assistant;
      return null;
    },
    querySelectorAll(selector){
      if(selector.startsWith('.fx-progress'))return decoration.removed?[]:[decoration];
      if(selector.startsWith('#app .fx-scene'))return [panel];
      return [];
    },
    createElement(){assert.fail('Workspace must not install a route animation');},
  };
  vm.runInNewContext(effects,{
    document,location:{pathname},window:{matchMedia:()=>({matches:false}),addEventListener:name=>listeners.push(name)},
    MutationObserver:class{constructor(callback){observer=callback;}observe(){}disconnect(){}},
    IntersectionObserver:class{constructor(){assert.fail('Workspace must not observe cards for motion');}},
    setTimeout:callback=>{callback();return 1;},clearTimeout(){},
  });
  return {html,body,panel,decoration,assistant,app,listeners,render(){app.children=[panel];observer();}};
}

test('demo and owner/support workspaces skip visual effect setup and preserve chat',()=>{
  for(const route of ['/assistant','/app','/demo']) {
    const state=runWorkspace(route);
    assert.ok(state.html.classList.contains('static-workspace'),route);
    assert.ok(state.body.classList.contains('dashboard-page'),route);
    assert.ok(!state.body.classList.contains('assistant-standalone'),route);
    assert.ok(state.decoration.removed,route);
    assert.ok(!state.assistant.removed,'Functional assistant must remain');
    assert.deepEqual(state.listeners,['respondo:languagechange']);
    assert.equal(state.html.dataset.deepScrollReady,undefined);
    assert.equal(state.html.style.get('--fx-page'),undefined);
    assert.equal(state.html.style.get('--brand-color'),'purple');
    assert.ok(state.panel.classList.contains('panel'));
    for(const name of ['fx-scene','fx-headline','fx-depth-card','fx-magnetic'])assert.ok(!state.panel.classList.contains(name));
    assert.equal(state.panel.style.get('transform'),undefined);
    assert.equal(state.panel.style.get('--fx-pointer-x'),undefined);
    assert.equal(state.panel.style.get('--tenant-color'),'blue');
    assert.equal(state.panel.attributes.size,0);
  }
});

test('workspace boundary applies before async render and also detects a shared shell',()=>{
  const waiting=runWorkspace('/assistant',{ready:false});
  assert.ok(waiting.html.classList.contains('static-workspace'));
  assert.equal(waiting.listeners.length,0);
  waiting.render();
  assert.deepEqual(waiting.listeners,['respondo:languagechange']);
  const alias=runWorkspace('/workspace-alias',{shell:true});
  assert.ok(alias.html.classList.contains('static-workspace'));
  assert.deepEqual(alias.listeners,['respondo:languagechange']);
});
