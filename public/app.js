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
  brand: 'Respondo',
  supportEmail: 'respondoai.fi@outlook.com',
  businessId: '3599437-5',
  sellerName: 'Respondo',
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
  return `<a class="logo" href="/" aria-label="Respondo etusivu">
    <span class="brand-mark" aria-hidden="true"><i></i><b></b></span>
    <span class="brand-word">Respondo</span>
  </a>`;
}

function nav() {
  return `<header class="nav">
    <div class="container navin">
      ${logo()}
      <nav class="navlinks" aria-label="Päänavigaatio">
        <a href="/#how">Tuote</a>
        <a href="/#control">Tietopohja</a>
        <a href="/#pricing">Hinta</a>
        <a href="/tietoturva">Tietoturva</a>
      </nav>
      <div class="navactions">
        <a class="btn ghost" href="/kirjaudu">Kirjaudu</a>
        <a class="btn ink" href="/tilaus">Kokeile maksutta</a>
      </div>
    </div>
  </header>`;
}

function footer() {
  return `<footer class="footer">
    <div class="container">
      <div class="foot-top">
        <div class="foot-brand">
          ${logo()}
          <p>Asiakaspalvelu, joka tietää vain sen minkä yrityksesi sille opettaa.</p>
          <div class="seller-chip">Respondo · Y-tunnus ${esc(cfg.businessId || '3599437-5')}</div>
        </div>
        <div class="foot-col">
          <h4>Tuote</h4>
          <a href="/#how">Tuote</a>
          <a href="/#control">Tietopohja</a>
          <a href="/#pricing">Hinta</a>
          <a href="/tilaus">Aloita kokeilu</a>
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
        <span>© ${new Date().getFullYear()} Respondo</span>
        <span>Y-tunnus ${esc(cfg.businessId || '3599437-5')} · B2B-ohjelmistopalvelu</span>
      </div>
    </div>
  </footer>`;
}

