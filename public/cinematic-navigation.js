/* Respondo cinematic navigation + public product storytelling.
   No SPA routing; no modification of buttons, checkout, forms, chat or policy pages. */
(function(){
  'use strict';
  var app=document.getElementById('app');if(!app)return;
  var reduce=matchMedia('(prefers-reduced-motion: reduce)');
  var touch=matchMedia('(pointer: coarse)');
  var curated='.features-page,.pricing-page,.audience-page,.seo-landing-page,.global-guide-page,.contact-page';
  var heroSel='.features-hero,.audience-hero,.seo-landing-hero,.r-brand-pricing-banner,.r-brand-contact-banner,.global-guide-hero';
  var sectionSel='.features-top10,.features-directory,.audience-section,.audience-cta,.seo-landing-section,.seo-landing-intro,.seo-landing-benefits,.seo-landing-steps,.seo-landing-faq,.seo-landing-closing,.vertical-faq-wrap,.ai-topic-body,.ai-topic-faq-area,.customer-bot-steps,.customer-bot-explain,.customer-bot-faq-section,.r-brand-flow,.global-guide-main,.pricing-section,.r-brand-contact-main';
  var cardSel='.audience-card,.feature-item,.price-card,.seo-landing-card,.seo-answer-card,.r-brand-flow-steps>div,.global-guide-card,.customer-bot-steps-grid article,.customer-bot-explain-grid article,.vertical-faq-item,.ai-topic-section';
  var titleSel='.features-hero h1,.features-directory-head h2,.audience-hero h1,.audience-section-title h2,.audience-cta h2,.seo-landing-hero h1,.seo-landing-section h2,.seo-landing-intro h2,.seo-landing-closing h2,.ai-topic-prose>h2,.ai-topic-section h2,.customer-bot-steps h2,.customer-bot-explain h2,.global-guide-hero h1,.global-guide-section h2,.r-brand-pricing-banner strong,.pricing-section .split-head h2,.r-brand-contact-banner-word,.r-brand-contact-title,.r-brand-flow-intro h2';
  var page=null,hero=null,scenes=[],cards=[],titles=[],frame=0,refreshFrame=0,leaving=false,revealObserver=null;
  var NAV_DURATION=1380,NAV_KEY='respondo-cinematic-navigation-v2';
  function clamp(n,min,max){return Math.max(min,Math.min(max,n))}
  function get(selector,root){return Array.from((root||document).querySelectorAll(selector))}
  function set(node,key,value){if(node)node.style.setProperty(key,value)}
  function veil(){
    if(document.querySelector('.cx-nav-veil'))return;
    var el=document.createElement('div');el.className='cx-nav-veil';
    el.setAttribute('aria-hidden','true');
    el.innerHTML='<div class="cx-transition-stars" aria-hidden="true"></div>'+
      '<div class="cx-nav-veil-inner"><div class="cx-arrow-stage"><i class="cx-arrow-halo"></i><i class="cx-arrow-orbit"></i><img class="cx-nav-veil-mark" src="/respondo-symbol.svg" alt="" width="166" height="166"></div><span class="cx-nav-veil-word">RESPONDO AI</span></div>'+
      '<div class="cx-bird-flight" aria-hidden="true"><i class="cx-trail cx-trail-one"></i><i class="cx-trail cx-trail-two"></i><i class="cx-trail cx-trail-three"></i><svg class="cx-bird-svg" viewBox="0 0 140 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path class="cx-bird-tail" d="M55 53 6 70l30-24L16 21l43 20Z" fill="#a6cbff"/><path class="cx-bird-wing-lower" d="M74 45Q64 80 32 99Q80 90 94 54Z" fill="#8ebfff"/><path class="cx-bird-body" d="M43 51Q61 38 75 43Q86 35 98 39Q106 42 119 40L138 45L118 50Q101 51 93 59Q71 67 43 51Z" fill="#f9fcff"/><path class="cx-bird-wing-upper" d="M64 48Q48 16 32 3Q85 13 92 50Q79 58 64 48Z" fill="#dcecff"/><path d="M117 42 137 45 117 47Z" fill="#8dbaf7"/><circle cx="105" cy="44" r="1.7" fill="#182f4c"/></svg></div>'+
      '<div class="cx-edge-flash" aria-hidden="true"></div>';
    document.body.appendChild(el);
  }
  function qualify(e,a){
    if(reduce.matches||leaving||e.defaultPrevented||e.button!==0||!a)return null;
    if(e.metaKey||e.ctrlKey||e.altKey||e.shiftKey)return null;
    if(a.hasAttribute('download')||a.hasAttribute('data-no-transition'))return null;
    if((a.getAttribute('target')||'_self').toLowerCase()!=='_self')return null;
    if(/\bexternal\b/i.test(a.getAttribute('rel')||''))return null;
    var url;try{url=new URL(a.href,location.href)}catch(_){return null}
    if(!/^https?:$/.test(url.protocol)||url.origin!==location.origin)return null;
    if(url.pathname.indexOf('/api/')===0||url.pathname.indexOf('/auth/')===0)return null;
    if(url.pathname===location.pathname&&url.search===location.search)return null;
    return url;
  }
  function release(){leaving=false;document.body.classList.remove('cx-leaving','cx-arriving','cx-arrived')}
  document.addEventListener('click',function(e){
    var a=e.target&&e.target.closest?e.target.closest('a[href]'):null;
    if(leaving&&a){e.preventDefault();e.stopImmediatePropagation();return;}
    var url=qualify(e,a);if(!url)return;
    e.preventDefault();e.stopImmediatePropagation();
    leaving=true;veil();document.body.classList.add('cx-leaving');
    try{sessionStorage.setItem(NAV_KEY,'1')}catch(_){}
    var href=url.href;
    setTimeout(function(){location.assign(href)},NAV_DURATION);
  },true);
  addEventListener('pageshow',function(e){
    if(!e.persisted)return;
    release();
    if(reduce.matches)return;
    veil();document.body.classList.add('cx-arriving');
    requestAnimationFrame(function(){requestAnimationFrame(function(){
      document.body.classList.add('cx-arrived');setTimeout(release,850);
    })});
  });
  function arrive(){
    if(reduce.matches)return;
    var pending=false;
    try{pending=sessionStorage.getItem(NAV_KEY)==='1';sessionStorage.removeItem(NAV_KEY)}catch(_){}
    if(!pending)return;
    veil();document.body.classList.add('cx-arriving');
    var finished=false;
    function reveal(){
      if(finished)return;finished=true;
      requestAnimationFrame(function(){requestAnimationFrame(function(){
        document.body.classList.add('cx-arrived');setTimeout(release,850);
      })});
    }
    function ready(){
      if(app.firstElementChild&&!document.documentElement.classList.contains('respondo-awaiting-client'))reveal();
    }
    var mo=new MutationObserver(ready);mo.observe(app,{childList:true});
    setTimeout(function(){mo.disconnect();reveal()},1250);ready();
  }
  function addHeroFX(node){
    if(node.querySelector(':scope > .cx-hero-fx'))return;
    node.classList.add('cx-cinematic-hero');
    var layer=document.createElement('div');layer.className='cx-hero-fx';
    layer.setAttribute('aria-hidden','true');
    layer.innerHTML='<div class="cx-glow"></div><div class="cx-grid"></div><div class="cx-ring"></div><div class="cx-light-shaft"></div><div class="cx-camera-floor"></div><div class="cx-pulse-disc"></div>';
    node.insertBefore(layer,node.firstChild);
  }
  function revealHeadings(){
    if(revealObserver)revealObserver.disconnect();
    if(!('IntersectionObserver' in window)||reduce.matches){
      titles.forEach(function(el){el.classList.add('cx-reveal-visible')});return;
    }
    revealObserver=new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(!entry.isIntersecting)return;
        entry.target.classList.remove('cx-reveal-pending');
        entry.target.classList.add('cx-reveal-visible');
        revealObserver.unobserve(entry.target);
      });
    },{threshold:.08,rootMargin:'0px 0px -35px 0px'});
    titles.forEach(function(el,i){
      var r=el.getBoundingClientRect();
      if(r.top<innerHeight*.82||r.bottom<=0){
        el.classList.remove('cx-reveal-pending');el.classList.add('cx-reveal-visible');
      }else{
        set(el,'--cx-delay',(i%3*70)+'ms');
        el.classList.add('cx-reveal-pending');
        revealObserver.observe(el);
      }
    });
  }
  function decorate(){
    var root=app.firstElementChild;
    if(!root||!root.matches(curated)){
      page=null;hero=null;scenes=[];cards=[];titles=[];
      document.querySelector('.cx-story-progress')?.remove();
      document.querySelector('.cx-chapter-dial')?.remove();return;
    }
    page=root;page.classList.add('cx-public-immersive');
    var main=page.querySelector('main');if(!main)return;
    var heroes=get(heroSel,main);
    heroes.forEach(addHeroFX);hero=heroes[0]||null;
    scenes=get(sectionSel,main).slice(0,24);
    scenes.forEach(function(el){
      el.setAttribute('data-cx-section','');
      if(!el.querySelector(':scope > .cx-scene-light')){
        var light=document.createElement('div');light.className='cx-scene-light';
        light.setAttribute('aria-hidden','true');light.innerHTML='<i class="cx-scene-grid"></i><i class="cx-scene-arc"></i>';el.insertBefore(light,el.firstChild);
      }
    });
    cards=get(cardSel,main).slice(0,32);
    cards.forEach(function(el,i){el.classList.add('cx-depth-card');el.style.setProperty('--cx-card-order',String(i));});
    titles=get(titleSel,main).slice(0,42);
    titles.forEach(function(el){el.setAttribute('data-cx-reveal','');el.setAttribute('data-cx-headline','')});
    revealHeadings();
    if(!document.querySelector('.cx-story-progress')){
      var bar=document.createElement('div');bar.className='cx-story-progress';bar.setAttribute('aria-hidden','true');
      bar.innerHTML='<i></i>';document.body.appendChild(bar);
    }
    if(!document.querySelector('.cx-chapter-dial')&&!reduce.matches){
      var dial=document.createElement('div');dial.className='cx-chapter-dial';
      dial.setAttribute('aria-hidden','true');
      dial.innerHTML='<span class="cx-dial-name">RESPONDO</span><strong class="cx-dial-count">01 / 01</strong><i class="cx-dial-track"><i></i></i>';
      document.body.appendChild(dial);
    }
    scheduleScroll();
  }
  function scheduleRefresh(){
    if(refreshFrame)return;
    refreshFrame=requestAnimationFrame(function(){
      refreshFrame=0;
      var root=app.firstElementChild;
      var unseenFlow=root&&root.querySelector('.r-brand-flow:not([data-cx-section])');
      var unseenHero=root&&get(heroSel,root).some(function(el){return !el.classList.contains('cx-cinematic-hero')});
      if(root!==page||unseenFlow||unseenHero||(page&&hero&&!hero.isConnected))decorate();
    });
  }
  function updateScroll(){
    frame=0;if(!page||!page.isConnected||reduce.matches)return;
    var vh=innerHeight||800,mobile=touch.matches||innerWidth<780;
    var full=Math.max(1,document.documentElement.scrollHeight-vh);
    var bar=document.querySelector('.cx-story-progress');
    set(bar,'--cx-scroll-progress',(clamp(scrollY/full,0,1)*100).toFixed(2)+'%');
    if(hero){
      var rect=hero.getBoundingClientRect(),t=clamp(-rect.top/Math.max(1,rect.height),0,1);
      set(hero,'--cx-hero-shift',(t*(mobile?22:85)).toFixed(1)+'px');
      set(hero,'--cx-hero-scale',(1+t*.34).toFixed(3));
      set(hero,'--cx-hero-visible',(1-t*.32).toFixed(3));
      set(hero,'--cx-grid-spin',(-13+t*28).toFixed(1)+'deg');
      set(hero,'--cx-ring-spin',(-15+t*160).toFixed(1)+'deg');
      set(hero,'--cx-ring-scale',(1+t*.5).toFixed(3));
      set(hero.querySelector('h1'),'--cx-title-rise',(-t*(mobile?20:57)).toFixed(1)+'px');
      set(hero,'--cx-art-y',(-t*(mobile?12:65)).toFixed(1)+'px');
      set(hero,'--cx-art-scale',(1+t*.32).toFixed(3));
      set(hero,'--cx-camera-shift',(-t*(mobile?36:210)).toFixed(1)+'px');
      set(hero,'--cx-camera-scale',(1+t*.78).toFixed(3));
      set(hero,'--cx-camera-rotate',(-12+t*39).toFixed(1)+'deg');
      set(hero,'--cx-pulse-size',(0.5+t*1.7).toFixed(3));
      set(hero,'--cx-pulse-opacity',(0.22+t*.45).toFixed(3));
    }
    var activeScene=-1;
    scenes.forEach(function(node,index){
      var r=node.getBoundingClientRect();
      if(r.top<vh*.55&&r.bottom>vh*.48)activeScene=index;
      if(r.bottom< -vh*.15||r.top>vh*1.15)return;
      var p=clamp((vh*.88-r.top)/Math.max(vh*.72,r.height),0,1);
      set(node,'--cx-section-p',p.toFixed(3));
      set(node,'--cx-scene-shift',((p-.5)*(mobile?45:120)).toFixed(1)+'px');
      set(node,'--cx-scene-opacity',(.12+.64*Math.sin(p*Math.PI)).toFixed(3));
      set(node,'--cx-scene-rotate',(-28+p*165).toFixed(1)+'deg');
      set(node,'--cx-scene-grid-scale',(.8+p*.8).toFixed(3));
      set(node,'--cx-scene-lift',((.5-p)*(mobile?38:180)).toFixed(1)+'px');
    });
    var dial=document.querySelector('.cx-chapter-dial');
    if(dial&&scenes.length){
      var active=Math.max(0,activeScene);
      var counter=dial.querySelector('.cx-dial-count');
      if(counter)counter.textContent=String(active+1).padStart(2,'0')+' / '+String(scenes.length).padStart(2,'0');
      set(dial,'--cx-dial-progress',(((active+1)/scenes.length)*100).toFixed(2)+'%');
    }
    cards.forEach(function(node,index){
      var r=node.getBoundingClientRect();if(r.bottom< -80||r.top>vh+95)return;
      var v=clamp((r.top+r.height/2-vh/2)/vh,-1,1);
      set(node,'--cx-depth-y',(-v*(mobile?5:20)).toFixed(1)+'px');
      set(node,'--cx-depth-scale',mobile?'1':(1-Math.abs(v)*.035).toFixed(3));
      set(node,'--cx-depth-yaw',mobile?'0deg':(v*11).toFixed(2)+'deg');
      var enter=clamp((vh*(mobile?.96:1.05)-r.top)/(vh*(mobile?.56:.68)),0,1);
      enter=enter*enter*(3-2*enter);
      var sign=(index%2===0)?-1:1;
      set(node,'--cx-enter-x',(sign*(1-enter)*(mobile?16:115)).toFixed(1)+'px');
      set(node,'--cx-enter-y',((1-enter)*(mobile?35:115)).toFixed(1)+'px');
      set(node,'--cx-enter-roll',(sign*(1-enter)*(mobile?1.5:7)).toFixed(2)+'deg');
      set(node,'--cx-card-opacity',(.46+.54*enter).toFixed(3));
      set(node,'--cx-depth-scale',mobile?(0.92+.08*enter).toFixed(3):(.74+.26*enter-Math.abs(v)*.025).toFixed(3));
      set(node,'--cx-card-light',(enter*.95).toFixed(3));
    });
    titles.forEach(function(node){
      if(!node.isConnected||!node.classList.contains('cx-reveal-visible'))return;
      var r=node.getBoundingClientRect();if(r.bottom<0||r.top>vh)return;
      var v=clamp((vh-r.top)/(vh+r.height),0,1);
      set(node,'--cx-head-y',((.5-v)*(mobile?6:15)).toFixed(1)+'px');
      set(node,'--cx-head-scale',mobile?'1':(1+(v-.5)*.015).toFixed(3));
    });
  }
  function scheduleScroll(){if(!frame)frame=requestAnimationFrame(updateScroll)}
  if(!reduce.matches){
    addEventListener('scroll',scheduleScroll,{passive:true});
    addEventListener('resize',scheduleScroll,{passive:true});
    if(!touch.matches)addEventListener('pointermove',function(e){
      if(!hero||!hero.isConnected||e.pointerType==='touch')return;
      var r=hero.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight)return;
      set(hero,'--cx-pointer-x',(clamp((e.clientX-r.left)/Math.max(1,r.width)-.5,-.5,.5)*30).toFixed(1)+'px');
    },{passive:true});
  }
  var appObserver=new MutationObserver(scheduleRefresh);
  appObserver.observe(app,{childList:true,subtree:true});
  addEventListener('respondo:languagechange',scheduleRefresh,{passive:true});
  function init(){veil();arrive();scheduleRefresh()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
