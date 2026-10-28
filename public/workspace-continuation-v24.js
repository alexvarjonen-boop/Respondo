// A single dark workspace after the five-card setup.
// Keep existing chat, scan and billing DOM nodes intact so their event handlers,
// authenticated API calls and tenant isolation are not replaced by demo stubs.
const $ = (selector) => document.querySelector(selector);


function ensureWorkspace(demo) {
  const existing=$('#respondoWorkspace');
  if(existing)return existing;
  const main=$('.dashboard-simple-main');
  if(!main)return null;
  const param=new URLSearchParams(location.search).get('lang');
  let saved='';
  try{saved=localStorage.getItem('respondo_lang')||'';}catch{}
  const lang=['fi','sv','en'].includes(param)?param:['fi','sv','en'].includes(saved)?saved:'en';
  const choose=(fi,sv,en)=>lang==='fi'?fi:lang==='sv'?sv:en;
  const logo=$('.premium-sidebar-brand');
  const languages=$('.dashboard-topbar .premium-language-picker')||$('.dashboard-topbar .app-language-switch');
  const company=$('#workspaceSwitcher')?.selectedOptions?.[0]?.textContent?.trim()
    ||$('.dashboard-workspace b')?.textContent?.trim()||'Respondo AI';
  const escape=(value)=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const workspace=document.createElement('section');
  workspace.id='respondoWorkspace';
  workspace.className='respondo-workspace';
  workspace.hidden=true;
  workspace.dataset.lang=lang;
  workspace.setAttribute('aria-label',choose('Respondo-työtila','Respondo-arbetsyta','Respondo workspace'));
  const nav=(id,fi,sv,en)=>'<button type="button" data-workspace-nav="'+id+'">'+choose(fi,sv,en)+'</button>';
  workspace.innerHTML=`
    <header class="respondo-workspace-header">
      <div class="respondo-workspace-brand"><span class="respondo-workspace-brand-logo"></span>
        <span class="respondo-workspace-brand-copy"><b>${escape(company)}</b><small>RESPONDO OS</small></span>
      </div>
      <div class="respondo-workspace-actions">
        <div class="respondo-workspace-language"></div>
        <div class="respondo-workspace-menu-wrap">
          <button type="button" id="respondoWorkspaceMenuToggle" class="respondo-workspace-menu-toggle" aria-expanded="false" aria-controls="respondoWorkspaceMenu" aria-label="${choose('Avaa valikko','Öppna menyn','Open menu')}"><span aria-hidden="true">☰</span><span>${choose('Valikko','Meny','Menu')}</span></button>
          <nav id="respondoWorkspaceMenu" class="respondo-workspace-menu" hidden>
            ${nav('bot','Kokeile bottia','Testa botten','Try the bot')}
            ${nav('overview','Yleisnäkymä','Översikt','Overview')}
            ${nav('setup','Yritys & botti','Företag & bot','Company & bot')}
            ${nav('answers','Vastaukset','Svar','Answers')}
            ${nav('customers','Asiakkaat','Kunder','Customers')}
            ${nav('automation','Toiminnot','Funktioner','Actions')}
            ${nav('install','Asennus','Installation','Installation')}
            <hr>
            ${nav('profile','Profiili','Profil','Profile')}
            ${nav('billing','Laskutus','Fakturering','Billing')}
            ${nav('settings','Asetukset','Inställningar','Settings')}
          </nav>
        </div>
      </div>
    </header>
    <div class="respondo-workspace-content">
      <div data-workspace-page="bot">
        <small class="respondo-workspace-kicker">${choose('BOTTISI ON TÄSSÄ','DIN BOTT ÄR HÄR','YOUR BOT IS HERE')}</small>
        <h1>${choose('Kokeile bottiasi.','Testa din bot.','Try your bot.')}</h1>
        <p class="respondo-workspace-subtitle">${choose('Kirjoita kysymys alla olevaan keskusteluun. Voit testata bottia samalla, kun verkkosivun tietoja haetaan.','Skriv en fråga i chatten nedan. Du kan testa botten medan webbplatsen skannas.','Ask a question below. You can test your bot while your website is being scanned.')}</p>
        <div class="respondo-workspace-chat-card"><div id="respondoWorkspaceChatHost"></div></div>
        <div class="respondo-workspace-scan" role="status" aria-live="polite"><i aria-hidden="true"></i><div><b id="respondoWorkspaceScanStatus">${choose('Botti valmis kokeiltavaksi','Botten är redo att testas','Bot ready to try')}</b><br><span id="respondoWorkspaceScanDetail"></span></div></div>
        ${demo?'':'<button type="button" class="respondo-workspace-review-link" data-workspace-nav="settings">'+choose('Tarkista haetut tiedot','Granska hämtade uppgifter','Review imported information')+' →</button>'}
      </div>
      <div data-workspace-page="overview" hidden>
        <small class="respondo-workspace-kicker">RESPONDO OS</small>
        <h1>${choose('Yleisnäkymä','Översikt','Overview')}</h1>
        <p class="respondo-workspace-subtitle">${choose('Kaikki tärkeä yhdessä selkeässä työtilassa.','Allt viktigt i en tydlig arbetsyta.','Everything important in one clear workspace.')}</p>
        <div class="respondo-workspace-overview-grid">
          <div class="respondo-workspace-overview-card"><b>${choose('Kokeile bottiasi','Testa din bot','Test your bot')}</b><p>${choose('Katso, miten se vastaa kysymyksiin.','Se hur den svarar på frågor.','See how it answers questions.')}</p>${nav('bot','Avaa keskustelu →','Öppna chatten →','Open chat →')}</div>
          <div class="respondo-workspace-overview-card"><b>${choose('Yrityksen tiedot','Företagsuppgifter','Company details')}</b><p>${choose('Täydennä ja tarkista sivustolta löydetyt tiedot.','Komplettera och granska webbplatsens uppgifter.','Complete and review imported website information.')}</p>${nav('settings','Muokkaa tietoja →','Redigera uppgifter →','Edit details →')}</div>
        </div>
      </div>
      <div data-workspace-page="modules" hidden>
        <small class="respondo-workspace-kicker">RESPONDO OS</small>
        <h1 id="respondoWorkspaceModuleTitle"></h1>
        <div class="respondo-workspace-module-card">
          <div id="respondoWorkspaceModules"></div>
          <div class="respondo-workspace-empty" id="respondoWorkspaceEmpty" hidden>${demo?choose('Luo yritystili käyttääksesi tätä toimintoa.','Skapa ett företagskonto för att använda funktionen.','Create a company account to use this feature.')+' <a href="/tilaus?lang='+lang+'">'+choose('Aloita tästä','Börja här','Get started')+' →</a>':choose('Tämän osion tiedot eivät ole vielä saatavilla.','Uppgifter för detta avsnitt finns inte ännu.','This section is not available yet.')}</div>
        </div>
      </div>
    </div>`;
  main.insertBefore(workspace,main.querySelector('.dashboard-view-section'));
  if(logo)workspace.querySelector('.respondo-workspace-brand-logo')?.appendChild(logo.cloneNode(true));
  if(languages)workspace.querySelector('.respondo-workspace-language')?.appendChild(languages);
  return workspace;
}

export function activateRespondoWorkspace({demo=false, view='bot'}={}) {
  const shell=$('.dashboard-premium-shell');
  const workspace=ensureWorkspace(demo);
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
