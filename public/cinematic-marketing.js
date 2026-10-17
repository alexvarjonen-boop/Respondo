/* Native cinematic enhancement for public marketing pages only.
   Existing routing, forms, chatbot, pricing and account logic stay untouched. */
(function(){
  'use strict';
  var root=document.getElementById('app');
  if(!root)return;
  var texts={
    fi:{
      scroll:'SELAA ALASPÄIN',index:'01 / 03 — NÄIN SE TOIMII',
      title:'Asiakas kysyy.<br><em>Respondo toimii.</em>',
      intro:'Koko asiakaspalvelun kulku yhdellä silmäyksellä. Yrityksesi tieto muuttuu asiakkaan saamaksi vastaukseksi.',
      stage:'VASTAUSPOLKU / LIVE',pill1:'Verkkosivusi',pill2:'Vastaus asiakkaalle',pill3:'Respondo AI',
      steps:[
        ['01 / KYSYMYS','Kysymys tulee.<br>Myös illalla.','Asiakas ottaa yhteyttä verkkosivullasi juuri silloin, kun hänelle sopii.','Kokeile keskustelua','/assistant'],
        ['02 / TIETO','Omat tiedot.<br>Oikea konteksti.','Botti hyödyntää yrityksellesi tallennettua tietopohjaa. Sivuston sisällön tuonti on käytettävissä valitun paketin mukaan.','Tutustu ominaisuuksiin','/ominaisuudet'],
        ['03 / JATKO','Vastaus ei ole<br>viimeinen vaihe.','Asiakas saa vastauksen tai yhteydenotto ohjataan eteenpäin, jos ihminen tarvitaan mukaan.','Näe kaikki ominaisuudet','/ominaisuudet']
      ],
      marker:'RAKENNETTU NYKYHETKEEN',statement:'Asiakaspalvelu ei odota.<br><em>Eikä sinun tarvitse.</em>',
      outro:'Yksi asiakaspalvelubotti, joka palvelee yrityksesi asiakkaita ympäri vuorokauden.'
    },
    sv:{
      scroll:'FORTSÄTT NEDÅT',index:'01 / 03 — SÅ FUNGERAR DET',
      title:'Kunden frågar.<br><em>Respondo svarar.</em>',
      intro:'Hela kundresan i en tydlig vy. Företagets information blir ett svar för kunden.',
      stage:'SVARSFLÖDE / LIVE',pill1:'Din webbplats',pill2:'Svar till kunden',pill3:'Respondo AI',
      steps:[
        ['01 / FRÅGA','En fråga kommer.<br>Även på kvällen.','Kunden tar kontakt via din webbplats när det passar dem.','Prova chatten','/assistant'],
        ['02 / KUNSKAP','Din information.<br>Rätt sammanhang.','Chatbotten använder företagets kunskapsbas. Webbplatsimport finns enligt vald plan.','Utforska funktionerna','/ominaisuudet'],
        ['03 / NÄSTA STEG','Ett svar är inte<br>alltid slutet.','Kunden får ett svar eller ärendet förs vidare när en människa behövs.','Se alla funktioner','/ominaisuudet']
      ],
      marker:'BYGGD FÖR IDAG',statement:'Kundservice väntar inte.<br><em>Inte du heller.</em>',
      outro:'En chatbot som hjälper ditt företags kunder dygnet runt.'
    },
    en:{
      scroll:'SCROLL TO EXPLORE',index:'01 / 03 — HOW IT WORKS',
      title:'They ask.<br><em>Respondo responds.</em>',
      intro:'See the full customer journey. Your business knowledge becomes a useful answer for your customer.',
      stage:'ANSWER FLOW / LIVE',pill1:'Your website',pill2:'Answer delivered',pill3:'Respondo AI',
      steps:[
        ['01 / THE QUESTION','A question arrives.<br>Even after hours.','Customers start a conversation on your website whenever they need to.','Try a conversation','/assistant'],
        ['02 / KNOWLEDGE','Your information.<br>Real context.','The bot draws on your business knowledge base. Website importing depends on the selected plan.','Explore features','/ominaisuudet'],
        ['03 / THE NEXT STEP','A response is<br>just the beginning.','Customers get an answer or their enquiry can be passed along when a person needs to step in.','See all features','/ominaisuudet']
      ],
      marker:'MADE FOR RIGHT NOW',statement:'Customer support does not wait.<br><em>Neither should you.</em>',
      outro:'One chatbot that helps your customers around the clock.'
    }
  };
  var seen=new WeakSet(),revealObserver,stepObserver,progressBound=false,scheduled=false;
  var reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  function lang(){var value=(document.documentElement.lang||'fi').toLowerCase().slice(0,2);return texts[value]?value:'fi'}
  function inject(){
    var page=root.querySelector('.apple-home-page');
    if(!page||page.querySelector('.cinema-story'))return;
    var code=lang(),t=texts[code];
    var steps=t.steps.map(function(s,i){
      return '<article class="cinema-step" data-cinema-step="'+(i+1)+'"><span>'+s[0]+'</span><h3>'+s[1]+'</h3><p>'+s[2]+'</p><a href="'+s[4]+'?lang='+code+'">'+s[3]+' <span aria-hidden="true">↗</span></a></article>';
    }).join('');
    var story='<section class="cinema-story" id="cinema-story" data-active-step="1" aria-labelledby="cinema-story-title">'+
      '<div class="cinema-story-wrap"><span class="cinema-index">'+t.index+'</span>'+
      '<header class="cinema-story-intro"><h2 id="cinema-story-title">'+t.title+'</h2><p>'+t.intro+'</p></header>'+
      '<div class="cinema-story-grid"><div class="cinema-visual-rail"><div class="cinema-flow-stage" aria-hidden="true">'+
      '<div class="cinema-stage-head"><span>'+t.stage+'</span><span><i></i> 24/7</span></div>'+
      '<div class="cinema-flow-track"></div><div class="cinema-flow-core"><img src="/respondo-approved-arrow-20261012.png" width="160" height="160" alt=""></div>'+
      '<span class="cinema-flow-pill cinema-pill-one">'+t.pill1+'</span><span class="cinema-flow-pill cinema-pill-two">'+t.pill2+'</span>'+
      '<span class="cinema-flow-pill cinema-pill-three">'+t.pill3+'</span><span class="cinema-flow-label">RESPONDO / 2026</span>'+
      '</div></div><div class="cinema-steps">'+steps+'</div></div></div></section>';
    var features=page.querySelector('.apple-highlights');
    if(features)features.insertAdjacentHTML('beforebegin',story);
    var calculator=page.querySelector('.apple-lead-calculator');
    if(calculator)calculator.insertAdjacentHTML('beforebegin',
      '<section class="cinema-manifesto" aria-labelledby="cinema-manifesto-title"><span class="cinema-index">'+t.marker+
      '</span><h2 id="cinema-manifesto-title">'+t.statement+'</h2><p>'+t.outro+'</p></section>');
    var hero=page.querySelector('.apple-hero-inner');
    if(hero)hero.insertAdjacentHTML('beforeend','<div class="cinema-scroll-cue" aria-hidden="true">'+t.scroll+'</div>');
    var nav=page.querySelector('.nav');
    if(nav)nav.insertAdjacentHTML('beforeend','<div class="cinema-progress" aria-hidden="true"><span></span></div>');
  }
  function updateProgress(){
    var line=root.querySelector('.apple-home-page .cinema-progress > span');
    if(!line)return;
    var total=Math.max(1,document.documentElement.scrollHeight-innerHeight);
    line.style.transform='scaleX('+Math.max(0,Math.min(1,scrollY/total))+')';
  }
  function bindProgress(){
    if(progressBound)return;
    progressBound=true;
    var wait=false;
    var onscroll=function(){if(wait)return;wait=true;requestAnimationFrame(function(){wait=false;updateProgress()})};
    addEventListener('scroll',onscroll,{passive:true});
    addEventListener('resize',onscroll,{passive:true});
    onscroll();
  }
  function bindTilt(){
    if(reduced.matches||!matchMedia('(hover:hover) and (pointer:fine)').matches)return;
    var stage=root.querySelector('.apple-home-page .apple-product-stage');
    if(!stage||stage.dataset.cinemaTilt)return;
    stage.dataset.cinemaTilt='yes';
    stage.addEventListener('pointermove',function(e){
      var r=stage.getBoundingClientRect(),x=((e.clientX-r.left)/r.width-.5)*2,y=((e.clientY-r.top)/r.height-.5)*2;
      stage.style.setProperty('--tilt-y',(Math.max(-1,Math.min(1,x))*3)+'deg');
      stage.style.setProperty('--tilt-x',(Math.max(-1,Math.min(1,-y))*2)+'deg');
    },{passive:true});
    stage.addEventListener('pointerleave',function(){
      stage.style.setProperty('--tilt-x','0deg');stage.style.setProperty('--tilt-y','0deg');
    });
  }
  function bindSteps(){
    var story=root.querySelector('.cinema-story');
    if(!story||story.dataset.cinemaObserved)return;
    story.dataset.cinemaObserved='yes';
    if(!('IntersectionObserver' in window))return;
    if(stepObserver)stepObserver.disconnect();
    stepObserver=new IntersectionObserver(function(entries){
      var active=entries.filter(function(e){return e.isIntersecting}).sort(function(a,b){return b.intersectionRatio-a.intersectionRatio})[0];
      if(active)story.dataset.activeStep=active.target.dataset.cinemaStep;
    },{rootMargin:'-25% 0px -32% 0px',threshold:[0,.15,.5,.9]});
    story.querySelectorAll('[data-cinema-step]').forEach(function(el){stepObserver.observe(el)});
  }
  function bindReveals(){
    if(reduced.matches||!('IntersectionObserver' in window))return;
    if(!revealObserver)revealObserver=new IntersectionObserver(function(entries){
      entries.forEach(function(e){if(e.isIntersecting){e.target.classList.add('is-seen');revealObserver.unobserve(e.target)}});
    },{threshold:.08,rootMargin:'0px 0px -35px 0px'});
    root.querySelectorAll('.cinema-story-intro,.cinema-step,.apple-feature-card,.cinema-manifesto h2,.r-brand-flow-steps>div').forEach(function(el){
      if(seen.has(el))return;
      seen.add(el);
      if(el.getBoundingClientRect().top<innerHeight-45)return;
      el.classList.add('cinema-ready','cinema-inview-pending');revealObserver.observe(el);
    });
  }
  function enhance(){
    if(root.querySelector('.apple-home-page')){inject();bindProgress();bindTilt();bindSteps()}
    bindReveals();updateProgress();
  }
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(function(){scheduled=false;enhance()})}
  new MutationObserver(schedule).observe(root,{childList:true});
  addEventListener('respondo:languagechange',schedule,{passive:true});
  schedule();
})();