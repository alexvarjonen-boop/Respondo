/* Respondo's official arrow stays in the center after the existing logo reveal.
   Marketing copy only: never present sample percentages as measured customer results. */
export function spiralHeroMarkup(t, lang) {
  const cards = [
    ['24/7', t('Asiakaspalvelu ei nuku.','Kundservicen sover aldrig.','Support never sleeps.'),
      t('Automaattiset vastaukset myös työajan ulkopuolella.','Automatiska svar även utanför öppettiderna.','Automatic answers even outside business hours.'), '01'],
    ['FI · SV · EN', t('Kolme kieltä.','Tre språk.','Three languages.'),
      t('Suomi, svenska ja English samassa palvelussa.','Finska, svenska och engelska i samma tjänst.','Finnish, Swedish and English in one service.'), '02'],
    ['01', t('Yksi Respondo.','En Respondo.','One Respondo.'),
      t('Tietopohja, keskustelut ja yhteydenotot yhdessä.','Kunskapsbas, konversationer och kontakter på ett ställe.','Knowledge, conversations and enquiries in one place.'), '03'],
    ['+52 %', t('Näe kasvun mahdollisuus.','Se tillväxtmöjligheten.','Explore growth potential.'),
      t('Havainnollistava 6 kk:n skenaario — ei mitattu asiakastulos.','Illustrativt 6-månadersscenario – inget uppmätt kundresultat.','Illustrative 6-month scenario — not a measured customer result.'), '04'],
    ['↗', t('Vastaa nopeammin.','Svara snabbare.','Reply faster.'),
      t('Auta asiakasta löytämään vastaukset heti.','Hjälp kunden att hitta svar direkt.','Help customers find answers right away.'), '05'],
    ['✦', t('Sinun brändisi.','Ditt varumärke.','Your brand.'),
      t('Muokkaa botin ulkoasu yrityksesi näköiseksi.','Anpassa chattbottens utseende till ditt företag.','Customize the chatbot to match your business.'), '06'],
    ['↗', t('Vähemmän ohitettuja kysymyksiä.','Färre missade frågor.','Fewer missed questions.'),
      t('Kerää yhteydenottoja myös silloin, kun tiimi on poissa.','Samla förfrågningar även när teamet är borta.','Capture enquiries even when your team is away.'), '07']
  ];
  const arrow = 'M 238.0 66.1 L 235.2 64.9 L 183.6 84.5 L 182.6 86.0 L 183.3 87.8 L 201.2 92.1 L 201.7 94.4 L 138.0 153.1 L 133.2 154.3 L 128.6 152.6 L 109.0 130.9 L 103.7 126.6 L 97.4 124.6 L 90.8 125.1 L 82.8 129.4 L 20.5 180.0 L 18.0 183.6 L 18.8 188.6 L 22.3 191.1 L 27.6 190.1 L 87.6 143.2 L 90.6 142.0 L 96.6 143.5 L 123.1 171.5 L 128.6 173.5 L 133.7 173.5 L 140.5 171.0 L 213.1 103.9 L 215.8 104.9 L 223.4 119.6 L 224.9 120.8 L 226.9 120.3 Z';
  return `<section class="apple-hero rs-spiral-section" id="features" aria-labelledby="apple-home-title" data-rs-spiral>
    <div class="rs-spiral-stage">
      <div class="rs-space" aria-hidden="true"><div class="rs-space-glow"></div><div class="rs-space-ellipse rs-space-ellipse-a"></div><div class="rs-space-ellipse rs-space-ellipse-b"></div><div class="rs-space-horizon"></div></div>
      <div class="rs-spiral-heading">
        <p class="apple-eyebrow">RESPONDO AI <span class="rs-subbrand">/ ${t('ÄLYKÄS ASIAKASPALVELU','SMART KUNDSERVICE','SMART CUSTOMER SERVICE')}</span></p>
        <h1 id="apple-home-title">${t('Älykkäämpää','Smartare','Smarter')} <span>${t('asiakaspalvelua.','kundservice.','customer service.')}</span></h1>
        <p class="rs-hero-description">${t('Yksi älykäs asiakaspalvelija. Rajattomasti parempia kohtaamisia.','En smart kundservicemedarbetare. Fler möjligheter att hjälpa kunder.','One intelligent support assistant. More ways to help your customers.')}</p>
      </div>
      <div class="rs-spiral-orbit" aria-label="${t('Respondo AI:n ominaisuudet','Respondo AI:s funktioner','Respondo AI features')}">
        <div class="rs-spiral-cards" role="list">
          ${cards.map(([metric,title,copy,number],i)=>`<article class="rs-spiral-card${i===0?' rs-front':''}" role="listitem" data-rs-card data-index="${i}">
            <div class="rs-spiral-card-kicker"><span>RESPONDO / ${number}</span><i aria-hidden="true"></i></div>
            <div class="rs-spiral-metric">${metric}</div>
            <h2>${title}</h2><p>${copy}</p>
          </article>`).join('')}
        </div>
        <div class="rs-axis" aria-hidden="true">
          <span class="rs-axis-halo"></span>
          <svg viewBox="0 0 256 256" width="256" height="256" focusable="false"><path d="${arrow}" fill="white"/></svg>
          <span class="rs-axis-caption">RESPONDO AI</span>
        </div>
      </div>
      <div class="rs-spiral-bottom">
        <div class="rs-scroll-invite" aria-hidden="true"><span class="rs-scroll-rule"></span>${t('SELAA ALAS','SKROLLA NED','SCROLL TO EXPLORE')}</div>
        <div class="apple-hero-actions rs-hero-actions">
          <a class="apple-pill apple-pill-primary" data-respondo-hero-cta="signup" href="/tilaus?lang=${lang}">${t('Kokeile 3 päivää ilmaiseksi','Prova gratis i 3 dagar','Try free for 3 days')}</a>
          <a class="apple-pill apple-pill-secondary" data-respondo-hero-cta="demo" href="/assistant?lang=${lang}">${t('Kokeile bottia','Testa botten','Try the bot')}</a>
        </div>
        <div class="rs-step-count" aria-hidden="true"><span data-rs-step>01</span><span class="rs-step-line"></span><span>07</span></div>
      </div>
      <span class="rs-visually-hidden" aria-live="polite" aria-atomic="true" data-rs-announcement></span>
    </div>
  </section>`;
}
