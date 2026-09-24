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

const BOT_AVATAR_PRESETS = [
  ['robot-1','Nova','#111114','#ffffff','#63e6a5'],
  ['robot-2','Bolt','#172554','#dbeafe','#60a5fa'],
  ['robot-3','Pixel','#3f1d58','#f3e8ff','#d8b4fe'],
  ['robot-4','Orbit','#3b2417','#fff7ed','#fb923c'],
  ['robot-5','Mint','#123b35','#ecfdf5','#5eead4'],
  ['robot-6','Luna','#292524','#fafaf9','#facc15'],
  ['robot-7','Echo','#3f1722','#fff1f2','#fb7185'],
  ['robot-8','Astra','#182235','#f8fafc','#a5b4fc'],
  ['robot-9','Rex','#26331d','#f7fee7','#a3e635'],
  ['robot-10','Neo','#27272a','#fafafa','#e4e4e7'],
].map(([id,label,bg,face,accent],i) => ({ id,label,bg,face,accent,i }));

function botAvatarMarkup(value, extraClass = '') {
  const raw = String(value || 'robot-1');
  if (/^data:image\/(?:png|jpeg|webp);base64,/i.test(raw)) {
    return '<img class="' + esc(extraClass) + '" src="' + esc(raw) + '" alt="">';
  }
  const p = BOT_AVATAR_PRESETS.find((x) => x.id === raw) || BOT_AVATAR_PRESETS[0];
  const v = p.i % 5;
  const eyes = v === 0
    ? '<circle cx="24" cy="31" r="3.2"/><circle cx="40" cy="31" r="3.2"/>'
    : v === 1
      ? '<rect x="20" y="28" width="8" height="5" rx="2.5"/><rect x="36" y="28" width="8" height="5" rx="2.5"/>'
      : v === 2
        ? '<path d="M20 31h8M36 31h8" stroke-width="4" stroke-linecap="round"/>'
        : v === 3
          ? '<circle cx="24" cy="31" r="2.4"/><circle cx="40" cy="31" r="2.4"/><circle cx="24" cy="31" r="5.2" fill="none" stroke-width="1.5"/><circle cx="40" cy="31" r="5.2" fill="none" stroke-width="1.5"/>'
          : '<path d="M20 30l4-2 4 2M36 30l4-2 4 2" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';
  const mouth = p.i % 3 === 0
    ? '<rect x="25" y="40" width="14" height="4" rx="2"/>'
    : p.i % 3 === 1
      ? '<path d="M25 40c4 5 10 5 14 0" fill="none" stroke-width="2.5" stroke-linecap="round"/>'
      : '<circle cx="32" cy="41" r="3" fill="none" stroke-width="2"/>';
  const antenna = p.i % 2 === 0
    ? '<path d="M32 17v-6" stroke="' + p.accent + '" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="9" r="3" fill="' + p.accent + '"/>'
    : '<path d="M24 17l-4-5M40 17l4-5" stroke="' + p.accent + '" stroke-width="3" stroke-linecap="round"/><circle cx="19" cy="11" r="2.5" fill="' + p.accent + '"/><circle cx="45" cy="11" r="2.5" fill="' + p.accent + '"/>';
  return '<svg class="' + esc(extraClass) + '" viewBox="0 0 64 64" aria-hidden="true">' +
    '<rect width="64" height="64" rx="18" fill="' + p.bg + '"/>' +
    antenna +
    '<rect x="13" y="17" width="38" height="35" rx="12" fill="' + p.face + '"/>' +
    '<g fill="' + p.bg + '" stroke="' + p.bg + '">' + eyes + mouth + '</g>' +
    '<rect x="9" y="28" width="5" height="13" rx="2.5" fill="' + p.accent + '"/>' +
    '<rect x="50" y="28" width="5" height="13" rx="2.5" fill="' + p.accent + '"/>' +
    '</svg>';
}

async function imageFileToAvatarData(file) {
  if (!file || !/^image\/(png|jpeg|webp)$/i.test(file.type)) {
    throw new Error('Valitse PNG-, JPG- tai WebP-kuva.');
  }
  if (file.size > 10 * 1024 * 1024) throw new Error('Kuva on liian suuri. Maksimi on 10 Mt.');

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = objectUrl;
    await new Promise((resolve,reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('Kuvaa ei voitu lukea.'));
    });
    const side = Math.min(img.naturalWidth,img.naturalHeight);
    const sx = Math.max(0,(img.naturalWidth-side)/2);
    const sy = Math.max(0,(img.naturalHeight-side)/2);
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img,sx,sy,side,side,0,0,256,256);
    let data = canvas.toDataURL('image/webp',0.84);
    if (!data.startsWith('data:image/webp')) data = canvas.toDataURL('image/jpeg',0.84);
    if (data.length > 500000) throw new Error('Kuva jäi liian suureksi. Kokeile toista kuvaa.');
    return data;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

let cfg = {
  brand: 'RESPONDO AI',
  supportEmail: 'respondoai.fi@outlook.com',
  businessId: '3599437-5',
  sellerName: 'RESPONDO AI',
  trialDays: 3,
  monthlyNet: 49.99,
  yearlyNet: 539.88,
};

async function api(url, options = {}) {
  options.headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    let message = data.error || `HTTP ${response.status}`;
    const lang = currentLang();
    if (lang !== 'fi' && data.error && url !== '/api/i18n/translate') {
      const map = lang === 'sv' ? SV_TEXT : EN_TEXT;
      if (map?.has(message)) message = map.get(message);
      else {
        try {
          const trResponse = await fetch('/api/i18n/translate', {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({ lang, texts:[message] })
          });
          if (trResponse.ok) {
            const trData = await trResponse.json();
            if (trData?.translations?.[0]) message = trData.translations[0];
          }
        } catch {}
      }
    }
    throw new Error(message);
  }
  return data;
}

async function config() {
  try {
    cfg = { ...cfg, ...(await api('/api/public/config')) };
  } catch {}
  return cfg;
}

