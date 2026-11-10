// Respondo Experience. A first-party, progressive customer journey over the
// existing site assistant. Does not replace its grounded chat API or permissions.
const CONTENT = {
  fi: {
    eyebrow:'RESPONDO EXPERIENCE', hello:'Asiakaspalvelu, joka vie eteenpäin.',
    intro:'Tutustu siihen, miten verkkosivu voi vastata, opastaa ja auttaa asiakasta toimimaan. Ilman turhaa etsimistä.',
    home:'Yleiskuva', discover:'Tutustu', fit:'Oma ratkaisu', pricing:'Paketit',
    ask:'Kysy AI:lta', try:'Kokeile itse', begin:'Löydä oma käyttötapa',
    visit:'Siirry sivulle', back:'Takaisin kokemukseen',
    what:'Mitä Respondo voi tehdä?', journey:'Löydetään sopiva käyttötapa.',
    journeyNote:'Kaksi valintaa. Näet sen jälkeen, miten avustaja voisi toimia yrityksessäsi.',
    services:'Palveluyritys', ecommerce:'Verkkokauppa', bookings:'Ajanvarausyritys',
    servicesDesc:'Kyselyt ja tarjouspyynnöt', ecommerceDesc:'Tuotteet ja tilaukset', bookingsDesc:'Ajat ja yhteydenotot',
    businessQuestion:'Millainen yrityksesi on?', goalQuestion:'Mikä on tärkeintä?',
    answerGoal:'Nopeat vastaukset', leadGoal:'Yhteydenotot', bookingGoal:'Varauspyynnöt',
    answerDesc:'Yleisimmät asiakaskysymykset', leadDesc:'Kerää asiakkaan tarpeet', bookingDesc:'Ohjaa oikeaan ajankohtaan',
    chosen:'Sinulle sopiva aloitus', goBack:'Edellinen', restart:'Aloita alusta',
    resultNote:'Tämä on esimerkkisuunta. Varsinaiset vastaukset ja toiminnot perustuvat yrityksesi vahvistamiin tietoihin ja asetuksiin.',
    demoTitle:'Katso se toiminnassa', demoDesc:'Kokeile bottia omilla yritystiedoillasi.',
    pricesIntro:'Valitse tarpeisiisi sopiva lähtötaso. Alla ovat kuukausihinnat.',
    perMonth:'/kk', planTrial:'3 päivää ilmaiseksi', select:'Valitse paketti',
    learnTitle:'Yksi keskustelu. Useita seuraavia askeleita.',
    learnIntro:'Valitse vaihe ja katso, miten asiakkaan kysymys voi muuttua hyödylliseksi toiminnoksi.',
    phases:['Kysymys','Ymmärrys','Seuraava askel'],
    phaseCopy:[
      'Asiakas kysyy omin sanoin. Myös puhekieliset ja monikieliset kysymykset ovat mahdollisia.',
      'Respondo etsii vastauksen yrityksen tiedoista ja huomioi keskustelun asiayhteyden.',
      'Tilanteen mukaan se näyttää tiedon, linkin, yhteydenottopyynnön tai käytössä olevan varauspolun.'
    ],
    asideLabel:'VUOROVAIKUTTEINEN DEMO', ambient:['Kysymys','Vastaus','Toiminto'],
    signal:'Ei pelkkä chat-kupla.', visualHome:'Verkkosivu, joka osaa auttaa.',
    visualHomeDesc:'Valitse oma polkusi vasemmalta. Jokainen valinta muuttaa tätä näkymää.',
    visualFit:'Yrityksesi tarpeet', visualPrices:'Selkeä eteneminen',
    visualLearn:'Asiakkaan matka', live:'Oikea AI-keskustelu',
    liveDesc:'Kysy Respondosta tavalliseen tapaan. Vastaukset tulevat nykyisestä asiakaspalvelun vastausmoottorista.',
    fromChat:'Takaisin kokemukseen', simple:'Tutustu toimintoihin',
    pricingLink:'Kaikki hinnat ja ehdot',
    plans:['Advanced','Premium','Enterprise'],
    planDescriptions:['Perustoiminnot asiakaspalveluun','Laajemmat yrityksen työkalut','Laajimmat nykyiset ominaisuudet'],
    close:'Sulje kokemus', choose:'Valitse', one:'01 / 03', two:'02 / 03', three:'03 / 03',
    powered:'RESPONDO AI · ÄLYKKÄÄMPÄÄ ASIAKASPALVELUA',
    sceneQuestion:'Mitä asiakas tarvitsee?', sceneAnswer:'Tiedot vastauksen taustalla', sceneAction:'Seuraava hyödyllinen vaihe',
    startPrompt:'Mitä Respondo osaa tehdä yritykseni asiakkaille?'
  },
  sv: {
    eyebrow:'RESPONDO EXPERIENCE', hello:'Kundservice som tar dig vidare.',
    intro:'Upptäck hur en webbplats kan svara, vägleda och hjälpa kunden att agera. Utan onödigt letande.',
    home:'Översikt',discover:'Utforska',fit:'Din lösning',pricing:'Abonnemang',
    ask:'Fråga AI',try:'Testa själv',begin:'Hitta ditt användningsfall',
    visit:'Öppna sidan',back:'Tillbaka till upplevelsen',
    what:'Vad kan Respondo göra?',journey:'Vi hittar rätt användningsfall.',
    journeyNote:'Två val. Sedan ser du hur assistenten kan hjälpa din verksamhet.',
    services:'Tjänsteföretag',ecommerce:'Webbutik',bookings:'Bokningsföretag',
    servicesDesc:'Förfrågningar och offerter',ecommerceDesc:'Produkter och beställningar',bookingsDesc:'Tider och kontakt',
    businessQuestion:'Vilken typ av företag?',goalQuestion:'Vad är viktigast?',
    answerGoal:'Snabba svar',leadGoal:'Kundförfrågningar',bookingGoal:'Bokningsförfrågningar',
    answerDesc:'Vanliga kundfrågor',leadDesc:'Samla in kundbehov',bookingDesc:'Vägled till rätt tid',
    chosen:'En bra utgångspunkt',goBack:'Föregående',restart:'Börja om',
    resultNote:'Det här är ett exempel. Faktiska svar och åtgärder bygger på företagets godkända uppgifter och inställningar.',
    demoTitle:'Se det i funktion',demoDesc:'Testa med dina egna företagsuppgifter.',
    pricesIntro:'Välj en startnivå som passar. Här visas månadspriser.',
    perMonth:'/mån',planTrial:'3 dagar gratis',select:'Välj abonnemang',
    learnTitle:'Ett samtal. Flera nästa steg.',
    learnIntro:'Välj ett steg och se hur en kundfråga kan leda till användbar hjälp.',
    phases:['Fråga','Förståelse','Nästa steg'],
    phaseCopy:[
      'Kunden skriver med egna ord. Även vardagliga och flerspråkiga frågor är möjliga.',
      'Respondo söker i företagets uppgifter och tar hänsyn till samtalets sammanhang.',
      'Beroende på situation kan assistenten visa information, länkar, kontaktförfrågningar eller tillgängliga bokningsflöden.'
    ],
    asideLabel:'INTERAKTIV DEMO',ambient:['Fråga','Svar','Åtgärd'],
    signal:'Mer än en chattbubbla.',visualHome:'En webbplats som hjälper.',
    visualHomeDesc:'Välj din väg till vänster. Varje val ändrar den här vyn.',
    visualFit:'Ditt företags behov',visualPrices:'Tydlig nästa åtgärd',
    visualLearn:'Kundens resa',live:'Riktig AI-konversation',
    liveDesc:'Fråga Respondo som vanligt. Svaren kommer från den befintliga kundservicefunktionen.',
    fromChat:'Tillbaka till upplevelsen',simple:'Utforska funktioner',
    pricingLink:'Alla priser och villkor',
    plans:['Advanced','Premium','Enterprise'],
    planDescriptions:['Grundläggande kundservice','Fler verktyg för verksamheten','De mest omfattande funktionerna'],
    close:'Stäng upplevelsen',choose:'Välj',one:'01 / 03',two:'02 / 03',three:'03 / 03',
    powered:'RESPONDO AI · SMARTARE KUNDSERVICE',
    sceneQuestion:'Vad behöver kunden?',sceneAnswer:'Informationen bakom svaret',sceneAction:'Nästa användbara steg',
    startPrompt:'Hur kan Respondo hjälpa mitt företags kunder?'
  },
  en: {
    eyebrow:'RESPONDO EXPERIENCE',hello:'Customer service that moves things forward.',
    intro:'Discover a website that can answer, guide and help visitors take action. No searching through endless pages.',
    home:'Overview',discover:'Explore',fit:'Your solution',pricing:'Plans',
    ask:'Ask the AI',try:'Try it live',begin:'Find your use case',
    visit:'Open page',back:'Back to experience',
    what:'What can Respondo do?',journey:'Find your ideal starting point.',
    journeyNote:'Two choices. Then see how an assistant could work for your business.',
    services:'Service business',ecommerce:'Online store',bookings:'Appointment-based',
    servicesDesc:'Enquiries and quotes',ecommerceDesc:'Products and orders',bookingsDesc:'Scheduling and contact',
    businessQuestion:'What kind of business?',goalQuestion:'What matters most?',
    answerGoal:'Instant answers',leadGoal:'Qualified enquiries',bookingGoal:'Booking requests',
    answerDesc:'Common customer questions',leadDesc:'Capture customer needs',bookingDesc:'Guide customers to a time',
    chosen:'Your starting point',goBack:'Previous',restart:'Start over',
    resultNote:'This is an illustrative path. Actual answers and actions always depend on your company’s approved information and settings.',
    demoTitle:'Experience it live',demoDesc:'Try the bot using your own business details.',
    pricesIntro:'Choose a starting point. These are monthly prices.',
    perMonth:'/mo',planTrial:'3 days free',select:'Choose plan',
    learnTitle:'One conversation. More possibilities.',
    learnIntro:'Select each step to see how a customer question becomes an actionable experience.',
    phases:['Question','Understanding','Next step'],
    phaseCopy:[
      'A visitor asks in their own words. Conversational and multilingual messages are supported.',
      'Respondo checks the company information and considers the conversation context.',
      'Depending on the situation, it can present an answer, a link, a contact request or a configured booking journey.'
    ],
    asideLabel:'INTERACTIVE PREVIEW',ambient:['Question','Answer','Action'],
    signal:'More than a chat bubble.',visualHome:'A website that helps.',
    visualHomeDesc:'Choose your path on the left. The experience changes with you.',
    visualFit:'Your business, in focus',visualPrices:'A clear next step',
    visualLearn:'A customer journey',live:'Real AI conversation',
    liveDesc:'Ask about Respondo as usual. Replies use the existing customer-support answer engine.',
    fromChat:'Back to experience',simple:'Explore features',
    pricingLink:'All prices and details',
    plans:['Advanced','Premium','Enterprise'],
    planDescriptions:['Essential customer service','Expanded business tools','Full current feature set'],
    close:'Close experience',choose:'Choose',one:'01 / 03',two:'02 / 03',three:'03 / 03',
    powered:'RESPONDO AI · SMARTER CUSTOMER SERVICE',
    sceneQuestion:'What does the visitor need?',sceneAnswer:'Grounded company information',sceneAction:'A useful next step',
    startPrompt:'How can Respondo help customers on my business website?'
  }
};
export function experienceLocale(value) {
  return ['fi','sv','en'].includes(value) ? value : 'en';
}
export function experienceCopy(language) {
  return CONTENT[experienceLocale(language)];
}
export function experienceRecommendations(business,goal,language='en') {
  const c=experienceCopy(language);
  const category=['services','ecommerce','bookings'].includes(business)?business:'services';
  const priority=['answers','leads','bookings'].includes(goal)?goal:'answers';
  const categoryText={services:c.services,ecommerce:c.ecommerce,bookings:c.bookings}[category];
  const goalText={answers:c.answerGoal,leads:c.leadGoal,bookings:c.bookingGoal}[priority];
  return {category,priority,categoryText,goalText};
}
function make(documentRef,tag,className,copy) {
  const element=documentRef.createElement(tag);
  if(className)element.className=className;
  if(copy!==undefined)element.textContent=copy;
  return element;
}
function linkTo(path,lang) {
  return path+(path.includes('?')?'&':'?')+'lang='+experienceLocale(lang);
}
function appendAction(container,documentRef,text,href,className) {
  const a=make(documentRef,'a',className,text);
  a.href=href;
  container.appendChild(a);
  return a;
}
// A concise first-party experience. The preview is explicitly illustrative;
// the actual chat keeps its existing grounded-answer and action API.
const MINIMAL = {
  fi: {
    eyebrow:'RESPONDO AI', ready:'VALMIINA AUTTAMAAN',
    heading:'Miten voin auttaa?', description:'Kysy Respondosta, löydä sopiva ratkaisu tai kokeile bottia käytännössä.',
    ask:'Kysy Respondosta', askDetail:'Hinnat, ominaisuudet ja käyttöönotto.',
    fit:'Löydä oma ratkaisu', fitDetail:'Vastaa kahteen kysymykseen.',
    demo:'Kokeile bottia', demoDetail:'Katso miten se toimisi yrityksessäsi.',
    prices:'Katso hinnat ja paketit', features:'Tutustu ominaisuuksiin',
    previous:'Takaisin', reset:'Aloita uudelleen', stageBack:'Takaisin alkuun',
    question1:'Millainen yritys sinulla on?',question2:'Missä tarvitset eniten apua?',
    service:'Palveluyritys',commerce:'Verkkokauppa',appointments:'Ajanvaraukset',
    answers:'Asiakaskysymykset',leads:'Tarjouspyynnöt',booking:'Ajanvaraukset',
    resultTitle:'Näin Respondo voisi auttaa',resultNote:'Esimerkki mahdollisesta käyttötavasta. Vastausten ja toimintojen tulee perustua yrityksesi hyväksyttyihin tietoihin ja käyttöönotettuihin ominaisuuksiin.',
    results:{
      answers:'Asiakkaasi saa vastauksen tuotteista, palveluista ja hinnoista silloin kun tieto löytyy yrityksesi hyväksymistä tiedoista.',
      leads:'Asiakas voi jättää tarvittavat tiedot yhteydenottoa tai tarjouspyyntöä varten.',
      bookings:'Avustaja voi kysyä lisätiedot ja ohjata varauspyyntöä, kun ajanvaraustoiminto on määritetty.'
    },
    talk:'Kysy tarkemmin',goDemo:'Kokeile itse',
    example:'ESIMERKKI · EI OIKEA KESKUSTELU',visitor:'ASIAKAS',bot:'RESPONDO',next:'SEURAAVA ASKEL',
    exampleNote:'Tämä on havainnollistava esimerkki, ei yrityskohtainen live-vastaus.',
    sampleTabs:['Palvelut','Verkkokauppa','Ajanvaraus'],
    samples:[
      ['Voinko pyytää tarjouksen?','Kyllä, autan tarjouspyynnön tekemisessä. Mitä palvelua tarvitset?','Tarjouspyyntö'],
      ['Onko tuotteesta muita kokoja?','Voin tarkistaa vaihtoehdot yrityksen tuotetiedoista.','Tuotteen vaihtoehdot'],
      ['Olisiko perjantaille vapaita aikoja?','Voin selvittää varausvaihtoehdot, jos kalenteri on yhdistetty.','Varauspyyntö']
    ],
    copyFooter:'Älykkäämpää asiakaspalvelua',close:'Sulje',
    tryButton:'Kokeile oikeaa bottia'
  },
  sv: {
    eyebrow:'RESPONDO AI',ready:'REDO ATT HJÄLPA',
    heading:'Hur kan jag hjälpa?',description:'Fråga om Respondo, hitta rätt lösning eller testa botten själv.',
    ask:'Fråga om Respondo',askDetail:'Priser, funktioner och installation.',
    fit:'Hitta din lösning',fitDetail:'Svara på två korta frågor.',
    demo:'Testa botten',demoDetail:'Se hur den kan fungera för ditt företag.',
    prices:'Se priser och abonnemang',features:'Utforska funktionerna',
    previous:'Tillbaka',reset:'Börja om',stageBack:'Till startsidan',
    question1:'Vilken typ av företag har du?',question2:'Vad behöver du mest hjälp med?',
    service:'Tjänsteföretag',commerce:'Webbutik',appointments:'Tidsbokning',
    answers:'Kundfrågor',leads:'Offertförfrågningar',booking:'Bokningar',
    resultTitle:'Så kan Respondo hjälpa',resultNote:'Ett möjligt användningsfall. Svar och åtgärder måste bygga på företagets godkända information och aktiverade funktioner.',
    results:{
      answers:'Kunderna får svar om produkter, tjänster och priser när uppgifterna finns i företagets godkända information.',
      leads:'Kunder kan lämna de uppgifter som behövs för kontakt eller offert.',
      bookings:'Assistenten kan ställa följdfrågor och vägleda till en bokningsförfrågan när bokningsfunktionen är inställd.'
    },
    talk:'Fråga mer',goDemo:'Testa själv',
    example:'EXEMPEL · INGEN RIKTIG KONVERSATION',visitor:'KUND',bot:'RESPONDO',next:'NÄSTA STEG',
    exampleNote:'Detta är ett illustrativt exempel, inte ett företagsspecifikt livesvar.',
    sampleTabs:['Tjänster','Webbutik','Bokning'],
    samples:[
      ['Kan jag be om en offert?','Ja, jag hjälper dig med en offertförfrågan. Vilken tjänst behöver du?','Offertförfrågan'],
      ['Finns produkten i andra storlekar?','Jag kan kontrollera alternativen i företagets produktuppgifter.','Produktalternativ'],
      ['Finns det lediga tider på fredag?','Jag kan kontrollera bokningsalternativ om kalendern är ansluten.','Bokningsförfrågan']
    ],
    copyFooter:'Smartare kundservice',close:'Stäng',tryButton:'Testa den riktiga botten'
  },
  en: {
    eyebrow:'RESPONDO AI',ready:'READY TO HELP',
    heading:'How can I help?',description:'Ask about Respondo, find the right setup, or try the bot yourself.',
    ask:'Ask about Respondo',askDetail:'Pricing, features and getting started.',
    fit:'Find your solution',fitDetail:'Answer two quick questions.',
    demo:'Try the bot',demoDetail:'See how it could work for your business.',
    prices:'See pricing and plans',features:'Explore all features',
    previous:'Back',reset:'Start again',stageBack:'Back to start',
    question1:'What kind of business do you run?',question2:'What do you need help with most?',
    service:'Service business',commerce:'Online store',appointments:'Appointments',
    answers:'Customer questions',leads:'Quote requests',booking:'Bookings',
    resultTitle:'Here is how Respondo could help',resultNote:'An illustrative use case. Actual answers and actions depend on your company-approved information and enabled features.',
    results:{
      answers:'Your visitors can get answers about products, services and prices when the information is available in your approved knowledge base.',
      leads:'Visitors can provide the details needed for an enquiry or quote request.',
      bookings:'The assistant can collect details and guide a booking enquiry when the booking feature has been configured.'
    },
    talk:'Ask a question',goDemo:'Try it live',
    example:'EXAMPLE · NOT A LIVE CONVERSATION',visitor:'VISITOR',bot:'RESPONDO',next:'NEXT STEP',
    exampleNote:'Illustrative only. These are not live answers for a specific company.',
    sampleTabs:['Services','Online store','Bookings'],
    samples:[
      ['Can I request a quote?','Yes, I can help with a quote request. What service do you need?','Quote request'],
      ['Does this product come in other sizes?','I can check the options in the company product information.','Product options'],
      ['Are there any openings on Friday?','I can check booking options if the calendar is connected.','Booking request']
    ],
    copyFooter:'Smarter customer service',close:'Close',tryButton:'Try the real bot'
  }
};
export function minimalExperienceCopy(language){
  return MINIMAL[experienceLocale(language)];
}
// Keep all actual visitor questions on Respondo's existing, grounded chat API.
// No fake conversation is shown on the first screen.
const LIVE_FIRST_COPY={
  fi:{
    label:'RESPONDO AI',heading:'Yrityksesi AI-asiakaspalvelija.',
    description:'Kysy Respondo AI:n ominaisuuksista, hinnoista ja käyttöönotosta. Saat vastauksen suoraan avustajalta.',
    placeholder:'Kirjoita kysymyksesi…',send:'Lähetä kysymys',
    fit:'Löydä sopiva ratkaisu',demo:'Kokeile bottia käytännössä',
    pricing:'Hinnasto',discover:'Ominaisuudet',back:'Takaisin',status:'Valmiina auttamaan',
    progress:'Kysymys',footer:'Älykkäämpää asiakaspalvelua'
  },
  sv:{
    label:'RESPONDO AI',heading:'Din AI-kundtjänstassistent.',
    description:'Fråga om funktioner, priser och hur Respondo kan hjälpa ditt företag. Få ett svar direkt.',
    placeholder:'Skriv din fråga…',send:'Skicka frågan',
    fit:'Hitta rätt lösning',demo:'Testa botten själv',
    pricing:'Priser',discover:'Funktioner',back:'Tillbaka',status:'Redo att hjälpa',
    progress:'Fråga',footer:'Smartare kundservice'
  },
  en:{
    label:'RESPONDO AI',heading:'Your AI customer service agent.',
    description:'Get instant answers about features, pricing, and how Respondo can support your business — straight from our AI assistant.',
    placeholder:'Type your question…',send:'Send question',
    fit:'Find your solution',demo:'Try the live bot',
    pricing:'Pricing',discover:'Features',back:'Back',status:'Ready to help',
    progress:'Question',footer:'Smarter customer service'
  }
};
export function liveFirstExperienceCopy(language){return LIVE_FIRST_COPY[experienceLocale(language)];}

