function productJourneysMarkup(t, lang, companyName) {
  const featurePath = {fi:'/ominaisuudet', sv:'/funktioner', en:'/features'}[lang] || '/ominaisuudet';
  const journeys = [
    {
      key:'lead',
      title:t('Tarjouspyyntö','Offertförfrågan','Quote request'),
      question:t('Tarvitsen tarjouksen viikkosiivouksesta.','Jag behöver en offert för veckostädning.','I’d like a quote for weekly cleaning.'),
      answer:t('Jätä yhteystietosi ja anna lupa välittää ne yritykselle, niin tiimi voi vastata sinulle.','Lämna dina kontaktuppgifter och godkänn att de skickas till företaget, så kan teamet svara dig.','Share your contact details and agree to send them to the business so the team can reply.'),
      resultLabel:t('Yhteydenotot','Kontaktförfrågningar','Enquiries'),
      result:t('Viikkosiivous · tarjouspyyntö ja lupa yhteydenottoon vastaanotettu','Veckostädning · offertförfrågan och samtycke mottagna','Weekly cleaning · quote request and consent received'),
      icon:'✓'
    },
    {
      key:'handoff',
      title:t('Siirto ihmiselle','Över till en medarbetare','Human handoff'),
      question:t('Tilaukseni vaurioitui kuljetuksessa. Saisinko apua?','Min beställning skadades under leveransen. Kan jag få hjälp?','My order was damaged in transit. Can someone help?'),
      answer:t('Siirrän keskustelun asiakaspalvelijalle, joka voi auttaa vahinkoasiassa.','Jag lämnar över samtalet till en medarbetare som kan hjälpa dig med transportskadan.','I’ll pass the conversation to a teammate who can help with the damage.'),
      agentReply:t('Hei! Autan selvittämään vahingon. Mikä on tilausnumerosi?','Hej! Jag hjälper dig med transportskadan. Vad är ditt ordernummer?','Hi! I can help with the damage. What is your order number?'),
      resultLabel:t('Keskustelut','Konversationer','Conversations'),
      result:t('Kuljetusvahinko · asiakaspalvelija liittyi keskusteluun','Transportskada · en medarbetare anslöt till samtalet','Delivery damage · an agent joined the conversation'),
      icon:'↗'
    },
    {
      key:'commerce',
      title:t('Tuoteapu verkkokaupassa','Produkthjälp i webbutiken','Ecommerce product help'),
      question:t('Millainen takki sopii sateeseen?','Vilken typ av jacka passar när det regnar?','What kind of jacket works in the rain?'),
      answer:t('Valikoiman vedenpitävä kuoritakki sopii sateeseen.','Den vattentäta skaljackan i sortimentet passar i regn.','The waterproof shell jacket in the catalog is suitable for rain.'),
      resultLabel:t('Tuotetieto','Produktinformation','Product information'),
      result:t('Vedenpitävä kuoritakki','Vattentät skaljacka','Waterproof shell jacket'),
      price:t('89,00 €','89,00 €','€89.00'),
      icon:'↳'
    }
  ];

  return `<section class="rs-product-journeys" aria-labelledby="rs-product-journeys-title">
    <div class="rs-product-journeys-inner">
      <div class="rs-product-copy rs-product-journeys-intro">
        <p class="rs-product-label">${t('Esimerkkitilanteet','Exempel på kundärenden','Example customer journeys')}</p>
        <h2 id="rs-product-journeys-title">${t('Mitä vastauksen jälkeen tapahtuu?','Vad händer efter svaret?','What happens after the reply?')}</h2>
        <p>${t('Kolme esimerkkiä yrityksesi botista ja eri tavoista jatkaa asiakkaan asiaa. Toiminnot riippuvat paketista ja asetuksista.','Tre exempel på hur företagets bot hjälper kunden vidare. Funktionerna beror på abonnemang och inställningar.','Three examples of how your company’s bot helps customers take the next step. Features depend on your plan and settings.')}</p>
      </div>
      <div class="rs-product-journeys-board">
        ${journeys.map(({key,title,question,answer,agentReply,resultLabel,result,price,icon}) => `<article class="rs-product-journey" data-rs-journey="${key}" aria-labelledby="rs-product-${key}-title">
          <h3 id="rs-product-${key}-title">${title}</h3>
          <div class="rs-product-journey-chat">
            <header><span class="rs-product-avatar" aria-hidden="true">✦</span><strong>${companyName}</strong></header>
            <ol class="rs-product-messages">
              <li class="rs-product-question">${question}</li>
              <li>${answer}</li>
              ${agentReply ? `<li class="rs-product-agent-reply"><strong>${t('Asiakaspalvelija','Medarbetare','Support agent')}</strong>${agentReply}</li>` : ''}
            </ol>
          </div>
          <dl class="rs-product-journey-result">
            <dt><span aria-hidden="true">${icon}</span> ${resultLabel}</dt>
            <dd>${result}${price ? `<strong class="rs-product-example-price">${price}</strong>` : ''}</dd>
          </dl>
        </article>`).join('')}
      </div>
      <div class="rs-product-journeys-links rs-product-copy">
        <a href="${featurePath}?lang=${lang}">${t('Tutustu ominaisuuksiin','Se funktionerna','Explore the features')} <span aria-hidden="true">↗</span></a>
        <a href="/verkkokauppa-chatbot?lang=${lang}">${t('Tutustu verkkokaupan bottiin','Se botten för webbutiker','Explore the ecommerce chatbot')} <span aria-hidden="true">↗</span></a>
      </div>
    </div>
  </section>`;
}