function heroVisual() {
  return `<div class="signal-console" aria-label="Respondo käyttöliittymäesimerkki">
    <div class="console-top">
      <div class="console-brand"><span class="pulse"></span> LIVE / RESPONDO</div>
      <div class="console-time">24/7</div>
    </div>
    <div class="console-grid">
      <aside class="console-rail">
        <span class="rail-label">CONTROL</span>
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
            <small>ASIAKASPALVELU / LIVE</small>
            <h3>Yksi vastaus. Oikeasta lähteestä.</h3>
          </div>
          <span class="verified">✓ hyväksytty tieto</span>
        </div>
        <div class="conversation">
          <div class="msg customer">
            <div class="msg-meta">ASIAKAS · 22:43</div>
            Paljonko huolto maksaa ja palveletteko myös viikonloppuna?
          </div>
          <div class="answer-card">
            <div class="answer-head">
              <span class="mini-mark">R</span>
              <b>Respondo</b>
              <span class="confidence">Lähde löydetty</span>
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
            <div><b>Ei riittävästi hyväksyttyä tietoa.</b><small>Respondo ei arvaa. Asiakas ohjataan jatkamaan ihmisen kanssa.</small></div>
          </div>
        </div>
        <div class="console-stats">
          <div><b>24/7</b><span>verkossa</span></div>
          <div><b>0</b><span>pakkoa keksiä</span></div>
          <div><b>1</b><span>hallittu tietopohja</span></div>
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
        <h2>Opeta kerran.<br><em>Respondo vastaa.</em></h2>
        <p>Lisää hinnat, palvelut, aukioloajat ja omat vastaukset. Respondo käyttää vain hyväksyttyä tietoa.</p>
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
          <h3>Respondo vastaa</h3>
          <p>Ja jos varmaa tietoa ei löydy, se ohjaa ihmiselle.</p>
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
        <h2>Sinä päätät.<br><em>AI vain vastaa.</em></h2>
        <p>Kaikki asiakkaalle kerrottava tieto pysyy yrityksesi hallinnassa.</p>
        <div class="control-list">
          <div><span>01</span><b>Helppo ylläpitää</b><small>Muuta tietoa yhdestä paikasta.</small></div>
          <div><span>02</span><b>Ei arvailua</b><small>Puuttuva tieto ei muutu keksityksi vastaukseksi.</small></div>
          <div><span>03</span><b>Helppo asentaa</b><small>Yksi asennusrivi verkkosivulle.</small></div>
        </div>
      </div>
      <div class="truth-card">
        <div class="truth-top"><span>KNOWLEDGE / 004</span><span class="truth-status">SYNCED</span></div>
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

function pricingSection() {
  return `<section class="section pricing-section" id="pricing">
    <div class="container">
      <div class="section-kicker">Hinta</div>
      <div class="split-head">
        <h2>Selkeä hinta.<br><em>Ei yllätyksiä.</em></h2>
        <p>Kokeile 3 päivää maksutta. Peruuta ennen kokeilun päättymistä, jos et halua jatkaa.</p>
      </div>
      <div class="pricing-wrap">
        <article class="price-card">
          <div class="price-top"><span>MONTHLY</span><span>joustava</span></div>
          <h3>Kuukausi</h3>
          <div class="pricevalue">49 €<small>/kk + alv</small></div>
          <div class="price-rule"></div>
          <ul>
            <li>Verkkosivun chat-widget</li>
            <li>Yrityksen oma tietopohja</li>
            <li>Keskustelujen tilastot</li>
            <li>Epävarmojen tilanteiden jatko-ohje</li>
            <li>Tilauksen hallinta Stripessä</li>
          </ul>
          <a class="btn price-btn" href="/tilaus?plan=monthly">Kokeile 3 päivää maksutta</a>
        </article>
        <article class="price-card featured">
          <div class="price-top"><span>YEARLY</span><span class="save">säästä 39 €</span></div>
          <h3>Vuosi</h3>
          <div class="pricevalue">549 €<small>/vuosi + alv</small></div>
          <div class="price-rule"></div>
          <ul>
            <li>Samat ominaisuudet kuin kuukausitilauksessa</li>
            <li>Yksi vuosiveloitus</li>
            <li>3 päivän maksuton kokeilu</li>
            <li>Peruuta milloin tahansa</li>
            <li>Käyttö jatkuu maksetun kauden loppuun</li>
          </ul>
          <a class="btn price-btn blue" href="/tilaus?plan=yearly">Valitse vuositilaus <span>→</span></a>
        </article>
      </div>
    </div>
  </section>`;
}

async function home() {
  await config();
  return `<div>
    ${nav()}
    <main>
      <section class="hero">
        <div class="hero-glow"></div>
        <div class="container hero-grid">
          <div class="hero-copy">
            <div class="hero-label"><span></span> RESPONDO · AI-ASIAKASPALVELU YRITYKSILLE</div>
            <h1>Vastaa asiakkaalle. <em>Heti.</em></h1>
            <p class="lead">Respondo vastaa 24/7 yrityksesi omalla tiedolla. Kun vastausta ei tiedetä, se ei arvaa.</p>
            <div class="hero-actions">
              <a class="btn hero-primary" href="/tilaus">Kokeile 3 päivää maksutta</a>
              <a class="text-link" href="#how">Tutustu tuotteeseen <span>↓</span></a>
            </div>
            <div class="trust-row">
              <span><i>✓</i> 3 päivää maksutta</span>
              <span><i>✓</i> Peruuta milloin tahansa</span>
              <span><i>✓</i> 49 €/kk + alv</span>
            </div>
          </div>
          ${heroVisual()}
        </div>
        <div class="hero-marquee" aria-hidden="true">
          <div>TIETOPOHJA <span>•</span> VASTAUKSET <span>•</span> EPÄVARMUUS <span>•</span> 24/7 <span>•</span> TIETOPOHJA <span>•</span> VASTAUKSET <span>•</span> EPÄVARMUUS <span>•</span> 24/7</div>
        </div>
      </section>
      ${workflow()}
      ${controlSection()}
      ${proofStrip()}
      ${pricingSection()}
      <section class="section final-cta">
        <div class="container">
          <div class="cta-shell">
            <div>
              <div class="section-kicker light">RESPONDO</div>
              <h2>Valmis vastaamaan.</h2>
              <p>3 päivää maksutta. Käyttöönotto vie vain hetken.</p>
            </div>
            <a class="cta-circle" href="/tilaus" aria-label="Aloita kokeilu"><span>KOKEILE</span><b>→</b></a>
          </div>
        </div>
      </section>
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
          <div class="section-kicker">ALOITA RESPONDO</div>
          <h1>Kokeile ensin.<br><em>Päätä sitten.</em></h1>
          <p>Luo tili ja lisää maksutapa turvallisesti Stripessä. Veloitus alkaa vasta kokeilun jälkeen.</p>
          <div class="checkout-steps">
            <div><span>01</span><b>Luo tili</b><small>Yrityksen perustiedot ja salasana.</small></div>
            <div><span>02</span><b>Lisää maksutapa</b><small>Stripe käsittelee maksutiedot.</small></div>
            <div><span>03</span><b>Rakenna tietopohja</b><small>Lisää yrityksesi hyväksytyt vastaukset.</small></div>
          </div>
          <div class="seller-card">
            <span>PALVELUNTARJOAJA</span>
            <b>${esc(cfg.sellerName || 'Respondo')}</b>
            <small>Y-tunnus ${esc(cfg.businessId || '3599437-5')} · Suomi</small>
          </div>
        </section>
        <form class="formcard premium-form" id="signup">
          <div class="form-head"><span>UUSI TILI</span><b>3 päivää maksutta</b></div>
          <div class="formgrid">
            <div class="field"><label>Nimi</label><input name="fullName" autocomplete="name" required placeholder="Etunimi Sukunimi"></div>
            <div class="field"><label>Sähköposti</label><input name="email" type="email" autocomplete="email" required placeholder="sinä@yritys.fi"></div>
            <div class="field"><label>Yritys</label><input name="companyName" required placeholder="Yrityksen nimi"></div>
            <div class="field"><label>Y-tunnus</label><input name="businessId" placeholder="1234567-8"></div>
            <div class="field full"><label>Salasana</label><input name="password" type="password" minlength="10" autocomplete="new-password" required placeholder="Vähintään 10 merkkiä"></div>
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
          <button class="btn checkout-button" type="submit">Jatka Stripe Checkoutiin <span>→</span></button>
          <div class="form-security"><span>◈</span> Maksukorttitiedot käsittelee Stripe. Respondo ei tallenna korttinumeroasi.</div>
          <div id="msg"></div>
        </form>
      </div>
    </main>
    ${footer()}
  </div>`;
}

function login() {
  return `<div>
    ${nav()}
    <main class="formpage login-page">
      <div class="container login-layout">
        <section class="login-copy">
          <div class="section-kicker">RESPONDO CONTROL</div>
          <h1>Tervetuloa<br><em>takaisin.</em></h1>
          <p>Hallitse tietopohjaa, asennusta ja tilausta yhdestä paikasta.</p>
          <div class="login-signal"><span></span> Hallintapaneeli suojattu kirjautumisella</div>
        </section>
        <form class="formcard premium-form login-card" id="login">
          <div class="form-head"><span>KIRJAUDU</span><b>Tervetuloa takaisin</b></div>
          <div class="field"><label>Sähköposti</label><input name="email" type="email" autocomplete="email" required placeholder="sinä@yritys.fi"></div>
          <div class="field"><label>Salasana</label><input name="password" type="password" autocomplete="current-password" required placeholder="••••••••••"></div>
          <button class="btn checkout-button" type="submit">Avaa hallintapaneeli <span>→</span></button>
          <div id="msg"></div>
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
    intro: 'Nämä ehdot koskevat Respondon yritysasiakkaille tarjottavaa ohjelmistopalvelua.',
    sections: [
      ['1. Palveluntarjoaja', `Respondo, Y-tunnus ${cfg.businessId || '3599437-5'}, Suomi. Yhteydenotot: ${cfg.supportEmail}.`],
      ['2. Palvelu', 'Respondo on verkkopohjainen B2B-ohjelmistopalvelu, jonka avulla yritys voi ylläpitää hyväksyttyä tietopohjaa ja tarjota verkkosivullaan automatisoituja asiakasvastauksia.'],
      ['3. Kokeilu ja tilaus', `Palveluun sisältyy ${cfg.trialDays || 3} päivän maksuton kokeilu. Maksutapa lisätään kokeilun alussa. Tilaus muuttuu maksulliseksi kokeilun päätyttyä, ellei sitä peruta ennen veloitusta.`],
      ['4. Hinnat ja verot', `Kuukausitilaus on ${cfg.monthlyNet || 49} €/kk + sovellettava arvonlisävero. Vuositilaus on ${cfg.yearlyNet || 549} €/vuosi + sovellettava arvonlisävero.`],
      ['5. Peruminen', 'Tilauksen voi perua. Kun jo maksettu laskutuskausi on alkanut, käyttö jatkuu kauden loppuun, ellei pakottavasta lainsäädännöstä muuta johdu.'],
      ['6. Asiakkaan vastuu', 'Asiakas vastaa palveluun syöttämänsä tiedon oikeellisuudesta, käyttöoikeuksista sekä siitä, että palvelua käytetään lain ja näiden ehtojen mukaisesti.'],
      ['7. Palvelun saatavuus', 'Palvelua kehitetään jatkuvasti. Huollot, palveluntarjoajien häiriöt tai muut tekniset syyt voivat aiheuttaa katkoksia.'],
    ],
  },
  tietosuoja: {
    label: 'LAKIASIAT / 02',
    title: 'Tietosuojaseloste',
    intro: 'Tässä kuvataan, mitä tietoja Respondo käsittelee palvelun tarjoamiseksi.',
    sections: [
      ['Rekisterinpitäjä', `Respondo, Y-tunnus ${cfg.businessId || '3599437-5'}. Tietosuoja- ja muut yhteydenotot: ${cfg.supportEmail}.`],
      ['Käsiteltävät tiedot', 'Käyttäjätilin tiedot, yrityksen yhteystiedot, Y-tunnus, laskutukseen liittyvät tunnisteet, palveluun syötetty tietopohja sekä chat-palvelun kautta syntyvät keskustelutiedot.'],
      ['Käyttötarkoitukset', 'Palvelun toteuttaminen, käyttäjän tunnistaminen, tilauksen hallinta, asiakastuki, väärinkäytösten ehkäisy ja palvelun tekninen ylläpito.'],
      ['Maksut', 'Maksukorttitiedot käsittelee Stripe omien ehtojensa mukaisesti. Respondo ei tallenna varsinaista korttinumeroa omaan tietokantaansa.'],
      ['Palveluntarjoajat', 'Palvelun teknisessä toteutuksessa käytetään ulkopuolisia infrastruktuuri-, tietokanta-, maksu- ja AI-palveluntarjoajia. Tietoja voidaan käsitellä niiden sopimusehtojen ja sovellettavan tietosuojalainsäädännön mukaisesti.'],
      ['Säilytys', 'Tietoja säilytetään vain niin kauan kuin niitä tarvitaan palvelun toteuttamiseen, sopimusvelvoitteisiin, tietoturvaan tai lakisääteisiin velvoitteisiin.'],
    ],
  },
};

