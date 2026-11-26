import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source = file => readFileSync(new URL('../public/' + file, import.meta.url), 'utf8');

test('restored cinematic opening uses approved geometry and versioned assets', () => {
  const arrow = source('respondo-symbol.svg').match(/<path d="([^"]+)"/)?.[1];
  assert.ok(arrow && source('logo-reveal.js').includes(arrow));
  assert.match(source('index.html'), /href="\/logo-reveal\.css\?v=20261126-original-intro-v1"/);
  assert.match(source('index.html'), /src="\/logo-reveal\.js\?v=20261126-original-intro-v1"/);
  assert.match(source('logo-reveal.css'), /@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(source('logo-reveal.js'), /AudioContext|rl-chapter|rl-intro-skip/);
});

test('opening plays once per document, closes automatically, and replays on restored homepage', () => {
  for (const [pathname, reduced] of [['/',false],['/',true],['/app',false]]) {
    let count=0, locked=false, mutation, next=0;
    const events={}, timers=new Map(), frames=[];
    const home={isConnected:true,querySelector:()=>({})};
    const app={querySelector:()=>home};
    const body={classList:{add(){locked=true;},remove(){locked=false;}},appendChild(){count++;}};
    const doc={getElementById:()=>app,body,documentElement:{lang:'en'},readyState:'complete',
      createElement:()=>({setAttribute(){},classList:{add(){}},remove(){}})};
    const win={matchMedia:()=>({matches:reduced,addEventListener(){}}),
      addEventListener:(name,fn)=>{events[name]=fn;},
      setTimeout:(fn,delay)=>{timers.set(++next,{fn,delay});return next;}};
    vm.runInNewContext(source('logo-reveal.js'),{document:doc,window:win,location:{pathname,search:''},
      localStorage:{getItem:()=>null},URLSearchParams,clearTimeout:id=>timers.delete(id),
      requestAnimationFrame:fn=>{frames.push(fn);return frames.length;},
      MutationObserver:class{constructor(fn){mutation=fn;}observe(){}}});
    frames.splice(0).forEach(fn=>fn());
    const active=pathname==='/'&&!reduced;
    assert.equal(count,active?1:0);
    assert.equal(locked,active);
    if(active){
      mutation();frames.splice(0).forEach(fn=>fn());assert.equal(count,1);
      [...timers.values()].find(x=>x.delay===3050).fn();assert.equal(locked,false);
      events.pageshow({persisted:true});assert.equal(count,2);assert.equal(locked,true);
      events.pagehide();assert.equal(locked,false);
    }
  }
});
