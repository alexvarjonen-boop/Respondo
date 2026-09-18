const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[m]);

let cfg = {
  brand: 'RESPONDO AI',
  supportEmail: 'respondoai.fi@outlook.com',
  businessId: '3599437-5',
  sellerName: 'RESPONDO AI',
  trialDays: 3,
  monthlyNet: 49,
  yearlyNet: 549,
};

async function api(url, options = {}) {
  options.headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

async function config() {
  try {
    cfg = { ...cfg, ...(await api('/api/public/config')) };
  } catch {}
  return cfg;
}

function logo() {
  return `<a class="logo" href="/" aria-label="RESPONDO AI etusivu">
    <span class="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 64 64" focusable="false" aria-hidden="true">
        <rect width="64" height="64" rx="18" fill="#111114"/>
        <path d="M19 17h17c8 0 13 4 13 11 0 5-3 9-8 10l10 10H39L30 39h-1v9H19V17zm10 8v7h7c2 0 3-1 3-3s-1-4-4-4h-6z" fill="#fff"/>
      </svg>
    </span>
    <span class="brand-word">RESPONDO AI</span>
  </a>`;
}


function currentLang() {
  try { localStorage.removeItem('respondo-lang'); } catch {}
  return 'fi';
}

function languageSwitch() {
  return '';
}

const EN_TEXT = new Map(Object.entries({
  'Tuote':'Product',
  'Tietopohja':'Knowledge base',
  'Kokeile bottia':'Test the bot',
  'Hinta':'Pricing',
  'Tietoturva':'Security',
  'Kirjaudu':'Log in',
  'Kokeile ilmaiseksi':'Try for free',
  'Näin se toimii':'How it works',
  'Mitä saat':'Features',
  'Miksi nopeus ratkaisee':'Research',
  'Laske itse':'Calculator',
  'Hinnat':'Pricing',
  'Ota yhteyttä':'Contact',
  'ASIAKASPALVELU, JOKA ON AINA PAIKALLA':'AI CUSTOMER SERVICE FOR YOUR BUSINESS',
  'Asiakas kysyy.':'Customer asks.',
  'RESPONDO vastaa.':'RESPONDO answers.',
  'Lisää yrityksesi tiedot kerran. RESPONDO vastaa asiakkaillesi ympäri vuorokauden ja ohjaa kysymyksen sinulle silloin, kun varmaa vastausta ei löydy.':'Add your company information once. RESPONDO answers your customers around the clock and hands the question to you whenever it cannot find a reliable answer.',
  'Kokeile 3 päivää ilmaiseksi':'Try free for 3 days',
  'Tutustu tuotteeseen':'Explore the product',
  '3 päivää ilmaiseksi':'3 days free',
  'Peruuta milloin tahansa':'Cancel anytime',
  '49 €/kk + alv':'€49/month + VAT',
  'TIETOPOHJA':'KNOWLEDGE BASE',
  'VASTAUKSET':'ANSWERS',
  'EPÄVARMUUS':'UNCERTAINTY',
  'Lisää tiedot kerran.':'Add the information once.',
  'RESPONDO hoitaa toistuvat kysymykset.':'RESPONDO handles the repetitive questions.',
  'Lisää hinnat, palvelut, aukioloajat ja omat vastaukset. Botti käyttää niitä asiakkaiden kysymyksiin vastaamiseen.':'Add prices, services, opening hours and your own answers. The bot uses them to answer customer questions.',
  'Lisää yrityksesi tieto':'Add your company information',
  'Hinnat, palvelut, aukioloajat ja omat kysymys–vastausparit.':'Prices, services, opening hours and your own Q&A pairs.',
  'Asiakas kysyy':'Customer asks',
  'Luonnollisesti. Omilla sanoillaan.':'Naturally. In their own words.',
  'Asiakas saa vastauksen':'The customer gets an answer',
  'Jos varmaa tietoa ei löydy, kysymys ohjataan sinulle eikä vastausta keksitä.':'If reliable information is not found, the question is handed to you instead of inventing an answer.',
  'Vähemmän säätöä.':'Less hassle.',
  'Enemmän vastauksia.':'More answers.',
  'RESPONDO AI yhdistää tietopohjan, keskustelut ja jatkuvasti paranevan asiakaspalvelun yhteen näkymään.':'RESPONDO AI brings your knowledge base, conversations and continuously improving customer service into one view.',
  'Kaikki olennainen yhdessä paikassa.':'Everything important in one place.',
  'Hinnat, aukioloajat, palvelut ja omat kysymys–vastausparit pysyvät hallinnassa.':'Keep prices, opening hours, services and your own Q&A pairs under control.',
  'KESKUSTELUT':'CONVERSATIONS',
  'Näet, mitä asiakkaat oikeasti kysyvät.':'See what customers actually ask.',
  'KEHITYS':'IMPROVEMENT',
  'Kun vastaan tulee uusi kysymys, lisäät vastauksen kerran.':'When a new question comes up, add the answer once.',
  'Sinun tietosi.':'Your information.',
  'Asiakkaalle oikea vastaus.':'The right answer for the customer.',
  'Sinä päätät, mitä yrityksestäsi kerrotaan. Muutokset päivittyvät botille yhdestä paikasta.':'You decide what is said about your company. Changes update the bot from one place.',
  'Helppo ylläpitää':'Easy to maintain',
  'Muuta tietoa yhdestä paikasta.':'Update information in one place.',
  'Ei arvailua':'No guessing',
  'Puuttuva tieto ei muutu keksityksi vastaukseksi.':'Missing information never becomes an invented answer.',
  'Helppo asentaa':'Easy to install',
  'Yksi asennusrivi verkkosivulle.':'One installation line for your website.',
  '4 HYVÄKSYTTYÄ TIETOA':'4 APPROVED ITEMS',
  'AJAN TASALLA':'UP TO DATE',
  'Hyväksytty tietopohja':'Approved knowledge base',
  'Hinnoittelu':'Pricing',
  'Peruspaketti alkaa 49 €/kk + alv':'Base plan starts at €49/month + VAT',
  'Aukioloajat':'Opening hours',
  'Toimialue':'Service area',
  'Suomi':'Finland',
  'Poikkeustilanteet':'Exceptions',
  'Ohjaa yhteydenottoon':'Direct to contact',
  'Viimeksi päivitetty':'Last updated',
  'juuri nyt':'just now',
  'VASTAA':'ANSWERS',
  'asiakkaillesi':'your customers',
  'PERUSTUU':'HALLINTA',
  'sinun hallinnassa':'you are in control',
  'aina':'always',
  'ALKAEN':'FROM',
  '49 € / kk':'€49 / month',
  '+ alv':'+ VAT',
  'KOKEILU':'TRIAL',
  '3 päivää':'3 days',
  'maksutta':'free',
  'Asiakas ei halua odottaa.':'Customers do not want to wait.',
  'Nopea vastaus näkyy kokemuksessa.':'Fast replies improve the experience.',
  'Alla olevat luvut perustuvat julkaistuihin tutkimuksiin ja raportteihin. Lähde, vuosi ja tutkimuskonteksti näkyvät jokaisen luvun yhteydessä.':'The figures below are based on published research and reports. The source, year and research context are shown with each figure.',
  'ei vastannut verkkoliidiin lainkaan':'did not respond to an online lead at all',
  'vastasi ensimmäisen tunnin aikana':'responded within the first hour',
  'odottaa välitöntä vuorovaikutusta':'expect immediate interaction',
  'odottaa asiakaspalvelua 24/7':'expect customer service 24/7',
  'pitää nopeutta ja oikeaa ratkaisua ostopäätökseen vaikuttavana':'say speed and the right solution influence purchase decisions',
  'HUOM':'NOTE',
  'Mitä yksi menetetty yhteydenotto voi maksaa?':'Value calculator',
  'Mitä vastaamatta jäänyt':'What could an unanswered',
  'yhteydenotto voi maksaa?':'customer inquiry cost?',
  'Säädä työn arvo ja päivässä vastaamatta jäävien yhteydenottojen määrä. Laske itse näyttää niiden potentiaalisen myyntiarvon.':'Adjust the job value and the number of unanswered inquiries per day. The calculator shows their potential sales value.',
  'KESKIMÄÄRÄINEN KAUPPA':'JOB VALUE',
  'Paljonko yksi asiakas tuo keskimäärin?':'Average value of one job',
  'ILMAN VASTAUSTA / PÄIVÄ':'UNANSWERED / DAY',
  'Montako yhteydenottoa jää ilman vastausta?':'Unanswered inquiries',
  'MAHDOLLINEN ARVO / 30 PÄIVÄÄ':'POTENTIAL VALUE / 30 DAYS',
  'Päivässä':'Per day',
  'Vuodessa':'Per year',
  'Selkeä hinta.':'Simple pricing.',
  'Ei yllätyksiä.':'No surprises.',
  'Kokeile 3 päivää ilmaiseksi. Peruuta ennen kokeilun päättymistä, jos et halua jatkaa.':'Try free for 3 days. Cancel before the trial ends if you do not want to continue.',
  'maksa kuukausittain':'flexible',
  'Kuukausi':'Monthly',
  'Chat suoraan omalle verkkosivullesi':'Website chat widget',
  'Vastaukset yrityksesi omista tiedoista':'Your company knowledge base',
  'Näet, mitä asiakkaat kysyvät':'Conversation analytics',
  'Puuttuvat vastaukset ohjataan sinulle':'Fallback for uncertain questions',
  'Hallitse tilausta turvallisesti Stripessä':'Subscription management in Stripe',
  'säästä 39 €':'save €39',
  'Vuosi':'Yearly',
  'Kaikki samat ominaisuudet kuin kuukausitilauksessa':'Same features as the monthly plan',
  'Maksu kerran vuodessa':'One annual payment',
  '3 päivää ilmaiseksi':'3-day free trial',
  'Voit käyttää palvelua maksetun kauden loppuun':'Access continues until the end of the paid period',
  'Valitse vuosi':'Choose yearly plan',
  'Anna asiakkaillesi vastaus myös silloin, kun et itse ehdi.':'Give customers an answer even when you are busy.',
  'Kokeile 3 päivää ilmaiseksi. Lisää tiedot, testaa bottia ja asenna se sivullesi.':'Try free for 3 days. Add your information, test the bot and install it on your website.',
  'KOKEILE':'TRY FREE',
  'Kysy lisää.':'Questions?',
  'Vastaamme.':'We answer.',
  'Asiakaspalvelubotti, joka vastaa asiakkaillesi yrityksesi omilla tiedoilla.':'A customer-service bot that answers using your company information.',
  'Yritys':'Company',
  'Lakiasiat':'Legal',
  'Kokeile ilmaiseksi':'Start trial',
  'Käyttöehdot':'Terms',
  'Tietosuojaseloste':'Privacy policy',
  'Evästeet':'Cookies',
  'Tietojenkäsittely':'Data processing',
  'B2B-ohjelmistopalvelu':'B2B software service',
  'ALOITA KOKEILU':'GET STARTED WITH RESPONDO AI',
  'Kokeile ensin.':'Try it first.',
  'Päätä sitten.':'Decide later.',
  'Luo tili ja lisää maksutapa Stripessä. Sinulta ei veloiteta mitään 3 päivän kokeilun aikana.':'Create an account and add a payment method securely in Stripe. Billing starts only after the trial.',
  'Luo tili':'Create account',
  'Täytä omat ja yrityksesi perustiedot.':'Company basics and password.',
  'Lisää maksutapa Stripessä':'Add payment method',
  'Korttitietosi menevät suoraan Stripelle.':'Stripe handles payment details.',
  'Lisää yrityksesi tiedot':'Build your knowledge base',
  'Kerro Respondolle, mitä asiakkaillesi saa vastata.':'Add your company-approved answers.',
  'PALVELUNTARJOAJA':'SERVICE PROVIDER',
  'LUO TILI':'NEW ACCOUNT',
  'Nimi':'Name',
  'Sähköposti':'Email',
  'Y-tunnus':'Business ID',
  'Salasana':'Password',
  'Vähintään 10 merkkiä':'At least 10 characters',
  'Tilaus':'Plan',
  'tai sähköpostilla':'or with email',
  'Jatka Googlella':'Continue with Google',
  'Hallintapaneeli':'Dashboard',
  'Tervetuloa':'Welcome',
  'takaisin.':'back.',
  'Täältä löydät yrityksesi tiedot, keskustelut, asennuksen ja tilauksen.':'Manage your knowledge base, installation and subscription in one place.',
  'Vain sinä pääset yrityksesi hallintaan':'Dashboard protected by login',
  'KIRJAUDU':'LOG IN',
  'Tervetuloa takaisin':'Welcome back',
  'Kirjaudu Googlella':'Log in with Google',
  'Kirjaudu sisään':'Open dashboard'
}));

const EN_PLACEHOLDERS = new Map(Object.entries({
  'Etunimi Sukunimi':'First name Last name',
  'sinä@yritys.fi':'you@company.com',
  'Yrityksen nimi':'Company name',
  'Vähintään 10 merkkiä':'At least 10 characters'
}));

function applyLanguage() {
  document.documentElement.lang = 'fi';
  return;

  document.title = 'RESPONDO AI | AI Customer Service Chatbot for Businesses 24/7';

  const root = document.getElementById('app');
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const parent = node.parentElement;
    if (!parent || ['SCRIPT','STYLE','CODE','PRE','TEXTAREA'].includes(parent.tagName)) continue;
    const raw = node.nodeValue || '';
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (EN_TEXT.has(trimmed)) {
      node.nodeValue = raw.replace(trimmed, EN_TEXT.get(trimmed));
    } else {
      node.nodeValue = raw
        .replace(/Y-tunnus/g, 'Business ID')
        .replace(/kuukausi/g, 'month')
        .replace(/vuosi/g, 'year');
    }
  }

  root.querySelectorAll('input[placeholder], textarea[placeholder]').forEach((el) => {
    const p = el.getAttribute('placeholder') || '';
    if (EN_PLACEHOLDERS.has(p)) el.setAttribute('placeholder', EN_PLACEHOLDERS.get(p));
  });
}

