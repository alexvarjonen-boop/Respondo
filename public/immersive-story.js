/* RESPONDO / Storyboard v3.
 * Motion is tied to real scroll position. Existing catalogue, price cards,
 * content, route handling, checkout, dashboards and legal content stay intact.
 */
(function(){
  'use strict';
  var app=document.getElementById('app'); if(!app)return;
  var reduced=matchMedia('(prefers-reduced-motion: reduce)');
  var fine=matchMedia('(hover: hover) and (pointer: fine)');
  var page=null,feature=null,home=null,otherScenes=[],frame=0,watchFrame=0;
  var initialized=new WeakSet();
  function q(s,r){return(r||document).querySelector(s)}
  function qa(s,r){return Array.from((r||document).querySelectorAll(s))}
  function clamp(v,a,b){return Math.min(b,Math.max(a,v))}
  function set(e,n,v){if(e)e.style.setProperty(n,v)}
  function position(e){var y=0;while(e&&e.nodeType===1){y+=e.offsetTop||0;e=e.offsetParent}return y}
  function language(){
    var raw=new URLSearchParams(location.search).get('lang')||document.documentElement.lang||'fi';
    return ['sv','en'].includes(raw.slice(0,2))?raw.slice(0,2):'fi';
  }
  function tr(fi,sv,en){var l=language();return l==='sv'?sv:l==='en'?en:fi}
  var orbital='<svg class="cx3-orbital-svg" viewBox="0 0 440 440" aria-hidden="true" focusable="false">'+
    '<defs><linearGradient id="cx3Orb" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#c5e9ff"/><stop offset="1" stop-color="#4665d3"/></linearGradient></defs>'+
    '<circle cx="220" cy="220" r="157" fill="none" stroke="#7c9bd7" stroke-opacity=".24" stroke-width="1"/>'+
    '<circle cx="220" cy="220" r="114" fill="none" stroke="#abd4ff" stroke-opacity=".31" stroke-width="1"/>'+
    '<circle cx="220" cy="220" r="72" fill="none" stroke="#ffffff" stroke-opacity=".3" stroke-width="1"/>'+
    '<path class="cx3-energy-path" pathLength="100" d="M64 220 A156 156 0 1 1 376 220 A156 156 0 1 1 64 220" fill="none" stroke="url(#cx3Orb)" stroke-linecap="round" stroke-width="2.4"/>'+
    '<path d="M220 106V334M106 220H334" stroke="#7a9ad5" stroke-opacity=".22" stroke-width="1"/>'+
    '<circle class="cx3-orbit-node cx3-orbit-node-a" cx="220" cy="64" r="6" fill="#e9f7ff"/>'+
    '<circle class="cx3-orbit-node cx3-orbit-node-b" cx="334" cy="220" r="5" fill="#97bcff"/>'+
    '<circle class="cx3-orbit-node cx3-orbit-node-c" cx="220" cy="334" r="4.5" fill="#a4f0f5"/></svg>';
  function setupFeatures(root){
    var section=q('.features-directory',root),catalog=q('.features-directory-grid',section);
    if(!section||!catalog||q('.cx3-story-layout',section))return;
    var entries=qa(':scope > details.feature-category',catalog);
    if(!entries.length)return;
    var wrapper=document.createElement('div');wrapper.className='cx3-story-layout';
    var stage=document.createElement('aside');stage.className='cx3-story-stage';
    stage.setAttribute('aria-label',tr('Ominaisuuksien animoitu esittely','Animerad funktionsöversikt','Animated feature overview'));
    stage.innerHTML='<div class="cx3-stage-background" aria-hidden="true"><i class="cx3-light-cone"></i><i class="cx3-tunnel"></i></div>'+
      '<div class="cx3-stage-top"><span class="cx3-stage-overline">RESPONDO / '+tr('OMINAISUUDET','FUNKTIONER','FEATURES')+'</span><span class="cx3-stage-counter">01 / '+String(entries.length).padStart(2,'0')+'</span></div>'+
      '<div class="cx3-orbit-world" aria-hidden="true">'+orbital+
      '<div class="cx3-rotor"><div class="cx3-rotor-line"></div><div class="cx3-rotor-panel cx3-rotor-panel-a"><span>01</span><i></i><i></i></div><div class="cx3-rotor-panel cx3-rotor-panel-b"><span>AI</span><i></i><i></i></div><div class="cx3-rotor-panel cx3-rotor-panel-c"><img src="/respondo-symbol.svg" alt=""></div></div>'+
      '<div class="cx3-orbit-core"><img src="/respondo-symbol.svg" alt=""></div></div>'+
      '<div class="cx3-stage-bottom"><p class="cx3-stage-chapter">01 — '+tr('TOIMINNOT','FUNKTIONER','CAPABILITIES')+'</p>'+
      '<h3 class="cx3-stage-title"></h3><p class="cx3-stage-subtitle"></p>'+
      '<div class="cx3-stage-meter"><i></i></div><div class="cx3-stage-hint">'+tr('Selaa nähdäksesi lisää ↓','Skrolla för att upptäcka mer ↓','Scroll to explore ↓')+'</div></div>';
    wrapper.appendChild(stage);
    catalog.parentNode.insertBefore(wrapper,catalog);wrapper.appendChild(catalog);
    entries.forEach(function(entry,i){
      entry.classList.add('cx3-feature-chapter');
      entry.style.setProperty('--cx3-chapter-index',i);
      var head=q('summary',entry);
      if(head&&!q('.cx3-category-glyph',head)){
        var mark=document.createElement('span');mark.className='cx3-category-glyph';
        mark.setAttribute('aria-hidden','true');
        mark.textContent=['✦','⌁','◈','⌘','◇','⟡'][i%6];head.insertBefore(mark,head.firstChild);
      }
    });
    feature={section:section,catalog:catalog,entries:entries,stage:stage,active:-1};
    showChapter(0);
    section.classList.add('cx3-story-ready');
  }
  function showChapter(index){
    if(!feature||index===feature.active)return;
    feature.active=index;
    var entry=feature.entries[index],stage=feature.stage;
    var label=q('summary h2',entry),description=q('summary p',entry),count=q('.feature-category-meta strong',entry);
    q('.cx3-stage-title',stage).textContent=label?label.textContent.trim():'';
    q('.cx3-stage-subtitle',stage).textContent=description?description.textContent.trim():'';
    q('.cx3-stage-counter',stage).textContent=String(index+1).padStart(2,'0')+' / '+String(feature.entries.length).padStart(2,'0');
    q('.cx3-stage-chapter',stage).textContent=String(index+1).padStart(2,'0')+' — '+(count?count.textContent.trim():'')+' '+tr('OMINAISUUTTA','FUNKTIONER','FEATURES');
    stage.setAttribute('data-cx3-active',String(index));
    feature.entries.forEach(function(e,i){e.classList.toggle('cx3-current',i===index)});
    stage.classList.remove('cx3-stage-switch');void stage.offsetWidth;stage.classList.add('cx3-stage-switch');
  }
  function setupHome(root){
    var highlights=q('.apple-highlights',root),calculator=q('.apple-lead-calculator',root);
    home={highlights:highlights,calculator:calculator};
    [highlights,calculator].forEach(function(el){
      if(!el||q(':scope > .cx3-home-atmosphere',el))return;
      var visual=document.createElement('div');visual.className='cx3-home-atmosphere';
      visual.setAttribute('aria-hidden','true');
      visual.innerHTML='<div class="cx3-home-grid"></div><div class="cx3-home-orbit cx3-home-orbit-a"></div><div class="cx3-home-orbit cx3-home-orbit-b"></div><div class="cx3-home-lens"></div>';
      el.insertBefore(visual,el.firstChild);
    });
  }
  function setupScenes(root){
    otherScenes=qa('.cx-public-immersive main .r-brand-flow,.cx-public-immersive main .audience-section,.cx-public-immersive main .pricing-section,.cx-public-immersive main .features-top10,.cx-public-immersive main .seo-landing-section,.cx-public-immersive main .seo-landing-steps,.cx-public-immersive main .global-guide-main,.cx-public-immersive main .customer-bot-steps',root).slice(0,18);
    otherScenes.forEach(function(section,i){
      if(initialized.has(section))return;
      initialized.add(section);section.classList.add('cx3-cinematic-section');
      section.style.setProperty('--cx3-scene-index',String(i));
      var world=document.createElement('div');world.className='cx3-world';
      world.setAttribute('aria-hidden','true');
      world.innerHTML='<span class="cx3-world-rim"></span><span class="cx3-world-grid"></span><span class="cx3-world-flare"></span>';
      section.insertBefore(world,section.firstChild);
    });
  }
  function refresh(){
    var root=app.firstElementChild;
    if(!root){page=null;feature=null;home=null;otherScenes=[];return}
    if(root===page&&((!root.matches('.features-page'))||feature))return;
    page=root;feature=null;home=null;otherScenes=[];
    if(root.matches('.features-page'))setupFeatures(root);
    if(root.matches('.apple-home-page'))setupHome(root);
    if(root.matches('.features-page,.pricing-page,.audience-page,.seo-landing-page,.global-guide-page,.contact-page'))setupScenes(root);
    scheduleScroll();
  }
  function scheduleRefresh(){
    if(watchFrame)return;
    watchFrame=requestAnimationFrame(function(){watchFrame=0;refresh()});
  }
  function scrollUpdate(){
    frame=0;if(!page||!page.isConnected||reduced.matches)return;
    var vh=Math.max(innerHeight,1),scroll=scrollY,mobile=innerWidth<790;
    if(feature&&feature.stage.isConnected){
      var entries=feature.entries,chosen=0,best=Infinity,reference=vh*.43;
      entries.forEach(function(el,i){
        var top=position(el)-scroll;
        var span=el.offsetHeight||150;
        var near=top<=reference&&top+span>=reference?0:Math.min(Math.abs(top-reference),Math.abs(top+span-reference));
        if(near<best){best=near;chosen=i}
        var focus=clamp((vh*.91-top)/(vh*.72+span*.24),0,1);
        set(el,'--cx3-card-focus',focus.toFixed(3));
        set(el,'--cx3-card-y',((1-focus)*(mobile?26:72)).toFixed(1)+'px');
      });
      showChapter(chosen);
      var start=position(feature.section),height=feature.section.offsetHeight||1;
      var p=clamp((scroll+vh*.4-start)/Math.max(1,height-vh*.36),0,1);
      set(feature.stage,'--cx3-scroll',p.toFixed(4));
      set(feature.stage,'--cx3-spin',(p*385).toFixed(2)+'deg');
      set(feature.stage,'--cx3-dolly',(1+p*.26).toFixed(3));
      set(feature.stage,'--cx3-meter',(p*100).toFixed(2)+'%');
      set(feature.stage,'--cx3-orbit-y',((p-.5)*(mobile?13:61)).toFixed(1)+'px');
      set(feature.stage,'--cx3-glow',(.25+p*.35).toFixed(3));
    }
    if(home){
      [home.highlights,home.calculator].forEach(function(el,i){
        if(!el)return;
        var t=position(el)-scroll,h=el.offsetHeight||1;
        if(t>vh*1.2||t+h< -vh*.15)return;
        var p=clamp((vh*.9-t)/(Math.max(vh*.75,h*.8)),0,1);
        set(el,'--cx3-home-spin',((p*(i?140:240))-(i?36:80)).toFixed(2)+'deg');
        set(el,'--cx3-home-shift',((p-.5)*(mobile?32:160)).toFixed(1)+'px');
        set(el,'--cx3-home-glow',(.12+Math.sin(p*Math.PI)*.62).toFixed(3));
      });
    }
    otherScenes.forEach(function(el,i){
      var t=position(el)-scroll,h=el.offsetHeight||1;
      if(t>vh*1.1||t+h< -vh*.2)return;
      var p=clamp((vh*.82-t)/Math.max(vh*.65,h*.68),0,1),s=p*p*(3-2*p);
      set(el,'--cx3-scene-rotate',((i%2?-1:1)*(-50+p*135)).toFixed(1)+'deg');
      set(el,'--cx3-scene-dolly',(1+s*(mobile?.25:.78)).toFixed(3));
      set(el,'--cx3-scene-y',((.5-p)*(mobile?50:180)).toFixed(1)+'px');
      set(el,'--cx3-scene-opacity',(.13+Math.sin(p*Math.PI)*.7).toFixed(3));
    });
  }
  function scheduleScroll(){if(!frame)frame=requestAnimationFrame(scrollUpdate)}
  var observer=new MutationObserver(scheduleRefresh);
  observer.observe(app,{childList:true});
  addEventListener('scroll',scheduleScroll,{passive:true});
  addEventListener('resize',scheduleScroll,{passive:true});
  addEventListener('respondo:languagechange',scheduleRefresh,{passive:true});
  function init(){scheduleRefresh()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
