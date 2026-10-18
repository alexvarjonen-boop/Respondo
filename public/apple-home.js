// Three focused homepage feature cards; other sections are accessible from the fullscreen menu.
export function appleHomeMarkup(t,lang,count,pricingMarkup=''){
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
        <div class="apple-card-content"><p class="apple-card-eyebrow">03 / 03</p><h3>${t('Yksi botti.','En chattbot.','One chatbot.')}<br><span>${t('Kolme kieltä.','Tre språk.','Three languages.')}</span></h3><p>${t('Palvele asiakkaitasi suomeksi, ruotsiksi ja englanniksi. Myös jatkokysymykset pysyvät mukana keskustelussa.','Betjäna kunder på finska, svenska och engelska. Även följdfrågor följer med i samtalet.','Support customers in Finnish, Swedish and English, with follow-up questions in context.')}</p></div><div class="apple-card-art apple-art-language" aria-hidden="true"><span>Hei.</span><span>Hej.</span><span>Hello.</span></div>
      </article>
    </div>
  </section>

  <section class="apple-lead-calculator" id="calculator" aria-labelledby="apple-lead-title">
    <div class="apple-lead-inner">
      <header class="apple-lead-intro">
        <p class="apple-eyebrow">${t("LASKE ITSE","RÄKNA SJÄLV","VALUE CALCULATOR")}</p>
        <h2 id="apple-lead-title">${t("Mitä vastaamatta jääneet yhteydenotot voivat maksaa?","Vad kan obesvarade kundförfrågningar vara värda?","What could unanswered enquiries be worth?")}</h2>
      </header>
      <div class="apple-lead-layout">
        <div class="apple-lead-form">
          <div class="apple-lead-field">
            <div class="apple-lead-field-head">
              <label for="jobValueSlider">${t("Yhden kaupan arvo","Värde per affär","Value per sale")}</label>
              <output id="jobValueOutput" for="jobValueSlider">150 €</output>
            </div>
            <input id="jobValueSlider" class="apple-lead-slider" type="range" min="0" max="10000" step="50" value="150" aria-label="${t("Yhden kaupan arvo euroina","Värde per affär i euro","Value per sale in euros")}">
            <div class="apple-lead-limits"><span>0 €</span><span>10 000 €</span></div>
          </div>
          <div class="apple-lead-field">
            <div class="apple-lead-field-head">
              <label for="missedSlider">${t("Vastaamatta / päivä","Obesvarade / dag","Unanswered / day")}</label>
              <output id="missedOutput" for="missedSlider">3</output>
            </div>
            <input id="missedSlider" class="apple-lead-slider" type="range" min="0" max="100" step="1" value="3" aria-label="${t("Vastaamatta jääneet yhteydenotot päivässä","Obesvarade kundförfrågningar per dag","Unanswered enquiries per day")}">
            <div class="apple-lead-limits"><span>0</span><span>100</span></div>
          </div>
        </div>
        <div class="apple-lead-result">
          <div class="apple-lead-result-head"><span>${t("MAHDOLLINEN ARVO","POTENTIELLT VÄRDE","POTENTIAL VALUE")}</span><span>30 ${t("PÄIVÄÄ","DAGAR","DAYS")}</span></div>
          <output id="monthlyValue" class="apple-lead-total" for="jobValueSlider missedSlider" aria-live="polite" aria-atomic="true">13 500 €</output>
          <div class="apple-lead-breakdown">
            <div><span>${t("Päivässä","Per dag","Per day")}</span><output id="dailyValue" for="jobValueSlider missedSlider">450 €</output></div>
            <div><span>${t("Vuodessa","Per år","Per year")}</span><output id="yearlyValue" for="jobValueSlider missedSlider">164 250 €</output></div>
          </div>
        </div>
      </div>
      <p class="apple-lead-disclaimer">${t("Havainnollistava arvio: jokainen vastaamatta jäänyt yhteydenotto vastaa yhtä toteutunutta kauppaa. Ei myyntiennuste tai lupaus lisätuloista.","Illustrativt exempel: varje obesvarad förfrågan antas motsvara en genomförd affär. Ingen försäljningsprognos eller intäktsgaranti.","Illustrative estimate: each unanswered enquiry is assumed to equal one completed sale. Not a sales forecast or revenue guarantee.")}</p>
    </div>
  </section>

  <section class="rg-growth-section" id="growth-scenario" aria-labelledby="rg-growth-title">
    <div class="rg-growth-inner">
      <header class="rg-growth-intro">
        <p class="apple-eyebrow">${t("KASVUSKENAARIO","TILLVÄXTSCENARIO","GROWTH SCENARIO")}</p>
        <h2 id="rg-growth-title">${t("Enemmän tavoitettuja asiakkaita. Enemmän mahdollisuuksia.","Fler nådda kunder. Fler möjligheter.","Reach more customers. Create more opportunities.")}</h2>
        <p>${t("Katso, miltä myynnin mahdollinen kehitys voi näyttää havainnollistavassa esimerkissä.","Se hur en möjlig försäljningsutveckling kan se ut i ett illustrativt exempel.","Explore what potential sales growth could look like in an illustrative scenario.")}</p>
      </header>
      <div class="rg-terminal" aria-label="${t("Havainnollistava kasvunäkymä","Illustrativ tillväxtvy","Illustrative growth dashboard")}">
        <div class="rg-terminal-top">
          <div class="rg-terminal-brand"><span class="rg-terminal-mark" aria-hidden="true">↗</span><span>RESPONDO <em>INSIGHTS</em></span></div>
          <span class="rg-demo-badge"><span aria-hidden="true"></span>${t("ESIMERKKIDATA","EXEMPELDATA","SAMPLE DATA")}</span>
        </div>
        <div class="rg-kpi-grid">
          <div class="rg-kpi"><span>${t("Myynti-indeksin muutos","Förändring i försäljningsindex","Sales index change")}</span><strong>+52<span>%</span></strong><small>${t("6 kuukauden esimerkki","Exempel över 6 månader","6-month example")}</small></div>
          <div class="rg-kpi"><span>${t("Myynti-indeksi alussa","Försäljningsindex vid start","Starting sales index")}</span><strong>100</strong><small>${t("Lähtötaso","Startnivå","Baseline")}</small></div>
          <div class="rg-kpi"><span>${t("Myynti-indeksi lopussa","Försäljningsindex vid slutet","Ending sales index")}</span><strong>152</strong><small>${t("Havainnollistava tavoitetaso","Illustrativ målnivå","Illustrative end value")}</small></div>
        </div>
        <div class="rg-visual-grid">
          <div class="rg-primary-chart">
            <div class="rg-chart-heading"><div><span>${t("MYYNNIN KEHITYS","FÖRSÄLJNINGSUTVECKLING","SALES TREND")}</span><h3>${t("Kasvukäyrä","Tillväxtkurva","Growth curve")}</h3></div><b>↗ +52 %</b></div>
            <div class="rg-graph-frame">
              <div class="rg-axis-labels" aria-hidden="true"><span>150</span><span>125</span><span>100</span></div>
              <svg class="rg-graph" viewBox="0 0 740 280" preserveAspectRatio="none" role="img" aria-label="${t("Esimerkin myynti-indeksi nousee kuudessa kuukaudessa 100:sta 152:een.","I exemplet ökar försäljningsindex från 100 till 152 på sex månader.","In this illustration, the sales index increases from 100 to 152 over six months.")}">
                <defs>
                  <linearGradient id="rg-growth-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#4cf6ac" stop-opacity=".30"/><stop offset="100%" stop-color="#4cf6ac" stop-opacity="0"/></linearGradient>
                  <filter id="rg-line-glow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                </defs>
                <g class="rg-gridlines"><path d="M0 35 H740 M0 96 H740 M0 157 H740 M0 218 H740 M0 276 H740"/><path d="M0 0 V280 M148 0 V280 M296 0 V280 M444 0 V280 M592 0 V280 M739 0 V280"/></g>
                <path class="rg-area" d="M 0 252 C 55 251 84 235 148 220 S 250 212 296 187 S 401 173 444 141 S 552 118 592 79 S 694 57 740 27 L 740 280 L 0 280 Z" fill="url(#rg-growth-fill)"/>
                <path class="rg-line-halo" d="M 0 252 C 55 251 84 235 148 220 S 250 212 296 187 S 401 173 444 141 S 552 118 592 79 S 694 57 740 27"/>
                <path class="rg-line" d="M 0 252 C 55 251 84 235 148 220 S 250 212 296 187 S 401 173 444 141 S 552 118 592 79 S 694 57 740 27"/>
                <circle cx="740" cy="27" r="8" fill="#58eeb0"/><circle cx="740" cy="27" r="17" fill="#58eeb0" opacity=".12"/>
              </svg>
            </div>
            <div class="rg-graph-months" aria-hidden="true"><span>${t("KK 1","MÅN 1","MO 1")}</span><span>${t("KK 2","MÅN 2","MO 2")}</span><span>${t("KK 3","MÅN 3","MO 3")}</span><span>${t("KK 4","MÅN 4","MO 4")}</span><span>${t("KK 5","MÅN 5","MO 5")}</span><span>${t("KK 6","MÅN 6","MO 6")}</span></div>
          </div>
          <aside class="rg-side">
            <div class="rg-side-card">
              <span class="rg-side-kicker">${t("MAHDOLLISUUDET","MÖJLIGHETER","OPPORTUNITIES")}</span>
              <h3>${t("Jokaisella yhteydenotolla on merkitystä.","Varje kundkontakt räknas.","Every customer conversation matters.")}</h3>
              <svg viewBox="0 0 320 110" preserveAspectRatio="none" role="img" aria-label="${t("Nouseva havainnollistava käyrä","Illustrativ stigande kurva","Illustrative upward trend")}"><path class="rg-spark-bg" d="M0 90 H320 M0 50 H320 M0 10 H320"/><path class="rg-spark-fill" d="M 0 99 L 38 89 L 72 95 L 104 75 L 141 70 L 174 57 L 201 60 L 240 42 L 273 27 L 320 12 L 320 110 L 0 110 Z"/><path class="rg-spark-line" d="M 0 99 L 38 89 L 72 95 L 104 75 L 141 70 L 174 57 L 201 60 L 240 42 L 273 27 L 320 12"/></svg>
              <p>${t("Nopeampi vastaus voi auttaa vähentämään menetettyjä yhteydenottoja.","Snabbare svar kan hjälpa till att minska missade förfrågningar.","Faster replies may help reduce missed enquiries.")}</p>
            </div>
            <div class="rg-side-note"><span class="rg-side-note-icon" aria-hidden="true">◎</span><div><b>${t("Ei toteutunutta asiakasdataa","Inte faktiska kundresultat","Not actual customer results")}</b><span>${t("Kaaviot näyttävät kuvitteellisen kehityspolun, eivät Respondon todistettua vaikutusta.","Diagrammen visar ett fiktivt scenario, inte en bevisad effekt av Respondo.","Charts show hypothetical growth, not measured Respondo results.")}</span></div></div>
          </aside>
        </div>
        <div class="rg-table-area">
          <div class="rg-table-title">${t("KEHITYS KUUKAUSITTAIN","UTVECKLING PER MÅNAD","MONTH-BY-MONTH SCENARIO")}</div>
          <div class="rg-table-scroll"><table><thead><tr><th>${t("Mittari","Mått","Metric")}</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th></tr></thead>
            <tbody><tr><th>${t("Myynti-indeksi","Försäljningsindex","Sales index")}</th><td>100</td><td>108</td><td>119</td><td>128</td><td>140</td><td>152</td></tr>
            <tr><th>${t("Muutos lähtötasosta","Förändring från start","Change from baseline")}</th><td>0 %</td><td>+8 %</td><td>+19 %</td><td>+28 %</td><td>+40 %</td><td class="rg-positive">+52 % ↗</td></tr></tbody>
          </table></div>
        </div>
      </div>
      <p class="rg-growth-disclaimer">${t("Havainnollistava, itse laadittu skenaario. Prosentit eivät perustu asiakkaiden mitattuihin tuloksiin eikä niitä pidä tulkita myyntiennusteeksi tai tuotteen lupaamaksi kasvuksi.","Ett illustrativt, konstruerat scenario. Procentsiffrorna baseras inte på uppmätta kundresultat och är ingen försäljningsprognos eller garanterad tillväxt.","Illustrative, constructed scenario. Percentages are not based on measured customer outcomes and are not a sales forecast or a growth guarantee.")}</p>
    </div>
  </section>

  ${pricingMarkup}
  <section class="apple-bottom-cta"><p>${t('Valmis vastaamaan ensimmäiseen kysymykseen?','Redo att svara på den första frågan?','Ready for your first conversation?')}</p><a class="apple-pill apple-pill-primary" href="/tilaus">${t('Aloita ilmainen kokeilu','Börja gratis provperiod','Start your free trial')}</a><a class="apple-buyer-guide-link" href="/asiakaspalvelubotti?lang=${lang}">${t('Mikä on asiakaspalvelijabotti?','Så fungerar en AI-kundservicebot','How an AI customer service chatbot works')} →</a></section>`;
}
