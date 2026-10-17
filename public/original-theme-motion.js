/* Motion-only improvements for the original Respondo theme.
   No markup inserted, no copy, colors, layout, routing, forms or bot data changed. */
(function(){
  'use strict';
  if(location.pathname!=='/' || !document.getElementById('app'))return;
  var app=document.getElementById('app');
  var reduce=matchMedia('(prefers-reduced-motion: reduce)');
  var fine=matchMedia('(min-width: 850px) and (hover: hover) and (pointer: fine)');
  var page=null, hero=null, stage=null, chat=null, cards=[], halo=null, type=null;
  var ticking=false, observer=null, monitored=new WeakSet(), bound=false;
  function clamp(n,min,max){return Math.max(min,Math.min(max,n))}
  // Scroll is a reversible film timeline: no autoplay sequence and no scroll hijacking.
  // Read offsetTop rather than transformed getBoundingClientRect to avoid feedback jitter.
  var virtualY=window.scrollY;
  function topOf(el){
    var y=0,node=el;
    while(node && node.nodeType===1){y+=(node.offsetTop||0);node=node.offsetParent}
    return y;
  }
  function smoothstep(t){t=clamp(t,0,1);return t*t*(3-2*t)}
  function inFrame(el,leading,span){
    if(!el)return 1;
    return smoothstep((virtualY+innerHeight*leading-topOf(el))/Math.max(1,innerHeight*span));
  }
  function set(el,prop,value){if(el)el.style.setProperty(prop,value)}
  function px(n){return n.toFixed(1)+'px'}
  function deg(n){return n.toFixed(2)+'deg'}
  function scalar(n){return n.toFixed(3)}

  function refresh(){
    var next=app.querySelector('.apple-home-page');
    if(!next || reduce.matches)return;
    if(page===next)return;
    page=next;
    hero=page.querySelector('.apple-hero');
    stage=page.querySelector('.apple-product-stage');
    chat=page.querySelector('.apple-chat-preview');
    halo=page.querySelector('.apple-stage-halo');
    type=page.querySelector('.apple-stage-typography');
    cards=Array.from(page.querySelectorAll('.apple-feature-card'));
    page.classList.add('motion-only-enabled');
    prepareReveal();
    bindPointer();
    update();
  }
  function prepareReveal(){
    if(!('IntersectionObserver' in window))return;
    if(observer)observer.disconnect();
    observer=new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.remove('mo-reveal-pending');
          entry.target.classList.add('mo-reveal-visible');
          observer.unobserve(entry.target);
        }
      });
    },{threshold:.08,rootMargin:'0px 0px -32px 0px'});
    var candidates=Array.from(page.querySelectorAll('.apple-feature-card .apple-card-content h3, .apple-lead-intro h2, .apple-bottom-cta .apple-pill'));
    candidates.forEach(function(el,i){
      if(monitored.has(el))return;
      monitored.add(el);
      el.classList.add('mo-reveal');
      var rect=el.getBoundingClientRect();
      if(rect.top < innerHeight-36){
        el.classList.add('mo-reveal-visible');
        return;
      }
      el.style.setProperty('--mo-entrance-x',i%2 ? '37px':'-37px');
      el.classList.add('mo-reveal-pending');
      observer.observe(el);
    });
  }
  function bindPointer(){
    if(!fine.matches || !stage || stage.dataset.motionPointer==='1')return;
    stage.dataset.motionPointer='1';
    stage.addEventListener('pointermove',function(e){
      var r=stage.getBoundingClientRect();
      if(!r.width || !r.height)return;
      var x=clamp((e.clientX-r.left)/r.width-.5,-.5,.5);
      var y=clamp((e.clientY-r.top)/r.height-.5,-.5,.5);
      if(chat){
        chat.style.setProperty('--mo-yaw',(x*11).toFixed(2)+'deg');
        chat.style.setProperty('--mo-pitch',(-y*9).toFixed(2)+'deg');
      }
    },{passive:true});
    stage.addEventListener('pointerleave',function(){
      if(chat){
        chat.style.setProperty('--mo-yaw','0deg');
        chat.style.setProperty('--mo-pitch','0deg');
      }
    });
    cards.forEach(function(card){
      var art=card.querySelector('.apple-card-art');
      if(!art||card.dataset.motionPointer==='1')return;
      card.dataset.motionPointer='1';
      card.addEventListener('pointermove',function(e){
        var r=card.getBoundingClientRect();
        var x=clamp((e.clientX-r.left)/r.width-.5,-.5,.5);
        var y=clamp((e.clientY-r.top)/r.height-.5,-.5,.5);
        art.style.setProperty('--mo-art-yaw',(x*4.5).toFixed(2)+'deg');
        art.style.setProperty('--mo-art-pitch',(-y*3.5).toFixed(2)+'deg');
      },{passive:true});
      card.addEventListener('pointerleave',function(){
        art.style.setProperty('--mo-art-yaw','0deg');
        art.style.setProperty('--mo-art-pitch','0deg');
      });
    });
  }

  function update(){
    ticking=false;
    if(!page || !page.isConnected || reduce.matches)return;
    var actual=window.scrollY;
    var difference=actual-virtualY;
    virtualY+=difference*.29;
    if(Math.abs(difference)<.3)virtualY=actual;
    var vh=Math.max(innerHeight,1),vw=Math.max(innerWidth,1);
    var mobile=vw<=700;
    // Scene 1: the existing chatbot moves towards the camera as the hero passes.
    if(hero){
      var hp=clamp((virtualY-topOf(hero))/Math.max(1,hero.offsetHeight*.76),0,1);
      var cinematic=smoothstep(hp);
      var heading=hero.querySelector('h1');
      var desc=hero.querySelector('.apple-hero-description');
      var note=hero.querySelector('.apple-sample-note');
      set(heading,'--mo-title-y',px(-cinematic*(mobile?38:95)));
      set(heading,'--mo-title-scale',scalar(1-cinematic*.095));
      set(heading,'--mo-title-opacity',scalar(1-cinematic*.33));
      set(desc,'--mo-description-y',px(-cinematic*(mobile?22:57)));
      set(desc,'--mo-description-opacity',scalar(1-cinematic*.25));
      set(stage,'--mo-stage-y',px(-cinematic*(mobile?22:98)));
      set(stage,'--mo-stage-scale',scalar(1+cinematic*(mobile?.1:.23)));
      set(chat,'--mo-chat-y',px(-cinematic*(mobile?19:54)));
      set(chat,'--mo-chat-z',px(cinematic*115));
      set(chat,'--mo-chat-scale',scalar(1+cinematic*(mobile?.28:.54)));
      set(chat,'--mo-film-yaw',deg(cinematic*(mobile?-4:10)));
      set(chat,'--mo-film-pitch',deg(-cinematic*7));
      set(halo,'--mo-halo-y',px(cinematic*35));
      set(halo,'--mo-halo-scale',scalar(1+cinematic*.8));
      set(type,'--mo-type-y',px(cinematic*30));
      set(type,'--mo-type-scale',scalar(1+cinematic*(mobile?.44:1.2)));
      set(type,'--mo-type-rotate',deg(-cinematic*6));
      set(note,'--mo-note-y',px(-cinematic*17));
      set(note,'--mo-note-opacity',scalar(1-cinematic*.32));
    }
    // Scene 2: original feature cards fly into focus from alternating sides.
    var intro=page.querySelector('.apple-highlights-intro');
    if(intro){
      var hi=inFrame(intro,.95,.72);
      var title=intro.querySelector('h2');
      set(title,'--mo-heading-mask',((1-hi)*54).toFixed(1)+'%');
      set(title,'--mo-heading-y',px((1-hi)*44));
      set(title,'--mo-heading-scale',scalar(.91+.09*hi));
    }
    cards.forEach(function(card,i){
      var p=inFrame(card,.96,.7);
      var end=topOf(card)+(card.offsetHeight||0);
      var exit=smoothstep((virtualY+vh*.09-end)/(vh*.42));
      var sign=i%2===0?-1:1;
      var x=sign*(1-p)*Math.min(mobile?75:205,vw*(mobile?.19:.2))-sign*exit*24;
      var y=(1-p)*(mobile?70:142)-exit*26;
      var rot=sign*(1-p)*(mobile?10:26)-sign*exit*6;
      set(card,'--mo-card-x',px(x));
      set(card,'--mo-card-y',px(y));
      set(card,'--mo-card-rx',deg((1-p)*11-exit*2));
      set(card,'--mo-card-ry',deg(rot));
      set(card,'--mo-card-scale',scalar((mobile?.86:.77)+(mobile?.14:.23)*p-.045*exit));
      set(card,'--mo-card-opacity',scalar(.64+.36*p-.1*exit));
      var active=virtualY+vh>topOf(card)-180 && virtualY<end+180;
      card.classList.toggle('mo-in-range',active);
      var art=card.querySelector('.apple-card-art');
      set(art,'--mo-art-offset',px((.5-p)*(mobile?34:100)+exit*18));
      set(art,'--mo-art-scale',scalar(.86+.2*p));
      if(i===0){
        var clock=card.querySelector('.apple-clock-face');
        set(clock,'--mo-clock-scale',scalar(.83+.25*p));
      }
      if(i===1){
        var orbit=card.querySelector('.apple-orbit-ring');
        set(orbit,'--mo-orbit-angle',deg(-30+p*325+exit*35));
        set(orbit,'--mo-orbit-scale',scalar(.77+p*.27));
      }
      if(i===2){
        var language=card.querySelector('.apple-art-language');
        set(language,'--mo-language-base',px((1-p)*(mobile?17:47)));
        card.querySelectorAll('.apple-art-language span').forEach(function(el,j){
          set(el,'--mo-language-shift',px((j-1)*(1-p)*(mobile?17:70)));
        });
      }
    });
    // Scene 3: the existing, working calculator arrives in a gentle 3D dive.
    var calculator=page.querySelector('.apple-lead-layout');
    if(calculator){
      var cp=inFrame(calculator,.95,.72);
      set(calculator,'--mo-calc-y',px((1-cp)*(mobile?53:95)));
      set(calculator,'--mo-calc-tilt',deg((1-cp)*12));
      set(calculator,'--mo-calc-scale',scalar(.88+.12*cp));
      set(calculator,'--mo-calc-opacity',scalar(.72+.28*cp));
      set(calculator.querySelector('.apple-lead-total'),'--mo-total-scale',scalar(.84+.16*cp));
    }
    // Scene 4: closing CTA comes forward, as the final shot.
    var closing=page.querySelector('.apple-bottom-cta');
    if(closing){
      var fp=inFrame(closing,.96,.75);
      var caption=closing.querySelector('p');
      set(caption,'--mo-cta-y',px((1-fp)*(mobile?58:115)));
      set(caption,'--mo-cta-rx',deg((1-fp)*15));
      set(caption,'--mo-cta-scale',scalar(.76+.24*fp));
      set(caption,'--mo-cta-opacity',scalar(.62+.38*fp));
    }
    // Exponential smoothing makes individual scroll ticks look like continuous frames.
    if(Math.abs(actual-virtualY)>.35)schedule();
  }
  function schedule(){
    if(ticking)return;
    ticking=true;
    requestAnimationFrame(update);
  }
  if(!bound){
    bound=true;
    addEventListener('scroll',schedule,{passive:true});
    addEventListener('resize',schedule,{passive:true});
  }
  var pending=false;
  var mo=new MutationObserver(function(){
    if(pending)return;
    pending=true;
    requestAnimationFrame(function(){pending=false;refresh()});
  });
  mo.observe(app,{childList:true});
  addEventListener('respondo:languagechange',function(){page=null;requestAnimationFrame(refresh)},{passive:true});
  if(document.readyState==='loading')addEventListener('DOMContentLoaded',refresh,{once:true});
  else refresh();
})();