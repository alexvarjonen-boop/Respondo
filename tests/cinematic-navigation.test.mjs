import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const file = (name) => readFile(new URL('../public/'+name, import.meta.url), 'utf8');

test('previous crash-prone cinematic engine stays unloaded while the official spiral and logo reveal are active', async () => {
  const [index, js, css] = await Promise.all([file('index.html'), file('spiral-hero-motion.js'), file('spiral-hero.css')]);
  assert.ok(!index.includes('src="/cinematic-navigation.js'));
  assert.ok(!index.includes('href="/cinematic-navigation.css'));
  assert.match(index, /\/unified-motion\.js/);
  assert.match(index, /\/logo-reveal\.js/);
  assert.match(index, /\/spiral-hero-motion\.js/);
  assert.match(index, /\/spiral-hero\.css/);
  assert.doesNotThrow(() => new Function(js));
  assert.match(js, /prefers-reduced-motion: reduce/);
  assert.match(js, /saveData/);
  assert.match(js, /requestAnimationFrame\(draw\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});

test('marketing effects intentionally exclude legal text, footer, checkout and dashboard', async () => {
  const [js,css,app] = await Promise.all([file('cinematic-navigation.js'),file('cinematic-navigation.css'),file('app.js')]);
  assert.match(js, /curated='\.features-page,\.pricing-page,\.audience-page,\.seo-landing-page,\.global-guide-page,\.contact-page'/);
  assert.doesNotMatch(js, /\.legalpage,|\.signup-page,|\.appshell,|\.dashboard-page,/);
  assert.doesNotMatch(css, /#app \.footer[\s,{]/);
  assert.match(css, /#app \.cx-public-immersive main/);
  assert.match(app, /if \(path === '\/'\) html = await home\(\)/);
  assert.match(app, /path === '\/tilaus'/);
  assert.match(app, /path === '\/app'/);
});

function harness(reduced=false) {
  const listeners = {};
  const pageListeners = {};
  const classes = new Set();
  const timeouts = [];
  let veil = null;
  let assigned = null;
  const classList = {
    add(...items){items.forEach(a=>classes.add(a))},
    remove(...items){items.forEach(a=>classes.delete(a))},
    contains(v){return classes.has(v)}
  };
  const app = {firstElementChild:null};
  const document = {
    readyState:'loading',
    body:{classList,appendChild(el){if(el.className==='cx-nav-veil')veil=el}},
    documentElement:{classList:{contains(){return false}}},
    getElementById(name){return name==='app'?app:null},
    querySelector(sel){return sel==='.cx-nav-veil'?veil:null},
    createElement(){return {className:'',innerHTML:'',setAttribute(){}}},
    addEventListener(type,fn){listeners[type]=fn}
  };
  const location = {
    href:'https://respondoai.fi/',
    pathname:'/',search:'',origin:'https://respondoai.fi',
    assign(value){assigned=value}
  };
  const memory=new Map();
  const sandbox = {
    document,location,
    matchMedia(){return {matches:reduced}},
    addEventListener(type,fn){pageListeners[type]=fn},
    requestAnimationFrame(){return 1},
    setTimeout(fn,delay){timeouts.push({fn,delay});return timeouts.length},
    sessionStorage:{getItem(k){return memory.get(k)||null},setItem(k,v){memory.set(k,v)},removeItem(k){memory.delete(k)}},
    MutationObserver:class {observe(){} disconnect(){}},
    URL
  };
  return {
    context:vm.createContext(sandbox),listeners,pageListeners,classes,timeouts,memory,
    get veil(){return veil},
    get assigned(){return assigned},
    link(href,extra={}) {
      const link={href,target:'_self',hasAttribute(){return false},getAttribute(n){return n==='target'?'_self':''},...extra};
      const click = {button:0,defaultPrevented:false,target:{closest(){return link}},
        preventDefault(){this.defaultPrevented=true},
        stopImmediatePropagation(){this.stopped=true}};
      return {click,link};
    }
  };
}

test('same-origin navigation animates once and keeps normal navigation semantics', async () => {
  const source=await file('cinematic-navigation.js'),env=harness();
  vm.runInContext(source,env.context);
  env.listeners.DOMContentLoaded();
  assert.ok(env.veil,'transition veil should exist');
  const external=env.link('https://example.com/hinnat');
  env.listeners.click(external.click);
  assert.equal(external.click.defaultPrevented,false);
  const samePage=env.link('https://respondoai.fi/#features');
  env.listeners.click(samePage.click);
  assert.equal(samePage.click.defaultPrevented,false);
  const oauth=env.link('https://respondoai.fi/api/auth/oauth/google/start');
  env.listeners.click(oauth.click);
  assert.equal(oauth.click.defaultPrevented,false);
  const modified=env.link('https://respondoai.fi/ominaisuudet');
  modified.click.metaKey=true;
  env.listeners.click(modified.click);
  assert.equal(modified.click.defaultPrevented,false);
  const internal=env.link('https://respondoai.fi/ominaisuudet?lang=fi');
  env.listeners.click(internal.click);
  assert.equal(internal.click.defaultPrevented,true);
  assert.equal(internal.click.stopped,true);
  assert.ok(env.classes.has('cx-leaving'));
  assert.equal(env.timeouts.find(t=>t.delay===1380)?.delay,1380);
  assert.match(env.veil.innerHTML,/cx-bird-flight/);
  assert.match(env.veil.innerHTML,/cx-bird-svg/);
  assert.match(env.veil.innerHTML,/respondo-symbol.svg/);
  env.timeouts.find(t=>t.delay===1380).fn();
  assert.equal(env.assigned,'https://respondoai.fi/ominaisuudet?lang=fi');
});

test('reduced-motion visitors navigate immediately without transition interception', async () => {
  const env=harness(true),source=await file('cinematic-navigation.js');
  vm.runInContext(source,env.context);
  const internal=env.link('https://respondoai.fi/hinnat');
  env.listeners.click(internal.click);
  assert.equal(internal.click.defaultPrevented,false);
  assert.equal(env.assigned,null);
  assert.equal(env.classes.has('cx-leaving'),false);
});

test('bird originates at the official arrow tip and reaches the far screen edge', async () => {
  const [js,css] = await Promise.all([file('cinematic-navigation.js'),file('cinematic-navigation.css')]);
  assert.match(js, /cx-arrow-stage/);
  assert.match(js, /cx-bird-flight/);
  assert.match(css, /left:calc\(50% \+ 75px\);top:calc\(50% - 65px\)/);
  assert.match(css, /translate3d\(calc\(60vw \+ 130px\),-27vh,0\)/);
  assert.match(css, /cx-flight-trail/);
  assert.match(css, /body\.cx-leaving \.cx-edge-flash/);
  assert.match(css, /@media\(max-width:760px\)/);
});
