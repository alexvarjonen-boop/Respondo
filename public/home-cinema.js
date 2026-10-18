/* RESPONDO AI — homepage film director.
   An opt-in visual layer on top of the existing six sections. No scroll hijacking,
   no route interception, no forced layout height, no pricing/form data changes. */
(function () {
  'use strict';
  if (location.pathname !== '/' || !document.getElementById('app')) return;
  var app = document.getElementById('app');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var lowData = !!(navigator.connection && navigator.connection.saveData);
  var chapters = [
    {selector:'.apple-hero',fi:'ENSIKOSKETUS',sv:'FÖRSTA INTRYCKET',en:'FIRST IMPRESSION'},
    {selector:'.apple-highlights',fi:'OMINAISUUDET',sv:'FUNKTIONER',en:'FEATURES'},
    {selector:'.apple-lead-calculator',fi:'MAHDOLLISUUDET',sv:'MÖJLIGHETER',en:'OPPORTUNITIES'},
    {selector:'.rg-growth-section',fi:'KASVUSKENAARIO',sv:'TILLVÄXTSCENARIO',en:'GROWTH SCENARIO'},
    {selector:'.pricing-section',fi:'PAKETIT',sv:'ABONNEMANG',en:'PRICING'},
    {selector:'.apple-bottom-cta',fi:'ALOITA',sv:'KOM IGÅNG',en:'GET STARTED'}
  ];
  var page = null, scenes = [], hud = null, bar = null, frame = 0, watchFrame = 0, activeIndex = -1;
  function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
  function smooth(value){value=clamp(value,0,1);return value*value*(3-2*value);}
  function put(el,key,value){if(el)el.style.setProperty(key,value);}
  function language(){
    var languageFromPage=(document.documentElement.lang||'fi').slice(0,2).toLowerCase();
    var url=new URLSearchParams(location.search).get('lang');
    var lang=(url||languageFromPage||'fi').slice(0,2).toLowerCase();
    return ['fi','sv','en'].indexOf(lang)<0?'fi':lang;
  }
  function destroy(){
    cancelAnimationFrame(frame);frame=0;
    if(page){
      page.classList.remove('rf-cinematic-active');
      scenes.forEach(function(scene){
        scene.node.classList.remove('rf-scene');
        scene.node.classList.remove('rf-film-in-view');
        var decorative=scene.node.querySelector(':scope > .rf-atmosphere');
        if(decorative) decorative.remove();
      });
    }
    if(hud){hud.remove();hud=null;}
    if(bar){bar.remove();bar=null;}
    scenes=[];page=null;activeIndex=-1;
  }
  function atmosphere(section){
    if(section.querySelector(':scope > .rf-atmosphere'))return;
    var layer=document.createElement('div');
    layer.className='rf-atmosphere';
    layer.setAttribute('aria-hidden','true');
    layer.innerHTML='<i class="rf-horizon"></i><i class="rf-orbit"></i><i class="rf-rays"></i><i class="rf-beam"></i>';
    section.insertBefore(layer,section.firstChild);
  }
  function widgets(){
    bar=document.createElement('div');
    bar.className='rf-film-progress';
    bar.setAttribute('aria-hidden','true');
    bar.innerHTML='<i></i>';
    document.body.appendChild(bar);
    hud=document.createElement('div');
    hud.className='rf-film-hud';
    hud.setAttribute('aria-hidden','true');
    hud.innerHTML='<div class="rf-film-info"><small>RESPONDO / FILM</small><b class="rf-film-chapter"></b><span class="rf-chapter-number"></span></div><span class="rf-film-rail"><i></i></span>';
    document.body.appendChild(hud);
    setChapter(0);
  }
  function setChapter(i){
    if(!hud || activeIndex===i)return;
    activeIndex=i;
    var chapter=chapters[scenes[i].index];
    var label=hud.querySelector('.rf-film-chapter');
    var number=hud.querySelector('.rf-chapter-number');
    if(label) label.textContent=chapter[language()];
    if(number) number.textContent=String(i+1).padStart(2,'0')+' / '+String(scenes.length).padStart(2,'0');
  }
  function mount(){
    var next=app.querySelector('.apple-home-page');
    if(next===page)return;
    destroy();
    if(!next)return;
    page=next;
    page.classList.add('rf-cinematic-active');
    // Color/contrast fixes remain active when motion is disabled.
    if(reduced.matches || lowData)return;
    chapters.forEach(function(chapter,index){
      var node=page.querySelector(chapter.selector);
      if(!node)return;
      node.classList.add('rf-scene');
      atmosphere(node);
      scenes.push({node:node,index:index});
    });
    if(scenes.length<3)return;
    widgets();
    schedule();
  }
  function update(){
    frame=0;
    if(!page||!page.isConnected||!scenes.length||reduced.matches)return;
    var viewportH=Math.max(1,innerHeight),mobile=innerWidth<760;
    var bestIndex=0,closest=Infinity;
    scenes.forEach(function(scene,i){
      var node=scene.node,rect=node.getBoundingClientRect();
      var enter=smooth((viewportH*.96-rect.top)/Math.max(1,viewportH*(mobile?.61:.64)));
      var exit=smooth((viewportH*.12-rect.bottom)/Math.max(1,viewportH*.5));
      var progress=clamp((viewportH*.51-rect.top)/Math.max(1,rect.height),0,1);
      var midpoint=rect.top+Math.min(rect.height*.5,viewportH*.53);
      var distance=Math.abs(midpoint-viewportH*.49);
      // Keep the active label aligned to an actually visible chapter.
      if(rect.bottom>viewportH*.28&&rect.top<viewportH*.74&&distance<closest){
        closest=distance;bestIndex=i;
      }
      var onScreen=rect.bottom> -80&&rect.top<viewportH+80;
      if(!onScreen){
        node.classList.remove('rf-film-in-view');
        return;
      }
      node.classList.add('rf-film-in-view');
      var focus=clamp(1-Math.abs((rect.top+rect.height*.34-viewportH*.5)/Math.max(viewportH,rect.height*.8)),0,1);
      put(node,'--rf-fx-opacity',(.20+.65*focus).toFixed(3));
      put(node,'--rf-horizon-y',((.5-progress)*(mobile?35:100)).toFixed(1)+'px');
      put(node,'--rf-horizon-scale',(.85+progress*.35).toFixed(3));
      put(node,'--rf-orbit-spin',(-38+progress*235).toFixed(1)+'deg');
      put(node,'--rf-orbit-scale',(.77+progress*.49).toFixed(3));
      put(node,'--rf-rays-spin',(-32+progress*70).toFixed(1)+'deg');
      put(node,'--rf-beam-x',(-100+progress*220).toFixed(1)+'%');
      put(node,'--rf-sweep',(-37+progress*74).toFixed(1)+'%');
      put(node,'--rf-heading-y',((1-enter)*(mobile?13:34)).toFixed(1)+'px');
      put(node,'--rf-heading-opacity',(.82+.18*enter).toFixed(3));
      if(scene.index===3){
        // Once the scenario enters view, the existing SVG line is drawn progressively.
        put(node,'--rf-growth-lift',((1-enter)*(mobile?31:95)-exit*18).toFixed(1)+'px');
        put(node,'--rf-growth-tilt',((1-enter)*9).toFixed(1)+'deg');
        put(node,'--rf-growth-scale',(.92+.08*enter-.015*exit).toFixed(3));
        put(node,'--rf-growth-opacity',(.79+.21*enter-.035*exit).toFixed(3));
        put(node,'--rf-chart-x',((1-enter)*(mobile?-8:-37)).toFixed(1)+'px');
        put(node,'--rf-kpi-y',((1-enter)*18).toFixed(1)+'px');
        put(node,'--rf-area-opacity',(.30+.70*enter).toFixed(3));
        put(node,'--rf-line-reveal',(1100*(1-enter)).toFixed(1));
        put(node,'--rf-spark-reveal',(500*(1-enter)).toFixed(1));
      }
      if(scene.index===4){
        var cards=node.querySelectorAll('.pricing-choice-card');
        cards.forEach(function(card,cardIndex){
          // Element-based entrance derived from the untransformed section's
          // top position; avoids rect/transform feedback and jitter.
          var p=smooth(clamp((viewportH*.95-rect.top)/Math.max(1,viewportH*.7)-cardIndex*(mobile?.09:.13),0,1));
          var direction=cardIndex===0?-1:cardIndex===2?1:0;
          put(card,'--rf-card-y',((1-p)*(mobile?28:92)).toFixed(1)+'px');
          put(card,'--rf-card-yaw',(direction*(1-p)*(mobile?0:15)).toFixed(1)+'deg');
          put(card,'--rf-card-pitch',((1-p)*(mobile?0:7)).toFixed(1)+'deg');
          put(card,'--rf-card-scale',(.94+.06*p).toFixed(3));
          put(card,'--rf-card-opacity',(.77+.23*p).toFixed(3));
        });
      }
    });
    if(closest<Infinity)setChapter(bestIndex);
    var total=Math.max(1,document.documentElement.scrollHeight-viewportH);
    var amount=clamp(scrollY/total,0,1)*100;
    put(hud,'--rf-total',amount.toFixed(2)+'%');
    put(bar,'--rf-total',amount.toFixed(2)+'%');
    // Keep the original logo-reveal unobstructed at the start.
    var shown=scrollY>140?'1':'0';
    put(hud,'--rf-hud-opacity',shown);
    put(bar,'--rf-hud-opacity',shown);
  }
  function schedule(){
    if(frame)return;
    frame=requestAnimationFrame(update);
  }
  function scheduleMount(){
    if(watchFrame)return;
    watchFrame=requestAnimationFrame(function(){watchFrame=0;mount();});
  }
  var observer=new MutationObserver(scheduleMount);
  observer.observe(app,{childList:true});
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule,{passive:true});
  window.addEventListener('pageshow',schedule,{passive:true});
  window.addEventListener('respondo:languagechange',function(){
    scheduleMount();
    activeIndex=-1;
    schedule();
  },{passive:true});
  document.addEventListener('visibilitychange',function(){
    if(!document.hidden)schedule();
  });
  if(typeof reduced.addEventListener==='function'){
    reduced.addEventListener('change',function(){destroy();scheduleMount();});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',scheduleMount,{once:true});
  else scheduleMount();
})();