function bindLanguageSwitch() {
  try { localStorage.removeItem('respondo-lang'); } catch {}
}


function nav() {
  return `<header class="nav">
    <div class="container navin">
      ${logo()}
      <nav class="navlinks" aria-label="Päänavigaatio">
        <a href="/#how">Tuote</a>
        <a href="/#control">Tietopohja</a>
        <a href="/assistant">Kokeile bottia</a>
        <a href="/#pricing">Hinta</a>
        <a href="/tietoturva">Tietoturva</a>
      </nav>
      <div class="navactions">
        ${languageSwitch()}
        <a class="btn ghost" href="/kirjaudu">Kirjaudu</a>
        <a class="btn ink" href="/tilaus">Kokeile ilmaiseksi</a>
      </div>
    </div>
  </header>`;
}


function socialAuthButtons(flow = 'signup') {
  const label = flow === 'login' ? 'Kirjaudu' : 'Jatka';
  return `<div class="social-auth">
    <a class="social-auth-btn" href="/api/auth/oauth/google/start?flow=${flow}" aria-label="${label} Googlella">
      <span class="social-auth-icon google-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22" role="img" aria-label="Google">
          <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.91h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.4Z"/>
          <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.64-2.43l-3.24-2.54c-.9.6-2.05.96-3.4.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"/>
          <path fill="#FBBC05" d="M6.39 13.86A6.02 6.02 0 0 1 6.08 12c0-.65.11-1.28.31-1.86V7.52H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.48l3.35-2.62Z"/>
          <path fill="#EA4335" d="M12 6.01c1.47 0 2.78.5 3.82 1.49l2.88-2.88A9.65 9.65 0 0 0 12 2a10 10 0 0 0-8.96 5.52l3.35 2.62C7.18 7.77 9.39 6.01 12 6.01Z"/>
        </svg>
      </span>
      <span>${label} Googlella</span>
    </a>
    <div class="auth-divider"><span>tai sähköpostilla</span></div>
  </div>`;
}

function oauthErrorMessage() {
  const p = new URLSearchParams(location.search);
  const code = p.get('oauth_error');
  const provider = 'Google';
  if (!code) return '';
  const messages = {
    not_configured: 'Google-kirjautuminen ei ole vielä käytettävissä. Voit jatkaa sähköpostilla.',
    state: 'Kirjautumisistunto vanheni. Yritä uudelleen.',
    failed: `${provider}-kirjautuminen epäonnistui. Yritä uudelleen.`,
    no_account: 'Tällä tilillä ei ole vielä RESPONDO AI -käyttäjää. Luo tili ensin.',
    pending: 'Tili on luotu, mutta tilaus pitää vielä viimeistellä.',
  };
  return messages[code] || 'Kirjautuminen epäonnistui. Yritä uudelleen.';
}
function stickyProductNav() {
  return `<div class="product-subnav" aria-label="Sivun osiot">
    <div class="container product-subnav-inner">
      <span class="subnav-title">RESPONDO AI</span>
      <nav>
        <a href="#how">Näin se toimii</a>
        <a href="#features">Mitä saat</a>
        <a href="#research">Miksi nopeus ratkaisee</a>
        <a href="#calculator">Laske itse</a>
        <a href="#pricing">Hinnat</a>
        <a href="#contact">Ota yhteyttä</a>
      </nav>
      <a class="subnav-cta" href="/tilaus">Kokeile ilmaiseksi</a>
    </div>
  </div>`;
}

function premiumVisualSection() {
  return `<section class="section visual-showcase" id="features">
    <div class="container">
      <div class="section-kicker">Mitä saat</div>
      <div class="split-head">
        <h2>Vähemmän säätöä.<br><em>Enemmän vastauksia.</em></h2>
        <p>RESPONDO AI yhdistää tietopohjan, keskustelut ja jatkuvasti paranevan asiakaspalvelun yhteen näkymään.</p>
      </div>

      <div class="visual-grid">
        <article class="visual-card visual-card-large">
          <div class="visual-copy">
            <small>TIETOPOHJA</small>
            <h3>Kaikki olennainen yhdessä paikassa.</h3>
            <p>Hinnat, aukioloajat, palvelut ja omat kysymys–vastausparit pysyvät hallinnassa.</p>
          </div>
          <figure class="visual-frame knowledge-visual" aria-label="Tietopohjan esimerkkikuva">
            <svg viewBox="0 0 760 500" role="img" aria-hidden="true">
              <defs>
                <linearGradient id="softBg" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stop-color="#ffffff"/>
                  <stop offset="100%" stop-color="#ececee"/>
                </linearGradient>
                <filter id="shadowA"><feDropShadow dx="0" dy="18" stdDeviation="22" flood-opacity=".12"/></filter>
              </defs>
              <rect width="760" height="500" rx="40" fill="url(#softBg)"/>
              <rect x="54" y="52" width="652" height="396" rx="28" fill="#fff" stroke="#d9d9dc" filter="url(#shadowA)"/>
              <rect x="84" y="88" width="138" height="18" rx="9" fill="#1d1d1f"/>
              <rect x="84" y="124" width="250" height="10" rx="5" fill="#c8c8cc"/>
              <g fill="#f5f5f7" stroke="#e4e4e7">
                <rect x="84" y="170" width="592" height="66" rx="16"/>
                <rect x="84" y="250" width="592" height="66" rx="16"/>
                <rect x="84" y="330" width="592" height="66" rx="16"/>
              </g>
              <g fill="#1d1d1f">
                <rect x="108" y="193" width="92" height="10" rx="5"/>
                <rect x="108" y="273" width="120" height="10" rx="5"/>
                <rect x="108" y="353" width="84" height="10" rx="5"/>
              </g>
              <g fill="#b9b9bd">
                <rect x="226" y="193" width="265" height="10" rx="5"/>
                <rect x="254" y="273" width="300" height="10" rx="5"/>
                <rect x="218" y="353" width="238" height="10" rx="5"/>
              </g>
              <g fill="#1d1d1f">
                <circle cx="638" cy="203" r="14"/>
                <circle cx="638" cy="283" r="14"/>
                <circle cx="638" cy="363" r="14"/>
              </g>
              <g stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none">
                <path d="M631 203l5 5 9-11"/>
                <path d="M631 283l5 5 9-11"/>
                <path d="M631 363l5 5 9-11"/>
              </g>
            </svg>
          </figure>
        </article>

        <article class="visual-card">
          <div class="visual-copy">
            <small>KESKUSTELUT</small>
            <h3>Näet, mitä asiakkaat oikeasti kysyvät.</h3>
          </div>
          <figure class="visual-frame chat-visual" aria-label="Keskustelun esimerkkikuva">
            <svg viewBox="0 0 560 420" role="img" aria-hidden="true">
              <rect width="560" height="420" rx="34" fill="#f2f2f4"/>
              <rect x="48" y="48" width="464" height="324" rx="28" fill="#fff" stroke="#dddddf"/>
              <circle cx="88" cy="88" r="16" fill="#1d1d1f"/>
              <rect x="116" y="78" width="102" height="9" rx="5" fill="#1d1d1f"/>
              <rect x="116" y="96" width="72" height="7" rx="4" fill="#c1c1c5"/>
              <rect x="172" y="148" width="300" height="54" rx="18" fill="#1d1d1f"/>
              <rect x="194" y="169" width="214" height="10" rx="5" fill="#fff" opacity=".92"/>
              <rect x="84" y="228" width="326" height="82" rx="20" fill="#f2f2f4"/>
              <rect x="108" y="252" width="212" height="9" rx="5" fill="#5f5f64"/>
              <rect x="108" y="272" width="254" height="9" rx="5" fill="#b0b0b5"/>
              <circle cx="474" cy="334" r="15" fill="#1d1d1f"/>
            </svg>
          </figure>
        </article>

        <article class="visual-card">
          <div class="visual-copy">
            <small>KEHITYS</small>
            <h3>Kun vastaan tulee uusi kysymys, lisäät vastauksen kerran.</h3>
          </div>
          <figure class="visual-frame analytics-visual" aria-label="Analytiikan esimerkkikuva">
            <svg viewBox="0 0 560 420" role="img" aria-hidden="true">
              <rect width="560" height="420" rx="34" fill="#eeeeef"/>
              <rect x="50" y="54" width="460" height="312" rx="26" fill="#fff" stroke="#d9d9dc"/>
              <rect x="82" y="88" width="126" height="12" rx="6" fill="#1d1d1f"/>
              <rect x="82" y="118" width="72" height="8" rx="4" fill="#c4c4c7"/>
              <g transform="translate(84 164)">
                <rect x="0" y="92" width="42" height="48" rx="10" fill="#d3d3d6"/>
                <rect x="62" y="68" width="42" height="72" rx="10" fill="#bcbcc1"/>
                <rect x="124" y="42" width="42" height="98" rx="10" fill="#9d9da2"/>
                <rect x="186" y="16" width="42" height="124" rx="10" fill="#747479"/>
                <rect x="248" y="0" width="42" height="140" rx="10" fill="#1d1d1f"/>
              </g>
              <rect x="390" y="174" width="84" height="34" rx="17" fill="#1d1d1f"/>
              <rect x="410" y="187" width="44" height="8" rx="4" fill="#fff"/>
            </svg>
          </figure>
        </article>
      </div>
    </div>
  </section>`;
}

function contactSection() {
  return `<section class="section contact-section" id="contact">
    <div class="container">
      <div class="contact-shell">
        <div>
          <div class="section-kicker">Ota yhteyttä</div>
          <h2>Jäikö jotain mieleen?<br><em>Laita meille viestiä.</em></h2>
        </div>
        <div class="contact-actions">
          <a href="mailto:${esc(cfg.supportEmail)}" class="contact-mail">${esc(cfg.supportEmail)}</a>
          <p>RESPONDO AI · Y-tunnus ${esc(cfg.businessId || '3599437-5')} · Suomi</p>
          <a class="btn ink" href="/tilaus">Kokeile 3 päivää ilmaiseksi</a>
        </div>
      </div>
    </div>
  </section>`;
}

