import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {spiralHeroMarkup} from '../public/spiral-hero.js';

const fromPublic=file=>readFileSync(new URL('../public/'+file,import.meta.url),'utf8');
const motion=fromPublic('spiral-hero-motion.js');
function classList(){
  const set=new Set();
  return {contains:x=>set.has(x),add:(...names)=>names.forEach(n=>set.add(n)),
    remove:(...names)=>names.forEach(n=>set.delete(n)),
    toggle:(name,force)=>{if(force===undefined)force=!set.has(name);
      if(force)set.add(name);else set.delete(name);return force;}};
}
function fakePage({mobile=false,reduced=false}={}){
  const actions={},frames=[],listeners={},nodes={};
  let scrollY=0;
  const cards=Array.from({length:10},(_,i)=>({
    classList:classList(),style:{setProperty(){},removeProperty(){},zIndex:''},
    attrs:{},setAttribute(name,value){this.attrs[name]=value;},
    removeAttribute(name){delete this.attrs[name];},
    getAttribute(name){return name==='data-rs-next-label'?'Next '+(i+1):null;},
    querySelector(selector){return selector==='h2'?{textContent:'Title '+i}:null;},
    getBoundingClientRect(){return {top:i*700-scrollY};}
  }));
  const icons=Array.from({length:10},(_,i)=>({
    classList:classList(),attrs:{'data-index':String(i),'aria-pressed':String(i===0)},
    getAttribute(name){return this.attrs[name]??null;},
    setAttribute(name,value){this.attrs[name]=value;},
    closest(selector){return selector==='[data-rs-icon]'?this:null;}
  }));
  for(const key of ['data-rs-step','data-rs-orbit-index','data-rs-orbit-title','data-rs-next','data-rs-announcement'])nodes['['+key+']']={textContent:''};
  nodes['.rs-spiral-stage']={getBoundingClientRect(){return {top:0};}};
  const section={
    isConnected:true,classList:classList(),style:{setProperty(){},removeProperty(){}},
    querySelectorAll(selector){return selector==='[data-rs-card]'?cards:selector==='[data-rs-icon]'?icons:[];},
    querySelector(selector){return nodes[selector]||null;},
    contains(node){return icons.includes(node);},
    getBoundingClientRect(){return {top:-scrollY,bottom:10000-scrollY,height:10000};}
  };
  const app={
    querySelector(selector){return selector==='.apple-home-page .rs-spiral-section'?section:null;},
    addEventListener(type,fn){actions[type]=fn;}
  };
  const ctx={
    location:{pathname:'/'},
    navigator:{connection:{saveData:false},deviceMemory:8},
    innerWidth:mobile?390:1440,innerHeight:1000,
    get scrollY(){return scrollY;},
    scrollTo({top}){scrollY=top;},
    requestAnimationFrame(fn){frames.push(fn);return frames.length;},
    cancelAnimationFrame(){},
    performance:{now:()=>0},
    setTimeout(fn){return 1;},clearTimeout(){},
    MutationObserver:class {observe(){}},
    document:{readyState:'complete',getElementById(id){return id==='app'?app:null;}},
    addEventListener(type,fn){listeners[type]=fn;},
    window:{matchMedia(query){return {matches:query.includes('reduced-motion')?reduced:mobile,addEventListener(){}};}
  };
  vm.runInNewContext(motion,ctx);
  const flush=()=>{while(frames.length)frames.shift()();};
  flush();
  const click=i=>{let prevented=false;actions.click({
    target:icons[i],preventDefault(){prevented=true;}
  });flush();return prevented;};
  return {cards,icons,nodes,section,ctx,click,flush,listeners,
    scrollTop:()=>scrollY,setScroll:y=>{scrollY=y;listeners.scroll();flush();}};
}
test('all ten orbit glyphs are native labelled keyboard-accessible buttons in FI/SV/EN',()=>{
  for(const lang of ['fi','sv','en']){
    const t=(fi,sv,en)=>({fi,sv,en})[lang];
    const html=spiralHeroMarkup(t,lang);
    assert.equal((html.match(/<button type="button" class="rs-studio-orbit-icon/g)||[]).length,10);
    assert.equal((html.match(/aria-pressed="(?:true|false)"/g)||[]).length,10);
    assert.match(html,/class="rs-spiral-orbit" role="group"/);
    assert.match(html,/data-index="8"[^>]+aria-label="[^"]+"/);
    assert.doesNotMatch(html,/rs-studio-orbit-art" aria-hidden="true"/);
    assert.doesNotMatch(html,/data-rs-icon[^>]*aria-hidden="true"/);
  }
});
test('button click selects the same scene, copy and counter as normal scrolling',()=>{
  const page=fakePage();
  assert.equal(page.section.classList.contains('rs-enhanced'),true);
  assert.equal(page.click(8),true);
  assert.equal(page.scrollTop(),8000);
  assert.equal(page.nodes['[data-rs-orbit-title]'].textContent,'Title 8');
  assert.equal(page.nodes['[data-rs-step]'].textContent,'09');
  for(let i=0;i<10;i++){
    assert.equal(page.icons[i].classList.contains('is-active'),i===8);
    assert.equal(page.icons[i].attrs['aria-pressed'],String(i===8));
    assert.equal(page.cards[i].attrs['aria-hidden'],String(i!==8));
  }
  page.click(2);
  assert.equal(page.scrollTop(),2000);
  assert.equal(page.nodes['[data-rs-orbit-title]'].textContent,'Title 2');
  page.click(9);
  assert.equal(page.scrollTop(),9000);
  assert.equal(page.nodes['[data-rs-orbit-title]'].textContent,'Title 9');
  page.click(0);
  assert.equal(page.scrollTop(),0);
});
test('native scroll updates the same active button after clicking a chapter',()=>{
  const page=fakePage();
  page.click(7);
  page.setScroll(4000);
  assert.equal(page.nodes['[data-rs-orbit-title]'].textContent,'Title 4');
  assert.equal(page.icons[4].attrs['aria-pressed'],'true');
  assert.equal(page.icons[7].attrs['aria-pressed'],'false');
});
test('coarse pointer uses same chapter jump without hijacking mobile scrolling',()=>{
  const page=fakePage({mobile:true});
  assert.equal(page.click(5),true);
  assert.equal(page.scrollTop(),5000);
  assert.equal(page.icons[5].attrs['aria-pressed'],'true');
  assert.equal(page.nodes['[data-rs-orbit-title]'].textContent,'Title 5');
});
test('reduced-motion fallback jumps to the actual card without enhancing the scene',()=>{
  const page=fakePage({reduced:true});
  assert.equal(page.section.classList.contains('rs-enhanced'),false);
  assert.equal(page.click(6),true);
  assert.equal(page.scrollTop(),4200);
  assert.equal(page.icons[6].attrs['aria-pressed'],'true');
});
test('click bindings are delegated and asset URLs are versioned',()=>{
  const css=fromPublic('studio-home.css');
  const index=fromPublic('index.html');
  const app=fromPublic('app.js');
  const apple=fromPublic('apple-home.js');
  assert.match(css,/pointer-events:auto!important;touch-action:manipulation/);
  assert.match(css,/rs-studio-orbit-icon\[data-rs-icon\]:focus-visible/);
  assert.match(motion,/app\.addEventListener\('click', onOrbitClick\)/);
  assert.match(motion,/navigateToChapter\(index\)/);
  assert.match(index,/spiral-hero-motion\.js\?v=[^"]+-orbit-click-v1/);
  assert.match(index,/studio-home\.css\?v=[^"]+-orbit-click-v1/);
  assert.match(index,/app\.js\?v=[^"]+-orbit-click-v1/);
  assert.match(app,/apple-home\.js\?v=[^']+-orbit-click-v1/);
  assert.match(apple,/spiral-hero\.js\?v=[^']+-orbit-click-v1/);
});
