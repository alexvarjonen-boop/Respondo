import { createWorkspaceOrbit } from './workspace-orbit-v28.js';
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
          <div id="respondoWorkspaceCardBody"></div><div id="respondoWorkspaceModules" hidden aria-hidden="true"></div>
          <div class="respondo-workspace-empty" id="respondoWorkspaceEmpty" hidden>${demo?choose('Luo yritystili käyttääksesi tätä toimintoa.','Skapa ett företagskonto för att använda funktionen.','Create a company account to use this feature.')+' <a href="/tilaus?lang='+lang+'">'+choose('Aloita tästä','Börja här','Get started')+' →</a>':choose('Tämän osion tiedot eivät ole vielä saatavilla.','Uppgifter för detta avsnitt finns inte ännu.','This section is not available yet.')}</div>
        </div>
      </div>
    </div>`;
  main.insertBefore(workspace,main.querySelector('.dashboard-view-section'));
  if(logo){
    const originalMark=logo.querySelector('.brand-mark,.logo img,.logo svg,.brand img,.brand svg') || logo.querySelector('img,svg');
    if(originalMark) workspace.querySelector('.respondo-workspace-brand-logo')?.appendChild(originalMark.cloneNode(true));
  }
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


  const storage=$('#respondoWorkspaceModules');
  const card=$('#respondoWorkspaceCardBody');
  const translate=(fi,sv,en)=>workspace.dataset.lang==='fi'?fi:workspace.dataset.lang==='sv'?sv:en;
  const safe=(value)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let selected='bot';
  let orbit=null;
  let activePanel=null;
  const knownSections=[...storage.querySelectorAll('.dashboard-view-section')];
  // Only the selected module may leave storage. Explicit inline display wins
  // against the old high-specificity dashboard CSS on iOS Safari.
  const park=()=>{
    if(activePanel){
      activePanel.style.setProperty('display','none','important');
      activePanel.hidden=true;
      storage.appendChild(activePanel);
      activePanel=null;
    }
  };
  const showPanel=(id)=>{
    park();
    const target=storage.querySelector('#'+id);
    if(!target)return false;
    target.hidden=false;
    target.classList.remove('dashboard-view-hidden');
    target.style.setProperty('display','block','important');
    card.appendChild(target);
    activePanel=target;
    return true;
  };
  const callout=(heading,body,cta=true)=>{
    card.innerHTML='<div class="rs-minimal-card"><h2>'+safe(heading)+'</h2><p>'+safe(body)+'</p>'+
      (cta?'<a class="rs-minimal-button" href="/tilaus?lang='+encodeURIComponent(workspace.dataset.lang)+'">'+safe(translate('Luo yritystili','Skapa företagskonto','Create a company account'))+' →</a>':'')+'</div>';
  };
  const showSettings=()=>{
    park();
    const original=$('#businessProfileForm');
    if(!original){callout(translate('Yrityksen tiedot','Företagsuppgifter','Company details'),translate('Tietoja ei saatavilla.','Inga uppgifter tillgängliga.','Details unavailable.'),false);return;}
    const fields=[
      ['website',translate('Verkkosivu','Webbplats','Website'), 'url'],
      ['botName',translate('Botin nimi','Bottens namn','Bot name'),'text'],
      ['greeting',translate('Aloitusviesti','Välkomstmeddelande','Welcome message'),'text'],
      ['email',translate('Sähköposti','E-post','Email'),'email'],
      ['phone',translate('Puhelinnumero','Telefonnummer','Phone number'),'tel'],
      ['hours',translate('Aukioloajat','Öppettider','Opening hours'),'text']
    ];
    const examples={website:translate('https://yritys.fi','https://foretag.se','https://company.fi'),
      email:translate('info@yritys.fi','info@foretag.se','info@company.fi')};
    card.innerHTML='<form id="rsSimpleSettingsForm" class="rs-minimal-card rs-settings-card">'+
      '<p class="rs-minimal-intro">'+safe(translate('Muuta vain tarvitsemasi tiedot. Muut botin asetukset säilyvät ennallaan.','Ändra bara de uppgifter du behöver. Övriga inställningar sparas.','Change only what you need. All other bot settings stay saved.'))+'</p>'+
      fields.map(([key,label,type])=>'<label class="rs-simple-field"><span>'+safe(label)+'</span><input type="'+type+'" name="'+key+'" maxlength="255" placeholder="'+safe(examples[key]||'')+'" value="'+safe(original.elements[key]?.value||'')+'"></label>').join('')+
      '<div class="rs-simple-actions"><button type="submit" class="rs-minimal-button">'+safe(translate('Tallenna muutokset','Spara ändringar','Save changes'))+'</button>'+
      '<button type="button" class="rs-secondary-button" data-workspace-nav="bot">'+safe(translate('Kokeile bottia','Testa botten','Try the bot'))+' →</button></div>'+
      '<p id="rsSimpleSettingsMessage" role="status" aria-live="polite"></p></form>';
    const form=$('#rsSimpleSettingsForm');
    form?.addEventListener('submit',(event)=>{
      event.preventDefault();
      const message=$('#rsSimpleSettingsMessage');
      if(!form.reportValidity())return;
      for(const [key] of fields){
        const source=original.elements[key], user=form.elements[key];
        if(source&&user){
          source.value=user.value;
          source.dispatchEvent(new Event('input',{bubbles:true}));
        }
      }
      const botName=$('#previewBotName');
      if(botName)botName.textContent=String(original.elements.botName?.value||'RESPONDO AI');
      const bubble=$('#previewChat .preview-bubble.bot');
      if(bubble && $('#previewChat')?.children.length===1)bubble.textContent=original.elements.greeting?.value||'';
      if(demo){
        if(message)message.textContent=translate('Muutokset käytössä tässä kokeilussa.','Ändringarna gäller i demon.','Changes applied to this demo.');
      }else{
        // Existing authenticated handler posts the full tenant profile;
        // this compact UI only synchronizes its six fields.
        original.requestSubmit();
        if(message)message.textContent=translate('Tallennetaan tietoja…','Sparar uppgifter…','Saving changes…');
        const target=$('#businessProfileMsg');
        if(target){
          const observer=new MutationObserver(()=>{
            if(!target.textContent.trim())return;
            if(message)message.textContent=target.textContent.trim();
            observer.disconnect();
          });
          observer.observe(target,{childList:true,subtree:true,characterData:true});
          setTimeout(()=>observer.disconnect(),15000);
        }
      }
    });
  };
  const pages={
    bot:translate('Kokeile bottia','Testa botten','Try the bot'),
    overview:translate('Yleisnäkymä','Översikt','Overview'),
    setup:translate('Yritys ja botti','Företag och bot','Company and bot'),
    answers:translate('Vastaukset','Svar','Answers'),
    customers:translate('Asiakkaat','Kunder','Customers'),
    automation:translate('Toiminnot','Funktioner','Actions'),
    install:translate('Asennus','Installation','Installation'),
    profile:translate('Profiili','Profil','Profile'),
    billing:translate('Laskutus','Fakturering','Billing'),
    settings:translate('Asetukset','Inställningar','Settings')
  };
  const tabs={
    answers:[['knowledge',translate('Tietopohja','Kunskapsbas','Knowledge base')],['unanswered',translate('Puuttuvat vastaukset','Saknade svar','Unanswered')]],
    customers:[['conversations',translate('Keskustelut','Konversationer','Conversations')],['leads',translate('Yhteydenotot','Kontaktförfrågningar','Leads')],['live-inbox',translate('Live-chat','Livechatt','Live chat')]],
    profile:[['workspaces',translate('Yritykset','Företag','Companies')],['account-security',translate('Tilin asetukset','Kontoinställningar','Account security')]]
  };
  const primary={
    answers:'knowledge',customers:'conversations',automation:'actions2',install:'install',
    profile:'workspaces',billing:'billing'
  };
  let currentTab=null;
  function showModuleTab(id){
    currentTab=id;
    const container=$('#respondoWorkspaceCardBody');
    if(!container)return;
    container.replaceChildren();
    workspace.classList.toggle('rs-knowledge-collapsed',id==='knowledge');
    if(!showPanel(id)){
      callout(translate('Ei vielä tietoja','Inga uppgifter ännu','Nothing here yet'),
              translate('Tämä osio on tyhjä.','Det här avsnittet är tomt.','This section is empty.'),false);
    }else if(id==='knowledge'){
      const list=$('#knowledgeList');
      if((list?.querySelectorAll('.knowledge-item').length||0)>6){
        const more=document.createElement('button');
        more.className='rs-secondary-button rs-knowledge-more';
        more.type='button';
        more.textContent=translate('Näytä kaikki vastaukset','Visa alla svar','Show all answers');
        more.addEventListener('click',()=>{
          const hidden=workspace.classList.toggle('rs-knowledge-collapsed');
          more.textContent=hidden?translate('Näytä kaikki vastaukset','Visa alla svar','Show all answers'):translate('Näytä vähemmän','Visa färre','Show fewer');
        });
        card.appendChild(more);
      }
    }
    workspace.querySelectorAll('[data-workspace-tab]').forEach(button=>{
      button.classList.toggle('active',button.dataset.workspaceTab===id);
      button.setAttribute('aria-pressed',String(button.dataset.workspaceTab===id));
    });
  }
  function selectView(next){
    selected=Object.hasOwn(pages,next)?next:'bot';
    workspace.dataset.currentView=selected;
    orbit?.sync(selected);
    park();
    card.replaceChildren();
    workspace.querySelectorAll('[data-workspace-page]').forEach(element=>{
      const active=selected==='bot'?'bot':selected==='overview'?'overview':'modules';
      element.hidden=element.dataset.workspacePage!==active;
    });
    workspace.querySelectorAll('[data-workspace-nav]').forEach(button=>{
      const on=button.dataset.workspaceNav===selected;
      button.classList.toggle('active',on);
      if(on)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
    });
    const heading=$('#respondoWorkspaceModuleTitle');
    if(heading)heading.textContent=pages[selected]||pages.bot;
    const empty=$('#respondoWorkspaceEmpty');
    if(empty)empty.hidden=true;
    // Demo has no real customer accounts, Stripe billing, installation or
    // automation records. Show a short truthful CTA, never unrelated data.
    if(demo && ['customers','automation','install','billing','profile'].includes(selected)){
      const details={
        customers:translate('Asiakaskeskustelut ja liidit näkyvät omalla yritystilillä.','Kundkonversationer och leads finns på ett företagskonto.','Customer conversations and leads appear in your company account.'),
        automation:translate('Automaatiot ovat käytettävissä yritystilillä.','Automatiseringar finns med företagskonto.','Automations are available with a company account.'),
        install:translate('Asennuskoodi luodaan yritystilillä.','Installationskoden skapas i företagskontot.','Your website installation code is created in a company account.'),
        billing:translate('Demosta ei veloiteta. Valitse yrityksellesi tilaus.','Demon är gratis. Välj abonnemang för företaget.','This demo is free. Choose a plan for your company.'),
        profile:translate('Profiili luodaan rekisteröitymisen yhteydessä.','Profilen skapas vid registrering.','Your profile is created when you sign up.')
      };
      callout(pages[selected],details[selected]);
    }else if(['settings','setup'].includes(selected)){
      showSettings();
    }else if(primary[selected]){
      const available=tabs[selected]?.filter(([id])=>storage.querySelector('#'+id));
      if(available?.length){
        const header=document.createElement('nav');
        header.className='rs-module-tabs';
        header.setAttribute('aria-label',pages[selected]);
        header.innerHTML=available.map(([id,label])=>'<button type="button" data-workspace-tab="'+safe(id)+'">'+safe(label)+'</button>').join('');
        card.before(header);
        workspace.querySelectorAll('.rs-module-tabs').forEach((old)=>{if(old!==header)old.remove()});
      }else workspace.querySelectorAll('.rs-module-tabs').forEach(old=>old.remove());
      showModuleTab(primary[selected]);
    }else{
      // Nothing else from the legacy dashboard should leak into the current
      // menu item even if original data modules are still present in the DOM.
      workspace.querySelectorAll('.rs-module-tabs').forEach(old=>old.remove());
    }
    if(!primary[selected])workspace.querySelectorAll('.rs-module-tabs').forEach(old=>old.remove());
    window.scrollTo({top:0,behavior:'auto'});
  }

  if(!workspace.dataset.initialized){
    workspace.dataset.initialized='1';
    const closeMenu=()=>{if(menu)menu.hidden=true;toggle?.setAttribute('aria-expanded','false');};
    toggle?.addEventListener('click',(event)=>{
      event.stopPropagation();
      const opening=Boolean(menu?.hidden);
      if(menu)menu.hidden=!opening;
      toggle.setAttribute('aria-expanded',String(opening));
    });
    workspace.addEventListener('click',(event)=>{
      const tab=event.target.closest?.('[data-workspace-tab]');
      if(tab && workspace.contains(tab)){showModuleTab(tab.dataset.workspaceTab);return;}
      const button=event.target.closest?.('[data-workspace-nav]');
      if(button && workspace.contains(button)){
        selectView(button.dataset.workspaceNav);
        closeMenu();
      }
    });
    document.addEventListener('click',(event)=>{if(!workspace.contains(event.target))closeMenu();});
    document.addEventListener('keydown',(event)=>{if(event.key==='Escape')closeMenu();});
    const updateScan=()=>{
      if(!status)return;
      const fail=error?.style.display!=='none' ? (error?.textContent?.trim()||''):'';
      const info=review?.textContent?.trim()||'';
      const running=Boolean(importButton?.disabled);
      if(fail){
        status.textContent=translate('Tietojen haku epäonnistui','Hämtningen misslyckades','Website scan failed');
        if(detail)detail.textContent=fail;
      }else if(running){
        status.textContent=progressLabel?.textContent?.trim()||translate('Haetaan tietoja…','Hämtar uppgifter…','Scanning website…');
        if(detail)detail.textContent=progressPercent?.textContent?.trim()||'';
      }else if(info){
        status.textContent=translate('Verkkosivun haku valmis','Webbplatssökningen är klar','Website scan complete');
        if(detail)detail.textContent=demo?translate('Kysy botilta mitä vain.','Fråga botten vad du vill.','Ask your bot a question.'):translate('Tarkista löydetyt tiedot asetuksissa.','Granska uppgifterna i inställningarna.','Review imported information in settings.');
      }
    };
    importButton?.addEventListener('click',()=>{if(status)status.textContent=translate('Haetaan tietoja…','Hämtar uppgifter…','Scanning website…');setTimeout(updateScan,50);},{capture:true});
    for(const node of [review,error,progress])if(node)new MutationObserver(updateScan).observe(node,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['style']});
    updateScan();
  }

  // Opening /app again should return to the same clear, dark workspace rather
  // than the legacy dashboard. Demo data is intentionally ephemeral.
  orbit=createWorkspaceOrbit({workspace,navigate:selectView,translate});
  selectView(view);
  if(status && importButton?.disabled)status.textContent=workspace.dataset.lang==='sv'?'Hämtar webbplatsuppgifter…':workspace.dataset.lang==='en'?'Scanning website…':'Haetaan verkkosivun tietoja…';
  return true;
}
