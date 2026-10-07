// Homepage presentation only. Business logic and live chat remain in their existing modules.
const icons = {
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  chat: '<path d="M20 11a8 8 0 0 1-8 8H5l-3 3V11a9 9 0 0 1 18 0Z"/><path d="M7 9h8M7 13h5"/>',
  book: '<path d="M3 4h7l2 2 2-2h7v15h-7l-2 2-2-2H3Z"/><path d="M12 6v15M6 8h3M15 8h3M6 12h3M15 12h3"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 2v6M17 2v6M3 11h18M8 16h3"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  person: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  shop: '<path d="M3 7h18l-2-4H5ZM4 7v14h16V7M9 21v-7h6v7"/><path d="M3 7v3a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0V7"/>'
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.check}</svg>`;

export function premiumHomeSections(t, lang, count) {
  const company = t('Yrityksesi','Ditt företag','Your company');
  const online = t('Paikalla nyt','Online nu','Online now');
  const trial = t('Kokeile 3 päivää ilmaiseksi','Prova gratis i 3 dagar','Try free for 3 days');
  const demo = t('Kokeile bottia','Testa botten','Try the bot');
  const mockLabel = t('Havainnollistava esimerkki','Illustrativt exempel','Illustrative example');
  const chatHead = `<div class="lp-chat-head"><span class="lp-company-avatar">${icon('chat')}</span><div><b>${company}</b><small><i></i>${online}</small></div><span class="lp-chat-menu" aria-hidden="true">···</span></div>`;
  const question = t('Paljonko ikkunoiden pesu maksaa?','Vad kostar fönsterputsning?','How much does window cleaning cost?');
  const answer = t('Ikkunoiden pesu alkaa 79 eurosta. Hinta riippuu ikkunoiden määrästä.','Fönsterputsning kostar från 79 euro. Priset beror på antalet fönster.','Window cleaning starts at €79. The price depends on the number of windows.');
  return `<section class="lp-hero" aria-labelledby="lp-title">
    <div class="lp-hero-grid lp-wrap">
      <div class="lp-hero-copy">
        <div class="lp-eyebrow"><span class="lp-dot"></span>${t('OMA BRÄNDISI. AINA PAIKALLA.','DITT VARUMÄRKE. ALLTID DÄR.','YOUR BRAND. ALWAYS THERE.')}</div>
        <h1 id="lp-title"><span class="lp-sr-only">${t('AI-asiakaspalvelu yritykselle.','AI-kundservice för företag.','AI customer service for business.')} </span><span>${t('Asiakas kysyy.','Kunden frågar.','Customers ask.')}</span><span class="lp-title-soft">${t('Yrityksesi vastaa.','Ditt företag svarar.','Your business answers.')}</span></h1>
        <p class="lp-hero-lead">${t('AI-asiakaspalvelu yrityksesi verkkosivuille. Vastaukset omista tiedoistasi, omalla brändilläsi. Myös silloin, kun sinä et ehdi.','AI-kundservice på ditt företags webbplats. Svar från din information, med ditt varumärke. Även när du inte hinner.','AI customer service for your website. Your knowledge. Your brand. Even when you’re away.')}</p>
        <div class="lp-actions"><a class="lp-button lp-primary" href="/tilaus">${trial}${icon('arrow')}</a><a class="lp-text-link hero-bot-cta" href="/assistant?lang=${lang}">${demo}${icon('arrow')}</a></div>
        <div class="lp-hero-details"><span>${icon('check')}${t('FI / SV / EN','FI / SV / EN','FI / SV / EN')}</span><span>${icon('check')}${t('Yrityksesi omat tiedot','Ditt företags information','Your company knowledge')}</span></div>
      </div>
      <div class="lp-hero-product" aria-label="${mockLabel}">
        <div class="lp-product-grid" aria-hidden="true"></div>
        <div class="lp-browser"><div class="lp-browser-bar"><span class="lp-browser-dots" aria-hidden="true">● ● ●</span><span>www.${t('yrityksesi','dittforetag','yourcompany')}.fi</span><span aria-hidden="true">↗</span></div><div class="lp-site-preview"><span class="lp-site-wordmark">${company}<span>®</span></span><div class="lp-site-lines" aria-hidden="true"><i></i><i></i><i></i></div><div class="lp-site-photo" aria-hidden="true"><div class="lp-sculpture"></div></div></div></div>
        <div class="lp-hero-chat lp-card">${chatHead}<div class="lp-chat-body"><p class="lp-bubble lp-customer">${question}</p><p class="lp-bubble lp-bot">${answer}</p><span class="lp-chat-source">${icon('check')}${t('Vastaus yrityksen tiedoista','Svar från företagets information','Answered from company knowledge')}</span></div><div class="lp-chat-input">${t('Kirjoita viesti…','Skriv ett meddelande…','Type a message…')}${icon('arrow')}</div></div>
        <div class="lp-verified lp-card">${icon('book')}<div><b>${t('Omat tiedot. Oikeat vastaukset.','Egen information. Rätt svar.','Your knowledge. The right answer.')}</b><small>${t('Tietopohja yhdistetty','Kunskapsbas ansluten','Knowledge base connected')}</small></div><span class="lp-dot"></span></div>
        <span class="lp-product-note">${mockLabel} · ${t('Sinun brändisi näkyy asiakkaalle','Ditt varumärke syns för kunden','Your customers see your brand')}</span>
      </div>
    </div>
    <a href="#how" class="lp-scroll-cue"><span>${t('KATSO, MITEN SE TOIMII','SE HUR DET FUNGERAR','SEE HOW IT WORKS')}</span><span aria-hidden="true">↓</span></a>
  </section>
  <section class="lp-proof lp-wrap" aria-label="${t('Tuotteen periaatteet','Produktens principer','Product principles')}"><span>RESPONDO AI</span><p>${t('Hyvä asiakaspalvelu alkaa siitä, että joku vastaa.','Bra kundservice börjar med att någon svarar.','Great service starts with an answer.')}</p><b>24/7 <span>·</span> FI / SV / EN</b></section>
  <section class="lp-story" id="how" aria-labelledby="lp-story-title">
    <div class="lp-story-sticky lp-wrap">
      <div class="lp-story-copy"><span class="lp-eyebrow">01 — ${t('KYSYMYKSESTÄ ETEENPÄIN','FRÅN FRÅGA TILL NÄSTA STEG','FROM QUESTION TO NEXT STEP')}</span><h2 id="lp-story-title">${t('Yksi keskustelu.','En konversation.','One conversation.')}<br><em>${t('Monta mahdollisuutta.','Många möjligheter.','So many possibilities.')}</em></h2><p>${t('Vastaa, auta ja ohjaa asiakasta eteenpäin. Kaikki samassa keskustelussa.','Svara, hjälp och guida kunden vidare. Allt i samma konversation.','Answer, help and move things forward. All in the same conversation.')}</p>
        <ol class="lp-story-steps"><li data-step="0"><b>01</b><div><h3>${t('Tieto muuttuu vastaukseksi','Information blir svar','Knowledge becomes an answer')}</h3><p>${t('Hyväksymäsi tiedot ovat jokaisen vastauksen perusta.','Din godkända information ligger till grund för varje svar.','Every answer starts with your approved knowledge.')}</p></div></li><li data-step="1"><b>02</b><div><h3>${t('Keskustelu jatkuu luontevasti','Samtalet fortsätter naturligt','The conversation keeps going')}</h3><p>${t('Asiakas voi kysyä lisää ja siirtyä ajanvaraukseen.','Kunden kan fråga mer och gå vidare till bokning.','Customers can follow up and move on to booking.')}</p></div></li><li data-step="2"><b>03</b><div><h3>${t('Sinä pidät ohjat käsissäsi','Du har kontrollen','You stay in control')}</h3><p>${t('Puuttuva tieto? Ohjaa kysymys ihmiselle ja kerää yhteystiedot.','Saknas information? Lämna över till en person och samla kontaktuppgifter.','Missing information? Hand off to a person and capture contact details.')}</p></div></li></ol>
        <a class="lp-text-link" href="/assistant?lang=${lang}">${demo}${icon('arrow')}</a>
      </div>
      <div class="lp-story-stage" aria-label="${mockLabel}">
        <div class="lp-stage-rings" aria-hidden="true"></div>
        <div class="lp-dashboard-frame"><div class="lp-dashboard-bar"><span class="lp-mini-brand">R</span> RESPONDO AI <span>${t('Työtila','Arbetsyta','Workspace')}</span></div><div class="lp-dashboard-rail" aria-hidden="true">${icon('chat')}${icon('book')}${icon('calendar')}${icon('person')}</div></div>
        <article class="lp-knowledge lp-scene-card lp-card"><div class="lp-card-heading">${icon('book')}<b>${t('Yrityksen tietopohja','Företagets kunskapsbas','Company knowledge')}</b><span class="lp-tag">${t('Hyväksytty','Godkänd','Approved')}</span></div><div class="lp-knowledge-row"><span>01</span><div><b>${t('Ikkunoiden pesu','Fönsterputsning','Window cleaning')}</b><p>${t('Alkaen 79 € · hinta ikkunoiden mukaan','Från 79 € · pris efter antal fönster','From €79 · based on window count')}</p></div>${icon('check')}</div><div class="lp-knowledge-row"><span>02</span><div><b>${t('Aukioloajat','Öppettider','Opening hours')}</b><p>${t('Ma–pe 9–17','Mån–fre 9–17','Mon–Fri 9–17')}</p></div>${icon('check')}</div><div class="lp-scan"><span></span>${t('Verkkosivun tiedot → oma tietopohja','Webbplatsinformation → egen kunskapsbas','Website information → your knowledge base')}</div><small class="lp-plan-note">${t('Verkkosivutuonti: Advanced / Business','Webbplatsimport: Advanced / Business','Website import: Advanced / Business')}</small></article>
        <article class="lp-story-chat lp-scene-card lp-card">${chatHead}<div class="lp-chat-body"><p class="lp-bubble lp-customer">${question}</p><p class="lp-bubble lp-bot">${answer}</p><div class="lp-follow-up"><p class="lp-bubble lp-customer">${t('Voinko varata ajan ensi viikolle?','Kan jag boka en tid nästa vecka?','Can I book a time next week?')}</p><p class="lp-bubble lp-bot">${t('Totta kai. Tässä ovat seuraavat vapaat ajat.','Självklart. Här är nästa lediga tider.','Of course. Here are the next available times.')}</p></div></div><div class="lp-chat-input">${t('Kirjoita viesti…','Skriv ett meddelande…','Type a message…')}${icon('arrow')}</div></article>
        <article class="lp-booking lp-scene-card lp-card"><div class="lp-card-heading">${icon('calendar')}<b>${t('Valitse sinulle sopiva aika','Välj en tid som passar dig','Find a time that works for you')}</b></div><div class="lp-booking-week">${t('ENSI VIIKKO','NÄSTA VECKA','NEXT WEEK')}<span aria-hidden="true">← →</span></div><div class="lp-days">${[t('MA','MÅ','MON'),t('TI','TI','TUE'),t('KE','ON','WED'),t('TO','TO','THU'),t('PE','FR','FRI')].map((day,i)=>`<span class="${i===2?'selected':''}"><small>${day}</small><b>${12+i}</b></span>`).join('')}</div><div class="lp-times"><span>09:00</span><span class="selected">11:30 ${icon('check')}</span><span>14:00</span></div><small class="lp-plan-note">${t('Esimerkkiajat · Google Calendar: Advanced / Business','Exempeltider · Google Calendar: Advanced / Business','Example times · Google Calendar: Advanced / Business')}</small></article>
        <article class="lp-lead lp-scene-card lp-card"><span class="lp-lead-icon">${icon('person')}</span><div><b>${t('Yhteydenottopyyntö tallessa','Kontaktförfrågan sparad','Contact request captured')}</b><p>${t('Asiakaspalvelijasi jatkaa tästä.','Din kundservicemedarbetare tar över här.','Your team takes it from here.')}</p></div>${icon('check')}</article>
        <span class="lp-scene-caption">${mockLabel} · ${t('Keskustelu ja työtila yhdessä','Konversation och arbetsyta tillsammans','Conversation and workspace, connected')}</span>
      </div>
      <div class="lp-scene-progress" aria-hidden="true"><i></i></div>
    </div>
  </section>
  <section class="lp-capabilities lp-wrap" id="features" aria-labelledby="lp-features-title">
    <div class="lp-section-heading" data-lp-reveal><span class="lp-eyebrow">02 — ${t('SUUNNITELTU ARKEESI','SKAPAD FÖR DIN VARDAG','MADE FOR YOUR EVERYDAY')}</span><h2 id="lp-features-title">${t('Enemmän kuin','Mer än','More than')}<br><em>${t('pelkkä vastaus.','bara ett svar.','just an answer.')}</em></h2></div>
    <article class="lp-feature-row" data-lp-reveal><div class="lp-feature-copy"><span class="lp-feature-index">01 / FI · SV · EN</span><h3>${t('Asiakkaasi kielellä.','På kundens språk.','In your customer’s language.')}</h3><p>${t('Sama tietopohja, kolme kieltä. Respondo ymmärtää jatkokysymykset ja vastaa asiakkaan kielellä.','En kunskapsbas, tre språk. Respondo förstår följdfrågor och svarar på kundens språk.','One knowledge base, three languages. Respondo understands follow-ups and answers in your customer’s language.')}</p></div><div class="lp-language-art lp-art"><div><span>FI</span><p>Hei! Milloin olette auki?</p></div><div><span>SV</span><p>Hej! När har ni öppet?</p></div><div><span>EN</span><p>Hi! When are you open?</p></div><span class="lp-art-caption">${icon('globe')} ${t('Sama yritys. Kolme kieltä.','Samma företag. Tre språk.','One business. Three languages.')}</span></div></article>
    <article class="lp-feature-row lp-feature-reverse" data-lp-reveal><div class="lp-feature-copy"><span class="lp-feature-index">02 / ${t('IHMISEN KOSKETUS','MÄNSKLIG KONTAKT','THE HUMAN TOUCH')}</span><h3>${t('Automaatio auttaa.','Automationen hjälper.','Automation helps.')}<br>${t('Ihminen jatkaa.','Människan tar över.','People take over.')}</h3><p>${t('Kun varmaa vastausta ei löydy, kysymys ohjataan tiimillesi. Asiakas voi jättää yhteystietonsa, jotta keskustelu jatkuu.','När ett säkert svar saknas går frågan till ditt team. Kunden kan lämna kontaktuppgifter så att samtalet fortsätter.','When an answer is uncertain, your team gets the question. Customers can leave their details to keep the conversation going.')}</p></div><div class="lp-handoff-art lp-art"><div class="lp-handoff-thread"><span class="lp-tag">${t('Ohjattu ihmiselle','Överlämnad till en person','Handed off to a person')}</span><p>${t('Voisitteko tehdä tarjouksen koko taloyhtiölle?','Kan ni ge en offert för hela bostadsbolaget?','Could you quote for our whole building?')}</p><div class="lp-human-reply"><span>AK</span><div><b>${t('Asiakaspalvelija','Kundservicemedarbetare','Support agent')}</b><p>${t('Autan mielelläni. Katsotaan yhdessä.','Jag hjälper gärna till. Vi tittar tillsammans.','Happy to help. Let’s take a look together.')}</p></div></div></div><span class="lp-art-caption">${icon('person')}${t('Sinun tiimisi. Samassa keskustelussa.','Ditt team. I samma konversation.','Your team. The same conversation.')}</span></div></article>
    <article class="lp-feature-row" data-lp-reveal><div class="lp-feature-copy"><span class="lp-feature-index">03 / ${t('VERKKOKAUPPA','E-HANDEL','ECOMMERCE')}</span><h3>${t('Auta löytämään','Hjälp kunden hitta','Help them find')}<br>${t('se oikea.','rätt produkt.','the right one.')}</h3><p>${t('Vastaa tuotteista yrityksesi tietojen perusteella. Business-tasolla voit yhdistää mukaan Shopify- ja WooCommerce-tilaushakuja.','Svara om produkter med företagets information. Med Business kan du också använda orderuppslag för Shopify och WooCommerce.','Answer product questions using your company knowledge. Business adds Shopify and WooCommerce order lookups.')}</p><a class="lp-text-link" href="/ominaisuudet?lang=${lang}">${t(`Tutustu kaikkiin ${count} ominaisuuteen`,`Se alla ${count} funktioner`,`Explore all ${count} features`)}${icon('arrow')}</a></div><div class="lp-commerce-art lp-art"><div class="lp-commerce-question">${t('Mitä suosittelette pieneen tilaan?','Vad rekommenderar ni för ett litet rum?','What would you recommend for a small room?')}</div><div class="lp-product-cards"><div><span class="lp-lamp" aria-hidden="true"></span><b>${t('Pöytävalaisin','Bordslampa','Table lamp')}</b><small>${t('Esimerkkituote','Exempelprodukt','Example product')} · 49 €</small></div><div><span class="lp-vase" aria-hidden="true"></span><b>${t('Keraaminen maljakko','Keramikvas','Ceramic vase')}</b><small>${t('Esimerkkituote','Exempelprodukt','Example product')} · 29 €</small></div></div><span class="lp-art-caption">${icon('shop')}${t('Tuotetieto siellä, missä asiakas kysyy.','Produktinformation där kunden frågar.','Product knowledge, right where they ask.')}</span></div></article>
  </section>
  <section class="lp-control" id="control"><div class="lp-wrap lp-control-grid"><div data-lp-reveal><span class="lp-eyebrow">03 — ${t('SINUN TIETOSI. SINUN BRÄNDISI.','DIN INFORMATION. DITT VARUMÄRKE.','YOUR KNOWLEDGE. YOUR BRAND.')}</span><h2>${t('Pidä ohjat.','Behåll kontrollen.','Stay in control.')}<br><em>${t('Anna aikaa takaisin.','Få tid tillbaka.','Get your time back.')}</em></h2><p>${t('Päivität vastaukset, muokkaat ulkoasun ja näet keskustelut yhdestä hallintapaneelista. Asiakkaalle näkyy oma yrityksesi.','Uppdatera svar, anpassa utseendet och se konversationerna i en panel. Kunden ser ditt företag.','Update answers, customize the look and see conversations in one dashboard. Your customers see your business.')}</p><a class="lp-text-link" href="/tietoturva">${t('Tutustu tietoturvaan','Läs om säkerhet','Explore security')}${icon('arrow')}</a></div><div class="lp-brand-art lp-card" data-lp-reveal><span class="lp-feature-index">${t('OMAN BRÄNDISI NÄKÖINEN','MED DITT VARUMÄRKE','MAKE IT YOURS')}</span><div class="lp-brand-preview">${chatHead}<p>${t('Hei! Miten voimme auttaa?','Hej! Hur kan vi hjälpa?','Hi! How can we help?')}</p></div><div class="lp-swatches" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><div class="lp-brand-footer">${t('Nimi, värit ja ulkoasu. Sinun.','Namn, färger och utseende. Dina.','Name, colors and look. Yours.')}${icon('check')}</div></div></div></section>`;
}

let disposeMotion;
export function initPremiumHomeMotion(root) {
  disposeMotion?.();
  const controller = new AbortController();
  const signal = controller.signal;
  const mobileMenu = document.querySelector('.lp-mobile-nav');
  mobileMenu?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => { mobileMenu.open=false; }, {signal}));
  document.addEventListener('keydown', event => { if(event.key==='Escape' && mobileMenu?.open){mobileMenu.open=false;mobileMenu.querySelector('summary').focus();} }, {signal});
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width: 1000px), (pointer: coarse), (max-height: 760px)');
  const story = root.querySelector('.lp-story');
  const hero = root.querySelector('.lp-hero');
  const heroCopy = root.querySelector('.lp-hero-copy');
  const heroProduct = root.querySelector('.lp-hero-product');
  const sceneCards = [...root.querySelectorAll('.lp-scene-card')];
  const steps = [...root.querySelectorAll('.lp-story-steps li')];
  const progressBar = root.querySelector('.lp-scene-progress i');
  const frame = root.querySelector('.lp-dashboard-frame');
  const followup = root.querySelector('.lp-follow-up');
  let geometry = {}, raf = 0;
  const clamp = v => Math.max(0,Math.min(1,v));
  const smooth = v => { const p=clamp(v); return p*p*(3-2*p); };
  // Read geometry only at initialization/resize, never per card on scroll.
  const measure = () => {
    geometry = {storyTop:story.getBoundingClientRect().top+scrollY, storyTravel:Math.max(1,story.offsetHeight-(innerHeight-80)), heroTop:hero.getBoundingClientRect().top+scrollY, heroHeight:hero.offsetHeight};
    request();
  };
  const paint = () => {
    raf = 0;
    if (!root.isConnected) { disposeMotion?.(); return; }
    const lite = reduced.matches || compact.matches;
    root.classList.toggle('lp-motion-lite',lite);
    if (lite) {
      [heroCopy,heroProduct,...sceneCards,frame].forEach(el=>el.style.removeProperty('transform'));
      sceneCards.forEach(el=>el.style.removeProperty('opacity'));
      followup.style.removeProperty('opacity');
      steps.forEach(el=>el.classList.add('active'));
      progressBar.style.transform='scaleX(1)';
      return;
    }
    const hp = clamp((scrollY-geometry.heroTop)/geometry.heroHeight);
    heroCopy.style.transform=`translate3d(0,${-hp*45}px,${-hp*100}px)`;
    heroProduct.style.transform=`translate3d(0,${hp*40}px,${-hp*60}px) rotateX(${hp*3}deg)`;
    const p = clamp((scrollY-geometry.storyTop+80)/geometry.storyTravel);
    const assemble=smooth((p-.1)/.42), disperse=smooth((p-.76)/.24);
    const positions=[[-45,-35,-100,-5],[35,12,85,4],[-15,65,-65,4],[30,90,20,-3]];
    sceneCards.forEach((card,i)=>{
      const [x,y,z,r]=positions[i];
      const spread=1-assemble+disperse*.38;
      card.style.opacity=String(i<2 ? 1 : .22+.78*smooth((p-(i===2?.18:.48))/.22));
      card.style.transform=`translate3d(${x*spread}px,${y*spread}px,${120+z*spread}px) rotateY(${r*spread}deg) rotateX(${(1-assemble)*-3}deg)`;
    });
    frame.style.transform=`translate3d(0,${(1-assemble)*35}px,${-160+assemble*40-disperse*45}px) rotateX(${(1-assemble)*6}deg)`;
    followup.style.opacity=String(.35+.65*smooth((p-.15)/.25));
    steps.forEach((el,i)=>el.classList.toggle('active',i===Math.min(2,Math.floor(p*3))));
    progressBar.style.transform=`scaleX(${p})`;
  };
  const request = () => { if(!raf) raf=requestAnimationFrame(paint); };
  const observer=new IntersectionObserver(entries=>entries.forEach(({target,isIntersecting})=>{
    if(isIntersecting){target.classList.add('lp-in-view');observer.unobserve(target);}
  }),{threshold:.08});
  const reveals=[...root.querySelectorAll('[data-lp-reveal], .price-card, .calculator-shell')];
  reveals.forEach(el=>{el.setAttribute('data-lp-reveal','');observer.observe(el);});
  root.classList.add('lp-motion-ready');
  addEventListener('scroll',request,{passive:true,signal});
  addEventListener('resize',measure,{passive:true,signal});
  reduced.addEventListener('change',request,{signal});
  compact.addEventListener('change',measure,{signal});
  // Pointer motion has its own inner layer, avoiding conflicts with scroll transforms.
  root.querySelectorAll('.price-card, .lp-brand-art').forEach(card=>{
    card.addEventListener('pointermove',event=>{
      if(reduced.matches || compact.matches || event.pointerType!=='mouse') return;
      const rect=card.getBoundingClientRect();
      const x=(event.clientX-rect.left)/rect.width-.5, y=(event.clientY-rect.top)/rect.height-.5;
      card.style.setProperty('--lp-tilt-x',`${-y*3}deg`);
      card.style.setProperty('--lp-tilt-y',`${x*3}deg`);
    },{signal});
    card.addEventListener('pointerleave',()=>{
      card.style.setProperty('--lp-tilt-x','0deg');card.style.setProperty('--lp-tilt-y','0deg');
    },{signal});
  });
  const resizeObserver=new ResizeObserver(measure);
  resizeObserver.observe(root);
  disposeMotion=()=>{controller.abort();observer.disconnect();resizeObserver.disconnect();cancelAnimationFrame(raf);};
  measure();
}
