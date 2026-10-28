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

export function createWorkspaceOrbit({workspace,navigate,translate}) {
  const content=workspace.querySelector('.respondo-workspace-content');
  if(!content)return {sync:()=>{}};
  const older=workspace.querySelector('#rsWorkspaceOrbit');
  if(older && older.__orbitApi){
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
  const hint=translate('Vieritä, pyyhkäise sivuttain tai valitse kuvake.','Rulla, svep i sidled eller välj en ikon.','Scroll, swipe sideways or tap an icon.');
  const label=translate('Valitse osio','Välj avsnitt','Choose a section');
  const dialLabel=translate('Navigoi työtilan osioissa','Navigera mellan avsnitt','Navigate workspace sections');
  const prev=translate('Edellinen osio','Föregående avsnitt','Previous section');
  const next=translate('Seuraava osio','Nästa avsnitt','Next section');
  const orb=document.createElement('nav');
  orb.id='rsWorkspaceOrbit';
  orb.className='rs-workspace-orbit';
  orb.setAttribute('aria-label',dialLabel);
  orb.innerHTML='<p class="rs-orbit-eyebrow">RESPONDO <span>OS</span></p>'+
    '<div class="rs-orbit-dial" id="rsOrbitDial" role="group" aria-label="'+dialLabel+'" tabindex="0">'+
      '<div class="rs-orbit-halo" aria-hidden="true"></div>'+
      '<div class="rs-orbit-ring rs-orbit-ring-one" aria-hidden="true"></div>'+
      '<div class="rs-orbit-ring rs-orbit-ring-two" aria-hidden="true"></div>'+
      '<div class="rs-orbit-core" aria-hidden="true"><img src="/respondo-symbol.svg" alt="" width="64" height="64" loading="eager"></div>'+
      sections.map((section,i)=>{
        const angle=(i*360/sections.length).toFixed(1);
        return '<button type="button" class="rs-orbit-point" data-orbit-page="'+section.id+'" title="'+section.label+'" aria-label="'+section.label+'" aria-pressed="false" style="--orbit-angle:'+angle+'deg;--orbit-counter:'+(-Number(angle))+'deg">'+icon(section.id)+'</button>';
      }).join('')+
    '</div>'+
    '<div class="rs-orbit-current" aria-live="polite">'+
      '<span id="rsOrbitCount">01 / 10</span><h2 id="rsOrbitName"></h2>'+
      '<span class="rs-orbit-hint">'+hint+'</span>'+
    '</div>'+
    '<div class="rs-orbit-controls" role="group" aria-label="'+label+'">'+
      '<button type="button" data-orbit-direction="-1" aria-label="'+prev+'">←</button>'+
      '<span class="rs-orbit-controls-label">'+label+'</span>'+
      '<button type="button" data-orbit-direction="1" aria-label="'+next+'">→</button>'+
    '</div>';
  const botPage=content.querySelector('[data-workspace-page="bot"]');
  if(!botPage)return {sync:()=>{}};
  botPage.after(orb);
  const dial=orb.querySelector('#rsOrbitDial');
  const buttons=[...orb.querySelectorAll('[data-orbit-page]')];
  let current='bot', navigateTo=navigate, lastWheel=0, touchStart=null;
  const sync=(id)=>{
    const index=sections.findIndex(section=>section.id===id);
    if(index<0)return;
    current=id;
    for(const button of buttons){
      const active=button.dataset.orbitPage===id;
      button.classList.toggle('is-active',active);
      button.setAttribute('aria-pressed',String(active));
    }
    orb.querySelector('#rsOrbitName').textContent=sections[index].label;
    orb.querySelector('#rsOrbitCount').textContent=String(index+1).padStart(2,'0')+' / '+String(sections.length).padStart(2,'0');
    dial.style.setProperty('--orbit-turn',(-index*360/sections.length)+'deg');
  };
  const move=(direction)=>{
    const index=Math.max(0,sections.findIndex(section=>section.id===current));
    const nextIndex=(index+direction+sections.length)%sections.length;
    navigateTo(sections[nextIndex].id);
  };
  // Direct icon taps reveal the chosen existing view below the sphere,
  // while wheel/arrow navigation keeps the sphere in view.
  const revealMobileSection=()=>{
    requestAnimationFrame(()=>{
      const view=workspace.dataset.currentView;
      const destination=view==='bot'?'bot':view==='overview'?'overview':'modules';
      const page=content.querySelector('[data-workspace-page="'+destination+'"]');
      if(page && !page.hidden)page.scrollIntoView({
        behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',
        block:'start'
      });
    });
  };
  orb.addEventListener('click',event=>{
    const target=event.target.closest?.('[data-orbit-page]');
    if(target&&orb.contains(target)){navigateTo(target.dataset.orbitPage);revealMobileSection();return;}
    const arrow=event.target.closest?.('[data-orbit-direction]');
    if(arrow&&orb.contains(arrow))move(Number(arrow.dataset.orbitDirection));
  });
  dial.addEventListener('wheel',event=>{
    if(event.ctrlKey||event.metaKey)return; // Preserve pinch zoom.
    const delta=Math.abs(event.deltaY)>Math.abs(event.deltaX)?event.deltaY:event.deltaX;
    if(Math.abs(delta)<2)return;
    // At both ends return to native page scrolling, never trap visitors in the dial.
    const index=sections.findIndex(section=>section.id===current);
    if((index===0&&delta<0)||(index===sections.length-1&&delta>0))return;
    event.preventDefault(); // Inside the dial, scrolling browses real sections.
    const now=performance.now();
    if(now-lastWheel<420)return;
    lastWheel=now;
    move(delta>0?1:-1);
  },{passive:false});
  dial.addEventListener('touchstart',event=>{
    const touch=event.changedTouches[0];
    if(touch)touchStart={x:touch.clientX,y:touch.clientY,time:performance.now()};
  },{passive:true});
  dial.addEventListener('touchend',event=>{
    if(!touchStart)return;
    const touch=event.changedTouches[0];
    if(!touch)return;
    const dx=touch.clientX-touchStart.x,dy=touch.clientY-touchStart.y;
    // Horizontal swipes choose sections; vertical swipes must keep native page scrolling.
    if(Math.abs(dx)>32 && Math.abs(dx)>Math.abs(dy)*1.35 && performance.now()-touchStart.time<1250){
      move(dx<0?1:-1);
    }
    touchStart=null;
  },{passive:true});
  dial.addEventListener('keydown',event=>{
    if(event.target!==dial)return;
    if(event.key==='ArrowDown'||event.key==='ArrowRight'){event.preventDefault();move(1);}
    if(event.key==='ArrowUp'||event.key==='ArrowLeft'){event.preventDefault();move(-1);}
    if(event.key==='Home'){event.preventDefault();navigateTo(sections[0].id);}
    if(event.key==='End'){event.preventDefault();navigateTo(sections[sections.length-1].id);}
  });
  const api={sync,setNavigate(callback){navigateTo=callback;}};
  orb.__orbitApi=api;
  sync('bot');
  return api;
}
