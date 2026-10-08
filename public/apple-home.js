// Three focused homepage feature cards; other sections are accessible from the fullscreen menu.
export function appleHomeMarkup(t,lang,count){
  const demo=`/assistant?lang=${lang}`;
  const all=`/ominaisuudet?lang=${lang}`;
  const chatTitle=t('Yrityksesi','Ditt företag','Your company');
  return `<section class="apple-hero" aria-labelledby="apple-home-title">
    <div class="apple-hero-inner">
      <p class="apple-eyebrow">RESPONDO AI</p>
      <h1 id="apple-home-title">${t('Asiakaspalvelu.','Kundservice.','Customer service.')}<br><span>${t('Uudella tasolla.','På en ny nivå.','Taken further.')}</span></h1>
      <p class="apple-hero-description">${t('AI-asiakaspalvelubotti yrityksesi verkkosivuille. Vastaa kysymyksiin vuorokauden ympäri yrityksesi omilla tiedoilla.','AI-kundservice på ditt företags webbplats. Svarar dygnet runt med information från ditt företag.','AI customer service for your business website. Available around the clock, with answers based on your company information.')}</p>
      <div class="apple-hero-actions"><a class="apple-pill apple-pill-primary" href="/tilaus">${t('Kokeile 3 päivää ilmaiseksi','Prova gratis i 3 dagar','Try free for 3 days')}</a><a class="apple-pill apple-pill-secondary" href="${demo}">${t('Kokeile bottia','Testa botten','Try the bot')}</a></div>
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
        <div class="apple-card-content"><p class="apple-card-eyebrow">02 / 03</p><h3>${t('Yrityksesi tiedot.','Företagets information.','Your business knowledge.')}<br><span>${t('Oikeat vastaukset.','Rätt svar.','Useful answers.')}</span></h3><p>${t('Tietopohja kokoaa palvelut, tuotteet, hinnat ja yhteystiedot. Verkkosivutuonti käytössä tilauksen ominaisuuksien mukaan.','Kunskapsbasen samlar tjänster, produkter, priser och kontaktuppgifter. Webbplatsimport ingår enligt vald plan.','Your knowledge base brings together services, products, prices and contact details. Website import depends on your plan.')}</p><a href="${all}" class="apple-card-link">${t('Tutustu ominaisuuksiin','Utforska funktioner','Explore features')} <span aria-hidden="true">↗</span></a></div><div class="apple-card-art apple-art-orbit" aria-hidden="true"><div class="apple-orbit-ring"></div><div class="apple-orbit-core">R</div><span class="apple-orbit-dot one"></span><span class="apple-orbit-dot two"></span></div>
      </article>
      <article class="apple-feature-card apple-card-global" id="multilingual">
        <div class="apple-card-content"><p class="apple-card-eyebrow">03 / 03</p><h3>${t('Yksi botti.','En chattbot.','One chatbot.')}<br><span>${t('Kolme kieltä.','Tre språk.','Three languages.')}</span></h3><p>${t('Palvele asiakkaitasi suomeksi, ruotsiksi ja englanniksi. Myös jatkokysymykset pysyvät mukana keskustelussa.','Betjäna kunder på finska, svenska och engelska. Även följdfrågor följer med i samtalet.','Support customers in Finnish, Swedish and English, with follow-up questions in context.')}</p><a href="${all}" class="apple-card-link">${t(`Katso kaikki ${count} ominaisuutta`,`Se alla ${count} funktioner`,`See all ${count} features`)} <span aria-hidden="true">↗</span></a></div><div class="apple-card-art apple-art-language" aria-hidden="true"><span>Hei.</span><span>Hej.</span><span>Hello.</span></div>
      </article>
    </div>
  </section>
  <section class="apple-bottom-cta"><p>${t('Valmis vastaamaan ensimmäiseen kysymykseen?','Redo att svara på den första frågan?','Ready for your first conversation?')}</p><a class="apple-pill apple-pill-primary" href="/tilaus">${t('Aloita ilmainen kokeilu','Börja gratis provperiod','Start your free trial')}</a></section>`;
}
