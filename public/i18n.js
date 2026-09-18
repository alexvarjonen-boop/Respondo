(() => {
  const lang = localStorage.getItem('respondo-lang') === 'en' ? 'en' : 'fi';
  window.RESPONDO_LANG = lang;
  if (lang !== 'en') return;

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    try {
      const rawUrl = typeof input === 'string' ? input : input?.url || '';
      let nextInput = input;
      if (/\/api\/public\/.+\/widget-token(?:\?|$)/.test(rawUrl)) {
        const u = new URL(rawUrl, location.origin);
        u.searchParams.set('lang', 'en');
        nextInput = typeof input === 'string' ? u.toString() : new Request(u.toString(), input);
      }
      if (/\/api\/public\/(?:demo-chat|[^/]+\/(?:chat|lead))(?:\?|$)/.test(rawUrl) && typeof init?.body === 'string') {
        try {
          const parsed = JSON.parse(init.body);
          init = { ...init, body: JSON.stringify({ ...parsed, lang: 'en' }) };
        } catch {}
      }
      return originalFetch(nextInput, init);
    } catch {
      return originalFetch(input, init);
    }
  };

  const T = new Map(Object.entries({
    'RESPONDO AI etusivu':'RESPONDO AI home',
    'Päänavigaatio':'Main navigation',
    'Sivun osiot':'Page sections',
    'Google-kirjautuminen ei ole vielä käytettävissä. Voit jatkaa sähköpostilla.':'Google sign-in is not available yet. You can continue with email.',
    'Kirjautumisistunto vanheni. Yritä uudelleen.':'Your sign-in session expired. Please try again.',
    'Google-kirjautuminen epäonnistui. Yritä uudelleen.':'Google sign-in failed. Please try again.',
    'Tällä tilillä ei ole vielä RESPONDO AI -käyttäjää. Luo tili ensin.':'There is no RESPONDO AI account for this Google account yet. Create an account first.',
    'Tili on luotu, mutta tilaus pitää vielä viimeistellä.':'Your account was created, but the subscription still needs to be completed.',
    'Kirjautuminen epäonnistui. Yritä uudelleen.':'Sign-in failed. Please try again.',
    'Automaattinen kirjautuminen ei onnistunut. Kirjaudu samalla sähköpostilla ja salasanalla, jonka loit ennen maksua.':'Automatic sign-in failed. Sign in with the same email address and password you created before payment.',
    'RESPONDO AI käyttöliittymäesimerkki':'RESPONDO AI interface example',
    'Sivua ei löytynyt':'Page not found',
    'Takaisin etusivulle':'Back to home',
    'Nämä ehdot koskevat Respondon yritysasiakkaille tarjottavaa ohjelmistopalvelua.':'These terms apply to the software service RESPONDO provides to business customers.',
    '1. Palveluntarjoaja':'1. Service provider',
    '2. Palvelu':'2. Service',
    'RESPONDO AI on verkkopohjainen B2B-ohjelmistopalvelu, jonka avulla yritys voi ylläpitää hyväksyttyä tietopohjaa ja tarjota verkkosivullaan automatisoituja asiakasvastauksia.':'RESPONDO AI is a web-based B2B software service that lets a company maintain an approved knowledge base and provide automated customer answers on its website.',
    '3. Kokeilu ja tilaus':'3. Trial and subscription',
    '4. Hinnat ja verot':'4. Pricing and taxes',
    '5. Peruutus':'5. Cancellation',
    'Tilauksen voi perua. Kun jo maksettu laskutuskausi on alkanut, käyttö jatkuu kauden loppuun, ellei pakottavasta lainsäädännöstä muuta johdu.':'The subscription can be cancelled. Once a paid billing period has started, access continues until the end of that period unless mandatory law requires otherwise.',
    '6. Asiakkaan vastuu':'6. Customer responsibilities',
    'Asiakas vastaa palveluun syöttämänsä tiedon oikeellisuudesta, käyttöoikeuksista sekä siitä, että palvelua käytetään lain ja näiden ehtojen mukaisesti.':'The customer is responsible for the accuracy of information entered into the service, the necessary rights to use it, and for using the service in accordance with law and these terms.',
    '7. Palvelun saatavuus':'7. Service availability',
    'Palvelua kehitetään jatkuvasti. Huollot, palveluntarjoajien häiriöt tai muut tekniset syyt voivat aiheuttaa katkoksia.':'The service is continuously developed. Maintenance, third-party outages, or other technical reasons may cause interruptions.',
    'Tässä kuvataan, mitä tietoja RESPONDO AI käsittelee palvelun tarjoamiseksi.':'This section explains what information RESPONDO AI processes to provide the service.',
    'Rekisterinpitäjä':'Data controller',
    'Käsiteltävät tiedot':'Data processed',
    'Käyttäjätilin tiedot, yrityksen yhteystiedot, Y-tunnus, laskutukseen liittyvät tunnisteet, palveluun syötetty tietopohja sekä chat-palvelun kautta syntyvät keskustelutiedot.':'Account information, company contact details, Business ID, billing-related identifiers, the knowledge base entered into the service, and conversation data created through the chat service.',
    'Käyttötarkoitukset':'Purposes of processing',
    'Palvelun toteuttaminen, käyttäjän tunnistaminen, tilauksen hallinta, asiakastuki, väärinkäytösten ehkäisy ja palvelun tekninen ylläpito.':'Providing the service, identifying the user, managing the subscription, customer support, preventing abuse, and technical maintenance.',
    'Maksukorttitiedot käsittelee Stripe omien ehtojensa mukaisesti. RESPONDO AI ei tallenna varsinaista korttinumeroa omaan tietokantaansa.':'Payment card data is processed by Stripe under its own terms. RESPONDO AI does not store the actual card number in its own database.',
    'Palvelun teknisessä toteutuksessa käytetään ulkopuolisia infrastruktuuri-, tietokanta-, maksu- ja AI-palveluntarjoajia. Tietoja voidaan käsitellä niiden sopimusehtojen ja sovellettavan tietosuojalainsäädännön mukaisesti.':'The service uses third-party infrastructure, database, payment, and AI providers. Data may be processed under their contractual terms and applicable data-protection law.',
    'Säilytys':'Retention',
    'Tietoja säilytetään vain niin kauan kuin niitä tarvitaan palvelun toteuttamiseen, sopimusvelvoitteisiin, tietoturvaan tai lakisääteisiin velvoitteisiin.':'Data is retained only as long as necessary to provide the service, meet contractual obligations, maintain security, or comply with legal requirements.',
    'RESPONDO AI käyttää tällä hetkellä vain palvelun toiminnan kannalta välttämättömiä evästeitä.':'RESPONDO AI currently uses only cookies that are necessary for the service to function.',
    'Istuntoeväste':'Session cookie',
    'Kirjautumisen yhteydessä selaimeen asetetaan suojattu istuntoeväste, jolla käyttäjä pidetään kirjautuneena hallintapaneeliin.':'When you sign in, a secure session cookie is set in the browser to keep you signed in to the dashboard.',
    'Markkinointievästeet':'Marketing cookies',
    'Respondon markkinointisivulla ei ole oletuksena käytössä ei-välttämättömiä analytiikka- tai mainosevästeitä.':'RESPONDO’s marketing site does not use non-essential analytics or advertising cookies by default.',
    'Stripe Checkout voi käyttää omia evästeitään maksamisen, petosten torjunnan ja Link-pikamaksun toteuttamiseksi.':'Stripe Checkout may use its own cookies for payments, fraud prevention, and Link accelerated checkout.',
    'Kun RESPONDO AI käsittelee yritysasiakkaan puolesta henkilötietoja, asiakas toimii lähtökohtaisesti rekisterinpitäjänä ja RESPONDO AI käsittelijänä.':'When RESPONDO AI processes personal data on behalf of a business customer, the customer generally acts as controller and RESPONDO AI as processor.',
    'Käsittelyn kohde':'Subject matter of processing',
    'Käsittely liittyy palvelun käyttämiseen, yrityksen tietopohjaan sekä verkkosivun chatissa käsiteltäviin viesteihin.':'Processing relates to use of the service, the company knowledge base, and messages processed in the website chat.',
    'RESPONDO AI käsittelee asiakkaan puolesta tietoja palvelun toteuttamiseksi ja asiakkaan dokumentoitujen ohjeiden mukaisesti.':'RESPONDO AI processes data on the customer’s behalf to provide the service and in accordance with the customer’s documented instructions.',
    'Luottamuksellisuus ja turvallisuus':'Confidentiality and security',
    'Pääsy tuotantoympäristöihin ja salaisuuksiin rajataan tarpeen mukaan. Salasanoja ei tallenneta selväkielisinä.':'Access to production environments and secrets is restricted on a need-to-know basis. Passwords are not stored in plain text.',
    'Alikäsittelijät':'Sub-processors',
    'Palvelu nojaa infrastruktuuri-, tietokanta-, maksu- ja AI-palveluntarjoajiin.':'The service relies on infrastructure, database, payment, and AI service providers.',
    'Respondon tavoite on minimoida turha tiedonkäsittely ja pitää palvelun kriittiset salaisuudet erillään selaimesta.':'RESPONDO aims to minimize unnecessary data processing and keep critical service secrets separate from the browser.',
    'Käyttäjien salasanat tallennetaan yksisuuntaisesti hajautettuina, ei selväkielisinä.':'User passwords are stored as one-way hashes, not in plain text.',
    'Maksu-, tietokanta- ja AI-palveluiden salaiset avaimet säilytetään palvelimen ympäristömuuttujissa eikä niitä toimiteta selaimelle.':'Secret keys for payment, database, and AI services are stored in server environment variables and are not sent to the browser.',
    'Asiakasvastaukset on suunniteltu nojaamaan yrityksen hyväksyttyyn tietopohjaan. Kun varmaa tietoa ei löydy, palvelu voi palauttaa jatko-ohjeen arvauksen sijaan.':'Customer answers are designed to rely on the company’s approved knowledge base. When reliable information is unavailable, the service can return a follow-up instruction instead of guessing.',
    'Täytä yrityksen tiedot':'Complete company details',
    'Lisää vähintään yksi oma vastaus':'Add at least one custom answer',
    'Testaa ensimmäinen keskustelu':'Test the first conversation',
    'RESPONDO AI on valmis.':'RESPONDO AI is ready.',
    'Viimeistele käyttöönotto.':'Complete setup.',
    'Keskustelut viimeisen 14 päivän aikana':'Conversations in the last 14 days',
    'Hei! Miten voin auttaa?':'Hi! How can I help?',
    'Luonteva ja ystävällinen':'Natural and friendly',
    'Lyhyt ja suora':'Short and direct',
    'Asiallinen ja ammattimainen':'Professional and concise',
    'Esim. Putkityö 65 € / h + alv. Päivystys 95 € / h + alv.':'E.g. plumbing €65/hour + VAT. Emergency service €95/hour + VAT.',
    'Esim. putkityöt, LVI-asennukset, sähkötyöt, huollot, päivystys':'E.g. plumbing, HVAC installations, electrical work, maintenance, emergency service',
    'Esim. päivystysnumero, maksutavat, takuukäytännöt, ajanvarausohjeet, poikkeukset...':'E.g. emergency number, payment methods, warranty policy, booking instructions, exceptions...',
    'Lisätiedot':'Additional information',
    'Mitä asiakas kysyy?':'What does the customer ask?',
    'Kirjoita vastaus täsmällisesti sellaisena kuin asiakkaalle saa kertoa.':'Write the approved answer exactly as it may be communicated to the customer.',
    'Kirjoita hyväksytty vastaus tähän…':'Write the approved answer here…',
    'Verkkosivua ei ole vielä määritetty':'Website not set yet',
    'Sama asennuskoodi ei aktivoidu toisella verkkosivulla.':'The same installation code will not activate on another website.',
    'Tallenna ensin yrityksen verkkosivu yllä. Widget aktivoituu vain siihen domainiin.':'Save the company website above first. The widget activates only on that domain.',
    'Haetaan hyväksytyistä tiedoista…':'Checking approved information…',
    'En löydä tähän vielä varmaa vastausta.':'I cannot find a reliable answer to this yet.',
    'Vastaaminen epäonnistui. Yritä uudelleen.':'The response failed. Please try again.',
    'Kirjoita vastaus ensin.':'Write an answer first.',
    'Lisätty tietopohjaan ✓':'Added to the knowledge base ✓',
    'Tiedot haettu. Tarkista ehdotukset ja tallenna ne vasta sitten.':'Information imported. Review the suggestions before saving them.',
    'Tiedot haettu ✓':'Information imported ✓',
    'Yrityksen tiedot tallennettu. Botti käyttää nyt tallennettuja tietoja.':'Company information saved. The bot now uses the saved information.',
    'Valitse ja kopioi':'Select and copy',
    'Merkitty asennetuksi':'Marked as installed',
    'Tallennetaan…':'Saving…',
    'Poistetaan…':'Deleting…',
    'Tallenna':'Save',
    'Poista':'Delete',
    'Lisää':'Add',
    'Peruuta':'Cancel',
    'Takaisin':'Back',
    'Uusi':'New',
    'Asiakas':'Customer',
    'Yritys':'Company',
    'Kysymys':'Question',
    'Vastaus':'Answer',
    'Asetukset':'Settings',
    'Tilaus':'Subscription',
    'Hallintapaneeli':'Dashboard'
  }));

  const attributeMap = new Map(Object.entries({
    'Etunimi Sukunimi':'First name Last name',
    'sinä@yritys.fi':'you@company.com',
    'info@yritys.fi':'info@company.com',
    'hinta, maksaa, tarjous':'price, cost, quote',
    'Yrityksen nimi':'Company name',
    'Vähintään 10 merkkiä':'At least 10 characters',
    'Kirjoita kysymys…':'Type your question…',
    'Kirjoita kysymys':'Type your question',
    'Päänavigaatio':'Main navigation',
    'Sivun osiot':'Page sections',
    'RESPONDO AI etusivu':'RESPONDO AI home'
  }));

  function translateString(value) {
    const raw = String(value ?? '');
    const trimmed = raw.trim();
    if (!trimmed) return raw;
    let out = T.get(trimmed) || trimmed;
    if (out === trimmed) {
      out = out
        .replace(/Y-tunnus/g, 'Business ID')
        .replace(/\bkuukausi\b/gi, 'month')
        .replace(/\bvuosi\b/gi, 'year')
        .replace(/\bpäivää\b/gi, 'days')
        .replace(/\balv\b/gi, 'VAT');
    }
    return raw.replace(trimmed, out);
  }

  function translateNode(root) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      const next = translateString(root.nodeValue);
      if (next !== root.nodeValue) root.nodeValue = next;
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
    const el = root.nodeType === Node.ELEMENT_NODE ? root : null;
    if (el && ['SCRIPT','STYLE','CODE','PRE'].includes(el.tagName)) return;
    if (el) {
      for (const attr of ['placeholder','aria-label','title']) {
        const v = el.getAttribute?.(attr);
        if (v) {
          const next = attributeMap.get(v) || T.get(v);
          if (next && next !== v) el.setAttribute(attr, next);
        }
      }
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const p = node.parentElement;
      if (!p || ['SCRIPT','STYLE','CODE','PRE'].includes(p.tagName)) continue;
      const next = translateString(node.nodeValue);
      if (next !== node.nodeValue) node.nodeValue = next;
    }
    root.querySelectorAll?.('[placeholder],[aria-label],[title]').forEach((node) => {
      for (const attr of ['placeholder','aria-label','title']) {
        const v = node.getAttribute(attr);
        if (!v) continue;
        const next = attributeMap.get(v) || T.get(v);
        if (next && next !== v) node.setAttribute(attr, next);
      }
    });
  }

  const run = () => {
    document.documentElement.lang = 'en';
    translateNode(document.body);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach(translateNode);
        if (mutation.type === 'characterData') translateNode(mutation.target);
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
})();