function footer() {
  return `<footer class="footer">
    <div class="container">
      <div class="foot-top">
        <div class="foot-brand">
          ${logo()}
          <p>Asiakaspalvelubotti, joka vastaa asiakkaillesi yrityksesi omilla tiedoilla.</p>
          <div class="seller-chip">RESPONDO AI · Y-tunnus ${esc(cfg.businessId || '3599437-5')}</div>
        </div>
        <div class="foot-col">
          <h4>Tuote</h4>
          <a href="/#how">Tuote</a>
          <a href="/#control">Tietopohja</a>
          <a href="/#pricing">Hinta</a>
          <a href="/tilaus">Kokeile ilmaiseksi</a>
        </div>
        <div class="foot-col">
          <h4>Yritys</h4>
          <a href="/tietoturva">Tietoturva</a>
          <a href="mailto:${esc(cfg.supportEmail)}">${esc(cfg.supportEmail)}</a>
          <span>Suomi</span>
        </div>
        <div class="foot-col">
          <h4>Lakiasiat</h4>
          <a href="/kayttoehdot">Käyttöehdot</a>
          <a href="/tietosuoja">Tietosuojaseloste</a>
          <a href="/evasteet">Evästeet</a>
          <a href="/dpa">Tietojenkäsittely</a>
        </div>
      </div>
      <div class="legalbar">
        <span>© ${new Date().getFullYear()} RESPONDO AI</span>
        <span>Y-tunnus ${esc(cfg.businessId || '3599437-5')} · B2B-ohjelmistopalvelu</span>
      </div>
    </div>
  </footer>`;
}

function heroVisual() {
  return `<div class="signal-console" aria-label="RESPONDO AI käyttöliittymäesimerkki">
    <div class="console-top">
      <div class="console-brand"><span class="pulse"></span> RESPONDO AI / PÄÄLLÄ</div>
      <div class="console-time">24/7</div>
    </div>
    <div class="console-grid">
      <aside class="console-rail">
        <span class="rail-label">HALLINTA</span>
        <div class="rail-item active"><i></i> Vastaukset</div>
        <div class="rail-item"><i></i> Tietopohja</div>
        <div class="rail-item"><i></i> Epävarmat</div>
        <div class="rail-item"><i></i> Asennus</div>
        <div class="rail-spacer"></div>
        <div class="rail-health"><span></span> Järjestelmä aktiivinen</div>
      </aside>
      <div class="console-main">
        <div class="console-header">
          <div>
            <small>ASIAKASPALVELU</small>
            <h3>Vastaa vain tiedolla, jonka olet itse antanut.</h3>
          </div>
          <span class="verified">✓ tieto löytyi</span>
        </div>
        <div class="conversation">
          <div class="msg customer">
            <div class="msg-meta">ASIAKAS · 22:43</div>
            Paljonko huolto maksaa ja palveletteko myös viikonloppuna?
          </div>
          <div class="answer-card">
            <div class="answer-head">
              <span class="mini-mark">R</span>
              <b>RESPONDO AI</b>
              <span class="confidence">Tieto löytyi</span>
            </div>
            <p>Perushuolto alkaa 89 eurosta. Lauantaisin palvelemme klo 10–14.</p>
            <div class="source-line"><span>01</span> Hinnasto / Aukioloajat</div>
          </div>
          <div class="msg customer muted-msg">
            <div class="msg-meta">ASIAKAS · 22:44</div>
            Voitteko luvata valmistumisen huomiseksi?
          </div>
          <div class="handoff-card">
            <span class="handoff-icon">↳</span>
            <div><b>Tähän ei löydy varmaa vastausta.</b><small>Respondo ei keksi vastausta, vaan ohjaa asiakkaan sinulle.</small></div>
          </div>
        </div>
        <div class="console-stats">
          <div><b>24/7</b><span>verkossa</span></div>
          <div><b>0</b><span>arvattua vastausta</span></div>
          <div><b>1</b><span>oma tietopohja</span></div>
        </div>
      </div>
    </div>
  </div>`;
}

function workflow() {
  return `<section class="section workflow" id="how">
    <div class="container">
      <div class="section-kicker">Tuote</div>
      <div class="split-head">
        <h2>Lisää tiedot kerran.<br><em>RESPONDO hoitaa toistuvat kysymykset.</em></h2>
        <p>Lisää hinnat, palvelut, aukioloajat ja omat vastaukset. Botti käyttää niitä asiakkaiden kysymyksiin vastaamiseen.</p>
      </div>
      <div class="flowline">
        <article class="flowstep">
          <div class="flow-num">01</div>
          <div class="flow-glyph">＋</div>
          <h3>Lisää yrityksesi tieto</h3>
          <p>Hinnat, palvelut, aukioloajat ja omat kysymys–vastausparit.</p>
        </article>
        <article class="flowstep">
          <div class="flow-num">02</div>
          <div class="flow-glyph">⌁</div>
          <h3>Asiakas kysyy</h3>
          <p>Luonnollisesti. Omilla sanoillaan.</p>
        </article>
        <article class="flowstep">
          <div class="flow-num">03</div>
          <div class="flow-glyph">↳</div>
          <h3>Asiakas saa vastauksen</h3>
          <p>Jos varmaa tietoa ei löydy, kysymys ohjataan sinulle eikä vastausta keksitä.</p>
        </article>
      </div>
    </div>
  </section>`;
}

function controlSection() {
  return `<section class="section control" id="control">
    <div class="container control-grid">
      <div class="control-copy">
        <div class="section-kicker light">Tietopohja</div>
        <h2>Sinun tietosi.<br><em>Asiakkaalle oikea vastaus.</em></h2>
        <p>Sinä päätät, mitä yrityksestäsi kerrotaan. Muutokset päivittyvät botille yhdestä paikasta.</p>
        <div class="control-list">
          <div><span>01</span><b>Helppo ylläpitää</b><small>Muuta tietoa yhdestä paikasta.</small></div>
          <div><span>02</span><b>Ei arvailua</b><small>Puuttuva tieto ei muutu keksityksi vastaukseksi.</small></div>
          <div><span>03</span><b>Helppo asentaa</b><small>Yksi asennusrivi verkkosivulle.</small></div>
        </div>
      </div>
      <div class="truth-card">
        <div class="truth-top"><span>4 HYVÄKSYTTYÄ TIETOA</span><span class="truth-status">AJAN TASALLA</span></div>
        <div class="truth-title">Hyväksytty tietopohja</div>
        <div class="knowledge-row"><span class="k-index">01</span><div><b>Hinnoittelu</b><small>Peruspaketti alkaa 49 €/kk + alv</small></div><i>✓</i></div>
        <div class="knowledge-row"><span class="k-index">02</span><div><b>Aukioloajat</b><small>Ma–Pe 08:00–17:00</small></div><i>✓</i></div>
        <div class="knowledge-row"><span class="k-index">03</span><div><b>Toimialue</b><small>Suomi</small></div><i>✓</i></div>
        <div class="knowledge-row"><span class="k-index">04</span><div><b>Poikkeustilanteet</b><small>Ohjaa yhteydenottoon</small></div><i>✓</i></div>
        <div class="truth-footer"><span>Viimeksi päivitetty</span><b>juuri nyt</b></div>
      </div>
    </div>
  </section>`;
}

function proofStrip() {
  return `<section class="proof-strip">
    <div class="container proof-grid">
      <div><span>VASTAA</span><b>24/7</b><small>asiakkaillesi</small></div>
      <div><span>PERUSTUU</span><b>sinun hallinnassa</b><small>aina</small></div>
      <div><span>ALKAEN</span><b>49 € / kk</b><small>+ alv</small></div>
      <div><span>KOKEILU</span><b>3 päivää</b><small>maksutta</small></div>
    </div>
  </section>`;
}

function researchStatsSection() {
  return `<section class="section research-stats" id="research">
    <div class="container">
      <div class="section-kicker">Miksi nopeus ratkaisee</div>
      <div class="split-head research-head">
        <h2>Asiakas ei halua odottaa.<br><em>Nopea vastaus näkyy kokemuksessa.</em></h2>
        <p>Alla olevat luvut perustuvat julkaistuihin tutkimuksiin ja raportteihin. Lähde, vuosi ja tutkimuskonteksti näkyvät jokaisen luvun yhteydessä.</p>
      </div>

      <div class="research-grid">
        <article class="research-stat research-stat-dark">
          <span class="research-number">23%</span>
          <h3>ei vastannut verkkoliidiin lainkaan</h3>
          <p>Harvard Business Review’n auditissa 2 241 yhdysvaltalaisesta yrityksestä lähes joka neljäs ei vastannut testiliidiin 30 päivän aikana.</p>
          <a href="https://hbr.org/2011/03/the-short-life-of-online-sales-leads" target="_blank" rel="noopener noreferrer">Harvard Business Review · 2011 <span>↗</span></a>
        </article>

        <article class="research-stat">
          <span class="research-number">37%</span>
          <h3>vastasi ensimmäisen tunnin aikana</h3>
          <p>Samassa HBR-auditissa vain 37 % yrityksistä reagoi verkkoliidiin tunnin sisällä. Erillisessä 1,25 miljoonan liidin analyysissä alle tunnissa yhteyttä ottaneet olivat lähes 7× todennäköisempiä kvalifioimaan liidin kuin myöhemmin vastanneet.</p>
          <a href="https://hbr.org/2011/03/the-short-life-of-online-sales-leads" target="_blank" rel="noopener noreferrer">Harvard Business Review · 2011 <span>↗</span></a>
        </article>

        <article class="research-stat">
          <span class="research-number">77%</span>
          <h3>odottaa välitöntä vuorovaikutusta</h3>
          <p>Salesforcen asiakastutkimuksen mukaan 77 % asiakkaista odottaa voivansa olla vuorovaikutuksessa yrityksen kanssa heti yhteydenottohetkellä.</p>
          <a href="https://www.salesforce.com/eu/service/digital-customer-engagement-platform/what-is-customer-engagement/" target="_blank" rel="noopener noreferrer">Salesforce · customer research <span>↗</span></a>
        </article>

        <article class="research-stat">
          <span class="research-number">74%</span>
          <h3>odottaa asiakaspalvelua 24/7</h3>
          <p>Zendesk CX Trends 2026 -tutkimuksessa 74 % kuluttajista sanoi AI:n nostaneen odotuksen siitä, että asiakaspalvelu on saatavilla vuorokauden ympäri.</p>
          <a href="https://cxtrends.zendesk.com/" target="_blank" rel="noopener noreferrer">Zendesk CX Trends · 2026 <span>↗</span></a>
        </article>

        <article class="research-stat research-stat-wide">
          <div>
            <span class="research-number">86%</span>
            <h3>pitää nopeutta ja oikeaa ratkaisua ostopäätökseen vaikuttavana</h3>
          </div>
          <div>
            <p>Zendesk raportoi yli 11 000 kuluttajan ja yritysjohtajan aineistosta 22 maassa, että 86 % kuluttajista sanoo palvelun reagointinopeuden ja oikean ratkaisun vaikuttavan vahvasti heidän ostohalukkuuteensa.</p>
            <a href="https://www.zendesk.com/newsroom/press-releases/contextual-intelligence-becomes-the-new-standard-for-exceptional-customer-experience-in-2026/" target="_blank" rel="noopener noreferrer">Zendesk · CX Trends 2026 <span>↗</span></a>
          </div>
        </article>
      </div>

      <div class="research-note">
        <span>HUOM</span>
        <p>HBR:n lead response -tutkimus on vuodelta 2011 ja tehtiin Yhdysvalloissa, joten sitä ei esitetä nykyisten suomalaisyritysten suorana keskiarvona. Se kertoo mitatusta yhteydestä vastausnopeuden ja liidin kvalifioinnin välillä.</p>
      </div>
    </div>
  </section>`;
}

