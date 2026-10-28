/* Respondo OS sphere navigation: existing account views and APIs stay intact. */
const glyphs={
  bot:'<path d="M5 7a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4h-3l-4 3v-3a4 4 0 0 1-3-4z"/><path d="M9 11h.01M15 11h.01M9 15h6"/>',
  overview:'<path d="M3 11.5 12 4l9 7.5M5.5 10.5V20h13v-9.5M9 20v-6h6v6"/>',
  automation:'<path d="M12 3v4m0 10v4M3 12h4m10 0h4M5.7 5.7l2.8 2.8m7 7 2.8 2.8m0-12.6-2.8 2.8m-7 7-2.8 2.8"/><circle cx="12" cy="12" r="3"/>',
  setup:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 9h8M8 13h8M8 17h4"/>',
  answers:'<path d="M7 4h10a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z"/><path d="M9 9h7M9 13h7M9 17h4"/>',
  customers:'<circle cx="9" cy="8" r="3"/><path d="M3.5 19v-2a5.5 5.5 0 0 1 11 0v2M17 6a3 3 0 0 1 0 6m1.5 2a4 4 0 0 1 2 4v1"/>',
  install:'<path d="M12 3v13m-5-5 5 5 5-5"/><path d="M4 17v3h16v-3"/>',
  billing:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18M7 15h4"/>',
  profile:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M10 2h4l.6 2.5 2.2 1.2 2.4-1 2 3.5-1.8 1.8v2.5l1.8 1.8-2 3.5-2.4-1-2.2 1.2L14 22h-4l-.6-2.5-2.2-1.2-2.4 1-2-3.5 1.8-1.8v-2.5L2.8 9.7l2-3.5 2.4 1 2.2-1.2z"/>'
};
const icon=(key)=>'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round">'+glyphs[key]+'</svg>';

/* Respondo OS reuses the home orbit's light-field layers and exact scroll-film variables.
   Destinations remain the authenticated workspace pages, not public marketing scenes. */
