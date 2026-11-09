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
const PLANS=[
  {name:'Advanced',price:49,plan:'basic_monthly'},
  {name:'Premium',price:129,plan:'advanced_monthly'},
  {name:'Enterprise',price:149,plan:'business_monthly'}
];
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
export function mountRespondoExperience(documentRef) {
  if(!documentRef || !documentRef.body ||
     ['/assistant','/app','/demo'].includes(documentRef.location?.pathname || '') ||
     documentRef.body.classList.contains('assistant-standalone'))return false;
  const box=documentRef.querySelector('#respondo-site-chat.fx-firstparty-smart');
  if(!box || box.querySelector('.rx-experience-stage'))return false;
  const query=new URLSearchParams(documentRef.location?.search||'');
  let stored='en';
  try{stored=documentRef.defaultView?.localStorage?.getItem('respondo_lang') || 'en';}catch{}
  const lang=experienceLocale(query.get('lang')||stored);
  const c=experienceCopy(lang);
  const launch=documentRef.querySelector('.fx-firstparty-launch');
  const close=box.querySelector('.fx-assistant-close');
  const form=box.querySelector('.fx-assistant-form');
  const messages=box.querySelector('.fx-assistant-messages');
  if(!launch || !close || !form || !messages)return false;
  documentRef.querySelectorAll('.rx-experience-backdrop').forEach(x=>x.remove());
  documentRef.body.classList.remove('rx-experience-open');

  const backdrop=make(documentRef,'div','rx-experience-backdrop');
  backdrop.setAttribute('aria-hidden','true');
  documentRef.body.appendChild(backdrop);
  const stage=make(documentRef,'section','rx-experience-stage');
  stage.setAttribute('aria-label',c.eyebrow);
  const main=make(documentRef,'div','rx-experience-main');
  const top=make(documentRef,'div','rx-experience-top');
  top.appendChild(make(documentRef,'span','rx-kicker',c.eyebrow));
  const status=make(documentRef,'span','rx-signal',c.signal);
  top.appendChild(status);
  const heading=make(documentRef,'h2','rx-hero-heading',c.hello);
  const intro=make(documentRef,'p','rx-hero-copy',c.intro);
  const views=make(documentRef,'div','rx-views');
  views.setAttribute('role','tablist');
  views.setAttribute('aria-label',c.eyebrow);
  const choices=[
    ['home',c.home],['discover',c.discover],
    ['fit',c.fit],['pricing',c.pricing]
  ];
  for(const [id,label] of choices) {
    const btn=make(documentRef,'button','rx-tab',label);
    btn.type='button';btn.dataset.rxView=id;
    btn.setAttribute('role','tab');
    btn.setAttribute('aria-selected',id==='home'?'true':'false');
    views.appendChild(btn);
  }
  const inner=make(documentRef,'div','rx-content');
  inner.setAttribute('aria-live','polite');
  const footer=make(documentRef,'div','rx-footer');
  footer.appendChild(make(documentRef,'span','rx-footer-mark',c.powered));
  main.append(top,views,heading,intro,inner,footer);

  const visual=make(documentRef,'div','rx-experience-visual');
  const visualHead=make(documentRef,'div','rx-visual-head');
  visualHead.appendChild(make(documentRef,'span','rx-kicker',c.asideLabel));
  const sequence=make(documentRef,'span','rx-visual-count',c.one);
  visualHead.appendChild(sequence);
  const orbit=make(documentRef,'div','rx-orbit');
  const ring1=make(documentRef,'div','rx-orbit-ring rx-orbit-ring-one');
  const ring2=make(documentRef,'div','rx-orbit-ring rx-orbit-ring-two');
  const ring3=make(documentRef,'div','rx-orbit-ring rx-orbit-ring-three');
  const logo=make(documentRef,'div','rx-orbit-core');
  const img=make(documentRef,'img','rx-orbit-logo');
  img.src='/respondo-approved-arrow-20261012.png';img.alt='';img.setAttribute('aria-hidden','true');
  logo.appendChild(img);
  orbit.append(ring1,ring2,ring3,logo);
  const visualCopy=make(documentRef,'div','rx-visual-copy');
  const visualTitle=make(documentRef,'h3','rx-visual-title',c.visualHome);
  const visualDetail=make(documentRef,'p','rx-visual-description',c.visualHomeDesc);
  visualCopy.append(visualTitle,visualDetail);
  const flow=make(documentRef,'div','rx-flow');
  c.ambient.forEach((t,i)=>{
    const chip=make(documentRef,'span','rx-flow-chip',t);
    chip.dataset.rxFlow=String(i);
    flow.appendChild(chip);
  });
  visual.append(visualHead,orbit,visualCopy,flow);
  stage.append(main,visual);
  box.insertBefore(stage,messages);

  // Preserve the installed assistant's existing API, history, translations,
  // contact handling, and the separate standalone Try Bot page.
  const returnBtn=make(documentRef,'button','rx-experience-return',c.fromChat);
  returnBtn.type='button';
  returnBtn.setAttribute('aria-label',c.fromChat);
  box.querySelector('.fx-smart-panel-tools')?.prepend(returnBtn);
  const state={view:'home',business:'',goal:'',journeyStep:0,scene:0};
  function clearInner(){inner.replaceChildren();}
  function button(container,label,css,onClick){
    const el=make(documentRef,'button',css,label);
    el.type='button';el.addEventListener('click',onClick);
    container.appendChild(el);return el;
  }
  function actions(parent,items) {
    const bar=make(documentRef,'div','rx-actions');
    for(const action of items) {
      if(action.href) appendAction(bar,documentRef,action.label,action.href,action.primary?'rx-action rx-primary':'rx-action rx-secondary');
      else button(bar,action.label,action.primary?'rx-action rx-primary':'rx-action rx-secondary',action.action);
    }
    parent.appendChild(bar);
  }
  function focusChat(){
    box.classList.remove('rx-stage-mode');
    box.classList.add('rx-conversation-mode');
    if(box.classList.contains('open')){
      const input=form.querySelector('input[name="message"]');
      input?.focus();
    }
  }
  function showStage(){
    box.classList.add('rx-stage-mode');
    box.classList.remove('rx-conversation-mode');
    draw(state.view);
    box.querySelector('.rx-tab[aria-selected="true"]')?.focus();
  }
  // "Ask AI" comes from multiple experience screens. Only the first
  // activation may automatically submit the canned opening question.
  // Returning to the experience must not send that same question again.
  let experienceOpeningSent=false;
  function ask(text){
    if(!text || form.querySelector('input[name="message"]')?.disabled)return;
    focusChat();
    const input=form.querySelector('input[name="message"]');
    if(!input)return;
    if(text===c.startPrompt && experienceOpeningSent){input.focus();return;}
    if(text===c.startPrompt)experienceOpeningSent=true;
    input.value=text;
    if(typeof form.requestSubmit==='function')form.requestSubmit();
    else form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
  }
  function setView(next){
    if(!choices.some(x=>x[0]===next))return;
    state.view=next;
    draw(next);
  }
  function setVisual(title,detail,count,active=0){
    visualTitle.textContent=title;
    visualDetail.textContent=detail;
    sequence.textContent=count;
    flow.querySelectorAll('.rx-flow-chip').forEach((chip,i)=>chip.classList.toggle('rx-active',i===active));
  }
  function drawHome(){
    clearInner();
    const lead=make(documentRef,'div','rx-lead');
    lead.appendChild(make(documentRef,'span','rx-lead-symbol','↗'));
    lead.appendChild(make(documentRef,'span','rx-lead-text',c.what));
    inner.appendChild(lead);
    const steps=make(documentRef,'div','rx-home-steps');
    for(let i=0;i<3;i++){
      const block=make(documentRef,'button','rx-home-step');
      block.type='button';
      block.appendChild(make(documentRef,'span','rx-step-index','0'+(i+1)));
      block.appendChild(make(documentRef,'strong','rx-step-name',c.phases[i]));
      block.appendChild(make(documentRef,'span','rx-step-arrow','↗'));
      block.addEventListener('click',()=>{state.scene=i;setView('discover');});
      steps.appendChild(block);
    }
    inner.appendChild(steps);
    actions(inner,[
      {label:c.begin,primary:true,action:()=>setView('fit')},
      {label:c.ask,action:()=>{focusChat();ask(c.startPrompt);}}
    ]);
    setVisual(c.visualHome,c.visualHomeDesc,c.one,0);
  }
  function drawDiscover(){
    clearInner();
    const selector=make(documentRef,'div','rx-scene-selector');
    c.phases.forEach((label,i)=>{
      const btn=button(selector,label,'rx-scene'+(i===state.scene?' rx-current':''),()=>{
        state.scene=i;draw('discover');
      });
      btn.setAttribute('aria-pressed',i===state.scene?'true':'false');
    });
    inner.appendChild(selector);
    const block=make(documentRef,'div','rx-discover-story');
    block.appendChild(make(documentRef,'span','rx-story-step',c.phases[state.scene]+' · 0'+(state.scene+1)));
    block.appendChild(make(documentRef,'h3','rx-story-heading',[c.sceneQuestion,c.sceneAnswer,c.sceneAction][state.scene]));
    block.appendChild(make(documentRef,'p','rx-story-text',c.phaseCopy[state.scene]));
    inner.appendChild(block);
    actions(inner,[
      {label:c.ask,primary:true,action:()=>{focusChat();ask(c.startPrompt);}},
      {label:c.try,href:linkTo('/assistant',lang)}
    ]);
    setVisual(c.visualLearn,c.phaseCopy[state.scene],['01 / 03','02 / 03','03 / 03'][state.scene],state.scene);
  }
  function renderOptions(options,callback) {
    const list=make(documentRef,'div','rx-option-grid');
    for(const item of options){
      const b=make(documentRef,'button','rx-option-card');
      b.type='button';
      b.appendChild(make(documentRef,'span','rx-option-number',item.symbol));
      b.appendChild(make(documentRef,'strong','rx-option-name',item.name));
      b.appendChild(make(documentRef,'small','rx-option-desc',item.desc));
      b.addEventListener('click',()=>callback(item.id));
      list.appendChild(b);
    }
    inner.appendChild(list);
  }
  function drawFit(){
    clearInner();
    if(state.journeyStep===0) {
      inner.appendChild(make(documentRef,'h3','rx-question',c.businessQuestion));
      renderOptions([
        {id:'services',symbol:'01',name:c.services,desc:c.servicesDesc},
        {id:'ecommerce',symbol:'02',name:c.ecommerce,desc:c.ecommerceDesc},
        {id:'bookings',symbol:'03',name:c.bookings,desc:c.bookingsDesc}
      ],id=>{state.business=id;state.journeyStep=1;drawFit();});
      setVisual(c.visualFit,c.businessQuestion,c.one,0);
    }else if(state.journeyStep===1){
      inner.appendChild(make(documentRef,'h3','rx-question',c.goalQuestion));
      renderOptions([
        {id:'answers',symbol:'01',name:c.answerGoal,desc:c.answerDesc},
        {id:'leads',symbol:'02',name:c.leadGoal,desc:c.leadDesc},
        {id:'bookings',symbol:'03',name:c.bookingGoal,desc:c.bookingDesc}
      ],id=>{state.goal=id;state.journeyStep=2;drawFit();});
      button(inner,c.goBack,'rx-text-back',()=>{state.journeyStep=0;drawFit();});
      setVisual(c.visualFit,c.goalQuestion,c.two,1);
    }else{
      const result=experienceRecommendations(state.business,state.goal,lang);
      const summary=make(documentRef,'div','rx-fit-result');
      summary.appendChild(make(documentRef,'span','rx-story-step',c.chosen));
      summary.appendChild(make(documentRef,'h3','rx-fit-title',result.categoryText+' + '+result.goalText));
      summary.appendChild(make(documentRef,'p','rx-fit-note',c.resultNote));
      inner.appendChild(summary);
      actions(inner,[
        {label:c.try,primary:true,href:linkTo('/assistant',lang)},
        {label:c.pricing,action:()=>setView('pricing')}
      ]);
      button(inner,c.restart,'rx-text-back',()=>{state.business='';state.goal='';state.journeyStep=0;drawFit();});
      setVisual(c.visualFit,result.categoryText+' · '+result.goalText,c.three,2);
    }
  }
  function drawPricing(){
    clearInner();
    const cards=make(documentRef,'div','rx-plan-cards');
    PLANS.forEach((plan,i)=>{
      const card=make(documentRef,'div','rx-plan'+(i===1?' rx-plan-featured':''));
      card.appendChild(make(documentRef,'span','rx-plan-index','0'+(i+1)+' / '+plan.name.toUpperCase()));
      const price=make(documentRef,'div','rx-plan-price');
      price.appendChild(make(documentRef,'strong','',String(plan.price)+' €'));
      price.appendChild(make(documentRef,'span','',c.perMonth));
      card.appendChild(price);
      card.appendChild(make(documentRef,'p','rx-plan-desc',c.planDescriptions[i]));
      appendAction(card,documentRef,c.select+' ↗','/tilaus?plan='+encodeURIComponent(plan.plan),'rx-plan-link');
      cards.appendChild(card);
    });
    inner.appendChild(cards);
    const note=make(documentRef,'div','rx-plan-note',c.planTrial);
    inner.appendChild(note);
    appendAction(inner,documentRef,c.pricingLink+' ↗',linkTo('/hinnat',lang),'rx-simple-link');
    setVisual(c.visualPrices,c.pricesIntro,c.three,2);
  }
  function draw(which){
    state.view=which;
    views.querySelectorAll('[data-rx-view]').forEach(el=>{
      const selected=el.dataset.rxView===which;
      el.setAttribute('aria-selected',selected?'true':'false');
      el.classList.toggle('rx-selected',selected);
    });
    if(which==='home') {heading.textContent=c.hello;intro.textContent=c.intro;drawHome();}
    else if(which==='discover'){heading.textContent=c.learnTitle;intro.textContent=c.learnIntro;drawDiscover();}
    else if(which==='fit'){heading.textContent=c.journey;intro.textContent=c.journeyNote;drawFit();}
    else {heading.textContent=c.pricing;intro.textContent=c.pricesIntro;drawPricing();}
    stage.scrollTop=0;
  }
  views.addEventListener('click',event=>{
    const button=event.target.closest('[data-rx-view]');
    if(button)setView(button.dataset.rxView);
  });
  returnBtn.addEventListener('click',showStage);
  backdrop.addEventListener('click',()=>close.click());
  form.addEventListener('submit',focusChat,true);
  box.addEventListener('keydown',event=>{
    if(event.key!=='Tab'||!box.classList.contains('open'))return;
    const focusables=[...box.querySelectorAll('a[href],button:not([disabled]),input:not([disabled])')]
      .filter(el=>el.getClientRects().length && el.getAttribute('aria-hidden')!=='true');
    if(!focusables.length)return;
    const first=focusables[0],last=focusables[focusables.length-1];
    if(event.shiftKey && documentRef.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey && documentRef.activeElement===last){event.preventDefault();first.focus();}
  });
  const sync=()=>{
    const isOpen=box.classList.contains('open');
    documentRef.body.classList.toggle('rx-experience-open',isOpen);
    box.setAttribute('role',isOpen?'dialog':'region');
    if(isOpen)box.setAttribute('aria-modal','true');
    else box.removeAttribute('aria-modal');
    if(isOpen && box.classList.contains('rx-stage-mode')) {
      setTimeout(()=>{if(box.classList.contains('open') && box.classList.contains('rx-stage-mode'))
        views.querySelector('.rx-selected')?.focus();},230);
    }
  };
  new MutationObserver(sync).observe(box,{attributes:true,attributeFilter:['class']});
  box.classList.add('rx-experience-ready','rx-stage-mode');
  draw('home');
  sync();
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