function calculatorSection() {
  return `<section class="section value-calculator" id="calculator">
    <div class="container">
      <div class="section-kicker">Mitä yksi menetetty yhteydenotto voi maksaa?</div>
      <div class="split-head calculator-head">
        <h2>Paljonko rahaa voi jäädä pöydälle,<br><em>jos asiakkaalle ei vastata?</em></h2>
        <p>Säädä työn arvo ja päivässä vastaamatta jäävien yhteydenottojen määrä. Laske itse näyttää niiden potentiaalisen myyntiarvon.</p>
      </div>

      <div class="calculator-shell">
        <div class="calculator-controls">
          <div class="calc-control">
            <div class="calc-control-head">
              <div>
                <small>KESKIMÄÄRÄINEN KAUPPA</small>
                <b>Paljonko yksi asiakas tuo keskimäärin?</b>
              </div>
              <output id="jobValueOutput">500 €</output>
            </div>
            <input id="jobValueSlider" class="premium-range" type="range" min="0" max="10000" step="50" value="500" aria-label="Työn arvo euroina">
            <div class="range-labels"><span>0 €</span><span>10 000 €</span></div>
          </div>

          <div class="calc-control">
            <div class="calc-control-head">
              <div>
                <small>ILMAN VASTAUSTA / PÄIVÄ</small>
                <b>Montako yhteydenottoa jää ilman vastausta?</b>
              </div>
              <output id="missedOutput">3</output>
            </div>
            <input id="missedSlider" class="premium-range" type="range" min="0" max="100" step="1" value="3" aria-label="Vastaamattomat yhteydenotot päivässä">
            <div class="range-labels"><span>0</span><span>100</span></div>
          </div>
        </div>

        <div class="calculator-result">
          <small>MAHDOLLINEN ARVO / 30 PÄIVÄÄ</small>
          <div class="calc-main-value" id="monthlyValue">45 000 €</div>
          <div class="calc-result-grid">
            <div><span>Päivässä</span><b id="dailyValue">1 500 €</b></div>
            <div><span>Vuodessa</span><b id="yearlyValue">547 500 €</b></div>
            <div><span>RESPONDO AI</span><b>${cfg.monthlyNet || 49} € / kk + alv</b></div>
          </div>
          <p>Laskelma on suuntaa-antava. Se näyttää yhteydenottojen arvon tilanteessa, jossa jokainen niistä vastaisi yhtä keskimääräistä kauppaa. Todellinen tulos riippuu siitä, kuinka moni yhteydenotto muuttuu asiakkaaksi.</p>
        </div>
      </div>
    </div>
  </section>`;
}

function pricingSection() {
  return `<section class="section pricing-section" id="pricing">
    <div class="container">
      <div class="section-kicker">Hinta</div>
      <div class="split-head">
        <h2>Yksi selkeä hinta.<br><em>Tiedät mitä maksat.</em></h2>
        <p>Kokeile 3 päivää ilmaiseksi. Peruuta ennen kokeilun päättymistä, jos et halua jatkaa.</p>
      </div>
      <div class="pricing-wrap">
        <article class="price-card">
          <div class="price-top"><span>KUUKAUSITILAUS</span><span>maksa kuukausittain</span></div>
          <h3>Kuukausi</h3>
          <div class="pricevalue">49 €<small>/kk + alv</small></div>
          <div class="price-rule"></div>
          <ul>
            <li>Chat suoraan omalle verkkosivullesi</li>
            <li>Vastaukset yrityksesi omista tiedoista</li>
            <li>Näet, mitä asiakkaat kysyvät</li>
            <li>Puuttuvat vastaukset ohjataan sinulle</li>
            <li>Hallitse tilausta turvallisesti Stripessä</li>
          </ul>
          <a class="btn price-btn" href="/tilaus?plan=monthly">Kokeile 3 päivää ilmaiseksi</a>
        </article>
        <article class="price-card featured">
          <div class="price-top"><span>VUOSITILAUS</span><span class="save">säästä 39 €</span></div>
          <h3>Vuosi</h3>
          <div class="pricevalue">549 €<small>/vuosi + alv</small></div>
          <div class="price-rule"></div>
          <ul>
            <li>Kaikki samat ominaisuudet kuin kuukausitilauksessa</li>
            <li>Maksu kerran vuodessa</li>
            <li>3 päivää ilmaiseksi</li>
            <li>Peruuta milloin tahansa</li>
            <li>Voit käyttää palvelua maksetun kauden loppuun</li>
          </ul>
          <a class="btn price-btn blue" href="/tilaus?plan=yearly">Valitse vuosi <span>→</span></a>
        </article>
      </div>
    </div>
  </section>`;
}


function cinematicConversationScene() {
  return `<section class="cinema-conversation" aria-label="RESPONDO keskusteluesimerkki">
    <div class="cinema-stage">
      <div class="cinema-orbit orbit-a"></div>
      <div class="cinema-orbit orbit-b"></div>
      <div class="cinema-kicker">01 / ASIAKAS KYSYY</div>
      <div class="cinema-word">KYSYMYS</div>
      <div class="cinema-phone" aria-hidden="true">
        <div class="cinema-phone-top"><span></span><b>RESPONDO</b><i>24/7</i></div>
        <div class="cinema-chat">
          <div class="cinema-bubble customer">Paljonko huoltokäynti maksaa?</div>
          <div class="cinema-typing"><i></i><i></i><i></i></div>
          <div class="cinema-bubble bot">Perushuolto alkaa 89 eurosta. Haluatko myös vapaat ajat?</div>
          <div class="cinema-status"><span></span> vastaus löytyi yrityksen tiedoista</div>
        </div>
      </div>
      <div class="cinema-float float-a"><small>ASIAKAS</small><b>22:48</b><span>kysymys tuli juuri</span></div>
      <div class="cinema-float float-b"><small>VASTAUS</small><b>&lt; 1 s</b><span>vastaus heti</span></div>
      <div class="cinema-float float-c"><small>TIETO</small><b>✓</b><span>tieto löytyy</span></div>
      <a class="cinema-next" href="#how">vieritä alas <span>↓</span></a>
    </div>
  </section>`;
}

function horizontalProductStory() {
  return `<section class="story-horizontal" id="how">
    <div class="story-sticky">
      <div class="story-progress"><i></i></div>
      <div class="story-counter"><span id="storyCurrent">01</span><b>/ 03</b></div>
      <div class="story-track">
        <article class="story-panel story-panel-one">
          <div class="story-panel-copy">
            <small>01 / LISÄÄ YRITYKSESI TIEDOT</small>
            <h2>Kerro, mitä<br><em>asiakkaalle saa vastata.</em></h2>
          </div>
          <div class="story-visual knowledge-machine" aria-hidden="true">
            <div class="km-back"></div>
            <div class="km-window">
              <div class="km-bar"><span></span><span></span><span></span><b>TIETOPOHJA</b></div>
              <div class="km-row"><i>01</i><div><small>HINNAT</small><b>Huolto alkaen 89 €</b></div><span>✓</span></div>
              <div class="km-row"><i>02</i><div><small>AUKIOLO</small><b>Ma–Pe 08–17</b></div><span>✓</span></div>
              <div class="km-row"><i>03</i><div><small>TOIMIALUE</small><b>Pirkanmaa</b></div><span>✓</span></div>
            </div>
            <div class="km-chip chip-1">HINTA</div>
            <div class="km-chip chip-2">PALVELUT</div>
            <div class="km-chip chip-3">AUKIOLO</div>
          </div>
        </article>

        <article class="story-panel story-panel-two">
          <div class="story-panel-copy">
            <small>02 / ASIAKAS KYSYY OMILLA SANOILLAAN</small>
            <h2>Niin kuin ihmiset<br><em>oikeasti kysyvät.</em></h2>
          </div>
          <div class="story-visual message-space" aria-hidden="true">
            <div class="msg-orb"></div>
            <div class="msg-card m1">Onks teillä vapaita aikoja huomiselle?</div>
            <div class="msg-card m2">Mitä tää maksaa?</div>
            <div class="msg-card m3">Tuletteko Nokialle asti?</div>
            <div class="msg-card m4">Saako tän viikonloppuna?</div>
            <div class="msg-core"><span>R</span><small>ymmärtää, mitä asiakas tarkoittaa</small></div>
          </div>
        </article>

        <article class="story-panel story-panel-three">
          <div class="story-panel-copy">
            <small>03 / RESPONDO HOITAA LOPUT</small>
            <h2>Vastaa heti.<br><em>Ei koskaan hatusta.</em></h2>
          </div>
          <div class="story-visual answer-machine" aria-hidden="true">
            <div class="am-ring r1"></div><div class="am-ring r2"></div>
            <div class="am-center"><span>R</span></div>
            <div class="am-answer approved"><small>VASTAUS LÖYTYY</small><b>Vastaa heti</b><i>→</i></div>
            <div class="am-answer uncertain"><small>VASTAUSTA EI LÖYDY</small><b>Ohjaa sinulle</b><i>↗</i></div>
            <div class="am-pulse"></div>
          </div>
        </article>
      </div>
    </div>
  </section>`;
}

function productWorldScene() {
  return `<section class="product-world" id="features">
    <div class="world-sticky">
      <div class="world-label">02 / KAIKKI YHDESSÄ</div>
      <div class="world-title"><span>Näet yhdellä silmäyksellä</span><b>mitä asiakkaat kysyvät.</b></div>
      <div class="world-stage" aria-hidden="true">
        <div class="world-floor"></div>
        <div class="world-window ww-main">
          <div class="ww-top"><span>RESPONDO</span><i>● PÄÄLLÄ</i></div>
          <div class="ww-body">
            <div class="ww-side"><b></b><b></b><b></b><b></b></div>
            <div class="ww-content">
              <div class="ww-stat"><small>KESKUSTELUT</small><strong>148</strong><span>+24%</span></div>
              <div class="ww-chart"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
              <div class="ww-lines"><span></span><span></span><span></span></div>
            </div>
          </div>
        </div>
        <div class="world-window ww-chat">
          <small>UUSI KESKUSTELU</small>
          <div class="ww-bubble dark">Paljonko maksaa?</div>
          <div class="ww-bubble light">Palvelu alkaa 89 €.</div>
        </div>
        <div class="world-window ww-knowledge">
          <small>TIETOPOHJA</small>
          <div><span>Hinnasto</span><b>✓</b></div>
          <div><span>Aukioloajat</span><b>✓</b></div>
          <div><span>Palvelut</span><b>✓</b></div>
        </div>
        <div class="world-window ww-alert">
          <span>!</span><div><small>VASTAUS PUUTTUU</small><b>Asiakas ohjattu sinulle</b></div>
        </div>
      </div>
      <div class="world-caption">Vieritä eteenpäin ja katso, miten kaikki toimii yhdessä.</div>
    </div>
  </section>`;
}

function dataImpactScene() {
  return `<section class="impact-scene" id="research">
    <div class="impact-top">
      <div class="impact-kicker">03 / NOPEA VASTAUS MERKITSEE</div>
      <h2>Asiakas voi kysyä milloin vain.<br><em>Vastauksen ei tarvitse odottaa.</em></h2>
    </div>
    <div class="impact-numbers">
      <a class="impact-number n1" href="https://cxtrends.zendesk.com/" target="_blank" rel="noopener noreferrer">
        <span>74%</span><small>odottaa saavansa palvelua ympäri vuorokauden*</small><i>↗</i>
      </a>
      <a class="impact-number n2" href="https://www.salesforce.com/eu/service/digital-customer-engagement-platform/what-is-customer-engagement/" target="_blank" rel="noopener noreferrer">
        <span>77%</span><small>odottaa saavansa vastauksen heti*</small><i>↗</i>
      </a>
      <a class="impact-number n3" href="https://hbr.org/2011/03/the-short-life-of-online-sales-leads" target="_blank" rel="noopener noreferrer">
        <span>23%</span><small>ei vastannut yhteydenottoon lainkaan*</small><i>↗</i>
      </a>
    </div>
    <div class="impact-foot">* Avaa luku nähdäksesi lähteen. HBR:n aineisto on Yhdysvalloista vuodelta 2011.</div>
  </section>`;
}

function trustPortalScene() {
  return `<section class="trust-portal" id="control">
    <div class="portal-ring ring-one"></div>
    <div class="portal-ring ring-two"></div>
    <div class="portal-ring ring-three"></div>
    <div class="portal-center">
      <small>04 / KUN VASTAUSTA EI LÖYDY</small>
      <div class="portal-mark">R</div>
      <h2>Jos vastausta ei löydy,<br><em>Respondo ei keksi sellaista.</em></h2>
      <p>Respondo vastaa vain tiedoilla, jotka olet itse antanut. Jos tieto puuttuu, asiakas ohjataan sinulle.</p>
      <a href="/assistant" class="portal-button">Kokeile itse <span>→</span></a>
    </div>
    <div class="portal-node pn1"><span>✓</span> Hinnat</div>
    <div class="portal-node pn2"><span>✓</span> Palvelut</div>
    <div class="portal-node pn3"><span>?</span> Vastaus puuttuu</div>
    <div class="portal-node pn4"><span>↗</span> Sinulle</div>
  </section>`;
}


