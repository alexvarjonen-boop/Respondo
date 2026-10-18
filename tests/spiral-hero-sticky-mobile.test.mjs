import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const js = readFileSync(new URL('../public/spiral-hero-motion.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../public/spiral-hero.css', import.meta.url), 'utf8');

function harness({stickyWorks=true}={}) {
  const pending=[];
  const events=new Map();
  let scroll=0;
  const classList=()=> {
    const state=new Set();
    return {add(...v){v.forEach(x=>state.add(x))},
      remove(...v){v.forEach(x=>state.delete(x))},
      toggle(x,on){if(on)state.add(x);else state.delete(x)},
      contains(x){return state.has(x)}};
  };
  const style=()=> {
    const vars=new Map();
    return {setProperty(k,v){vars.set(k,v)},removeProperty(k){vars.delete(k)},getPropertyValue(k){return vars.get(k)||''}};
  };
  const cards=Array.from({length:7},(_,i)=>({
    classList:classList(),style:style(),attributes:{},setAttribute(k,v){this.attributes[k]=v},
    removeAttribute(k){delete this.attributes[k]},querySelector(sel){return sel==='h2'?{textContent:'Card '+(i+1)}:null}
  }));
  const counter={textContent:''},announced={textContent:''};
  const stage={getBoundingClientRect(){return {top:stickyWorks?0:-scroll}}};
  const section={
    isConnected:true,classList:classList(),style:style(),
    getBoundingClientRect(){return {top:-scroll,bottom:8400-scroll,height:8400}},
    querySelector(sel){return sel==='.rs-spiral-stage'?stage:sel==='[data-rs-step]'?counter:sel==='[data-rs-announcement]'?announced:null},
    querySelectorAll(sel){return sel==='[data-rs-card]'?cards:[]}
  };
  const app={querySelector(sel){return sel==='.apple-home-page .rs-spiral-section'?section:null}};
  const context={
    location:{pathname:'/'},document:{readyState:'complete',getElementById(id){return id==='app'?app:null}},
    navigator:{connection:{saveData:false},deviceMemory:4},
    innerHeight:800,innerWidth:390,
    matchMedia(q){return {matches:q==='(pointer: coarse)',addEventListener(){}}},
    addEventListener(name,cb){events.set(name,cb)},
    requestAnimationFrame(cb){pending.push(cb);return pending.length},
    cancelAnimationFrame(){},
    MutationObserver:class{observe(){}}
  };
  context.window = context;
  vm.runInNewContext(js,context);
  function flush(){while(pending.length)pending.shift()()}
  flush();
  function move(y){scroll=y;events.get('scroll')();flush()}
  return {cards,section,counter,announced,move};
}
test('mobile hero stays on each card through most of each scroll segment',()=>{
  const h=harness();
  assert.equal(h.counter.textContent,'01');
  assert.ok(h.cards[0].classList.contains('rs-in-scene'));
  h.move(440); // one large drag still inside the first reading interval
  assert.equal(h.counter.textContent,'01');
  assert.equal(h.cards[0].style.getPropertyValue('--rs-x'),'0.0px');
  assert.equal(h.cards[1].classList.contains('rs-in-scene'),false);
  h.move(1430);
  assert.equal(h.counter.textContent,'02');
  assert.ok(h.cards[1].classList.contains('rs-in-scene'));
  h.move(1790);
  assert.equal(h.counter.textContent,'02');
  h.move(0);
  assert.equal(h.counter.textContent,'01');
});
test('mobile Safari sticky failure is pinned and hands off at the end',()=>{
  const h=harness({stickyWorks:false});
  h.move(330);
  assert.ok(h.section.classList.contains('rs-fixed-fallback'));
  assert.equal(h.section.classList.contains('rs-fixed-end'),false);
  h.move(7730);
  assert.ok(h.section.classList.contains('rs-fixed-end'));
  h.move(0);
  assert.equal(h.section.classList.contains('rs-fixed-fallback'),false);
});
test('mobile sticky fixes remain scoped to the spiral without scroll interception',()=>{
  assert.match(css,/overflow-x:clip!important/);
  assert.match(css,/height:1050svh/);
  assert.match(css,/position:sticky!important/);
  assert.match(css,/\.rs-fixed-fallback/);
  assert.match(js,/fraction - \.66/);
  assert.doesNotMatch(js,/preventDefault\(|scrollTo\(|scrollIntoView\(|setInterval\(/);
});
