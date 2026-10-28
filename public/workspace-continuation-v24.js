// A single dark workspace after the five-card setup.
// Keep existing chat, scan and billing DOM nodes intact so their event handlers,
// authenticated API calls and tenant isolation are not replaced by demo stubs.
const $ = (selector) => document.querySelector(selector);

export function activateRespondoWorkspace({demo=false, view='bot'}={}) {
  const shell=$('.dashboard-premium-shell');
  const workspace=$('#respondoWorkspace');
  if(!shell || !workspace) return false;
  const chatHost=$('#respondoWorkspaceChatHost');
  const modules=$('#respondoWorkspaceModules');
  const preview=$('#live-preview');
  if(!chatHost || !modules || !preview) return false;

  // Move, rather than clone, the original working chat. Event listeners keep
  // operating, and the preview still uses the authenticated/demo answer path.
  if(preview.parentElement!==chatHost) chatHost.appendChild(preview);
  const allSections=[...shell.querySelectorAll('.dashboard-view-section')].filter(node=>!workspace.contains(node));
  for(const section of allSections){
    section.classList.remove('dashboard-view-hidden');
    section.hidden=true;
    modules.appendChild(section);
  }
  $('#guidedSetup')?.setAttribute('hidden','');
  shell.classList.remove('guided-setup-active');
  shell.classList.add('respondo-workspace-active');
  workspace.hidden=false;
  const menu=$('#respondoWorkspaceMenu');
  const toggle=$('#respondoWorkspaceMenuToggle');
  const status=$('#respondoWorkspaceScanStatus');
  const detail=$('#respondoWorkspaceScanDetail');
  const review=$('#websiteImportReview');
  const error=$('#websiteImportProgressError');
  const progress=$('#websiteImportProgress');
  const progressLabel=$('#websiteImportProgressLabel');
  const progressPercent=$('#websiteImportProgressPercent');
  const importButton=$('#importWebsite');

  if(!workspace.dataset.initialized){
    workspace.dataset.initialized='1';
    const closeMenu=()=>{if(menu)menu.hidden=true;toggle?.setAttribute('aria-expanded','false');};
    toggle?.addEventListener('click',(event)=>{
      event.stopPropagation();
      const opening=menu?.hidden;
      if(menu) menu.hidden=!opening;
      toggle.setAttribute('aria-expanded',String(Boolean(opening)));
    });
    document.addEventListener('click',(event)=>{if(!workspace.contains(event.target))closeMenu();});
    document.addEventListener('keydown',(event)=>{if(event.key==='Escape')closeMenu();});
    workspace.querySelectorAll('[data-workspace-nav]').forEach(button=>button.addEventListener('click',()=>{
      selectView(button.dataset.workspaceNav);
      closeMenu();
    }));
    const updateScan=()=>{
      if(!status)return;
      const failure=error?.style.display!=='none' ? error?.textContent?.trim(): '';
      const reviewText=review?.textContent?.trim()||'';
      const running=Boolean(importButton?.disabled);
      const translated=(fi,sv,en)=>workspace.dataset.lang==='sv'?sv:workspace.dataset.lang==='en'?en:fi;
      if(failure){
        status.textContent=translated('Tietojen haku epäonnistui','Hämtningen misslyckades','Website scan failed');
        if(detail)detail.textContent=failure;
      }else if(reviewText){
        status.textContent=translated('Verkkosivun haku valmis','Webbplatssökningen är klar','Website scan complete');
        if(detail)detail.textContent=demo
          ? translated('Voit nyt testata bottia.','Du kan nu testa botten.','You can now test the bot.')
          : translated('Tarkista löydetyt tiedot asetuksissa ennen hyväksymistä.','Granska uppgifterna i inställningarna innan du godkänner dem.','Review imported facts in Settings before approving them.');
      }else if(running){
        status.textContent=progressLabel?.textContent?.trim()||translated('Haetaan verkkosivun tietoja…','Hämtar webbplatsuppgifter…','Scanning website…');
        if(detail)detail.textContent=progressPercent?.textContent?.trim()||'';
      }else if(!importButton){
        status.textContent=translated('Botti valmis kokeiltavaksi','Botten är redo att testas','Bot ready to try');
        if(detail)detail.textContent='';
      }
    };
    importButton?.addEventListener('click',()=>{
      if(status) status.textContent=workspace.dataset.lang==='sv'?'Hämtar webbplatsuppgifter…':workspace.dataset.lang==='en'?'Scanning website…':'Haetaan verkkosivun tietoja…';
      if(detail)detail.textContent='';
      setTimeout(updateScan,50);
    },{capture:true});
    for(const node of [review,error,progress]){
      if(node)new MutationObserver(updateScan).observe(node,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['style']});
    }
    updateScan();
  }

  function selectView(next){
    const allowed=new Set(['bot','overview','setup','answers','customers','automation','install','profile','billing','settings']);
    const section=allowed.has(next)?next:'bot';
    workspace.dataset.currentView=section;
    workspace.querySelectorAll('[data-workspace-page]').forEach(el=>el.hidden=el.dataset.workspacePage!==(section==='bot'?'bot':section==='overview'?'overview':'modules'));
    const map={
      setup:['business-profile'],settings:['business-profile'],
      answers:['knowledge','unanswered'],customers:['support-team','live-inbox','conversations','leads'],
      automation:['actions2','integrations'],install:['install'],profile:['workspaces','account-security'],
      billing:['billing']
    };
    const ids=map[section]||[];
    [...modules.querySelectorAll('.dashboard-view-section')].forEach(el=>{
      el.hidden=!ids.includes(el.id);
    });
    workspace.querySelectorAll('[data-workspace-nav]').forEach(button=>{
      const selected=button.dataset.workspaceNav===section;
      button.classList.toggle('active',selected);
      if(selected)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
    });
    const titles={
      setup:workspace.dataset.lang==='sv'?'Företag och bot':workspace.dataset.lang==='en'?'Company and bot':'Yritys ja botti',
      answers:workspace.dataset.lang==='sv'?'Svar':workspace.dataset.lang==='en'?'Answers':'Vastaukset',
      customers:workspace.dataset.lang==='sv'?'Kunder':workspace.dataset.lang==='en'?'Customers':'Asiakkaat',
      automation:workspace.dataset.lang==='sv'?'Funktioner':workspace.dataset.lang==='en'?'Actions':'Toiminnot',
      install:workspace.dataset.lang==='sv'?'Installation':workspace.dataset.lang==='en'?'Installation':'Asennus',
      profile:workspace.dataset.lang==='sv'?'Profil':workspace.dataset.lang==='en'?'Profile':'Profiili',
      billing:workspace.dataset.lang==='sv'?'Fakturering':workspace.dataset.lang==='en'?'Billing':'Laskutus',
      settings:workspace.dataset.lang==='sv'?'Inställningar':workspace.dataset.lang==='en'?'Settings':'Asetukset'
    };
    const heading=$('#respondoWorkspaceModuleTitle');
    if(heading)heading.textContent=titles[section]||'';
    const empty=$('#respondoWorkspaceEmpty');
    if(empty)empty.hidden=ids.some(id=>modules.querySelector('#'+id));
    window.scrollTo({top:0,behavior:'instant'});
    if(section==='bot')$('#previewForm input[name="question"]')?.focus({preventScroll:true});
  }

  // Opening /app again should return to the same clear, dark workspace rather
  // than the legacy dashboard. Demo data is intentionally ephemeral.
  selectView(view);
  if(status && importButton?.disabled)status.textContent=workspace.dataset.lang==='sv'?'Hämtar webbplatsuppgifter…':workspace.dataset.lang==='en'?'Scanning website…':'Haetaan verkkosivun tietoja…';
  return true;
}
