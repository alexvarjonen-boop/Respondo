(() => {
  'use strict';
  // This guide never stores API keys or initiates a connection on its own.
  // It sends the owner to EXISTING tenant-scoped forms and OAuth consent flows.
  const tr=(fi,sv,en,lang)=>({fi,sv,en})[lang]||en;
  const groups=[
    {id:'mail',label:['Sähköpostit','E-post','Email'],help:['Lue asiakasviestejä ja hyväksy vastaukset Respondossa.','Läs kundmejl och godkänn svar i Respondo.','Read customer emails and approve replies in Respondo.']},
    {id:'calendar',label:['Ajanvaraus','Tidsbokning','Bookings'],help:['Näytä vapaat ajat ilman päällekkäisiä varauksia.','Visa lediga tider utan dubbelbokningar.','Show free times without double bookings.']},
    {id:'crm',label:['Liidit ja asiakkaat','Leads och kunder','Leads & customers'],help:['Siirrä hyväksytyt liidit asiakasjärjestelmään.','Överför godkända leads till ert CRM.','Sync consented leads with your CRM.']},
    {id:'commerce',label:['Verkkokauppa','Webbutik','Online store'],help:['Hae asiakkaan tilaustiedot turvallisesti.','Kontrollera kundorder på ett säkert sätt.','Look up customer orders safely.']},
    {id:'payments',label:['Maksaminen','Betalningar','Payments'],help:['Vastaanota maksuja yrityksen omalle tilille.','Ta emot betalningar till företagets konto.','Accept payments in your own business account.']},
    {id:'social',label:['Viestikanavat','Meddelandekanaler','Messaging channels'],help:['Käsittele yrityksen viestejä yhdestä paikasta.','Hantera företagets meddelanden på ett ställe.','Handle business messages in one place.']},
    {id:'support',label:['Tukipyynnöt','Supportärenden','Support tickets'],help:['Vie hyväksytyt tukipyynnöt tukijärjestelmään.','Skicka godkända ärenden till supportverktyget.','Send approved tickets to a support desk.']},
    {id:'files',label:['Tiedostot ja tietopohja','Filer och kunskapsbas','Files & knowledge'],help:['Tuo vain tarkistetut dokumentit botin käyttöön.','Importera endast granskade dokument till botten.','Import only reviewed documents into your bot.']},
    {id:'advanced',label:['Muut yhteydet','Andra anslutningar','Other connections'],help:['Webhookit ja omat rajapinnat edistyneille käyttäjille.','Webhookar och API:er för avancerade användare.','Webhooks and custom APIs for advanced users.']}
  ];
  const providers=[
    {id:'gmail',group:'mail',name:'Gmail',tab:'native-mail-connections',href:'/api/app/native/mail/gmail/start',
      step:['Valitse Yhdistä Google-tili ja hyväksy oikeudet Googlen sivulla. Saapuneet viestit tulevat Respondon inboxiin. Lähetys vaatii erillisen hyväksynnän.','Välj Anslut Google-konto och godkänn behörigheterna hos Google. Utgående svar kräver godkännande.','Connect your Google account and approve access at Google. Incoming mail goes to Respondo; each outgoing reply needs approval.']},
    {id:'outlook',group:'mail',name:'Outlook / Microsoft 365',tab:'native-mail-connections',href:'/api/app/native/mail/outlook/start',
      step:['Kirjaudu Microsoft-tilille ja hyväksy pyydetyt oikeudet. Viestit haetaan Respondoon, mutta niitä ei lähetetä ilman hyväksyntää.','Logga in hos Microsoft och godkänn åtkomst. Utgående meddelanden kräver godkännande.','Sign in with Microsoft and approve access. Respondo imports mail; sending always requires approval.']},
    {id:'google_calendar',group:'calendar',name:'Google Calendar',tab:'booking-calendar',href:'/api/app/google-calendar/start',
      step:['Yhdistä Google-tili ja hyväksy kalenterin käyttö. Määritä sen jälkeen palvelujen kestot ja työajat. Respondo ei vahvista varausta ilman tarkistusta.','Godkänn kalenderåtkomst hos Google och ange sedan tjänsternas tidsåtgång.','Authorize calendar access, then set your service durations and working hours. Respondo does not promise unverified bookings.']},
    {id:'native_calendar',group:'calendar',name:'Respondo Calendar',tab:'booking-calendar',
      step:['Tämä toimii ilman ulkoista palvelua. Luo vapaat ajat ja hyväksy varauspyynnöt Respondossa.','Fungerar utan extern tjänst. Skapa lediga tider och godkänn bokningar i Respondo.','Works without another service. Create available slots and approve booking requests in Respondo.']},
    {id:'hubspot',group:'crm',name:'HubSpot',tab:'crm-integration',provider:'hubspot',
      step:['Luo HubSpotissa Private App, jolla on yhteystietojen luku- ja kirjoitusoikeus. Kopioi token alla olevaan kenttään. Respondo testaa yhteyden ennen tallennusta.','Skapa en Private App med kontaktbehörighet i HubSpot, klistra in token och verifiera.','Create a HubSpot Private App with contact read/write permissions. Paste its token into the form; Respondo verifies it before saving.']},
    {id:'pipedrive',group:'crm',name:'Pipedrive',tab:'crm-integration',provider:'pipedrive',
      step:['Avaa Pipedriven henkilökohtaiset asetukset ja kopioi API-tunnus. Liitä se alla olevaan kenttään. Älä jaa tunnusta sähköpostitse.','Hämta din API-token från Pipedrives kontoinställningar och klistra in den nedan.','Copy your API token from Pipedrive account settings and paste it in the form. Do not send the token by email.']},
    {id:'shopify',group:'commerce',name:'Shopify',tab:'commerce-integration',provider:'shopify',
      step:['Tarvitset kauppasi .myshopify.com-osoitteen ja Shopify Admin API -tunnuksen, jolla on tarvittavat tilausoikeudet. Respondo tallentaa tunnuksen suojattuna.','Du behöver butikens .myshopify.com-adress och en Admin API-token med läsrättigheter för ordrar.','Enter the .myshopify.com store address and an Admin API token with the required order access. The token stays server-side.']},
    {id:'woocommerce',group:'commerce',name:'WooCommerce',tab:'commerce-integration',provider:'woocommerce',
      step:['Anna kauppasi HTTPS-osoite ja luo WooCommercessa REST API -tunnukset, joilla on tarvittavat lukuoikeudet.','Ange butikens HTTPS-adress och skapa REST API-nycklar med läsbehörighet i WooCommerce.','Enter your store HTTPS URL and generate WooCommerce REST API credentials with the required read permissions.']},
    {id:'stripe',group:'payments',name:'Stripe',tab:'stripe-connect',
      step:['Paina Yhdistä yrityksen Stripe ja viimeistele yrityksen tunnistaminen Stripen sivulla. Maksut eivät ole käytössä ennen Stripen hyväksyntää.','Anslut Stripe och slutför företagsverifieringen. Betalningarna aktiveras först efter godkännande.','Connect Stripe and complete business verification. Payments only work after Stripe enables charges.']},
    {id:'whatsapp',group:'social',name:'WhatsApp Business',tab:'meta-native-connections',provider:'whatsapp',
      step:['Tarvitset Meta Business -kanavatunnuksen sekä pääsytunnuksen. Respondo tarkistaa tunnukset; kanavan automaattinen lähetys ei käynnisty.','Du behöver Meta Business kanal-ID och åtkomsttoken. Automatiska utgående svar aktiveras inte.','Provide the Meta Business channel ID and access token. Connecting does not enable automatic outgoing replies.']},
    {id:'instagram',group:'social',name:'Instagram Business',tab:'meta-native-connections',provider:'instagram',
      step:['Yhdistä Meta Business -kanavatunnuksella ja pääsytunnuksella. Vastaukset vaativat hyväksynnän.','Använd Meta Business kanal-ID och token. Utgående svar kräver godkännande.','Use a Meta Business resource ID and access token. Outgoing replies require approval.']},
    {id:'facebook',group:'social',name:'Facebook Messenger',tab:'meta-native-connections',provider:'facebook',
      step:['Tarvitset Facebook-sivun kanavatunnuksen ja Metan pääsytunnuksen. Tarkista oikeudet ennen yhdistämistä.','Använd sidans resurs-ID och Meta-token. Granska behörigheterna före anslutning.','Use the page resource ID and Meta access token. Review scopes before connecting.']},
    {id:'freshdesk',group:'support',name:'Freshdesk',tab:'native-operations',nativeTab:'helpdesk',
      step:['Anna Freshdesk-osoitteen alkuosa ja Freshdesk API -avain alla olevaan lomakkeeseen. Vienti vaatii erillisen hyväksynnän.','Ange Freshdesk-domän och API-nyckel nedan. Export kräver separat godkännande.','Enter your Freshdesk subdomain and API key below. Ticket exports still require explicit approval.']},
    {id:'zendesk',group:'support',name:'Zendesk',tab:'native-operations',nativeTab:'zendesk',
      step:['Anna Zendesk-aliverkkotunnus ja valtuuta yhteys Zendeskin sivulla. Jos palvelu ei ole valmiiksi määritetty, yhteys vaatii Respondon ylläpidon asetukset.','Ange Zendesk-underdomän och godkänn OAuth. Om appen saknar konfiguration krävs administratör.','Enter your Zendesk subdomain and authorize through Zendesk. If the OAuth app is not configured, administrator setup is required.']},
    {id:'google_drive',group:'files',name:'Google Drive',tab:'native-operations',nativeTab:'docs',href:'/api/app/native/cloud/google_drive/start',
      step:['Valtuuta vain lukuoikeus Google Driveen. Valitse sen jälkeen yksittäiset dokumentit ja hyväksy niiden julkaiseminen botille.','Godkänn läsbehörighet för Drive. Välj sedan dokument och godkänn publicering.','Authorize read-only Google Drive access. Choose documents individually and approve publishing them to your bot.']},
    {id:'sharepoint',group:'files',name:'Microsoft SharePoint',tab:'native-operations',nativeTab:'docs',
      step:['SharePoint tarvitsee sivustotunnuksen ennen Microsoft-valtuutusta. Avaa dokumenttiasetukset alla ja syötä sivustotunnus.','SharePoint kräver webbplats-ID innan Microsoft-auktorisering.','SharePoint requires a site ID before Microsoft authorization. Open the documents section and enter the site ID.']},
    {id:'webhooks',group:'advanced',name:'Webhooks / API',tab:'business-integrations',
      step:['Käytä vain, jos yritykselläsi on oma HTTPS-vastaanotin. Aseta osoite ja testaa toimitus. Tavalliseen käyttöönottoon tätä ei tarvita.','Endast för företag med egen HTTPS-mottagare. Inte nödvändigt för normal start.','Only needed if you have your own HTTPS receiver. Enter the endpoint and test delivery; ordinary setups do not need this.']}
  ];
  const $=(q,base=document)=>base.querySelector(q);
  const getLocale=workspace=>{
    const raw=String(workspace.dataset.lang||document.documentElement.lang||'en').slice(0,2);
    return ['fi','sv','en'].includes(raw)?raw:'en';
  };
  const dict={
    fi:{title:'Yhdistä palvelut helposti',intro:'Et tarvitse kaikkia integraatioita. Valitse, mitä haluat Respondon tekevän, ja seuraa yhtä vaihetta kerrallaan.',first:'1. Mitä haluat tehdä?',second:'2. Valitse käyttämäsi palvelu',third:'3. Viimeistele yhdistäminen',back:'Takaisin',open:'Avaa yhdistämisasetukset',authorize:'Yhdistä ja hyväksy oikeudet',oauthNotice:'Avautuvalla palveluntarjoajan sivulla kirjaudut ja hyväksyt yhteyden itse.',technical:'Näytä tekniset asetukset',hideTechnical:'Piilota tekniset asetukset',check:'Päivitä yhteyksien tilat',connected:'Yhteys tallennettu',ready:'Maksut käytössä',partial:'Määritetty — tarkista viestien vastaanotto',unknown:'Tila tarkistettava',notConnected:'Ei yhdistetty',restricted:'Tämä yhteys ei sisälly nykyiseen tilaukseen.',needsPermission:'Kirjautumista tai käyttöoikeuksia ei voi ohittaa automaattisesti.',noExtra:'Respondon omat toiminnot eivät tarvitse ulkoista integraatiota.',statusError:'Yhteyksien tilaa ei voitu tarkistaa kokonaan. Aiemmat asetukset säilyvät.',list:'Palvelut',example:'Valitse alta käyttämäsi järjestelmä. Näet vain sen asetukset.',groupCount:'palvelua'},
    sv:{title:'Anslut tjänster enkelt',intro:'Du behöver inte alla integrationer. Välj vad du vill göra och följ ett steg i taget.',first:'1. Vad vill du göra?',second:'2. Välj din tjänst',third:'3. Slutför anslutningen',back:'Tillbaka',open:'Öppna anslutningsinställningar',authorize:'Anslut och ge behörighet',oauthNotice:'Du loggar in och godkänner åtkomst på leverantörens sida.',technical:'Visa tekniska inställningar',hideTechnical:'Dölj tekniska inställningar',check:'Uppdatera anslutningsstatus',connected:'Anslutning sparad',ready:'Betalningar aktiva',partial:'Konfigurerad – kontrollera meddelandemottagning',unknown:'Status behöver kontrolleras',notConnected:'Inte ansluten',restricted:'Anslutningen ingår inte i din plan.',needsPermission:'Inloggning och behörighet kan inte hoppas över automatiskt.',noExtra:'Respondos egna verktyg kräver ingen extern anslutning.',statusError:'Alla statusar kunde inte kontrolleras. Inställningarna har inte ändrats.',list:'Tjänster',example:'Välj det system du använder. Endast relevanta inställningar visas.',groupCount:'tjänster'},
    en:{title:'Connect services, without the complexity',intro:'You do not need every integration. Choose what you want Respondo to do, then follow one step at a time.',first:'1. What do you want to do?',second:'2. Choose your service',third:'3. Complete connection',back:'Back',open:'Open connection settings',authorize:'Connect and authorize',oauthNotice:'You sign in and approve access on the provider’s website.',technical:'Show advanced settings',hideTechnical:'Hide advanced settings',check:'Refresh connection status',connected:'Connection saved',ready:'Payments enabled',partial:'Configured — check incoming messages',unknown:'Status needs checking',notConnected:'Not connected',restricted:'This connection is not part of your plan.',needsPermission:'Account permissions and sign-in cannot be bypassed automatically.',noExtra:'Respondo built-in tools need no external connection.',statusError:'Some statuses could not be checked. Your existing settings are unchanged.',list:'Services',example:'Choose the system you use. Only its settings will be shown.',groupCount:'services'}
  };
  const el=(tag,cls,text)=>{
    const node=document.createElement(tag);
    if(cls)node.className=cls;
    if(text!==undefined)node.textContent=String(text);
    return node;
  };
  function readonlyJSON(path){
    return fetch(path,{method:'GET',credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'}})
      .then(response=>response.ok?response.json():null).catch(()=>null);
  }
  function mount(){
    const ws=$('#respondoWorkspace');
    const moduleCard=$('#respondoWorkspaceCardBody')?.closest('.respondo-workspace-module-card');
    if(!ws||!moduleCard||ws.dataset.integrationGuideMounted==='1')return;
    ws.dataset.integrationGuideMounted='1';
    const lang=getLocale(ws),t=dict[lang],word=list=>list[lang==='fi'?0:lang==='sv'?1:2];
    const root=el('section','rs-integration-onboarding');
    root.id='respondoIntegrationOnboarding';
    root.setAttribute('aria-label',t.title);
    root.innerHTML='<div class="rs-integration-guide-heading"></div><div class="rs-integration-guide-content"></div>'+
      '<div class="rs-integration-guide-footer"></div>';
    moduleCard.before(root);
    const heading=$('.rs-integration-guide-heading',root);
    const content=$('.rs-integration-guide-content',root);
    const footer=$('.rs-integration-guide-footer',root);
    heading.append(el('h2','',t.title),el('p','',t.intro));
    const back=el('button','rs-integration-quiet',t.back);
    back.type='button';back.hidden=true;
    const refresh=el('button','rs-integration-quiet',t.check);
    refresh.type='button';
    const advanced=el('button','rs-integration-quiet',t.technical);
    advanced.type='button';advanced.setAttribute('aria-expanded','false');
    footer.append(back,refresh,advanced);
    let chosenGroup=null,chosenProvider=null,states=new Map();
    const existingLocks=new Map();
    for(const item of providers){
      const target=$('#'+item.tab);
      const protectedByPlan=Boolean(target?.dataset.respondoPlanLocked==='yes');
      const googlePlanLocked=item.id==='google_calendar' &&
        !$('#booking-calendar .calendar-sync-card.connected:not([hidden])') &&
        !$('#connectGoogleCalendar');
      existingLocks.set(item.id,!target || protectedByPlan || googlePlanLocked ||
        (target.hidden && item.tab!=='native-operations' && item.tab!=='booking-calendar'));
    }
    // Server output is the source of truth for the connected state. Unknown is
    // distinct from disconnected, especially when an endpoint is unavailable.
    function domStatus(item){
      if(item.id==='google_calendar'){
        if($('#booking-calendar .calendar-sync-card.connected:not([hidden])'))return 'connected';
        return $('#connectGoogleCalendar')?'notConnected':null;
      }
      if(item.id==='stripe'){
        if($('#stripe-connect .stripe-connect-status.ready'))return 'ready';
        const state=$('#stripe-connect .stripe-connect-status')?.textContent||'';
        return /Viimeistele|Complete|Slutför/i.test(state)?'partial':state?'notConnected':null;
      }
      if(['shopify','woocommerce'].includes(item.id)){
        const form=$('#commerceForm'),badge=$('#commerce-integration .install-badge');
        const provider=form?.elements.provider?.value;
        if(provider===item.id && badge && /Yhdistetty|Ansluten|Connected/i.test(badge.textContent))return 'connected';
        return form?'notConnected':null;
      }
      if(item.id==='webhooks')return ($('#integrationsForm')?.elements.webhookUrl?.value||'').trim()?'partial':'notConnected';
      if(item.id==='native_calendar')return 'local';
      return null;
    }
    function status(item){
      if(existingLocks.get(item.id))return 'restricted';
      return states.get(item.id)||domStatus(item)||'unknown';
    }
    function statusLabel(s){
      if(s==='restricted')return t.restricted;
      if(s==='connected')return t.connected;
      if(s==='notConnected')return t.notConnected;
      if(s==='ready')return t.ready;
      if(s==='partial')return t.partial;
      if(s==='local')return t.noExtra;
      return t.unknown;
    }
    function addStepTitle(text){
      content.appendChild(el('h3','rs-integration-step-title',text));
    }
    function draw(){
      content.replaceChildren();
      back.hidden=!chosenGroup;
      if(!chosenGroup){
        addStepTitle(t.first);
        const list=el('div','rs-integration-group-grid');
        for(const group of groups){
          const button=el('button','rs-integration-group');
          button.type='button';button.dataset.integrationGroup=group.id;
          const count=providers.filter(item=>item.group===group.id).length;
          button.append(el('strong','',word(group.label)),el('span','',word(group.help)),
            el('small','',String(count)+' '+t.groupCount));
          list.append(button);
        }
        content.append(list,el('p','rs-integration-note',t.noExtra));
      }else if(!chosenProvider){
        addStepTitle(t.second);
        content.appendChild(el('p','rs-integration-hint',t.example));
        const list=el('div','rs-integration-provider-grid');
        for(const item of providers.filter(x=>x.group===chosenGroup)){
          const button=el('button','rs-integration-provider');
          button.type='button';button.dataset.integrationProvider=item.id;
          button.append(el('strong','',item.name),el('small','',statusLabel(status(item))));
          if(status(item)==='connected'||status(item)==='ready')button.dataset.status='connected';
          list.appendChild(button);
        }
        content.appendChild(list);
      }else{
        const item=providers.find(p=>p.id===chosenProvider);
        if(!item)return;
        addStepTitle(t.third+' · '+item.name);
        const info=el('div','rs-integration-selected');
        info.append(el('p','',word(item.step)),el('p','rs-integration-current-status',statusLabel(status(item))));
        content.appendChild(info);
        if(status(item)==='restricted'){
          content.appendChild(el('p','rs-integration-note',t.restricted));
          ws.classList.remove('rs-integration-configuring');
          return;
        }
        const options=el('div','rs-integration-actions');
        const open=el('button','rs-integration-primary',t.open);
        open.type='button';open.dataset.integrationOpen=item.id;options.appendChild(open);
        if(item.href){
          const link=el('a','rs-integration-primary rs-integration-authorize',t.authorize);
          link.href=item.href;options.appendChild(link);
          content.appendChild(el('p','rs-integration-note',t.oauthNotice));
        }
        content.append(options,el('p','rs-integration-note',t.needsPermission));
      }
    }
    function focusExisting(item){
      const tab=ws.querySelector('[data-workspace-tab="'+item.tab+'"]');
      if(!tab||existingLocks.get(item.id)){
        content.appendChild(el('p','rs-integration-note',t.restricted));
        return;
      }
      ws.classList.add('rs-integration-configuring');
      ws.classList.remove('rs-integration-advanced');
      advanced.setAttribute('aria-expanded','false');
      advanced.textContent=t.technical;
      tab.click();
      const target=$('#'+item.tab);
      if(item.provider){
        const form=target?.querySelector('form');
        const select=form?.elements?.provider;
        if(select && [...select.options].some(o=>o.value===item.provider)){
          select.value=item.provider;
          select.dispatchEvent(new Event('change',{bubbles:true}));
        }
      }
      if(item.nativeTab){
        const inner=target?.querySelector('.native-tabs [data-tab="'+item.nativeTab+'"]');
        if(inner)inner.click();
      }
      if(item.id==='shopify'||item.id==='woocommerce')configureCommerceFields();
      requestAnimationFrame(()=>{
        ws.querySelector('#rsWorkspaceOrbit')?.__orbitApi?.suspendPin?.();
        const card=$('#respondoWorkspaceCardBody');
        if(!card || !ws.classList.contains('rs-integration-configuring'))return;
        card.scrollIntoView({behavior:'auto',block:'start'});
      });
    }
    function configureCommerceFields(){
      const form=$('#commerceForm');
      if(!form||form.dataset.guidedCommerceFields==='1')return;
      form.dataset.guidedCommerceFields='1';
      const fields={shopify:['shopifyShopDomain','shopifyAccessToken'],
        woocommerce:['wooBaseUrl','wooConsumerKey','wooConsumerSecret']};
      const update=()=>{
        const provider=form.elements.provider?.value;
        for(const [kind,names] of Object.entries(fields)){
          for(const name of names){
            const input=form.elements.namedItem(name);
            const field=input?.closest('.field');
            if(field)field.hidden=provider!==kind;
          }
        }
      };
      form.elements.provider?.addEventListener('change',update);
      update();
    }
    async function reloadStatuses(){
      refresh.disabled=true;
      const endpoints={
        crm:'/api/app/connectors/crm',
        mail:'/api/app/native/mail/status',
        meta:'/api/app/native/meta/status',
        cloud:'/api/app/native/cloud/status',
        freshdesk:'/api/app/helpdesk/freshdesk',
        zendesk:'/api/app/helpdesk/zendesk'
      };
      const entries=await Promise.all(Object.entries(endpoints).map(async([key,url])=>[key,await readonlyJSON(url)]));
      const result=Object.fromEntries(entries),next=new Map();
      if(result.crm&&typeof result.crm.connected==='boolean'){
        next.set('hubspot','notConnected');
        next.set('pipedrive','notConnected');
      }
      if(Array.isArray(result.mail?.connections)){
        next.set('gmail','notConnected');
        next.set('outlook','notConnected');
      }
      if(Array.isArray(result.meta?.channels)){
        for(const id of ['whatsapp','instagram','facebook'])next.set(id,'notConnected');
      }
      if(Array.isArray(result.cloud?.connections)){
        next.set('google_drive','notConnected');
        next.set('sharepoint','notConnected');
      }
      if(typeof result.freshdesk?.data?.connected==='boolean')next.set('freshdesk','notConnected');
      if(typeof result.zendesk?.data?.connected==='boolean')next.set('zendesk','notConnected');
      if(result.crm?.connected && ['hubspot','pipedrive'].includes(result.crm.provider))
        next.set(result.crm.provider,'connected');
      for(const account of result.mail?.connections||[]){
        if(account.connected&&['gmail','outlook'].includes(account.provider))
          next.set(account.provider,'connected');
      }
      for(const channel of result.meta?.channels||[]){
        if(['whatsapp','instagram','facebook'].includes(channel.provider)&&channel.configured)
          next.set(channel.provider,channel.deliveryEnabled?'connected':'partial');
      }
      for(const cloud of result.cloud?.connections||[]){
        if(cloud.connected&&['google_drive','sharepoint'].includes(cloud.provider))
          next.set(cloud.provider,'connected');
      }
      if(result.freshdesk?.data?.connected)next.set('freshdesk','connected');
      if(result.zendesk?.data?.connected)next.set('zendesk','connected');
      states=next;
      refresh.disabled=false;
      if(ws.dataset.currentView==='integrations')draw();
    }
    root.addEventListener('click',event=>{
      const group=event.target.closest('[data-integration-group]');
      const provider=event.target.closest('[data-integration-provider]');
      const open=event.target.closest('[data-integration-open]');
      if(group){chosenGroup=group.dataset.integrationGroup;chosenProvider=null;
        ws.classList.remove('rs-integration-configuring');draw();}
      if(provider){chosenProvider=provider.dataset.integrationProvider;
        ws.classList.remove('rs-integration-configuring');draw();}
      if(open){const item=providers.find(x=>x.id===open.dataset.integrationOpen);
        if(item)focusExisting(item);}
    });
    back.addEventListener('click',()=>{
      if(chosenProvider)chosenProvider=null;else chosenGroup=null;
      ws.classList.remove('rs-integration-configuring');draw();
    });
    refresh.addEventListener('click',reloadStatuses);
    root.addEventListener('click',event=>{
      const oauth=event.target.closest?.('a.rs-integration-authorize');
      if(oauth){
        try{sessionStorage.setItem('respondo_pending_integration',chosenProvider||'');}catch{}
      }
    });
    advanced.addEventListener('click',()=>{
      const visible=ws.classList.toggle('rs-integration-advanced');
      advanced.setAttribute('aria-expanded',String(visible));
      advanced.textContent=visible?t.hideTechnical:t.technical;
    });
    const observation=new MutationObserver(()=>{
      if(ws.dataset.currentView==='integrations'){
        root.hidden=false;
        if(!ws.dataset.integrationStatusLoaded){ws.dataset.integrationStatusLoaded='1';reloadStatuses();}
      }else root.hidden=true;
    });
    observation.observe(ws,{attributes:true,attributeFilter:['data-current-view']});
    root.hidden=ws.dataset.currentView!=='integrations';
    // After OAuth returns, keep the user's selected service in the guide,
    // without claiming the account connected until the status GET succeeds.
    const pending=(()=>{try{return sessionStorage.getItem('respondo_pending_integration')}catch{return null}})();
    const recovered=providers.find(p=>p.id===pending);
    if(recovered){
      chosenGroup=recovered.group;chosenProvider=recovered.id;
      try{sessionStorage.removeItem('respondo_pending_integration')}catch{}
    }
    draw();
    configureCommerceFields();
    if(!root.hidden){ws.dataset.integrationStatusLoaded='1';reloadStatuses();}
  }
  function init(){
    const app=$('#app');if(!app)return;
    mount();
    new MutationObserver(mount).observe(app,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