async function home() {
  await config();
  return `<div>
    ${nav()}
    ${stickyProductNav()}
    <main class="immersive-home">
      <section class="hero hero-immersive">
        <div class="hero-glow"></div>
        <div class="container hero-grid">
          <div class="hero-copy">
            <div class="hero-label"><span></span> ASIAKASPALVELU, JOKA ON AINA PAIKALLA</div>
            <h1>Asiakas kysyy.<br><em>RESPONDO vastaa.</em></h1>
            <p class="lead">Kerro Respondolle yrityksesi tiedot kerran. Sen jälkeen se vastaa asiakkaillesi myös silloin, kun sinä et ehdi — eikä keksi vastausta, jos tietoa ei löydy.</p>
            <div class="hero-actions">
              <a class="btn hero-primary" href="/assistant">Kokeile bottia</a>
              <a class="btn ghost" href="/tilaus">Kokeile 3 päivää ilmaiseksi</a>
            </div>
            <div class="hero-scroll-hint"><i></i><span>VIERITÄ ALAS JA KATSO, MITEN SE TOIMII</span></div>
          </div>
          ${heroVisual()}
        </div>
      </section>

      ${cinematicConversationScene()}
      ${horizontalProductStory()}
      ${productWorldScene()}
      ${trustPortalScene()}
      ${dataImpactScene()}
      ${calculatorSection()}
      ${pricingSection()}

      <section class="section final-cta final-cta-immersive">
        <div class="container">
          <div class="cta-shell">
            <div>
              <div class="section-kicker light">05 / KOKEILE KÄYTÄNNÖSSÄ</div>
              <h2>Asiakkaasi seuraava kysymys voi tulla vaikka tänä iltana.</h2>
              <p>Anna Respondon hoitaa vastaus silloin, kun sinä et ehdi.</p>
            </div>
            <a class="cta-circle" href="/tilaus" aria-label="Kokeile ilmaiseksi"><span>KOKEILE</span><b>→</b></a>
          </div>
        </div>
      </section>
      ${contactSection()}
    </main>
    ${footer()}
  </div>`;
}

function signup() {
  const plan = new URLSearchParams(location.search).get('plan') || 'monthly';
  return `<div>
    ${nav()}
    <main class="formpage">
      <div class="container checkout-layout">
        <section class="checkout-copy">
          <div class="section-kicker">ALOITA KOKEILU</div>
          <h1>Kokeile rauhassa.<br><em>Päätä vasta sen jälkeen.</em></h1>
          <p>Luo tili ja lisää maksutapa Stripessä. Sinulta ei veloiteta mitään 3 päivän kokeilun aikana.</p>
          <div class="checkout-steps">
            <div><span>01</span><b>Luo tili</b><small>Täytä omat ja yrityksesi perustiedot.</small></div>
            <div><span>02</span><b>Lisää maksutapa Stripessä</b><small>Korttitietosi menevät suoraan Stripelle.</small></div>
            <div><span>03</span><b>Lisää yrityksesi tiedot</b><small>Kerro Respondolle, mitä asiakkaillesi saa vastata.</small></div>
          </div>
          <div class="seller-card">
            <span>PALVELUNTARJOAJA</span>
            <b>${esc(cfg.sellerName || 'RESPONDO AI')}</b>
            <small>Y-tunnus ${esc(cfg.businessId || '3599437-5')} · Suomi</small>
          </div>
        </section>
        <form class="formcard premium-form" id="signup">
          <div class="form-head"><span>LUO TILI</span><b>3 päivää ilmaiseksi</b></div>
          ${socialAuthButtons('signup')}
          <div class="formgrid">
            <div class="field"><label>Nimi</label><input name="fullName" autocomplete="name" required placeholder="Etunimi Sukunimi"></div>
            <div class="field"><label>Sähköposti</label><input name="email" type="email" autocomplete="email" required placeholder="sinä@yritys.fi"></div>
            <div class="field"><label>Yritys</label><input name="companyName" required placeholder="Yrityksen nimi"></div>
            <div class="field"><label>Y-tunnus</label><input name="businessId" placeholder="1234567-8"></div>
            <div class="field full" id="signupPasswordField"><label>Salasana</label><input name="password" type="password" minlength="10" autocomplete="new-password" required placeholder="Vähintään 10 merkkiä"></div>
            <div class="field full"><label>Tilaus</label>
              <select name="plan">
                <option value="monthly" ${plan === 'monthly' ? 'selected' : ''}>49 €/kk + alv · kuukausi</option>
                <option value="yearly" ${plan === 'yearly' ? 'selected' : ''}>549 €/vuosi + alv · vuosi</option>
              </select>
            </div>
            <label class="checkrow field full">
              <input type="checkbox" name="terms" required>
              <span>Hyväksyn <a href="/kayttoehdot" target="_blank">käyttöehdot</a> ja <a href="/tietosuoja" target="_blank">tietosuojaselosteen</a>.</span>
            </label>
          </div>
          <button class="btn checkout-button" type="submit">Jatka maksutavan lisäämiseen <span>→</span></button>
          <div class="form-security"><span>◈</span> Korttitiedot käsittelee Stripe. Respondo ei näe eikä tallenna korttinumeroasi.</div>
          <div id="msg">${oauthErrorMessage() ? `<div class="notice error">${esc(oauthErrorMessage())}</div>` : ''}</div>
        </form>
      </div>
    </main>
    ${footer()}
  </div>`;
}

function login() {
  const checkoutError = new URLSearchParams(location.search).get('checkout_error') === '1';
  return `<div>
    ${nav()}
    <main class="formpage login-page">
      <div class="container login-layout">
        <section class="login-copy">
          <div class="section-kicker">Hallintapaneeli</div>
          <h1>Tervetuloa<br><em>takaisin.</em></h1>
          <p>Täältä löydät yrityksesi tiedot, keskustelut, asennuksen ja tilauksen.</p>
          <div class="login-signal"><span></span> Vain sinä pääset yrityksesi hallintaan</div>
        </section>
        <form class="formcard premium-form login-card" id="login">
          <div class="form-head"><span>KIRJAUDU</span><b>Tervetuloa takaisin</b></div>
          ${socialAuthButtons('login')}
          <div class="field"><label>Sähköposti</label><input name="email" type="email" autocomplete="email" required placeholder="sinä@yritys.fi"></div>
          <div class="field"><label>Salasana</label><input name="password" type="password" autocomplete="current-password" required placeholder="••••••••••"></div>
          <button class="btn checkout-button" type="submit">Kirjaudu sisään <span>→</span></button>
          <div id="msg">${oauthErrorMessage() ? `<div class="notice error">${esc(oauthErrorMessage())}</div>` : (checkoutError ? '<div class="notice error">Automaattinen kirjautuminen ei onnistunut. Kirjaudu samalla sähköpostilla ja salasanalla, jonka loit ennen maksua.</div>' : '')}</div>
        </form>
      </div>
    </main>
    ${footer()}
  </div>`;
}

const LEGAL = {
  kayttoehdot: {
    label: 'LAKIASIAT / 01',
    title: 'Käyttöehdot',
    intro: 'Näissä ehdoissa kerrotaan, millä ehdoilla yritysasiakkaat voivat käyttää Respondoa.',
    sections: [
      ['1. Palveluntarjoaja', `RESPONDO AI, Y-tunnus ${cfg.businessId || '3599437-5'}, Suomi. Yhteydenotot: ${cfg.supportEmail}.`],
      ['2. Palvelu', 'RESPONDO AI on yrityksille tarkoitettu verkkopalvelu. Sen avulla yritys voi ylläpitää omia tietojaan ja tarjota verkkosivullaan automaattisia asiakasvastauksia.'],
      ['3. Kokeilu ja tilaus', `Palvelua voi kokeilla ${cfg.trialDays || 3} päivää ilmaiseksi. Maksutapa lisätään kokeilun alussa, mutta veloitus alkaa vasta kokeilun jälkeen, jos tilausta ei ole peruttu sitä ennen.`],
      ['4. Hinnat ja verot', `Kuukausitilaus maksaa ${cfg.monthlyNet || 49} €/kk + sovellettava arvonlisävero. Vuositilaus maksaa ${cfg.yearlyNet || 549} €/vuosi + sovellettava arvonlisävero.`],
      ['5. Peruminen', 'Tilauksen voi perua milloin tahansa. Jo maksettu laskutuskausi jatkuu normaalisti kauden loppuun, ellei pakottava lainsäädäntö edellytä muuta.'],
      ['6. Asiakkaan vastuu', 'Asiakas vastaa siitä, että palveluun lisätyt tiedot ovat oikein, että niiden käyttöön on oikeus ja että palvelua käytetään lain sekä näiden ehtojen mukaisesti.'],
      ['7. Palvelun saatavuus', 'Palvelua kehitetään jatkuvasti. Huollot, ulkopuolisten palvelujen häiriöt tai muut tekniset syyt voivat joskus aiheuttaa käyttökatkoja.'],
    ],
  },
  tietosuoja: {
    label: 'LAKIASIAT / 02',
    title: 'Tietosuojaseloste',
    intro: 'Tässä kerrotaan, mitä tietoja Respondo käsittelee ja mihin niitä käytetään.',
    sections: [
      ['Rekisterinpitäjä', `RESPONDO AI, Y-tunnus ${cfg.businessId || '3599437-5'}. Tietosuoja- ja muut yhteydenotot: ${cfg.supportEmail}.`],
      ['Käsiteltävät tiedot', 'Käsittelemme käyttäjätilin tietoja, yrityksen yhteystietoja, Y-tunnusta, laskutukseen liittyviä tunnisteita, palveluun lisättyjä yritystietoja sekä chatissa syntyviä keskustelutietoja.'],
      ['Käyttötarkoitukset', 'Tietoja käytetään palvelun toimittamiseen, kirjautumiseen, tilauksen hallintaan, asiakastukeen, väärinkäytösten ehkäisyyn ja tekniseen ylläpitoon.'],
      ['Maksut', 'Korttitiedot käsittelee Stripe omien ehtojensa mukaisesti. Respondo ei tallenna varsinaista korttinumeroa omaan tietokantaansa.'],
      ['Palveluntarjoajat', 'Palvelun toteuttamiseen käytetään ulkopuolisia infrastruktuuri-, tietokanta-, maksu- ja AI-palveluja. Ne voivat käsitellä tietoja omien sopimusehtojensa ja sovellettavan tietosuojalainsäädännön mukaisesti.'],
      ['Säilytys', 'Tietoja säilytetään vain niin kauan kuin niitä tarvitaan palvelun toimittamiseen, sopimusvelvoitteiden hoitamiseen, tietoturvaan tai lakisääteisiin velvoitteisiin.'],
    ],
  },
};

LEGAL['evasteet'] = {
  label: 'LAKIASIAT / 03',
  title: 'Evästeet',
  intro: 'Respondo käyttää tällä hetkellä vain sellaisia evästeitä, joita palvelun toiminta tarvitsee.',
  sections: [
    ['Istuntoeväste', 'Kirjautumisen yhteydessä selaimeen tallennetaan suojattu istuntoeväste, jotta käyttäjä pysyy kirjautuneena hallintapaneeliin.'],
    ['Markkinointievästeet', 'Respondon markkinointisivulla ei oletuksena käytetä ylimääräisiä analytiikka- tai mainosevästeitä.'],
    ['Maksaminen', 'Stripe voi käyttää omia evästeitään maksamisen, petosten torjunnan ja Link-pikamaksun toteuttamiseen.'],
  ],
};

LEGAL.dpa = {
  label: 'LAKIASIAT / 04',
  title: 'Tietojenkäsittely',
  intro: 'Kun Respondo käsittelee henkilötietoja yritysasiakkaan puolesta, yritys toimii lähtökohtaisesti rekisterinpitäjänä ja Respondo henkilötietojen käsittelijänä.',
  sections: [
    ['Käsittelyn kohde', 'Käsittely liittyy palvelun käyttöön, yrityksen palveluun lisäämiin tietoihin sekä verkkosivun chatissa käsiteltäviin viesteihin.'],
    ['Ohjeet', 'Respondo käsittelee tietoja asiakkaan puolesta vain palvelun toteuttamiseksi ja asiakkaan dokumentoitujen ohjeiden mukaisesti.'],
    ['Luottamuksellisuus ja turvallisuus', 'Pääsy tuotantoympäristöihin ja salaisiin tietoihin rajataan vain niille, jotka niitä tarvitsevat. Salasanoja ei tallenneta selväkielisinä.'],
    ['Alikäsittelijät', 'Palvelun taustalla käytetään infrastruktuuri-, tietokanta-, maksu- ja AI-palveluntarjoajia.'],
  ],
};