LEGAL['evasteet'] = {
  label: 'LAKIASIAT / 03',
  title: 'Evästeet',
  intro: 'Respondo käyttää tällä hetkellä vain palvelun toiminnan kannalta välttämättömiä evästeitä.',
  sections: [
    ['Istuntoeväste', 'Kirjautumisen yhteydessä selaimeen asetetaan suojattu istuntoeväste, jolla käyttäjä pidetään kirjautuneena hallintapaneeliin.'],
    ['Markkinointievästeet', 'Respondon markkinointisivulla ei ole oletuksena käytössä ei-välttämättömiä analytiikka- tai mainosevästeitä.'],
    ['Maksaminen', 'Stripe Checkout voi käyttää omia evästeitään maksamisen, petosten torjunnan ja Link-pikamaksun toteuttamiseksi.'],
  ],
};

LEGAL.dpa = {
  label: 'LAKIASIAT / 04',
  title: 'Tietojenkäsittely',
  intro: 'Kun Respondo käsittelee yritysasiakkaan puolesta henkilötietoja, asiakas toimii lähtökohtaisesti rekisterinpitäjänä ja Respondo käsittelijänä.',
  sections: [
    ['Käsittelyn kohde', 'Käsittely liittyy palvelun käyttämiseen, yrityksen tietopohjaan sekä verkkosivun chatissa käsiteltäviin viesteihin.'],
    ['Ohjeet', 'Respondo käsittelee asiakkaan puolesta tietoja palvelun toteuttamiseksi ja asiakkaan dokumentoitujen ohjeiden mukaisesti.'],
    ['Luottamuksellisuus ja turvallisuus', 'Pääsy tuotantoympäristöihin ja salaisuuksiin rajataan tarpeen mukaan. Salasanoja ei tallenneta selväkielisinä.'],
    ['Alikäsittelijät', 'Palvelu nojaa infrastruktuuri-, tietokanta-, maksu- ja AI-palveluntarjoajiin.'],
  ],
};

