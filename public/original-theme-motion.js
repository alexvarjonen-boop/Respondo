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
    var candidates=Array.from(page.querySelectorAll('.apple-highlights-intro h2, .apple-feature-card, .apple-lead-intro h2, .apple-bottom-cta p'));
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
    if(hero){
      var r=hero.getBoundingClientRect();
      var progress=clamp((-r.top)/Math.max(1,r.height),0,1);
      var move=clamp(-r.top*.075,0,46);
      if(halo){
        halo.style.setProperty('--mo-halo-y',(move*.7).toFixed(1)+'px');
        halo.style.setProperty('--mo-halo-scale',(1+progress*.07).toFixed(3));
      }
      if(type)type.style.setProperty('--mo-type-y',(move*.4).toFixed(1)+'px');
      if(chat && fine.matches){
        chat.style.setProperty('--mo-chat-y',(-progress*23).toFixed(1)+'px');
        chat.style.setProperty('--mo-chat-z',(progress*19).toFixed(1)+'px');
      }
    }
    cards.forEach(function(card,i){
      var r=card.getBoundingClientRect();
      if(r.bottom<0 || r.top>innerHeight*1.4)return;
      var phase=clamp((innerHeight*.59-(r.top+r.height*.5))/Math.max(1,innerHeight),-1,1);
      var art=card.querySelector('.apple-card-art');
      if(art)art.style.setProperty('--mo-art-offset',(phase*18).toFixed(1)+'px');
      if(i===1){
        var orbit=card.querySelector('.apple-orbit-ring');
        if(orbit)orbit.style.setProperty('--mo-orbit-angle',(-30+phase*17).toFixed(1)+'deg');
      }
      if(i===2){
        card.querySelectorAll('.apple-art-language span').forEach(function(el,k){
          el.style.setProperty('--mo-language-shift',((k-1)*phase*13).toFixed(1)+'px');
        });
      }
    });
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