LEGAL.tietoturva = {
  label: 'TRUST / SECURITY',
  title: 'Tietoturva',
  intro: 'Respondossa pyritään käsittelemään vain tarpeellisia tietoja ja pitämään palvelun kriittiset salaisuudet poissa selaimesta.',
  sections: [
    ['HTTPS', 'Palvelu toimii salatun HTTPS-yhteyden kautta.'],
    ['Salasanat', 'Salasanat tallennetaan yksisuuntaisesti hajautettuina eikä koskaan selväkielisinä.'],
    ['API-avaimet', 'Maksu-, tietokanta- ja AI-palveluiden salaiset avaimet säilytetään palvelimella eikä niitä lähetetä selaimeen.'],
    ['Tietopohjaperiaate', 'Asiakasvastaukset perustuvat yrityksen itse lisäämiin tietoihin. Jos varmaa vastausta ei löydy, palvelu ohjaa eteenpäin sen sijaan, että se arvailee.'],
    ['Yhteydenotot', `Tietoturvaan liittyvät ilmoitukset: ${cfg.supportEmail}.`],
  ],
};

function legal(type) {
  const page = LEGAL[type] || {
    label: 'RESPONDO AI',
    title: 'Sivua ei löytynyt',
    intro: 'Palaa etusivulle.',
    sections: [],
  };
  return `<div>
    ${nav()}
    <main class="legalpage">
      <div class="container legal-layout">
        <aside class="legal-aside">
          <div class="section-kicker">${page.label}</div>
          <h1>${page.title}</h1>
          <p>${page.intro}</p>
          <div class="legal-seller"><span>PALVELUNTARJOAJA</span><b>RESPONDO AI</b><small>Y-tunnus ${esc(cfg.businessId || '3599437-5')}</small></div>
        </aside>
        <article class="legalcopy">
          ${page.sections.map(([h, p]) => `<section><h2>${h}</h2><p>${p}</p></section>`).join('')}
          <section><h2>Yhteydenotot</h2><p><a href="mailto:${esc(cfg.supportEmail)}">${esc(cfg.supportEmail)}</a></p></section>
          <div class="legal-note">Päivitetty ${new Date().toLocaleDateString('fi-FI')}. Teksti kuvaa Respondon nykyistä palvelua ja sitä voidaan päivittää palvelun kehittyessä.</div>
        </article>
      </div>
    </main>
    ${footer()}
  </div>`;
}

