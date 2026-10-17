/* Respondo cinematic product scenes: illustrative UI, synced with the
   native scroll story. No network requests, analytics or business logic. */
(function(){
  'use strict';
  var root=document.getElementById('app');
  if(!root)return;
  var content={
    fi:{
      browser:'yrityksesi.fi',demo:'DEMO',
      title1:'Asiakas kysyy. Respondo vastaa.',topic1:'ASIAKASPALVELU',state1:'24/7',
      question:'Mitä palveluita tarjoatte?',
      answer:'Autan löytämään sopivan palvelun yrityksen tietojen perusteella.',
      compose:'Kirjoita viesti…',
      title2:'Yrityksesi tieto yhdessä paikassa.',topic2:'TIETOPOHJA',state2:'ESIMERKKI',
      rows:[['Palvelut','Yrityksen palvelutiedot'],['Aukioloajat','Ajantasaiset asiointiajat'],['Yhteystiedot','Asiakkaan yhteydenottotavat']],
      title3:'Tarvittaessa ihminen mukaan.',topic3:'YHTEYDENOTTO',state3:'ESIMERKKI',
      handoff:'Asiakaspalvelijalle',handoffTag:'JATKOKÄSITTELY',
      handoffText:'Haluaisin pyytää tarjouksen ja keskustella tarkemmin.',
      handoffStatus:'Valmis käsiteltäväksi',
      microTop:'YMPÄRI VUOROKAUDEN',microBottom:'KOLME KIELTÄ'
    },
    sv:{
      browser:'dittforetag.fi',demo:'DEMO',
      title1:'Kunden frågar. Respondo svarar.',topic1:'KUNDSERVICE',state1:'24/7',
      question:'Vilka tjänster erbjuder ni?',
      answer:'Jag hjälper dig hitta rätt tjänst med företagets information.',
      compose:'Skriv ett meddelande…',
      title2:'Företagets information samlad.',topic2:'KUNSKAPSBAS',state2:'EXEMPEL',
      rows:[['Tjänster','Företagets tjänsteinformation'],['Öppettider','Aktuella öppettider'],['Kontaktuppgifter','Sätt att kontakta företaget']],
      title3:'När det behövs tar en människa över.',topic3:'KONTAKT',state3:'EXEMPEL',
      handoff:'Till kundservice',handoffTag:'UPPFÖLJNING',
      handoffText:'Jag vill gärna få en offert och diskutera vidare.',
      handoffStatus:'Redo att behandlas',
      microTop:'DYGNET RUNT',microBottom:'TRE SPRÅK'
    },
    en:{
      browser:'yourbusiness.fi',demo:'DEMO',
      title1:'They ask. Respondo answers.',topic1:'CUSTOMER SERVICE',state1:'24/7',
      question:'What services do you offer?',
      answer:'I can help you find a suitable service based on this company’s information.',
      compose:'Type a message…',
      title2:'Your business knowledge, organized.',topic2:'KNOWLEDGE BASE',state2:'EXAMPLE',
      rows:[['Services','Your business services'],['Opening hours','Up-to-date business hours'],['Contact details','Ways to reach your team']],
      title3:'People can step in when needed.',topic3:'ENQUIRY',state3:'EXAMPLE',
      handoff:'To your team',handoffTag:'FOLLOW-UP',
      handoffText:'I would like a quote and to discuss the details.',
      handoffStatus:'Ready to be reviewed',
      microTop:'AROUND THE CLOCK',microBottom:'THREE LANGUAGES'
    }
  };
  var scheduled=false,observer;
  var reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  function lng(){
    var val=String(document.documentElement.lang||'fi').toLowerCase().slice(0,2);
    return content[val]?val:'fi';
  }
  function render(){
    var page=root.querySelector('.apple-home-page');
    if(!page)return;
    var story=page.querySelector('.cinema-story');
    if(!story||story.querySelector('.cinema-preview-browser'))return;
    var t=content[lng()];
    var rows=t.rows.map(function(row,i){
      return '<div class="cinema-knowledge-row"><span class="cinema-knowledge-icon" aria-hidden="true">'+(i+1)+'</span>'+
        '<span><strong>'+row[0]+'</strong><small>'+row[1]+'</small></span>'+
        '<span class="cinema-knowledge-check" aria-hidden="true">✓</span></div>';
    }).join('');
    var markup=
      '<div class="cinema-preview-browser" aria-hidden="true">'+
        '<div class="cinema-preview-chrome"><span class="cinema-preview-controls"><i></i><i></i><i></i></span>'+
        '<span class="cinema-preview-url">'+t.browser+'</span><span class="cinema-preview-chip">RESPONDO</span></div>'+
        '<div class="cinema-preview-body">'+
          '<div class="cinema-scene" data-scene="1"><div class="cinema-scene-overline"><span>'+t.topic1+'</span><span>'+t.state1+'</span></div>'+
            '<h3 class="cinema-scene-title">'+t.title1+'</h3>'+
            '<div class="cinema-chat-line visitor"><span class="cinema-demo-bubble">'+t.question+'</span></div>'+
            '<div class="cinema-chat-line respondo"><span class="cinema-demo-logo"><img src="/respondo-approved-arrow-20261012.png" width="28" height="28" alt=""></span>'+
              '<span class="cinema-demo-bubble">'+t.answer+'</span></div>'+
            '<div class="cinema-demo-compose">'+t.compose+'<b aria-hidden="true">↑</b></div></div>'+
          '<div class="cinema-scene" data-scene="2"><div class="cinema-scene-overline"><span>'+t.topic2+'</span><span>'+t.state2+'</span></div>'+
            '<h3 class="cinema-scene-title">'+t.title2+'</h3><div class="cinema-knowledge-list">'+rows+'</div></div>'+
          '<div class="cinema-scene" data-scene="3"><div class="cinema-scene-overline"><span>'+t.topic3+'</span><span>'+t.state3+'</span></div>'+
            '<h3 class="cinema-scene-title">'+t.title3+'</h3>'+
            '<div class="cinema-handoff-card"><div class="cinema-handoff-top"><strong>'+t.handoff+'</strong><span class="cinema-handoff-tag">'+t.handoffTag+'</span></div>'+
              '<p>'+t.handoffText+'</p><div class="cinema-handoff-divider"></div>'+
              '<div class="cinema-handoff-status">'+t.handoffStatus+'</div></div></div>'+
        '</div><div class="cinema-preview-footer" aria-hidden="true"><i></i><i></i><i></i></div>'+
      '</div>';
    var stage=story.querySelector('.cinema-flow-stage');
    if(!stage)return;
    stage.insertAdjacentHTML('beforeend',markup);
    var hero=page.querySelector('.apple-product-stage');
    if(hero&&!hero.querySelector('.cinema-hero-light-sweep')){
      hero.insertAdjacentHTML('beforeend','<div class="cinema-hero-light-sweep" aria-hidden="true"></div>'+
        '<div class="cinema-hero-micro micro-top" aria-hidden="true"><b>24/7</b> '+t.microTop+'</div>'+
        '<div class="cinema-hero-micro micro-bottom" aria-hidden="true"><b>FI / SV / EN</b> '+t.microBottom+'</div>');
    }
    if(!reduced.matches)bindParallax(page);
  }
  var parallaxBound=false,parallaxPending=false,parallaxPage;
  function updateParallax(){
    parallaxPending=false;
    if(!parallaxPage||!parallaxPage.isConnected)return;
    var hero=parallaxPage.querySelector('.apple-hero');
    var stage=parallaxPage.querySelector('.apple-product-stage');
    if(!hero||!stage)return;
    var rect=hero.getBoundingClientRect();
    if(rect.bottom<0||rect.top>innerHeight)return;
    var px=Math.max(-58,Math.min(0,rect.top*.085));
    stage.style.setProperty('--cinema-scroll-translate',px.toFixed(1)+'px');
  }
  function bindParallax(page){
    parallaxPage=page;
    if(parallaxBound)return;
    parallaxBound=true;
    var onScroll=function(){
      if(parallaxPending)return;
      parallaxPending=true;requestAnimationFrame(updateParallax);
    };
    addEventListener('scroll',onScroll,{passive:true});
    addEventListener('resize',onScroll,{passive:true});
    onScroll();
  }
  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(function(){scheduled=false;render()});
  }
  observer=new MutationObserver(schedule);
  observer.observe(root,{childList:true,subtree:true});
  addEventListener('respondo:languagechange',schedule,{passive:true});
  schedule();
})();