// Compact public homepage. The same hero is used for initial HTML and client rendering.
export function demoFirstHero(t, lang) {
  const L=['fi','sv','en'].includes(lang)?lang:'en';
  const demo='/yhteystiedot?intent=demo&amp;lang='+L;
  const label=t('Varaa demo','Boka demo','Book a demo');
  const benefits=[
    [t('Vastaa 24/7','Svara dygnet runt','Support 24/7'),t('Vastaukset yrityksesi omista tiedoista.','Svar från företagets egna uppgifter.','Answers grounded in your business information.')],
    [t('Kerää liidit','Samla leads','Capture leads'),t('Yhteydenotot ja tarjouspyynnöt talteen.','Samla kontakt- och offertförfrågningar.','Capture enquiries and quote requests.')],
    [t('Helpota ajanvarausta','Underlätta bokning','Simplify bookings'),t('Ohjaa asiakas seuraavaan vaiheeseen.','Hjälp kunden till nästa steg.','Guide customers to the next step.')]
  ];
  return `<section class="df-hero" aria-labelledby="apple-home-title"><div class="df-container df-hero-layout">
    <div class="df-copy"><p class="df-eyebrow">RESPONDO AI / 24/7</p>
      <h1 id="apple-home-title">${t('Enemmän yhteydenottoja. Vähemmän asiakaspalvelutyötä.','Fler förfrågningar. Mindre kundservicearbete.','More enquiries. Less support work.')}</h1>
      <p class="df-lead">${t('AI-asiakaspalvelija vastaa asiakkaidesi kysymyksiin yrityksesi tiedoilla, kerää liidit ja auttaa ajanvarauksissa myös työajan ulkopuolella.','AI-kundservice svarar med företagets information, samlar leads och hjälper till med bokningar även utanför öppettiderna.','AI customer service that answers using your business information, captures leads and assists with bookings, even after hours.')}</p>
      <div class="df-actions"><a class="df-primary" href="${demo}">${label} <span aria-hidden="true">↗</span></a><a class="df-secondary" href="/assistant?lang=${L}">${t('Kokeile bottia','Testa botten','Try the bot')}</a></div>
      <p class="df-note">${t('Maksuton 15 minuutin esittely. Ei sitoumuksia.','Kostnadsfri demo på 15 minuter. Inga förpliktelser.','Free 15-minute demo. No commitment.')}</p>
    </div>
    <div class="df-example" aria-label="${t('Esimerkkikeskustelu','Exempelkonversation','Example conversation')}"><div class="df-example-top"><span class="df-dot" aria-hidden="true"></span><strong>${t('Yrityksesi','Ditt företag','Your business')}</strong><small>AI · 24/7</small></div>
      <div class="df-chat"><p class="df-question">${t('Voinko pyytää tarjouksen?','Kan jag be om en offert?','Can I request a quote?')}</p><p class="df-answer">${t('Totta kai. Kerro, mitä tarvitset, niin välitän yhteydenottosi yritykselle.','Absolut. Berätta vad du behöver så förmedlar jag din förfrågan.','Of course. Tell me what you need and I can pass your enquiry to the business.')}</p></div>
      <div class="df-example-foot">${t('Esimerkki liidin keräämisestä','Exempel på leadinsamling','Example of lead capture')}</div></div>
    </div></section><section class="df-benefits" aria-label="${t('Keskeiset hyödyt','Viktigaste fördelarna','Key benefits')}"><div class="df-container df-benefit-grid">${benefits.map(([h,p],i)=>`<article><span class="df-number">0${i+1}</span><h2>${h}</h2><p>${p}</p></article>`).join('')}</div></section>`;
}
export function appleHomeMarkup(t,lang,count,pricingMarkup=''){
  return `${demoFirstHero(t,lang)}${pricingMarkup}`;
}
