/* Respondo's official arrow stays in the center after the existing logo reveal.
   Each scroll scene has one semantically matching icon in the orbital ring.
   Marketing copy only: never present sample percentages as measured customer results. */
import {FEATURE_COUNT} from './features-data.js';
export function spiralHeroMarkup(t, lang) {
  const languageFlags = `<span class="rs-language-flags" role="img" aria-label="${t('Englanti, suomi ja ruotsi','Engelska, finska och svenska','English, Finnish and Swedish')}">
    <span class="${lang==='en'?'is-active':''}" aria-hidden="true"><svg width="28" height="20" viewBox="0 0 22 16" focusable="false"><rect width="22" height="16" rx="2" fill="#012169"/><path d="M0 0 22 16M22 0 0 16" stroke="#fff" stroke-width="4"/><path d="M0 0 22 16M22 0 0 16" stroke="#C8102E" stroke-width="2"/><path d="M11 0v16M0 8h22" stroke="#fff" stroke-width="5"/><path d="M11 0v16M0 8h22" stroke="#C8102E" stroke-width="3"/></svg></span>
    <span class="${lang==='fi'?'is-active':''}" aria-hidden="true"><svg width="28" height="20" viewBox="0 0 22 16" focusable="false"><rect width="22" height="16" rx="2" fill="#fff"/><rect x="6" width="3" height="16" fill="#003580"/><rect y="6.5" width="22" height="3" fill="#003580"/></svg></span>
    <span class="${lang==='sv'?'is-active':''}" aria-hidden="true"><svg width="28" height="20" viewBox="0 0 22 16" focusable="false"><rect width="22" height="16" rx="2" fill="#006AA7"/><rect x="6" width="3" height="16" fill="#FECC00"/><rect y="6.5" width="22" height="3" fill="#FECC00"/></svg></span>
  </span>`;
  const cards = [
    ['24/7', t('Asiakaspalvelu ei nuku.','Kundservicen sover aldrig.','Support never sleeps.'),
      t('Automaattiset vastaukset myös työajan ulkopuolella.','Automatiska svar även utanför öppettiderna.','Automatic answers even outside business hours.'), '01'],
    [languageFlags, t('Kolme kieltä.','Tre språk.','Three languages.'),
      t('Suomi, ruotsi ja englanti samassa palvelussa.','Finska, svenska och engelska i samma tjänst.','Finnish, Swedish and English in one service.'), '02'],
    ['01', t('Yksi Respondo.','En Respondo.','One Respondo.'),
      t('Tietopohja, keskustelut ja yhteydenotot yhdessä.','Kunskapsbas, konversationer och kontakter på ett ställe.','Knowledge, conversations and enquiries in one place.'), '03'],
    ['growth', t('Näe kasvun mahdollisuus.','Se tillväxtmöjligheten.','Explore growth potential.'),
      t('Seuraa keskusteluja ja tunnista, missä asiakkaasi tarvitsevat apua.','Följ konversationerna och se var kunderna behöver hjälp.','Review conversations to see where your customers need help.'), '04'],
    ['↗', t('Vastaa nopeammin.','Svara snabbare.','Reply faster.'),
      t('Auta asiakasta löytämään vastaukset heti.','Hjälp kunden att hitta svar direkt.','Help customers find answers right away.'), '05'],
    ['✦', t('Sinun brändisi.','Ditt varumärke.','Your brand.'),
      t('Muokkaa botin ulkoasu yrityksesi näköiseksi.','Anpassa chattbottens utseende till ditt företag.','Customize the chatbot to match your business.'), '06'],
    ['↗', t('Vähemmän ohitettuja kysymyksiä.','Färre missade frågor.','Fewer missed questions.'),
      t('Kerää yhteydenottoja myös silloin, kun tiimi on poissa.','Samla förfrågningar även när teamet är borta.','Capture enquiries even when your team is away.'), '07'],
    [String(FEATURE_COUNT), t('Ominaisuudet samassa palvelussa.','Funktioner i samma tjänst.','Features in one platform.'),
      t(`Tutustu ${FEATURE_COUNT} dokumentoituun ominaisuuteen. Saatavuus riippuu paketista ja käyttöönotosta.`,`Utforska ${FEATURE_COUNT} dokumenterade funktioner. Tillgänglighet beror på abonnemang och konfiguration.`,`Explore ${FEATURE_COUNT} documented features. Availability depends on your plan and setup.`), '08'],
    ['↙', t('Tiedot suoraan sivustolta.','Information direkt från webbplatsen.','Knowledge from your website.'),
      t('Anna verkkosivusi osoite. Respondo kerää olennaista tietoa yrityksesi palveluista ja tuotteista.','Ange webbplatsens adress. Respondo samlar relevant information om företagets tjänster och produkter.','Enter your website address. Respondo imports relevant service and product information.'), '09'],
    ['◷', t('Ajanvaraus chatissa.','Bokning i chatten.','Bookings in chat.'),
      t('Ohjaa asiakkaat vapaisiin aikoihin ja tarvittaessa ihmiselle. Integraatiot edellyttävät määrityksiä.','Hjälp kunderna hitta lediga tider eller nå personalen. Integrationer kräver konfigurering.','Help customers find available slots or reach a person. Integrations require setup.'), '10']
  ];
  // Compact, localized next-chapter cues reinforce the scroll-driven story without another CTA.
  const nextCues = [
    t("3 KIELTÄ", "3 SPRÅK", "3 LANGUAGES"),
    t("YKSI PALVELU", "EN TJÄNST", "ONE PLATFORM"),
    t("KASVUN MAHDOLLISUUS", "TILLVÄXT", "GROWTH POTENTIAL"),
    t("NOPEAT VASTAUKSET", "SNABBA SVAR", "FAST ANSWERS"),
    t("OMA BRÄNDI", "DITT VARUMÄRKE", "YOUR BRAND"),
    t("YHTEYDENOTOT", "FÖRFRÅGNINGAR", "ENQUIRIES"),
    t("OMINAISUUDET", "FUNKTIONER", "FEATURES"),
    t("SIVUSTON TIEDOT", "WEBBPLATSDATA", "WEBSITE KNOWLEDGE"),
    t("AJANVARAUS", "BOKNING", "BOOKINGS"),
    t("HINNAT", "PRISER", "PRICING"),
  ];
  // The orbit is not a set of unrelated generic icons: one glyph for every chapter,
  // in the same order as the feature panels.
  const iconPaths = [
    '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',                  // 24/7
    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a16 16 0 0 1 0 18M12 3a16 16 0 0 0 0 18"/>', // languages
    '<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/>', // knowledge
    '<path d="M3 19 9 12l4 3 8-10M16 5h5v5"/>',                          // growth
    '<path d="M13 2 5 13h7l-1 9 8-12h-7z"/>',                             // speed
    '<path d="M12 3a9 9 0 1 0 0 18h2a2 2 0 0 0 2-2c0-2-2-2-2-4 0-1 2-2 4-2h3"/><circle cx="7" cy="11" r=".8"/><circle cx="11" cy="7" r=".8"/>', // branding
    '<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M19 8v8M15 12h8"/>', // leads
    '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8 10 2 2 4-4m-6 8h8"/>', // features
    '<path d="M4 10V5h6M20 14v5h-6M4 5l6 6M20 19l-6-6M12 4h7a2 2 0 0 1 2 2v4M12 20H5a2 2 0 0 1-2-2v-4"/>', // website import
    '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18m-12 5 2 2 4-4"/>' // booking
  ];
  // Distinct monochrome technical illustrations complement the same chapter icon.
  // SVG stays inline, decorative and never loads external media.
  const sceneSignatures = [
    '<circle cx="400" cy="300" r="268" stroke-dasharray="1 26"/><path d="M400 42V74 M400 526V558 M142 300h32 M626 300h32"/>',
    '<ellipse cx="400" cy="300" rx="242" ry="74"/><ellipse cx="400" cy="300" rx="94" ry="242"/><path d="M158 300h484 M400 58v484"/>',
    '<path d="M165 166L332 226L481 133L630 274L523 433L283 468L165 166 M332 226l-49 242 M481 133l42 300"/><circle cx="165" cy="166" r="7"/><circle cx="523" cy="433" r="7"/>',
    '<path d="M144 471H655 M144 471V151 M171 414l111-77 96 42 111-153 126-64"/><path d="M579 162h36v36"/><circle cx="282" cy="337" r="8"/><circle cx="489" cy="226" r="8"/>',
    '<path d="M400 60L340 250H475L372 541 M270 110L221 205 M571 177L615 98 M215 433L145 485 M604 410L653 462"/>',
    '<path d="M214 226L400 122L586 226L400 330Z M214 313L400 417L586 313 M214 398L400 502L586 398"/><path d="M400 330v87" stroke-dasharray="5 11"/>',
    '<path d="M155 146H645L505 301V445L402 510V301Z"/><circle cx="272" cy="221" r="9"/><circle cx="523" cy="220" r="9"/><path d="M230 386h88 M230 410h63"/>',
    '<rect x="195" y="98" width="410" height="404" rx="25"/><path d="M236 180h325 M236 240h325 M236 300h325 M236 360h325 M236 420h325 M298 135v325 M400 135v325 M503 135v325"/>',
    '<rect x="168" y="130" width="464" height="340" rx="20"/><path d="M168 198h464 M242 250h162 M242 296h220 M242 342h119"/><circle cx="568" cy="294" r="42"/>',
    '<rect x="206" y="140" width="388" height="326" rx="18"/><path d="M206 226h388 M287 111v62 M514 111v62 M261 292h58 M363 292h58 M465 292h58 M261 361h58 M363 361h58"/><path d="m472 385 25 26 49-54"/>',
  ];
  // Match large feature symbols to their corresponding orbit icons exactly.
  // Typography stays text for factual metrics, but symbol-only metrics use SVG
  // rather than platform-dependent emoji rendering on iPhone and Android.
  const symbolicMetrics = new Set([3,4,5,6,8,9]);
  const metricMarkup = (metric,i) => symbolicMetrics.has(i)
    ? `<span class="rs-spiral-metric-glyph" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false" xmlns="http://www.w3.org/2000/svg">${iconPaths[i]}</svg></span>`
    : metric;
  const arrow = 'M 238.0 66.1 L 235.2 64.9 L 183.6 84.5 L 182.6 86.0 L 183.3 87.8 L 201.2 92.1 L 201.7 94.4 L 138.0 153.1 L 133.2 154.3 L 128.6 152.6 L 109.0 130.9 L 103.7 126.6 L 97.4 124.6 L 90.8 125.1 L 82.8 129.4 L 20.5 180.0 L 18.0 183.6 L 18.8 188.6 L 22.3 191.1 L 27.6 190.1 L 87.6 143.2 L 90.6 142.0 L 96.6 143.5 L 123.1 171.5 L 128.6 173.5 L 133.7 173.5 L 140.5 171.0 L 213.1 103.9 L 215.8 104.9 L 223.4 119.6 L 224.9 120.8 L 226.9 120.3 Z';
  return `<section class="apple-hero rs-spiral-section" id="features" aria-labelledby="apple-home-title" data-rs-spiral data-rs-mode="fullscreen" style="--rs-chapter-count:${cards.length};--rs-scroll-height:${cards.length*100}svh">
    <div class="rs-spiral-stage">
      <div class="rs-space" aria-hidden="true"><div class="rs-studio-grid"></div><div class="rs-studio-haze"></div><div class="rs-studio-sweep"></div><div class="rs-space-glow"></div><div class="rs-space-ellipse rs-space-ellipse-a"></div><div class="rs-space-ellipse rs-space-ellipse-b"></div><div class="rs-space-horizon"></div><div class="rs-kinetic-light"></div></div>
      <div class="rs-spiral-heading">
        <div class="rs-hero-eyebrow">RESPONDO AI <span aria-hidden="true">/</span> 24/7</div>
        <h1 id="apple-home-title">${t('Älykkäämpää','Smartare','Smarter')} <span>${t('asiakaspalvelua.','kundservice.','customer service.')}</span></h1>
        <p class="rs-hero-description">${t('Respondo vastaa asiakkaidesi kysymyksiin yrityksesi tiedoilla 24/7 ja ottaa yhteydenotot talteen.','Respondo svarar på kundfrågor med företagets information dygnet runt och tar emot förfrågningar.','Respondo answers questions using your business information, 24/7, and captures customer enquiries.')}</p>
        <a class="rs-first-order-link" href="/assistant?lang=${lang}" aria-label="${t('Kokeile bottia','Testa botten','Try the bot')}">
          <span>${t('Kokeile bottia','Testa botten','Try the bot')}</span>
        </a>
      </div>
      <div class="rs-spiral-orbit" aria-label="${t('Respondo AI:n ominaisuudet','Respondo AI:s funktioner','Respondo AI features')}">
        <div class="rs-studio-orbit-art" aria-hidden="true">
          <span class="rs-studio-orbit-ring rs-studio-ring-a"></span><span class="rs-studio-orbit-ring rs-studio-ring-b"></span><span class="rs-studio-orbit-ring rs-studio-ring-c"></span>
          ${cards.map(([,title],i)=>`<span class="rs-studio-orbit-icon${i===0?' is-active':''}" data-rs-icon data-index="${i}" data-rs-icon-label="${title}" style="--rs-icon-x:${(Math.sin(i*2*Math.PI/cards.length)*45).toFixed(2)}%;--rs-icon-y:${(-Math.cos(i*2*Math.PI/cards.length)*45).toFixed(2)}%" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false">${iconPaths[i]}</svg></span>`).join('')}
          <div class="rs-studio-orbit-label">${t('YKSI PALVELU · MONTA MAHDOLLISUUTTA','EN TJÄNST · MÅNGA MÖJLIGHETER','ONE PLATFORM · MANY POSSIBILITIES')}</div>
        </div>
        <div class="rs-orbit-beacon" aria-hidden="true"><svg class="rs-orbit-progress" viewBox="0 0 100 100" focusable="false"><circle cx="50" cy="50" r="48" pathLength="100"/></svg></div>
        <div class="rs-orbit-current" aria-hidden="true"><span class="rs-orbit-current-index" data-rs-orbit-index>01 / 10</span><span class="rs-orbit-current-divider"></span><span class="rs-orbit-current-title" data-rs-orbit-title>${cards[0][1]}</span></div>
        <div class="rs-spiral-cards" role="list">
          ${cards.map(([metric,title,copy,number],i)=>`<article class="rs-spiral-card${i===0?' rs-front':''}" role="listitem" data-rs-card data-index="${i}" data-rs-next-label="${nextCues[i]}">
            <div class="rs-studio-card-art rs-studio-scene-${i+1}" aria-hidden="true"><svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid meet" focusable="false"><circle cx="400" cy="300" r="224" stroke-dasharray="5 12"/><circle cx="400" cy="300" r="156"/><ellipse cx="400" cy="300" rx="300" ry="140" transform="rotate(-21 400 300)"/><path d="M92 300H708M400 28V572"/><circle cx="178" cy="300" r="10"/><circle cx="624" cy="300" r="10"/><circle cx="400" cy="77" r="10"/><circle cx="400" cy="524" r="10"/><g class="rs-scene-signature">${sceneSignatures[i]}</g><g class="rs-scene-glyph" transform="translate(296 196) scale(8.67)" stroke-linecap="round" stroke-linejoin="round">${iconPaths[i]}</g></svg><span class="rs-studio-core"></span></div>
            <div class="rs-spiral-card-kicker"><span>RESPONDO / ${number}</span><i aria-hidden="true"></i></div>
            <div class="rs-spiral-metric${symbolicMetrics.has(i)?' rs-has-svg-metric':''}">${metricMarkup(metric,i)}</div>
            <h2>${title}</h2><p>${copy}</p>
          </article>`).join('')}
        </div>
        <div class="rs-axis" aria-hidden="true">
          <span class="rs-axis-halo"></span>
          <svg viewBox="0 0 256 256" width="256" height="256" focusable="false"><path d="${arrow}" fill="white"/></svg>
          <span class="rs-axis-caption">RESPONDO AI</span>
        </div>
      </div>
      <div class="rs-spiral-bottom rs-chat-first-bottom">
        <div class="rs-scroll-invite" aria-hidden="true"><span class="rs-scroll-rule"></span><span class="rs-scroll-static">${t('SELAA ALAS','SKROLLA NED','SCROLL TO EXPLORE')}</span><span class="rs-next-caption">${t('SEURAAVAKSI','NÄSTA','UP NEXT')} <span class="rs-next-label" data-rs-next>${nextCues[0]}</span></span></div>
        <div class="rs-step-count" aria-hidden="true"><span data-rs-step>01</span><span class="rs-step-line"></span><span>${String(cards.length).padStart(2,'0')}</span></div>
      </div>
      <span class="rs-visually-hidden" aria-live="polite" aria-atomic="true" data-rs-announcement></span>
    </div>
  </section>`;
}
