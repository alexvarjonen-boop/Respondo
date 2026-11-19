import { createWorkspaceOrbit } from './workspace-orbit-v28.js?v=20261028-mobile-pinned-v37-home-parity-v39-logical-12-clickable-icons-v40-selected-state-v45-profile-wrap-v46-programmatic-jump-v2-profile-scroll-no-jump-v47';
// A single dark workspace after the five-card setup.
// Keep existing chat, scan and billing DOM nodes intact so their event handlers,
// authenticated API calls and tenant isolation are not replaced by demo stubs.
const $ = (selector) => document.querySelector(selector);


const workspaceGroups = [
  ['bot', ['Botti', 'Botten', 'Bot'], ['bot','answers','setup','install']],
  ['customers', ['Asiakkaat', 'Kunder', 'Customers'], ['conversations','customers','team']],
  ['sales', ['Myynti ja työt', 'Försäljning och jobb', 'Sales and work'], ['automation']],
  ['settings', ['Asetukset', 'Inställningar', 'Settings'], ['settings','integrations','billing','profile']]
];

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
  workspace.dataset.demo=demo?'true':'false';
  workspace.setAttribute('aria-label',choose('Respondo-työtila','Respondo-arbetsyta','Respondo workspace'));
  workspace.innerHTML=`
    <header class="respondo-workspace-header">
      <div class="respondo-workspace-brand"><span class="respondo-workspace-brand-logo"></span>
        <span class="respondo-workspace-brand-copy"><b>${escape(company)}</b><small>RESPONDO OS</small></span>
      </div>
      <div class="respondo-workspace-actions">
        <div class="respondo-workspace-language"></div>
        ${demo?'':`<div id="respondoWorkspaceFeatureFinder" class="rs-workspace-search">
          <input type="search" autocomplete="off" aria-label="${choose('Hae toimintoa','Sök funktion','Search features')}" placeholder="${choose('Hae','Sök','Search')}">
          <div class="rs-workspace-search-results" hidden></div>
        </div>`}
      </div>
    </header>
    ${demo?'':`<nav class="rs-workspace-nav" aria-label="${choose('Hallintapaneelin osiot','Kontrollpanelens avsnitt','Dashboard sections')}">
      ${[['all',['Yleisnäkymä','Översikt','Overview']],...workspaceGroups].map(([id,names])=>
        `<button type="button" data-workspace-group="${id}">${choose(...names)}</button>`).join('')}
    </nav>`}
    <div class="respondo-workspace-content">
      <div data-workspace-page="bot">
        <div class="respondo-workspace-bot-topline">
          <small class="respondo-workspace-kicker">${choose('BOTTISI ON TÄSSÄ','DIN BOTT ÄR HÄR','YOUR BOT IS HERE')}</small>
          <a class="respondo-workspace-bot-home" href="/" aria-label="${choose('Takaisin Respondon etusivulle','Tillbaka till Respondos startsida','Back to Respondo homepage')}"><span aria-hidden="true">←</span><span>${choose('Takaisin etusivulle','Tillbaka till startsidan','Back to homepage')}</span></a>
        </div>
        <h1>${choose('Kokeile bottiasi.','Testa din bot.','Try your bot.')}</h1>
        ${demo?`<p class="respondo-workspace-subtitle">${choose('Kirjoita kysymys alla olevaan keskusteluun. Voit testata bottia samalla, kun verkkosivun tietoja haetaan.','Skriv en fråga i chatten nedan. Du kan testa botten medan webbplatsen skannas.','Ask a question below. You can test your bot while your website is being scanned.')}</p>`:''}
        <div class="respondo-workspace-chat-card"><div id="respondoWorkspaceChatHost"></div></div>
        <div class="respondo-workspace-scan" role="status" aria-live="polite"><i aria-hidden="true"></i><div><b id="respondoWorkspaceScanStatus">${choose('Botti valmis kokeiltavaksi','Botten är redo att testas','Bot ready to try')}</b><br><span id="respondoWorkspaceScanDetail"></span></div></div>
        ${demo ? `<div class="respondo-workspace-owner-cta" aria-label="${choose('Tilaa Respondo yrityksellesi','Beställ Respondo till ditt företag','Get Respondo for your business')}">
          <span>${choose('Haluatko tämän botin yrityksellesi?','Vill du ha denna bot till ditt företag?','Want this bot on your website?')}</span>
          <a class="respondo-workspace-subscribe-link" href="/tilaus?lang=${lang}">${choose('Tilaa Respondo','Beställ Respondo','Subscribe to Respondo')}</a>
        </div>` : ''}
        ${demo?'':'<button type="button" class="respondo-workspace-review-link" data-workspace-import-review="true">'+choose('Tarkista haetut tiedot','Granska hämtade uppgifter','Review imported information')+' →</button>'}
      </div>
      <div data-workspace-page="overview" hidden>
        <h1>${choose('Yleisnäkymä','Översikt','Overview')}</h1>
        <div class="rs-workspace-directory"></div>
        <div class="rs-metrics-link" hidden></div>
        <div id="respondoWorkspaceOverviewStats" class="rs-overview-stats"></div>
      </div>
      <div data-workspace-page="modules" hidden>
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
  // Preserve server-rendered plan locks before relocating the old sections.
  // Reparenting a protected form must never make it appear available.
  if(!workspace.dataset.integrationLocksStamped){
    workspace.dataset.integrationLocksStamped='yes';
    for(const id of ['crm-integration','meta-native-connections',
      'business-integrations','commerce-integration','stripe-connect']){
      const pane=shell.querySelector('#'+id);
      // Provider-gated panels start hidden while readiness is checked.
      // This is NOT evidence that the subscribed customer lacks access.
      // Only the actual plan entitlement may lock those panels.
      if(pane?.dataset.respondoProviderGated==='yes'){
        if(pane.dataset.respondoPlanAllowed!=='yes')pane.dataset.respondoPlanLocked='yes';
      }else if(pane?.hidden)pane.dataset.respondoPlanLocked='yes';
    }
  }
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
  let activeGroup='all';
  let orbit=null;
  let activePanel=null;
  let activePlaceholder=null;
  let importedReviewNode=null;
  let importedReviewMarker=null;
  // Move the original website-import review, not a clone: its approve/select
  // handlers are attached to the original nodes and must continue to work.
  function restoreImportedReview(){
    if(importedReviewNode && importedReviewMarker?.parentNode){
      importedReviewMarker.replaceWith(importedReviewNode);
    }
    importedReviewNode=null;
    importedReviewMarker=null;
    $('#rsWorkspaceImportedReview')?.remove();
  }
  const overviewMetrics=['stats','respondo-intelligence','dashboard-insights'];
  const metricsHost=$('#respondoWorkspaceOverviewStats');
  let ownerTrafficPromise=null;
  function showOwnerTrafficWhenAuthorized(){
    if(demo||!metricsHost)return;
    // This endpoint enforces ownerTrafficOnly using the authenticated DB
    // account, so other tenants never see Respondon's internal visitor data.
    if(!ownerTrafficPromise){
      ownerTrafficPromise=fetch('/api/owner/traffic',{credentials:'same-origin'})
        .then(response=>response.ok?response.json():null).catch(()=>null);
    }
    ownerTrafficPromise.then(result=>{
      if(!result?.summary||!metricsHost.isConnected||metricsHost.querySelector('[data-rs-owner-traffic]'))return;
      const summary=result.summary;
      const group=document.createElement('div');
      group.className='stats rs-owner-traffic-metrics';
      group.dataset.rsOwnerTraffic='1';
      group.setAttribute('aria-label',translate('Sivuston kävijätilastot','Besöksstatistik för webbplatsen','Website visitor analytics'));
      for(const [value,label,caption] of [
        [summary.today_unique,translate('KÄVIJÄT TÄNÄÄN','BESÖKARE IDAG','VISITORS TODAY'),translate('yksilöllistä kävijää','unika besökare','unique visitors')],
        [summary.month_unique,translate('KÄVIJÄT 30 PV','BESÖKARE 30 DAGAR','VISITORS 30 DAYS'),translate('yksilöllistä kävijää','unika besökare','unique visitors')]
      ]){
        const article=document.createElement('article');
        article.className='stat';
        const small=document.createElement('small');
        small.textContent=label;
        const total=document.createElement('b');
        total.textContent=String(Math.max(0,Number(value)||0));
        const note=document.createElement('span');
        note.textContent=caption;
        article.append(small,total,note);
        group.appendChild(article);
      }
      const link=document.createElement('a');
      link.className='respondo-workspace-review-link';
      link.href='/trafic';
      link.textContent=translate('Avaa kaikki kävijätilastot →','Visa all besöksstatistik →','View all visitor analytics →');
      group.appendChild(link);
      metricsHost.prepend(group);
    });
  }
  const restoreOverviewMetrics=()=>{
    if(!metricsHost)return;
    for(const panel of [...metricsHost.children]){
      if(panel.hasAttribute('data-rs-owner-traffic'))continue;
      panel.hidden=true;
      panel.style.removeProperty('display');
      modules.appendChild(panel);
    }
  };
  const showOverviewMetrics=()=>{
    if(!metricsHost)return;
    showOwnerTrafficWhenAuthorized();
    // Display the REAL tenant metrics, not demo numbers or a fabricated visitor count.
    for(const cls of overviewMetrics){
      const panel=[...modules.children].find(el=>el.classList?.contains(cls));
      if(!panel)continue;
      panel.hidden=false;
      panel.style.setProperty('display','grid','important');
      metricsHost.appendChild(panel);
    }
  };
  const knownSections=[...storage.querySelectorAll('.dashboard-view-section')];
  // Only the selected module may leave storage. Explicit inline display wins
  // against the old high-specificity dashboard CSS on iOS Safari.
  const park=()=>{
    if(activePanel){
      // Restore nested panels with their original visibility. Hiding them
      // would make the next navigation mistake them for plan-locked panels.
      if(activePlaceholder?.parentNode){
        activePanel.style.removeProperty('display');
        activePanel.hidden=activePanel.dataset.respondoProviderGated==='yes' &&
          activePanel.dataset.respondoConnectorAvailable!=='yes';
        activePlaceholder.replaceWith(activePanel);
      }else{
        activePanel.style.setProperty('display','none','important');
        activePanel.hidden=true;
        storage.appendChild(activePanel);
      }
      activePlaceholder=null;
      activePanel=null;
    }
  };
  const showPanel=(id)=>{
    park();
    const target=storage.querySelector('#'+id);
    if(!target)return false;
    if(target.dataset.respondoPlanLocked==='yes')return false;
    // An allowed plan is not sufficient: hidden OAuth/Meta panels are
    // unavailable until the live provider prerequisite check succeeds.
    if(target.dataset.respondoProviderGated==='yes' &&
       target.dataset.respondoConnectorAvailable!=='yes')return false;
    // Enterprise-only integration panels stay locked on lower plans.
    if(target.parentElement?.id==='actions2' && target.hidden)return false;
    if(target.parentElement!==storage){
      activePlaceholder=document.createComment('respondo-module-return:'+id);
      target.before(activePlaceholder);
    }
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
  let currentAvatarObserver=null;
  const showSettings=(scope='settings')=>{
    currentAvatarObserver?.disconnect();
    currentAvatarObserver=null;
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
    const visibleFields=scope==='setup' ? fields.filter(([name])=>['botName','greeting','website'].includes(name)) : fields.filter(([name])=>['website','email','phone','hours'].includes(name));
    const examples={website:translate('https://yritys.fi','https://foretag.se','https://company.fi'),
      email:translate('info@yritys.fi','info@foretag.se','info@company.fi')};
    // Reuse the native profile avatar selector and uploader. The original
    // handlers crop the uploaded photo, update the live preview and persist
    // the resulting avatar together with the company profile.
    const originalPresets=[...original.querySelectorAll('.bot-avatar-option')];
    const activeAvatar=String(original.elements.botAvatar?.value||'robot-1');
    const avatarPanel=scope==='setup'
      ? '<fieldset class="rs-avatar-editor"><legend>'+safe(translate('Botin kuvake','Bottens ikon','Bot icon'))+'</legend>'+
        '<p>'+safe(translate('Voit vaihtaa kuvakkeen myös myöhemmin. Valitse valmis kuvake tai lataa oma kuva.','Du kan ändra ikonen även senare. Välj en färdig ikon eller ladda upp en egen bild.','You can change the icon at any time. Choose a preset or upload your own image.'))+'</p>'+
        '<div class="rs-avatar-current"><span id="rsAvatarPreview" class="rs-avatar-preview">'+
          ($('#botAvatarCurrent')?.innerHTML||'')+'</span><span>'+safe(translate('Nykyinen kuvake','Nuvarande ikon','Current icon'))+'</span></div>'+
        '<div class="rs-avatar-choices" role="group" aria-label="'+safe(translate('Valmiit kuvakkeet','Färdiga ikoner','Preset icons'))+'">'+
          originalPresets.map(button=>{
            const id=String(button.dataset.avatar||'');
            const label=String(button.querySelector('small')?.textContent||button.title||id);
            const markup=button.querySelector('span')?.innerHTML||'';
            return '<button type="button" class="rs-avatar-choice" data-rs-avatar="'+safe(id)+'" aria-label="'+safe(label)+'" aria-pressed="'+(id===activeAvatar)+'">'+
              '<span class="rs-avatar-thumbnail">'+markup+'</span><small>'+safe(label)+'</small></button>';
          }).join('')+
        '</div><label class="rs-avatar-upload"><span>'+safe(translate('Lataa oma kuva','Ladda upp egen bild','Upload your own image'))+'</span>'+
          '<small>PNG, JPG, WebP · 10 MB</small><input id="rsAvatarUpload" type="file" accept="image/png,image/jpeg,image/webp"></label>'+
        '<p class="rs-avatar-message" id="rsAvatarMessage" role="status" aria-live="polite"></p></fieldset>'
      : '';
    const shortcuts=scope==='settings'&&demo
      ? '<section class="rs-settings-directory" aria-label="'+safe(translate('Hallinnan osiot','Administrationsavsnitt','Management sections'))+'">'+
          '<p class="rs-settings-directory-kicker">'+safe(translate('ASETUKSET','INSTÄLLNINGAR','SETTINGS'))+'</p>'+
          '<div class="rs-settings-directory-list">'+
            [
              ['setup',translate('Botti ja yritys','Bot och företag','Bot and business'),translate('Nimi, kuvake ja aloitusviesti','Namn, ikon och välkomstmeddelande','Name, icon and greeting')],
              ['answers',translate('Tietopohja','Kunskapsbas','Knowledge base'),translate('Botin vastaukset ja tiedot','Bottens svar och information','Bot answers and information')],
              ['team',translate('Henkilökunta','Personal','Team'),translate('Työntekijät ja käyttöoikeudet','Anställda och åtkomst','Staff and access')],
              ['integrations',translate('Respondon työkalut','Respondos verktyg','Respondo tools'),translate('Asiakkaat, viestit, kalenteri ja automaatiot','Kunder, meddelanden, kalender och automatiseringar','Customers, messages, calendar and automations')],
              ['billing',translate('Laskutus','Fakturering','Billing'),translate('Tilaus ja maksutiedot','Abonnemang och betalningar','Subscription and payments')],
              ['profile',translate('Oma tili','Mitt konto','My account'),translate('Yritykset ja kirjautuminen','Företag och inloggning','Companies and sign-in')]
            ].map(([id,label,description])=>'<button type="button" class="rs-settings-directory-link" data-workspace-nav="'+safe(id)+'"><span><b>'+safe(label)+'</b><small>'+safe(description)+'</small></span><span class="rs-settings-chevron" aria-hidden="true">›</span></button>').join('')+
          '</div></section>'
      : '';
    card.innerHTML=shortcuts+'<form id="rsSimpleSettingsForm" class="rs-minimal-card rs-settings-card">'+
      (demo?'<p class="rs-minimal-intro">'+safe(translate('Muuta vain tarvitsemasi tiedot. Muut botin asetukset säilyvät ennallaan.','Ändra bara de uppgifter du behöver. Övriga inställningar sparas.','Change only what you need. All other bot settings stay saved.'))+'</p>':'')+
      visibleFields.map(([key,label,type])=>'<label class="rs-simple-field"><span>'+safe(label)+'</span><input type="'+type+'" name="'+key+'" maxlength="'+(key==='botName'?'40':'255')+'" placeholder="'+safe(examples[key]||'')+'" value="'+safe(original.elements[key]?.value||'')+'"></label>').join('')+
      avatarPanel+
      '<div class="rs-simple-actions"><button type="submit" class="rs-minimal-button">'+safe(translate('Tallenna muutokset','Spara ändringar','Save changes'))+'</button>'+
      '<button type="button" class="rs-secondary-button" data-workspace-nav="bot">'+safe(translate('Kokeile bottia','Testa botten','Try the bot'))+' →</button></div>'+
      '<p id="rsSimpleSettingsMessage" role="status" aria-live="polite"></p></form>';
    const form=$('#rsSimpleSettingsForm');
    const syncAvatar=()=>{
      const value=String(original.elements.botAvatar?.value||'robot-1');
      const preview=$('#rsAvatarPreview');
      const source=$('#botAvatarCurrent');
      if(preview&&source)preview.innerHTML=source.innerHTML;
      form?.querySelectorAll('[data-rs-avatar]').forEach(button=>{
        button.setAttribute('aria-pressed',String(button.dataset.rsAvatar===value));
      });
      const nativeMessage=$('#botAvatarMsg');
      const message=$('#rsAvatarMessage');
      if(message)message.textContent=nativeMessage?.textContent?.trim()||'';
      const processing=Boolean(nativeMessage?.querySelector('.bot-avatar-processing:not(.success):not(.error)'));
      const save=form?.querySelector('button[type="submit"]');
      if(save)save.disabled=processing;
      form?.querySelectorAll('[data-rs-avatar],#rsAvatarUpload').forEach(el=>{el.disabled=processing;});
    };
    if(avatarPanel){
      for(const button of form.querySelectorAll('[data-rs-avatar]')){
        button.addEventListener('click',()=>{
          const originalButton=originalPresets.find(x=>x.dataset.avatar===button.dataset.rsAvatar);
          originalButton?.click();
          syncAvatar();
        });
      }
      // File selection stays visible in the compact view. Forward the
      // native FileList to the existing validated/cropped uploader so there
      // are no duplicate image-processing or persistence paths.
      form.querySelector('#rsAvatarUpload')?.addEventListener('change',(event)=>{
        const selectedFiles=event.currentTarget.files;
        if(!selectedFiles?.length)return;
        const nativeUpload=$('#botAvatarUpload');
        try{
          if(!nativeUpload)throw Error('Uploader missing');
          nativeUpload.files=selectedFiles;
          nativeUpload.dispatchEvent(new Event('change',{bubbles:true}));
          syncAvatar();
        }catch{
          const message=$('#rsAvatarMessage');
          if(message)message.textContent=translate('Kuvan avaaminen epäonnistui. Kokeile uudelleen.','Det gick inte att öppna bilden. Försök igen.','Could not open the image. Please try again.');
        }finally{
          event.currentTarget.value='';
        }
      });
      currentAvatarObserver=new MutationObserver(syncAvatar);
      for(const node of [$('#botAvatarCurrent'),$('#botAvatarMsg')]){
        if(node)currentAvatarObserver.observe(node,{childList:true,subtree:true,characterData:true});
      }
      syncAvatar();
    }
    form?.addEventListener('submit',(event)=>{
      event.preventDefault();
      const message=$('#rsSimpleSettingsMessage');
      if($('#botAvatarMsg')?.querySelector('.bot-avatar-processing:not(.success):not(.error)')){
        if(message)message.textContent=translate('Kuvaa käsitellään vielä.','Bilden bearbetas fortfarande.','The image is still processing.');
        return;
      }
      if(!form.reportValidity())return;
      for(const [key] of visibleFields){
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
    metrics:translate('Tilastot','Statistik','Statistics'),
    setup:translate('Yritys ja botti','Företag och bot','Company and bot'),
    answers:translate('Vastaukset','Svar','Answers'),
    customers:translate('Asiakkaat ja liidit','Kunder och leads','Customers & leads'),
    conversations:translate('Keskustelut','Konversationer','Conversations'),
    team:translate('Henkilökunta','Personal','Team'),
    integrations:translate('Respondon työkalut','Respondos verktyg','Respondo tools'),
    automation:translate('Myynti ja työt','Försäljning och jobb','Sales and work'),
    install:translate('Asennus','Installation','Installation'),
    profile:translate('Profiili','Profil','Profile'),
    billing:translate('Laskutus','Fakturering','Billing'),
    settings:translate('Asetukset','Inställningar','Settings')
  };
  const tabs={
    automation:[['actions2',translate('Asiakaspyynnöt','Kundförfrågningar','Customer actions')],['quote-engine',translate('Hintalaskuri','Priskalkylator','Quote calculator')],['native-operations',translate('Omat työkalut','Inbyggda verktyg','Built-in tools')]],
    answers:[['knowledge',translate('Tietopohja','Kunskapsbas','Knowledge base')],['unanswered',translate('Puuttuvat vastaukset','Saknade svar','Unanswered')]],
    customers:[['leads',translate('Liidit ja yhteydenotot','Leads och kontakter','Leads & contacts')],['conversations',translate('Keskustelut','Konversationer','Conversations')]],
    conversations:[['conversations',translate('Keskusteluhistoria','Samtalshistorik','Conversation history')],['live-inbox',translate('Live-keskustelut','Livekonversationer','Live conversations')]],
    integrations:[['native-operations',translate('Respondon työkalut','Respondos verktyg','Respondo tools')],['crm-integration',translate('CRM-yhteydet','CRM-anslutningar','CRM connectors')],['business-integrations',translate('API ja webhookit','API och webhooks','API & webhooks')],['commerce-integration',translate('Verkkokaupat','Webbutiker','Online stores')],['booking-calendar',translate('Kalenteri','Kalender','Calendar')],['stripe-connect',translate('Stripe','Stripe','Stripe')],['meta-native-connections',translate('Viestikanavat','Meddelandekanaler','Messaging channels')]],
    profile:[['workspaces',translate('Yritykset','Företag','Companies')],['account-security',translate('Tilin asetukset','Kontoinställningar','Account security')]]
  };
  const primary={
    answers:'knowledge',customers:'leads',conversations:'conversations',team:'support-team',
    automation:'actions2',install:'install',integrations:'native-operations',
    profile:'workspaces',billing:'billing'
  };
  const groupFor=(view,tab)=>tab==='booking-calendar'?'sales':
    workspaceGroups.find(([, ,views])=>views.includes(view))?.[0];
  function updateGroupNavigation(){
    const group=selected==='overview'?activeGroup:selected==='metrics'?'all':workspace.dataset.nativeGroup||groupFor(selected,currentTab);
    const navigation=workspace.querySelector('.rs-workspace-nav');
    if(!navigation)return;
    navigation.hidden=selected==='overview'&&activeGroup==='all';
    navigation.querySelectorAll('[data-workspace-group]').forEach(button=>{
      if(button.dataset.workspaceGroup===group)button.setAttribute('aria-current','true');
      else button.removeAttribute('aria-current');
    });
  }
  // Do not show connector tabs simply because the server rendered their
  // forms. The configured, tenant-accessible provider probe must succeed.
  const moduleTabAvailable=id=>{
    const target=storage.querySelector('#'+id)||card.querySelector('#'+id);
    if(!target || target.dataset.respondoPlanLocked==='yes')return false;
    if(target.dataset.respondoProviderGated==='yes')
      return target.dataset.respondoConnectorAvailable==='yes';
    return true;
  };
  // Gmail/Meta status resolves asynchronously after the workspace appears.
  // Refresh only the available tab buttons; never interrupt the current form.
  function refreshProviderTabs(){
    if(selected!=='integrations')return;
    const header=workspace.querySelector('.rs-module-tabs');
    if(!header){
      const entry=entryForHash();
      if(!demo && entry?.[2]===currentTab && Boolean(activePanel)!==moduleTabAvailable(currentTab)){
        applyOwnerRoute(entry);
      }
      return;
    }
    const visible=tabs.integrations.filter(([id])=>moduleTabAvailable(id));
    const previous=[...header.querySelectorAll('[data-workspace-tab]')].map(b=>b.dataset.workspaceTab).join('|');
    if(previous===visible.map(([id])=>id).join('|'))return;
    // If the currently open provider becomes unavailable, return to an
    // actual working Respondo module instead of leaving an empty form visible.
    if(currentTab && !moduleTabAvailable(currentTab))showModuleTab('native-operations');
    header.replaceChildren();
    for(const [id,label] of visible){
      const button=document.createElement('button');
      button.type='button';button.dataset.workspaceTab=id;button.textContent=label;
      button.classList.toggle('active',id===currentTab);
      button.setAttribute('aria-pressed',String(id===currentTab));
      header.appendChild(button);
    }
  }
  let currentTab=null;
  function showModuleTab(id){
    restoreImportedReview();
    currentTab=id;
    const container=$('#respondoWorkspaceCardBody');
    if(!container)return;
    container.replaceChildren();
    workspace.classList.toggle('rs-knowledge-collapsed',id==='knowledge');
    if(!showPanel(id)){
      const target=storage.querySelector('#'+id);
      const locked=target?.dataset.respondoPlanLocked==='yes';
      const notConfigured=target?.dataset.respondoProviderGated==='yes' && !locked;
      callout(
        locked
          ?translate('Ominaisuus ei ole käytettävissä','Funktionen är inte tillgänglig','Feature unavailable')
          :notConfigured
            ?translate('Yhteyttä ei ole vielä käytettävissä','Anslutningen är inte tillgänglig ännu','Connection not available yet')
            :translate('Ei vielä tietoja','Inga uppgifter ännu','Nothing here yet'),
        locked
          ?translate('Tämä toiminto vaatii Enterprise-käyttöoikeuden. Tarkista työtilan paketti laskutuksesta.','Den här funktionen kräver Enterprise-behörighet. Kontrollera arbetsytans abonnemang under Fakturering.','This feature requires Enterprise access. Check the workspace plan under Billing.')
          :notConfigured
            ?translate('Palveluntarjoajan asetukset tai yhteyden tarkistus puuttuvat. Tarkista saatavilla olevat yhteydet Respondon työkalujen kautta.','Leverantörsinställningar eller anslutningskontroll saknas. Kontrollera tillgängliga anslutningar i Respondo-verktygen.','The provider registration or readiness check is not complete. View available connections in Respondo tools.')
            :translate('Tämä osio on tyhjä.','Det här avsnittet är tomt.','This section is empty.'),
        false
      );
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
    updateGroupNavigation();
    workspace.querySelectorAll('[data-workspace-tab]').forEach(button=>{
      button.classList.toggle('active',button.dataset.workspaceTab===id);
      button.setAttribute('aria-pressed',String(button.dataset.workspaceTab===id));
    });
  }
  const catalog=[
    [['Kokeile bottia','Testa botten','Try the bot'],'bot',null,'chat testaa'],
    [['Tietopohja ja vastaukset','Kunskapsbas och svar','Knowledge base and answers'],'answers','knowledge','faq qa vastaukset'],
    [['Asennus ja asennustarkistus','Installation och kontroll','Installation and verification'],'install','install','widget script upotus'],
    [['Muokkaa bottia','Redigera botten','Edit the bot'],'setup',null,'avatar nimi logo company'],
    [['Puuttuvat vastaukset','Saknade svar','Unanswered questions'],'answers','unanswered','laatu virheet'],
    [['Keskusteluhistoria','Samtalshistorik','Conversation history'],'conversations','conversations','chat'],
    [['Liidit ja yhteydenotot','Leads och kontakter','Leads and contacts'],'customers','leads','myynti crm'],
    [['Live-asiakaspalvelu','Livekundservice','Live customer support'],'conversations','live-inbox','henkilö vastaus'],
    [['Henkilökunta','Personal','Team members'],'team','support-team','työntekijä'],
    [['Asiakaspyynnöt','Kundförfrågningar','Customer requests'],'automation','actions2','tarjous'],
    [['Hintalaskuri','Priskalkylator','Quote calculator'],'automation','quote-engine','tarjous tarjouslaskenta offert estimate ikkuna ikkunanpesu fönster window yksikköhinta €/ikkuna'],
    [['Yrityksen tiedot','Företagsuppgifter','Company details'],'settings',null,'aukioloajat yhteystiedot verkkosivu'],
    [['Laskutus ja tilaus','Fakturering och abonnemang','Billing and subscription'],'billing','billing','stripe'],
    [['Tilin tietoturva','Kontosäkerhet','Account security'],'profile','account-security','salasana profiili'],
    [['Yritystilien hallinta','Hantera företag','Manage companies'],'profile','workspaces','tyotilat'],
    [['Ajanvarauksen asetukset','Bokningsinställningar','Booking settings'],'integrations','booking-calendar','varaus aika'],
    [['CRM-yhteydet','CRM-anslutningar','CRM connections'],'integrations','crm-integration','hubspot pipedrive'],
    [['API ja webhookit','API och webhooks','API and webhooks'],'integrations','business-integrations','kehittaja'],
    [['Verkkokauppayhteydet','Webbutiksanslutningar','Online store connections'],'integrations','commerce-integration','shopify woocommerce'],
    [['Viestikanavien yhteydet','Meddelandekanaler','Messaging channels'],'integrations','meta-native-connections','instagram facebook whatsapp'],
    [['Stripe-maksut','Stripe-betalningar','Stripe payments'],'integrations','stripe-connect','maksuyhteys betala'],
  ];

  // Native tools reuse the same mounted form and select just one tool view.
  const nativeTools=[
    ['bot','docs',['Tietodokumentit','Kunskapsdokument','Knowledge documents'],''],
    ['bot','quality',['Vastausten laatu','Svarskvalitet','Answer quality'],'analytiikka virheet'],
    ['customers','contacts',['Asiakasrekisteri','Kundregister','Contact records'],'crm'],
    ['customers','inbox',['Viestikeskus','Meddelandecenter','Inbox'],'viestit chat'],
    ['customers','tickets',['Tukipyynnöt','Supportärenden','Support tickets'],'tiketit'],
    ['sales','quotes',['Tarjousluonnokset','Offertutkast','Quote drafts'],'tarjous'],
    ['sales','calendar',['Oma kalenteri','Egen kalender','Built-in calendar'],'ajanvaraus'],
    ['sales','tasks',['Työtehtävät','Arbetsuppgifter','Tasks'],'muistutukset'],
    ['sales','orders',['Tilaukset','Beställningar','Orders'],'tilaus'],
    ['sales','rules',['Toimintosäännöt','Åtgärdsregler','Action rules'],'automaatiot'],
    ['sales','flows',['Työnkulut','Arbetsflöden','Workflows'],'automaatiot'],
    ['settings','helpdesk',['Freshdesk','Freshdesk','Freshdesk'],'tukijärjestelmä']
  ];
  catalog.push(
    ...nativeTools.map(([group,tool,names,keywords])=>[names,'automation','native-operations',keywords,tool,group]),
    [['Tulokset','Resultat','Outcomes'],'automation','native-operations','liidit tilastot', 'insights','metrics'],
    [['Tuodut tiedot','Importerade uppgifter','Imported information'],'answers',null,'verkkosivu tiedonhaku','review','bot'],
    [['Tilastot','Statistik','Statistics'],'metrics',null,'kävijät analytiikka','', 'all']
  );
  const keyFor=([,view,tab,,tool])=>tool?(tool==='review'?'imported-information':'tools/'+tool):tab||view;
  const byKey=new Map(catalog.map(entry=>[keyFor(entry),entry]));
  const hashPrefix='#dashboard/';
  const hashKey=()=>location.hash.startsWith(hashPrefix)?location.hash.slice(hashPrefix.length):'';
  const entryForHash=()=>byKey.get(hashKey());
  const isAvailable=entry=>!entry[2]||moduleTabAvailable(entry[2]);
  const openGroup=key=>workspaceGroups.find(([id])=>key==='section/'+id);

  function focusOwnerPage(){
    const title=workspace.querySelector('[data-workspace-page]:not([hidden]) h1');
    if(!title)return;
    title.tabIndex=-1;
    title.scrollIntoView({behavior:'instant',block:'start'});
    title.focus({preventScroll:true});
  }

  function applyOwnerRoute(entry){
    const [names,view,tab,,tool,group]=entry;
    if(tool==='review'){
      openImportedReview();
      workspace.querySelector('#respondoWorkspaceModuleTitle').textContent=translate(...names);
      return;
    }
    selectView(view,tab);
    if(tool){
      workspace.dataset.nativePage=tool;
      workspace.dataset.nativeGroup=group==='metrics'?'all':group;
      const mount=card.querySelector('#respondoNativeOperationsMount');
      if(mount){
        mount.dataset.requestedTab=tool;
        mount.dispatchEvent(new Event('respondo:select-native-tab'));
      }
      updateGroupNavigation();
    }
    if(view!=='bot'&&view!=='metrics'){
      workspace.querySelector('#respondoWorkspaceModuleTitle').textContent=translate(...names);
    }
  }

  function showOwnerRoute(entry,moveFocus=true){
    const key=hashKey();
    if(entry)applyOwnerRoute(entry);
    else{
      activeGroup=openGroup(key)?.[0]||'all';
      selectView('overview');
    }
    if(moveFocus)focusOwnerPage();
  }

  function navigateOwner(key){
    const hash=key?hashPrefix+key:'';
    if(location.hash!==hash)history.pushState(null,'',location.pathname+location.search+hash);
    showOwnerRoute(byKey.get(key));
  }

  function makeItem(entry){
    const available=isAvailable(entry);
    const item=document.createElement('button');
    item.type='button';
    item.className='rs-feature-finder-item';
    item.disabled=!available;
    item.textContent=translate(...entry[0]);
    if(available)item.addEventListener('click',()=>{
      closeSearch();
      navigateOwner(keyFor(entry));
    });
    else{
      const status=document.createElement('small');
      status.textContent=translate('Ei käytettävissä','Inte tillgänglig','Unavailable');
      item.append(status);
    }
    return item;
  }

  function renderDirectory(){
    const list=workspace.querySelector('.rs-workspace-directory');
    list.replaceChildren();
    if(activeGroup==='all'){
      const items=[...workspaceGroups.map(([id,names])=>['section/'+id,names]),
        ['metrics',['Tilastot','Statistik','Statistics']]];
      for(const [key,names] of items){
        const button=document.createElement('button');
        button.type='button';
        button.className='rs-feature-finder-item rs-directory-section';
        button.textContent=translate(...names);
        button.addEventListener('click',()=>navigateOwner(key));
        list.appendChild(button);
      }
      return;
    }
    for(const entry of catalog){
      if((entry[5]||groupFor(entry[1],entry[2]))===activeGroup && isAvailable(entry)){
        list.appendChild(makeItem(entry));
      }
    }
  }

  const searchHost=workspace.querySelector('#respondoWorkspaceFeatureFinder');
  const search=searchHost?.querySelector('input');
  const searchResults=searchHost?.querySelector('.rs-workspace-search-results');
  function closeSearch(){
    if(!search)return;
    search.value='';
    searchResults.hidden=true;
  }
  function ensureFeatureFinder(){
    if(!search||searchHost.dataset.ready==='yes')return;
    searchHost.dataset.ready='yes';
    const normalize=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    function render(){
      const words=normalize(search.value.trim()).split(/\s+/).filter(Boolean);
      searchResults.replaceChildren();
      searchResults.hidden=!words.length;
      if(!words.length)return;
      const matches=catalog.filter(([names,,,aliases])=>
        words.every(word=>normalize(names.join(' ')+' '+aliases).includes(word)));
      if(matches.length){
        const ranked=[...matches.filter(isAvailable),...matches.filter(entry=>!isAvailable(entry))];
        for(const entry of ranked.slice(0,8))searchResults.appendChild(makeItem(entry));
      }else{
        const empty=document.createElement('p');
        empty.className='rs-feature-finder-empty';
        empty.textContent=translate('Toimintoa ei löytynyt.','Ingen träff.','No matching feature.');
        searchResults.appendChild(empty);
      }
    }
    search.addEventListener('input',render);
    search.addEventListener('focus',render);
    searchResults.addEventListener('pointerdown',event=>{
      if(event.target.closest('button'))event.preventDefault();
    });
    searchHost.addEventListener('focusout',event=>{
      if(!searchHost.contains(event.relatedTarget))searchResults.hidden=true;
    });
    searchHost.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&!searchResults.hidden){
        event.preventDefault();
        closeSearch();
        search.focus();
      }else if(event.key==='Enter'&&event.target===search&&!searchResults.hidden){
        searchResults.querySelector('button:not(:disabled)')?.click();
      }
    });
    workspace.addEventListener('respondo:provider-availability',()=>{
      if(selected==='overview')renderDirectory();
      if(!searchResults.hidden)render();
    });
  }

  function selectView(next, tab=null){
    restoreImportedReview();
    currentAvatarObserver?.disconnect();
    currentAvatarObserver=null;
    selected=Object.hasOwn(pages,next)?next:demo?'bot':'overview';
    workspace.dataset.currentView=selected;
    delete workspace.dataset.nativePage;
    delete workspace.dataset.nativeGroup;
    orbit?.sync(selected);
    restoreOverviewMetrics();
    park();
    card.replaceChildren();
    // The public demo keeps its chat and orbit together. Owner views show one destination at a time.
    workspace.querySelectorAll('[data-workspace-page]').forEach(element=>{
      const page=element.dataset.workspacePage;
      element.hidden=!((page==='bot' && (demo||selected==='bot')) ||
        (['overview','metrics'].includes(selected) && page==='overview') ||
        (!['bot','overview','metrics'].includes(selected) && page==='modules'));
    });
    workspace.querySelectorAll('[data-workspace-nav]').forEach(button=>{
      const on=button.dataset.workspaceNav===selected;
      button.classList.toggle('active',on);
      if(on)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
    });
    if(!demo){
      currentTab=null;
      updateGroupNavigation();
      if(selected==='overview'||selected==='metrics'){
        const names=workspaceGroups.find(([id])=>id===activeGroup)?.[1];
        const title=workspace.querySelector('[data-workspace-page="overview"] h1');
        const directory=workspace.querySelector('.rs-workspace-directory');
        title.textContent=selected==='metrics'?pages.metrics:names?translate(...names):pages.overview;
        directory.hidden=selected==='metrics';
        metricsHost.hidden=selected!=='metrics';
        const outcomes=workspace.querySelector('.rs-metrics-link');
        outcomes.hidden=selected!=='metrics';
        if(selected==='overview')renderDirectory();
        else{
          outcomes.replaceChildren(makeItem(byKey.get('tools/insights')));
          showOverviewMetrics();
        }
      }
    }
    const heading=$('#respondoWorkspaceModuleTitle');
    if(heading)heading.textContent=pages[selected]||pages.bot;
    const empty=$('#respondoWorkspaceEmpty');
    if(empty)empty.hidden=true;
    // Demo has no real customer accounts, Stripe billing, installation or
    // automation records. Show a short truthful CTA, never unrelated data.
    if(demo && ['customers','conversations','team','automation','install','integrations','billing','profile'].includes(selected)){
      const details={
        customers:translate('Liidit ja yhteydenotot näkyvät yritystilillä.','Leads och kontakter visas i företagskontot.','Leads and contacts appear in your company account.'),
        conversations:translate('Asiakaskeskustelut näkyvät yritystilillä.','Kundkonversationer visas i företagskontot.','Customer conversations appear in your company account.'),
        team:translate('Luo henkilökunnan profiilit yritystilillä.','Skapa personalprofiler i företagskontot.','Create team profiles in your company account.'),
        integrations:translate('Yhdistä ulkoiset palvelut yritystilillä.','Anslut externa tjänster i företagskontot.','Connect external services in your company account.'),
        automation:translate('Automaatiot ovat käytettävissä yritystilillä.','Automatiseringar finns med företagskonto.','Automations are available with a company account.'),
        install:translate('Asennuskoodi luodaan yritystilillä.','Installationskoden skapas i företagskontot.','Your website installation code is created in a company account.'),
        billing:translate('Demosta ei veloiteta. Valitse yrityksellesi tilaus.','Demon är gratis. Välj abonnemang för företaget.','This demo is free. Choose a plan for your company.'),
        profile:translate('Profiili luodaan rekisteröitymisen yhteydessä.','Profilen skapas vid registrering.','Your profile is created when you sign up.')
      };
      callout(pages[selected],details[selected]);
    }else if(['settings','setup'].includes(selected)){
      showSettings(selected);
    }else if(primary[selected]){
      const available=tabs[selected]?.filter(([id])=>moduleTabAvailable(id));
      if(!tab&&available?.length){
        const header=document.createElement('nav');
        header.className='rs-module-tabs';
        header.setAttribute('aria-label',pages[selected]);
        header.innerHTML=available.map(([id,label])=>'<button type="button" data-workspace-tab="'+safe(id)+'">'+safe(label)+'</button>').join('');
        card.before(header);
        workspace.querySelectorAll('.rs-module-tabs').forEach((old)=>{if(old!==header)old.remove()});
      }else workspace.querySelectorAll('.rs-module-tabs').forEach(old=>old.remove());
      showModuleTab(tab||primary[selected]);
    }else{
      // Nothing else from the legacy dashboard should leak into the current
      // menu item even if original data modules are still present in the DOM.
      workspace.querySelectorAll('.rs-module-tabs').forEach(old=>old.remove());
    }
    if(!primary[selected])workspace.querySelectorAll('.rs-module-tabs').forEach(old=>old.remove());
  }

  function openImportedReview(){
    selectView('answers','knowledge');
    if(!demo){
      park();
      card.replaceChildren();
    }
    const source=$('#websiteImportReview');
    const heading=document.createElement('section');
    heading.id='rsWorkspaceImportedReview';
    heading.className='rs-imported-review';
    const title=document.createElement('h2');
    title.textContent=translate('Verkkosivulta haetut tiedot',
      'Importerad information från webbplatsen','Information imported from the website');
    const description=document.createElement('p');
    const hasPending=Boolean(source?.querySelector('.website-import-candidate'));
    description.textContent=hasPending
      ?translate('Tarkista tiedot ennen hyväksymistä.',
        'Granska uppgifterna före godkännande.',
        'Review the details before approving them.')
      :translate('Ei tarkistettavia tietoja.',
        'Det finns inga importerade uppgifter som väntar på granskning. Sparade svar visas nedan.',
        'No information awaiting review.');
    heading.append(title,description);
    if(source && source.textContent.trim()){
      // Keep live importer checkboxes and approve handlers operational.
      importedReviewMarker=document.createComment('restore website import review');
      source.before(importedReviewMarker);
      importedReviewNode=source;
      heading.append(source);
    }
    card.prepend(heading);
    // An instant jump avoids triggering the sphere's scroll-driven first
    // chapter (Overview) during smooth movement across the orbit.
    requestAnimationFrame(()=>{
      if(heading.isConnected && !heading.closest('[hidden]')){
        orbit?.suspendPin?.();
        heading.scrollIntoView({behavior:'auto',block:'start'});
        heading.setAttribute('tabindex','-1');
        heading.focus({preventScroll:true});
      }
    });
  }

  if(!workspace.dataset.initialized){
    workspace.dataset.initialized='1';
    workspace.addEventListener('respondo:provider-availability',refreshProviderTabs);
    workspace.addEventListener('click',(event)=>{
      const groupButton=event.target.closest?.('[data-workspace-group]');
      if(groupButton && workspace.contains(groupButton)){
        closeSearch();
        const group=groupButton.dataset.workspaceGroup;
        navigateOwner(group==='all'?'overview':'section/'+group);
        return;
      }
      const review=event.target.closest?.('[data-workspace-import-review]');
      if(review && workspace.contains(review)){
        event.preventDefault();
        if(demo)openImportedReview();
        else navigateOwner('imported-information');
        return;
      }
      const tab=event.target.closest?.('[data-workspace-tab]');
      if(tab && workspace.contains(tab)){showModuleTab(tab.dataset.workspaceTab);return;}
      const shortcut=event.target.closest?.('[data-workspace-nav]');
      if(shortcut && workspace.contains(shortcut)){
        if(demo)selectView(shortcut.dataset.workspaceNav);
        else navigateOwner(shortcut.dataset.workspaceNav);
      }
    });
    if(!demo){
      ensureFeatureFinder();
      const onHistory=()=>{
        if(!workspace.isConnected){
          window.removeEventListener('hashchange',onHistory);
          return;
        }
        closeSearch();
        const key=hashKey();
        if(!key && new URLSearchParams(location.search).has('section')){
          activeGroup='all';
          selectView(view);
          focusOwnerPage();
        }else showOwnerRoute(entryForHash());
      };
      window.addEventListener('hashchange',onHistory);
    }
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

  if(demo)orbit=createWorkspaceOrbit({workspace,navigate:selectView,translate});
  if(!demo && hashKey())showOwnerRoute(entryForHash(),false);
  else selectView(view);
  // OAuth redirects and deep links must land on the requested module rather
  // than leaving the permanently bot-first workspace at the top of the page.
  const initialSection=new URLSearchParams(location.search).get('section');
  if(!demo && initialSection==='integrations' && workspace.dataset.currentView==='integrations'){
    requestAnimationFrame(()=>{
      const target=workspace.querySelector('[data-workspace-page="modules"]');
      if(!target || target.hidden)return;
      orbit?.suspendPin?.();
      target.scrollIntoView({behavior:'auto',block:'start'});
      // A direct integrations callback should also select the matching
      // chapter in the visible orbit rather than retaining 01/12 Overview.
      orbit?.sync('integrations');
      const feedback=workspace.querySelector('.rs-integration-oauth-feedback');
      const focusTarget=feedback||workspace.querySelector('#respondoWorkspaceModuleTitle');
      if(focusTarget){
        focusTarget.setAttribute('tabindex','-1');
        focusTarget.focus({preventScroll:true});
      }
    });
  }
  if(status && importButton?.disabled)status.textContent=workspace.dataset.lang==='sv'?'Hämtar webbplatsuppgifter…':workspace.dataset.lang==='en'?'Scanning website…':'Haetaan verkkosivun tietoja…';
  return true;
}