export function mountRespondoExperience(documentRef){
  if(!documentRef || !documentRef.body ||
    ['/assistant','/app','/demo'].includes(documentRef.location?.pathname||'') ||
    documentRef.body.classList.contains('assistant-standalone'))return false;
  const box=documentRef.querySelector('#respondo-site-chat.fx-firstparty-smart');
  if(!box || box.querySelector('.rx-experience-stage'))return false;
  const query=new URLSearchParams(documentRef.location?.search||'');
  let saved='en';
  try{saved=documentRef.defaultView?.localStorage?.getItem('respondo_lang')||'en';}catch{}
  const lang=experienceLocale(query.get('lang')||saved);
  const c=minimalExperienceCopy(lang);
  const ui=liveFirstExperienceCopy(lang);
  const launch=documentRef.querySelector('.fx-firstparty-launch');
  const close=box.querySelector('.fx-assistant-close');
  const form=box.querySelector('.fx-assistant-form');
  const messages=box.querySelector('.fx-assistant-messages');
  const realInput=form?.querySelector('input[name="message"]');
  if(!launch||!close||!form||!messages||!realInput)return false;

  documentRef.querySelectorAll('.rx-experience-backdrop').forEach(el=>el.remove());
  const backdrop=make(documentRef,'div','rx-experience-backdrop');
  backdrop.setAttribute('aria-hidden','true');
  documentRef.body.appendChild(backdrop);
  const stage=make(documentRef,'section','rx-experience-stage');
  stage.setAttribute('aria-label',ui.label);

  const main=make(documentRef,'div','rx-experience-main');
  const mark=make(documentRef,'div','rx-hero-mark');
  mark.setAttribute('aria-hidden','true');
  const logo=make(documentRef,'img','rx-hero-logo');
  logo.src='/respondo-approved-arrow-20261012.png';
  logo.alt='';
  mark.appendChild(logo);

  const eyebrow=make(documentRef,'span','rx-kicker',ui.label);
  const heading=make(documentRef,'h2','rx-hero-heading',ui.heading);
  const intro=make(documentRef,'p','rx-hero-copy',ui.description);
  const content=make(documentRef,'div','rx-content');
  content.setAttribute('aria-live','polite');
  const footer=make(documentRef,'footer','rx-footer');
  footer.appendChild(make(documentRef,'span','rx-footer-mark',ui.footer));
  const footerLinks=make(documentRef,'div','rx-footer-links');
  appendAction(footerLinks,documentRef,ui.pricing,linkTo('/hinnat',lang),'rx-simple-link');
  appendAction(footerLinks,documentRef,ui.discover,linkTo(lang==='sv'?'/funktioner':lang==='en'?'/features':'/ominaisuudet',lang),'rx-simple-link');
  footer.appendChild(footerLinks);
  main.append(mark,eyebrow,heading,intro,content,footer);
  stage.appendChild(main);
  box.insertBefore(stage,messages);

  const returnBtn=make(documentRef,'button','rx-experience-return',c.stageBack);
  returnBtn.type='button';
  box.querySelector('.fx-smart-panel-tools')?.prepend(returnBtn);

  const state={view:'home',business:'',goal:'',step:0};
  function action(parent,label,handler,primary=false){
    const button=make(documentRef,'button',primary?'rx-action rx-primary':'rx-action rx-secondary',label);
    button.type='button';
    button.addEventListener('click',handler);
    parent.appendChild(button);
    return button;
  }
  function linkAction(parent,label,href,primary=false){
    return appendAction(parent,documentRef,label,href,primary?'rx-action rx-primary':'rx-action rx-secondary');
  }
  function resetBody(){content.replaceChildren();content.scrollTop=0;}
  function focusChat(){
    box.classList.remove('rx-stage-mode');
    box.classList.add('rx-conversation-mode');
    if(box.classList.contains('open'))realInput.focus();
  }
  function showStage(){
    box.classList.add('rx-stage-mode');
    box.classList.remove('rx-conversation-mode');
    render();
    if(box.classList.contains('open'))content.querySelector('input,button,a')?.focus();
  }
  function showHome(){state.view='home';state.step=0;state.business='';state.goal='';render();}
  function submitQuestion(text){
    const clean=String(text||'').trim();
    if(!clean||realInput.disabled)return false;
    realInput.value=clean;
    focusChat();
    // Trigger the already-installed submit handler, preserving its history,
    // deduplication, loading state, server-side grounding and secure actions.
    if(typeof form.requestSubmit==='function')form.requestSubmit();
    else form.querySelector('button[type="submit"]')?.click();
    return true;
  }
  function renderHome(){
    heading.textContent=ui.heading;intro.textContent=ui.description;
    mark.hidden=false;
    resetBody();
    const askForm=make(documentRef,'form','rx-ask-form');
    askForm.setAttribute('aria-label',ui.progress);
    const askInput=make(documentRef,'input','rx-ask-input');
    askInput.type='text';askInput.name='question';askInput.placeholder=ui.placeholder;
    askInput.autocomplete='off';askInput.maxLength=1200;
    askInput.setAttribute('aria-label',ui.placeholder);
    const askButton=make(documentRef,'button','rx-ask-submit','↗');
    askButton.type='submit';askButton.setAttribute('aria-label',ui.send);
    askForm.append(askInput,askButton);
    askForm.addEventListener('submit',event=>{
      event.preventDefault();
      if(submitQuestion(askInput.value))askInput.value='';
    });
    const utilities=make(documentRef,'div','rx-utility-links');
    action(utilities,ui.fit,()=>{state.view='fit';state.step=0;render();});
    const separator=make(documentRef,'span','rx-utility-separator');
    separator.setAttribute('aria-hidden','true');
    utilities.appendChild(separator);
    linkAction(utilities,ui.demo,linkTo('/assistant',lang));
    const suggestions=make(documentRef,'div','rx-suggested-questions');
    suggestions.setAttribute('role','group');
    suggestions.setAttribute('aria-label',lang==='fi'?'Esimerkkikysymykset':lang==='sv'?'Exempelfrågor':'Suggested questions');
    const questions=lang==='fi'?[
      'Paljonko Respondo maksaa?',
      'Miten käyttöönotto toimii?',
      'Vastaako botti suomeksi, ruotsiksi ja englanniksi?'
    ]:lang==='sv'?[
      'Vad kostar Respondo?',
      'Hur fungerar installationen?',
      'Kan botten svara på finska, svenska och engelska?'
    ]:[
      'How much does Respondo cost?',
      'How does onboarding work?',
      'Can it answer in Finnish, Swedish and English?'
    ];
    for(const question of questions){
      const suggestion=make(documentRef,'button','rx-suggestion',question);
      suggestion.type='button';
      suggestion.addEventListener('click',()=>submitQuestion(question));
      suggestions.appendChild(suggestion);
    }
    const demoSuggestion=make(documentRef,'a','rx-suggestion rx-suggestion-demo',
      lang==='fi'?'Kokeile oikeaa bottia':lang==='sv'?'Testa den riktiga botten':'Show me the live bot');
    demoSuggestion.href=linkTo('/assistant',lang);
    suggestions.appendChild(demoSuggestion);
    content.append(askForm,suggestions,utilities);
    // Opt-in website preview on the actual Try the bot page. No account,
    // storage, site-wide crawl, LLM invocation or new paid service.
    if(location.pathname==='/assistant'){
      const panel=make(documentRef,'section','rx-instant-website-demo');
      const title=make(documentRef,'strong','rx-instant-demo-title',
        lang==='fi'?'Kokeile esikatselua omalla sivustollasi'
        :lang==='sv'?'Förhandsgranska med din webbplats'
        :'Preview with your website');
      const explanation=make(documentRef,'p','rx-instant-demo-desc',
        lang==='fi'?'Syötä osoite. Näytämme turvallisen esimerkin sivusi julkisesta kuvauksesta. Täysi botti tarvitsee käyttöönoton.'
        :lang==='sv'?'Ange adressen. Vi visar ett exempel baserat på den offentliga beskrivningen. En riktig bot kräver installation.'
        :'Enter a website. See a safe sample from its public description. A fully working bot requires setup.');
      const form=make(documentRef,'form','rx-instant-demo-form');
      const field=make(documentRef,'input','rx-instant-demo-input');
      field.type='url';field.placeholder='https://company.example';field.required=true;
      field.maxLength=260;field.setAttribute('aria-label',lang==='fi'?'Verkkosivun osoite':lang==='sv'?'Webbadress':'Website URL');
      const submit=make(documentRef,'button','rx-instant-demo-submit',
        lang==='fi'?'Esikatsele':lang==='sv'?'Förhandsgranska':'Preview');
      submit.type='submit';
      form.append(field,submit);
      const output=make(documentRef,'div','rx-instant-demo-result');
      output.setAttribute('aria-live','polite');
      form.addEventListener('submit',async event=>{
        event.preventDefault();
        submit.disabled=true;
        output.replaceChildren(make(documentRef,'span','rx-instant-demo-loading',
          lang==='fi'?'Haetaan julkista sivukuvausta…':lang==='sv'?'Hämtar offentlig sidbeskrivning…':'Reading the public site description…'));
        try{
          const response=await fetch('/api/public/website-demo-preview',{
            method:'POST',credentials:'omit',headers:{'Content-Type':'text/plain;charset=UTF-8'},
            body:JSON.stringify({website:field.value.trim()})
          });
          const data=await response.json().catch(()=>({}));
          if(!response.ok)throw Error('Preview unavailable');
          output.replaceChildren();
          const company=make(documentRef,'strong','rx-instant-demo-company',data.heading||data.title||'Website');
          const question=make(documentRef,'p','rx-instant-demo-question',
            lang==='fi'?'Asiakas: Mitä yrityksenne tekee?'
            :lang==='sv'?'Kund: Vad erbjuder ert företag?'
            :'Visitor: What does your business offer?');
          const answer=make(documentRef,'p','rx-instant-demo-answer',
            data.description||(
              lang==='fi'?'Sivusto ei julkaise tähän riittäviä kuvailutietoja. Tietopohja on tarkistettava ennen vastaamista.'
              :lang==='sv'?'Webbplatsen saknar tillräcklig information för ett verifierat svar.'
              :'The homepage has insufficient public description for a verified answer.'
            ));
          const disclaimer=make(documentRef,'small','rx-instant-demo-disclaimer',
            lang==='fi'?'Esimerkkivastaus julkisista metatiedoista – ei valmis asiakaspalvelubotti. Hintoja tai aikoja ei arvata.'
            :lang==='sv'?'Exempelsvar från offentlig metadata – ingen installerad bot. Vi gissar inte priser eller tider.'
            :'Sample from public metadata, not an installed bot. Prices and bookings are never guessed.');
          const link=make(documentRef,'a','rx-instant-demo-visit',
            lang==='fi'?'Avaa lähdesivu':lang==='sv'?'Öppna källsidan':'Open source page');
          link.href=data.finalUrl;link.target='_blank';link.rel='noopener noreferrer';
          output.append(company,question,answer,disclaimer,link);
        }catch{
          output.replaceChildren(make(documentRef,'p','rx-instant-demo-error',
            lang==='fi'?'Esikatselua ei voitu ladata. Tarkista julkinen osoite ja yritä uudelleen.'
            :lang==='sv'?'Förhandsgranskningen kunde inte laddas. Kontrollera adressen.'
            :'Could not load the preview. Check the public website address.'));
        }finally{submit.disabled=false;}
      });
      panel.append(title,explanation,form,output);
      content.appendChild(panel);
    }
  }
  function fitOption(parent,name,handler){
    const btn=make(documentRef,'button','rx-fit-option',name);
    btn.type='button';
    btn.appendChild(make(documentRef,'span','rx-fit-chevron','↗'));
    btn.addEventListener('click',handler);
    parent.appendChild(btn);
    return btn;
  }
  function renderFit(){
    resetBody();
    mark.hidden=true;
    if(state.step<2){
      heading.textContent=state.step===0?c.question1:c.question2;
      intro.textContent=state.step===0?c.fitDetail:c.question2;
    }else{
      heading.textContent=c.resultTitle;
      intro.textContent='';
    }
    const progress=make(documentRef,'div','rx-progress');
    for(let i=0;i<3;i++)progress.appendChild(make(documentRef,'span','rx-progress-dot'+(i<=state.step?' rx-progress-active':'')));
    content.appendChild(progress);
    if(state.step<2){
      const choices=make(documentRef,'div','rx-fit-choices');
      const options=state.step===0?[
        ['services',c.service],['ecommerce',c.commerce],['bookings',c.appointments]
      ]:[
        ['answers',c.answers],['leads',c.leads],['bookings',c.booking]
      ];
      for(const [id,label] of options)fitOption(choices,label,()=>{
        if(state.step===0){state.business=id;state.step=1;}
        else{state.goal=id;state.step=2;}
        renderFit();
      });
      content.appendChild(choices);
    }else{
      const result=experienceRecommendations(state.business,state.goal,lang);
      const resultCard=make(documentRef,'div','rx-fit-result');
      resultCard.appendChild(make(documentRef,'span','rx-result-eyebrow',result.categoryText+' / '+result.goalText));
      resultCard.appendChild(make(documentRef,'p','rx-result-main',c.results[result.priority]));
      resultCard.appendChild(make(documentRef,'small','rx-result-note',c.resultNote));
      content.appendChild(resultCard);
      const buttons=make(documentRef,'div','rx-fit-actions');
      action(buttons,c.talk,focusChat,true);
      linkAction(buttons,c.goDemo,linkTo('/assistant',lang));
      content.appendChild(buttons);
    }
    const back=make(documentRef,'button','rx-back',state.step===0?ui.back:state.step===2?c.reset:c.previous);
    back.type='button';
    back.addEventListener('click',()=>{
      if(state.step===0)showHome();
      else if(state.step===2){state.step=0;state.business='';state.goal='';renderFit();}
      else{state.step=0;renderFit();}
    });
    content.appendChild(back);
  }
  function render(){if(state.view==='fit')renderFit();else renderHome();}
  returnBtn.addEventListener('click',showStage);
  backdrop.addEventListener('click',()=>close.click());
  close.addEventListener('click',()=>setTimeout(()=>launch.focus(),60));
  form.addEventListener('submit',focusChat,true);
  box.addEventListener('keydown',event=>{
    if(event.key!=='Tab'||!box.classList.contains('open'))return;
    const focusables=[...box.querySelectorAll('a[href],button:not([disabled]),input:not([disabled])')]
      .filter(el=>el.getClientRects().length && el.getAttribute('aria-hidden')!=='true');
    if(!focusables.length)return;
    const first=focusables[0],last=focusables[focusables.length-1];
    if(event.shiftKey&&documentRef.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&documentRef.activeElement===last){event.preventDefault();first.focus();}
  });
  const sync=()=>{
    const opened=box.classList.contains('open');
    documentRef.body.classList.toggle('rx-experience-open',opened);
    box.setAttribute('role',opened?'dialog':'region');
    if(opened)box.setAttribute('aria-modal','true');
    else box.removeAttribute('aria-modal');
    if(opened&&box.classList.contains('rx-stage-mode')){
      setTimeout(()=>content.querySelector('input,button,a')?.focus(),110);
    }
  };
  new MutationObserver(sync).observe(box,{attributes:true,attributeFilter:['class']});
  box.classList.add('rx-experience-ready','rx-stage-mode');
  showHome();sync();
  return true;
}
if(typeof document!=='undefined' && typeof MutationObserver!=='undefined') {
  let active=null;
  const tryMount=()=>{
    if(['/assistant','/app','/demo'].includes(location.pathname))return;
    const candidate=document.querySelector('#respondo-site-chat.fx-firstparty-smart');
    if(candidate && candidate!==active && mountRespondoExperience(document))active=candidate;
    if(!candidate && active){active=null;document.body.classList.remove('rx-experience-open');
      document.querySelectorAll('.rx-experience-backdrop').forEach(x=>x.remove());}
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tryMount,{once:true});
  else tryMount();
  new MutationObserver(tryMount).observe(document.documentElement,{childList:true,subtree:true});
}
