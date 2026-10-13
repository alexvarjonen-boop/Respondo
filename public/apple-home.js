// Three focused homepage feature cards; other sections are accessible from the fullscreen menu.
export function appleHomeMarkup(t,lang,count){
  const demo=`/assistant?lang=${lang}`;
  const all=`/ominaisuudet?lang=${lang}`;
  const chatTitle=t('Yrityksesi','Ditt företag','Your company');
  return `<section class="apple-hero" aria-labelledby="apple-home-title">
    <div class="apple-hero-inner">
      <p class="apple-eyebrow">RESPONDO AI</p>
      <h1 id="apple-home-title">${t('Älykkäämpää','Smartare','Smarter')}<br><span>${t('asiakaspalvelua','kundservice','customer service')}</span></h1>
      <p class="apple-hero-description">${t('AI-asiakaspalvelubotti yrityksesi verkkosivuille. Vastaa kysymyksiin vuorokauden ympäri yrityksesi omilla tiedoilla.','AI-kundservice på ditt företags webbplats. Svarar dygnet runt med information från ditt företag.','AI customer service for your business website. Available around the clock, with answers based on your company information.')}</p>
      <div class="apple-hero-actions"><a class="apple-pill apple-pill-primary" data-respondo-hero-cta="signup" href="/tilaus?lang=${lang}">${t('Kokeile 3 päivää ilmaiseksi','Prova gratis i 3 dagar','Try free for 3 days')}</a><a class="apple-pill apple-pill-secondary" data-respondo-hero-cta="demo" href="${demo}">${t('Kokeile bottia','Testa botten','Try the bot')}</a></div>
      <div class="apple-product-stage" aria-label="${t('Havainnollistava esimerkki chatbotista','Illustrativt exempel på en chattbot','Illustrative chatbot example')}">
        <div class="apple-stage-halo" aria-hidden="true"></div>
        <div class="apple-stage-typography" aria-hidden="true">AI</div>
        <div class="apple-chat-preview">
          <div class="apple-preview-top"><span class="apple-preview-avatar" aria-hidden="true">✦</span><span><strong>${chatTitle}</strong><small><i aria-hidden="true"></i>${t('Paikalla nyt','Online nu','Online now')}</small></span><span class="apple-preview-dots" aria-hidden="true">···</span></div>
          <div class="apple-preview-body">
            <p class="apple-preview-question">${t('Miten toimitus toimii?','Hur fungerar leveransen?','How does delivery work?')}</p>
            <p class="apple-preview-answer">${t('Voin kertoa toimitustavoista ja -ajoista yrityksen sivuilta löytyvien tietojen perusteella.','Jag kan berätta om leveranssätt och leveranstider utifrån företagets webbplats.','I can explain delivery options and times based on the company’s website information.')}</p>
          </div>
          <div class="apple-preview-input">${t('Kirjoita viesti…','Skriv ett meddelande…','Type a message…')} <span aria-hidden="true">↑</span></div>
        </div>
      </div>
      <p class="apple-sample-note">${t('Havainnollistava esimerkki — asiakkaasi näkee yrityksesi brändin.','Illustrativt exempel – din kund ser ditt företags varumärke.','Illustrative example — your customers see your brand.')}</p>
    </div>
  </section>
  <section class="apple-highlights" aria-labelledby="apple-highlights-title" id="features">
    <div class="apple-highlights-intro"><p class="apple-eyebrow">${t('MIKSI RESPONDO','VARFÖR RESPONDO','WHY RESPONDO')}</p><h2 id="apple-highlights-title">${t('Kolme asiaa, jotka muuttavat asiakaspalvelun.','Tre saker som förändrar kundservicen.','Three ways to transform customer service.')}</h2></div>
    <div class="apple-highlights-grid">
      <article class="apple-feature-card apple-card-support" id="available">
        <div class="apple-card-content"><p class="apple-card-eyebrow">01 / 03</p><h3>${t('Asiakaspalvelu','Kundservice','Customer support')}<br><span>${t('ei nuku.','sover aldrig.','never sleeps.')}</span></h3><p>${t('Automaattiset vastaukset yleisiin kysymyksiin 24/7. Myös silloin, kun sinä et ole paikalla.','Automatiska svar på vanliga frågor dygnet runt – även när du inte är på plats.','Automatic answers to common questions, 24/7. Even when your team is offline.')}</p><a href="${demo}" class="apple-card-link">${t('Kokeile käytännössä','Prova själv','Try it yourself')} <span aria-hidden="true">↗</span></a></div><div class="apple-card-art apple-art-clock" aria-hidden="true"><div class="apple-clock-face"><span>24</span><small> / 7</small></div></div>
      </article>
      <article class="apple-feature-card apple-card-knowledge" id="knowledge">
        <div class="apple-card-content"><p class="apple-card-eyebrow">02 / 03</p><h3>${t('Yrityksesi tiedot.','Företagets information.','Your business knowledge.')}<br><span>${t('Oikeat vastaukset.','Rätt svar.','Useful answers.')}</span></h3><p>${t('Tietopohja kokoaa palvelut, tuotteet, hinnat ja yhteystiedot. Verkkosivutuonti käytössä tilauksen ominaisuuksien mukaan.','Kunskapsbasen samlar tjänster, produkter, priser och kontaktuppgifter. Webbplatsimport ingår enligt vald plan.','Your knowledge base brings together services, products, prices and contact details. Website import depends on your plan.')}</p><a href="${all}" class="apple-card-link">${t('Tutustu ominaisuuksiin','Utforska funktioner','Explore features')} <span aria-hidden="true">↗</span></a></div><div class="apple-card-art apple-art-orbit" aria-hidden="true"><div class="apple-orbit-ring"></div><div class="apple-orbit-core"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="112" height="112" aria-hidden="true" focusable="false" style="display:block;overflow:visible;filter:drop-shadow(0 0 12px rgba(167,184,231,.32))"><path d="M 238.0 66.1 L 235.2 64.9 L 183.6 84.5 L 182.6 86.0 L 183.3 87.8 L 201.2 92.1 L 201.7 94.4 L 138.0 153.1 L 133.2 154.3 L 128.6 152.6 L 109.0 130.9 L 103.7 126.6 L 97.4 124.6 L 90.8 125.1 L 82.8 129.4 L 20.5 180.0 L 18.0 183.6 L 18.8 188.6 L 22.3 191.1 L 27.6 190.1 L 87.6 143.2 L 90.6 142.0 L 96.6 143.5 L 123.1 171.5 L 128.6 173.5 L 133.7 173.5 L 140.5 171.0 L 213.1 103.9 L 215.8 104.9 L 223.4 119.6 L 224.9 120.8 L 226.9 120.3 Z" fill="#fff"/></svg></div><span class="apple-orbit-dot one"></span><span class="apple-orbit-dot two"></span></div>
      </article>
      <article class="apple-feature-card apple-card-global" id="multilingual">
        <div class="apple-card-content"><p class="apple-card-eyebrow">03 / 03</p><h3>${t('Yksi botti.','En chattbot.','One chatbot.')}<br><span>${t('Kolme kieltä.','Tre språk.','Three languages.')}</span></h3><p>${t('Palvele asiakkaitasi suomeksi, ruotsiksi ja englanniksi. Myös jatkokysymykset pysyvät mukana keskustelussa.','Betjäna kunder på finska, svenska och engelska. Även följdfrågor följer med i samtalet.','Support customers in Finnish, Swedish and English, with follow-up questions in context.')}</p><a href="${all}" class="apple-card-link">${t(`Katso kaikki ${count} ominaisuutta`,`Se alla ${count} funktioner`,`See all ${count} features`)} <span aria-hidden="true">↗</span></a></div><div class="apple-card-art apple-art-language" aria-hidden="true"><span>Hei.</span><span>Hej.</span><span>Hello.</span></div>
      </article>
    </div>
  </section>
  <section class="apple-bottom-cta"><p>${t('Valmis vastaamaan ensimmäiseen kysymykseen?','Redo att svara på den första frågan?','Ready for your first conversation?')}</p><a class="apple-pill apple-pill-primary" href="/tilaus">${t('Aloita ilmainen kokeilu','Börja gratis provperiod','Start your free trial')}</a><a class="apple-buyer-guide-link" href="/asiakaspalvelubotti?lang=${lang}">${t('Mikä on asiakaspalvelijabotti?','Så fungerar en AI-kundservicebot','How an AI customer service chatbot works')} →</a></section>
  <section class="apple-learning-links" aria-labelledby="apple-learning-links-title"><div class="apple-learning-inner">
    <p class="apple-eyebrow">${t('OPPAAT YRITYKSILLE','GUIDER FÖR FÖRETAG','BUSINESS GUIDES')}</p>
    <h2 id="apple-learning-links-title">${t('Mistä aloittaa tekoälyn kanssa?','Hur börjar man med AI?','Where should you start with AI?')}</h2>
    <p>${t('Tutustu käytännön asiakaspalveluratkaisuihin ja tekoälyn mahdollisuuksiin yritykselle.','Läs om praktiska kundservicelösningar och AI i företaget.','Explore practical customer service automation and AI use cases for businesses.')}</p>
    <div class="apple-learning-grid">
      <a href="/tekoaly-asiakaspalvelu?lang=${lang}"><strong>${t('Tekoäly asiakaspalvelussa','AI i kundservice','AI in customer service')}</strong><span>${t('Ratkaisut, käyttöönotto ja ihmisen apu','Lösningar, införande och mänsklig hjälp','Workflows, setup and human escalation')} →</span></a>
      <a href="/tekoaly-yrityksille?lang=${lang}"><strong>${t('Tekoäly yrityksille','AI för företag','AI for businesses')}</strong><span>${t('Käyttökohteet ja aloitusopas','Användning och startguide','Use cases and a starter checklist')} →</span></a>
    </div>
  </div></section>`;
}