function logo() {
  return `<a class="logo" href="/" aria-label="${esc(appText('RESPONDO AI etusivu','RESPONDO AI startsida','RESPONDO AI home'))}">
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
  const queryLang = new URLSearchParams(location.search).get('lang');
  if (['fi','sv','en'].includes(queryLang)) {
    if (localStorage.getItem('respondo_lang') !== queryLang) localStorage.setItem('respondo_lang', queryLang);
    if (window.RespondoI18n?.language !== queryLang) window.RespondoI18n?.setLanguage?.(queryLang);
    return queryLang;
  }
  const fromShared = window.RespondoI18n?.language;
  if (['fi','sv','en'].includes(fromShared)) return fromShared;
  const saved = localStorage.getItem('respondo_lang');
  return ['fi','sv','en'].includes(saved) ? saved : 'fi';
}

function languageSwitch() {
  const lang = window.RespondoI18n?.language || localStorage.getItem('respondo_lang') || 'fi';
  const label = appText('Kieli','Språk','Language');
  return `<label class="app-language-switch" aria-label="${esc(label)}">
    <select data-lang-select aria-label="${esc(label)}">
      <option value="fi" ${lang === 'fi' ? 'selected' : ''}>FI</option>
      <option value="sv" ${lang === 'sv' ? 'selected' : ''}>SV</option>
      <option value="en" ${lang === 'en' ? 'selected' : ''}>EN</option>
    </select>
  </label>`;
}

const APP_LOCALES = { fi:'fi-FI', sv:'sv-SE', en:'en-GB' };
function appLocale() { return APP_LOCALES[currentLang()] || 'fi-FI'; }
function appText(fi, sv, en) {
  const lang = currentLang();
  return lang === 'sv' ? (sv ?? fi) : lang === 'en' ? (en ?? fi) : fi;
}

const EN_TEXT = new Map(Object.entries({
  "Päänavigaatio":"Main navigation",
  "Kirjaudu":"Sign in",
  "Ota yhteyttä":"Contact us",
  "Kokeile ilmaiseksi":"Try for free",
  "Käyttöehdot":"Terms of service",
  "Evästeet":"Cookies",
  "Tietojenkäsittely":"Data processing",
  "Yritys":"Company",
  "Respondo AI on yrityksille tarkoitettu asiakaspalvelu- ja ajanvarauspalvelu. Palveluun voi kuulua verkkosivubotti, yrityksen tietopohja, asiakasviestien käsittely, tarjous- ja yhteydenottopyynnöt, ajanvaraukset, SMS-toiminnot sekä asiakkaan erikseen yhdistämät ulkopuoliset palvelut, kuten Google Calendar. Käytettävissä olevat ominaisuudet voivat riippua asiakkaan asetuksista ja tilauksesta.":"Respondo AI is a customer-service and booking service for businesses. The service may include a website bot, the company's knowledge base, customer-message handling, quote and contact requests, bookings, SMS features, and external services separately connected by the customer, such as Google Calendar. Available features may depend on the customer's settings and subscription.",
  "Respondo AI tuottaa asiakasvastauksia yrityksen palveluun lisäämien tietojen ja käytössä olevien toimintojen perusteella. Automaattinen vastaus voi olla virheellinen tai puutteellinen, joten asiakasyritys vastaa omien tietojensa oikeellisuudesta ja siitä, missä tilanteissa automaattisia vastauksia käytetään. Palvelua ei tule käyttää lainvastaisiin tarkoituksiin tai sellaisiin korkean riskin päätöksiin, joissa automaattinen vastaus yksin voi aiheuttaa olennaista vahinkoa.":"Respondo AI generates customer responses based on information added by the company and the features in use. An automated response may be incorrect or incomplete, so the business customer is responsible for the accuracy of its information and for deciding when automated responses are used. The service must not be used for unlawful purposes or high-risk decisions where an automated response alone could cause material harm.",
  "Palvelun toteuttamisessa voidaan käyttää infrastruktuuri-, tietokanta-, maksu-, viestintä- ja tekoälypalveluntarjoajia. Tietoja luovutetaan niille vain siinä laajuudessa kuin kyseisen toiminnon toteuttaminen edellyttää ja sovellettavien sopimusten sekä tietosuojavaatimusten mukaisesti.":"Infrastructure, database, payment, communications, and AI service providers may be used to provide the service. Data is disclosed to them only to the extent required for the relevant function and in accordance with applicable agreements and data-protection requirements.",
  "Osa palveluntarjoajista voi käsitellä tietoja Euroopan talousalueen ulkopuolella. Tällöin siirroissa käytetään sovellettavan tietosuojalainsäädännön edellyttämiä suojatoimia, kuten Euroopan komission hyväksymiä vakiosopimuslausekkeita, kun niitä tarvitaan.":"Some service providers may process data outside the European Economic Area. In such cases, safeguards required by applicable data-protection law are used, such as European Commission standard contractual clauses where needed.",
  "Tietoja säilytetään vain niin kauan kuin niitä tarvitaan palvelun toimittamiseen, sopimus- ja kirjanpitovelvoitteiden hoitamiseen, tietoturvaan tai lakisääteisiin velvoitteisiin. Tarpeettomat tiedot poistetaan tai anonymisoidaan kohtuullisessa ajassa. Google-käyttäjädatasta ei tehdä pysyvää kopiota muihin tarkoituksiin.":"Data is retained only as long as needed to provide the service, meet contractual and accounting obligations, maintain security, or satisfy legal obligations. Unnecessary data is deleted or anonymized within a reasonable time. No permanent copy of Google user data is made for other purposes.",
  "Respondon markkinointisivun oma kävijätilastointi toteutetaan palvelinpuolella. Se käynnistyy vain käyttäjän hyväksynnän jälkeen. Tilastointiin tallennetaan pseudonyymi kävijätunniste, sivupolku, viittaava verkkotunnus ja mahdolliset UTM-kampanjatiedot. Raakaa IP-osoitetta ei tallenneta kävijätilastotauluun.":"Respondo's own visitor analytics for the marketing site is implemented server-side and starts only after user consent. A pseudonymous visitor identifier, page path, referring domain, and any UTM campaign data are stored. The raw IP address is not stored in the visitor analytics table.",
  "Käyttäjä voi hyväksyä tai hylätä valinnaisen analytiikan evästebannerissa ja muuttaa valintaansa myöhemmin sivuston alatunnisteen Evästeasetukset-linkistä. Valinta tallennetaan selaimeen, jotta samaa kysymystä ei tarvitse esittää jokaisella sivulatauksella.":"The user can accept or reject optional analytics in the cookie banner and later change the choice through the Cookie settings link in the footer. The choice is stored in the browser so the same question does not need to be shown on every page load.",
  "Käsittely liittyy Respondo AI -palvelun tarjoamiseen sopimuksen voimassaolon ajan ja tarvittavan poistumisajan sen jälkeen. Käsittely voi koskea yrityksen palveluun lisäämiä tietoja sekä loppuasiakkaiden chat-, yhteydenotto-, SMS-, tarjous- ja ajanvaraustietoja.":"Processing relates to providing the Respondo AI service during the agreement and the necessary deletion period afterward. Processing may cover information added by the company as well as end-customer chat, contact, SMS, quote, and booking data.",

  "Luottamuksellisuus ja turvallisuus":"Confidentiality and security",
  "Henkilötietoja käsitteleviä tahoja sitoo asianmukainen luottamuksellisuus. Pääsy tuotantoympäristöihin ja salaisiin tietoihin rajataan tarpeen mukaan. Salasanoja ei tallenneta selväkielisinä ja ulkoisten palvelujen tunnisteita suojataan teknisin keinoin.":"Parties processing personal data are subject to appropriate confidentiality. Access to production environments and secrets is restricted as necessary. Passwords are not stored in plaintext and external-service credentials are protected using technical measures.",
  "Palvelun taustalla voidaan käyttää infrastruktuuri-, tietokanta-, maksu-, viestintä-, Google Workspace- ja tekoälypalveluntarjoajia siltä osin kuin palvelun toteuttaminen niitä edellyttää.":"Infrastructure, database, payment, communications, Google Workspace, and AI service providers may be used to the extent required to provide the service.",
  "Respondo avustaa kohtuullisessa määrin yritysasiakasta rekisteröityjen pyyntöjen, tietoturvaloukkausten ja sovellettavien tietosuojavelvoitteiden hoitamisessa siltä osin kuin asia koskee Respondon käsittelemiä tietoja.":"Respondo reasonably assists the business customer with data-subject requests, personal-data breaches, and applicable data-protection obligations insofar as they concern data processed by Respondo.",
  "Sopimuksen päättyessä henkilötiedot poistetaan tai palautetaan asiakkaan pyynnön ja sovellettavien säilytysvelvoitteiden mukaisesti, ellei laki edellytä tietojen säilyttämistä.":"When the agreement ends, personal data is deleted or returned according to the customer's request and applicable retention obligations unless law requires continued retention.",
  "Respondossa pyritään käsittelemään vain tarpeellisia tietoja ja suojaamaan palvelun tunnisteet ja henkilötiedot asianmukaisin teknisin toimin.":"Respondo aims to process only necessary data and protect service credentials and personal data with appropriate technical measures.",
  "Maksu-, tietokanta-, Google OAuth- ja tekoälypalveluiden salaiset tunnisteet pidetään palvelinpuolella. Arkaluonteiset integraatiotunnisteet suojataan tallennettaessa.":"Secrets for payment, database, Google OAuth, and AI services are kept server-side. Sensitive integration credentials are protected at rest.",
  "Integraatioilta pyritään pyytämään vain niiden nykyisten toimintojen toteuttamiseen tarvittavat käyttöoikeudet. Google Calendar -yhteyttä käytetään ajanvarausten tarkistamiseen ja kalenteritapahtumien luomiseen.":"Integrations request only the permissions needed for their current functions. The Google Calendar connection is used to check bookings and create calendar events.",
  "Asiakasvastaukset perustuvat yrityksen itse lisäämiin tietoihin. Jos varmaa vastausta ei löydy, palvelu voi ohjata asian yritykselle sen sijaan, että puuttuva yrityskohtainen tieto keksittäisiin.":"Customer answers are based on information added by the company itself. If a reliable answer cannot be found, the service may route the matter to the company rather than invent missing company-specific information.",

  "4. Google-tili ja Google Calendar":"4. Google account and Google Calendar",
  "Kun käyttäjä yhdistää Google Calendarin, Respondo pyytää Google OAuth -oikeuden calendar.events sekä kirjautumiseen tarvittavat openid-, email- ja profile-oikeudet. Calendar-oikeus mahdollistaa kalenteritapahtumien tarkastelun ja muokkaamisen. Respondo käyttää kalenteritietoja vain käyttäjälle näkyvien ajanvaraustoimintojen toteuttamiseen: olemassa olevia tapahtumia tarkastetaan päällekkäisten varausten estämiseksi ja hyväksytyistä varauksista voidaan luoda tapahtumia käyttäjän kalenteriin. Google Calendarin yhdistäminen on vapaaehtoista.":"When a user connects Google Calendar, Respondo requests the Google OAuth calendar.events permission and the openid, email, and profile permissions required for sign-in. Calendar permission enables viewing and modifying calendar events. Respondo uses calendar data only for user-visible booking features: existing events are checked to prevent double bookings and approved bookings may be created as events in the user's calendar. Connecting Google Calendar is optional.",
  "5. Google API Services User Data Policy":"5. Google API Services User Data Policy",
  "Google Workspace -rajapinnoista saatavia tietoja käytetään Google API Services User Data Policyn ja sen Limited Use -vaatimusten mukaisesti. Google-käyttäjädataa ei myydä, käytetä mainonnan kohdentamiseen eikä käytetä yleisten tekoäly- tai koneoppimismallien kouluttamiseen. Tietoja käytetään vain käyttäjän pyytämien Respondo AI -toimintojen toteuttamiseen, tietoturvaan tai lain edellyttämissä tilanteissa.":"Data obtained from Google Workspace APIs is used in accordance with the Google API Services User Data Policy and its Limited Use requirements. Google user data is not sold, used for advertising targeting, or used to train general AI or machine-learning models. Data is used only to provide Respondo AI features requested by the user, for security, or where required by law.",
  "7. OAuth-tunnisteet ja turvallisuus":"7. OAuth credentials and security",
  "Google-yhteyden käyttöön tarvittavat OAuth-tunnisteet käsitellään palvelimella ja suojataan tallennettaessa. Palvelu käyttää HTTPS-yhteyksiä. Käyttöoikeuksia pyydetään vain palvelun nykyisten toimintojen toteuttamiseen tarvittavassa laajuudessa.":"OAuth credentials required for the Google connection are processed on the server and protected at rest. The service uses HTTPS. Permissions are requested only to the extent needed for the service's current functionality.",
  "Korttitiedot käsittelee Stripe omien ehtojensa ja tietosuojakäytäntöjensä mukaisesti. Respondo ei tallenna varsinaista korttinumeroa omaan tietokantaansa. Respondo voi säilyttää maksuihin liittyviä asiakas-, tilaus-, lasku- ja tapahtumatunnisteita.":"Card details are processed by Stripe under Stripe's own terms and privacy practices. Respondo does not store the actual card number in its own database. Respondo may retain customer, subscription, invoice, and transaction identifiers related to payments.",
  "12. Tietojen poistaminen ja Google-yhteyden peruuttaminen":"12. Data deletion and revoking Google connection",

  "4. Google Calendar ja muut integraatiot":"4. Google Calendar and other integrations",
  "Asiakas voi vapaaehtoisesti yhdistää Google Calendarin tai muun tuetun palvelun. Respondo käyttää asiakkaan myöntämiä oikeuksia vain kyseisen käyttäjälle näkyvän toiminnon toteuttamiseen, kuten varausten saatavuuden tarkistamiseen ja kalenteritapahtumien luomiseen. Asiakas voi poistaa integraation käytöstä palvelun asetuksista tai kyseisen ulkopuolisen palvelun tiliasetuksista.":"The customer may voluntarily connect Google Calendar or another supported service. Respondo uses the permissions granted by the customer only to provide the user-visible function, such as checking booking availability and creating calendar events. The customer can disconnect the integration in the service settings or the external service's account settings.",
  "Asiakas vastaa käyttäjätilinsä suojaamisesta, palveluun lisäämiensä tietojen oikeellisuudesta, tarvittavista oikeuksista ja suostumuksista sekä siitä, että palvelun käyttö, asiakasviestintä ja henkilötietojen käsittely ovat sovellettavan lain mukaisia.":"The customer is responsible for protecting their user account, the accuracy of information added to the service, obtaining necessary rights and consents, and ensuring that use of the service, customer communications, and personal-data processing comply with applicable law.",
  "Palvelua kehitetään jatkuvasti. Huollot, tietoliikennehäiriöt tai ulkopuolisten palvelujen häiriöt voivat aiheuttaa käyttökatkoja. Ominaisuuksia voidaan muuttaa tietoturvan, lain, palveluntarjoajien vaatimusten tai palvelun kehittämisen vuoksi. Olennaisista asiakkaan oikeuksiin vaikuttavista muutoksista pyritään ilmoittamaan kohtuullisesti etukäteen.":"The service is continuously developed. Maintenance, connectivity issues, or outages of external services may cause interruptions. Features may change due to security, legal requirements, provider requirements, or service development. Material changes affecting customer rights will be communicated reasonably in advance where possible.",
  "Respondo AI -palvelun ohjelmisto, ulkoasu ja palveluntarjoajan aineistot kuuluvat palveluntarjoajalle tai sen lisenssinantajille. Asiakas säilyttää oikeudet itse palveluun lisäämäänsä aineistoon ja antaa Respondolle vain palvelun toteuttamiseen tarvittavan käyttöoikeuden.":"The Respondo AI software, design, and provider materials belong to the service provider or its licensors. The customer retains rights to material they add and grants Respondo only the rights needed to provide the service.",
  "Pakottavan lain sallimissa rajoissa Respondo AI ei vastaa välillisistä vahingoista, menetetystä liikevaihdosta tai vahingoista, jotka johtuvat asiakkaan virheellisistä tiedoista, ulkopuolisen palvelun häiriöstä tai automaattisen vastauksen käyttämisestä ilman asianmukaista tarkistusta. Tämä kohta ei rajoita vastuuta siltä osin kuin vastuuta ei lain mukaan voida rajoittaa.":"To the extent permitted by mandatory law, Respondo AI is not liable for indirect damages, lost revenue, or damages caused by incorrect customer information, external-service outages, or use of automated responses without appropriate review. This does not limit liability that cannot legally be limited.",

  "Tässä kerrotaan, mitä henkilötietoja Respondo AI käsittelee, miksi niitä käsitellään ja miten Google-käyttäjädataa käytetään.":"This explains what personal data Respondo AI processes, why it is processed, and how Google user data is used.",
  "1. Rekisterinpitäjä":"1. Data controller",
  "2. Käsiteltävät tiedot":"2. Data processed",
  "3. Käsittelyn tarkoitukset ja perusteet":"3. Purposes and legal bases",
  "6. Google-tietojen jakaminen ja ihmisten pääsy":"6. Google data sharing and human access",
  "9. Palveluntarjoajat ja alikäsittelijät":"9. Service providers and subprocessors",
  "10. Kansainväliset siirrot":"10. International transfers",
  "11. Säilytys":"11. Retention",
  "13. Rekisteröidyn oikeudet":"13. Data subject rights",
  "Tietosuojaselostetta päivitetään, kun palvelun ominaisuudet, tietojen käsittely tai sovellettavat vaatimukset muuttuvat. Ajantasainen versio julkaistaan tällä sivulla.":"The privacy policy is updated when service features, data processing, or applicable requirements change. The current version is published on this page.",
  "Kun Respondo käsittelee henkilötietoja yritysasiakkaan puolesta, yritys toimii lähtökohtaisesti rekisterinpitäjänä ja Respondo henkilötietojen käsittelijänä.":"When Respondo processes personal data on behalf of a business customer, the business generally acts as controller and Respondo as processor.",
  "Tietoja käsitellään yritysasiakkaan puolesta asiakasviestien käsittelyyn, tietopohjaan perustuvien vastausten tuottamiseen, yhteydenottojen ja varausten välittämiseen sekä asiakkaan käyttöön ottamien integraatioiden toteuttamiseen.":"Data is processed on behalf of the business customer to handle customer messages, produce knowledge-base-based answers, relay contacts and bookings, and provide integrations enabled by the customer.",
  "Respondo käsittelee henkilötietoja vain asiakkaan dokumentoitujen ohjeiden ja palvelun käyttötarkoituksen mukaisesti, ellei sovellettava laki edellytä muuta.":"Respondo processes personal data only according to the customer's documented instructions and the intended use of the service unless applicable law requires otherwise.",
  "Palvelu toimii salatun HTTPS-yhteyden kautta.":"The service operates over an encrypted HTTPS connection.",
  "Salasanat tallennetaan yksisuuntaisesti hajautettuina eikä selväkielisinä.":"Passwords are stored using one-way hashing and not in plaintext.",

  "Näissä ehdoissa kerrotaan, millä ehdoilla yritysasiakkaat voivat käyttää Respondo AI -palvelua.":"These terms describe the conditions under which business customers may use the Respondo AI service.",
  "2. Palvelu":"2. Service",
  "5. Kokeilu ja tilaus":"5. Trial and subscription",
  "Maksut käsitellään Stripen kautta. Jatkuva tilaus uusiutuu valitun laskutusjakson mukaisesti, kunnes se perutaan. Maksun epäonnistuminen voi johtaa palvelun rajoittamiseen tai keskeyttämiseen.":"Payments are processed through Stripe. A recurring subscription renews according to the selected billing period until cancelled. A failed payment may result in the service being restricted or suspended.",
  "Tilauksen voi perua milloin tahansa. Peruminen estää seuraavan laskutusjakson uusiutumisen. Jo maksettu laskutuskausi jatkuu normaalisti kauden loppuun, ellei pakottava lainsäädäntö tai erikseen sovittu ehto edellytä muuta.":"The subscription can be cancelled at any time. Cancellation prevents the next renewal. A paid billing period normally continues until its end unless mandatory law or a separately agreed term requires otherwise.",
  "Näihin ehtoihin sovelletaan Suomen lakia. Mahdolliset erimielisyydet pyritään ensisijaisesti ratkaisemaan neuvottelemalla.":"These terms are governed by Finnish law. Any disputes should primarily be resolved through negotiation.",
  "Respondo käyttää palvelun toiminnan kannalta tarpeellisia evästeitä ja vastaavia teknisiä tunnisteita.":"Respondo uses cookies and similar technical identifiers necessary for the service to function.",
  "Istuntoeväste":"Session cookie",
  "Kävijätilastointi":"Visitor analytics",
  "Evästevalinnan muuttaminen":"Changing cookie choices",
  "Kirjautumisen yhteydessä selaimeen tallennetaan suojattu istuntoeväste, jotta käyttäjä pysyy kirjautuneena hallintapaneeliin.":"When signing in, a secure session cookie is stored in the browser so the user remains signed in to the dashboard.",
  "Google-kirjautuminen ja muut ulkopuoliset palvelut voivat käyttää omia välttämättömiä evästeitään omien tietosuojakäytäntöjensä mukaisesti.":"Google sign-in and other external services may use their own necessary cookies according to their privacy policies.",
  "Stripe voi käyttää omia evästeitään maksamisen, petosten torjunnan ja maksutoimintojen toteuttamiseen.":"Stripe may use its own cookies for payments, fraud prevention, and payment functionality.",
  "Käsittelyn kohde ja kesto":"Subject and duration of processing",
  "Käsittelyn tarkoitus":"Purpose of processing",
  "Alikäsittelijät":"Subprocessors",
  "Käyttöoikeudet":"Permissions",

  "Testaa oikea maksu.":"Test a real payment.",
  "3 päivää ilmaiseksi":"3 days free",
  "Vain sinä pääset yrityksesi hallintaan":"Only you can access your company dashboard",
  "Tarjouspyyntö":"Quote request",
  "Ajanvaraus":"Booking",
  "Sähköposti":"Email",
  "asiakasta jätti yhteystietonsa":"customers left their contact details",
  "Esim. Putkityö 65 € / h + alv. Päivystys 95 € / h + alv.":"E.g. plumbing €65/h + VAT. Emergency service €95/h + VAT.",
  "Tarjouspyyntölomake":"Quote request form",
  "Esim. putkityöt, LVI-asennukset, sähkötyöt, huollot, päivystys":"E.g. plumbing, HVAC installation, electrical work, maintenance, emergency service",
  "Esim. päivystysnumero, maksutavat, takuukäytännöt, ajanvarausohjeet, poikkeukset...":"E.g. emergency number, payment methods, warranty practices, booking instructions, exceptions...",
  "hinta, maksaa, tarjous":"price, cost, quote",
  "Asiakas":"Customer",
  "1 käyttökerta jäljellä":"1 use remaining",
  "Saat voimassa olevalla koodilla 20 % pois ensimmäisestä maksullisesta kuukaudesta. Vain kuukausitilaukseen.":"With a valid code you get 20% off the first paid month. Monthly plan only.",
  "Hei! Emme juuri nyt pystyneet vastaamaan puheluusi. Voit vastata tähän viestiin, niin RESPONDO AI auttaa heti.":"Hi! We couldn't answer your call just now. Reply to this message and RESPONDO AI will help you right away.",

  "RESPONDO AI käyttöliittymäesimerkki":"RESPONDO AI interface example",
  "Etunimi Sukunimi":"First name Last name",
  "Yrityksen nimi":"Company name",
  "Tämä kertakäyttöinen testitilaus veloittaa heti tasan 0,50 €. Se sulkeutuu onnistuneen maksun jälkeen eikä uusiudu seuraavassa kuussa.":"This one-time test subscription charges exactly €0.50 immediately. It closes after a successful payment and does not renew the following month.",
  "Suomi":"Finland",
  "Palaa etusivulle.":"Return to the home page.",
  "Yhteydenotot":"Contact",
  "Päivitetty":"Updated",
  "Teksti kuvaa Respondon nykyistä palvelua ja sitä voidaan päivittää palvelun kehittyessä.":"This text describes Respondos current service and may be updated as the service develops.",

  "Valitse PNG-, JPG- tai WebP-kuva.":"Choose a PNG, JPG, or WebP image.",
  "Kuva jäi liian suureksi. Kokeile toista kuvaa.":"The image is too large. Try another image.",
  "Asetukset":"Settings",
  "Tallenna":"Save",
  "Sulje":"Close",
  "Takaisin":"Back",
  "Lähetä":"Send",
  "Ladataan…":"Loading…",
  "Kirjautumisistunto vanheni. Yritä uudelleen.":"Your login session expired. Please try again.",
  "Tällä tilillä ei ole vielä RESPONDO AI -käyttäjää. Luo tili ensin.":"There is no RESPONDO AI user for this account yet. Create an account first.",
  "Tili on luotu, mutta tilaus pitää vielä viimeistellä.":"Your account was created, but the subscription still needs to be completed.",
  "Kirjautuminen epäonnistui. Yritä uudelleen.":"Login failed. Please try again.",
  "Sivua ei löytynyt":"Page not found",
  "Käsittelyssä":"Processing",
  "Lisää ensimmäinen oma vastaus":"Add your first custom answer",
  "Lisää Respondo verkkosivullesi":"Add Respondo to your website",
  "Kokeile bottia ensimmäisen kerran":"Test the bot for the first time",
  "Valitse hallintapaneelin osio":"Choose a dashboard section",
  "Keskustelut viimeisen 14 päivän aikana":"Conversations in the last 14 days",
  "Luonteva ja ystävällinen":"Natural and friendly",
  "Lisätiedot":"Additional information",
  "+ Lisää etusivulle":"+ Add to home screen",
  "Omistajan hyväksymä":"Owner approved",
  "Hyväksytty Truth Engineen":"Approved for Truth Engine",
  "Mitä asiakas kysyy?":"What does the customer ask?",
  "Kirjoita tähän se vastaus, jonka haluat asiakkaan saavan.":"Write the answer you want the customer to receive here.",
  "Sinä":"You",
  "Kirjoita vastaus asiakkaalle…":"Write a reply to the customer…",
  "Vastaus puuttui":"Answer was missing",
  "Kirjoita tähän oikea vastaus…":"Write the correct answer here…",
  "Odottaa hyväksyntää / maksua":"Awaiting approval / payment",
  "Google-sync epäonnistui":"Google sync failed",
  "lähetetty ✓":"sent ✓",
  "lähetys epäonnistui":"sending failed",
  "Käytössä":"Active",
  "● Maksut käytössä":"● Payments active",
  "Yhdistä yrityksen Stripe":"Connect company Stripe",
  "Et ole vielä lisännyt verkkosivua":"You have not added a website yet",
  "Tämä asennuskoodi toimii vain yllä olevalla verkkosivulla.":"This installation code works only on the website above.",
  "Lisää ensin verkkosivusi osoite yllä. Sen jälkeen botti toimii vain sillä sivulla.":"First add your website address above. The bot will then work only on that website.",
  "✓ Asennus valmis":"✓ Installation complete",
  "Käytetty":"Used",
  "Maksu ei näytä olevan vielä valmis.":"The payment does not appear to be complete yet.",
  "Kirjaudutaan sisään…":"Logging in…",
  "Etsitään…":"Searching…",
  "Ehdotus löytyi ✓":"Suggestion found ✓",
  "En löydä tähän vielä varmaa vastausta.":"I cannot find a reliable answer to this yet.",
  "Vastaaminen epäonnistui. Yritä uudelleen.":"Reply failed. Please try again.",
  "Lisätään…":"Adding…",
  "Kysymys näkyy nyt botin etusivulla.":"The question is now shown on the bot home screen.",
  "Kysymys poistettiin botin etusivulta.":"The question was removed from the bot home screen.",
  "Kopioi koodi":"Copy code",
  "Valitse ja kopioi":"Select and copy",
  "Kopioi suosittelulinkki":"Copy referral link",
  "Poista":"Delete",
  "Lähetetään…":"Sending…",
  "Lähetetty ✓":"Sent ✓",
  "Kopioi käsin":"Copy manually",
  "Kopioi":"Copy",

  "Jäikö jotain mieleen?":"Still have a question?",
  "Laita meille viestiä.":"Send us a message.",
  "Evästeasetukset":"Cookie settings",
  "HALLINTA":"CONTROL",
  "Epävarmat":"Uncertain",
  "✓ tieto löytyi":"✓ information found",
  "ASIAKAS · 22:43":"CUSTOMER · 22:43",
  "ASIAKAS · 22:44":"CUSTOMER · 22:44",
  "● PÄÄLLÄ":"● ONLINE",
  "VIERITÄ ALAS JA KATSO, MITEN SE TOIMII":"SCROLL DOWN AND SEE HOW IT WORKS",
  "05 / KOKEILE KÄYTÄNNÖSSÄ":"05 / TRY IT YOURSELF",
  "Asiakkaasi seuraava kysymys voi tulla vaikka tänä iltana.":"Your customer's next question could arrive tonight.",
  "Anna Respondon hoitaa vastaus silloin, kun sinä et ehdi.":"Let Respondo handle the answer when you don't have time.",
  "Päätä vasta sen jälkeen.":"Decide after that.",
  "Palvelu alkaa 89 €.":"Service starts at €89.",
  "VASTAUS PUUTTUU":"ANSWER MISSING",
  "Asiakas ohjattu sinulle":"Customer routed to you",
  "Vieritä eteenpäin ja katso, miten kaikki toimii yhdessä.":"Keep scrolling to see how everything works together.",
  "03 / NOPEA VASTAUS MERKITSEE":"03 / FAST RESPONSES MATTER",
  "Asiakas voi kysyä milloin vain.":"Customers can ask at any time.",
  "Vastauksen ei tarvitse odottaa.":"The answer does not have to wait.",
  "odottaa saavansa palvelua ympäri vuorokauden*":"expect service around the clock*",
  "odottaa saavansa vastauksen heti*":"expect an immediate response*",
  "ei vastannut yhteydenottoon lainkaan*":"did not respond to the inquiry at all*",
  "* Avaa luku nähdäksesi lähteen. HBR:n aineisto on Yhdysvalloista vuodelta 2011.":"* Open a figure to see its source. HBR data is from the United States in 2011.",
  "“Paljonko tämä maksaa?”":"“How much does this cost?”",
  "asiakas":"customer",
  "Kokeile itse":"Try it yourself",
  "Palvelut":"Services",
  "Vastaus puuttuu":"Answer missing",
  "Sinulle":"To you",
  "Mitä yksi menetetty yhteydenotto voi maksaa?":"What can one missed inquiry cost?",
  "Paljonko rahaa voi jäädä pöydälle,":"How much money could be left on the table",
  "jos asiakkaalle ei vastata?":"when a customer gets no answer?",
  "Säädä työn arvo ja päivässä vastaamatta jäävien yhteydenottojen määrä. Laske itse näyttää niiden potentiaalisen myyntiarvon.":"Adjust the average deal value and the number of unanswered inquiries per day. The calculator shows their potential sales value.",
  "KESKIMÄÄRÄINEN KAUPPA":"AVERAGE DEAL",
  "Paljonko yksi asiakas tuo keskimäärin?":"How much is one customer worth on average?",
  "ILMAN VASTAUSTA / PÄIVÄ":"UNANSWERED / DAY",
  "Montako yhteydenottoa jää ilman vastausta?":"How many inquiries go unanswered?",
  "MAHDOLLINEN ARVO / 30 PÄIVÄÄ":"POTENTIAL VALUE / 30 DAYS",
  "Päivässä":"Per day",
  "Vuodessa":"Per year",
  "Laskelma on suuntaa-antava. Se näyttää yhteydenottojen arvon tilanteessa, jossa jokainen niistä vastaisi yhtä keskimääräistä kauppaa. Todellinen tulos riippuu siitä, kuinka moni yhteydenotto muuttuu asiakkaaksi.":"This estimate is illustrative. It shows the value of inquiries if each one represented one average deal. Actual results depend on how many inquiries convert into customers.",
  "Yksi selkeä hinta.":"One clear price.",
  "Tiedät mitä maksat.":"You know what you pay.",
  "Kokeile 3 päivää ilmaiseksi. Peruuta ennen kokeilun päättymistä, jos et halua jatkaa.":"Try it free for 3 days. Cancel before the trial ends if you do not want to continue.",
  "KUUKAUSITILAUS":"MONTHLY PLAN",
  "maksa kuukausittain":"pay monthly",
  "Kuukausi":"Month",
  "VUOSITILAUS":"ANNUAL PLAN",
  "säästä 60 €":"save €60",
  "Laskutetaan vuosittain 539,88 €":"Billed annually at €539.88",
  "Kaikki samat ominaisuudet kuin kuukausitilauksessa":"All the same features as the monthly plan",
  "Maksu kerran vuodessa":"Pay once per year",
  "Voit käyttää palvelua maksetun kauden loppuun":"Use the service until the end of the paid period",
  "Valitse vuosi":"Choose annual plan",
  "odottaa välitöntä vuorovaikutusta":"expect immediate interaction",
  "odottaa asiakaspalvelua 24/7":"expect 24/7 customer service",
  "ei vastannut verkkoliidiin lainkaan":"did not respond to the web lead at all",
  "vastasi ensimmäisen tunnin aikana":"responded within the first hour",
  "pitää nopeutta ja oikeaa ratkaisua ostopäätökseen vaikuttavana":"say speed and the right resolution affect purchase decisions",
  "Kerro Respondolle yrityksesi tiedot kerran. Sen jälkeen se vastaa asiakkaillesi myös silloin, kun sinä et ehdi. Jos tarvittava tieto puuttuu, kysymys ohjataan sinulle.":"Tell Respondo about your business once. It then answers customers even when you are unavailable. If required information is missing, the question is routed to you.",
  "RESPONDO AI / PÄÄLLÄ":"RESPONDO AI / ONLINE",
  "ASIAKASPALVELU":"CUSTOMER SERVICE",
  "Vastaukset perustuvat yrityksesi antamiin tietoihin.":"Answers are based on information provided by your business.",
  "TIETO LÖYTYI":"INFORMATION FOUND",
  "Tieto löytyi":"Information found",
  "Paljonko huolto maksaa ja palveletteko myös viikonloppuna?":"How much does the service cost, and are you open on weekends?",
  "Perushuolto alkaa 89 eurosta. Lauantaisin palvelemme klo 10–14.":"Basic service starts at €89. On Saturdays we are open from 10:00 to 14:00.",
  "Hinnasto / Aukioloajat":"Pricing / Opening hours",
  "Voitteko luvata valmistumisen huomiseksi?":"Can you promise it will be ready tomorrow?",
  "Tähän ei löydy varmaa vastausta.":"There is no reliable answer to this.",
  "Kysymys ohjataan sinulle vastattavaksi.":"The question is routed to you for an answer.",
  "01 / ASIAKAS KYSYY":"01 / CUSTOMER ASKS",
  "KYSYMYS":"QUESTION",
  "Paljonko huoltokäynti maksaa?":"How much does a service visit cost?",
  "Perushuolto alkaa 89 eurosta. Haluatko myös vapaat ajat?":"Basic service starts at €89. Would you also like to see available times?",
  "vastaus löytyi yrityksen tiedoista":"answer found in company information",
  "ASIAKAS":"CUSTOMER",
  "kysymys tuli juuri":"question just arrived",
  "VASTAUS":"ANSWER",
  "vastaus heti":"instant answer",
  "TIETO":"INFORMATION",
  "tieto löytyy":"information found",
  "vieritä alas":"scroll down",
  "verkossa":"online",
  "hallintapaneeli":"dashboard",
  "oma tietopohja":"own knowledge base",
  "01 / LISÄÄ YRITYKSESI TIEDOT":"01 / ADD YOUR BUSINESS INFORMATION",
  "Kerro, mitä":"Define what",
  "asiakkaalle saa vastata.":"can be answered to customers.",
  "TIETOPOHJA":"KNOWLEDGE BASE",
  "HINNAT":"PRICES",
  "Huolto alkaen 89 €":"Service from €89",
  "AUKIOLO":"OPENING HOURS",
  "TOIMIALUE":"SERVICE AREA",
  "HINTA":"PRICE",
  "PALVELUT":"SERVICES",
  "02 / ASIAKAS KYSYY OMILLA SANOILLAAN":"02 / CUSTOMER ASKS IN THEIR OWN WORDS",
  "Niin kuin ihmiset":"The way people",
  "oikeasti kysyvät.":"actually ask.",
  "Onks teillä vapaita aikoja huomiselle?":"Do you have any openings tomorrow?",
  "Mitä tää maksaa?":"How much is this?",
  "Tuletteko Nokialle asti?":"Do you serve Nokia?",
  "Saako tän viikonloppuna?":"Can I get this on the weekend?",
  "löytää vastauksen yrityksesi tiedoista":"finds the answer in your business information",
  "03 / RESPONDO HOITAA LOPUT":"03 / RESPONDO HANDLES THE REST",
  "Vastaa heti.":"Answers instantly.",
  "Yrityksesi tiedoilla.":"Using your business information.",
  "VASTAUS LÖYTYY":"ANSWER FOUND",
  "Vastaa heti":"Answer instantly",
  "VASTAUSTA EI LÖYDY":"NO ANSWER FOUND",
  "Ohjaa sinulle":"Route to you",
  "02 / KAIKKI YHDESSÄ":"02 / EVERYTHING TOGETHER",
  "Näet yhdellä silmäyksellä":"See at a glance",
  "mitä asiakkaat kysyvät.":"what customers are asking.",
  "PÄÄLLÄ":"ONLINE",
  "KESKUSTELUT":"CONVERSATIONS",
  "UUSI KESKUSTELU":"NEW CONVERSATION",
  "Paljonko maksaa?":"How much is it?",
  "Järjestelmä aktiivinen":"System active",
  "RESPONDO / ASIAKASPALVELU":"RESPONDO / CUSTOMER SERVICE",
  "Kysymyksestä vastaukseen.":"From question to answer.",
  "Yhdessä näkymässä.":"In one view.",
  "Asiakas kysyy, Respondo vastaa yrityksesi tiedoilla ja tallentaa tarvittaessa yhteydenoton, tarjouspyynnön tai ajanvarauksen.":"The customer asks, Respondo answers using your business information and captures a contact request, quote request or booking when needed.",
  "YRITYKSEN TIEDOT":"BUSINESS INFORMATION",
  "Hinnat · palvelut · aukioloajat":"Prices · services · opening hours",
  "Tietopohja":"Knowledge base",
  "JATKOTOIMI":"NEXT ACTION",
  "Tarjouspyyntö · ajanvaraus · yhteydenotto":"Quote request · booking · contact",
  "Hallintapaneeli":"Dashboard",
  "Kysymyksestä vastaukseen":"From question to answer",
  "04 / KUN VASTAUSTA EI LÖYDY":"04 / WHEN AN ANSWER IS MISSING",
  "Jos tietoa ei löydy,":"If the information is missing,",
  "kysymys ohjataan sinulle.":"the question is routed to you.",
  "Vastaukset perustuvat yrityksesi antamiin tietoihin. Jos tarvittava tieto puuttuu, kysymys siirtyy sinulle.":"Answers are based on information provided by your business. If required information is missing, the question is routed to you.",
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
  '49,99 €/kk':'€49.99/month',
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
  'Peruspaketti alkaa 49,99 €/kk':'Base plan starts at €49.99/month',
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
  '49,99 € / kk':'€49.99 / month',
  
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
  'säästä 60 €':'save €60',
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


const SV_TEXT = new Map(Object.entries({
  "Päänavigaatio":"Huvudnavigation",
  "Kirjaudu":"Logga in",
  "Ota yhteyttä":"Kontakta oss",
  "Kokeile ilmaiseksi":"Prova gratis",
  "Käyttöehdot":"Användarvillkor",
  "Evästeet":"Cookies",
  "Tietojenkäsittely":"Databehandling",
  "Yritys":"Företag",
  "Respondo AI on yrityksille tarkoitettu asiakaspalvelu- ja ajanvarauspalvelu. Palveluun voi kuulua verkkosivubotti, yrityksen tietopohja, asiakasviestien käsittely, tarjous- ja yhteydenottopyynnöt, ajanvaraukset, SMS-toiminnot sekä asiakkaan erikseen yhdistämät ulkopuoliset palvelut, kuten Google Calendar. Käytettävissä olevat ominaisuudet voivat riippua asiakkaan asetuksista ja tilauksesta.":"Respondo AI är en kundservice- och bokningstjänst för företag. Tjänsten kan omfatta en webbplatsbot, företagets kunskapsbas, hantering av kundmeddelanden, offert- och kontaktförfrågningar, bokningar, SMS-funktioner samt externa tjänster som kunden själv ansluter, såsom Google Calendar. Tillgängliga funktioner kan bero på kundens inställningar och abonnemang.",
  "Respondo AI tuottaa asiakasvastauksia yrityksen palveluun lisäämien tietojen ja käytössä olevien toimintojen perusteella. Automaattinen vastaus voi olla virheellinen tai puutteellinen, joten asiakasyritys vastaa omien tietojensa oikeellisuudesta ja siitä, missä tilanteissa automaattisia vastauksia käytetään. Palvelua ei tule käyttää lainvastaisiin tarkoituksiin tai sellaisiin korkean riskin päätöksiin, joissa automaattinen vastaus yksin voi aiheuttaa olennaista vahinkoa.":"Respondo AI skapar kundsvar utifrån information som företaget har lagt till och de funktioner som används. Ett automatiskt svar kan vara felaktigt eller ofullständigt, så företagskunden ansvarar för att den egna informationen är korrekt och för i vilka situationer automatiska svar används. Tjänsten får inte användas för olagliga ändamål eller för högriskbeslut där ett automatiskt svar ensamt kan orsaka väsentlig skada.",
  "Palvelun toteuttamisessa voidaan käyttää infrastruktuuri-, tietokanta-, maksu-, viestintä- ja tekoälypalveluntarjoajia. Tietoja luovutetaan niille vain siinä laajuudessa kuin kyseisen toiminnon toteuttaminen edellyttää ja sovellettavien sopimusten sekä tietosuojavaatimusten mukaisesti.":"Infrastruktur-, databas-, betalnings-, kommunikations- och AI-leverantörer kan användas för att tillhandahålla tjänsten. Uppgifter lämnas till dem endast i den omfattning som krävs för den aktuella funktionen och i enlighet med tillämpliga avtal och dataskyddskrav.",
  "Osa palveluntarjoajista voi käsitellä tietoja Euroopan talousalueen ulkopuolella. Tällöin siirroissa käytetään sovellettavan tietosuojalainsäädännön edellyttämiä suojatoimia, kuten Euroopan komission hyväksymiä vakiosopimuslausekkeita, kun niitä tarvitaan.":"Vissa tjänsteleverantörer kan behandla uppgifter utanför Europeiska ekonomiska samarbetsområdet. Då används de skyddsåtgärder som tillämplig dataskyddslagstiftning kräver, såsom Europeiska kommissionens standardavtalsklausuler när det behövs.",
  "Tietoja säilytetään vain niin kauan kuin niitä tarvitaan palvelun toimittamiseen, sopimus- ja kirjanpitovelvoitteiden hoitamiseen, tietoturvaan tai lakisääteisiin velvoitteisiin. Tarpeettomat tiedot poistetaan tai anonymisoidaan kohtuullisessa ajassa. Google-käyttäjädatasta ei tehdä pysyvää kopiota muihin tarkoituksiin.":"Uppgifter lagras endast så länge de behövs för att tillhandahålla tjänsten, uppfylla avtals- och bokföringsskyldigheter, säkerhet eller lagstadgade skyldigheter. Uppgifter som inte längre behövs raderas eller anonymiseras inom rimlig tid. Ingen permanent kopia av Google-användardata görs för andra ändamål.",
  "Respondon markkinointisivun oma kävijätilastointi toteutetaan palvelinpuolella. Se käynnistyy vain käyttäjän hyväksynnän jälkeen. Tilastointiin tallennetaan pseudonyymi kävijätunniste, sivupolku, viittaava verkkotunnus ja mahdolliset UTM-kampanjatiedot. Raakaa IP-osoitetta ei tallenneta kävijätilastotauluun.":"Respondos egen besöksstatistik för marknadsföringssidan genomförs på serversidan och startar endast efter användarens samtycke. En pseudonym besökaridentifierare, sidväg, hänvisande domän och eventuella UTM-kampanjuppgifter lagras. Den råa IP-adressen lagras inte i besöksstatistiktabellen.",
  "Käyttäjä voi hyväksyä tai hylätä valinnaisen analytiikan evästebannerissa ja muuttaa valintaansa myöhemmin sivuston alatunnisteen Evästeasetukset-linkistä. Valinta tallennetaan selaimeen, jotta samaa kysymystä ei tarvitse esittää jokaisella sivulatauksella.":"Användaren kan godkänna eller avvisa valfri analys i cookie-bannern och senare ändra sitt val via länken Cookieinställningar i sidfoten. Valet sparas i webbläsaren så att samma fråga inte behöver visas vid varje sidladdning.",
  "Käsittely liittyy Respondo AI -palvelun tarjoamiseen sopimuksen voimassaolon ajan ja tarvittavan poistumisajan sen jälkeen. Käsittely voi koskea yrityksen palveluun lisäämiä tietoja sekä loppuasiakkaiden chat-, yhteydenotto-, SMS-, tarjous- ja ajanvaraustietoja.":"Behandlingen avser tillhandahållandet av Respondo AI under avtalstiden och den nödvändiga raderingsperioden därefter. Behandlingen kan omfatta uppgifter som företaget lägger till i tjänsten samt slutkunders chatt-, kontakt-, SMS-, offert- och bokningsuppgifter.",

  "Luottamuksellisuus ja turvallisuus":"Sekretess och säkerhet",
  "Henkilötietoja käsitteleviä tahoja sitoo asianmukainen luottamuksellisuus. Pääsy tuotantoympäristöihin ja salaisiin tietoihin rajataan tarpeen mukaan. Salasanoja ei tallenneta selväkielisinä ja ulkoisten palvelujen tunnisteita suojataan teknisin keinoin.":"Parter som behandlar personuppgifter omfattas av lämplig sekretess. Åtkomst till produktionsmiljöer och hemliga uppgifter begränsas efter behov. Lösenord lagras inte i klartext och identifierare för externa tjänster skyddas med tekniska åtgärder.",
  "Palvelun taustalla voidaan käyttää infrastruktuuri-, tietokanta-, maksu-, viestintä-, Google Workspace- ja tekoälypalveluntarjoajia siltä osin kuin palvelun toteuttaminen niitä edellyttää.":"Infrastruktur-, databas-, betalnings-, kommunikations-, Google Workspace- och AI-leverantörer kan användas i den utsträckning som krävs för att tillhandahålla tjänsten.",
  "Respondo avustaa kohtuullisessa määrin yritysasiakasta rekisteröityjen pyyntöjen, tietoturvaloukkausten ja sovellettavien tietosuojavelvoitteiden hoitamisessa siltä osin kuin asia koskee Respondon käsittelemiä tietoja.":"Respondo bistår i rimlig omfattning företagskunden med registrerades begäranden, personuppgiftsincidenter och tillämpliga dataskyddsskyldigheter i den mån ärendet gäller uppgifter som Respondo behandlar.",
  "Sopimuksen päättyessä henkilötiedot poistetaan tai palautetaan asiakkaan pyynnön ja sovellettavien säilytysvelvoitteiden mukaisesti, ellei laki edellytä tietojen säilyttämistä.":"När avtalet upphör raderas eller återlämnas personuppgifter enligt kundens begäran och tillämpliga lagringsskyldigheter, om inte lagen kräver fortsatt lagring.",
  "Respondossa pyritään käsittelemään vain tarpeellisia tietoja ja suojaamaan palvelun tunnisteet ja henkilötiedot asianmukaisin teknisin toimin.":"Respondo strävar efter att endast behandla nödvändiga uppgifter och skydda tjänstens identifierare och personuppgifter med lämpliga tekniska åtgärder.",
  "Maksu-, tietokanta-, Google OAuth- ja tekoälypalveluiden salaiset tunnisteet pidetään palvelinpuolella. Arkaluonteiset integraatiotunnisteet suojataan tallennettaessa.":"Hemliga uppgifter för betalnings-, databas-, Google OAuth- och AI-tjänster hålls på serversidan. Känsliga integrationsuppgifter skyddas vid lagring.",
  "Integraatioilta pyritään pyytämään vain niiden nykyisten toimintojen toteuttamiseen tarvittavat käyttöoikeudet. Google Calendar -yhteyttä käytetään ajanvarausten tarkistamiseen ja kalenteritapahtumien luomiseen.":"Integrationer begär endast de behörigheter som behövs för deras nuvarande funktioner. Google Calendar-anslutningen används för att kontrollera bokningar och skapa kalenderhändelser.",
  "Asiakasvastaukset perustuvat yrityksen itse lisäämiin tietoihin. Jos varmaa vastausta ei löydy, palvelu voi ohjata asian yritykselle sen sijaan, että puuttuva yrityskohtainen tieto keksittäisiin.":"Kundsvar baseras på information som företaget själv har lagt till. Om ett säkert svar inte finns kan tjänsten hänvisa ärendet till företaget i stället för att hitta på saknad företagsspecifik information.",

  "4. Google-tili ja Google Calendar":"4. Google-konto och Google Calendar",
  "Kun käyttäjä yhdistää Google Calendarin, Respondo pyytää Google OAuth -oikeuden calendar.events sekä kirjautumiseen tarvittavat openid-, email- ja profile-oikeudet. Calendar-oikeus mahdollistaa kalenteritapahtumien tarkastelun ja muokkaamisen. Respondo käyttää kalenteritietoja vain käyttäjälle näkyvien ajanvaraustoimintojen toteuttamiseen: olemassa olevia tapahtumia tarkastetaan päällekkäisten varausten estämiseksi ja hyväksytyistä varauksista voidaan luoda tapahtumia käyttäjän kalenteriin. Google Calendarin yhdistäminen on vapaaehtoista.":"När användaren ansluter Google Calendar begär Respondo Google OAuth-behörigheten calendar.events samt openid-, email- och profile-behörigheter för inloggning. Kalenderbehörigheten gör det möjligt att läsa och ändra kalenderhändelser. Respondo använder kalenderdata endast för bokningsfunktioner som är synliga för användaren: befintliga händelser kontrolleras för att undvika dubbelbokningar och godkända bokningar kan skapas som händelser i användarens kalender. Anslutning av Google Calendar är frivillig.",
  "5. Google API Services User Data Policy":"5. Google API Services User Data Policy",
  "Google Workspace -rajapinnoista saatavia tietoja käytetään Google API Services User Data Policyn ja sen Limited Use -vaatimusten mukaisesti. Google-käyttäjädataa ei myydä, käytetä mainonnan kohdentamiseen eikä käytetä yleisten tekoäly- tai koneoppimismallien kouluttamiseen. Tietoja käytetään vain käyttäjän pyytämien Respondo AI -toimintojen toteuttamiseen, tietoturvaan tai lain edellyttämissä tilanteissa.":"Data från Google Workspace API:er används i enlighet med Google API Services User Data Policy och dess Limited Use-krav. Google-användardata säljs inte, används inte för annonsinriktning och används inte för att träna generella AI- eller maskininlärningsmodeller. Uppgifterna används endast för Respondo AI-funktioner som användaren begärt, för säkerhet eller när lagen kräver det.",
  "7. OAuth-tunnisteet ja turvallisuus":"7. OAuth-uppgifter och säkerhet",
  "Google-yhteyden käyttöön tarvittavat OAuth-tunnisteet käsitellään palvelimella ja suojataan tallennettaessa. Palvelu käyttää HTTPS-yhteyksiä. Käyttöoikeuksia pyydetään vain palvelun nykyisten toimintojen toteuttamiseen tarvittavassa laajuudessa.":"OAuth-uppgifter som behövs för Google-anslutningen behandlas på servern och skyddas vid lagring. Tjänsten använder HTTPS. Behörigheter begärs endast i den omfattning som krävs för tjänstens nuvarande funktioner.",
  "Korttitiedot käsittelee Stripe omien ehtojensa ja tietosuojakäytäntöjensä mukaisesti. Respondo ei tallenna varsinaista korttinumeroa omaan tietokantaansa. Respondo voi säilyttää maksuihin liittyviä asiakas-, tilaus-, lasku- ja tapahtumatunnisteita.":"Kortuppgifter behandlas av Stripe enligt Stripes egna villkor och integritetspolicy. Respondo lagrar inte det faktiska kortnumret i sin egen databas. Respondo kan lagra kund-, abonnemangs-, faktura- och transaktionsidentifierare relaterade till betalningar.",
  "12. Tietojen poistaminen ja Google-yhteyden peruuttaminen":"12. Radering av uppgifter och återkallelse av Google-anslutning",

  "4. Google Calendar ja muut integraatiot":"4. Google Calendar och andra integrationer",
  "Asiakas voi vapaaehtoisesti yhdistää Google Calendarin tai muun tuetun palvelun. Respondo käyttää asiakkaan myöntämiä oikeuksia vain kyseisen käyttäjälle näkyvän toiminnon toteuttamiseen, kuten varausten saatavuuden tarkistamiseen ja kalenteritapahtumien luomiseen. Asiakas voi poistaa integraation käytöstä palvelun asetuksista tai kyseisen ulkopuolisen palvelun tiliasetuksista.":"Kunden kan frivilligt ansluta Google Calendar eller en annan tjänst som stöds. Respondo använder endast de behörigheter kunden beviljar för den funktion som visas för användaren, såsom att kontrollera bokningstillgänglighet och skapa kalenderhändelser. Kunden kan koppla från integrationen i tjänstens inställningar eller i den externa tjänstens kontoinställningar.",
  "Asiakas vastaa käyttäjätilinsä suojaamisesta, palveluun lisäämiensä tietojen oikeellisuudesta, tarvittavista oikeuksista ja suostumuksista sekä siitä, että palvelun käyttö, asiakasviestintä ja henkilötietojen käsittely ovat sovellettavan lain mukaisia.":"Kunden ansvarar för att skydda sitt användarkonto, för riktigheten i uppgifterna som läggs till i tjänsten, för nödvändiga rättigheter och samtycken samt för att användningen av tjänsten, kundkommunikationen och behandlingen av personuppgifter följer tillämplig lag.",
  "Palvelua kehitetään jatkuvasti. Huollot, tietoliikennehäiriöt tai ulkopuolisten palvelujen häiriöt voivat aiheuttaa käyttökatkoja. Ominaisuuksia voidaan muuttaa tietoturvan, lain, palveluntarjoajien vaatimusten tai palvelun kehittämisen vuoksi. Olennaisista asiakkaan oikeuksiin vaikuttavista muutoksista pyritään ilmoittamaan kohtuullisesti etukäteen.":"Tjänsten utvecklas kontinuerligt. Underhåll, kommunikationsstörningar eller störningar hos externa tjänster kan orsaka avbrott. Funktioner kan ändras på grund av säkerhet, lagkrav, leverantörskrav eller tjänsteutveckling. Väsentliga ändringar som påverkar kundens rättigheter meddelas i rimlig tid när det är möjligt.",
  "Respondo AI -palvelun ohjelmisto, ulkoasu ja palveluntarjoajan aineistot kuuluvat palveluntarjoajalle tai sen lisenssinantajille. Asiakas säilyttää oikeudet itse palveluun lisäämäänsä aineistoon ja antaa Respondolle vain palvelun toteuttamiseen tarvittavan käyttöoikeuden.":"Programvaran, utformningen och leverantörens material i Respondo AI tillhör tjänsteleverantören eller dess licensgivare. Kunden behåller rättigheterna till material som kunden själv lägger till och ger Respondo endast den nyttjanderätt som behövs för att tillhandahålla tjänsten.",
  "Pakottavan lain sallimissa rajoissa Respondo AI ei vastaa välillisistä vahingoista, menetetystä liikevaihdosta tai vahingoista, jotka johtuvat asiakkaan virheellisistä tiedoista, ulkopuolisen palvelun häiriöstä tai automaattisen vastauksen käyttämisestä ilman asianmukaista tarkistusta. Tämä kohta ei rajoita vastuuta siltä osin kuin vastuuta ei lain mukaan voida rajoittaa.":"I den utsträckning tvingande lag tillåter ansvarar Respondo AI inte för indirekta skador, förlorad omsättning eller skador som beror på felaktiga kunduppgifter, störningar i externa tjänster eller användning av automatiska svar utan lämplig kontroll. Detta begränsar inte ansvar som enligt lag inte får begränsas.",

  "Tässä kerrotaan, mitä henkilötietoja Respondo AI käsittelee, miksi niitä käsitellään ja miten Google-käyttäjädataa käytetään.":"Här beskrivs vilka personuppgifter Respondo AI behandlar, varför de behandlas och hur Google-användardata används.",
  "1. Rekisterinpitäjä":"1. Personuppgiftsansvarig",
  "2. Käsiteltävät tiedot":"2. Uppgifter som behandlas",
  "3. Käsittelyn tarkoitukset ja perusteet":"3. Syften och rättsliga grunder",
  "6. Google-tietojen jakaminen ja ihmisten pääsy":"6. Delning av Google-data och mänsklig åtkomst",
  "9. Palveluntarjoajat ja alikäsittelijät":"9. Tjänsteleverantörer och underbiträden",
  "10. Kansainväliset siirrot":"10. Internationella överföringar",
  "11. Säilytys":"11. Lagring",
  "13. Rekisteröidyn oikeudet":"13. Den registrerades rättigheter",
  "Tietosuojaselostetta päivitetään, kun palvelun ominaisuudet, tietojen käsittely tai sovellettavat vaatimukset muuttuvat. Ajantasainen versio julkaistaan tällä sivulla.":"Integritetspolicyn uppdateras när tjänstens funktioner, databehandlingen eller tillämpliga krav ändras. Den aktuella versionen publiceras på denna sida.",
  "Kun Respondo käsittelee henkilötietoja yritysasiakkaan puolesta, yritys toimii lähtökohtaisesti rekisterinpitäjänä ja Respondo henkilötietojen käsittelijänä.":"När Respondo behandlar personuppgifter för en företagskunds räkning är företaget i regel personuppgiftsansvarig och Respondo personuppgiftsbiträde.",
  "Tietoja käsitellään yritysasiakkaan puolesta asiakasviestien käsittelyyn, tietopohjaan perustuvien vastausten tuottamiseen, yhteydenottojen ja varausten välittämiseen sekä asiakkaan käyttöön ottamien integraatioiden toteuttamiseen.":"Uppgifter behandlas för företagskundens räkning för kundmeddelanden, kunskapsbaserade svar, förmedling av kontakter och bokningar samt integrationer som kunden aktiverar.",
  "Respondo käsittelee henkilötietoja vain asiakkaan dokumentoitujen ohjeiden ja palvelun käyttötarkoituksen mukaisesti, ellei sovellettava laki edellytä muuta.":"Respondo behandlar personuppgifter endast enligt kundens dokumenterade instruktioner och tjänstens avsedda användning, om inte tillämplig lag kräver annat.",
  "Palvelu toimii salatun HTTPS-yhteyden kautta.":"Tjänsten använder en krypterad HTTPS-anslutning.",
  "Salasanat tallennetaan yksisuuntaisesti hajautettuina eikä selväkielisinä.":"Lösenord lagras som envägshashar och inte i klartext.",

  "Näissä ehdoissa kerrotaan, millä ehdoilla yritysasiakkaat voivat käyttää Respondo AI -palvelua.":"Dessa villkor beskriver på vilka villkor företagskunder får använda Respondo AI-tjänsten.",
  "2. Palvelu":"2. Tjänsten",
  "5. Kokeilu ja tilaus":"5. Provperiod och abonnemang",
  "Maksut käsitellään Stripen kautta. Jatkuva tilaus uusiutuu valitun laskutusjakson mukaisesti, kunnes se perutaan. Maksun epäonnistuminen voi johtaa palvelun rajoittamiseen tai keskeyttämiseen.":"Betalningar behandlas via Stripe. Ett löpande abonnemang förnyas enligt vald faktureringsperiod tills det sägs upp. En misslyckad betalning kan leda till att tjänsten begränsas eller pausas.",
  "Tilauksen voi perua milloin tahansa. Peruminen estää seuraavan laskutusjakson uusiutumisen. Jo maksettu laskutuskausi jatkuu normaalisti kauden loppuun, ellei pakottava lainsäädäntö tai erikseen sovittu ehto edellytä muuta.":"Abonnemanget kan sägas upp när som helst. Uppsägningen förhindrar nästa förnyelse. En redan betald period fortsätter normalt till periodens slut, om inte tvingande lag eller ett separat avtal kräver annat.",
  "Näihin ehtoihin sovelletaan Suomen lakia. Mahdolliset erimielisyydet pyritään ensisijaisesti ratkaisemaan neuvottelemalla.":"Dessa villkor regleras av finsk lag. Eventuella tvister ska i första hand försöka lösas genom förhandling.",
  "Respondo käyttää palvelun toiminnan kannalta tarpeellisia evästeitä ja vastaavia teknisiä tunnisteita.":"Respondo använder cookies och motsvarande tekniska identifierare som är nödvändiga för tjänstens funktion.",
  "Istuntoeväste":"Sessionscookie",
  "Kävijätilastointi":"Besöksstatistik",
  "Evästevalinnan muuttaminen":"Ändra cookieval",
  "Kirjautumisen yhteydessä selaimeen tallennetaan suojattu istuntoeväste, jotta käyttäjä pysyy kirjautuneena hallintapaneeliin.":"Vid inloggning sparas en skyddad sessionscookie i webbläsaren så att användaren förblir inloggad i kontrollpanelen.",
  "Google-kirjautuminen ja muut ulkopuoliset palvelut voivat käyttää omia välttämättömiä evästeitään omien tietosuojakäytäntöjensä mukaisesti.":"Google-inloggning och andra externa tjänster kan använda sina egna nödvändiga cookies enligt sina integritetspolicyer.",
  "Stripe voi käyttää omia evästeitään maksamisen, petosten torjunnan ja maksutoimintojen toteuttamiseen.":"Stripe kan använda egna cookies för betalningar, bedrägeribekämpning och betalningsfunktioner.",
  "Käsittelyn kohde ja kesto":"Behandlingens föremål och varaktighet",
  "Käsittelyn tarkoitus":"Syftet med behandlingen",
  "Alikäsittelijät":"Underbiträden",
  "Käyttöoikeudet":"Behörigheter",

  "Testaa oikea maksu.":"Testa en riktig betalning.",
  "3 päivää ilmaiseksi":"3 dagar gratis",
  "Vain sinä pääset yrityksesi hallintaan":"Endast du har åtkomst till företagets kontrollpanel",
  "Tarjouspyyntö":"Offertförfrågan",
  "Ajanvaraus":"Bokning",
  "Sähköposti":"E-post",
  "asiakasta jätti yhteystietonsa":"kunder lämnade sina kontaktuppgifter",
  "Esim. Putkityö 65 € / h + alv. Päivystys 95 € / h + alv.":"T.ex. VVS-arbete 65 €/h + moms. Jour 95 €/h + moms.",
  "Tarjouspyyntölomake":"Offertförfrågningsformulär",
  "Esim. putkityöt, LVI-asennukset, sähkötyöt, huollot, päivystys":"T.ex. VVS-arbeten, installationer, elarbeten, service, jour",
  "Esim. päivystysnumero, maksutavat, takuukäytännöt, ajanvarausohjeet, poikkeukset...":"T.ex. journummer, betalningsmetoder, garantipraxis, bokningsinstruktioner, undantag...",
  "hinta, maksaa, tarjous":"pris, kostar, offert",
  "Asiakas":"Kund",
  "1 käyttökerta jäljellä":"1 användning kvar",
  "Saat voimassa olevalla koodilla 20 % pois ensimmäisestä maksullisesta kuukaudesta. Vain kuukausitilaukseen.":"Med en giltig kod får du 20 % rabatt på den första betalda månaden. Gäller endast månadsabonnemang.",
  "Hei! Emme juuri nyt pystyneet vastaamaan puheluusi. Voit vastata tähän viestiin, niin RESPONDO AI auttaa heti.":"Hej! Vi kunde inte svara på ditt samtal just nu. Svara på det här meddelandet så hjälper RESPONDO AI dig direkt.",

  "RESPONDO AI käyttöliittymäesimerkki":"RESPONDO AI gränssnittsexempel",
  "Etunimi Sukunimi":"Förnamn Efternamn",
  "Yrityksen nimi":"Företagets namn",
  "Tämä kertakäyttöinen testitilaus veloittaa heti tasan 0,50 €. Se sulkeutuu onnistuneen maksun jälkeen eikä uusiudu seuraavassa kuussa.":"Den här engångstestprenumerationen debiterar exakt 0,50 € direkt. Den avslutas efter en lyckad betalning och förnyas inte nästa månad.",
  "Suomi":"Finland",
  "Palaa etusivulle.":"Gå tillbaka till startsidan.",
  "Yhteydenotot":"Kontakt",
  "Päivitetty":"Uppdaterad",
  "Teksti kuvaa Respondon nykyistä palvelua ja sitä voidaan päivittää palvelun kehittyessä.":"Texten beskriver Respondos nuvarande tjänst och kan uppdateras när tjänsten utvecklas.",

  "Valitse PNG-, JPG- tai WebP-kuva.":"Välj en PNG-, JPG- eller WebP-bild.",
  "Kuva jäi liian suureksi. Kokeile toista kuvaa.":"Bilden blev för stor. Prova en annan bild.",
  "Asetukset":"Inställningar",
  "Tallenna":"Spara",
  "Sulje":"Stäng",
  "Takaisin":"Tillbaka",
  "Lähetä":"Skicka",
  "Ladataan…":"Laddar…",
  "Kirjautumisistunto vanheni. Yritä uudelleen.":"Inloggningssessionen har gått ut. Försök igen.",
  "Tällä tilillä ei ole vielä RESPONDO AI -käyttäjää. Luo tili ensin.":"Det finns ännu ingen RESPONDO AI-användare för detta konto. Skapa ett konto först.",
  "Tili on luotu, mutta tilaus pitää vielä viimeistellä.":"Kontot har skapats, men abonnemanget måste fortfarande slutföras.",
  "Kirjautuminen epäonnistui. Yritä uudelleen.":"Inloggningen misslyckades. Försök igen.",
  "Sivua ei löytynyt":"Sidan hittades inte",
  "Käsittelyssä":"Behandlas",
  "Lisää ensimmäinen oma vastaus":"Lägg till ditt första egna svar",
  "Lisää Respondo verkkosivullesi":"Lägg till Respondo på din webbplats",
  "Kokeile bottia ensimmäisen kerran":"Testa botten för första gången",
  "Valitse hallintapaneelin osio":"Välj en sektion i kontrollpanelen",
  "Keskustelut viimeisen 14 päivän aikana":"Konversationer under de senaste 14 dagarna",
  "Luonteva ja ystävällinen":"Naturlig och vänlig",
  "Lisätiedot":"Ytterligare information",
  "+ Lisää etusivulle":"+ Lägg till på startsidan",
  "Omistajan hyväksymä":"Godkänd av ägaren",
  "Hyväksytty Truth Engineen":"Godkänd i Truth Engine",
  "Mitä asiakas kysyy?":"Vad frågar kunden?",
  "Kirjoita tähän se vastaus, jonka haluat asiakkaan saavan.":"Skriv svaret som du vill att kunden ska få här.",
  "Sinä":"Du",
  "Kirjoita vastaus asiakkaalle…":"Skriv ett svar till kunden…",
  "Vastaus puuttui":"Svar saknades",
  "Kirjoita tähän oikea vastaus…":"Skriv rätt svar här…",
  "Odottaa hyväksyntää / maksua":"Väntar på godkännande / betalning",
  "Google-sync epäonnistui":"Google-synkroniseringen misslyckades",
  "lähetetty ✓":"skickat ✓",
  "lähetys epäonnistui":"sändningen misslyckades",
  "Käytössä":"Aktiv",
  "● Maksut käytössä":"● Betalningar aktiva",
  "Yhdistä yrityksen Stripe":"Anslut företagets Stripe",
  "Et ole vielä lisännyt verkkosivua":"Du har ännu inte lagt till en webbplats",
  "Tämä asennuskoodi toimii vain yllä olevalla verkkosivulla.":"Den här installationskoden fungerar endast på webbplatsen ovan.",
  "Lisää ensin verkkosivusi osoite yllä. Sen jälkeen botti toimii vain sillä sivulla.":"Lägg först till webbadressen ovan. Därefter fungerar botten endast på den webbplatsen.",
  "✓ Asennus valmis":"✓ Installation klar",
  "Käytetty":"Använd",
  "Maksu ei näytä olevan vielä valmis.":"Betalningen verkar inte vara klar ännu.",
  "Kirjaudutaan sisään…":"Loggar in…",
  "Etsitään…":"Söker…",
  "Ehdotus löytyi ✓":"Förslag hittat ✓",
  "En löydä tähän vielä varmaa vastausta.":"Jag hittar ännu inget säkert svar på detta.",
  "Vastaaminen epäonnistui. Yritä uudelleen.":"Det gick inte att svara. Försök igen.",
  "Lisätään…":"Lägger till…",
  "Kysymys näkyy nyt botin etusivulla.":"Frågan visas nu på bottens startsida.",
  "Kysymys poistettiin botin etusivulta.":"Frågan togs bort från bottens startsida.",
  "Kopioi koodi":"Kopiera kod",
  "Valitse ja kopioi":"Markera och kopiera",
  "Kopioi suosittelulinkki":"Kopiera rekommendationslänk",
  "Poista":"Ta bort",
  "Lähetetään…":"Skickar…",
  "Lähetetty ✓":"Skickat ✓",
  "Kopioi käsin":"Kopiera manuellt",
  "Kopioi":"Kopiera",

  "Jäikö jotain mieleen?":"Har du fortfarande en fråga?",
  "Laita meille viestiä.":"Skicka ett meddelande till oss.",
  "Evästeasetukset":"Cookieinställningar",
  "HALLINTA":"KONTROLL",
  "Epävarmat":"Osäkra",
  "✓ tieto löytyi":"✓ information hittad",
  "ASIAKAS · 22:43":"KUND · 22:43",
  "ASIAKAS · 22:44":"KUND · 22:44",
  "● PÄÄLLÄ":"● PÅ",
  "VIERITÄ ALAS JA KATSO, MITEN SE TOIMII":"SCROLLA NED OCH SE HUR DET FUNGERAR",
  "05 / KOKEILE KÄYTÄNNÖSSÄ":"05 / PROVA SJÄLV",
  "Asiakkaasi seuraava kysymys voi tulla vaikka tänä iltana.":"Din kunds nästa fråga kan komma redan i kväll.",
  "Anna Respondon hoitaa vastaus silloin, kun sinä et ehdi.":"Låt Respondo sköta svaret när du själv inte hinner.",
  "Päätä vasta sen jälkeen.":"Bestäm dig först därefter.",
  "verkossa":"online",
  "hallintapaneeli":"kontrollpanel",
  "oma tietopohja":"egen kunskapsbas",
  "Palvelu alkaa 89 €.":"Tjänsten kostar från 89 €.",
  "VASTAUS PUUTTUU":"SVAR SAKNAS",
  "Asiakas ohjattu sinulle":"Kunden skickades vidare till dig",
  "Vieritä eteenpäin ja katso, miten kaikki toimii yhdessä.":"Scrolla vidare och se hur allt fungerar tillsammans.",
  "03 / NOPEA VASTAUS MERKITSEE":"03 / ETT SNABBT SVAR SPELAR ROLL",
  "Asiakas voi kysyä milloin vain.":"Kunden kan fråga när som helst.",
  "Vastauksen ei tarvitse odottaa.":"Svaret behöver inte vänta.",
  "odottaa saavansa palvelua ympäri vuorokauden*":"förväntar sig service dygnet runt*",
  "odottaa saavansa vastauksen heti*":"förväntar sig ett svar direkt*",
  "ei vastannut yhteydenottoon lainkaan*":"svarade inte alls på kontakten*",
  "* Avaa luku nähdäksesi lähteen. HBR:n aineisto on Yhdysvalloista vuodelta 2011.":"* Öppna siffran för att se källan. HBR:s data är från USA 2011.",
  "“Paljonko tämä maksaa?”":"”Vad kostar det här?”",
  "asiakas":"kund",
  "Kokeile itse":"Testa själv",
  "Palvelut":"Tjänster",
  "Vastaus puuttuu":"Svar saknas",
  "Sinulle":"Till dig",
  "Mitä yksi menetetty yhteydenotto voi maksaa?":"Vad kan en missad kontakt kosta?",
  "Paljonko rahaa voi jäädä pöydälle,":"Hur mycket pengar kan lämnas på bordet,",
  "jos asiakkaalle ei vastata?":"om kunden inte får svar?",
  "Säädä työn arvo ja päivässä vastaamatta jäävien yhteydenottojen määrä. Laske itse näyttää niiden potentiaalisen myyntiarvon.":"Justera värdet per affär och antalet obesvarade kontakter per dag. Kalkylatorn visar deras potentiella försäljningsvärde.",
  "KESKIMÄÄRÄINEN KAUPPA":"GENOMSNITTLIG AFFÄR",
  "Paljonko yksi asiakas tuo keskimäärin?":"Hur mycket är en kund värd i genomsnitt?",
  "ILMAN VASTAUSTA / PÄIVÄ":"OBESVARADE / DAG",
  "Montako yhteydenottoa jää ilman vastausta?":"Hur många kontakter blir obesvarade?",
  "MAHDOLLINEN ARVO / 30 PÄIVÄÄ":"MÖJLIGT VÄRDE / 30 DAGAR",
  "Päivässä":"Per dag",
  "Vuodessa":"Per år",
  "Laskelma on suuntaa-antava. Se näyttää yhteydenottojen arvon tilanteessa, jossa jokainen niistä vastaisi yhtä keskimääräistä kauppaa. Todellinen tulos riippuu siitä, kuinka moni yhteydenotto muuttuu asiakkaaksi.":"Beräkningen är vägledande. Den visar kontaktförfrågningarnas värde om varje kontakt motsvarade en genomsnittlig affär. Det faktiska resultatet beror på hur många kontakter som blir kunder.",
  "Yksi selkeä hinta.":"Ett tydligt pris.",
  "Tiedät mitä maksat.":"Du vet vad du betalar.",
  "Kokeile 3 päivää ilmaiseksi. Peruuta ennen kokeilun päättymistä, jos et halua jatkaa.":"Testa gratis i 3 dagar. Avsluta innan provperioden slutar om du inte vill fortsätta.",
  "KUUKAUSITILAUS":"MÅNADSABONNEMANG",
  "maksa kuukausittain":"betala månadsvis",
  "Kuukausi":"Månad",
  "VUOSITILAUS":"ÅRSABONNEMANG",
  "säästä 60 €":"spara 60 €",
  "Laskutetaan vuosittain 539,88 €":"Faktureras årligen 539,88 €",
  "Kaikki samat ominaisuudet kuin kuukausitilauksessa":"Alla samma funktioner som i månadsabonnemanget",
  "Maksu kerran vuodessa":"Betalning en gång per år",
  "Voit käyttää palvelua maksetun kauden loppuun":"Du kan använda tjänsten till slutet av den betalda perioden",
  "Valitse vuosi":"Välj årsplan",
  "odottaa välitöntä vuorovaikutusta":"förväntar sig omedelbar interaktion",
  "odottaa asiakaspalvelua 24/7":"förväntar sig kundservice dygnet runt",
  "ei vastannut verkkoliidiin lainkaan":"svarade inte alls på webbleaden",
  "vastasi ensimmäisen tunnin aikana":"svarade inom den första timmen",
  "pitää nopeutta ja oikeaa ratkaisua ostopäätökseen vaikuttavana":"anser att snabbhet och rätt lösning påverkar köpbeslutet",
  "Kerro Respondolle yrityksesi tiedot kerran. Sen jälkeen se vastaa asiakkaillesi myös silloin, kun sinä et ehdi. Jos tarvittava tieto puuttuu, kysymys ohjataan sinulle.":"Berätta företagets information för Respondo en gång. Därefter svarar den dina kunder även när du själv inte hinner. Om nödvändig information saknas skickas frågan vidare till dig.",
  "RESPONDO AI / PÄÄLLÄ":"RESPONDO AI / PÅ",
  "ASIAKASPALVELU":"KUNDSERVICE",
  "Vastaukset perustuvat yrityksesi antamiin tietoihin.":"Svaren baseras på informationen som ditt företag har angett.",
  "TIETO LÖYTYI":"INFORMATION HITTAD",
  "Tieto löytyi":"Information hittad",
  "Paljonko huolto maksaa ja palveletteko myös viikonloppuna?":"Vad kostar servicen och har ni öppet även på helger?",
  "Perushuolto alkaa 89 eurosta. Lauantaisin palvelemme klo 10–14.":"Grundservice kostar från 89 euro. På lördagar har vi öppet kl. 10–14.",
  "Hinnasto / Aukioloajat":"Prislista / Öppettider",
  "Voitteko luvata valmistumisen huomiseksi?":"Kan ni lova att det blir klart till i morgon?",
  "Tähän ei löydy varmaa vastausta.":"Det finns inget säkert svar på detta.",
  "Kysymys ohjataan sinulle vastattavaksi.":"Frågan skickas vidare till dig för svar.",
  "01 / ASIAKAS KYSYY":"01 / KUNDEN FRÅGAR",
  "KYSYMYS":"FRÅGA",
  "Paljonko huoltokäynti maksaa?":"Vad kostar ett servicebesök?",
  "Perushuolto alkaa 89 eurosta. Haluatko myös vapaat ajat?":"Grundservice kostar från 89 euro. Vill du också se lediga tider?",
  "vastaus löytyi yrityksen tiedoista":"svaret hittades i företagets information",
  "ASIAKAS":"KUND",
  "kysymys tuli juuri":"frågan kom precis",
  "VASTAUS":"SVAR",
  "vastaus heti":"svar direkt",
  "TIETO":"INFORMATION",
  "tieto löytyy":"informationen finns",
  "vieritä alas":"scrolla ned",
  "verkossa":"online",
  "hallintapaneeli":"dashboard",
  "oma tietopohja":"egen kunskapsbas",
  "01 / LISÄÄ YRITYKSESI TIEDOT":"01 / LÄGG TILL FÖRETAGETS INFORMATION",
  "Kerro, mitä":"Bestäm vad",
  "asiakkaalle saa vastata.":"som får besvaras till kunden.",
  "TIETOPOHJA":"KUNSKAPSBAS",
  "HINNAT":"PRISER",
  "Huolto alkaen 89 €":"Service från 89 €",
  "AUKIOLO":"ÖPPETTIDER",
  "TOIMIALUE":"SERVICEOMRÅDE",
  "HINTA":"PRIS",
  "PALVELUT":"TJÄNSTER",
  "02 / ASIAKAS KYSYY OMILLA SANOILLAAN":"02 / KUNDEN FRÅGAR MED EGNA ORD",
  "Niin kuin ihmiset":"Så som människor",
  "oikeasti kysyvät.":"faktiskt frågar.",
  "Onks teillä vapaita aikoja huomiselle?":"Har ni lediga tider i morgon?",
  "Mitä tää maksaa?":"Vad kostar det här?",
  "Tuletteko Nokialle asti?":"Kommer ni ända till Nokia?",
  "Saako tän viikonloppuna?":"Går det att få i helgen?",
  "löytää vastauksen yrityksesi tiedoista":"hittar svaret i företagets information",
  "03 / RESPONDO HOITAA LOPUT":"03 / RESPONDO SKÖTER RESTEN",
  "Vastaa heti.":"Svarar direkt.",
  "Yrityksesi tiedoilla.":"Med företagets information.",
  "VASTAUS LÖYTYY":"SVAR FINNS",
  "Vastaa heti":"Svara direkt",
  "VASTAUSTA EI LÖYDY":"INGET SVAR FINNS",
  "Ohjaa sinulle":"Skicka till dig",
  "02 / KAIKKI YHDESSÄ":"02 / ALLT PÅ ETT STÄLLE",
  "Näet yhdellä silmäyksellä":"Se med en blick",
  "mitä asiakkaat kysyvät.":"vad kunderna frågar.",
  "PÄÄLLÄ":"PÅ",
  "KESKUSTELUT":"KONVERSATIONER",
  "UUSI KESKUSTELU":"NY KONVERSATION",
  "Paljonko maksaa?":"Vad kostar det?",
  "Järjestelmä aktiivinen":"Systemet är aktivt",
  "RESPONDO / ASIAKASPALVELU":"RESPONDO / KUNDSERVICE",
  "Kysymyksestä vastaukseen.":"Från fråga till svar.",
  "Yhdessä näkymässä.":"I en enda vy.",
  "Asiakas kysyy, Respondo vastaa yrityksesi tiedoilla ja tallentaa tarvittaessa yhteydenoton, tarjouspyynnön tai ajanvarauksen.":"Kunden frågar, Respondo svarar med företagets information och sparar vid behov en kontaktförfrågan, offertförfrågan eller bokning.",
  "YRITYKSEN TIEDOT":"FÖRETAGETS INFORMATION",
  "Hinnat · palvelut · aukioloajat":"Priser · tjänster · öppettider",
  "Tietopohja":"Kunskapsbas",
  "JATKOTOIMI":"NÄSTA ÅTGÄRD",
  "Tarjouspyyntö · ajanvaraus · yhteydenotto":"Offertförfrågan · bokning · kontakt",
  "Hallintapaneeli":"Kontrollpanel",
  "Kysymyksestä vastaukseen":"Från fråga till svar",
  "04 / KUN VASTAUSTA EI LÖYDY":"04 / NÄR SVARET SAKNAS",
  "Jos tietoa ei löydy,":"Om informationen saknas,",
  "kysymys ohjataan sinulle.":"skickas frågan vidare till dig.",
  "Vastaukset perustuvat yrityksesi antamiin tietoihin. Jos tarvittava tieto puuttuu, kysymys siirtyy sinulle.":"Svaren baseras på informationen som ditt företag har angett. Om nödvändig information saknas skickas frågan vidare till dig.",
  'Tuote':'Produkt','Tietopohja':'Kunskapsbas','Kokeile bottia':'Testa botten','Hinta':'Pris','Tietoturva':'Säkerhet',
  'Kirjaudu':'Logga in','Kokeile ilmaiseksi':'Prova gratis','Näin se toimii':'Så fungerar det','Mitä saat':'Funktioner',
  'Miksi nopeus ratkaisee':'Varför snabbhet spelar roll','Laske itse':'Kalkylator','Hinnat':'Priser','Ota yhteyttä':'Kontakta oss',
  'ASIAKASPALVELU, JOKA ON AINA PAIKALLA':'KUNDSERVICE SOM ALLTID ÄR PÅ PLATS','Asiakas kysyy.':'Kunden frågar.','RESPONDO vastaa.':'RESPONDO svarar.',
  'Lisää yrityksesi tiedot kerran. RESPONDO vastaa asiakkaillesi ympäri vuorokauden ja ohjaa kysymyksen sinulle silloin, kun varmaa vastausta ei löydy.':'Lägg till företagets information en gång. RESPONDO svarar dina kunder dygnet runt och skickar frågan vidare till dig när ett säkert svar saknas.',
  'Kokeile 3 päivää ilmaiseksi':'Prova gratis i 3 dagar','Tutustu tuotteeseen':'Utforska produkten','3 päivää ilmaiseksi':'3 dagar gratis','Peruuta milloin tahansa':'Avsluta när som helst',
  'TIETOPOHJA':'KUNSKAPSBAS','VASTAUKSET':'SVAR','EPÄVARMUUS':'OSÄKERHET','Lisää tiedot kerran.':'Lägg till informationen en gång.',
  'RESPONDO hoitaa toistuvat kysymykset.':'RESPONDO hanterar återkommande frågor.','Lisää yrityksesi tieto':'Lägg till företagets information',
  'Asiakas kysyy':'Kunden frågar','Asiakas saa vastauksen':'Kunden får ett svar','Vähemmän säätöä.':'Mindre krångel.','Enemmän vastauksia.':'Fler svar.',
  'Kaikki olennainen yhdessä paikassa.':'Allt viktigt på ett ställe.','KESKUSTELUT':'KONVERSATIONER','Näet, mitä asiakkaat oikeasti kysyvät.':'Se vad kunderna faktiskt frågar.',
  'KEHITYS':'UTVECKLING','Sinun tietosi.':'Din information.','Asiakkaalle oikea vastaus.':'Rätt svar till kunden.','Helppo ylläpitää':'Enkelt att underhålla',
  'Muuta tietoa yhdestä paikasta.':'Uppdatera information på ett ställe.','Ei arvailua':'Inga gissningar','Puuttuva tieto ei muutu keksityksi vastaukseksi.':'Saknad information blir aldrig ett påhittat svar.',
  'Helppo asentaa':'Enkelt att installera','Yksi asennusrivi verkkosivulle.':'En installationsrad på webbplatsen.','Hyväksytty tietopohja':'Godkänd kunskapsbas',
  'Hinnoittelu':'Prissättning','Aukioloajat':'Öppettider','Toimialue':'Serviceområde','Suomi':'Finland','Poikkeustilanteet':'Undantag','Ohjaa yhteydenottoon':'Hänvisa till kontakt',
  'Viimeksi päivitetty':'Senast uppdaterad','juuri nyt':'just nu','VASTAA':'SVARAR','asiakkaillesi':'dina kunder','sinun hallinnassa':'under din kontroll','aina':'alltid',
  'ALKAEN':'FRÅN','49,99 € / kk':'49,99 € / mån','KOKEILU':'PROVPERIOD','3 päivää':'3 dagar','maksutta':'gratis',
  'Asiakas ei halua odottaa.':'Kunden vill inte vänta.','Nopea vastaus näkyy kokemuksessa.':'Snabba svar förbättrar kundupplevelsen.','HUOM':'OBS',
  'Mitä yksi menetetty yhteydenotto voi maksaa?':'Vad kan en missad kontakt kosta?','Päivässä':'Per dag','Vuodessa':'Per år','Selkeä hinta.':'Tydligt pris.','Ei yllätyksiä.':'Inga överraskningar.',
  'Kuukausi':'Månad','Vuosi':'År','Chat suoraan omalle verkkosivullesi':'Chatt direkt på din webbplats','Vastaukset yrityksesi omista tiedoista':'Svar från företagets egen information',
  'Näet, mitä asiakkaat kysyvät':'Se vad kunderna frågar','Puuttuvat vastaukset ohjataan sinulle':'Osäkra frågor skickas vidare till dig','Hallitse tilausta turvallisesti Stripessä':'Hantera abonnemanget säkert i Stripe',
  'Valitse vuosi':'Välj årsplan','Anna asiakkaillesi vastaus myös silloin, kun et itse ehdi.':'Ge kunderna svar även när du själv inte hinner.','KOKEILE':'PROVA GRATIS',
  'Kysy lisää.':'Frågor?','Vastaamme.':'Vi svarar.','Yritys':'Företag','Lakiasiat':'Juridik','Käyttöehdot':'Användarvillkor','Tietosuojaseloste':'Integritetspolicy',
  'Evästeet':'Cookies','Tietojenkäsittely':'Databehandling','B2B-ohjelmistopalvelu':'B2B-programvarutjänst','ALOITA KOKEILU':'BÖRJA PROVA RESPONDO AI',
  'Kokeile ensin.':'Prova först.','Päätä sitten.':'Bestäm sedan.','Luo tili':'Skapa konto','Lisää maksutapa Stripessä':'Lägg till betalningsmetod i Stripe',
  'Korttitietosi menevät suoraan Stripelle.':'Dina kortuppgifter går direkt till Stripe.','Lisää yrityksesi tiedot':'Bygg din kunskapsbas','PALVELUNTARJOAJA':'TJÄNSTELEVERANTÖR',
  'LUO TILI':'SKAPA KONTO','Nimi':'Namn','Sähköposti':'E-post','Y-tunnus':'FO-nummer','Salasana':'Lösenord','Vähintään 10 merkkiä':'Minst 10 tecken',
  'Tilaus':'Abonnemang','tai sähköpostilla':'eller med e-post','Jatka Googlella':'Fortsätt med Google','Hallintapaneeli':'Kontrollpanel','Tervetuloa':'Välkommen',
  'takaisin.':'tillbaka.','KIRJAUDU':'LOGGA IN','Tervetuloa takaisin':'Välkommen tillbaka','Kirjaudu Googlella':'Logga in med Google','Kirjaudu sisään':'Öppna kontrollpanelen',
  'Asetukset':'Inställningar','Profiili':'Profil','Keskustelut':'Konversationer','Liidit':'Leads','Integraatiot':'Integrationer','Tallenna':'Spara','Peruuta':'Avbryt',
  'Sulje':'Stäng','Takaisin':'Tillbaka','Lähetä':'Skicka','Ladataan…':'Laddar…'
}));

const EXTRA_UI_TEXT = new Map(Object.entries({
  "Olen asentanut botin": ["Jag har installerat botten", "I have installed the bot"],
  "✓ Asennus valmis": ["✓ Installationen är klar", "✓ Installation complete"],
  "SUOSITTELE RESPONDOA": ["REKOMMENDERA RESPONDO", "REFER RESPONDO"],
  "Anna tämä henkilökohtainen koodi yhdelle toiselle yritykselle. Koodi toimii kerran, vain kuukausitilauksessa, ja alennus koskee ensimmäistä maksullista kuukautta 3 päivän kokeilun jälkeen.": ["Ge den här personliga koden till ett annat företag. Koden kan användas en gång, endast med månadsabonnemang, och rabatten gäller den första betalda månaden efter den 3 dagar långa provperioden.", "Give this personal code to one other company. The code can be used once, only with the monthly plan, and the discount applies to the first paid month after the 3-day trial."],
  "OMA KERTAKÄYTTÖINEN SUOSITTELUKOODISI": ["DIN PERSONLIGA REKOMMENDATIONSKOD FÖR ENGÅNGSBRUK", "YOUR ONE-TIME REFERRAL CODE"],
  "Yhdistetty ✓": ["Ansluten ✓", "Connected ✓"],
  "Ei yhdistetty": ["Inte ansluten", "Not connected"],
  "Varaukset synkronoidaan kalenteriin": ["Bokningar synkroniseras med kalendern", "Bookings are synced to the calendar"],
  "Katkaise yhteys": ["Koppla från", "Disconnect"],
  "Yrityksen maa": ["Företagets land", "Company country"],
  "Ruotsi": ["Sverige", "Sweden"],
  "Saksa": ["Tyskland", "Germany"],
  "Iso-Britannia": ["Storbritannien", "United Kingdom"],
  "Yhdysvallat": ["USA", "United States"],
  "Maksut käytössä": ["Betalningar aktiva", "Payments active"],
  "Viimeistele Stripe": ["Slutför Stripe", "Finish Stripe setup"],
  "Ei asetettu": ["Inte konfigurerad", "Not configured"],
  "Käytössä": ["Aktiv", "Active"],
  "Yksikön nimi": ["Enhetsnamn", "Unit name"],
  "0 avoinna": ["0 öppna", "0 open"],
  "Ei uusia pyyntöjä.": ["Inga nya förfrågningar.", "No new requests."],
  "Kun asiakas pyytää tarjouksen, ajan, tilauksen tarkistuksen tai yhteydenoton, se ilmestyy tähän.": ["När en kund begär en offert, bokar en tid, frågar om en beställning eller tar kontakt visas det här.", "When a customer requests a quote, books a time, asks about an order or contacts you, it appears here."],
  "kohdetta": ["poster", "items"],
  "Yrityksen tiedot": ["Företagsuppgifter", "Company details"],
  "Omistajan hyväksymä": ["Godkänd av ägaren", "Owner approved"],
  "Manuaalinen": ["Manuell", "Manual"],
  "tarkistettu": ["kontrollerad", "verified"],
  "Kaikkiin kysymyksiin löytyi vastaus.": ["Alla frågor fick ett svar.", "All questions had an answer."],
  "Jos vastaan tulee kysymys, johon tietoa ei vielä ole, se ilmestyy tähän.": ["Om en fråga saknar information visas den här.", "If a question comes up that does not yet have an answer, it will appear here."],
  "Ei vielä aktiivisia keskusteluja.": ["Inga aktiva konversationer ännu.", "No active conversations yet."],
  "Kun verkkosivulla, WhatsAppissa, Instagramissa tai puhelimessa alkaa keskustelu, se ilmestyy tähän.": ["När en konversation börjar på webbplatsen, WhatsApp, Instagram eller telefon visas den här.", "When a conversation starts on the website, WhatsApp, Instagram or by phone, it appears here."],
  "vapaana": ["lediga", "available"],
  "aktiivista": ["aktiva", "active"],

  "RESPONDO AI etusivu": ["RESPONDO AI startsida", "RESPONDO AI home"],
  "Language": ["Språk", "Language"],
  "Googlella": ["med Google", "with Google"],
  "Sivun osiot": ["Sidans avsnitt", "Page sections"],
  "RESPONDO AI yhdistää tietopohjan, keskustelut ja jatkuvasti paranevan asiakaspalvelun yhteen näkymään.": ["RESPONDO AI samlar kunskapsbasen, konversationerna och en kundservice som hela tiden förbättras i en och samma vy.", "RESPONDO AI brings the knowledge base, conversations and continuously improving customer service into one view."],
  "Hinnat, aukioloajat, palvelut ja omat kysymys–vastausparit pysyvät hallinnassa.": ["Priser, öppettider, tjänster och egna fråge–svar-par hålls samlade och under kontroll.", "Prices, opening hours, services and your own question-and-answer pairs stay under control."],
  "Kun vastaan tulee uusi kysymys, lisäät vastauksen kerran.": ["När en ny fråga dyker upp lägger du till svaret en gång.", "When a new question comes up, you add the answer once."],
  "Tietopohjan esimerkkikuva": ["Exempelbild av kunskapsbasen", "Knowledge base example image"],
  "Keskustelun esimerkkikuva": ["Exempelbild av en konversation", "Conversation example image"],
  "Analytiikan esimerkkikuva": ["Exempelbild av analysvyn", "Analytics example image"],
  "Vastaukset": ["Svar", "Answers"],
  "Asennus": ["Installation", "Installation"],
  "Lisää hinnat, palvelut, aukioloajat ja omat vastaukset. Botti käyttää niitä asiakkaiden kysymyksiin vastaamiseen.": ["Lägg till priser, tjänster, öppettider och egna svar. Botten använder dem för att besvara kundernas frågor.", "Add prices, services, opening hours and your own answers. The bot uses them to answer customer questions."],
  "Hinnat, palvelut, aukioloajat ja omat kysymys–vastausparit.": ["Priser, tjänster, öppettider och egna fråge–svar-par.", "Prices, services, opening hours and your own question-and-answer pairs."],
  "Luonnollisesti. Omilla sanoillaan.": ["Naturligt. Med sina egna ord.", "Naturally. In their own words."],
  "Jos varmaa tietoa ei löydy, kysymys ohjataan sinulle eikä vastausta keksitä.": ["Om säker information saknas skickas frågan vidare till dig i stället för att ett svar hittas på.", "If reliable information is not available, the question is routed to you instead of inventing an answer."],
  "Sinä päätät, mitä yrityksestäsi kerrotaan. Muutokset päivittyvät botille yhdestä paikasta.": ["Du bestämmer vad som får sägas om ditt företag. Ändringar uppdateras till botten från ett och samma ställe.", "You decide what can be said about your company. Changes are updated to the bot from one place."],
  "4 HYVÄKSYTTYÄ TIETOA": ["4 GODKÄNDA UPPGIFTER", "4 APPROVED ITEMS"],
  "AJAN TASALLA": ["UPPDATERAT", "UP TO DATE"],
  "Peruspaketti alkaa 49,99 €/kk": ["Grundpaketet börjar på 49,99 €/mån", "The basic plan starts at €49.99/month"],
  "PERUSTUU": ["BASERAS PÅ", "BASED ON"],
  "Alla olevat luvut perustuvat julkaistuihin tutkimuksiin ja raportteihin. Lähde, vuosi ja tutkimuskonteksti näkyvät jokaisen luvun yhteydessä.": ["Siffrorna nedan bygger på publicerade studier och rapporter. Källa, år och forskningskontext visas vid varje siffra.", "The figures below are based on published studies and reports. The source, year and research context are shown with each figure."],
  "Harvard Business Review’n auditissa 2 241 yhdysvaltalaisesta yrityksestä lähes joka neljäs ei vastannut testiliidiin 30 päivän aikana.": ["I en Harvard Business Review-granskning av 2 241 amerikanska företag svarade nästan vart fjärde företag inte på testleadet inom 30 dagar.", "In a Harvard Business Review audit of 2,241 U.S. companies, nearly one in four did not respond to the test lead within 30 days."],
  "Samassa HBR-auditissa vain 37 % yrityksistä reagoi verkkoliidiin tunnin sisällä. Erillisessä 1,25 miljoonan liidin analyysissä alle tunnissa yhteyttä ottaneet olivat lähes 7× todennäköisempiä kvalifioimaan liidin kuin myöhemmin vastanneet.": ["I samma HBR-granskning reagerade bara 37 % av företagen på ett webblead inom en timme. I en separat analys av 1,25 miljoner leads var de som tog kontakt inom en timme nästan 7× mer benägna att kvalificera leadet än de som svarade senare.", "In the same HBR audit, only 37% of companies responded to a web lead within an hour. In a separate analysis of 1.25 million leads, those contacted within an hour were nearly 7× more likely to qualify the lead than those contacted later."],
  "Salesforcen asiakastutkimuksen mukaan 77 % asiakkaista odottaa voivansa olla vuorovaikutuksessa yrityksen kanssa heti yhteydenottohetkellä.": ["Enligt Salesforces kundundersökning förväntar sig 77 % av kunderna att kunna interagera med ett företag direkt när de tar kontakt.", "According to Salesforce customer research, 77% of customers expect to be able to interact with a company immediately when they make contact."],
  "Zendesk CX Trends 2026 -tutkimuksessa 74 % kuluttajista sanoi AI:n nostaneen odotuksen siitä, että asiakaspalvelu on saatavilla vuorokauden ympäri.": ["I Zendesk CX Trends 2026 uppgav 74 % av konsumenterna att AI har höjt deras förväntningar på kundservice dygnet runt.", "In Zendesk CX Trends 2026, 74% of consumers said AI had raised their expectations for round-the-clock customer service."],
  "Zendesk raportoi yli 11 000 kuluttajan ja yritysjohtajan aineistosta 22 maassa, että 86 % kuluttajista sanoo palvelun reagointinopeuden ja oikean ratkaisun vaikuttavan vahvasti heidän ostohalukkuuteensa.": ["Zendesk rapporterar från över 11 000 konsumenter och företagsledare i 22 länder att 86 % av konsumenterna säger att snabb respons och rätt lösning starkt påverkar deras vilja att köpa.", "Zendesk reports from more than 11,000 consumers and business leaders in 22 countries that 86% of consumers say response speed and getting the right solution strongly influence their willingness to buy."],
  "HBR:n lead response -tutkimus on vuodelta 2011 ja tehtiin Yhdysvalloissa, joten sitä ei esitetä nykyisten suomalaisyritysten suorana keskiarvona. Se kertoo mitatusta yhteydestä vastausnopeuden ja liidin kvalifioinnin välillä.": ["HBR:s studie om lead response är från 2011 och genomfördes i USA, så den presenteras inte som ett direkt genomsnitt för dagens finländska företag. Den visar ett uppmätt samband mellan svarshastighet och leadkvalificering.", "The HBR lead-response study is from 2011 and was conducted in the United States, so it is not presented as a direct average for Finnish companies today. It shows a measured relationship between response speed and lead qualification."],
  "Työn arvo euroina": ["Värdet på arbetet i euro", "Value of the job in euros"],
  "Vastaamattomat yhteydenotot päivässä": ["Obesvarade förfrågningar per dag", "Unanswered inquiries per day"],
  "Täytä omat ja yrityksesi perustiedot.": ["Fyll i dina egna och företagets grunduppgifter.", "Enter your basic details and your company's details."],
  "Kerro Respondolle, mitä asiakkaillesi saa vastata.": ["Berätta för Respondo vad som får besvaras till dina kunder.", "Tell Respondo what it may answer to your customers."],
  "Y-tunnus · Suomi": ["FO-nummer · Finland", "Business ID · Finland"],
  "49,99 €/kk · kuukausi": ["49,99 €/mån · månadsvis", "€49.99/month · monthly"],
  "44,99 €/kk · laskutetaan 539,88 €/vuosi": ["44,99 €/mån · faktureras 539,88 €/år", "€44.99/month · billed €539.88/year"],
  "Suosittelukoodi": ["Rekommendationskod", "Referral code"],
  "valinnainen": ["valfritt", "optional"],
  "Hyväksyn": ["Jag godkänner", "I accept"],
  "käyttöehdot": ["användarvillkoren", "the terms of service"],
  "ja": ["och", "and"],
  "tietosuojaselosteen": ["integritetspolicyn", "the privacy policy"],
  "Jatka maksutavan lisäämiseen": ["Fortsätt till betalningsmetod", "Continue to payment method"],
  "Korttitiedot käsittelee Stripe. Respondo ei näe eikä tallenna korttinumeroasi.": ["Kortuppgifterna behandlas av Stripe. Respondo ser eller lagrar inte ditt kortnummer.", "Card details are processed by Stripe. Respondo does not see or store your card number."],
  "Automaattinen kirjautuminen ei onnistunut. Kirjaudu samalla sähköpostilla ja salasanalla, jonka loit ennen maksua.": ["Den automatiska inloggningen lyckades inte. Logga in med samma e-postadress och lösenord som du skapade före betalningen.", "Automatic sign-in failed. Sign in with the same email and password you created before payment."],
  "TYÖTILA": ["ARBETSYTA", "WORKSPACE"],
  "Näytä osio": ["Visa avsnitt", "Show section"],
  "Yleiskatsaus": ["Översikt", "Overview"],
  "Yrityksen tiedot & botti": ["Företagsuppgifter & bot", "Company details & bot"],
  "Asiakkaat": ["Kunder", "Customers"],
  "Toiminnot & integraatiot": ["Åtgärder & integrationer", "Actions & integrations"],
  "Asennus & tili": ["Installation & konto", "Installation & account"],
  "Botti käytössä": ["Botten aktiv", "Bot active"],
  "Kirjaudu ulos": ["Logga ut", "Log out"],
  "Valitse ylhäältä mitä haluat tehdä. Näytämme vain siihen liittyvät asiat.": ["Välj ovan vad du vill göra. Vi visar bara det som hör till den delen.", "Choose what you want to do above. We only show the relevant items."],
  "KÄYTTÖÖNOTTO": ["KOM IGÅNG", "SETUP"],
  "/ kohtaa valmiina": ["/ steg klara", "/ steps complete"],
  "yhteensä": ["totalt", "total"],
  "VIIMEISET 7 PV": ["SENASTE 7 DAGARNA", "LAST 7 DAYS"],
  "keskustelua": ["konversationer", "conversations"],
  "VASTATTU SUORAAN": ["BESVARADE DIREKT", "ANSWERED DIRECTLY"],
  "ilman että asiakas piti ohjata eteenpäin": ["utan att kunden behövde skickas vidare", "without routing the customer onward"],
  "YHTEYDENOTOT": ["KONTAKTFÖRFRÅGNINGAR", "CONTACT REQUESTS"],
  "VASTAUSTEN VARMENNUS": ["SVARSKONTROLL", "ANSWER VERIFICATION"],
  "% varmennettu": ["% verifierat", "% verified"],
  "/ tietoa hyväksytty · tarkistettu viimeisen 90 päivän aikana.": ["/ uppgifter godkända · kontrollerade under de senaste 90 dagarna.", "/ items approved · checked within the last 90 days."],
  "BOTIN ITSETESTI": ["BOTTENS SJÄLVTEST", "BOT SELF-TEST"],
  "Testin laajuus": ["Testets omfattning", "Test scope"],
  "500 kysymystä": ["500 frågor", "500 questions"],
  "1 000 kysymystä": ["1 000 frågor", "1,000 questions"],
  "TOIMINTOKESKUS · 30 PV": ["ÅTGÄRDSCENTER · 30 DAGAR", "ACTION CENTER · 30 DAYS"],
  "toimintoa": ["åtgärder", "actions"],
  "14 PÄIVÄÄ": ["14 DAGAR", "14 DAYS"],
  "Näin paljon asiakkaat ovat kysyneet": ["Så här mycket har kunderna frågat", "How much customers have asked"],
  "/ 30 pv": ["/ 30 dagar", "/ 30 days"],
  "Kun keskusteluja kertyy, näet kehityksen tässä.": ["När fler konversationer samlas ser du utvecklingen här.", "As conversations accumulate, you will see the trend here."],
  "TÄLLÄ VIIKOLLA": ["DEN HÄR VECKAN", "THIS WEEK"],
  "Mihin kysymyksiin vastaus vielä puuttuu?": ["Vilka frågor saknar fortfarande svar?", "Which questions still need an answer?"],
  "Kaikkiin tämän viikon kysymyksiin löytyi vastaus.": ["Alla frågor den här veckan fick ett svar.", "All questions this week had an answer."],
  "Hyvältä näyttää.": ["Det ser bra ut.", "Looks good."],
  "Kerro Respondolle tärkeimmät asiat yrityksestäsi": ["Berätta det viktigaste om ditt företag för Respondo", "Tell Respondo the key facts about your company"],
  "Täytä nämä kerran. Jos jokin muuttuu, voit päivittää tiedot milloin tahansa.": ["Fyll i detta en gång. Om något ändras kan du uppdatera uppgifterna när som helst.", "Fill these in once. If anything changes, you can update the details at any time."],
  "Perustiedot": ["Grunduppgifter", "Basic details"],
  "BOTIN ULKOASU": ["BOTTENS UTSEENDE", "BOT APPEARANCE"],
  "Nimeä botti ja valitse sille kuva": ["Namnge botten och välj en bild", "Name the bot and choose an image"],
  "Asiakas näkee nämä tiedot verkkosivusi chatissa. Voit käyttää omaa kuvaa tai valita yhden valmiista roboteista.": ["Kunden ser dessa uppgifter i chatten på din webbplats. Du kan använda en egen bild eller välja en av de färdiga robotarna.", "Customers see these details in the chat on your website. You can use your own image or choose one of the ready-made robots."],
  "Botin nimi": ["Bottens namn", "Bot name"],
  "Esim. Aino, Roope tai Yrityksen Apuri": ["T.ex. Aino, Roope eller Företagets Hjälpare", "E.g. Aino, Roope or Company Helper"],
  "Valmiit robottikuvat": ["Färdiga robotbilder", "Ready-made robot images"],
  "Lataa oma kuva": ["Ladda upp egen bild", "Upload your own image"],
  "PNG, JPG tai WebP · kuva rajataan automaattisesti neliöksi": ["PNG, JPG eller WebP · bilden beskärs automatiskt till en kvadrat", "PNG, JPG or WebP · the image is automatically cropped to a square"],
  "Ensimmäinen viesti asiakkaalle": ["Första meddelandet till kunden", "First message to the customer"],
  "Vastaustyyli": ["Svarsstil", "Response style"],
  "Lyhyt ja suora": ["Kort och direkt", "Short and direct"],
  "Asiallinen ja ammattimainen": ["Saklig och professionell", "Professional and businesslike"],
  "Puhelinnumero": ["Telefonnummer", "Phone number"],
  "Verkkosivusi osoite": ["Din webbplatsadress", "Your website address"],
  "Botti toimii vain tällä verkkosivulla.": ["Botten fungerar endast på den här webbplatsen.", "The bot only works on this website."],
  "Hae tiedot sivultani": ["Hämta uppgifter från min webbplats", "Import details from my website"],
  "Respondo etsii sivultasi palvelut ja yhteystiedot valmiiksi. Sinä tarkistat ne ennen tallennusta.": ["Respondo letar fram tjänster och kontaktuppgifter från din webbplats. Du granskar dem innan de sparas.", "Respondo finds services and contact details on your website for you. You review them before saving."],
  "Linkki tarjouspyyntöön": ["Länk till offertförfrågan", "Quote request link"],
  "Respondo voi lähettää tämän linkin asiakkaalle, joka haluaa pyytää tarjouksen.": ["Respondo kan skicka den här länken till en kund som vill be om en offert.", "Respondo can send this link to a customer who wants to request a quote."],
  "Ajanvarauslinkki": ["Bokningslänk", "Booking link"],
  "Kun asiakas haluaa varata ajan, Respondo näyttää suoran Varaa aika -toiminnon.": ["När en kund vill boka en tid visar Respondo en direkt Boka tid-funktion.", "When a customer wants to book, Respondo shows a direct Book time action."],
  "Yhden liidin arvioitu arvo (€)": ["Uppskattat värde per lead (€)", "Estimated value per lead (€)"],
  "Hallintapaneeli arvioi yhteydenottojen arvon tämän perusteella.": ["Kontrollpanelen uppskattar värdet på kontaktförfrågningar utifrån detta.", "The dashboard estimates the value of contact requests based on this."],
  "Mitä palveluja tarjoatte?": ["Vilka tjänster erbjuder ni?", "What services do you offer?"],
  "Osoite": ["Adress", "Address"],
  "Muut tärkeät tiedot": ["Övrig viktig information", "Other important information"],
  "Respondo käyttää näitä tietoja asiakkaiden kysymyksiin vastaamiseen.": ["Respondo använder dessa uppgifter för att besvara kundernas frågor.", "Respondo uses this information to answer customer questions."],
  "Voit muuttaa niitä milloin tahansa.": ["Du kan ändra dem när som helst.", "You can change them at any time."],
  "Tallenna tiedot": ["Spara uppgifter", "Save details"],
  "KOKEILE TÄSSÄ": ["TESTA HÄR", "TEST HERE"],
  "Kysy kuten asiakkaasi kysyisi": ["Fråga som en kund skulle fråga", "Ask as your customer would"],
  "paikalla nyt": ["online nu", "online now"],
  "Tämä kokeilu käyttää yllä olevia tietoja ja jo tallentamiasi vastauksia.": ["Det här testet använder uppgifterna ovan och de svar du redan har sparat.", "This test uses the information above and the answers you have already saved."],
  "Vastaukset, joita botti saa käyttää": ["Svar som botten får använda", "Answers the bot may use"],
  "kohdetta": ["objekt", "items"],
  "Botin etusivun kysymykset": ["Frågor på bottens startsida", "Bot home-screen questions"],
  "Valitse enintään 3 omaa kysymys–vastausta. Ne näkyvät asiakkaalle heti chatin avatessa.": ["Välj högst 3 egna fråge–svar-par. De visas för kunden direkt när chatten öppnas.", "Choose up to 3 of your own question-and-answer pairs. They are shown to the customer as soon as the chat opens."],
  "/3 valittu": ["/3 valda", "/3 selected"],
  "Kysy esim. “Paljonko maksaa?”": ["Fråga t.ex. ”Vad kostar det?”", "Ask e.g. “How much does it cost?”"],
  "LISÄÄ VASTAUS": ["LÄGG TILL SVAR", "ADD ANSWER"],
  "Tallenna vastaus": ["Spara svar", "Save answer"],
  "Kategoria": ["Kategori", "Category"],
  "Otsikko": ["Rubrik", "Title"],
  "Hyväksytty vastaus": ["Godkänt svar", "Approved answer"],
  "Esimerkkisanat": ["Exempelord", "Example words"],
  "Esim. Hinnoittelu": ["T.ex. Prissättning", "E.g. Pricing"],
  "ASIAKASPALVELIJAN HALTUUNOTTO": ["KUNDTJÄNST TAR ÖVER", "HUMAN TAKEOVER"],
  "Hyppää mukaan asiakkaan keskusteluun": ["Gå in i kundens konversation", "Join the customer's conversation"],
  "Kun otat keskustelun haltuun, Respondo lopettaa vastaamisen siihen keskusteluun. Verkkosivuasiakas saa viestisi suoraan chattiin; WhatsApp- ja Instagram-vastaus lähetetään samaan kanavaan.": ["När du tar över konversationen slutar Respondo svara i den. Webbplatskunden får ditt meddelande direkt i chatten; svar via WhatsApp och Instagram skickas i samma kanal.", "When you take over the conversation, Respondo stops replying in that conversation. Website customers receive your message directly in the chat; WhatsApp and Instagram replies are sent through the same channel."],
  "aktiivista": ["aktiva", "active"],
  "VIIMEISIMMÄT KESKUSTELUT": ["SENASTE KONVERSATIONERNA", "LATEST CONVERSATIONS"],
  "Mitä asiakkaasi ovat kysyneet?": ["Vad har dina kunder frågat?", "What have your customers asked?"],
  "Näet kysymyksen, Respondon vastauksen ja sen, pitikö asiakas ohjata sinulle.": ["Du ser frågan, Respondos svar och om kunden behövde skickas vidare till dig.", "You can see the question, Respondo's answer, and whether the customer had to be routed to you."],
  "Sivulla:": ["På sidan:", "On page:"],
  "Keskusteluja ei ole vielä.": ["Det finns inga konversationer ännu.", "There are no conversations yet."],
  "Kun asiakkaat alkavat kysyä, keskustelut näkyvät tässä.": ["När kunder börjar ställa frågor visas konversationerna här.", "When customers start asking questions, the conversations will appear here."],
  "Asiakkaat, jotka haluavat yhteydenoton": ["Kunder som vill bli kontaktade", "Customers who want to be contacted"],
  "Jos vastaus puuttuu, asiakas voi jättää numeronsa tai sähköpostinsa, jotta voit ottaa yhteyttä.": ["Om ett svar saknas kan kunden lämna sitt telefonnummer eller sin e-postadress så att du kan ta kontakt.", "If an answer is missing, the customer can leave their phone number or email so you can contact them."],
  "Kukaan ei ole vielä jättänyt yhteystietoja.": ["Ingen har lämnat kontaktuppgifter ännu.", "No one has left contact details yet."],
  "Uudet yhteydenottopyynnöt näkyvät tässä.": ["Nya kontaktförfrågningar visas här.", "New contact requests will appear here."],
  "Kysymykset, joihin Respondolla ei vielä ollut vastausta": ["Frågor som Respondo ännu inte hade svar på", "Questions Respondo could not answer yet"],
  "Kirjoita vastaus tähän kerran. Sen jälkeen Respondo osaa vastata samaan asiaan myös seuraaville asiakkaille.": ["Skriv svaret här en gång. Därefter kan Respondo svara på samma sak även för kommande kunder.", "Write the answer here once. After that, Respondo can answer the same question for future customers too."],
  "ASIAKKAIDEN PYYNNÖT": ["KUNDFÖRFRÅGNINGAR", "CUSTOMER REQUESTS"],
  "Asiakkaiden pyynnöt": ["Kundförfrågningar", "Customer requests"],
  "Tarjouspyynnöt, ajanvaraukset, tilauskyselyt ja yhteydenotot näkyvät tässä.": ["Offertförfrågningar, bokningar, orderfrågor och kontaktförfrågningar visas här.", "Quote requests, bookings, order questions and contact requests appear here."],
  "avoinna": ["öppna", "open"],
  "RESPONDO-TARJOUS": ["RESPONDO-OFFERT", "RESPONDO QUOTE"],
  "VARATTU AIKA": ["BOKAD TID", "BOOKED TIME"],
  "Merkitse hoidetuksi": ["Markera som klar", "Mark as done"],
  "HINTALASKURI": ["PRISKALKYLATOR", "PRICE CALCULATOR"],
  "Anna Respondon laskea hinta": ["Låt Respondo räkna ut priset", "Let Respondo calculate the price"],
  "Määritä palvelun hinnat. Respondo laskee asiakkaalle hinnan antamiesi hintojen perusteella.": ["Ange priserna för tjänsten. Respondo räknar ut kundens pris utifrån de priser du har angett.", "Set the service prices. Respondo calculates the customer's price based on the prices you provide."],
  "Palvelun nimi": ["Tjänstens namn", "Service name"],
  "Perusmaksu €": ["Grundavgift €", "Base fee €"],
  "Hinta / yksikkö €": ["Pris / enhet €", "Price / unit €"],
  "Yksikön nimi": ["Enhetens namn", "Unit name"],
  "Minimihinta €": ["Minimipris €", "Minimum price €"],
  "ALV %": ["Moms %", "VAT %"],
  "Hinta = max(minimi, perusmaksu + määrä × yksikköhinta) + ALV": ["Pris = max(minimum, grundavgift + antal × enhetspris) + moms", "Price = max(minimum, base fee + quantity × unit price) + VAT"],
  "Tallenna hintalaskuri": ["Spara priskalkylator", "Save price calculator"],
  "AJANVARAUKSET": ["BOKNINGAR", "BOOKINGS"],
  "Luo oikeat vapaat ajat": ["Skapa verkliga lediga tider", "Create real available times"],
  "Asiakas näkee chatissa vain nämä ajat. Kun yksi varataan, se lukittuu heti pois muilta.": ["Kunden ser bara dessa tider i chatten. När en tid bokas låses den direkt för andra.", "The customer only sees these times in the chat. Once one is booked, it is immediately unavailable to others."],
  "vapaana": ["lediga", "available"],
  "Alkaen": ["Från", "From"],
  "Päättyen": ["Till", "Until"],
  "Päivä alkaa": ["Dagen börjar", "Day starts"],
  "Päivä päättyy": ["Dagen slutar", "Day ends"],
  "Ajan pituus": ["Tidslängd", "Duration"],
  "Luo vapaat ajat": ["Skapa lediga tider", "Create available times"],
  "Et ole vielä luonut vapaita aikoja.": ["Du har inte skapat några lediga tider ännu.", "You have not created any available times yet."],
  "MAKSUT": ["BETALNINGAR", "PAYMENTS"],
  "Ota maksu suoraan tarjouksesta": ["Ta betalt direkt från offerten", "Take payment directly from the quote"],
  "Yhdistä yrityksen oma Stripe. Tämän jälkeen chatissa laskettu tarjous voi avata maksun suoraan yrityksen Stripe-tilille.": ["Anslut företagets eget Stripe-konto. Därefter kan en offert som räknats ut i chatten öppna betalningen direkt till företagets Stripe-konto.", "Connect the company's own Stripe account. After that, a quote calculated in the chat can open payment directly to the company's Stripe account."],
  "ASENNUS": ["INSTALLATION", "INSTALLATION"],
  "1 sivusto": ["1 webbplats", "1 website"],
  "Kopioi tämä koodi sivustosi HTML:ään juuri ennen sulkevaa": ["Kopiera den här koden till webbplatsens HTML precis före den avslutande", "Copy this code into your website HTML just before the closing"],
  "-tagia.": ["-taggen.", " tag."],
  "🔒 SIDOTTU VERKKOSIVUUN": ["🔒 KOPPLAD TILL WEBBPLATSEN", "🔒 LINKED TO WEBSITE"],
  "Kopioi": ["Kopiera", "Copy"],
  "LASKUTUS": ["FAKTURERING", "BILLING"],
  "Hallitse tilaustasi": ["Hantera ditt abonnemang", "Manage your subscription"],
  "Voit vaihtaa maksutapaa, katsoa laskuja tai perua tilauksen Stripen asiakasportaalissa.": ["Du kan byta betalningsmetod, se fakturor eller säga upp abonnemanget i Stripes kundportal.", "You can change the payment method, view invoices or cancel the subscription in Stripe's customer portal."],
  "Avaa tilauksen hallinta": ["Öppna abonnemangshantering", "Open subscription management"],
  "MAKSU VAHVISTETTU": ["BETALNING BEKRÄFTAD", "PAYMENT CONFIRMED"],
  "Valmis.": ["Klart.", "Done."],
  "Maksu": ["Betalningen", "The payment"],
  "yritykselle": ["till företaget", "to the company"],
  "onnistui.": ["lyckades.", "was successful."],
  "Voit sulkea tämän sivun ja palata takaisin yrityksen verkkosivulle.": ["Du kan stänga den här sidan och återgå till företagets webbplats.", "You can close this page and return to the company's website."],
  "MAKSUN TARKISTUS": ["BETALNINGSKONTROLL", "PAYMENT CHECK"],
  "Maksua ei vahvistettu.": ["Betalningen kunde inte bekräftas.", "The payment was not confirmed."],
  "Tätä sivua ei löytynyt.": ["Sidan kunde inte hittas.", "This page could not be found."],
  "Palaa etusivulle": ["Tillbaka till startsidan", "Return to home page"],
  "Evästevalinnat": ["Cookieval", "Cookie choices"],
  "Yksityisyys": ["Integritet", "Privacy"],
  "Evästeet ja kävijätilastot": ["Cookies och besöksstatistik", "Cookies and visitor analytics"],
  "Käytämme välttämättömiä evästeitä palvelun toimintaan. Valinnaisella analytiikalla mittaamme sivuston käyttöä ja liikenteen lähteitä. Voit hyväksyä tai hylätä valinnaisen analytiikan.": ["Vi använder nödvändiga cookies för att tjänsten ska fungera. Med valfri analys mäter vi användningen av webbplatsen och trafikkällor. Du kan godkänna eller avvisa den valfria analysen.", "We use necessary cookies for the service to function. Optional analytics help us measure site usage and traffic sources. You can accept or reject optional analytics."],
  "Lisätiedot": ["Mer information", "More information"],
  "Hylkää": ["Avvisa", "Reject"],
  "Hyväksy kaikki": ["Godkänn alla", "Accept all"],
  "Evästeasetukset": ["Cookieinställningar", "Cookie settings"],
  "Valitse, mitä sallitaan": ["Välj vad du tillåter", "Choose what to allow"],
  "Välttämättömät evästeet tarvitaan esimerkiksi kirjautumiseen ja palvelun turvalliseen toimintaan. Valinnainen analytiikka käynnistyy vain, jos hyväksyt sen.": ["Nödvändiga cookies behövs bland annat för inloggning och säker drift av tjänsten. Valfri analys startar endast om du godkänner den.", "Necessary cookies are required for sign-in and secure operation of the service. Optional analytics only starts if you accept it."],
  "Välttämättömät": ["Nödvändiga", "Necessary"],
  "Istunto, kirjautuminen, tietoturva ja palvelun perustoiminnot.": ["Session, inloggning, säkerhet och tjänstens grundfunktioner.", "Session, sign-in, security and core service functions."],
  "Aina käytössä": ["Alltid aktiva", "Always active"],
  "Kävijätilastot": ["Besöksstatistik", "Visitor analytics"],
  "Pseudonyymi kävijätunniste, sivupolku, liikenteen lähde ja mahdolliset UTM-kampanjatiedot. Raakaa IP-osoitetta ei tallenneta tilastotauluun.": ["Pseudonym besökaridentifierare, sidväg, trafikkälla och eventuella UTM-kampanjuppgifter. Den råa IP-adressen sparas inte i statistiktabellen.", "Pseudonymous visitor identifier, page path, traffic source and any UTM campaign data. The raw IP address is not stored in the analytics table."],
  "Salli kävijätilastot": ["Tillåt besöksstatistik", "Allow visitor analytics"],
  "Lue lisää evästeistä ja tietojen käytöstä": ["Läs mer om cookies och hur data används", "Read more about cookies and data use"],
  "Hylkää valinnaiset": ["Avvisa valfria", "Reject optional"],
  "Tallenna valinta": ["Spara val", "Save choice"],
  "Ma–Pe 08:00–17:00": ["Mån–Fre 08:00–17:00", "Mon–Fri 08:00–17:00"],
  "Salesforce · customer research": ["Salesforce · kundundersökning", "Salesforce · customer research"],
  "€ / kk + alv": ["€ / mån + moms", "€ / month + VAT"],
  "/kk + alv": ["/mån + moms", "/month + VAT"],
  "RESPONDO keskusteluesimerkki": ["RESPONDO konversationsexempel", "RESPONDO conversation example"],
  "Ma–Pe 08–17": ["Mån–Fre 08–17", "Mon–Fri 08–17"],
  "Hinnasto": ["Prislista", "Price list"],
  "RESPONDO toimintaketju": ["RESPONDO arbetsflöde", "RESPONDO workflow"],
  "Täältä löydät yrityksesi tiedot, keskustelut, asennuksen ja tilauksen.": ["Här hittar du företagets uppgifter, konversationer, installation och abonnemang.", "Here you can find your company details, conversations, installation and subscription."],
  "Hei! Miten voin auttaa?": ["Hej! Hur kan jag hjälpa?", "Hi! How can I help?"],
  "Ma–Pe 8–17": ["Mån–Fre 8–17", "Mon–Fri 8–17"],
  "Esim. 250": ["T.ex. 250", "E.g. 250"],
  "Esim. Tampere + 50 km": ["T.ex. Tammerfors + 50 km", "E.g. Tampere + 50 km"],
  "Katuosoite, paikkakunta": ["Gatuadress, ort", "Street address, city"],
  "Esim. Muuttopalvelu": ["T.ex. Flyttjänst", "E.g. Moving service"],
}));
for (const [fi, pair] of EXTRA_UI_TEXT) {
  SV_TEXT.set(fi, pair[0]);
  EN_TEXT.set(fi, pair[1]);
}

const SV_PLACEHOLDERS = new Map(Object.entries({
  'Etunimi Sukunimi':'Förnamn Efternamn','sinä@yritys.fi':'du@foretag.fi','Yrityksen nimi':'Företagets namn','Vähintään 10 merkkiä':'Minst 10 tecken'
}));

const EN_PLACEHOLDERS = new Map(Object.entries({
  'Etunimi Sukunimi':'First name Last name',
  'sinä@yritys.fi':'you@company.com',
  'Yrityksen nimi':'Company name',
  'Vähintään 10 merkkiä':'At least 10 characters'
}));

function restorePersistentUiToFinnish() {
  const persistent = document.getElementById('rc-consent-layer');
  if (!persistent) return;
  const reverse = new Map();
  for (const [fi, value] of SV_TEXT) reverse.set(value, fi);
  for (const [fi, value] of EN_TEXT) reverse.set(value, fi);
  const walker = document.createTreeWalker(persistent, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const raw = node.nodeValue || '';
    const key = raw.trim();
    if (reverse.has(key)) node.nodeValue = raw.replace(key, reverse.get(key));
  }
  persistent.querySelectorAll('[title],[aria-label]').forEach((el) => {
    ['title','aria-label'].forEach((name) => {
      const value = el.getAttribute(name) || '';
      if (reverse.has(value)) el.setAttribute(name, reverse.get(value));
    });
  });
}

function updateDocumentLanguageMeta(lang) {
  const path = location.pathname;
  const pageTitle = path === '/app'
    ? appText('RESPONDO AI | Hallintapaneeli','RESPONDO AI | Kontrollpanel','RESPONDO AI | Dashboard')
    : path === '/kirjaudu'
      ? appText('RESPONDO AI | Kirjaudu','RESPONDO AI | Logga in','RESPONDO AI | Log in')
      : path === '/tilaus'
        ? appText('RESPONDO AI | Luo tili','RESPONDO AI | Skapa konto','RESPONDO AI | Create account')
        : path === '/assistant'
          ? appText('RESPONDO AI | Testaa bottia','RESPONDO AI | Testa botten','RESPONDO AI | Test the bot')
          : appText('RESPONDO AI | Asiakaspalvelubotti yrityksille 24/7','RESPONDO AI | Kundservicebot för företag 24/7','RESPONDO AI | Customer service bot for businesses 24/7');
  document.title = pageTitle;
  const metaDescription = lang === 'sv'
    ? 'RESPONDO AI är en kundservicebot för företag som svarar med företagets egna godkända uppgifter dygnet runt.'
    : lang === 'en'
      ? 'RESPONDO AI is a customer service bot for businesses that answers using the company’s own approved information around the clock.'
      : 'RESPONDO AI on yrityksen verkkosivulle asennettava asiakaspalvelubotti, joka vastaa yrityksen omilla hyväksytyillä tiedoilla ympäri vuorokauden.';
  const setMeta = (selector, value) => {
    const el = document.querySelector(selector);
    if (el && value) el.setAttribute('content', value);
  };
  setMeta('meta[name="description"]', metaDescription);
  setMeta('meta[property="og:title"]', pageTitle);
  setMeta('meta[property="og:description"]', metaDescription);
  setMeta('meta[name="twitter:title"]', pageTitle);
  setMeta('meta[name="twitter:description"]', metaDescription);
  setMeta('meta[property="og:locale"]', lang === 'sv' ? 'sv_SE' : lang === 'en' ? 'en_GB' : 'fi_FI');
}

function applyLanguage() {
  const lang = currentLang();
  document.documentElement.lang = lang;
  restorePersistentUiToFinnish();
  updateDocumentLanguageMeta(lang);
  if (lang === 'fi') {
    window.RespondoI18n?.apply(document);
    return;
  }
  const textMap = lang === 'sv' ? SV_TEXT : EN_TEXT;
  const placeholderMap = lang === 'sv' ? SV_PLACEHOLDERS : EN_PLACEHOLDERS;
  const root = document.body || document.getElementById('app');
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
    if (textMap.has(trimmed)) node.nodeValue = raw.replace(trimmed, textMap.get(trimmed));
  }
  root.querySelectorAll('input[placeholder], textarea[placeholder], [title], [aria-label]').forEach((el) => {
    ['placeholder','title','aria-label'].forEach((name) => {
      const value = el.getAttribute(name) || '';
      if (textMap.has(value)) el.setAttribute(name, textMap.get(value));
      else if (name === 'placeholder' && placeholderMap.has(value)) el.setAttribute(name, placeholderMap.get(value));
    });
  });
  window.RespondoI18n?.apply(root);
  // All application UI copy is translated from static dictionaries. User and customer content is never auto-translated.

}

window.addEventListener('respondo:languagechange', () => {
  if (typeof route === 'function') route();
  else applyLanguage();
});

function bindLanguageSwitch() {
  try { localStorage.removeItem('respondo-lang'); } catch {}
  document.querySelectorAll('[data-lang-select]').forEach((select) => {
    select.value = currentLang();
    if (select.dataset.bound === '1') return;
    select.dataset.bound = '1';
    select.addEventListener('change', () => {
      const lang = ['fi','sv','en'].includes(select.value) ? select.value : 'fi';
      localStorage.setItem('respondo_lang', lang);
      window.RespondoI18n?.setLanguage?.(lang);
      document.documentElement.lang = lang;
      api('/api/auth/language', { method:'POST', body:JSON.stringify({ language:lang }) }).catch(() => {});
      route();
    });
  });
}


function nav() {
  return `<header class="nav">
    <div class="container navin">
      ${logo()}
      <nav class="navlinks" aria-label="Päänavigaatio">
        <a href="/#how">Tuote</a>
        <a href="/#control">Tietopohja</a>
        <a href="/assistant?lang=${currentLang()}">Kokeile bottia</a>
        <a href="/#pricing">Hinta</a>
        <a href="/tietoturva">Tietoturva</a>
      </nav>
      <div class="navactions">
        ${languageSwitch()}
        <a class="btn ghost nav-login-btn" href="/kirjaudu"><span>Kirjaudu</span></a>
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
  const providerKey = String(p.get('provider') || 'google').toLowerCase();
  const provider = providerKey === 'apple' ? 'Apple' : 'Google';
  if (!code) return '';
  const messages = {
    not_configured: `${provider}-kirjautuminen ei ole vielä käytettävissä. Voit jatkaa sähköpostilla.`,
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

function uiText(fi, sv, en) {
  const lang = currentLang();
  return lang === 'sv' ? sv : lang === 'en' ? en : fi;
}

function contactSection() {
  return `<section class="section contact-section" id="contact">
    <div class="container">
      <div class="contact-shell">
        <div>
          <div class="section-kicker">${uiText('Ota yhteyttä','Kontakta oss','Contact')}</div>
          <h2>${uiText('Jäikö jotain mieleen?','Har du fortfarande en fråga?','Still have a question?')}<br><em>${uiText('Laita meille viestiä.','Skicka ett meddelande till oss.','Send us a message.')}</em></h2>
        </div>
        <div class="contact-actions">
          <a href="mailto:${esc(cfg.supportEmail)}" class="contact-mail">${esc(cfg.supportEmail)}</a>
          <p>RESPONDO AI · ${uiText('Suomi','Finland','Finland')}</p>
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
          <p>${uiText('Asiakaspalvelubotti, joka vastaa asiakkaillesi yrityksesi omilla tiedoilla.','Kundservicebot som svarar dina kunder med information från ditt företag.','Customer service bot that answers your customers using your company information.')}</p>
          <div class="seller-chip">RESPONDO AI</div>
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
          <button type="button" class="cookie-settings-link" onclick="window.openRespondoCookieSettings?.()">Evästeasetukset</button>
          <a href="/dpa">Tietojenkäsittely</a>
        </div>
      </div>
      <div class="legalbar">
        <span>© ${new Date().getFullYear()} RESPONDO AI</span>
        <span>${uiText('Y-tunnus','FO-nummer','Business ID')} ${esc(cfg.businessId || '3599437-5')} · ${uiText('B2B-ohjelmistopalvelu','B2B-programvarutjänst','B2B software service')}</span>
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
            <h3>Vastaukset perustuvat yrityksesi antamiin tietoihin.</h3>
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
            <div><b>Tähän ei löydy varmaa vastausta.</b><small>Kysymys ohjataan sinulle vastattavaksi.</small></div>
          </div>
        </div>
        <div class="console-stats">
          <div><b>24/7</b><span>verkossa</span></div>
          <div><b>1</b><span>hallintapaneeli</span></div>
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
        <div class="knowledge-row"><span class="k-index">01</span><div><b>Hinnoittelu</b><small>Peruspaketti alkaa 49,99 €/kk</small></div><i>✓</i></div>
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
      <div><span>ALKAEN</span><b>49,99 € / kk</b></div>
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
            <div><span>RESPONDO AI</span><b>${cfg.monthlyNet || 49.99} € / kk</b></div>
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
          <div class="pricevalue">49,99 €<small>/kk</small></div>
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
          <div class="price-top"><span>VUOSITILAUS</span><span class="save">säästä 60 €</span></div>
          <h3>Vuosi</h3>
          <div class="pricevalue">44,99 €<small>/kk</small></div><div class="annual-billing-note">Laskutetaan vuosittain 539,88 €</div>
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
            <div class="msg-core"><span>R</span><small>löytää vastauksen yrityksesi tiedoista</small></div>
          </div>
        </article>

        <article class="story-panel story-panel-three">
          <div class="story-panel-copy">
            <small>03 / RESPONDO HOITAA LOPUT</small>
            <h2>Vastaa heti.<br><em>Yrityksesi tiedoilla.</em></h2>
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

function motionDepthScene() {
  return `<section class="motion-depth" aria-label="RESPONDO toimintaketju">
    <div class="motion-depth-sticky">
      <div class="depth-aura depth-aura-a"></div>
      <div class="depth-aura depth-aura-b"></div>
      <div class="depth-grid" aria-hidden="true"></div>

      <div class="depth-copy">
        <small>RESPONDO / ASIAKASPALVELU</small>
        <h2>Kysymyksestä vastaukseen.<br><em>Yhdessä näkymässä.</em></h2>
        <p>Asiakas kysyy, Respondo vastaa yrityksesi tiedoilla ja tallentaa tarvittaessa yhteydenoton, tarjouspyynnön tai ajanvarauksen.</p>
      </div>

      <div class="depth-stage" aria-hidden="true">
        <article class="depth-card depth-card-1">
          <span>01</span>
          <small>KYSYMYS</small>
          <b>“Paljonko tämä maksaa?”</b>
          <i>asiakas</i>
        </article>
        <article class="depth-card depth-card-2">
          <span>02</span>
          <small>YRITYKSEN TIEDOT</small>
          <b>Hinnat · palvelut · aukioloajat</b>
          <i>Tietopohja</i>
        </article>
        <article class="depth-card depth-card-3">
          <span>03</span>
          <small>JATKOTOIMI</small>
          <b>Tarjouspyyntö · ajanvaraus · yhteydenotto</b>
          <i>Hallintapaneeli</i>
        </article>
        <div class="depth-core">
          <div class="depth-core-ring"></div>
          <div class="depth-core-mark">R</div>
          <small>RESPONDO</small>
        </div>
      </div>

      <div class="depth-progress"><i></i></div>
      <div class="depth-caption"><span>01</span><b>Kysymyksestä vastaukseen</b><em>03</em></div>
    </div>
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
      <h2>Jos tietoa ei löydy,<br><em>kysymys ohjataan sinulle.</em></h2>
      <p>Vastaukset perustuvat yrityksesi antamiin tietoihin. Jos tarvittava tieto puuttuu, kysymys siirtyy sinulle.</p>
      <a href="/assistant?lang=${currentLang()}" class="portal-button">Kokeile itse <span>→</span></a>
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
            <p class="lead">Kerro Respondolle yrityksesi tiedot kerran. Sen jälkeen se vastaa asiakkaillesi myös silloin, kun sinä et ehdi. Jos tarvittava tieto puuttuu, kysymys ohjataan sinulle.</p>
            <div class="hero-actions">
              <a class="btn hero-primary hero-bot-cta" href="/assistant?lang=${currentLang()}">Kokeile bottia</a>
            </div>
            <div class="hero-scroll-hint"><i></i><span>VIERITÄ ALAS JA KATSO, MITEN SE TOIMII</span></div>
          </div>
          ${heroVisual()}
        </div>
      </section>

      ${cinematicConversationScene()}
      ${horizontalProductStory()}
      ${productWorldScene()}
      ${motionDepthScene()}
      ${trustPortalScene()}
      ${dataImpactScene()}
      ${calculatorSection()}
      ${pricingSection()}

      <section class="section final-cta final-cta-immersive">
        <div class="container">
          <div class="cta-shell">
            <div>
              <div class="section-kicker light">${uiText('05 / KOKEILE KÄYTÄNNÖSSÄ','05 / PROVA SJÄLV','05 / TRY IT YOURSELF')}</div>
              <h2>${uiText('Asiakkaasi seuraava kysymys voi tulla vaikka tänä iltana.','Din kunds nästa fråga kan komma redan i kväll.',"Your customer's next question could arrive tonight.")}</h2>
              <p>${uiText('Anna Respondon hoitaa vastaus silloin, kun sinä et ehdi.','Låt Respondo sköta svaret när du själv inte hinner.',"Let Respondo handle the answer when you don't have time.")}</p>
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
  const params = new URLSearchParams(location.search);
  const ownerTestAccess = params.get('owner-test') === '1' && cfg.ownerTestEnabled === true;
  const requestedPlan = params.get('plan') || 'monthly';
  const plan = requestedPlan === 'owner_test' && !ownerTestAccess ? 'monthly' : requestedPlan;
  const referralCode = String(params.get('ref') || '').trim().toUpperCase();
  return `<div>
    ${nav()}
    <main class="formpage">
      <div class="container checkout-layout">
        <section class="checkout-copy">
          <div class="section-kicker">${plan === 'owner_test' ? 'OMISTAJAN TESTITILAUS' : 'ALOITA KOKEILU'}</div>
          <h1>${plan === 'owner_test' ? 'Testaa oikea maksu.' : 'Kokeile rauhassa.<br><em>Päätä vasta sen jälkeen.</em>'}</h1>
          <p>${plan === 'owner_test'
            ? 'Tämä kertakäyttöinen testitilaus veloittaa heti tasan 0,50 €. Se sulkeutuu onnistuneen maksun jälkeen eikä uusiudu seuraavassa kuussa.'
            : 'Luo tili ja lisää maksutapa Stripessä. Sinulta ei veloiteta mitään 3 päivän kokeilun aikana.'}</p>
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
          <div class="form-head"><span>LUO TILI</span><b>${plan === 'owner_test' ? '0,50 € · veloitus heti' : '3 päivää ilmaiseksi'}</b></div>
          ${socialAuthButtons('signup')}
          <div class="formgrid">
            <div class="field"><label>Nimi</label><input name="fullName" autocomplete="name" required placeholder="Etunimi Sukunimi"></div>
            <div class="field"><label>Sähköposti</label><input name="email" type="email" autocomplete="email" required placeholder="sinä@yritys.fi"></div>
            <div class="field"><label>Yritys</label><input name="companyName" required placeholder="Yrityksen nimi"></div>
            <div class="field"><label>Y-tunnus</label><input name="businessId" placeholder="1234567-8"></div>
            <div class="field full" id="signupPasswordField"><label>Salasana</label><input name="password" type="password" minlength="10" autocomplete="new-password" required placeholder="Vähintään 10 merkkiä"></div>
            <div class="field full"><label>Tilaus</label>
              <select name="plan">
                <option value="monthly" ${plan === 'monthly' ? 'selected' : ''}>49,99 €/kk · kuukausi</option>
                <option value="yearly" ${plan === 'yearly' ? 'selected' : ''}>44,99 €/kk · laskutetaan 539,88 €/vuosi</option>
                ${ownerTestAccess ? `<option value="owner_test" ${plan === 'owner_test' ? 'selected' : ''}>OMISTAJAN TESTI · 0,50 € sis. alv · veloitus heti</option>` : ''}
              </select>
            </div>
            <div class="field full referral-signup-field">
              <label>Suosittelukoodi <span>valinnainen</span></label>
              <input name="referralCode" maxlength="32" autocomplete="off" value="${esc(referralCode)}" placeholder="RESPONDO-XXXXXXXX">
              <small id="referralHint">Saat voimassa olevalla koodilla 20 % pois ensimmäisestä maksullisesta kuukaudesta. Vain kuukausitilaukseen.</small>
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
    intro: 'Näissä ehdoissa kerrotaan, millä ehdoilla yritysasiakkaat voivat käyttää Respondo AI -palvelua.',
    sections: [
      ['1. Palveluntarjoaja', `RESPONDO AI, Y-tunnus ${cfg.businessId || '3599437-5'}, Suomi. Yhteydenotot: ${cfg.supportEmail}.`],
      ['2. Palvelu', 'Respondo AI on yrityksille tarkoitettu asiakaspalvelu- ja ajanvarauspalvelu. Palveluun voi kuulua verkkosivubotti, yrityksen tietopohja, asiakasviestien käsittely, tarjous- ja yhteydenottopyynnöt, ajanvaraukset, SMS-toiminnot sekä asiakkaan erikseen yhdistämät ulkopuoliset palvelut, kuten Google Calendar. Käytettävissä olevat ominaisuudet voivat riippua asiakkaan asetuksista ja tilauksesta.'],
      ['3. Automaattiset vastaukset', 'Respondo AI tuottaa asiakasvastauksia yrityksen palveluun lisäämien tietojen ja käytössä olevien toimintojen perusteella. Automaattinen vastaus voi olla virheellinen tai puutteellinen, joten asiakasyritys vastaa omien tietojensa oikeellisuudesta ja siitä, missä tilanteissa automaattisia vastauksia käytetään. Palvelua ei tule käyttää lainvastaisiin tarkoituksiin tai sellaisiin korkean riskin päätöksiin, joissa automaattinen vastaus yksin voi aiheuttaa olennaista vahinkoa.'],
      ['4. Google Calendar ja muut integraatiot', 'Asiakas voi vapaaehtoisesti yhdistää Google Calendarin tai muun tuetun palvelun. Respondo käyttää asiakkaan myöntämiä oikeuksia vain kyseisen käyttäjälle näkyvän toiminnon toteuttamiseen, kuten varausten saatavuuden tarkistamiseen ja kalenteritapahtumien luomiseen. Asiakas voi poistaa integraation käytöstä palvelun asetuksista tai kyseisen ulkopuolisen palvelun tiliasetuksista.'],
      ['5. Kokeilu ja tilaus', `Palvelua voi kokeilla ${cfg.trialDays || 3} päivää ilmaiseksi. Maksutapa voidaan lisätä kokeilun alussa. Ellei tilausta peruta ennen kokeilun päättymistä, tilaus jatkuu valitun laskutusjakson mukaisena maksullisena tilauksena.`],
      ['6. Hinnat ja verot', `Kuukausitilaus maksaa ${cfg.monthlyNet || 49} €/kk + sovellettava arvonlisävero. Vuositilaus maksaa ${cfg.yearlyNet || 540} €/vuosi + sovellettava arvonlisävero. Ennen maksamista asiakkaalle näytetään sovellettava hinta ja laskutusjakso.`],
      ['7. Maksaminen ja uusiminen', 'Maksut käsitellään Stripen kautta. Jatkuva tilaus uusiutuu valitun laskutusjakson mukaisesti, kunnes se perutaan. Maksun epäonnistuminen voi johtaa palvelun rajoittamiseen tai keskeyttämiseen.'],
      ['8. Peruminen', 'Tilauksen voi perua milloin tahansa. Peruminen estää seuraavan laskutusjakson uusiutumisen. Jo maksettu laskutuskausi jatkuu normaalisti kauden loppuun, ellei pakottava lainsäädäntö tai erikseen sovittu ehto edellytä muuta.'],
      ['9. Asiakkaan vastuu', 'Asiakas vastaa käyttäjätilinsä suojaamisesta, palveluun lisäämiensä tietojen oikeellisuudesta, tarvittavista oikeuksista ja suostumuksista sekä siitä, että palvelun käyttö, asiakasviestintä ja henkilötietojen käsittely ovat sovellettavan lain mukaisia.'],
      ['10. Palvelun saatavuus ja muutokset', 'Palvelua kehitetään jatkuvasti. Huollot, tietoliikennehäiriöt tai ulkopuolisten palvelujen häiriöt voivat aiheuttaa käyttökatkoja. Ominaisuuksia voidaan muuttaa tietoturvan, lain, palveluntarjoajien vaatimusten tai palvelun kehittämisen vuoksi. Olennaisista asiakkaan oikeuksiin vaikuttavista muutoksista pyritään ilmoittamaan kohtuullisesti etukäteen.'],
      ['11. Immateriaalioikeudet', 'Respondo AI -palvelun ohjelmisto, ulkoasu ja palveluntarjoajan aineistot kuuluvat palveluntarjoajalle tai sen lisenssinantajille. Asiakas säilyttää oikeudet itse palveluun lisäämäänsä aineistoon ja antaa Respondolle vain palvelun toteuttamiseen tarvittavan käyttöoikeuden.'],
      ['12. Vastuun rajoitus', 'Pakottavan lain sallimissa rajoissa Respondo AI ei vastaa välillisistä vahingoista, menetetystä liikevaihdosta tai vahingoista, jotka johtuvat asiakkaan virheellisistä tiedoista, ulkopuolisen palvelun häiriöstä tai automaattisen vastauksen käyttämisestä ilman asianmukaista tarkistusta. Tämä kohta ei rajoita vastuuta siltä osin kuin vastuuta ei lain mukaan voida rajoittaa.'],
      ['13. Ehtojen soveltaminen', 'Näihin ehtoihin sovelletaan Suomen lakia. Mahdolliset erimielisyydet pyritään ensisijaisesti ratkaisemaan neuvottelemalla.'],
    ],
  },
  tietosuoja: {
    label: 'LAKIASIAT / 02',
    title: 'Tietosuojaseloste',
    intro: 'Tässä kerrotaan, mitä henkilötietoja Respondo AI käsittelee, miksi niitä käsitellään ja miten Google-käyttäjädataa käytetään.',
    sections: [
      ['1. Rekisterinpitäjä', `RESPONDO AI, Y-tunnus ${cfg.businessId || '3599437-5'}. Tietosuoja- ja muut yhteydenotot: ${cfg.supportEmail}.`],
      ['2. Käsiteltävät tiedot', 'Voimme käsitellä käyttäjän nimeä, sähköpostiosoitetta, kirjautumis- ja tilitietoja, yrityksen nimeä, yhteystietoja ja Y-tunnusta, tilaus- ja laskutustunnisteita, yrityksen tietopohjaan lisäämiä tietoja, palvelun asetuksia sekä asiakkaiden chat-, yhteydenotto-, tarjous-, SMS- ja ajanvaraustietoja siltä osin kuin yritys käyttää näitä toimintoja. Markkinointisivun kävijätilastointia varten käsitellään lisäksi vierailun ajankohtaa, avattua sivupolkua, viittaavaa verkkotunnusta, mahdollisia UTM-kampanjatietoja ja yksisuuntaisesti pseudonymisoitua kävijätunnistetta. Raakaa IP-osoitetta ei tallenneta kävijätilastotauluun.'],
      ['3. Käsittelyn tarkoitukset ja perusteet', 'Tietoja käsitellään palvelun toimittamiseen ja sopimuksen täyttämiseen, käyttäjän tunnistamiseen, asiakaspalveluun, tilausten ja maksujen hallintaan, ajanvarausten toteuttamiseen, palvelun turvallisuuden ylläpitämiseen, väärinkäytösten ehkäisyyn sekä lakisääteisten velvoitteiden hoitamiseen. Pseudonyymia, palvelinpuolista kävijätilastointia käytetään käyttäjän suostumuksella sivuston käytön, markkinointikanavien ja teknisen toimivuuden ymmärtämiseen. Ilman suostumusta valinnaista kävijätilastointia ei käynnistetä. Tarvittaessa muu käsittely voi perustua myös käyttäjän suostumukseen.'],
      ['4. Google-tili ja Google Calendar', 'Kun käyttäjä yhdistää Google Calendarin, Respondo pyytää Google OAuth -oikeuden calendar.events sekä kirjautumiseen tarvittavat openid-, email- ja profile-oikeudet. Calendar-oikeus mahdollistaa kalenteritapahtumien tarkastelun ja muokkaamisen. Respondo käyttää kalenteritietoja vain käyttäjälle näkyvien ajanvaraustoimintojen toteuttamiseen: olemassa olevia tapahtumia tarkastetaan päällekkäisten varausten estämiseksi ja hyväksytyistä varauksista voidaan luoda tapahtumia käyttäjän kalenteriin. Google Calendarin yhdistäminen on vapaaehtoista.'],
      ['5. Google API Services User Data Policy', 'Google Workspace -rajapinnoista saatavia tietoja käytetään Google API Services User Data Policyn ja sen Limited Use -vaatimusten mukaisesti. Google-käyttäjädataa ei myydä, käytetä mainonnan kohdentamiseen eikä käytetä yleisten tekoäly- tai koneoppimismallien kouluttamiseen. Tietoja käytetään vain käyttäjän pyytämien Respondo AI -toimintojen toteuttamiseen, tietoturvaan tai lain edellyttämissä tilanteissa.'],
      ['6. Google-tietojen jakaminen ja ihmisten pääsy', 'Google-käyttäjädataa ei luovuteta ulkopuolisille muuhun tarkoitukseen kuin palvelun välttämättömään tekniseen toteuttamiseen käyttäjän luvalla, tietoturvan varmistamiseen tai lain noudattamiseen. Henkilöstön pääsy käyttäjädataan rajataan tilanteisiin, joissa käyttäjä on antanut siihen nimenomaisen luvan, pääsy on tarpeen tietoturvan tai väärinkäytöksen selvittämiseksi tai laki sitä edellyttää.'],
      ['7. OAuth-tunnisteet ja turvallisuus', 'Google-yhteyden käyttöön tarvittavat OAuth-tunnisteet käsitellään palvelimella ja suojataan tallennettaessa. Palvelu käyttää HTTPS-yhteyksiä. Käyttöoikeuksia pyydetään vain palvelun nykyisten toimintojen toteuttamiseen tarvittavassa laajuudessa.'],
      ['8. Maksut', 'Korttitiedot käsittelee Stripe omien ehtojensa ja tietosuojakäytäntöjensä mukaisesti. Respondo ei tallenna varsinaista korttinumeroa omaan tietokantaansa. Respondo voi säilyttää maksuihin liittyviä asiakas-, tilaus-, lasku- ja tapahtumatunnisteita.'],
      ['9. Palveluntarjoajat ja alikäsittelijät', 'Palvelun toteuttamisessa voidaan käyttää infrastruktuuri-, tietokanta-, maksu-, viestintä- ja tekoälypalveluntarjoajia. Tietoja luovutetaan niille vain siinä laajuudessa kuin kyseisen toiminnon toteuttaminen edellyttää ja sovellettavien sopimusten sekä tietosuojavaatimusten mukaisesti.'],
      ['10. Kansainväliset siirrot', 'Osa palveluntarjoajista voi käsitellä tietoja Euroopan talousalueen ulkopuolella. Tällöin siirroissa käytetään sovellettavan tietosuojalainsäädännön edellyttämiä suojatoimia, kuten Euroopan komission hyväksymiä vakiosopimuslausekkeita, kun niitä tarvitaan.'],
      ['11. Säilytys', 'Tietoja säilytetään vain niin kauan kuin niitä tarvitaan palvelun toimittamiseen, sopimus- ja kirjanpitovelvoitteiden hoitamiseen, tietoturvaan tai lakisääteisiin velvoitteisiin. Tarpeettomat tiedot poistetaan tai anonymisoidaan kohtuullisessa ajassa. Google-käyttäjädatasta ei tehdä pysyvää kopiota muihin tarkoituksiin.'],
      ['12. Tietojen poistaminen ja Google-yhteyden peruuttaminen', 'Käyttäjä voi pyytää henkilötietojensa poistamista tai muuta tietosuojaoikeuksiensa toteuttamista ottamalla yhteyttä Respondoon. Google-yhteyden voi katkaista Respondon asetuksista tai Google-tilin kolmannen osapuolen yhteyksien asetuksista. Yhteyden katkaisemisen jälkeen uusia Google Calendar -tietoja ei haeta kyseisen yhteyden kautta. Lakisääteisesti säilytettävät tiedot voidaan säilyttää vaaditun ajan.'],
      ['13. Rekisteröidyn oikeudet', 'Sovellettavan lainsäädännön mukaisesti rekisteröidyllä voi olla oikeus saada pääsy tietoihinsa, oikaista tai poistaa tietoja, rajoittaa tai vastustaa käsittelyä, siirtää tietoja järjestelmästä toiseen sekä peruuttaa suostumus. Rekisteröidyllä on myös oikeus tehdä valitus toimivaltaiselle tietosuojaviranomaiselle.'],
      ['14. Yritysasiakkaiden loppuasiakkaiden tiedot', 'Kun yritysasiakas käyttää Respondoa omien asiakkaidensa viestien tai varausten käsittelyyn, yritysasiakas toimii lähtökohtaisesti kyseisten henkilötietojen rekisterinpitäjänä ja Respondo käsittelijänä yrityksen ohjeiden mukaisesti. Yritysasiakkaan tulee antaa omille asiakkailleen tarvittavat tietosuojatiedot.'],
      ['15. Muutokset', 'Tietosuojaselostetta päivitetään, kun palvelun ominaisuudet, tietojen käsittely tai sovellettavat vaatimukset muuttuvat. Ajantasainen versio julkaistaan tällä sivulla.'],
    ],
  },
};

LEGAL['evasteet'] = {
  label: 'LAKIASIAT / 03',
  title: 'Evästeet',
  intro: 'Respondo käyttää palvelun toiminnan kannalta tarpeellisia evästeitä ja vastaavia teknisiä tunnisteita.',
  sections: [
    ['Istuntoeväste', 'Kirjautumisen yhteydessä selaimeen tallennetaan suojattu istuntoeväste, jotta käyttäjä pysyy kirjautuneena hallintapaneeliin.'],
    ['Kirjautuminen ja integraatiot', 'Google-kirjautuminen ja muut ulkopuoliset palvelut voivat käyttää omia välttämättömiä evästeitään omien tietosuojakäytäntöjensä mukaisesti.'],
    ['Kävijätilastointi', 'Respondon markkinointisivun oma kävijätilastointi toteutetaan palvelinpuolella. Se käynnistyy vain käyttäjän hyväksynnän jälkeen. Tilastointiin tallennetaan pseudonyymi kävijätunniste, sivupolku, viittaava verkkotunnus ja mahdolliset UTM-kampanjatiedot. Raakaa IP-osoitetta ei tallenneta kävijätilastotauluun.'],
    ['Evästevalinnan muuttaminen', 'Käyttäjä voi hyväksyä tai hylätä valinnaisen analytiikan evästebannerissa ja muuttaa valintaansa myöhemmin sivuston alatunnisteen Evästeasetukset-linkistä. Valinta tallennetaan selaimeen, jotta samaa kysymystä ei tarvitse esittää jokaisella sivulatauksella.'],
    ['Maksaminen', 'Stripe voi käyttää omia evästeitään maksamisen, petosten torjunnan ja maksutoimintojen toteuttamiseen.'],
  ],
};

LEGAL.dpa = {
  label: 'LAKIASIAT / 04',
  title: 'Tietojenkäsittely',
  intro: 'Kun Respondo käsittelee henkilötietoja yritysasiakkaan puolesta, yritys toimii lähtökohtaisesti rekisterinpitäjänä ja Respondo henkilötietojen käsittelijänä.',
  sections: [
    ['Käsittelyn kohde ja kesto', 'Käsittely liittyy Respondo AI -palvelun tarjoamiseen sopimuksen voimassaolon ajan ja tarvittavan poistumisajan sen jälkeen. Käsittely voi koskea yrityksen palveluun lisäämiä tietoja sekä loppuasiakkaiden chat-, yhteydenotto-, SMS-, tarjous- ja ajanvaraustietoja.'],
    ['Käsittelyn tarkoitus', 'Tietoja käsitellään yritysasiakkaan puolesta asiakasviestien käsittelyyn, tietopohjaan perustuvien vastausten tuottamiseen, yhteydenottojen ja varausten välittämiseen sekä asiakkaan käyttöön ottamien integraatioiden toteuttamiseen.'],
    ['Ohjeet', 'Respondo käsittelee henkilötietoja vain asiakkaan dokumentoitujen ohjeiden ja palvelun käyttötarkoituksen mukaisesti, ellei sovellettava laki edellytä muuta.'],
    ['Luottamuksellisuus ja turvallisuus', 'Henkilötietoja käsitteleviä tahoja sitoo asianmukainen luottamuksellisuus. Pääsy tuotantoympäristöihin ja salaisiin tietoihin rajataan tarpeen mukaan. Salasanoja ei tallenneta selväkielisinä ja ulkoisten palvelujen tunnisteita suojataan teknisin keinoin.'],
    ['Alikäsittelijät', 'Palvelun taustalla voidaan käyttää infrastruktuuri-, tietokanta-, maksu-, viestintä-, Google Workspace- ja tekoälypalveluntarjoajia siltä osin kuin palvelun toteuttaminen niitä edellyttää.'],
    ['Avustaminen', 'Respondo avustaa kohtuullisessa määrin yritysasiakasta rekisteröityjen pyyntöjen, tietoturvaloukkausten ja sovellettavien tietosuojavelvoitteiden hoitamisessa siltä osin kuin asia koskee Respondon käsittelemiä tietoja.'],
    ['Poistaminen ja palauttaminen', 'Sopimuksen päättyessä henkilötiedot poistetaan tai palautetaan asiakkaan pyynnön ja sovellettavien säilytysvelvoitteiden mukaisesti, ellei laki edellytä tietojen säilyttämistä.'],
  ],
};

LEGAL.tietoturva = {
  label: 'TRUST / SECURITY',
  title: 'Tietoturva',
  intro: 'Respondossa pyritään käsittelemään vain tarpeellisia tietoja ja suojaamaan palvelun tunnisteet ja henkilötiedot asianmukaisin teknisin toimin.',
  sections: [
    ['HTTPS', 'Palvelu toimii salatun HTTPS-yhteyden kautta.'],
    ['Salasanat', 'Salasanat tallennetaan yksisuuntaisesti hajautettuina eikä selväkielisinä.'],
    ['Palvelutunnisteet', 'Maksu-, tietokanta-, Google OAuth- ja tekoälypalveluiden salaiset tunnisteet pidetään palvelinpuolella. Arkaluonteiset integraatiotunnisteet suojataan tallennettaessa.'],
    ['Käyttöoikeudet', 'Integraatioilta pyritään pyytämään vain niiden nykyisten toimintojen toteuttamiseen tarvittavat käyttöoikeudet. Google Calendar -yhteyttä käytetään ajanvarausten tarkistamiseen ja kalenteritapahtumien luomiseen.'],
    ['Tietopohjaperiaate', 'Asiakasvastaukset perustuvat yrityksen itse lisäämiin tietoihin. Jos varmaa vastausta ei löydy, palvelu voi ohjata asian yritykselle sen sijaan, että puuttuva yrityskohtainen tieto keksittäisiin.'],
    ['Yhteydenotot', `Tietoturvaan liittyvät ilmoitukset: ${cfg.supportEmail}.`],
  ],
};

function legal(type) {
  const basePage = LEGAL[type] || {
    label: 'RESPONDO AI',
    title: 'Sivua ei löytynyt',
    intro: 'Palaa etusivulle.',
    sections: [],
  };
  const legalHeadings = {
    en: {
      '1. Palveluntarjoaja':'1. Service provider','2. Palvelu':'2. Service','3. Automaattiset vastaukset':'3. Automated responses','4. Google Calendar ja muut integraatiot':'4. Google Calendar and other integrations','5. Kokeilu ja tilaus':'5. Trial and subscription','6. Hinnat ja verot':'6. Pricing and taxes','7. Maksaminen ja uusiminen':'7. Payments and renewals','8. Peruminen':'8. Cancellation','9. Asiakkaan vastuu':'9. Customer responsibilities','10. Palvelun saatavuus ja muutokset':'10. Service availability and changes','11. Immateriaalioikeudet':'11. Intellectual property rights','12. Vastuun rajoitus':'12. Limitation of liability','13. Ehtojen soveltaminen':'13. Application of terms',
      '1. Rekisterinpitäjä':'1. Data controller','2. Käsiteltävät tiedot':'2. Data processed','3. Käsittelyn tarkoitukset ja perusteet':'3. Purposes and legal bases for processing','4. Google-tili ja Google Calendar':'4. Google Account and Google Calendar','5. Google API Services User Data Policy':'5. Google API Services User Data Policy','6. Google-tietojen jakaminen ja ihmisten pääsy':'6. Sharing of Google data and human access','7. OAuth-tunnisteet ja turvallisuus':'7. OAuth credentials and security','8. Maksut':'8. Payments','9. Palveluntarjoajat ja alikäsittelijät':'9. Service providers and subprocessors','10. Kansainväliset siirrot':'10. International transfers','11. Säilytys':'11. Retention','12. Tietojen poistaminen ja Google-yhteyden peruuttaminen':'12. Data deletion and revoking Google access','13. Rekisteröidyn oikeudet':'13. Data subject rights','14. Yritysasiakkaiden loppuasiakkaiden tiedot':'14. Business customers’ end-customer data','15. Muutokset':'15. Changes',
      'Istuntoeväste':'Session cookie','Kirjautuminen ja integraatiot':'Login and integrations','Kävijätilastointi':'Visitor analytics','Evästevalinnan muuttaminen':'Changing cookie preferences','Maksaminen':'Payments','Käsittelyn kohde ja kesto':'Subject matter and duration of processing','Käsittelyn tarkoitus':'Purpose of processing','Ohjeet':'Instructions','Luottamuksellisuus ja turvallisuus':'Confidentiality and security','Alikäsittelijät':'Subprocessors','Avustaminen':'Assistance','Poistaminen ja palauttaminen':'Deletion and return','HTTPS':'HTTPS','Salasanat':'Passwords','Palvelutunnisteet':'Service credentials','Käyttöoikeudet':'Permissions','Tietopohjaperiaate':'Knowledge-base principle','Yhteydenotot':'Contact'
    },
    sv: {
      '1. Palveluntarjoaja':'1. Tjänsteleverantör','2. Palvelu':'2. Tjänsten','3. Automaattiset vastaukset':'3. Automatiska svar','4. Google Calendar ja muut integraatiot':'4. Google Kalender och andra integrationer','5. Kokeilu ja tilaus':'5. Provperiod och abonnemang','6. Hinnat ja verot':'6. Priser och skatter','7. Maksaminen ja uusiminen':'7. Betalning och förnyelse','8. Peruminen':'8. Uppsägning','9. Asiakkaan vastuu':'9. Kundens ansvar','10. Palvelun saatavuus ja muutokset':'10. Tjänstens tillgänglighet och ändringar','11. Immateriaalioikeudet':'11. Immateriella rättigheter','12. Vastuun rajoitus':'12. Ansvarsbegränsning','13. Ehtojen soveltaminen':'13. Tillämpning av villkoren',
      '1. Rekisterinpitäjä':'1. Personuppgiftsansvarig','2. Käsiteltävät tiedot':'2. Uppgifter som behandlas','3. Käsittelyn tarkoitukset ja perusteet':'3. Ändamål och rättsliga grunder för behandlingen','4. Google-tili ja Google Calendar':'4. Google-konto och Google Kalender','5. Google API Services User Data Policy':'5. Google API Services User Data Policy','6. Google-tietojen jakaminen ja ihmisten pääsy':'6. Delning av Google-data och mänsklig åtkomst','7. OAuth-tunnisteet ja turvallisuus':'7. OAuth-uppgifter och säkerhet','8. Maksut':'8. Betalningar','9. Palveluntarjoajat ja alikäsittelijät':'9. Tjänsteleverantörer och underbiträden','10. Kansainväliset siirrot':'10. Internationella överföringar','11. Säilytys':'11. Lagring','12. Tietojen poistaminen ja Google-yhteyden peruuttaminen':'12. Radering av data och återkallande av Google-åtkomst','13. Rekisteröidyn oikeudet':'13. Den registrerades rättigheter','14. Yritysasiakkaiden loppuasiakkaiden tiedot':'14. Företagskunders slutkundsdata','15. Muutokset':'15. Ändringar',
      'Istuntoeväste':'Sessionscookie','Kirjautuminen ja integraatiot':'Inloggning och integrationer','Kävijätilastointi':'Besöksstatistik','Evästevalinnan muuttaminen':'Ändra cookieval','Maksaminen':'Betalning','Käsittelyn kohde ja kesto':'Behandlingens föremål och varaktighet','Käsittelyn tarkoitus':'Behandlingens syfte','Ohjeet':'Instruktioner','Luottamuksellisuus ja turvallisuus':'Konfidentialitet och säkerhet','Alikäsittelijät':'Underbiträden','Avustaminen':'Assistans','Poistaminen ja palauttaminen':'Radering och återlämning','HTTPS':'HTTPS','Salasanat':'Lösenord','Palvelutunnisteet':'Tjänsteuppgifter','Käyttöoikeudet':'Behörigheter','Tietopohjaperiaate':'Kunskapsbasprincip','Yhteydenotot':'Kontakt'
    }
  };
  const legalBodyTranslations = {
    en: {
      'LAKIASIAT / 01':'LEGAL / 01','LAKIASIAT / 02':'LEGAL / 02','LAKIASIAT / 03':'LEGAL / 03','LAKIASIAT / 04':'LEGAL / 04',
      'Käyttöehdot':'Terms','Tietosuojaseloste':'Privacy Policy','Evästeet':'Cookies','Tietojenkäsittely':'Data Processing','Tietoturva':'Security',
      'Näissä ehdoissa kerrotaan, millä ehdoilla yritysasiakkaat voivat käyttää Respondo AI -palvelua.':'These terms describe the conditions under which business customers may use the Respondo AI service.',
      'Tässä kerrotaan, mitä henkilötietoja Respondo AI käsittelee, miksi niitä käsitellään ja miten Google-käyttäjädataa käytetään.':'This policy explains what personal data Respondo AI processes, why it is processed, and how Google user data is used.',
      'Respondo käyttää palvelun toiminnan kannalta tarpeellisia evästeitä ja vastaavia teknisiä tunnisteita.':'Respondo uses cookies and similar technical identifiers that are necessary for the service to function.',
      'Kun Respondo käsittelee henkilötietoja yritysasiakkaan puolesta, yritys toimii lähtökohtaisesti rekisterinpitäjänä ja Respondo henkilötietojen käsittelijänä.':'When Respondo processes personal data on behalf of a business customer, the business generally acts as the controller and Respondo as the processor.',
      'Respondossa pyritään käsittelemään vain tarpeellisia tietoja ja suojaamaan palvelun tunnisteet ja henkilötiedot asianmukaisin teknisin toimin.':'Respondo aims to process only necessary data and protect service credentials and personal data with appropriate technical measures.'
    },
    sv: {
      'LAKIASIAT / 01':'JURIDIK / 01','LAKIASIAT / 02':'JURIDIK / 02','LAKIASIAT / 03':'JURIDIK / 03','LAKIASIAT / 04':'JURIDIK / 04',
      'Käyttöehdot':'Användarvillkor','Tietosuojaseloste':'Integritetspolicy','Evästeet':'Cookies','Tietojenkäsittely':'Databehandling','Tietoturva':'Informationssäkerhet',
      'Näissä ehdoissa kerrotaan, millä ehdoilla yritysasiakkaat voivat käyttää Respondo AI -palvelua.':'Dessa villkor beskriver under vilka villkor företagskunder får använda Respondo AI-tjänsten.',
      'Tässä kerrotaan, mitä henkilötietoja Respondo AI käsittelee, miksi niitä käsitellään ja miten Google-käyttäjädataa käytetään.':'Denna policy beskriver vilka personuppgifter Respondo AI behandlar, varför de behandlas och hur Google-användardata används.',
      'Respondo käyttää palvelun toiminnan kannalta tarpeellisia evästeitä ja vastaavia teknisiä tunnisteita.':'Respondo använder cookies och motsvarande tekniska identifierare som är nödvändiga för tjänstens funktion.',
      'Kun Respondo käsittelee henkilötietoja yritysasiakkaan puolesta, yritys toimii lähtökohtaisesti rekisterinpitäjänä ja Respondo henkilötietojen käsittelijänä.':'När Respondo behandlar personuppgifter för en företagskund är företaget i regel personuppgiftsansvarig och Respondo personuppgiftsbiträde.',
      'Respondossa pyritään käsittelemään vain tarpeellisia tietoja ja suojaamaan palvelun tunnisteet ja henkilötiedot asianmukaisin teknisin toimin.':'Respondo strävar efter att endast behandla nödvändiga uppgifter och skydda tjänstens autentiseringsuppgifter och personuppgifter med lämpliga tekniska åtgärder.'
    }
  };
  const translateLegal = (value) => {
    if (currentLang() === 'fi') return value;
    const lang = currentLang();
    if (legalHeadings[lang]?.[value]) return legalHeadings[lang][value];
    if (legalBodyTranslations[lang]?.[value]) return legalBodyTranslations[lang][value];
    const map = lang === 'sv' ? SV_TEXT : EN_TEXT;
    return map.get(value) || value;
  };
  const translateLegalDynamic = (value) => {
    const translated = translateLegal(value);
    if (translated !== value || currentLang() === 'fi') return translated;
    const lang=currentLang(), bid=esc(cfg.businessId || '3599437-5'), mail=esc(cfg.supportEmail);
    if (/^RESPONDO AI, Y-tunnus .* Suomi\. Yhteydenotot:/.test(value)) return lang==='sv'?`RESPONDO AI, FO-nummer ${bid}, Finland. Kontakt: ${mail}.`:`RESPONDO AI, Business ID ${bid}, Finland. Contact: ${mail}.`;
    if (/^RESPONDO AI, Y-tunnus .* Tietosuoja-/.test(value)) return lang==='sv'?`RESPONDO AI, FO-nummer ${bid}. Integritets- och övriga kontakter: ${mail}.`:`RESPONDO AI, Business ID ${bid}. Privacy and other enquiries: ${mail}.`;
    if (/^Palvelua voi kokeilla /.test(value)) return lang==='sv'?`Tjänsten kan provas gratis i ${cfg.trialDays||3} dagar. En betalningsmetod kan läggas till i början av provperioden. Om abonnemanget inte sägs upp innan provperioden slutar fortsätter det som ett betalt abonnemang enligt vald faktureringsperiod.`:`The service can be tried free for ${cfg.trialDays||3} days. A payment method may be added at the start of the trial. Unless cancelled before the trial ends, the subscription continues as a paid subscription according to the selected billing period.`;
    if (/^Kuukausitilaus maksaa /.test(value)) return lang==='sv'?'Månadsabonnemanget kostar 49,99 €/månad. Årsabonnemanget motsvarar 44,99 €/månad och faktureras 539,88 € en gång per år. Pris och faktureringsperiod visas före betalning.':'The monthly plan costs €49.99/month. The annual plan is equivalent to €44.99/month and is billed at €539.88 once per year. The price and billing period are shown before payment.';
    if (/^Tietoturvaan liittyvät ilmoitukset:/.test(value)) return lang==='sv'?`Säkerhetsrelaterade meddelanden: ${mail}.`:`Security-related notices: ${mail}.`;
    return value;
  };
  const page = {
    ...basePage,
    label: translateLegalDynamic(basePage.label),
    title: translateLegalDynamic(basePage.title),
    intro: translateLegalDynamic(basePage.intro),
    sections: basePage.sections.map(([h,p]) => [translateLegalDynamic(h), translateLegalDynamic(p)])
  };
  return `<div>
    ${nav()}
    <main class="legalpage">
      <div class="container legal-layout">
        <aside class="legal-aside">
          <div class="section-kicker">${page.label}</div>
          <h1>${page.title}</h1>
          <p>${page.intro}</p>
          <div class="legal-seller"><span>${uiText('PALVELUNTARJOAJA','TJÄNSTELEVERANTÖR','SERVICE PROVIDER')}</span><b>RESPONDO AI</b><small>${uiText('Y-tunnus','FO-nummer','Business ID')} ${esc(cfg.businessId || '3599437-5')}</small></div>
        </aside>
        <article class="legalcopy">
          ${page.sections.map(([h, p]) => `<section><h2>${h}</h2><p>${p}</p></section>`).join('')}
          <section><h2>${uiText('Yhteydenotot','Kontakt','Contact')}</h2><p><a href="mailto:${esc(cfg.supportEmail)}">${esc(cfg.supportEmail)}</a></p></section>
          <div class="legal-note">${uiText('Päivitetty','Uppdaterad','Updated')} ${new Date().toLocaleDateString(currentLang()==='sv'?'sv-SE':currentLang()==='en'?'en-GB':'fi-FI')}. ${uiText('Teksti kuvaa Respondon nykyistä palvelua ja sitä voidaan päivittää palvelun kehittyessä.','Texten beskriver Respondos nuvarande tjänst och kan uppdateras när tjänsten utvecklas.','This text describes Respondos current service and may be updated as the service develops.')}</div>
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
    try {
      const stored = localStorage.getItem('respondo_lang');
      if (!stored && ['fi','sv','en'].includes(me?.preferred_language)) {
        localStorage.setItem('respondo_lang', me.preferred_language);
        window.RespondoI18n?.setLanguage?.(me.preferred_language);
      }
    } catch {}
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
  const referral = data.referral || null;
  const truth = data.truth || { score:0,total:0,approved:0,fresh:0 };
  const latestSelfTest = data.latestSelfTest || null;
  const actionStats = data.actionStats || [];
  const actionRequests = data.actionRequests || [];
  const liveThreads = data.liveThreads || [];
  const metaChannels = data.metaChannels || { graphVersion:'v24.0',verifyToken:'',webhookUrl:'',whatsappPhoneNumberId:'',whatsappConnected:false,instagramAccountId:'',instagramConnected:false,appSecretConfigured:false };
  const voice = data.voice || {
    accountSid:'',phoneNumber:'',handoffNumber:'',credentialsConfigured:false,enabled:false,
    webhookUrl:'',smsWebhookUrl:'',missedCallWebhookUrl:'',missedCallSmsEnabled:false,
    missedCallSmsMessage:'Hei! Emme juuri nyt pystyneet vastaamaan puheluusi. Voit vastata tähän viestiin, niin RESPONDO AI auttaa heti.',
    missedCallSmsMode:'immediate',missedCallAfterStart:'17:00',missedCallAfterEnd:'08:00',
    missedCallTimezone:'Europe/Helsinki'
  };
  const bookingSlots = data.bookingSlots || [];
  const stripeConnect = data.stripeConnect || { connected:false,chargesEnabled:false,detailsSubmitted:false,payoutsEnabled:false };
  const googleCalendar = data.googleCalendar || { connected:false,email:'',calendarId:'primary' };
  const quoteEngine = data.quoteEngine || { serviceName:'',basePrice:0,unitPrice:0,minPrice:0,vatPercent:0,unitLabel:'kpl' };
  const integrations = data.integrations || { webhookUrl:'', webhookSecret:'', channelsApiKey:'' };
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
  const formatMoney = (n) => new Intl.NumberFormat(appLocale(), { style:'currency', currency:'EUR', maximumFractionDigits:0 }).format(Number(n || 0));
  const actionTypeLabel = (type) => ({
    quote:appText('Tarjouspyyntö','Offertförfrågan','Quote request'),
    booking:appText('Ajanvaraus','Bokning','Booking'),
    order_status:appText('Tilauksen tila','Orderstatus','Order status'),
    callback:appText('Yhteydenotto','Kontakt','Callback'),
  })[type] || type || appText('Toiminto','Åtgärd','Action');
  const actionStatusLabel = (status) => ({
    new:appText('Uusi','Ny','New'),
    in_progress:appText('Käsittelyssä','Behandlas','In progress'),
    done:appText('Hoidettu','Klar','Done'),
  })[status] || status || appText('Uusi','Ny','New');
  const channelLabel = (channel) => ({
    website:appText('Verkkosivu','Webbplats','Website'),
    whatsapp:'WhatsApp',
    instagram:'Instagram',
    phone:appText('Puhelin','Telefon','Phone'),
    email:appText('Sähköposti','E-post','Email'),
    api:'API',
    messenger:'Messenger',
    sms:'SMS',
  })[channel] || channel || appText('Kanava','Kanal','Channel');
  const actionFieldEntries = (payload) => Object.entries(payload?.fields || {}).filter(([key,v]) => key !== 'slotId' && String(v || '').trim());
  const localDateInput = (date) => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0,10);
  };
  const tomorrowValue = localDateInput(new Date(Date.now() + 86400000));
  const weekValue = localDateInput(new Date(Date.now() + 8 * 86400000));
  const answersDone = nonProfileKnowledge.length > 0;
  const testedDone = s.conversations > 0;
  const onboarding = [
    { label: appText('Kerro yrityksesi perustiedot','Ange företagets grunduppgifter','Add your company details'), done: profileDone, target: 'business-profile' },
    { label: appText('Lisää ensimmäinen oma vastaus','Lägg till ditt första egna svar','Add your first custom answer'), done: answersDone, target: 'knowledge' },
    { label: appText('Lisää Respondo verkkosivullesi','Lägg till Respondo på din webbplats','Add Respondo to your website'), done: installedDone, target: 'install' },
    { label: appText('Kokeile bottia ensimmäisen kerran','Testa botten för första gången','Test the bot for the first time'), done: testedDone, target: 'live-preview' },
  ];
  const onboardingDone = onboarding.filter((x) => x.done).length;
  const onboardingPct = Math.round((onboardingDone / onboarding.length) * 100);
  const isWelcome = new URLSearchParams(location.search).get('welcome') === '1';

  return `<div class="appshell dashboard-simple-shell">
    <main class="appmain dashboard-simple-main">
      <header class="dashboard-topbar">
        <div class="dashboard-topbar-brand">
          ${logo()}
          <div class="dashboard-workspace">
            <small>TYÖTILA</small>
            <b>${esc(me.company_name || t.name)}</b>
          </div>
        </div>
        <div class="dashboard-section-picker">
          <label for="dashboardSectionSelect">Näytä osio</label>
          <div class="dashboard-select-wrap">
            <select id="dashboardSectionSelect" aria-label="Valitse hallintapaneelin osio">
              <option value="overview">Yleiskatsaus</option>
              <option value="setup">Yrityksen tiedot & botti</option>
              <option value="answers">Vastaukset</option>
              <option value="customers">Asiakkaat</option>
              <option value="automation">Toiminnot & integraatiot</option>
              <option value="account">Asennus & tili</option>
            </select>
            <span aria-hidden="true">⌄</span>
          </div>
        </div>
        <div class="dashboard-top-actions">
          <div class="live-chip"><span></span> Botti käytössä</div>
          <button class="dashboard-logout" id="logoutTop" type="button">Kirjaudu ulos</button>
        </div>
      </header>

      <section class="dashboard-head dashboard-view-section" data-dashboard-view="overview" id="overview">
        <div><div class="section-kicker">Hallintapaneeli</div><h1>${esc(t.name)}</h1><p>Valitse ylhäältä mitä haluat tehdä. Näytämme vain siihen liittyvät asiat.</p></div>
      </section>

      ${isWelcome ? `
      <section class="welcome-card dashboard-view-section" data-dashboard-view="overview" id="welcomeCard">
        <div class="welcome-mark">R</div>
        <div class="welcome-copy">
          <small>TILAUS AKTIIVINEN</small>
          <h2>Tervetuloa Respondoon.</h2>
          <p>Tilisi on valmis. Lisää ensin yrityksesi tiedot, kokeile bottia itse ja lisää se sitten verkkosivullesi.</p>
        </div>
        <button type="button" class="btn welcome-start" id="welcomeStart">Aloita tästä <span>→</span></button>
      </section>` : ''}

      <section class="onboarding-card dashboard-view-section" data-dashboard-view="overview" id="onboarding">
        <div class="onboarding-top">
          <div>
            <small>KÄYTTÖÖNOTTO</small>
            <h2>${onboardingDone === onboarding.length ? appText('Kaikki on valmista.','Allt är klart.','Everything is ready.') : appText('Laita loputkin kuntoon.','Gör klart resten.','Finish the remaining steps.')}</h2>
            <p>${onboardingDone}/${onboarding.length} ${appText('kohtaa valmiina','steg klara','steps complete')}</p>
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

      <section class="stats dashboard-view-section" data-dashboard-view="overview">
        <article class="stat"><small>KESKUSTELUT</small><b>${s.conversations}</b><span>${appText('yhteensä','totalt','total')}</span></article>
        <article class="stat"><small>VIIMEISET 7 PV</small><b>${s.last7 || 0}</b><span>${appText('keskustelua','konversationer','conversations')}</span></article>
        <article class="stat"><small>VASTATTU SUORAAN</small><b>${s.answeredRate}%</b><span>${appText('ilman että asiakas piti ohjata eteenpäin','utan att kunden behövde skickas vidare','without routing the customer onward')}</span></article>
        <article class="stat"><small>YHTEYDENOTOT</small><b>${s.leads || 0}</b><span>${s.estimatedLeadValue > 0 ? 'arvioitu arvo ' + formatMoney(s.estimatedLeadValue) : 'asiakasta jätti yhteystietonsa'}</span></article>
      </section>

      <section class="respondo-intelligence dashboard-view-section" data-dashboard-view="overview">
        <article class="panel truth-score-card">
          <div class="intelligence-icon">✓</div>
          <div>
            <small>VASTAUSTEN VARMENNUS</small>
            <h2>${truth.score}% ${appText('varmennettu','verifierat','verified')}</h2>
            <p>${truth.approved}/${truth.total} ${appText('tietoa hyväksytty','uppgifter godkända','items approved')} · ${truth.fresh} ${appText('tarkistettu viimeisen 90 päivän aikana.','kontrollerade under de senaste 90 dagarna.','checked within the last 90 days.')}</p>
          </div>
        </article>
        <article class="panel self-test-card">
          <div class="self-test-copy">
            <small>BOTIN ITSETESTI</small>
            <h2>${latestSelfTest ? latestSelfTest.score + '% ' + appText('kattavuus','täckning','coverage') : appText('Testaa ennen asiakkaita','Testa före kunderna','Test before customers')}</h2>
            <p>${latestSelfTest ? (latestSelfTest.answerable_questions + '/' + latestSelfTest.total_questions + ' ' + appText('testikysymykseen löytyi varma tieto.','testfrågor hade ett säkert svar.','test questions had a reliable answer.')) : appText('Respondo luo realistisia asiakaskysymyksiä ja etsii tietopohjan aukot ennen oikeita asiakkaita.','Respondo skapar realistiska kundfrågor och hittar luckor i kunskapsbasen före riktiga kunder.','Respondo creates realistic customer questions and finds gaps in the knowledge base before real customers.')}</p>
          </div>
          <div class="self-test-controls">
            <label>Testin laajuus
              <select id="selfTestDepth">
                <option value="500">500 kysymystä</option>
                <option value="1000">1 000 kysymystä</option>
              </select>
            </label>
            <button class="btn dashboard-action self-test-button" id="runSelfTest" type="button">${latestSelfTest ? appText('Testaa uudelleen','Testa igen','Test again') : appText('Aja itse­testi','Kör självtest','Run self-test')} <span>→</span></button>
          </div>
          <div id="selfTestResult"></div>
        </article>
        <article class="panel action-center-card">
          <div class="intelligence-icon">↗</div>
          <div>
            <small>TOIMINTOKESKUS · 30 PV</small>
            <h2>${s.actions30 || 0} ${appText('toimintoa','åtgärder','actions')}</h2>
            <p>${actionStats.length ? actionStats.map((x) => esc(x.action_type) + ' ' + Number(x.total || 0) + '×').join(' · ') : appText('Kun asiakkaat varaavat ajan, pyytävät tarjouksen, soittavat tai lähettävät sähköpostia, näet sen tässä.','När kunder bokar tid, begär offert, ringer eller skickar e-post ser du det här.','When customers book a time, request a quote, call or send email, you will see it here.')}</p>
          </div>
        </article>
      </section>

      <section class="dashboard-insights dashboard-view-section" data-dashboard-view="overview">
        <article class="panel trend-panel">
          <div class="panel-head">
            <div><small>14 PÄIVÄÄ</small><h2>Näin paljon asiakkaat ovat kysyneet</h2></div>
            <span>${s.last30 || 0} / 30 ${appText('pv','dagar','days')}</span>
          </div>
          <div class="mini-bars" aria-label="${esc(appText('Keskustelut viimeisen 14 päivän aikana','Konversationer under de senaste 14 dagarna','Conversations during the last 14 days'))}">
            ${daily.length ? daily.map((x) => `<div class="mini-bar" title="${esc(x.day)} · ${Number(x.total || 0)}"><i style="height:${Math.max(8, Math.round((Number(x.total || 0) / maxDaily) * 100))}%"></i><small>${new Date(x.day).toLocaleDateString(appLocale(),{day:'numeric',month:'numeric'})}</small></div>`).join('') : '<div class="empty-state compact"><p>' + appText('Kun keskusteluja kertyy, näet kehityksen tässä.','När fler konversationer samlas ser du utvecklingen här.','As conversations accumulate, you will see the trend here.') + '</p></div>'}
          </div>
        </article>
        <article class="panel gap-summary">
          <div class="panel-head"><div><small>TÄLLÄ VIIKOLLA</small><h2>Mihin kysymyksiin vastaus vielä puuttuu?</h2></div><span>${gaps.length}</span></div>
          <div class="gap-summary-list">
            ${gaps.length ? gaps.slice(0,5).map((x) => `<button type="button" class="gap-jump" data-gap-question="${esc(x.question)}"><span>${esc(x.question)}</span><b>${Number(x.asks || 0)}×</b></button>`).join('') : '<div class="empty-state compact"><b>' + appText('Kaikkiin tämän viikon kysymyksiin löytyi vastaus.','Alla frågor den här veckan fick ett svar.','All questions this week had an answer.') + '</b><p>' + appText('Hyvältä näyttää.','Det ser bra ut.','Looks good.') + '</p></div>'}
          </div>
        </article>
      </section>

      <section class="profile-live-grid dashboard-view-section dashboard-view-hidden" data-dashboard-view="setup" id="business-profile">
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
            <div class="bot-customizer profile-wide">
              <div class="bot-customizer-head">
                <div>
                  <small>BOTIN ULKOASU</small>
                  <h3>Nimeä botti ja valitse sille kuva</h3>
                  <p>Asiakas näkee nämä tiedot verkkosivusi chatissa. Voit käyttää omaa kuvaa tai valita yhden valmiista roboteista.</p>
                </div>
                <div class="bot-current-avatar" id="botAvatarCurrent">${botAvatarMarkup(t.bot_avatar || 'robot-1')}</div>
              </div>
              <div class="field bot-name-field">
                <label>Botin nimi</label>
                <input name="botName" maxlength="40" value="${esc(t.bot_name || 'RESPONDO AI')}" placeholder="Esim. Aino, Roope tai Yrityksen Apuri">
              </div>
              <input type="hidden" name="botAvatar" value="${esc(t.bot_avatar || 'robot-1')}">
              <div class="bot-avatar-presets" role="list" aria-label="Valmiit robottikuvat">
                ${BOT_AVATAR_PRESETS.map((avatar) => `<button type="button" class="bot-avatar-option ${(t.bot_avatar || 'robot-1') === avatar.id ? 'selected' : ''}" data-avatar="${avatar.id}" title="${esc(avatar.label)}"><span>${botAvatarMarkup(avatar.id)}</span><small>${esc(avatar.label)}</small></button>`).join('')}
              </div>
              <div class="bot-avatar-upload-row">
                <label class="bot-avatar-upload" for="botAvatarUpload">
                  <span>＋</span>
                  <div><b>Lataa oma kuva</b><small>PNG, JPG tai WebP · kuva rajataan automaattisesti neliöksi</small></div>
                </label>
                <input id="botAvatarUpload" type="file" accept="image/png,image/jpeg,image/webp" hidden>
                <div id="botAvatarMsg"></div>
              </div>
            </div>
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
            <div class="field">
              <label>Ajanvarauslinkki</label>
              <input name="bookingUrl" value="${profileValue('Ajanvarauslinkki')}" placeholder="https://yritys.fi/ajanvaraus">
              <small class="field-hint">Kun asiakas haluaa varata ajan, Respondo näyttää suoran Varaa aika -toiminnon.</small>
            </div>
            <div class="field">
              <label>Yhden liidin arvioitu arvo (€)</label>
              <input name="averageLeadValue" inputmode="decimal" value="${esc(t.average_lead_value || '')}" placeholder="Esim. 250">
              <small class="field-hint">Hallintapaneeli arvioi yhteydenottojen arvon tämän perusteella.</small>
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
              <span class="preview-avatar" id="previewAvatarVisual">${botAvatarMarkup(t.bot_avatar || 'robot-1')}</span>
              <div><b id="previewBotName">${esc(t.bot_name || 'RESPONDO AI')}</b><small>paikalla nyt</small></div>
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

      <section class="dashboard-grid dashboard-view-section dashboard-view-hidden" data-dashboard-view="answers" id="knowledge">
        <div class="panel knowledge-panel">
          <div class="panel-head"><div><small>TIETOPOHJA</small><h2>Vastaukset, joita botti saa käyttää</h2></div><span>${knowledge.length} ${appText('kohdetta','poster','items')}</span></div>
          <div class="knowledge-feature-summary">
            <div>
              <b>Botin etusivun kysymykset</b>
              <small>Valitse enintään 3 omaa kysymys–vastausta. Ne näkyvät asiakkaalle heti chatin avatessa.</small>
            </div>
            <span id="knowledgeQuickCount">${knowledge.filter((x) => x.source_type !== 'profile' && x.quick_reply_order).length}/3 valittu</span>
          </div>
          <div id="knowledgeFeatureMsg"></div>
          <div id="knowledgeList" class="knowledge-list">
            ${knowledge.length ? knowledge.map((x, i) => `
              <div class="knowledge-item ${x.quick_reply_order ? 'featured' : ''}" data-knowledge-id="${esc(x.id)}">
                <span class="knum">${String(i + 1).padStart(2, '0')}</span>
                <div>
                  <div class="knowledge-item-top">
                    <b>${esc(x.title)}</b>
                    ${x.source_type !== 'profile' ? `<button type="button" class="knowledge-feature-btn ${x.quick_reply_order ? 'active' : ''}" data-featured="${x.quick_reply_order ? 'true' : 'false'}">${x.quick_reply_order ? '✓ Etusivulla ' + x.quick_reply_order : '+ Lisää etusivulle'}</button>` : ''}
                  </div>
                  <small>${esc(x.category || appText('Yleinen','Allmänt','General'))} · ${x.source_type === 'profile' ? appText('Yrityksen tiedot','Företagsuppgifter','Company details') : x.source_type === 'owner_answer' ? appText('Omistajan hyväksymä','Godkänd av ägaren','Owner approved') : appText('Manuaalinen','Manuell','Manual')} · ${appText('tarkistettu','kontrollerad','verified')} ${x.verified_at ? new Date(x.verified_at).toLocaleDateString(appLocale()) : '—'}</small>
                  <p>${esc(x.answer)}</p>
                </div>
                <span class="approved" title="Hyväksytty Truth Engineen">✓</span>
              </div>`).join('') : `<div class="empty-state"><b>Et ole lisännyt vielä omia vastauksia.</b><p>Lisää ensimmäinen vastaus tästä.</p></div>`}
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

      <section class="panel live-inbox-panel dashboard-view-section dashboard-view-hidden" data-dashboard-view="customers" id="live-inbox">
        <div class="panel-head">
          <div>
            <small>ASIAKASPALVELIJAN HALTUUNOTTO</small>
            <h2>Hyppää mukaan asiakkaan keskusteluun</h2>
            <p>Kun otat keskustelun haltuun, Respondo lopettaa vastaamisen siihen keskusteluun. Verkkosivuasiakas saa viestisi suoraan chattiin; WhatsApp- ja Instagram-vastaus lähetetään samaan kanavaan.</p>
          </div>
          <span>${liveThreads.filter((x) => x.status === 'open').length} ${appText('aktiivista','aktiva','active')}</span>
        </div>
        <div class="live-thread-list">
          ${liveThreads.length ? liveThreads.map((thread) => `
            <article class="live-thread ${thread.mode === 'human' ? 'human-mode' : ''}" data-thread-id="${esc(thread.id)}">
              <div class="live-thread-head">
                <div>
                  <span class="live-channel">${esc(channelLabel(thread.source_channel))}</span>
                  <b>${esc(thread.external_contact_id || thread.visitor_ref || 'Asiakas')}</b>
                  <small>${new Date(thread.last_activity_at || thread.created_at).toLocaleString(appLocale(),{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</small>
                </div>
                <span class="live-mode">${thread.mode === 'human' ? '● Ihminen vastaa' : '● AI vastaa'}</span>
              </div>
              <div class="live-messages">
                ${(Array.isArray(thread.messages) ? thread.messages : []).map((m) => `
                  <div class="live-message ${esc(m.role || 'user')}">
                    <small>${m.role === 'user' ? 'Asiakas' : m.role === 'human' ? 'Sinä' : 'RESPONDO'}</small>
                    <p>${esc(m.message || '')}</p>
                  </div>
                `).join('')}
              </div>
              <div class="live-thread-actions">
                <button type="button" class="btn live-mode-toggle" data-mode="${thread.mode === 'human' ? 'ai' : 'human'}">
                  ${thread.mode === 'human' ? 'Palauta AI:lle' : 'Ota haltuun'}
                </button>
                <form class="live-reply-form">
                  <input name="message" placeholder="Kirjoita vastaus asiakkaalle…" autocomplete="off" ${thread.mode === 'human' ? '' : 'disabled'}>
                  <button type="submit" ${thread.mode === 'human' ? '' : 'disabled'}>Lähetä →</button>
                </form>
              </div>
              <div class="live-msg"></div>
            </article>
          `).join('') : `
            <div class="empty-state">
              <b>Ei vielä aktiivisia keskusteluja.</b>
              <p>Kun verkkosivulla, WhatsAppissa, Instagramissa tai puhelimessa alkaa keskustelu, se ilmestyy tähän.</p>
            </div>
          `}
        </div>
      </section>

      <section class="panel conversation-panel dashboard-view-section dashboard-view-hidden" data-dashboard-view="customers" id="conversations">
        <div class="panel-head">
          <div><small>VIIMEISIMMÄT KESKUSTELUT</small><h2>Mitä asiakkaasi ovat kysyneet?</h2><p>Näet kysymyksen, Respondon vastauksen ja sen, pitikö asiakas ohjata sinulle.</p></div>
          <span>${recentConversations.length}</span>
        </div>
        <div class="conversation-log">
          ${recentConversations.length ? recentConversations.map((x) => `
            <article class="conversation-log-item ${x.handoff ? 'needs-human' : ''}">
              <div class="conversation-log-meta"><span>${x.handoff ? 'Vastaus puuttui' : 'Vastattu'}</span><small>${new Date(x.created_at).toLocaleString(appLocale(),{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</small></div>
              ${x.page_title ? `<div class="conversation-page">Sivulla: ${esc(x.page_title)}</div>` : ''}
              <h3>${esc(x.question)}</h3>
              <p>${esc(x.answer)}</p>
            </article>`).join('') : '<div class="empty-state"><b>Keskusteluja ei ole vielä.</b><p>Kun asiakkaat alkavat kysyä, keskustelut näkyvät tässä.</p></div>'}
        </div>
      </section>

      <section class="panel leads-panel dashboard-view-section dashboard-view-hidden" data-dashboard-view="customers" id="leads">
        <div class="panel-head">
          <div><small>YHTEYDENOTOT</small><h2>Asiakkaat, jotka haluavat yhteydenoton</h2><p>Jos vastaus puuttuu, asiakas voi jättää numeronsa tai sähköpostinsa, jotta voit ottaa yhteyttä.</p></div>
          <span>${leads.length}</span>
        </div>
        <div class="lead-list">
          ${leads.length ? leads.map((x) => `
            <article class="lead-item">
              <div class="lead-main">
                <div><small>${new Date(x.created_at).toLocaleString(appLocale(),{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</small><h3>${esc(x.name || 'Asiakas')}</h3></div>
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

      <section class="panel unanswered-panel dashboard-view-section dashboard-view-hidden" data-dashboard-view="answers" id="unanswered">
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
                <small>${new Date(x.created_at).toLocaleString(appLocale(), {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</small>
              </div>
              <h3>${esc(x.question)}</h3>
              <textarea class="unanswered-answer" placeholder="Kirjoita tähän oikea vastaus…"></textarea>
              <div class="unanswered-actions">
                <span>Kirjoita vastaus itse tai pyydä Respondoa etsimään se yrityksesi verkkosivulta.</span>
                <div class="gap-action-buttons">
                  <button type="button" class="btn suggest-unanswered-answer">Etsi vastaus sivultani</button>
                  <button type="button" class="btn dashboard-action add-unanswered-answer">Hyväksy ja tallenna <span>→</span></button>
                </div>
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

      <section class="actions2-layout dashboard-view-section dashboard-view-hidden" data-dashboard-view="automation" id="actions2">
        <article class="panel action-inbox-panel">
          <div class="panel-head">
            <div>
              <small>ASIAKKAIDEN PYYNNÖT</small>
              <h2>Asiakkaiden pyynnöt</h2>
              <p>Tarjouspyynnöt, ajanvaraukset, tilauskyselyt ja yhteydenotot näkyvät tässä.</p>
            </div>
            <span>${actionRequests.filter((x) => x.status !== 'done').length} avoinna</span>
          </div>

          <div class="action-request-list">
            ${actionRequests.length ? actionRequests.map((x) => `
              <article class="action-request-item ${x.status === 'done' ? 'done' : ''}" data-action-id="${esc(x.id)}">
                <div class="action-request-top">
                  <div>
                    <span class="action-kind">${esc(actionTypeLabel(x.request_type))}</span>
                    <small>${new Date(x.created_at).toLocaleString(appLocale(),{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})} · ${esc(x.source_channel || 'website')}</small>
                  </div>
                  <span class="action-state">${esc(actionStatusLabel(x.status))}</span>
                </div>
                <div class="action-request-fields">
                  ${actionFieldEntries(x.payload).map(([key,value]) => `<div><small>${esc(key)}</small><b>${esc(value)}</b></div>`).join('')}
                </div>
                ${x.payload?.question ? `<p class="action-origin">“${esc(x.payload.question)}”</p>` : ''}
                ${x.result?.quote ? `
                  <div class="action-quote-summary">
                    <span>RESPONDO-TARJOUS</span>
                    <b>${formatMoney(x.result.quote.total || 0)}</b>
                    <small>${x.result?.paid ? 'Maksettu ✓' : 'Odottaa hyväksyntää / maksua'}</small>
                  </div>
                ` : ''}
                ${x.payload?.booking?.startsAt ? `
                  <div class="action-booking-summary">
                    <span>VARATTU AIKA</span>
                    <b>${new Date(x.payload.booking.startsAt).toLocaleString(appLocale(),{weekday:'short',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</b>
                    <small>${x.result?.calendarSync?.status === 'synced' ? 'Google Calendar ✓' : x.result?.calendarSync?.status === 'failed' ? 'Google-sync epäonnistui' : 'RESPONDO Calendar'}</small>
                  </div>
                ` : ''}
                <div class="action-request-bottom">
                  <small>Integraatio: ${esc(x.delivery_status === 'delivered' ? 'lähetetty ✓' : x.delivery_status === 'failed' ? 'lähetys epäonnistui' : 'vain RESPONDOssa')}</small>
                  ${x.status !== 'done' ? `<button type="button" class="mark-action-done">Merkitse hoidetuksi</button>` : '<span class="action-done-label">✓ Hoidettu</span>'}
                </div>
              </article>
            `).join('') : `
              <div class="empty-state">
                <b>Ei uusia pyyntöjä.</b>
                <p>Kun asiakas pyytää tarjouksen, ajan, tilauksen tarkistuksen tai yhteydenoton, se ilmestyy tähän.</p>
              </div>
            `}
          </div>
        </article>

        <article class="panel quote-engine-panel" id="quote-engine">
          <div class="panel-head">
            <div>
              <small>HINTALASKURI</small>
              <h2>Anna Respondon laskea hinta</h2>
              <p>Määritä palvelun hinnat. Respondo laskee asiakkaalle hinnan antamiesi hintojen perusteella.</p>
            </div>
            <span class="install-badge">${quoteEngine.basePrice || quoteEngine.unitPrice || quoteEngine.minPrice ? 'Käytössä' : 'Ei asetettu'}</span>
          </div>
          <form id="quoteEngineForm" class="quote-engine-form">
            <div class="field"><label>Palvelun nimi</label><input name="serviceName" value="${esc(quoteEngine.serviceName)}" placeholder="Esim. Muuttopalvelu"></div>
            <div class="quote-engine-grid">
              <div class="field"><label>Perusmaksu €</label><input name="basePrice" type="number" min="0" step="0.01" value="${esc(quoteEngine.basePrice)}"></div>
              <div class="field"><label>Hinta / yksikkö €</label><input name="unitPrice" type="number" min="0" step="0.01" value="${esc(quoteEngine.unitPrice)}"></div>
              <div class="field"><label>Yksikön nimi</label><input name="unitLabel" value="${esc(quoteEngine.unitLabel || 'kpl')}" placeholder="h, km, m², kpl"></div>
              <div class="field"><label>Minimihinta €</label><input name="minPrice" type="number" min="0" step="0.01" value="${esc(quoteEngine.minPrice)}"></div>
              <div class="field"><label>ALV %</label><input name="vatPercent" type="number" min="0" max="30" step="0.1" value="${esc(quoteEngine.vatPercent)}"></div>
            </div>
            <div class="quote-form-bottom">
              <div class="quote-formula-preview">Hinta = max(minimi, perusmaksu + määrä × yksikköhinta) + ALV</div>
              <button class="btn dashboard-action" type="submit">Tallenna hintalaskuri <span>→</span></button>
            </div>
            <div id="quoteEngineMsg"></div>
          </form>
        </article>

        <article class="panel booking-calendar-panel" id="booking-calendar">
          <div class="panel-head">
            <div>
              <small>AJANVARAUKSET</small>
              <h2>Luo oikeat vapaat ajat</h2>
              <p>Asiakas näkee chatissa vain nämä ajat. Kun yksi varataan, se lukittuu heti pois muilta.</p>
            </div>
            <span class="install-badge">${bookingSlots.filter((x) => x.status === 'open').length} vapaana</span>
          </div>

          <div class="calendar-sync-card ${googleCalendar.connected ? 'connected' : ''}">
            <div>
              <small>GOOGLE CALENDAR</small>
              <b>${googleCalendar.connected ? 'Yhdistetty ✓' : 'Ei yhdistetty'}</b>
              <p>${googleCalendar.connected ? ('Varaukset synkronoidaan kalenteriin ' + esc(googleCalendar.email || '')) : 'Yhdistä Google Calendar, niin Respondo tarkistaa myös siellä olevat varaukset ja luo uudet varaukset automaattisesti.'}</p>
            </div>
            <div class="calendar-sync-actions">
              ${googleCalendar.connected
                ? '<button type="button" class="btn integration-test-btn" id="disconnectGoogleCalendar">Katkaise yhteys</button>'
                : '<a class="btn dashboard-action" id="connectGoogleCalendar" href="/api/app/google-calendar/start">Yhdistä Google Calendar <span>↗</span></a>'}
            </div>
          </div>
          <div id="calendarConnectMsg"></div>

          <form id="bookingSlotsForm" class="booking-slots-form">
            <div class="booking-generator-grid">
              <div class="field"><label>Alkaen</label><input name="startDate" type="date" value="${tomorrowValue}" required></div>
              <div class="field"><label>Päättyen</label><input name="endDate" type="date" value="${weekValue}" required></div>
              <div class="field"><label>Päivä alkaa</label><input name="startTime" type="time" value="09:00" required></div>
              <div class="field"><label>Päivä päättyy</label><input name="endTime" type="time" value="16:00" required></div>
              <div class="field"><label>Ajan pituus</label><select name="duration"><option value="30">30 min</option><option value="45">45 min</option><option value="60" selected>60 min</option><option value="90">90 min</option><option value="120">120 min</option></select></div>
            </div>
            <div class="weekday-picker">
              ${[['1',appText('Ma','Mån','Mon')],['2',appText('Ti','Tis','Tue')],['3',appText('Ke','Ons','Wed')],['4',appText('To','Tor','Thu')],['5',appText('Pe','Fre','Fri')],['6',appText('La','Lör','Sat')],['0',appText('Su','Sön','Sun')]].map(([v,l]) => `<label><input type="checkbox" name="weekday" value="${v}" ${['1','2','3','4','5'].includes(v) ? 'checked' : ''}><span>${l}</span></label>`).join('')}
            </div>
            <button class="btn dashboard-action" type="submit">Luo vapaat ajat <span>→</span></button>
            <div id="bookingSlotsMsg"></div>
          </form>

          <div class="booking-slot-list">
            ${bookingSlots.length ? bookingSlots.slice(0,18).map((slot) => `
              <div class="booking-slot-item ${slot.status}">
                <div><b>${new Date(slot.starts_at).toLocaleString(appLocale(),{weekday:'short',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</b><small>${slot.status === 'booked' ? 'Varattu' : 'Vapaa'}</small></div>
                ${slot.status === 'open' ? `<button type="button" class="delete-booking-slot" data-id="${esc(slot.id)}">Poista</button>` : '<span>✓</span>'}
              </div>
            `).join('') : '<div class="empty-state compact"><p>Et ole vielä luonut vapaita aikoja.</p></div>'}
          </div>
        </article>

        <article class="panel stripe-connect-panel" id="stripe-connect">
          <div class="panel-head">
            <div>
              <small>MAKSUT</small>
              <h2>Ota maksu suoraan tarjouksesta</h2>
              <p>Yhdistä yrityksen oma Stripe. Tämän jälkeen chatissa laskettu tarjous voi avata maksun suoraan yrityksen Stripe-tilille.</p>
            </div>
            <span class="stripe-connect-status ${stripeConnect.chargesEnabled ? 'ready' : ''}">${stripeConnect.chargesEnabled ? '● Maksut käytössä' : stripeConnect.connected ? '○ Viimeistele Stripe' : '○ Ei yhdistetty'}</span>
          </div>
          <div class="stripe-connect-body">
            ${stripeConnect.chargesEnabled ? `
              <div class="stripe-connected-ok"><b>Stripe on valmis vastaanottamaan maksuja ✓</b><p>Kun Quote Engine laskee tarjouksen, asiakkaalle voidaan näyttää Maksa / hyväksy tarjous -painike.</p></div>
            ` : `
              <div class="field stripe-country-field"><label>Yrityksen maa</label><select id="stripeConnectCountry" ${stripeConnect.connected ? 'disabled' : ''}><option value="FI">Suomi</option><option value="SE">Ruotsi</option><option value="DE">Saksa</option><option value="GB">Iso-Britannia</option><option value="US">Yhdysvallat</option></select></div>
              <button class="btn dashboard-action" id="connectStripeBusiness" type="button">${stripeConnect.connected ? 'Jatka Stripe-asetuksia' : 'Yhdistä yrityksen Stripe'} <span>↗</span></button>
            `}
            <div id="stripeConnectMsg"></div>
          </div>
        </article>

      </section>

      <section class="panel install-panel dashboard-view-section dashboard-view-hidden" data-dashboard-view="account" id="install">
        <div class="panel-head"><div><small>ASENNUS</small><h2>Lisää Respondo verkkosivullesi</h2></div><span class="install-badge">1 sivusto</span></div>
        <p>Kopioi tämä koodi sivustosi HTML:ään juuri ennen sulkevaa <code>&lt;/body&gt;</code>-tagia.</p>
        <div class="license-lock">
          <span>🔒 SIDOTTU VERKKOSIVUUN</span>
          <b>${t.website ? esc(t.website) : 'Et ole vielä lisännyt verkkosivua'}</b>
          <small>${t.website ? 'Tämä asennuskoodi toimii vain yllä olevalla verkkosivulla.' : 'Lisää ensin verkkosivusi osoite yllä. Sen jälkeen botti toimii vain sillä sivulla.'}</small>
        </div>
        <div class="code-row"><code id="installCode">&lt;script src="${location.origin}/widget.js?v=20260924-language-v2" data-company="${esc(t.slug)}" data-lang="${currentLang()}"&gt;&lt;/script&gt;</code><button type="button" id="copyCode">Kopioi</button></div>
        <button type="button" class="install-done ${installedDone ? 'done' : ''}" id="installDone" data-tenant-id="${esc(t.id)}">${installedDone ? '✓ Asennus valmis' : 'Olen asentanut botin'}</button>
      </section>

      ${referral ? `
      <section class="panel referral-panel dashboard-view-section dashboard-view-hidden" data-dashboard-view="account" id="referral">
        <div class="referral-copy">
          <small>SUOSITTELE RESPONDOA</small>
          <h2>Kaverille −20 % ensimmäisestä kuukaudesta.</h2>
          <p>Anna tämä henkilökohtainen koodi yhdelle toiselle yritykselle. Koodi toimii kerran, vain kuukausitilauksessa, ja alennus koskee ensimmäistä maksullista kuukautta 3 päivän kokeilun jälkeen.</p>
        </div>
        <div class="referral-box">
          <span>OMA KERTAKÄYTTÖINEN SUOSITTELUKOODISI</span>
          <div class="referral-code-row">
            <code id="referralCode">${esc(referral.code)}</code>
            <button type="button" id="copyReferralCode" ${referral.available ? '' : 'disabled'}>${referral.available ? 'Kopioi koodi' : 'Koodi käytetty'}</button>
          </div>
          <div class="referral-actions">
            <button type="button" id="copyReferralLink" data-url="${esc(referral.shareUrl)}" ${referral.available ? '' : 'disabled'}>${referral.available ? 'Kopioi suosittelulinkki' : 'Linkki käytetty'}</button>
            <small>${referral.available ? '1 käyttökerta jäljellä' : 'Käytetty'}</small>
          </div>
        </div>
      </section>` : ''}

      <section class="panel billing-panel dashboard-view-section dashboard-view-hidden" data-dashboard-view="account" id="billing">
        <div><small>LASKUTUS</small><h2>Hallitse tilaustasi</h2><p>Voit vaihtaa maksutapaa, katsoa laskuja tai perua tilauksen Stripen asiakasportaalissa.</p></div>
        <button class="btn dashboard-action" id="billingPortal" type="button">Avaa tilauksen hallinta <span>↗</span></button>
      </section>
    </main>
  </div>`;
}

async function paymentSuccess() {
  const params = new URLSearchParams(location.search);
  const action = params.get('action') || '';
  const sessionId = params.get('session_id') || '';
  let result = null;
  let error = '';

  try {
    result = await api('/api/public/payment/verify?action=' + encodeURIComponent(action) + '&session_id=' + encodeURIComponent(sessionId));
  } catch (e) {
    error = e.message || 'Maksua ei voitu vahvistaa.';
  }

  if (result?.paid) {
    const amount = new Intl.NumberFormat(appLocale(), {
      style:'currency',
      currency:result.currency || 'EUR',
    }).format(Number(result.amountTotal || 0) / 100);

    return `<div class="payment-success-page">
      <div class="payment-success-card">
        ${logo()}
        <div class="payment-success-icon">✓</div>
        <small>MAKSU VAHVISTETTU</small>
        <h1>Valmis.</h1>
        <p>Maksu <b>${esc(amount)}</b> yritykselle <b>${esc(result.companyName || '')}</b> onnistui.</p>
        <p class="payment-success-note">Voit sulkea tämän sivun ja palata takaisin yrityksen verkkosivulle.</p>
      </div>
    </div>`;
  }

  return `<div class="payment-success-page">
    <div class="payment-success-card error">
      ${logo()}
      <div class="payment-success-icon">!</div>
      <small>MAKSUN TARKISTUS</small>
      <h1>Maksua ei vahvistettu.</h1>
      <p>${esc(error || 'Maksu ei näytä olevan vielä valmis.')}</p>
    </div>
  </div>`;
}

function initImmersiveHomeMotion() {
  const root = document.querySelector('.immersive-home');
  if (!root) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const compact = window.matchMedia('(max-width: 760px)').matches;

  document.documentElement.classList.add('respondo-motion-ready');

  const revealItems = root.querySelectorAll(
    '.hero-copy > *, .cinema-kicker, .cinema-phone, .cinema-float, ' +
    '.story-panel-copy > *, .story-visual, .world-label, .world-title, .world-window, .world-caption, ' +
    '.depth-copy > *, .depth-card, .depth-core, .portal-center > *, .portal-node, ' +
    '.impact-top > *, .impact-number, .calculator-shell, .pricing-section .split-head > *, ' +
    '.price-card, .final-cta .cta-shell > *, .contact-shell > *'
  );

  revealItems.forEach((el, index) => {
    el.classList.add('motion-reveal');
    el.style.setProperty('--reveal-delay', Math.min(index % 7, 6) * 45 + 'ms');
  });

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('motion-visible');
        observer.unobserve(entry.target);
      }
    }
  }, { threshold:0.12, rootMargin:'0px 0px -8% 0px' });

  revealItems.forEach((el) => observer.observe(el));

  if (reduceMotion || compact) {
    root.classList.add('motion-lite');
    revealItems.forEach((el) => {
      el.classList.add('motion-visible');
      el.classList.remove('motion-reveal');
      el.style.removeProperty('--reveal-delay');
      el.style.removeProperty('will-change');
    });
    observer.disconnect();
    return;
  }

  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
  const progress = (el, start = 0, end = 1) => {
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    const total = Math.max(1, rect.height - vh);
    const passed = -rect.top;
    return clamp((passed / total - start) / Math.max(.0001, end - start));
  };

  const hero = root.querySelector('.hero-immersive');
  const cinema = root.querySelector('.cinema-conversation');
  const story = root.querySelector('.story-horizontal');
  const storyTrack = root.querySelector('.story-track');
  const storyProgress = root.querySelector('.story-progress i');
  const storyCurrent = document.getElementById('storyCurrent');
  const world = root.querySelector('.product-world');
  const depth = root.querySelector('.motion-depth');
  const depthProgress = root.querySelector('.depth-progress i');
  const portal = root.querySelector('.trust-portal');
  const impact = root.querySelector('.impact-scene');
  const calculator = root.querySelector('.value-calculator');
  const pricing = root.querySelector('.pricing-section');

  let ticking = false;

  const paint = () => {
    ticking = false;

    const scrollY = window.scrollY || 0;
    root.style.setProperty('--page-scroll', scrollY.toFixed(1));

    if (hero) {
      const r = hero.getBoundingClientRect();
      const hp = clamp((-r.top) / Math.max(1, r.height));
      hero.style.setProperty('--hero-p', hp.toFixed(4));
    }

    if (cinema) {
      const p = progress(cinema);
      cinema.style.setProperty('--scene-p', p.toFixed(4));
    }

    if (story && storyTrack) {
      const p = progress(story);
      story.style.setProperty('--story-p', p.toFixed(4));
      storyTrack.style.transform = 'translate3d(' + (-p * 66.6667) + '%,0,0)';
      if (storyProgress) storyProgress.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      if (storyCurrent) {
        const step = p < .333 ? 1 : p < .666 ? 2 : 3;
        storyCurrent.textContent = String(step).padStart(2,'0');
      }
    }

    if (world) {
      const p = progress(world);
      world.style.setProperty('--world-p', p.toFixed(4));
    }

    if (depth) {
      const p = progress(depth);
      depth.style.setProperty('--depth-p', p.toFixed(4));
      if (depthProgress) depthProgress.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    }

    if (portal) {
      const rect = portal.getBoundingClientRect();
      const p = clamp(1 - Math.abs((rect.top + rect.height / 2) - window.innerHeight / 2) / (window.innerHeight + rect.height / 2));
      portal.style.setProperty('--portal-p', p.toFixed(4));
    }

    if (impact) {
      const p = progress(impact);
      impact.style.setProperty('--impact-p', p.toFixed(4));
    }

    if (calculator) {
      const rect = calculator.getBoundingClientRect();
      const p = clamp((window.innerHeight - rect.top) / (window.innerHeight + Math.min(rect.height, window.innerHeight)));
      calculator.style.setProperty('--section-p', p.toFixed(4));
    }

    if (pricing) {
      const rect = pricing.getBoundingClientRect();
      const p = clamp((window.innerHeight - rect.top) / (window.innerHeight + Math.min(rect.height, window.innerHeight)));
      pricing.style.setProperty('--section-p', p.toFixed(4));
    }
  };

  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(paint);
    }
  };

  window.addEventListener('scroll', onScroll, { passive:true });
  window.addEventListener('resize', onScroll, { passive:true });
  paint();

  root.querySelectorAll('.price-card, .calculator-shell, .cta-shell').forEach((card) => {
    card.classList.add('motion-tilt');
    card.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch') return;
      const rect = card.getBoundingClientRect();
      const x = clamp((event.clientX - rect.left) / Math.max(1,rect.width), 0, 1);
      const y = clamp((event.clientY - rect.top) / Math.max(1,rect.height), 0, 1);
      card.style.setProperty('--tilt-x', ((.5 - y) * 5).toFixed(2) + 'deg');
      card.style.setProperty('--tilt-y', ((x - .5) * 7).toFixed(2) + 'deg');
      card.style.setProperty('--shine-x', (x * 100).toFixed(1) + '%');
      card.style.setProperty('--shine-y', (y * 100).toFixed(1) + '%');
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--tilt-x','0deg');
      card.style.setProperty('--tilt-y','0deg');
    });
  });
}

async function route() {
  await config();
  const path = location.pathname;
  let html;

  if (path === '/') html = await home();
  else if (path === '/assistant') html = `<div>${nav()}<main class="assistant-route-fallback"><div class="container"><div class="section-kicker">${appText('KOKEILE RESPONDOA','TESTA RESPONDO','TRY RESPONDO')}</div><h1>${appText('Kokeile, miltä Respondo tuntuisi omassa yrityksessäsi.','Testa hur Respondo skulle fungera i ditt företag.','See how Respondo would work for your business.')}</h1><p>${appText('Lisää muutama yrityksesi tieto ja kysy sen jälkeen ihan samalla tavalla kuin asiakkaasi kysyisi.','Lägg till några uppgifter om ditt företag och fråga sedan precis som en kund skulle göra.','Add a few details about your business, then ask a question just as a customer would.')}</p></div></main></div>`;
  else if (path === '/tilaus') html = signup();
  else if (path === '/kirjaudu') html = login();
  else if (path === '/maksu-valmis') html = await paymentSuccess();
  else if (path === '/app') html = await dashboard();
  else if (['/kayttoehdot', '/tietosuoja', '/evasteet', '/dpa', '/tietoturva'].includes(path)) html = legal(path.slice(1));
  else html = `<div>${nav()}<main class="notfound"><div class="container"><div class="section-kicker">404</div><h1>Tätä sivua ei löytynyt.</h1><a class="btn ink" href="/">Palaa etusivulle</a></div></main>${footer()}</div>`;

  $('#app').innerHTML = html;
  applyLanguage();
  bindLanguageSwitch();

  if (path === '/') {
    const jobSlider = $('#jobValueSlider');
    const missedSlider = $('#missedSlider');
    const euro = (n) => new Intl.NumberFormat(appLocale(), { maximumFractionDigits: 0 }).format(n) + ' €';

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
    initImmersiveHomeMotion();
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
          const providerName = profile.provider === 'apple' ? 'Apple' : 'Google';
          badge.textContent = providerName + '-tili yhdistetty · ' + profile.email;
          form.querySelector('.formgrid')?.before(badge);
        })
        .catch(() => {});
    }

    const signupForm = $('#signup');
    const signupPlan = signupForm?.elements?.plan;
    const signupReferral = signupForm?.elements?.referralCode;
    const referralHint = $('#referralHint');
    const syncReferralField = () => {
      if (!signupReferral || !signupPlan) return;
      const monthly = signupPlan.value === 'monthly';
      signupReferral.disabled = !monthly;
      if (referralHint) {
        referralHint.textContent = monthly
          ? 'Saat voimassa olevalla koodilla 20 % pois ensimmäisestä maksullisesta kuukaudesta. Vain kuukausitilaukseen.'
          : 'Suosittelualennus toimii vain normaalissa kuukausitilauksessa.';
      }
    };
    signupPlan?.addEventListener('change', syncReferralField);
    syncReferralField();

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
            referralCode: form.get('referralCode'),
            acceptedTerms: !!form.get('terms'),
            language: currentLang(),
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
      button.innerHTML = appText('Kirjaudutaan sisään…','Loggar in…','Signing in…');
      $('#msg').innerHTML = '';
      try {
        await api('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: form.get('email'), password: form.get('password'), language: currentLang() }),
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
    const dashboardSelect = $('#dashboardSectionSelect');
    const validDashboardViews = new Set(['overview','setup','answers','customers','automation','account']);
    const targetViewMap = {
      'overview':'overview',
      'business-profile':'setup',
      'live-preview':'setup',
      'knowledge':'answers',
      'unanswered':'answers',
      'conversations':'customers',
      'leads':'customers',
      'actions2':'automation',
      'integrations':'automation',
      'install':'account',
      'referral':'account',
      'billing':'account',
    };

    const showDashboardView = (view, options = {}) => {
      const next = validDashboardViews.has(view) ? view : 'overview';
      document.querySelectorAll('.dashboard-view-section').forEach((section) => {
        section.classList.toggle('dashboard-view-hidden', section.dataset.dashboardView !== next);
      });
      if (dashboardSelect) dashboardSelect.value = next;

      if (options.updateUrl !== false) {
        const url = next === 'overview' ? '/app' : '/app?section=' + encodeURIComponent(next);
        history.replaceState({}, '', url);
      }
      if (options.scrollTop !== false) {
        document.querySelector('.dashboard-topbar')?.scrollIntoView({ behavior: options.instant ? 'auto' : 'smooth', block: 'start' });
      }
    };

    const requestedView = new URLSearchParams(location.search).get('section');
    showDashboardView(validDashboardViews.has(requestedView) ? requestedView : 'overview', {
      updateUrl:false,
      scrollTop:false,
    });

    dashboardSelect?.addEventListener('change', () => {
      showDashboardView(dashboardSelect.value);
    });

    const openDashboardTarget = (targetId) => {
      const view = targetViewMap[targetId] || 'overview';
      showDashboardView(view, { scrollTop:false });
      requestAnimationFrame(() => {
        document.getElementById(targetId)?.scrollIntoView({ behavior:'smooth', block:'start' });
      });
    };

    $('#welcomeStart')?.addEventListener('click', () => {
      openDashboardTarget('business-profile');
      $('#welcomeCard')?.classList.add('welcome-dismissed');
      setTimeout(() => $('#welcomeCard')?.remove(), 320);
    });

    document.querySelectorAll('.gap-jump').forEach((button) => {
      button.addEventListener('click', () => {
        openDashboardTarget('unanswered');
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
        openDashboardTarget(id);
      });
    });

    $('#runSelfTest')?.addEventListener('click', async (e) => {
      const button = e.currentTarget;
      const original = button.innerHTML;
      button.disabled = true;
      button.innerHTML = appText('Testataan…','Testar…','Testing…');
      const target = Number($('#selfTestDepth')?.value || 500) >= 1000 ? 1000 : 500;
      $('#selfTestResult').innerHTML = '<div class="self-test-running">' + appText('Respondo käy läpi ','Respondo går igenom ','Respondo is reviewing ') + target.toLocaleString(appLocale()) + appText(' realistista asiakaskysymystä ja etsii aukkoja.',' realistiska kundfrågor och letar efter luckor.',' realistic customer questions and looks for gaps.') + '</div>';
      try {
        const result = await api('/api/app/self-test', {
          method:'POST',
          body:JSON.stringify({ target }),
        });
        const gaps = Array.isArray(result.gaps) ? result.gaps : [];
        $('#selfTestResult').innerHTML =
          '<div class="self-test-score"><b>' + Number(result.score || 0) + '%</b><span>' +
          Number(result.answerable_questions || 0) + '/' + Number(result.total_questions || 0) +
          ' kysymykseen löytyy varma tieto</span></div>' +
          (gaps.length
            ? '<div class="self-test-gaps"><strong>Nämä kannattaa lisätä:</strong>' +
              gaps.slice(0,6).map((x) => '<button type="button" class="self-test-gap" data-question="' +
                esc(x.question) + '">' + esc(x.question) + '</button>').join('') + '</div>'
            : '<div class="notice success">Hyvältä näyttää — testissä ei löytynyt selviä tietopuutteita.</div>');

        document.querySelectorAll('.self-test-gap').forEach((gap) => {
          gap.addEventListener('click', () => {
            openDashboardTarget('knowledge');
            setTimeout(() => {
              const form = $('#knowledgeForm');
              if (form?.elements?.title) {
                form.elements.title.value = gap.dataset.question || '';
                form.elements.title.focus();
              }
            }, 350);
          });
        });
        button.innerHTML = appText('Testaa uudelleen','Testa igen','Test again');
      } catch (err) {
        $('#selfTestResult').innerHTML = '<div class="notice error">' + esc(err.message) + '</div>';
        button.innerHTML = original;
      } finally {
        button.disabled = false;
      }
    });

    document.querySelectorAll('.suggest-unanswered-answer').forEach((button) => {
      button.addEventListener('click', async () => {
        const item = button.closest('.unanswered-item');
        const msg = item?.querySelector('.unanswered-msg');
        const textarea = item?.querySelector('.unanswered-answer');
        const original = button.textContent;
        button.disabled = true;
        button.textContent = appText('Etsitään…','Söker…','Searching…');
        if (msg) msg.innerHTML = '';
        try {
          const result = await api('/api/app/unanswered/' + encodeURIComponent(item.dataset.id) + '/suggest', {
            method:'POST',
            body:'{}',
          });
          if (result.found && result.answer) {
            textarea.value = result.answer;
            textarea.focus();
            if (msg) msg.innerHTML = '<div class="notice success">' + appText('Löysin ehdotuksen yrityksesi verkkosivulta. Tarkista se ja hyväksy vasta sitten.','Jag hittade ett förslag på företagets webbplats. Kontrollera det och godkänn först därefter.','I found a suggestion on your company website. Review it and only then approve it.') + '</div>';
            button.textContent = appText('Ehdotus löytyi ✓','Förslag hittat ✓','Suggestion found ✓');
          } else {
            if (msg) msg.innerHTML = '<div class="notice error">' + appText('Verkkosivulta ei löytynyt tähän varmaa vastausta. Kirjoita oikea vastaus itse.','Det gick inte att hitta ett säkert svar på webbplatsen. Skriv det korrekta svaret själv.','A reliable answer could not be found on the website. Enter the correct answer yourself.') + '</div>';
            button.textContent = original;
          }
        } catch (err) {
          if (msg) msg.innerHTML = '<div class="notice error">' + esc(err.message) + '</div>';
          button.textContent = original;
        } finally {
          button.disabled = false;
        }
      });
    });

    const previewHistory = [];
    const previewCompanyName = $('.dashboard-workspace b')?.textContent || 'Yritys';
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

      chat?.insertAdjacentHTML('beforeend', '<div class="preview-bubble bot preview-thinking">' + appText('Haetaan hyväksytyistä tiedoista…','Söker i godkänd information…','Searching approved information…') + '</div>');
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
              bookingUrl: values.bookingUrl,
              notes: values.notes,
              customFacts,
            },
            history: previewHistory.slice(-6),
          }),
        });
        if (bubble) {
          bubble.classList.remove('preview-thinking');
          bubble.textContent = result.answer || appText('En löydä tähän vielä varmaa vastausta.','Jag hittar inget säkert svar på detta ännu.','I cannot find a reliable answer to this yet.');
        }
        previewHistory.push({ question, answer: result.answer || '' });
        if (previewHistory.length > 8) previewHistory.splice(0, previewHistory.length - 8);
      } catch (err) {
        if (bubble) {
          bubble.classList.remove('preview-thinking');
          bubble.textContent = err.message || appText('Vastaaminen epäonnistui. Yritä uudelleen.','Det gick inte att svara. Försök igen.','Reply failed. Please try again.');
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
          if (msg) msg.innerHTML = '<div class="notice success">' + appText('Lisätty tietopohjaan ✓','Tillagt i kunskapsbasen ✓','Added to knowledge base ✓') + '</div>';
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
        ['pricing','hours','phone','email','services','serviceArea','address','website','quoteRequestUrl','bookingUrl','notes'].forEach((name) => {
          if (p[name] && formEl?.elements[name]) formEl.elements[name].value = p[name];
        });
        $('#businessProfileMsg').innerHTML = '<div class="notice success">' + appText('Tiedot haettu. Tarkista ehdotukset ja tallenna ne vasta sitten.','Uppgifterna har hämtats. Kontrollera förslagen och spara dem först därefter.','Details imported. Review the suggestions and only then save them.') + '</div>';
        button.textContent = 'Tiedot haettu ✓';
        setTimeout(() => { button.textContent = original; button.disabled = false; }, 1800);
      } catch (err) {
        button.disabled = false;
        button.textContent = original;
        $('#businessProfileMsg').innerHTML = `<div class="notice error">${esc(err.message)}</div>`;
      }
    });

    document.querySelectorAll('.bot-avatar-option').forEach((button) => {
      button.addEventListener('click', () => {
        const formEl = $('#businessProfileForm');
        const value = button.dataset.avatar || 'robot-1';
        if (formEl?.elements?.botAvatar) formEl.elements.botAvatar.value = value;
        document.querySelectorAll('.bot-avatar-option').forEach((x) => x.classList.toggle('selected',x === button));
        const current = $('#botAvatarCurrent');
        const preview = $('#previewAvatarVisual');
        if (current) current.innerHTML = botAvatarMarkup(value);
        if (preview) preview.innerHTML = botAvatarMarkup(value);
        $('#botAvatarMsg').innerHTML = '';
      });
    });

    $('#businessProfileForm')?.elements?.botName?.addEventListener('input', (e) => {
      const preview = $('#previewBotName');
      if (preview) preview.textContent = String(e.currentTarget.value || '').trim() || 'RESPONDO AI';
    });

    $('#botAvatarUpload')?.addEventListener('change', async (e) => {
      const file = e.currentTarget.files?.[0];
      if (!file) return;
      $('#botAvatarMsg').innerHTML = '<div class="bot-avatar-processing">' + appText('Käsitellään kuvaa…','Bearbetar bilden…','Processing image…') + '</div>';
      try {
        const data = await imageFileToAvatarData(file);
        const formEl = $('#businessProfileForm');
        if (formEl?.elements?.botAvatar) formEl.elements.botAvatar.value = data;
        document.querySelectorAll('.bot-avatar-option').forEach((x) => x.classList.remove('selected'));
        const current = $('#botAvatarCurrent');
        const preview = $('#previewAvatarVisual');
        if (current) current.innerHTML = botAvatarMarkup(data);
        if (preview) preview.innerHTML = botAvatarMarkup(data);
        $('#botAvatarMsg').innerHTML = '<div class="bot-avatar-processing success">Oma kuva valittu ✓</div>';
      } catch (err) {
        $('#botAvatarMsg').innerHTML = '<div class="bot-avatar-processing error">' + esc(err.message) + '</div>';
      } finally {
        e.currentTarget.value = '';
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
            botName: form.get('botName'),
            botAvatar: form.get('botAvatar'),
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
            bookingUrl: form.get('bookingUrl'),
            averageLeadValue: form.get('averageLeadValue'),
            notes: form.get('notes'),
          }),
        });
        $('#businessProfileMsg').innerHTML = '<div class="notice success">' + appText('Yrityksen tiedot tallennettu. Botti käyttää nyt tallennettuja tietoja.','Företagsuppgifterna har sparats. Botten använder nu de sparade uppgifterna.','Company details saved. The bot now uses the saved information.') + '</div>';
        button.disabled = false;
        button.innerHTML = 'Tallennettu ✓';
        setTimeout(() => (button.innerHTML = original), 1800);
      } catch (err) {
        button.disabled = false;
        button.innerHTML = original;
        $('#businessProfileMsg').innerHTML = `<div class="notice error">${esc(err.message)}</div>`;
      }
    });

    document.querySelectorAll('.knowledge-feature-btn').forEach((button) => {
      button.addEventListener('click', async () => {
        const item = button.closest('.knowledge-item');
        const knowledgeId = item?.dataset.knowledgeId;
        if (!knowledgeId) return;

        const nextFeatured = button.dataset.featured !== 'true';
        const original = button.textContent;
        button.disabled = true;
        button.textContent = nextFeatured ? appText('Lisätään…','Lägger till…','Adding…') : appText('Poistetaan…','Tar bort…','Removing…');
        $('#knowledgeFeatureMsg').innerHTML = '';

        try {
          const result = await api('/api/app/knowledge/' + encodeURIComponent(knowledgeId) + '/quick-reply', {
            method:'POST',
            body:JSON.stringify({ featured:nextFeatured }),
          });
          button.dataset.featured = result.featured ? 'true' : 'false';
          button.classList.toggle('active', Boolean(result.featured));
          item?.classList.toggle('featured', Boolean(result.featured));
          button.textContent = result.featured
            ? '✓ Etusivulla ' + result.quickReplyOrder
            : '+ Lisää etusivulle';
          const counter = $('#knowledgeQuickCount');
          if (counter) counter.textContent = Number(result.selected || 0) + '/3 valittu';
          $('#knowledgeFeatureMsg').innerHTML = '<div class="notice success">' +
            (result.featured ? 'Kysymys näkyy nyt botin etusivulla.' : 'Kysymys poistettiin botin etusivulta.') +
            '</div>';
          setTimeout(() => {
            const msg = $('#knowledgeFeatureMsg');
            if (msg) msg.innerHTML = '';
          }, 1800);
        } catch (err) {
          button.textContent = original;
          $('#knowledgeFeatureMsg').innerHTML = '<div class="notice error">' + esc(err.message) + '</div>';
        } finally {
          button.disabled = false;
        }
      });
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

    $('#copyReferralCode')?.addEventListener('click', async (e) => {
      const code = $('#referralCode')?.textContent?.trim() || '';
      try {
        await navigator.clipboard.writeText(code);
        e.currentTarget.textContent = 'Kopioitu ✓';
        setTimeout(() => (e.currentTarget.textContent = 'Kopioi koodi'), 1400);
      } catch {
        e.currentTarget.textContent = 'Valitse ja kopioi';
      }
    });

    $('#copyReferralLink')?.addEventListener('click', async (e) => {
      const url = e.currentTarget.dataset.url || '';
      try {
        await navigator.clipboard.writeText(url);
        e.currentTarget.textContent = 'Linkki kopioitu ✓';
        setTimeout(() => (e.currentTarget.textContent = 'Kopioi suosittelulinkki'), 1400);
      } catch {
        e.currentTarget.textContent = 'Kopiointi ei onnistunut';
      }
    });

    $('#quoteEngineForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = new FormData(e.currentTarget);
      const button = e.currentTarget.querySelector('button[type="submit"]');
      const original = button.innerHTML;
      button.disabled = true;
      button.innerHTML = 'Tallennetaan…';
      try {
        await api('/api/app/quote-engine', {
          method:'POST',
          body:JSON.stringify({
            serviceName:form.get('serviceName'),
            basePrice:form.get('basePrice'),
            unitPrice:form.get('unitPrice'),
            minPrice:form.get('minPrice'),
            vatPercent:form.get('vatPercent'),
            unitLabel:form.get('unitLabel'),
          }),
        });
        $('#quoteEngineMsg').innerHTML = '<div class="notice success">Quote Engine tallennettu ✓</div>';
        button.innerHTML = 'Tallennettu ✓';
        setTimeout(() => (button.innerHTML = original), 1400);
      } catch (err) {
        $('#quoteEngineMsg').innerHTML = '<div class="notice error">' + esc(err.message) + '</div>';
        button.innerHTML = original;
      } finally {
        button.disabled = false;
      }
    });

    $('#bookingSlotsForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = new FormData(e.currentTarget);
      const startDateRaw = String(form.get('startDate') || '');
      const endDateRaw = String(form.get('endDate') || '');
      const startTimeRaw = String(form.get('startTime') || '09:00');
      const endTimeRaw = String(form.get('endTime') || '16:00');
      const duration = Math.max(15, Number(form.get('duration') || 60));
      const weekdays = new Set(form.getAll('weekday').map(String));
      const button = e.currentTarget.querySelector('button[type="submit"]');
      const original = button.innerHTML;

      if (!startDateRaw || !endDateRaw || !weekdays.size) {
        $('#bookingSlotsMsg').innerHTML = '<div class="notice error">' + appText('Valitse päivät ja vähintään yksi viikonpäivä.','Välj datum och minst en veckodag.','Select the dates and at least one weekday.') + '</div>';
        return;
      }

      const [sy,sm,sd] = startDateRaw.split('-').map(Number);
      const [ey,em,ed] = endDateRaw.split('-').map(Number);
      const startDate = new Date(sy,sm-1,sd,12,0,0,0);
      const endDate = new Date(ey,em-1,ed,12,0,0,0);
      if (endDate < startDate) {
        $('#bookingSlotsMsg').innerHTML = '<div class="notice error">' + appText('Päättymispäivän pitää olla aloituspäivän jälkeen.','Slutdatumet måste vara efter startdatumet.','The end date must be after the start date.') + '</div>';
        return;
      }

      const [sh,smin] = startTimeRaw.split(':').map(Number);
      const [eh,emin] = endTimeRaw.split(':').map(Number);
      const slots = [];
      const cursor = new Date(startDate);

      while (cursor <= endDate && slots.length < 300) {
        if (weekdays.has(String(cursor.getDay()))) {
          const dayStart = new Date(cursor.getFullYear(),cursor.getMonth(),cursor.getDate(),sh,smin,0,0);
          const dayEnd = new Date(cursor.getFullYear(),cursor.getMonth(),cursor.getDate(),eh,emin,0,0);
          let slotStart = new Date(dayStart);
          while (slotStart.getTime() + duration * 60000 <= dayEnd.getTime() && slots.length < 300) {
            const slotEnd = new Date(slotStart.getTime() + duration * 60000);
            slots.push({ start:slotStart.toISOString(), end:slotEnd.toISOString() });
            slotStart = slotEnd;
          }
        }
        cursor.setDate(cursor.getDate() + 1);
      }

      if (!slots.length) {
        $('#bookingSlotsMsg').innerHTML = '<div class="notice error">' + appText('Näillä asetuksilla ei syntynyt yhtään aikaa.','De här inställningarna skapade inga tider.','These settings did not produce any available times.') + '</div>';
        return;
      }

      button.disabled = true;
      button.innerHTML = 'Luodaan ' + slots.length + ' aikaa…';
      try {
        const result = await api('/api/app/booking-slots/generate', {
          method:'POST',
          body:JSON.stringify({ slots }),
        });
        $('#bookingSlotsMsg').innerHTML = '<div class="notice success">Luotiin ' + Number(result.saved || 0) + ' uutta vapaata aikaa ✓</div>';
        setTimeout(() => {
          location.href = '/app?section=automation';
        }, 650);
      } catch (err) {
        $('#bookingSlotsMsg').innerHTML = '<div class="notice error">' + esc(err.message) + '</div>';
        button.disabled = false;
        button.innerHTML = original;
      }
    });

    document.querySelectorAll('.delete-booking-slot').forEach((button) => {
      button.addEventListener('click', async () => {
        const id = button.dataset.id;
        const item = button.closest('.booking-slot-item');
        button.disabled = true;
        button.textContent = 'Poistetaan…';
        try {
          await api('/api/app/booking-slots/' + encodeURIComponent(id), { method:'DELETE' });
          item?.remove();
        } catch (err) {
          button.disabled = false;
          button.textContent = 'Poista';
          alert(err.message);
        }
      });
    });

    $('#disconnectGoogleCalendar')?.addEventListener('click', async (e) => {
      const button = e.currentTarget;
      const original = button.textContent;
      button.disabled = true;
      button.textContent = 'Katkaistaan…';
      try {
        await api('/api/app/google-calendar/disconnect', { method:'POST', body:'{}' });
        location.href = '/app?section=automation&calendar=disconnected';
      } catch (err) {
        $('#calendarConnectMsg').innerHTML = '<div class="notice error">' + esc(err.message) + '</div>';
        button.disabled = false;
        button.textContent = original;
      }
    });

    const calendarParam = new URLSearchParams(location.search).get('calendar');
    if (calendarParam === 'connected') {
      $('#calendarConnectMsg').innerHTML = '<div class="notice success">Google Calendar yhdistetty ✓</div>';
    } else if (calendarParam && !['disconnected'].includes(calendarParam)) {
      $('#calendarConnectMsg').innerHTML = '<div class="notice error">' + appText('Google Calendar -yhdistäminen ei valmistunut. Yritä uudelleen.','Anslutningen till Google Calendar slutfördes inte. Försök igen.','Google Calendar connection did not complete. Please try again.') + '</div>';
    }

    $('#connectStripeBusiness')?.addEventListener('click', async (e) => {
      const button = e.currentTarget;
      const original = button.innerHTML;
      const country = $('#stripeConnectCountry')?.value || 'FI';
      button.disabled = true;
      button.innerHTML = 'Avataan Stripe…';
      try {
        const result = await api('/api/app/stripe-connect/onboard', {
          method:'POST',
          body:JSON.stringify({ country }),
        });
        location.href = result.url;
      } catch (err) {
        $('#stripeConnectMsg').innerHTML = '<div class="notice error">' + esc(err.message) + '</div>';
        button.disabled = false;
        button.innerHTML = original;
      }
    });

    $('#metaChannelsForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = new FormData(e.currentTarget);
      const button = e.currentTarget.querySelector('button[type="submit"]');
      const original = button.innerHTML;
      button.disabled = true;
      button.innerHTML = 'Tallennetaan…';
      try {
        await api('/api/app/meta-channels', {
          method:'POST',
          body:JSON.stringify({
            graphVersion:form.get('graphVersion'),
            appSecret:form.get('appSecret'),
            whatsappPhoneNumberId:form.get('whatsappPhoneNumberId'),
            whatsappAccessToken:form.get('whatsappAccessToken'),
            instagramAccountId:form.get('instagramAccountId'),
            instagramAccessToken:form.get('instagramAccessToken'),
          }),
        });
        $('#metaChannelsMsg').innerHTML = '<div class="notice success">' + appText('Meta-kanavat tallennettu ✓ Lisää yllä näkyvä Webhook URL + Verify Token Meta Developer -asetuksiin.','Meta-kanaler sparade ✓ Lägg till Webhook URL och Verify Token som visas ovan i Meta Developer-inställningarna.','Meta channels saved ✓ Add the Webhook URL and Verify Token shown above in Meta Developer settings.') + '</div>';
        button.innerHTML = 'Tallennettu ✓';
        setTimeout(() => (button.innerHTML = original), 1500);
      } catch (err) {
        $('#metaChannelsMsg').innerHTML = '<div class="notice error">' + esc(err.message) + '</div>';
        button.innerHTML = original;
      } finally {
        button.disabled = false;
      }
    });

    $('#testMetaChannels')?.addEventListener('click', async (e) => {
      const button = e.currentTarget;
      const original = button.textContent;
      button.disabled = true;
      button.textContent = 'Testataan…';
      try {
        const result = await api('/api/app/meta-channels/test', { method:'POST', body:'{}' });
        const parts = [];
        if (result.results?.whatsapp) parts.push(result.results.whatsapp.ok ? 'WhatsApp ✓' : 'WhatsApp ✕');
        if (result.results?.instagram) parts.push(result.results.instagram.ok ? 'Instagram ✓' : 'Instagram ✕');
        $('#metaChannelsMsg').innerHTML = '<div class="notice ' + (result.ok ? 'success' : 'error') + '">' + esc(parts.join(' · ')) + '</div>';
        button.textContent = result.ok ? appText('Toimii ✓','Fungerar ✓','Working ✓') : appText('Tarkista tiedot','Kontrollera uppgifterna','Check details');
      } catch (err) {
        $('#metaChannelsMsg').innerHTML = '<div class="notice error">' + esc(err.message) + '</div>';
        button.textContent = original;
      } finally {
        button.disabled = false;
      }
    });

    $('#voiceAgentForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = new FormData(e.currentTarget);
      const button = e.currentTarget.querySelector('button[type="submit"]');
      const original = button.innerHTML;
      button.disabled = true;
      button.innerHTML = 'Tallennetaan…';
      try {
        await api('/api/app/voice', {
          method:'POST',
          body:JSON.stringify({
            accountSid:form.get('accountSid'),
            authToken:form.get('authToken'),
            phoneNumber:form.get('phoneNumber'),
            handoffNumber:form.get('handoffNumber'),
            enabled:form.get('enabled') === 'on',
            missedCallSmsEnabled:form.get('missedCallSmsEnabled') === 'on',
            missedCallSmsMessage:form.get('missedCallSmsMessage'),
            missedCallSmsMode:form.get('missedCallSmsMode'),
            missedCallAfterStart:form.get('missedCallAfterStart'),
            missedCallAfterEnd:form.get('missedCallAfterEnd'),
            missedCallTimezone:form.get('missedCallTimezone'),
          }),
        });
        $('#voiceAgentMsg').innerHTML = '<div class="notice success">Puhelinagentin asetukset tallennettu ✓</div>';
        button.innerHTML = 'Tallennettu ✓';
        setTimeout(() => (button.innerHTML = original), 1500);
      } catch (err) {
        $('#voiceAgentMsg').innerHTML = '<div class="notice error">' + esc(err.message) + '</div>';
        button.innerHTML = original;
      } finally {
        button.disabled = false;
      }
    });

    $('#testVoiceAgent')?.addEventListener('click', async (e) => {
      const button = e.currentTarget;
      const original = button.textContent;
      button.disabled = true;
      button.textContent = 'Testataan…';
      try {
        await api('/api/app/voice/test', { method:'POST', body:'{}' });
        $('#voiceAgentMsg').innerHTML = '<div class="notice success">' + appText('Twilio-yhteys toimii ✓','Twilio-anslutningen fungerar ✓','Twilio connection works ✓') + '</div>';
        button.textContent = 'Toimii ✓';
        setTimeout(() => (button.textContent = original), 1500);
      } catch (err) {
        $('#voiceAgentMsg').innerHTML = '<div class="notice error">' + esc(err.message) + '</div>';
        button.textContent = original;
      } finally {
        button.disabled = false;
      }
    });

    $('#testMissedCallSms')?.addEventListener('click', async (e) => {
      const button = e.currentTarget;
      const original = button.textContent;
      button.disabled = true;
      button.textContent = appText('Lähetetään…','Skickar…','Sending…');
      try {
        await api('/api/app/voice/test-sms', { method:'POST', body:'{}' });
        $('#voiceAgentMsg').innerHTML = '<div class="notice success">' + appText('Testi-SMS lähetetty ✓','Test-SMS skickat ✓','Test SMS sent ✓') + '</div>';
        button.textContent = appText('Lähetetty ✓','Skickat ✓','Sent ✓');
        setTimeout(() => (button.textContent = original), 1500);
      } catch (err) {
        $('#voiceAgentMsg').innerHTML = '<div class="notice error">' + esc(err.message) + '</div>';
        button.textContent = original;
      } finally {
        button.disabled = false;
      }
    });

    $('#configureVoiceNumber')?.addEventListener('click', async (e) => {
      const button = e.currentTarget;
      const original = button.textContent;
      button.disabled = true;
      button.textContent = 'Aktivoidaan…';
      try {
        await api('/api/app/voice/configure-number', { method:'POST', body:'{}' });
        $('#voiceAgentMsg').innerHTML = '<div class="notice success">Twilio-numero ohjaa nyt puhelut ja SMS-viestit Respondoon ✓</div>';
        button.textContent = 'Aktivoitu ✓';
      } catch (err) {
        $('#voiceAgentMsg').innerHTML = '<div class="notice error">' + esc(err.message) + '</div>';
        button.textContent = original;
      } finally {
        button.disabled = false;
      }
    });

    document.querySelectorAll('.live-mode-toggle').forEach((button) => {
      button.addEventListener('click', async () => {
        const item = button.closest('.live-thread');
        const id = item?.dataset.threadId;
        const mode = button.dataset.mode;
        if (!id) return;
        button.disabled = true;
        try {
          await api('/api/app/live/' + encodeURIComponent(id) + '/mode', {
            method:'POST',
            body:JSON.stringify({ mode }),
          });
          item.classList.toggle('human-mode', mode === 'human');
          item.querySelector('.live-mode').textContent = mode === 'human' ? '● Ihminen vastaa' : '● AI vastaa';
          button.dataset.mode = mode === 'human' ? 'ai' : 'human';
          button.textContent = mode === 'human' ? 'Palauta AI:lle' : 'Ota haltuun';
          item.querySelectorAll('.live-reply-form input,.live-reply-form button').forEach((el) => {
            el.disabled = mode !== 'human';
          });
        } catch (err) {
          item.querySelector('.live-msg').innerHTML = '<div class="notice error">' + esc(err.message) + '</div>';
        } finally {
          button.disabled = false;
        }
      });
    });

    document.querySelectorAll('.live-reply-form').forEach((formEl) => {
      formEl.addEventListener('submit', async (e) => {
        e.preventDefault();
        const item = formEl.closest('.live-thread');
        const id = item?.dataset.threadId;
        const input = formEl.elements.message;
        const message = String(input?.value || '').trim();
        if (!id || !message) return;
        const button = formEl.querySelector('button[type="submit"]');
        button.disabled = true;
        try {
          await api('/api/app/live/' + encodeURIComponent(id) + '/reply', {
            method:'POST',
            body:JSON.stringify({ message }),
          });
          const list = item.querySelector('.live-messages');
          list.insertAdjacentHTML('beforeend','<div class="live-message human"><small>' + appText('Sinä','Du','You') + '</small><p>' + esc(message) + '</p></div>');
          input.value = '';
          list.scrollTop = list.scrollHeight;
        } catch (err) {
          item.querySelector('.live-msg').innerHTML = '<div class="notice error">' + esc(err.message) + '</div>';
        } finally {
          button.disabled = false;
          input?.focus();
        }
      });
    });

    $('#integrationsForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const button = e.currentTarget.querySelector('button[type="submit"]');
      const original = button.innerHTML;
      button.disabled = true;
      button.innerHTML = 'Tallennetaan…';
      const form = new FormData(e.currentTarget);
      try {
        await api('/api/app/integrations', {
          method:'POST',
          body:JSON.stringify({ webhookUrl:form.get('webhookUrl') }),
        });
        $('#integrationMsg').innerHTML = '<div class="notice success">Integraatio tallennettu.</div>';
        button.innerHTML = 'Tallennettu ✓';
        setTimeout(() => (button.innerHTML = original), 1500);
      } catch (err) {
        $('#integrationMsg').innerHTML = '<div class="notice error">' + esc(err.message) + '</div>';
        button.innerHTML = original;
      } finally {
        button.disabled = false;
      }
    });

    $('#testIntegration')?.addEventListener('click', async (e) => {
      const button = e.currentTarget;
      const original = button.textContent;
      button.disabled = true;
      button.textContent = 'Testataan…';
      try {
        await api('/api/app/integrations/test', { method:'POST', body:'{}' });
        $('#integrationMsg').innerHTML = '<div class="notice success">Webhook vastasi onnistuneesti ✓</div>';
        button.textContent = 'Toimii ✓';
        setTimeout(() => (button.textContent = original), 1600);
      } catch (err) {
        $('#integrationMsg').innerHTML = '<div class="notice error">' + esc(err.message) + '</div>';
        button.textContent = original;
      } finally {
        button.disabled = false;
      }
    });

    document.querySelectorAll('.copy-integration-value').forEach((button) => {
      button.addEventListener('click', async () => {
        const target = document.getElementById(button.dataset.target);
        const value = target?.dataset?.value || target?.textContent || '';
        if (!value) return;
        const original = button.textContent;
        try {
          await navigator.clipboard.writeText(value);
          button.textContent = 'Kopioitu ✓';
          setTimeout(() => (button.textContent = original), 1300);
        } catch {
          button.textContent = appText('Kopioi käsin','Kopiera manuellt','Copy manually');
        }
      });
    });

    document.querySelectorAll('.mark-action-done').forEach((button) => {
      button.addEventListener('click', async () => {
        const item = button.closest('.action-request-item');
        const id = item?.dataset.actionId;
        if (!id) return;
        button.disabled = true;
        button.textContent = 'Tallennetaan…';
        try {
          await api('/api/app/action-requests/' + encodeURIComponent(id) + '/status', {
            method:'POST',
            body:JSON.stringify({ status:'done' }),
          });
          item.classList.add('done');
          item.querySelector('.action-state').textContent = 'Hoidettu';
          button.outerHTML = '<span class="action-done-label">✓ Hoidettu</span>';
        } catch (err) {
          button.disabled = false;
          button.textContent = 'Merkitse hoidetuksi';
          alert(err.message);
        }
      });
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

    const doLogout = async () => {
      try { await api('/api/auth/logout', { method: 'POST', body: '{}' }); } catch {}
      location.href = '/';
    };
    $('#logout')?.addEventListener('click', doLogout);
    $('#logoutTop')?.addEventListener('click', doLogout);

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