export function createWorkspaceOrbit({workspace,navigate,translate}) {
  const content=workspace.querySelector('.respondo-workspace-content');
  if(!content)return {sync:()=>{}};
  const older=workspace.querySelector('#rsWorkspaceOrbit');
  if(older?.__orbitApi){
    older.__orbitApi.setNavigate(navigate);
    return older.__orbitApi;
  }
  const sections=[
    {id:'bot',label:translate('Kokeile bottia','Testa botten','Try the bot')},
    {id:'overview',label:translate('Yleisnäkymä','Översikt','Overview')},
    {id:'setup',label:translate('Botin tiedot','Bottuppgifter','Bot details')},
    {id:'answers',label:translate('Vastaukset','Svar','Answers')},
    {id:'customers',label:translate('Asiakkaat','Kunder','Customers')},
    {id:'automation',label:translate('Toiminnot','Funktioner','Actions')},
    {id:'install',label:translate('Asennus','Installation','Installation')},
    {id:'profile',label:translate('Profiili','Profil','Profile')},
    {id:'billing',label:translate('Laskutus','Fakturering','Billing')},
    {id:'settings',label:translate('Asetukset','Inställningar','Settings')}
  ];
  const orb=document.createElement('nav');
  orb.id='rsWorkspaceOrbit';
  orb.className='rs-workspace-orbit rs-workspace-scroll-helix';
  orb.setAttribute('aria-label',translate('Työtilan osiot','Arbetsytans avsnitt','Workspace sections'));
  orb.innerHTML='<div class="rs-workspace-helix-stage">'+
    // Exact home hero optical layers: radial constellation, perspective grid,
    // haze, sweep, atmospheric ellipses, horizon and scroll-coupled light.
    '<div class="rs-space" aria-hidden="true"><div class="rs-studio-grid"></div><div class="rs-studio-haze"></div><div class="rs-studio-sweep"></div><div class="rs-space-glow"></div><div class="rs-space-ellipse rs-space-ellipse-a"></div><div class="rs-space-ellipse rs-space-ellipse-b"></div><div class="rs-space-horizon"></div><div class="rs-kinetic-light"></div></div>'+
    '<small class="rs-helix-eyebrow">RESPONDO <span>OS</span></small>'+
    '<div class="rs-studio-orbit-art" aria-hidden="true">'+
      '<span class="rs-studio-orbit-ring rs-studio-ring-a"></span>'+
      '<span class="rs-studio-orbit-ring rs-studio-ring-b"></span>'+
      '<span class="rs-studio-orbit-ring rs-studio-ring-c"></span>'+
      sections.map((section,i)=>{
        const a=i*2*Math.PI/sections.length;
        const x=(Math.sin(a)*45).toFixed(2);
        const y=(-Math.cos(a)*45).toFixed(2);
        return '<span class="rs-studio-orbit-icon'+(i===0?' is-active':'')+
          '" data-rs-workspace-icon data-index="'+i+'" style="--rs-icon-x:'+x+'%;--rs-icon-y:'+y+
          '%">'+icon(section.id)+'</span>';
      }).join('')+
      '<div class="rs-studio-orbit-label">RESPONDO AI</div>'+
    '</div>'+
    '<div class="rs-helix-beacon" aria-hidden="true"></div>'+
    '<div class="rs-axis" aria-hidden="true"><span class="rs-axis-halo"></span>'+
      '<svg viewBox="0 0 256 256" focusable="false"><path d="M 238.0 66.1 L 235.2 64.9 L 183.6 84.5 L 182.6 86.0 L 183.3 87.8 L 201.2 92.1 L 201.7 94.4 L 138.0 153.1 L 133.2 154.3 L 128.6 152.6 L 109.0 130.9 L 103.7 126.6 L 97.4 124.6 L 90.8 125.1 L 82.8 129.4 L 20.5 180.0 L 18.0 183.6 L 18.8 188.6 L 22.3 191.1 L 27.6 190.1 L 87.6 143.2 L 90.6 142.0 L 96.6 143.5 L 123.1 171.5 L 128.6 173.5 L 133.7 173.5 L 140.5 171.0 L 213.1 103.9 L 215.8 104.9 L 223.4 119.6 L 224.9 120.8 L 226.9 120.3 Z" fill="white"/></svg>'+
      '<span class="rs-axis-caption">RESPONDO AI</span>'+
    '</div>'+
    '<svg class="rs-helix-progress" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><circle cx="50" cy="50" r="48" pathLength="100"/></svg>'+
    '<div class="rs-helix-selection" aria-live="polite">'+
      '<span class="rs-helix-counter" id="rsOrbitCount">01 / 10</span>'+
      '<button id="rsOrbitOpen" class="rs-helix-open" type="button" aria-label="'+sections[0].label+'">'+
        '<span id="rsOrbitName">'+sections[0].label+'</span></button>'+
      '<small class="rs-helix-instruction">'+
        translate('Vieritä valitaksesi osion. Avaa se napauttamalla nimeä.',
                  'Skrolla för att välja avsnitt. Tryck på namnet för att öppna.',
                  'Scroll to select a section. Tap its name to open.')+
      '</small>'+
    '</div></div>';
  const botPage=content.querySelector('[data-workspace-page="bot"]');
  if(!botPage)return {sync:()=>{}};
  botPage.after(orb);
  const icons=[...orb.querySelectorAll('[data-rs-workspace-icon]')];
  const button=orb.querySelector('#rsOrbitOpen');
  let currentIndex=0;
  let navigateTo=navigate;
  let frame=0;
  let pinned=false;
  let lockY=0;
  let previousY=window.scrollY;
  let inhibitUntil=0;
  let enterFromBottom=false;
  let oldStyles=null;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp=(x,min,max)=>Math.min(max,Math.max(min,x));
  const ease=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
  function selectIndex(index){
    index=clamp(index,0,sections.length-1);
    if(index===currentIndex && button.getAttribute('aria-label')===sections[index].label)return;
    currentIndex=index;
    const section=sections[index];
    orb.querySelector('#rsOrbitCount').textContent=String(index+1).padStart(2,'0')+' / '+String(sections.length).padStart(2,'0');
    orb.querySelector('#rsOrbitName').textContent=section.label;
    button.setAttribute('aria-label',section.label);
    icons.forEach((item,i)=>item.classList.toggle('is-active',i===index));
    orb.dataset.selectedSection=section.id;
  }
  function draw(){
    frame=0;
    if(!orb.isConnected || !workspace.isConnected || workspace.hidden)return;
    const rect=orb.getBoundingClientRect();
    const viewport=Math.max(1,window.innerHeight);
    if(!pinned && (rect.top>viewport || rect.bottom<0))return;
    const range=Math.max(1,rect.height-viewport);
    const progress=pinned?currentIndex/(sections.length-1):clamp(-rect.top/range,0,1);
    const position=progress*(sections.length-1);
    if(!pinned)selectIndex(Math.round(position));
    // Share the homepage's native-scroll optical choreography, even in the
    // pinned iPhone mode (one finger swipe advances one chapter).
    // Only viewport-scaled transforms are updated: there is no timer loop.
    const mobile=phone() || window.innerWidth<760;
    const opening=1-ease(clamp(position/1.05,0,1));
    const orbitFlight=ease(clamp(position/1.75,0,1));
    const breathing=Math.sin(position*.65)*(mobile?.035:.055);
    const angle=360/sections.length;
    if(!reduced.matches){
      const motion={
        '--rs-intro-opacity':opening.toFixed(3),
        '--rs-logo-opacity':(.24+.72*opening).toFixed(3),
        '--rs-logo-scale':(1+.09*orbitFlight).toFixed(3),
        '--rs-arrow-turn':(-9*orbitFlight).toFixed(2)+'deg',
        '--rs-orbit-opacity':(.96-.035*orbitFlight).toFixed(3),
        '--rs-orbit-scale':(1+.09*orbitFlight+breathing).toFixed(3),
        '--rs-orbit-spin':(-angle*position).toFixed(2)+'deg',
        '--rs-icon-upright':(angle*position).toFixed(2)+'deg',
        '--rs-orbit-tilt':((mobile?8:14)*orbitFlight).toFixed(2)+'deg',
        '--rs-grid-angle':(-14*position).toFixed(2)+'deg',
        '--rs-grid-scale':(1+.17*position).toFixed(3),
        '--rs-grid-shift':(-10*position).toFixed(1)+'px',
        '--rs-haze-scale':(1+.1*position).toFixed(3),
        '--rs-haze-opacity':(.9-.06*position).toFixed(3),
        '--rs-light-shift':(Math.sin(position*.82)*(mobile?20:72)).toFixed(1)+'px',
        '--rs-light-scale':(1+Math.sin(position*.54)*.065).toFixed(3),
        '--rs-light-strength':(.68+.13*Math.cos(position*.72)).toFixed(3),
        '--rs-sweep-x':(-85+position*22).toFixed(1)+'%'
      };
      for(const [property,value] of Object.entries(motion))orb.style.setProperty(property,value);
    }
    orb.style.setProperty('--rs-progress',progress.toFixed(4));
    orb.style.setProperty('--rs-orbit-fill',(progress*100).toFixed(2));
  }
  function schedule(){
    if(!frame && orb.isConnected)frame=requestAnimationFrame(draw);
  }

  // Mobile Safari may carry a fast native flick through all ten sticky
  // chapters. Capture entry before momentum skips the sphere; freeze only
  // this one screen and move exactly one chapter for every finger swipe.
  const stage=orb.querySelector('.rs-workspace-helix-stage');
  const phone=()=>window.matchMedia('(max-width:850px) and (pointer:coarse)').matches;
  const restore=(prop,val)=>val?document.body.style.setProperty(prop,val):document.body.style.removeProperty(prop);
  function releasePin(){
    if(!pinned)return;
    pinned=false;
    orb.classList.remove('rs-orbit-mobile-pinned');
    if(oldStyles){
      for(const prop of ['position','top','left','right','width'])restore(prop,oldStyles[prop]);
      if(oldStyles.htmlOverflow)document.documentElement.style.overflow=oldStyles.htmlOverflow;
      else document.documentElement.style.removeProperty('overflow');
      oldStyles=null;
    }
    window.scrollTo({top:lockY,behavior:'instant'});
    previousY=lockY;
    inhibitUntil=performance.now()+1000;
  }
  function pinSphere(){
    if(pinned || !phone() || workspace.hidden)return;
    lockY=Math.max(0,window.scrollY+orb.getBoundingClientRect().top);
    pinned=true;
    window.scrollTo({top:lockY,behavior:'instant'});
    oldStyles={position:document.body.style.position,top:document.body.style.top,left:document.body.style.left,
      right:document.body.style.right,width:document.body.style.width,
      htmlOverflow:document.documentElement.style.overflow};
    Object.assign(document.body.style,{position:'fixed',top:-lockY+'px',left:'0',right:'0',width:'100%'});
    document.documentElement.style.overflow='hidden';
    orb.classList.add('rs-orbit-mobile-pinned');
    selectIndex(enterFromBottom?sections.length-1:0);
    schedule();
  }
  function exitSphere(direction){
    releasePin();
    const top=orb.getBoundingClientRect().top+window.scrollY;
    const dest=direction<0?Math.max(0,top-Math.max(170,innerHeight*.8)):top+orb.offsetHeight+12;
    window.scrollTo({top:dest,behavior:'instant'});
    previousY=dest;
  }
  function moveSection(direction){
    const next=currentIndex+direction;
    if(next<0 || next>=sections.length)return exitSphere(direction);
    selectIndex(next);
    schedule();
  }
  function onPageScroll(){
    schedule();
    const y=window.scrollY;
    if(pinned || !phone() || !orb.isConnected || workspace.hidden){previousY=y;return;}
    const top=orb.getBoundingClientRect().top+y;
    const end=top+orb.offsetHeight;
    const entersFromTop=y>previousY+1 && previousY<top && y>=top-innerHeight*.55;
    const entersFromBottom=y<previousY-1 && previousY>=end && y<=end+innerHeight*.3;
    previousY=y;
    if(performance.now()>inhibitUntil && (entersFromTop || entersFromBottom)){
      enterFromBottom=entersFromBottom;
      pinSphere();
    }
  }
  window.addEventListener('scroll',onPageScroll,{passive:true});
  window.addEventListener('resize',schedule,{passive:true});
  reduced.addEventListener?.('change',schedule);
  window.addEventListener('pagehide',releasePin,{once:true});
  let startTouch=null;
  stage.addEventListener('touchstart',(event)=>{
    if(!pinned || event.touches.length!==1){startTouch=null;return;}
    startTouch={x:event.touches[0].clientX,y:event.touches[0].clientY};
  },{passive:true});
  stage.addEventListener('touchmove',(event)=>{
    if(pinned && startTouch && event.cancelable)event.preventDefault();
  },{passive:false});
  stage.addEventListener('touchend',(event)=>{
    if(!pinned || !startTouch)return;
    const finger=event.changedTouches[0];
    const dx=finger.clientX-startTouch.x,dy=finger.clientY-startTouch.y;
    startTouch=null;
    if(Math.abs(dy)<30 || Math.abs(dy)<Math.abs(dx)*1.2)return;
    if(event.cancelable)event.preventDefault();
    moveSection(dy<0?1:-1);
  },{passive:false});
  stage.addEventListener('touchcancel',()=>{startTouch=null;},{passive:true});
  let lastWheel=0;
  stage.addEventListener('wheel',(event)=>{
    if(!pinned || Math.abs(event.deltaY)<8)return;
    if(event.cancelable)event.preventDefault();
    const now=performance.now();
    if(now-lastWheel<450)return;
    lastWheel=now;
    moveSection(event.deltaY>0?1:-1);
  },{passive:false});
  button.addEventListener('click',()=>{
    releasePin();
    const section=sections[currentIndex];
    navigateTo(section.id);
    requestAnimationFrame(()=>{
      const view=workspace.dataset.currentView;
      const destination=view==='bot'?'bot':view==='overview'?'overview':'modules';
      const panel=content.querySelector('[data-workspace-page="'+destination+'"]');
      if(panel && !panel.hidden)panel.scrollIntoView({behavior:reduced.matches?'auto':'smooth',block:'start'});
    });
  });
  // Retain access to every section for keyboard and switch-control users.
  orb.addEventListener('keydown',event=>{
    if(event.key==='ArrowDown'||event.key==='ArrowRight'){
      event.preventDefault();selectIndex((currentIndex+1)%sections.length);button.focus();
    }else if(event.key==='ArrowUp'||event.key==='ArrowLeft'){
      event.preventDefault();selectIndex((currentIndex+sections.length-1)%sections.length);button.focus();
    }
  });
  const api={
    sync(id){const index=sections.findIndex(section=>section.id===id);if(index>=0)selectIndex(index);},
    setNavigate(callback){navigateTo=callback;}
  };
  orb.__orbitApi=api;
  selectIndex(0);
  schedule();
  return api;
}