export function productStoryMarkup(t, lang) {
  const companyName = t('Yrityksesi','Ditt företag','Your company');
  return `<section class="rs-product-story" id="product-story" tabindex="-1" aria-labelledby="rs-product-title">
    <div class="rs-product-frame">
      <div class="rs-product-copy">
        <p class="rs-product-label">${t('Esimerkkikeskustelu','Exempelkonversation','Example conversation')}</p>
        <h2 id="rs-product-title">${t('Kysymyksestä varaukseen.','Från fråga till bokning.','From question to booking.')}</h2>
        <p>${t('Botti näkyy asiakkaalle yrityksesi nimellä. Se käyttää yrityksesi tietoja ja voi näyttää vapaat ajat, kun kalenteri on yhdistetty.','Botten visas med ditt företags namn. Den använder företagets information och kan visa lediga tider med en ansluten kalender.','The bot carries your company name. It answers using your business information and can show available times with a connected calendar.')}</p>
        <a href="/assistant?lang=${lang}">${t('Kokeile bottia','Testa botten','Try the bot')} <span aria-hidden="true">↗</span></a>
      </div>
      <div class="rs-product-board">
        <p class="rs-product-board-label">${t('Asiakkaan näkymä','Kundens vy','Customer view')}</p>
        <div class="rs-product-layers">
          <div class="rs-product-chat">
            <header><span class="rs-product-avatar" aria-hidden="true">✦</span><div>
              <strong>${companyName}</strong>
              <small><i aria-hidden="true"></i>${t('Paikalla nyt','Online nu','Online now')}</small>
            </div></header>
            <ol class="rs-product-messages">
              <li class="rs-product-question">${t('Paljonko ikkunoiden pesu maksaa?','Vad kostar fönsterputsning?','How much does window cleaning cost?')}</li>
              <li>${t('Ikkunoiden pesu alkaa 79 eurosta. Hinta riippuu ikkunoiden määrästä.','Fönsterputsning kostar från 79 euro. Priset beror på antalet fönster.','Window cleaning starts at €79. The price depends on the number of windows.')}</li>
              <li class="rs-product-question rs-product-followup">${t('Voinko varata ajan ensi viikolle?','Kan jag boka en tid nästa vecka?','Can I book a time next week?')}</li>
              <li class="rs-product-followup">${t('Totta kai. Tässä ovat seuraavat vapaat ajat.','Absolut. Här är de första lediga tiderna.','Of course. Here are the next available times.')}</li>
            </ol>
          </div>
          <aside class="rs-product-tile rs-product-source">
            <span class="rs-product-tile-icon" aria-hidden="true">↳</span>
            <strong>${t('Yrityksen tietopankki','Företagets kunskapsbas','Company knowledge base')}</strong>
            <small>${t('Ikkunanpesu · hinnasto','Fönsterputsning · prislista','Window cleaning · price list')}</small>
          </aside>
          <aside class="rs-product-tile rs-product-calendar">
            <span class="rs-product-tile-icon" aria-hidden="true">▦</span>
            <strong>${t('Vapaat ajat','Lediga tider','Available times')}</strong>
            <small>${t('Tiistai 9.00','Tisdag 9.00','Tuesday 9:00 am')}</small>
            <small>${t('Torstai 14.30','Torsdag 14.30','Thursday 2:30 pm')}</small>
          </aside>
        </div>
      </div>
    </div>
  </section>
  ${productJourneysMarkup(t, lang, companyName)}`;
}

// DOM is always readable. Motion is added only while the scene is on screen.
export function bindProductStory(root) {
  const story = root?.querySelector('.rs-product-story');
  if (!story || !('IntersectionObserver' in window)) return;

  const motion = matchMedia('(min-width: 1024px) and (min-height: 760px) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
  const stage = story.querySelector('.rs-product-frame');
  const hero = root.querySelector('.rs-spiral-heading');
  const revealObserver = new IntersectionObserver(entries => {
    for (const {isIntersecting, target} of entries) {
      if (!isIntersecting) continue;
      target.classList.add('rs-story-entered');
      revealObserver.unobserve(target);
    }
  }, {threshold:.12});
  for (const node of [hero, story.querySelector('.rs-product-copy'), ...root.querySelectorAll('[data-rs-journey], .pricing-choice-card')]) {
    if (node) revealObserver.observe(node);
  }

  const controller = new AbortController();
  const {signal} = controller;
  let frame = 0;
  let visible = false;
  let start = 0;
  let distance = 1;

  function paint() {
    frame = 0;
    const progress = Math.max(0, Math.min(1, (scrollY - start) / distance));
    story.style.setProperty('--rs-story-progress', progress.toFixed(3));
  }
  function schedule() {
    if (visible && motion.matches && !frame) frame = requestAnimationFrame(paint);
  }
  function measure() {
    if (!motion.matches) return;
    start = story.getBoundingClientRect().top + scrollY - parseFloat(getComputedStyle(stage).top);
    distance = Math.max(1, story.offsetHeight - stage.offsetHeight);
    schedule();
  }

  const sceneObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) measure();
  });
  sceneObserver.observe(story);
  const resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(measure) : null;
  resizeObserver?.observe(root);
  addEventListener('scroll', schedule, {passive:true, signal});
  addEventListener('resize', measure, {passive:true, signal});
  motion.addEventListener('change', measure, {signal});

  return () => {
    controller.abort();
    revealObserver.disconnect();
    sceneObserver.disconnect();
    resizeObserver?.disconnect();
    cancelAnimationFrame(frame);
  };
}