LEGAL.tietoturva = {
  label: 'TRUST / SECURITY',
  title: 'Tietoturva',
  intro: 'Respondon tavoite on minimoida turha tiedonkäsittely ja pitää palvelun kriittiset salaisuudet erillään selaimesta.',
  sections: [
    ['HTTPS', 'Tuotantopalvelu toimitetaan salatun HTTPS-yhteyden kautta.'],
    ['Salasanat', 'Käyttäjien salasanat tallennetaan yksisuuntaisesti hajautettuina, ei selväkielisinä.'],
    ['API-avaimet', 'Maksu-, tietokanta- ja AI-palveluiden salaiset avaimet säilytetään palvelimen ympäristömuuttujissa eikä niitä toimiteta selaimelle.'],
    ['Tietopohjaperiaate', 'Asiakasvastaukset on suunniteltu nojaamaan yrityksen hyväksyttyyn tietopohjaan. Kun varmaa tietoa ei löydy, palvelu voi palauttaa jatko-ohjeen arvauksen sijaan.'],
    ['Yhteydenotot', `Tietoturvaan liittyvät ilmoitukset: ${cfg.supportEmail}.`],
  ],
};

function legal(type) {
  const page = LEGAL[type] || {
    label: 'RESPONDO',
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
          <div class="legal-seller"><span>PALVELUNTARJOAJA</span><b>Respondo</b><small>Y-tunnus ${esc(cfg.businessId || '3599437-5')}</small></div>
        </aside>
        <article class="legalcopy">
          ${page.sections.map(([h, p]) => `<section><h2>${h}</h2><p>${p}</p></section>`).join('')}
          <section><h2>Yhteydenotot</h2><p><a href="mailto:${esc(cfg.supportEmail)}">${esc(cfg.supportEmail)}</a></p></section>
          <div class="legal-note">Päivitetty ${new Date().toLocaleDateString('fi-FI')}. Teksti kuvaa Respondon tämänhetkistä palvelua ja sitä voidaan päivittää palvelun kehittyessä.</div>
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

  return `<div class="appshell">
    <aside class="appside">
      ${logo()}
      <div class="workspace-chip"><span></span><div><small>TYÖTILA</small><b>${esc(t.name)}</b></div></div>
      <nav class="appnav">
        <a href="#overview" class="active"><span>⌂</span> Yleiskatsaus</a>
        <a href="#business-profile"><span>✦</span> Yrityksen tiedot</a>
        <a href="#knowledge"><span>≡</span> Tietopohja <em>${knowledge.length}</em></a>
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
        <div><div class="section-kicker">RESPONDO CONTROL</div><h1>${esc(t.name)}</h1><p>Pidä yrityksesi asiakaspalvelutieto yhdessä hallitussa paikassa.</p></div>
        <div class="live-chip"><span></span> Palvelu aktiivinen</div>
      </section>

      <section class="stats">
        <article class="stat"><small>KESKUSTELUT</small><b>${s.conversations}</b><span>yhteensä</span></article>
        <article class="stat"><small>VASTATTU</small><b>${s.answeredRate}%</b><span>ilman jatko-ohjetta</span></article>
        <article class="stat"><small>JATKO-OHJE</small><b>${s.handoffRate}%</b><span>epävarmoissa tilanteissa</span></article>
      </section>

      <section class="panel business-profile-panel" id="business-profile">
        <div class="panel-head business-profile-head">
          <div>
            <small>YRITYKSEN TIEDOT</small>
            <h2>Opeta Respondolle yrityksesi perusasiat</h2>
            <p>Täytä nämä kerran. Respondo käyttää niitä asiakkaiden kysymyksiin vastaamiseen.</p>
          </div>
          <span class="install-badge">Perustiedot</span>
        </div>
        <form id="businessProfileForm" class="business-profile-form">
          <div class="profile-grid">
            <div class="field profile-wide">
              <label>Hinnat / hinnoittelu</label>
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
            <div class="field">
              <label>Verkkosivu</label>
              <input name="website" value="${profileValue('Verkkosivu')}" placeholder="https://yritys.fi">
            </div>
            <div class="field profile-wide">
              <label>Mitä palveluja teette?</label>
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
              <b>Nämä muuttuvat automaattisesti botin hyväksytyksi tietopohjaksi.</b>
              <small>Voit muokata tietoja myöhemmin koska tahansa.</small>
            </div>
            <button class="btn dashboard-action profile-save" type="submit">Tallenna yrityksen tiedot <span>→</span></button>
          </div>
          <div id="businessProfileMsg"></div>
        </form>
      </section>

      <section class="dashboard-grid" id="knowledge">
        <div class="panel knowledge-panel">
          <div class="panel-head"><div><small>TIETOPOHJA</small><h2>Hyväksytyt vastaukset</h2></div><span>${knowledge.length} kohdetta</span></div>
          <div id="knowledgeList" class="knowledge-list">
            ${knowledge.length ? knowledge.map((x, i) => `<div class="knowledge-item"><span class="knum">${String(i + 1).padStart(2, '0')}</span><div><b>${esc(x.title)}</b><small>${esc(x.category || 'Yleinen')}</small><p>${esc(x.answer)}</p></div><span class="approved">✓</span></div>`).join('') : `<div class="empty-state"><b>Tietopohja on vielä tyhjä.</b><p>Lisää ensimmäinen hyväksytty vastaus oikealta.</p></div>`}
          </div>
        </div>

        <form class="panel add-knowledge" id="knowledgeForm">
          <div class="panel-head"><div><small>UUSI TIETO</small><h2>Lisää vastaus</h2></div><span>＋</span></div>
          <div class="field"><label>Kategoria</label><input name="category" placeholder="Esim. Hinnoittelu"></div>
          <div class="field"><label>Otsikko</label><input name="title" required placeholder="Mitä asiakas kysyy?"></div>
          <div class="field"><label>Hyväksytty vastaus</label><textarea name="answer" required placeholder="Kirjoita vastaus täsmällisesti sellaisena kuin asiakkaalle saa kertoa."></textarea></div>
          <div class="field"><label>Avainsanat</label><input name="keywords" placeholder="hinta, maksaa, tarjous"></div>
          <button class="btn dashboard-action" type="submit">Tallenna tietopohjaan <span>→</span></button>
          <div id="knowledgeMsg"></div>
        </form>
      </section>

      <section class="panel install-panel" id="install">
        <div class="panel-head"><div><small>ASENNUS</small><h2>Lisää Respondo verkkosivulle</h2></div><span class="install-badge">1 rivi</span></div>
        <p>Liitä tämä koodi sivustosi HTML:ään juuri ennen sulkevaa <code>&lt;/body&gt;</code>-tagia.</p>
        <div class="code-row"><code id="installCode">&lt;script src="${location.origin}/widget.js" data-company="${esc(t.slug)}"&gt;&lt;/script&gt;</code><button type="button" id="copyCode">Kopioi</button></div>
      </section>

      <section class="panel billing-panel" id="billing">
        <div><small>LASKUTUS</small><h2>Tilauksen hallinta</h2><p>Muuta maksutapaa, tarkastele laskutusta tai hallitse tilausta turvallisesti Stripen asiakasportaalissa.</p></div>
        <button class="btn dashboard-action" id="billingPortal" type="button">Avaa Stripe-portaali <span>↗</span></button>
      </section>
    </main>
  </div>`;
}

async function route() {
  await config();
  const path = location.pathname;
  let html;

  if (path === '/') html = await home();
  else if (path === '/assistant') html = `<main class="assistant-route-fallback"><div class="container"><div class="section-kicker">RESPONDO / TEST</div><h1>Respondo Assistant</h1><p>Avataan testibotti…</p></div></main>`;
  else if (path === '/tilaus') html = signup();
  else if (path === '/kirjaudu') html = login();
  else if (path === '/app') html = await dashboard();
  else if (['/kayttoehdot', '/tietosuoja', '/evasteet', '/dpa', '/tietoturva'].includes(path)) html = legal(path.slice(1));
  else html = `<div>${nav()}<main class="notfound"><div class="container"><div class="section-kicker">404</div><h1>Sivua ei löytynyt.</h1><a class="btn ink" href="/">Takaisin etusivulle</a></div></main>${footer()}</div>`;

  $('#app').innerHTML = html;

  if (path === '/tilaus') {
    $('#signup')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = new FormData(e.currentTarget);
      const button = e.currentTarget.querySelector('button[type="submit"]');
      const original = button.innerHTML;
      button.disabled = true;
      button.innerHTML = 'Avataan Stripe Checkout…';
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
      button.innerHTML = 'Kirjaudutaan…';
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
            pricing: form.get('pricing'),
            hours: form.get('hours'),
            phone: form.get('phone'),
            email: form.get('email'),
            services: form.get('services'),
            serviceArea: form.get('serviceArea'),
            address: form.get('address'),
            website: form.get('website'),
            notes: form.get('notes'),
          }),
        });
        $('#businessProfileMsg').innerHTML = '<div class="notice success">Yrityksen tiedot tallennettu. Respondo käyttää niitä nyt tietopohjassa.</div>';
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