async function dashboard() {
  let me;
  try {
    me = await api('/api/auth/me');
  } catch {
    return login();
  }

  let data;
  try {
    data = await api('/api/app/dashboard');
  } catch (e) {
    return `<div class="container"><div class="notice error">${esc(e.message)}</div></div>`;
  }

  const t = data.tenant;
  const s = data.stats;
  const knowledge = data.knowledge || [];
  const businessProfile = Object.fromEntries(
    knowledge
      .filter((x) => x.category === 'Yrityksen perustiedot')
      .map((x) => [x.title, x.answer])
  );
  const profileValue = (title) => esc(businessProfile[title] || '');
  const unanswered = data.unanswered || [];
  const recentConversations = data.recentConversations || [];
  const leads = data.leads || [];
  const gaps = data.gaps || [];
  const daily = data.daily || [];
  const maxDaily = Math.max(1, ...daily.map((x) => Number(x.total || 0)));
  const nonProfileKnowledge = knowledge.filter((x) => x.category !== 'Yrityksen perustiedot');
  const installedKey = `respondo-installed-${t.id}`;
  const installedDone = localStorage.getItem(installedKey) === '1';
  const profileDone = ['Hinnat','Aukioloajat','Palvelut'].filter((k) => businessProfile[k]).length >= 2;
  const answersDone = nonProfileKnowledge.length > 0;
  const testedDone = s.conversations > 0;
  const onboarding = [
    { label: 'Kerro yrityksesi perustiedot', done: profileDone, target: 'business-profile' },
    { label: 'Lisää ensimmäinen oma vastaus', done: answersDone, target: 'knowledge' },
    { label: 'Lisää Respondo verkkosivullesi', done: installedDone, target: 'install' },
    { label: 'Kokeile bottia ensimmäisen kerran', done: testedDone, target: 'live-preview' },
  ];
  const onboardingDone = onboarding.filter((x) => x.done).length;
  const onboardingPct = Math.round((onboardingDone / onboarding.length) * 100);
  const isWelcome = new URLSearchParams(location.search).get('welcome') === '1';

  return `<div class="appshell">
    <aside class="appside">
      ${logo()}
      <div class="workspace-chip"><span></span><div><small>TYÖTILA</small><b>${esc(t.name)}</b></div></div>
      <nav class="appnav">
        <a href="#overview" class="active"><span>⌂</span> Yleiskatsaus</a>
        <a href="#business-profile"><span>✦</span> Yrityksen tiedot</a>
        <a href="#knowledge"><span>≡</span> Tietopohja <em>${knowledge.length}</em></a>
        <a href="#unanswered"><span>?</span> Vastaamattomat <em>${unanswered.length}</em></a>
        <a href="#conversations"><span>◌</span> Keskustelut <em>${recentConversations.length}</em></a>
        <a href="#leads"><span>↗</span> Liidit <em>${leads.length}</em></a>
        <a href="#install"><span>&lt;/&gt;</span> Asennus</a>
        <a href="#billing"><span>€</span> Laskutus</a>
      </nav>
      <div class="appside-bottom">
        <div class="user-mini"><div class="avatar">${esc((me.email || 'R')[0].toUpperCase())}</div><div><b>${esc(me.company_name || t.name)}</b><small>${esc(me.email)}</small></div></div>
        <button class="side-logout" id="logout">Kirjaudu ulos</button>
      </div>
    </aside>
    <main class="appmain">
      <section class="dashboard-head" id="overview">
        <div><div class="section-kicker">Hallintapaneeli</div><h1>${esc(t.name)}</h1><p>Täältä näet, mitä asiakkaasi kysyvät, ja päätät, mitä botti saa heille vastata.</p></div>
        <div class="live-chip"><span></span> Botti on käytössä</div>
      </section>

      ${isWelcome ? `
      <section class="welcome-card" id="welcomeCard">
        <div class="welcome-mark">R</div>
        <div class="welcome-copy">
          <small>TILAUS AKTIIVINEN</small>
          <h2>Tervetuloa Respondoon.</h2>
          <p>Tilisi on valmis. Lisää ensin yrityksesi tiedot, kokeile bottia itse ja lisää se sitten verkkosivullesi.</p>
        </div>
        <button type="button" class="btn welcome-start" id="welcomeStart">Aloita tästä <span>→</span></button>
      </section>` : ''}

      <section class="onboarding-card" id="onboarding">
        <div class="onboarding-top">
          <div>
            <small>KÄYTTÖÖNOTTO</small>
            <h2>${onboardingDone === onboarding.length ? 'Kaikki on valmista.' : 'Laita loputkin kuntoon.'}</h2>
            <p>${onboardingDone}/${onboarding.length} kohtaa valmiina</p>
          </div>
          <div class="onboarding-score">${onboardingPct}%</div>
        </div>
        <div class="onboarding-progress"><i style="width:${onboardingPct}%"></i></div>
        <div class="onboarding-steps">
          ${onboarding.map((step, i) => `
            <button type="button" class="onboarding-step ${step.done ? 'done' : ''}" data-scroll-target="${step.target}">
              <span>${step.done ? '✓' : String(i + 1).padStart(2,'0')}</span>
              <b>${step.label}</b>
              <em>→</em>
            </button>`).join('')}
        </div>
      </section>

      <section class="stats">
        <article class="stat"><small>KESKUSTELUT</small><b>${s.conversations}</b><span>yhteensä</span></article>
        <article class="stat"><small>VIIMEISET 7 PV</small><b>${s.last7 || 0}</b><span>keskustelua</span></article>
        <article class="stat"><small>VASTATTU SUORAAN</small><b>${s.answeredRate}%</b><span>ilman että asiakas piti ohjata eteenpäin</span></article>
        <article class="stat"><small>YHTEYDENOTOT</small><b>${s.leads || 0}</b><span>asiakasta jätti yhteystietonsa</span></article>
      </section>

      <section class="dashboard-insights">
        <article class="panel trend-panel">
          <div class="panel-head">
            <div><small>14 PÄIVÄÄ</small><h2>Näin paljon asiakkaat ovat kysyneet</h2></div>
            <span>${s.last30 || 0} / 30 pv</span>
          </div>
          <div class="mini-bars" aria-label="Keskustelut viimeisen 14 päivän aikana">
            ${daily.length ? daily.map((x) => `<div class="mini-bar" title="${esc(x.day)} · ${Number(x.total || 0)}"><i style="height:${Math.max(8, Math.round((Number(x.total || 0) / maxDaily) * 100))}%"></i><small>${new Date(x.day).toLocaleDateString('fi-FI',{day:'numeric',month:'numeric'})}</small></div>`).join('') : '<div class="empty-state compact"><p>Kun keskusteluja kertyy, näet kehityksen tässä.</p></div>'}
          </div>
        </article>
        <article class="panel gap-summary">
          <div class="panel-head"><div><small>TÄLLÄ VIIKOLLA</small><h2>Mihin kysymyksiin vastaus vielä puuttuu?</h2></div><span>${gaps.length}</span></div>
          <div class="gap-summary-list">
            ${gaps.length ? gaps.slice(0,5).map((x) => `<button type="button" class="gap-jump" data-gap-question="${esc(x.question)}"><span>${esc(x.question)}</span><b>${Number(x.asks || 0)}×</b></button>`).join('') : '<div class="empty-state compact"><b>Kaikkiin tämän viikon kysymyksiin löytyi vastaus.</b><p>Hyvältä näyttää.</p></div>'}
          </div>
        </article>
      </section>

      <section class="profile-live-grid" id="business-profile">
        <div class="panel business-profile-panel">
        <div class="panel-head business-profile-head">
          <div>
            <small>YRITYKSEN TIEDOT</small>
            <h2>Kerro Respondolle tärkeimmät asiat yrityksestäsi</h2>
            <p>Täytä nämä kerran. Jos jokin muuttuu, voit päivittää tiedot milloin tahansa.</p>
          </div>
          <span class="install-badge">Perustiedot</span>
        </div>
        <form id="businessProfileForm" class="business-profile-form">
          <div class="profile-grid">
            <div class="field profile-wide">
              <label>Ensimmäinen viesti asiakkaalle</label>
              <input name="greeting" maxlength="220" value="${esc(t.greeting || 'Hei! Miten voin auttaa?')}" placeholder="Hei! Miten voin auttaa?">
            </div>
            <div class="field">
              <label>Vastaustyyli</label>
              <select name="tone">
                <option value="Luonteva ja ystävällinen" ${profileValue('Vastaustyyli').includes('Luonteva') || !profileValue('Vastaustyyli') ? 'selected' : ''}>Luonteva ja ystävällinen</option>
                <option value="Lyhyt ja suora" ${profileValue('Vastaustyyli').includes('Lyhyt') ? 'selected' : ''}>Lyhyt ja suora</option>
                <option value="Asiallinen ja ammattimainen" ${profileValue('Vastaustyyli').includes('Asiallinen') ? 'selected' : ''}>Asiallinen ja ammattimainen</option>
              </select>
            </div>
            <div class="field">
              <label>Hinnat</label>
              <textarea name="pricing" placeholder="Esim. Putkityö 65 € / h + alv. Päivystys 95 € / h + alv.">${profileValue('Hinnat')}</textarea>
            </div>
            <div class="field">
              <label>Aukioloajat</label>
              <input name="hours" value="${profileValue('Aukioloajat')}" placeholder="Ma–Pe 8–17">
            </div>
            <div class="field">
              <label>Puhelinnumero</label>
              <input name="phone" value="${profileValue('Puhelinnumero')}" placeholder="040 123 4567">
            </div>
            <div class="field">
              <label>Sähköposti</label>
              <input name="email" type="email" value="${profileValue('Sähköposti')}" placeholder="info@yritys.fi">
            </div>
            <div class="field website-import-field">
              <label>Verkkosivusi osoite</label>
              <input name="website" value="${profileValue('Verkkosivu')}" placeholder="https://yritys.fi">
              <small class="field-hint">Botti toimii vain tällä verkkosivulla.</small>
              <button type="button" class="inline-import-btn" id="importWebsite">Hae tiedot sivultani</button>
              <small class="field-hint">Respondo etsii sivultasi palvelut ja yhteystiedot valmiiksi. Sinä tarkistat ne ennen tallennusta.</small>
            </div>
            <div class="field">
              <label>Linkki tarjouspyyntöön</label>
              <input name="quoteRequestUrl" value="${profileValue('Tarjouspyyntölomake')}" placeholder="https://yritys.fi/tarjouspyynto">
              <small class="field-hint">Respondo voi lähettää tämän linkin asiakkaalle, joka haluaa pyytää tarjouksen.</small>
            </div>
            <div class="field profile-wide">
              <label>Mitä palveluja tarjoatte?</label>
              <textarea name="services" placeholder="Esim. putkityöt, LVI-asennukset, sähkötyöt, huollot, päivystys">${profileValue('Palvelut')}</textarea>
            </div>
            <div class="field">
              <label>Toimialue</label>
              <input name="serviceArea" value="${profileValue('Toimialue')}" placeholder="Esim. Tampere + 50 km">
            </div>
            <div class="field">
              <label>Osoite</label>
              <input name="address" value="${profileValue('Osoite')}" placeholder="Katuosoite, paikkakunta">
            </div>
            <div class="field profile-wide">
              <label>Muut tärkeät tiedot</label>
              <textarea name="notes" placeholder="Esim. päivystysnumero, maksutavat, takuukäytännöt, ajanvarausohjeet, poikkeukset...">${profileValue('Lisätiedot')}</textarea>
            </div>
          </div>
          <div class="profile-save-row">
            <div>
              <b>Respondo käyttää näitä tietoja asiakkaiden kysymyksiin vastaamiseen.</b>
              <small>Voit muuttaa niitä milloin tahansa.</small>
            </div>
            <button class="btn dashboard-action profile-save" type="submit">Tallenna tiedot <span>→</span></button>
          </div>
          <div id="businessProfileMsg"></div>
        </form>
        </div>

        <aside class="panel live-preview-panel" id="live-preview">
          <div class="panel-head">
            <div><small>KOKEILE TÄSSÄ</small><h2>Kysy kuten asiakkaasi kysyisi</h2></div>
            <span class="preview-live"><i></i> Käytössä</span>
          </div>
          <div class="preview-device">
            <div class="preview-device-top">
              <span class="preview-avatar">${esc((t.name || 'R')[0].toUpperCase())}</span>
              <div><b>${esc(t.name)}</b><small>paikalla nyt</small></div>
            </div>
            <div class="preview-chat" id="previewChat">
              <div class="preview-bubble bot">${esc(t.greeting || 'Hei! Miten voin auttaa?')}</div>
            </div>
            <form class="preview-form" id="previewForm" data-slug="${esc(t.slug)}">
              <input name="question" autocomplete="off" placeholder="Kysy esim. “Paljonko maksaa?”">
              <button type="submit">→</button>
            </form>
          </div>
          <p class="preview-note">Tämä kokeilu käyttää yllä olevia tietoja ja jo tallentamiasi vastauksia.</p>
        </aside>
      </section>

      <section class="dashboard-grid" id="knowledge">
        <div class="panel knowledge-panel">
          <div class="panel-head"><div><small>TIETOPOHJA</small><h2>Vastaukset, joita botti saa käyttää</h2></div><span>${knowledge.length} kohdetta</span></div>
          <div id="knowledgeList" class="knowledge-list">
            ${knowledge.length ? knowledge.map((x, i) => `<div class="knowledge-item"><span class="knum">${String(i + 1).padStart(2, '0')}</span><div><b>${esc(x.title)}</b><small>${esc(x.category || 'Yleinen')}</small><p>${esc(x.answer)}</p></div><span class="approved">✓</span></div>`).join('') : `<div class="empty-state"><b>Et ole lisännyt vielä omia vastauksia.</b><p>Lisää ensimmäinen vastaus tästä.</p></div>`}
          </div>
        </div>

        <form class="panel add-knowledge" id="knowledgeForm">
          <div class="panel-head"><div><small>LISÄÄ VASTAUS</small><h2>Tallenna vastaus</h2></div><span>＋</span></div>
          <div class="field"><label>Kategoria</label><input name="category" placeholder="Esim. Hinnoittelu"></div>
          <div class="field"><label>Otsikko</label><input name="title" required placeholder="Mitä asiakas kysyy?"></div>
          <div class="field"><label>Hyväksytty vastaus</label><textarea name="answer" required placeholder="Kirjoita tähän se vastaus, jonka haluat asiakkaan saavan."></textarea></div>
          <div class="field"><label>Esimerkkisanat</label><input name="keywords" placeholder="hinta, maksaa, tarjous"></div>
          <button class="btn dashboard-action" type="submit">Tallenna vastaus <span>→</span></button>
          <div id="knowledgeMsg"></div>
        </form>
      </section>

      <section class="panel conversation-panel" id="conversations">
        <div class="panel-head">
          <div><small>VIIMEISIMMÄT KESKUSTELUT</small><h2>Mitä asiakkaasi ovat kysyneet?</h2><p>Näet kysymyksen, Respondon vastauksen ja sen, pitikö asiakas ohjata sinulle.</p></div>
          <span>${recentConversations.length}</span>
        </div>
        <div class="conversation-log">
          ${recentConversations.length ? recentConversations.map((x) => `
            <article class="conversation-log-item ${x.handoff ? 'needs-human' : ''}">
              <div class="conversation-log-meta"><span>${x.handoff ? 'Vastaus puuttui' : 'Vastattu'}</span><small>${new Date(x.created_at).toLocaleString('fi-FI',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</small></div>
              <h3>${esc(x.question)}</h3>
              <p>${esc(x.answer)}</p>
            </article>`).join('') : '<div class="empty-state"><b>Keskusteluja ei ole vielä.</b><p>Kun asiakkaat alkavat kysyä, keskustelut näkyvät tässä.</p></div>'}
        </div>
      </section>

      <section class="panel leads-panel" id="leads">
        <div class="panel-head">
          <div><small>YHTEYDENOTOT</small><h2>Asiakkaat, jotka haluavat yhteydenoton</h2><p>Jos vastaus puuttuu, asiakas voi jättää numeronsa tai sähköpostinsa, jotta voit ottaa yhteyttä.</p></div>
          <span>${leads.length}</span>
        </div>
        <div class="lead-list">
          ${leads.length ? leads.map((x) => `
            <article class="lead-item">
              <div class="lead-main">
                <div><small>${new Date(x.created_at).toLocaleString('fi-FI',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</small><h3>${esc(x.name || 'Asiakas')}</h3></div>
                <span class="lead-status">Uusi</span>
              </div>
              ${x.message ? `<p>“${esc(x.message)}”</p>` : ''}
              <div class="lead-contact">
                ${x.phone ? `<a href="tel:${esc(x.phone.replace(/\s+/g,''))}">${esc(x.phone)}</a>` : ''}
                ${x.email ? `<a href="mailto:${esc(x.email)}">${esc(x.email)}</a>` : ''}
              </div>
            </article>`).join('') : '<div class="empty-state"><b>Kukaan ei ole vielä jättänyt yhteystietoja.</b><p>Uudet yhteydenottopyynnöt näkyvät tässä.</p></div>'}
        </div>
      </section>

      <section class="panel unanswered-panel" id="unanswered">
        <div class="panel-head unanswered-head">
          <div>
            <small>VASTAUS PUUTTUU</small>
            <h2>Kysymykset, joihin Respondolla ei vielä ollut vastausta</h2>
            <p>Kirjoita vastaus tähän kerran. Sen jälkeen Respondo osaa vastata samaan asiaan myös seuraaville asiakkaille.</p>
          </div>
          <span>${unanswered.length}</span>
        </div>
        <div class="unanswered-list">
          ${unanswered.length ? unanswered.map((x, i) => `
            <article class="unanswered-item" data-id="${esc(x.id)}" data-question="${esc(x.question)}">
              <div class="unanswered-meta">
                <span>${String(i + 1).padStart(2,'0')}</span>
                <small>${new Date(x.created_at).toLocaleString('fi-FI', {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</small>
              </div>
              <h3>${esc(x.question)}</h3>
              <textarea class="unanswered-answer" placeholder="Kirjoita tähän oikea vastaus…"></textarea>
              <div class="unanswered-actions">
                <span>Kun tallennat tämän, Respondo voi käyttää vastausta jatkossa.</span>
                <button type="button" class="btn dashboard-action add-unanswered-answer">Tallenna vastaus <span>→</span></button>
              </div>
              <div class="unanswered-msg"></div>
            </article>`).join('') : `
            <div class="unanswered-empty">
              <span>✓</span>
              <b>Kaikkiin kysymyksiin löytyi vastaus.</b>
              <p>Jos vastaan tulee kysymys, johon tietoa ei vielä ole, se ilmestyy tähän.</p>
            </div>`}
        </div>
      </section>

      <section class="panel install-panel" id="install">
        <div class="panel-head"><div><small>ASENNUS</small><h2>Lisää Respondo verkkosivullesi</h2></div><span class="install-badge">1 sivusto</span></div>
        <p>Kopioi tämä koodi sivustosi HTML:ään juuri ennen sulkevaa <code>&lt;/body&gt;</code>-tagia.</p>
        <div class="license-lock">
          <span>🔒 SIDOTTU VERKKOSIVUUN</span>
          <b>${t.website ? esc(t.website) : 'Et ole vielä lisännyt verkkosivua'}</b>
          <small>${t.website ? 'Tämä asennuskoodi toimii vain yllä olevalla verkkosivulla.' : 'Lisää ensin verkkosivusi osoite yllä. Sen jälkeen botti toimii vain sillä sivulla.'}</small>
        </div>
        <div class="code-row"><code id="installCode">&lt;script src="${location.origin}/widget.js" data-company="${esc(t.slug)}"&gt;&lt;/script&gt;</code><button type="button" id="copyCode">Kopioi</button></div>
        <button type="button" class="install-done ${installedDone ? 'done' : ''}" id="installDone" data-tenant-id="${esc(t.id)}">${installedDone ? '✓ Asennus valmis' : 'Olen asentanut botin'}</button>
      </section>

      <section class="panel billing-panel" id="billing">
        <div><small>LASKUTUS</small><h2>Hallitse tilaustasi</h2><p>Voit vaihtaa maksutapaa, katsoa laskuja tai perua tilauksen Stripen asiakasportaalissa.</p></div>
        <button class="btn dashboard-action" id="billingPortal" type="button">Avaa tilauksen hallinta <span>↗</span></button>
      </section>
    </main>
  </div>`;
}

async function route() {
  await config();
  const path = location.pathname;
  let html;

  if (path === '/') html = await home();
  else if (path === '/assistant') html = `<main class="assistant-route-fallback"><div class="container"><div class="section-kicker">KOKEILE RESPONDOA</div><h1>Kokeile, miltä Respondo tuntuisi omassa yrityksessäsi.</h1><p>Lisää muutama yrityksesi tieto ja kysy sen jälkeen ihan samalla tavalla kuin asiakkaasi kysyisi.</p></div></main>`;
  else if (path === '/tilaus') html = signup();
  else if (path === '/kirjaudu') html = login();
  else if (path === '/app') html = await dashboard();
  else if (['/kayttoehdot', '/tietosuoja', '/evasteet', '/dpa', '/tietoturva'].includes(path)) html = legal(path.slice(1));
  else html = `<div>${nav()}<main class="notfound"><div class="container"><div class="section-kicker">404</div><h1>Tätä sivua ei löytynyt.</h1><a class="btn ink" href="/">Palaa etusivulle</a></div></main>${footer()}</div>`;

  $('#app').innerHTML = html;
  applyLanguage();
  bindLanguageSwitch();

  if (path === '/') {
    const jobSlider = $('#jobValueSlider');
    const missedSlider = $('#missedSlider');
    const euro = (n) => new Intl.NumberFormat('fi-FI', { maximumFractionDigits: 0 }).format(n) + ' €';

    const updateCalculator = () => {
      const job = Number(jobSlider?.value || 0);
      const missed = Number(missedSlider?.value || 0);
      const daily = job * missed;
      const monthly = daily * 30;
      const yearly = daily * 365;

      if ($('#jobValueOutput')) $('#jobValueOutput').textContent = euro(job);
      if ($('#missedOutput')) $('#missedOutput').textContent = String(missed);
      if ($('#dailyValue')) $('#dailyValue').textContent = euro(daily);
      if ($('#monthlyValue')) $('#monthlyValue').textContent = euro(monthly);
      if ($('#yearlyValue')) $('#yearlyValue').textContent = euro(yearly);

      const setRangeFill = (input) => {
        if (!input) return;
        const min = Number(input.min || 0);
        const max = Number(input.max || 100);
        const value = Number(input.value || 0);
        const pct = ((value - min) / Math.max(1, max - min)) * 100;
        input.style.setProperty('--range-progress', pct + '%');
      };
      setRangeFill(jobSlider);
      setRangeFill(missedSlider);
    };

    jobSlider?.addEventListener('input', updateCalculator);
    missedSlider?.addEventListener('input', updateCalculator);
    updateCalculator();
  }

  if (path === '/tilaus') {
    const oauthProvider = new URLSearchParams(location.search).get('oauth');
    if (oauthProvider) {
      api('/api/auth/oauth-profile')
        .then((profile) => {
          const form = $('#signup');
          if (!form) return;
          if (profile.name && !form.elements.fullName.value) form.elements.fullName.value = profile.name;
          form.elements.email.value = profile.email || '';
          form.elements.email.readOnly = true;
          form.elements.email.classList.add('oauth-locked');
          const passwordField = $('#signupPasswordField');
          if (passwordField) passwordField.hidden = true;
          if (form.elements.password) form.elements.password.required = false;
          const badge = document.createElement('div');
          badge.className = 'oauth-connected';
          badge.textContent = 'Google-tili yhdistetty · ' + profile.email;
          form.querySelector('.formgrid')?.before(badge);
        })
        .catch(() => {});
    }

    $('#signup')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = new FormData(e.currentTarget);
      const button = e.currentTarget.querySelector('button[type="submit"]');
      const original = button.innerHTML;
      button.disabled = true;
      button.innerHTML = 'Avataan maksusivua…';
      $('#msg').innerHTML = '';
      try {
        const result = await api('/api/auth/start-checkout', {
          method: 'POST',
          body: JSON.stringify({
            fullName: form.get('fullName'),
            email: form.get('email'),
            companyName: form.get('companyName'),
            businessId: form.get('businessId'),
            password: form.get('password'),
            plan: form.get('plan'),
            acceptedTerms: !!form.get('terms'),
          }),
        });
        location.href = result.url;
      } catch (err) {
        button.disabled = false;
        button.innerHTML = original;
        $('#msg').innerHTML = `<div class="notice error">${esc(err.message)}</div>`;
      }
    });
  }

  if (path === '/kirjaudu') {
    $('#login')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = new FormData(e.currentTarget);
      const button = e.currentTarget.querySelector('button[type="submit"]');
      const original = button.innerHTML;
      button.disabled = true;
      button.innerHTML = 'Kirjaudutaan sisään…';
      $('#msg').innerHTML = '';
      try {
        await api('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
        });
        location.href = '/app';
      } catch (err) {
        button.disabled = false;
        button.innerHTML = original;
        $('#msg').innerHTML = `<div class="notice error">${esc(err.message)}</div>`;
      }
    });
  }

  if (path === '/app') {
    $('#welcomeStart')?.addEventListener('click', () => {
      document.getElementById('business-profile')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState({}, '', '/app');
      $('#welcomeCard')?.classList.add('welcome-dismissed');
      setTimeout(() => $('#welcomeCard')?.remove(), 320);
    });

    document.querySelectorAll('.gap-jump').forEach((button) => {
      button.addEventListener('click', () => {
        document.getElementById('unanswered')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const question = button.dataset.gapQuestion;
        const match = $('.unanswered-item').find((item) => item.dataset.question === question);
        if (match) {
          match.classList.add('highlight-gap');
          setTimeout(() => match.classList.remove('highlight-gap'), 1800);
          match.querySelector('textarea')?.focus();
        }
      });
    });

    document.querySelectorAll('.onboarding-step').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.dataset.scrollTarget;
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    const previewHistory = [];
    const previewCompanyName = $('.workspace-chip b')?.textContent || 'Yritys';
    const previewFactsPromise = api('/api/app/dashboard')
      .then((d) => (d.knowledge || [])
        .filter((x) => x.category !== 'Yrityksen perustiedot')
        .map((x) => ({ key: x.title, answer: x.answer })))
      .catch(() => []);
    $('#previewForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = e.currentTarget.elements.question;
      const question = String(input?.value || '').trim();
      if (!question) return;
      const chat = $('#previewChat');
      chat?.insertAdjacentHTML('beforeend', '<div class="preview-bubble user"></div>');
      if (chat?.lastElementChild) chat.lastElementChild.textContent = question;
      input.value = '';

      chat?.insertAdjacentHTML('beforeend', '<div class="preview-bubble bot preview-thinking">Haetaan hyväksytyistä tiedoista…</div>');
      const bubble = chat?.lastElementChild;
      try {
        const profileForm = $('#businessProfileForm');
        const values = Object.fromEntries(new FormData(profileForm).entries());
        const customFacts = await previewFactsPromise;
        const result = await api('/api/public/demo-chat', {
          method: 'POST',
          body: JSON.stringify({
            message: question,
            profile: {
              companyName: previewCompanyName,
              greeting: values.greeting,
              tone: values.tone,
              pricing: values.pricing,
              hours: values.hours,
              phone: values.phone,
              email: values.email,
              services: values.services,
              serviceArea: values.serviceArea,
              address: values.address,
              website: values.website,
              quoteRequestUrl: values.quoteRequestUrl,
              notes: values.notes,
              customFacts,
            },
            history: previewHistory.slice(-6),
          }),
        });
        if (bubble) {
          bubble.classList.remove('preview-thinking');
          bubble.textContent = result.answer || 'En löydä tähän vielä varmaa vastausta.';
        }
        previewHistory.push({ question, answer: result.answer || '' });
        if (previewHistory.length > 8) previewHistory.splice(0, previewHistory.length - 8);
      } catch (err) {
        if (bubble) {
          bubble.classList.remove('preview-thinking');
          bubble.textContent = err.message || 'Vastaaminen epäonnistui. Yritä uudelleen.';
        }
      }
      if (chat) chat.scrollTop = chat.scrollHeight;
    });

    $('#installDone')?.addEventListener('click', (e) => {
      const tenantId = e.currentTarget.dataset.tenantId;
      localStorage.setItem('respondo-installed-' + tenantId, '1');
      e.currentTarget.classList.add('done');
      e.currentTarget.textContent = '✓ Asennus valmis';
    });

    document.querySelectorAll('.add-unanswered-answer').forEach((button) => {
      button.addEventListener('click', async () => {
        const item = button.closest('.unanswered-item');
        const answer = item?.querySelector('.unanswered-answer')?.value?.trim();
        const msg = item?.querySelector('.unanswered-msg');
        if (!answer) {
          if (msg) msg.innerHTML = '<div class="notice error">Kirjoita vastaus ensin.</div>';
          return;
        }
        const original = button.innerHTML;
        button.disabled = true;
        button.innerHTML = 'Tallennetaan…';
        try {
          await api('/api/app/unanswered/' + encodeURIComponent(item.dataset.id) + '/answer', {
            method: 'POST',
            body: JSON.stringify({ answer }),
          });
          item.classList.add('resolved');
          if (msg) msg.innerHTML = '<div class="notice success">Lisätty tietopohjaan ✓</div>';
          button.innerHTML = 'Tallennettu ✓';
          setTimeout(() => item.remove(), 900);
        } catch (err) {
          button.disabled = false;
          button.innerHTML = original;
          if (msg) msg.innerHTML = `<div class="notice error">${esc(err.message)}</div>`;
        }
      });
    });

    $('#importWebsite')?.addEventListener('click', async (e) => {
      const button = e.currentTarget;
      const formEl = $('#businessProfileForm');
      const website = formEl?.elements.website?.value?.trim();
      if (!website) {
        $('#businessProfileMsg').innerHTML = '<div class="notice error">Anna ensin verkkosivun osoite.</div>';
        formEl?.elements.website?.focus();
        return;
      }
      const original = button.textContent;
      button.disabled = true;
      button.textContent = 'Luetaan sivua…';
      $('#businessProfileMsg').innerHTML = '';
      try {
        const result = await api('/api/app/import-website', {
          method: 'POST',
          body: JSON.stringify({ website }),
        });
        const p = result.profile || {};
        ['pricing','hours','phone','email','services','serviceArea','address','website','quoteRequestUrl','notes'].forEach((name) => {
          if (p[name] && formEl?.elements[name]) formEl.elements[name].value = p[name];
        });
        $('#businessProfileMsg').innerHTML = '<div class="notice success">Tiedot haettu. Tarkista ehdotukset ja tallenna ne vasta sitten.</div>';
        button.textContent = 'Tiedot haettu ✓';
        setTimeout(() => { button.textContent = original; button.disabled = false; }, 1800);
      } catch (err) {
        button.disabled = false;
        button.textContent = original;
        $('#businessProfileMsg').innerHTML = `<div class="notice error">${esc(err.message)}</div>`;
      }
    });

    $('#businessProfileForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = new FormData(e.currentTarget);
      const button = e.currentTarget.querySelector('button[type="submit"]');
      const original = button.innerHTML;
      button.disabled = true;
      button.innerHTML = 'Tallennetaan…';
      $('#businessProfileMsg').innerHTML = '';
      try {
        await api('/api/app/business-profile', {
          method: 'POST',
          body: JSON.stringify({
            greeting: form.get('greeting'),
            tone: form.get('tone'),
            pricing: form.get('pricing'),
            hours: form.get('hours'),
            phone: form.get('phone'),
            email: form.get('email'),
            services: form.get('services'),
            serviceArea: form.get('serviceArea'),
            address: form.get('address'),
            website: form.get('website'),
            quoteRequestUrl: form.get('quoteRequestUrl'),
            notes: form.get('notes'),
          }),
        });
        $('#businessProfileMsg').innerHTML = '<div class="notice success">Yrityksen tiedot tallennettu. Botti käyttää nyt tallennettuja tietoja.</div>';
        button.disabled = false;
        button.innerHTML = 'Tallennettu ✓';
        setTimeout(() => (button.innerHTML = original), 1800);
      } catch (err) {
        button.disabled = false;
        button.innerHTML = original;
        $('#businessProfileMsg').innerHTML = `<div class="notice error">${esc(err.message)}</div>`;
      }
    });

    $('#knowledgeForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = new FormData(e.currentTarget);
      const button = e.currentTarget.querySelector('button[type="submit"]');
      const original = button.innerHTML;
      button.disabled = true;
      button.innerHTML = 'Tallennetaan…';
      try {
        await api('/api/app/knowledge', {
          method: 'POST',
          body: JSON.stringify({
            category: form.get('category') || 'Yleinen',
            title: form.get('title'),
            answer: form.get('answer'),
            keywords: form.get('keywords'),
          }),
        });
        $('#knowledgeMsg').innerHTML = '<div class="notice success">Tallennettu tietopohjaan.</div>';
        setTimeout(() => location.reload(), 450);
      } catch (err) {
        button.disabled = false;
        button.innerHTML = original;
        $('#knowledgeMsg').innerHTML = `<div class="notice error">${esc(err.message)}</div>`;
      }
    });

    $('#billingPortal')?.addEventListener('click', async (e) => {
      const button = e.currentTarget;
      const original = button.innerHTML;
      button.disabled = true;
      button.innerHTML = 'Avataan…';
      try {
        const result = await api('/api/billing/portal', { method: 'POST', body: '{}' });
        location.href = result.url;
      } catch (err) {
        button.disabled = false;
        button.innerHTML = original;
        alert(err.message);
      }
    });

    $('#logout')?.addEventListener('click', async () => {
      try { await api('/api/auth/logout', { method: 'POST', body: '{}' }); } catch {}
      location.href = '/';
    });

    $('#copyCode')?.addEventListener('click', async (e) => {
      const code = $('#installCode')?.innerText || '';
      try {
        await navigator.clipboard.writeText(code);
        e.currentTarget.textContent = 'Kopioitu ✓';
        setTimeout(() => (e.currentTarget.textContent = 'Kopioi'), 1400);
      } catch {
        e.currentTarget.textContent = 'Valitse ja kopioi';
      }
    });
  }
}

route();
