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
    "Vastaukset":"Answers",
  "Epävarmat":"Uncertain",
  "Asennus":"Installation",
  "Järjestelmä aktiivinen":"System active",
  "ASIAKASPALVELU / LIVE":"CUSTOMER SERVICE / LIVE",
  "Yksi vastaus. Oikeasta lähteestä.":"One answer. From the right source.",
  "✓ hyväksytty tieto":"✓ approved information",
  "ASIAKAS · 22:43":"CUSTOMER · 22:43",
  "ASIAKAS · 22:44":"CUSTOMER · 22:44",
  "Paljonko huolto maksaa ja palveletteko myös viikonloppuna?":"How much does maintenance cost, and are you also open on weekends?",
  "Lähde löydetty":"Source found",
  "Perushuolto alkaa 89 eurosta. Lauantaisin palvelemme klo 10–14.":"Basic maintenance starts at €89. On Saturdays, we are open from 10:00 to 14:00.",
  "Hinnasto / Aukioloajat":"Pricing / Opening hours",
  "Voitteko luvata valmistumisen huomiseksi?":"Can you guarantee that it will be finished by tomorrow?",
  "Ei riittävästi hyväksyttyä tietoa.":"Not enough approved information.",
  "RESPONDO AI ei arvaa. Asiakas ohjataan jatkamaan ihmisen kanssa.":"RESPONDO AI does not guess. The customer is directed to continue with a person.",
  "verkossa":"online",
  "pakkoa keksiä":"need to invent",
  "hallittu tietopohja":"managed knowledge base",
  "Harvard Business Review’n auditissa 2 241 yhdysvaltalaisesta yrityksestä lähes joka neljäs ei vastannut testiliidiin 30 päivän aikana.":"In a Harvard Business Review audit of 2,241 U.S. companies, nearly one in four did not respond to the test lead within 30 days.",
  "Samassa HBR-auditissa vain 37 % yrityksistä reagoi verkkoliidiin tunnin sisällä. Erillisessä 1,25 miljoonan liidin analyysissä alle tunnissa yhteyttä ottaneet olivat lähes 7× todennäköisempiä kvalifioimaan liidin kuin myöhemmin vastanneet.":"In the same HBR audit, only 37% of companies responded to an online lead within an hour. In a separate analysis of 1.25 million leads, companies that responded within an hour were nearly 7× more likely to qualify the lead than those that responded later.",
  "Salesforcen asiakastutkimuksen mukaan 77 % asiakkaista odottaa voivansa olla vuorovaikutuksessa yrityksen kanssa heti yhteydenottohetkellä.":"According to Salesforce customer research, 77% of customers expect to be able to interact with a company immediately when they make contact.",
  "Zendesk CX Trends 2026 -tutkimuksessa 74 % kuluttajista sanoi AI:n nostaneen odotuksen siitä, että asiakaspalvelu on saatavilla vuorokauden ympäri.":"In Zendesk CX Trends 2026, 74% of consumers said AI has raised their expectation that customer service should be available around the clock.",
  "Zendesk raportoi yli 11 000 kuluttajan ja yritysjohtajan aineistosta 22 maassa, että 86 % kuluttajista sanoo palvelun reagointinopeuden ja oikean ratkaisun vaikuttavan vahvasti heidän ostohalukkuuteensa.":"Zendesk reported from a study of more than 11,000 consumers and business leaders across 22 countries that 86% of consumers say response speed and getting the right solution strongly influence their willingness to buy.",
  "HBR:n lead response -tutkimus on vuodelta 2011 ja tehtiin Yhdysvalloissa, joten sitä ei esitetä nykyisten suomalaisyritysten suorana keskiarvona. Se kertoo mitatusta yhteydestä vastausnopeuden ja liidin kvalifioinnin välillä.":"The HBR lead-response study is from 2011 and was conducted in the United States, so it is not presented as a direct average for Finnish companies today. It describes a measured relationship between response speed and lead qualification.",
  "Arvio näyttää yhteydenottojen teoreettisen kokonaisarvon, jos yksi vastaamatta jäänyt yhteydenotto vastaisi yhtä työn arvoista kauppaa. Todellinen toteuma riippuu yrityksestä ja siitä, kuinka moni yhteydenotto muuttuu asiakkaaksi.":"The estimate shows the theoretical total value of inquiries if each unanswered inquiry were equal to one sale worth the selected job value. Actual results depend on the business and on how many inquiries become customers.",
  "/vuosi + alv":"/year + VAT",
  "49 €/kk + alv · kuukausi":"€49/month + VAT · monthly",
  "549 €/vuosi + alv · vuosi":"€549/year + VAT · yearly",
  "RESPONDO AI / 3 PÄIVÄÄ":"RESPONDO AI / 3 DAYS",
  "Katso miltä 24/7-asiakaspalvelu näyttää omassa yrityksessäsi.":"See what 24/7 customer service looks like for your business.",
  "Luo tili, lisää yrityksesi hyväksytty tieto ja testaa palvelua 3 päivää maksutta.":"Create an account, add your company-approved information, and try the service free for 3 days.",
  "Aloita maksutta →":"Start for free →",
  "Katson myöhemmin":"Maybe later",
  "RESPONDO AI kokeilu":"RESPONDO AI trial",
  "Sulje":"Close",
  "RESPONDO-botti":"RESPONDO bot",
  "Avaa RESPONDO-botti":"Open RESPONDO bot",
  "valmis vastaamaan":"ready to help",
  "sama vastausmoottori kuin oikeassa botissa":"the same answer engine as the live bot",
  "Moi 👋 Olen Respondon sivuassistentti. Kysy miten palvelu toimii tai mitä se maksaa.":"Hi 👋 I’m RESPONDO’s site assistant. Ask how the service works or what it costs.",
  "Moi 👋 Testaa nyt yrityksen omilla tiedoilla. Kysy esimerkiksi hinnasta, aukioloajoista, palveluista tai omista lisäämistäsi kysymyksistä.":"Hi 👋 Test the bot using your company’s own information. Ask about pricing, opening hours, services, or your own added questions.",
  "Mitä RESPONDO AI maksaa?":"What does RESPONDO AI cost?",
  "Miten 3 päivän kokeilu toimii?":"How does the 3-day trial work?",
  "Miten asennus toimii?":"How does installation work?",
  "Haetaan hyväksytyistä tiedoista…":"Checking approved information…",
  "Haetaan yrityksen tiedoista…":"Checking company information…",
  "Muotoillaan vastausta…":"Preparing the answer…",
  "En löydä tätä tietoa yrityksen tallennetuista tiedoista.":"I cannot find this information in the company’s saved information.",
  "Yhteys vastauspalveluun katkesi.":"The connection to the answer service was interrupted.",
  "RESPONDO AI maksaa 49 € / kk + alv tai 549 € / vuosi + alv. Molemmissa on 3 päivän maksuton kokeilu.":"RESPONDO AI costs €49/month + VAT or €549/year + VAT. Both plans include a 3-day free trial.",
  "Saat 3 päivää maksutta. Maksutapa lisätään alussa Stripessä, ja veloitus alkaa vasta kokeilun jälkeen, ellet peru tilausta ennen sitä.":"You get 3 days free. A payment method is added through Stripe at the start, and billing begins only after the trial unless you cancel before it ends.",
  "Lisäät yrityksesi hyväksytyt tiedot tietopohjaan. RESPONDO AI vastaa asiakkaalle niiden perusteella ja ohjaa epävarmat tilanteet ihmiselle sen sijaan, että arvaisi.":"You add your company-approved information to the knowledge base. RESPONDO AI answers customers using that information and hands uncertain cases to a person instead of guessing.",
  "Kun tili on käytössä, saat hallintapaneelista yhden asennusrivin, jolla chat-widget lisätään verkkosivulle.":"Once your account is active, the dashboard gives you one installation line that adds the chat widget to your website.",
  "RESPONDO AI käyttää HTTPS-yhteyksiä, salattuja palveluntarjoajia ja rajattuja käyttöoikeuksia. Maksukorttitiedot käsittelee Stripe. Lisätiedot löydät Tietoturva- ja Tietosuojasivuista.":"RESPONDO AI uses HTTPS connections, secure service providers, and restricted access. Payment card data is handled by Stripe. More details are available on the Security and Privacy pages.",
  "Tilauksen voi perua koska tahansa. Käyttö jatkuu maksetun laskutuskauden loppuun.":"You can cancel the subscription at any time. Access continues until the end of the paid billing period.",
  "Respondon Y-tunnus on 3599437-5. Yhteyssähköposti on respondoai.fi@outlook.com.":"RESPONDO’s Business ID is 3599437-5. The contact email is respondoai.fi@outlook.com.",
  "Moi! Kysy vaikka hinnasta, kokeilusta, käyttöönotosta, tietoturvasta tai siitä miten RESPONDO AI toimii.":"Hi! Ask about pricing, the trial, setup, security, or how RESPONDO AI works.",
  "En halua keksiä vastausta. Voin auttaa Respondon hinnassa, kokeilussa, käyttöönotossa, tietoturvassa ja tilauksessa — tai voit ottaa yhteyttä osoitteeseen respondoai.fi@outlook.com.":"I don’t want to invent an answer. I can help with RESPONDO’s pricing, trial, setup, security, and subscription — or you can contact respondoai.fi@outlook.com.",
  "Hyväksyn":"I accept",
  "käyttöehdot":"terms of service",
  "Maksukorttitiedot käsittelee Stripe. RESPONDO AI ei tallenna korttinumeroasi.":"Payment card data is handled by Stripe. RESPONDO AI does not store your card number.",
  "TYÖTILA":"WORKSPACE",
  "Kirjaudu ulos":"Log out",
  "Täältä hallitset botin vastauksia ja näet, mitä asiakkaasi kysyvät.":"Manage the bot’s answers here and see what your customers ask.",
  "Palvelu aktiivinen":"Service active",
  "KÄYTTÖÖNOTTO":"SETUP",
  "yhteensä":"total",
  "yhteystietoa jätetty":"contact details submitted",
  "14 PÄIVÄÄ":"14 DAYS",
  "Keskustelujen määrä":"Number of conversations",
  "Kun keskusteluja kertyy, näet kehityksen tässä.":"As conversations accumulate, you’ll see the trend here.",
  "TÄLLÄ VIIKOLLA":"THIS WEEK",
  "Mitä botti ei vielä tiennyt?":"What didn’t the bot know yet?",
  "Hyvältä näyttää.":"Looks good.",
  "Täytä nämä kerran. Voit muuttaa tietoja milloin tahansa, ja botti käyttää aina tallennettua versiota.":"Fill these in once. You can change the information at any time, and the bot always uses the saved version.",
  "Verkkosivu / asennusdomain":"Website / installation domain",
  "Asennuskoodi toimii vain tällä verkkosivulla.":"The installation code works only on this website.",
  "RESPONDO ehdottaa sivulta löytyviä palveluja ja yhteystietoja. Tarkistat ne ennen tallennusta.":"RESPONDO suggests services and contact details found on the website. You review them before saving.",
  "Tarjouspyyntölomakkeen linkki":"Quote request form link",
  "Botti voi antaa tämän linkin, kun asiakas pyytää tarjousta.":"The bot can provide this link when a customer asks for a quote.",
  "Mitä palveluja teette?":"What services do you provide?",
  "Muut tärkeät tiedot":"Other important information",
  "Nämä tiedot ovat botin hyväksyttyjä vastauksia.":"This information contains the bot’s approved answers.",
  "Voit muokata tietoja myöhemmin koska tahansa.":"You can edit the information at any time later.",
  "Tallenna yrityksen tiedot":"Save company information",
  "Näe vastaus heti":"See the answer instantly",
  "Esikatselu käyttää juuri nyt lomakkeessa olevia tietoja ja tallennettua tietopohjaa.":"The preview currently uses the information in the form and the saved knowledge base.",
  "Hyväksytyt vastaukset":"Approved answers",
  "UUSI TIETO":"NEW INFORMATION",
  "Lisää vastaus":"Add answer",
  "Hyväksytty vastaus":"Approved answer",
  "Tallenna tietopohjaan":"Save to knowledge base",
  "VIIMEISIMMÄT KESKUSTELUT":"RECENT CONVERSATIONS",
  "Mitä asiakkaat kysyvät?":"What are customers asking?",
  "Näet asiakkaan kysymyksen, botin vastauksen ja sen, tarvittiinko jatko-ohjausta.":"See the customer’s question, the bot’s answer, and whether a handoff was needed.",
  "Ei keskusteluja vielä.":"No conversations yet.",
  "Ensimmäiset asiakaskysymykset näkyvät täällä.":"The first customer questions will appear here.",
  "Asiakkaat, jotka jättivät yhteystietonsa":"Customers who left their contact details",
  "Kun botti ei tiedä vastausta, asiakas voi jättää yhteystiedot yhteydenottoa varten.":"When the bot does not know the answer, the customer can leave contact details for follow-up.",
  "Ei liidejä vielä.":"No leads yet.",
  "Yhteystietonsa jättäneet asiakkaat näkyvät tässä.":"Customers who leave their contact details will appear here.",
  "Kysymykset, joihin botti ei vielä osannut vastata":"Questions the bot could not answer yet",
  "Lisää vastaus suoraan tästä. Se tallentuu tietopohjaan seuraavia asiakkaita varten.":"Add the answer directly here. It is saved to the knowledge base for future customers.",
  "ASENNUS":"INSTALLATION",
  "Lisää botti verkkosivullesi":"Add the bot to your website",
  "Tilauksen hallinta":"Subscription management",
  "TESTAA RESPONDOA":"TEST RESPONDO",
  "Lisää muutama yrityksen tieto ja kysy kuten oikea asiakkaasi kysyisi.":"Add some company information and ask a question the way a real customer would.",
  "Sivua ei löytynyt.":"Page not found.",
  "TESTAA OMAN YRITYKSESI TIEDOILLA":"TEST WITH YOUR COMPANY’S INFORMATION",
  "Rakenna botin tietopohja.":"Build the bot’s knowledge base.",
  "Lisää yrityksesi tiedot ja omat kysymys–vastausparit. Testibotti käyttää samaa vastauslogiikkaa kuin oikea widget.":"Add your company information and your own Q&A pairs. The test bot uses the same answer logic as the real widget.",
  "Valitse palvelu…":"Choose a service…",
  "Verkkosivu":"Website",
  "Tarjouspyyntölinkki":"Quote request link",
  "Omat hakusanat ja vastaukset":"Custom keywords and answers",
  "Esim. “Päivystys” → “Päivystämme 24/7 numerossa…”":"E.g. “Emergency service” → “We provide 24/7 emergency service at…”",
  "+ Uusi rivi":"+ New row",
  "+ Lisää oma kysymys / hakusana":"+ Add your own question / keyword",
  "Tallenna botille":"Save for bot",
  "Otsikko / kysymys / hakusana":"Title / question / keyword",
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