// Focused, first-party guides. One page per user intent; no keyword-doorway variants.
export const SEO_SPECIALIST_GUIDES = {
  "/guides/chatbot-verkkosivuille-kayttoonotto": {
    "reading": "8",
    "topic": "implementation",
    "fi": {
      "title": "Chatbot verkkosivuille – asennus ja käyttöönotto",
      "subtitle": "Käytännön opas AI-chatbotin lisäämiseen HTML-sivustolle, Shopify-verkkokauppaan tai muulle julkaisualustalle. Tarkista myös tietopohja, mobiilikäyttö ja asiakaspalvelijan siirto.",
      "sections": [
        [
          "Mitä verkkosivun chatbotti tarvitsee ennen asennusta?",
          "Ensin tarvitaan yritykselle luotu botti, hyväksyttyjen vastausten tietopohja ja asennuskoodi. Tarkista, että yrityksen nimi, palvelualue, hinnasto ja yhteystiedot vastaavat todellista tilannetta. Pelkän chat-ikkunan ilmestyminen sivulle ei vielä tarkoita, että automaattinen asiakaspalvelija olisi käyttövalmis. Aloita viidestä yleisestä palvelukysymyksestä ja kahdesta kysymyksestä, joihin vastausta ei saa keksiä."
        ],
        [
          "Näin AI-chatbot asennetaan tavalliselle HTML-sivustolle",
          "Kopioi yrityksellesi luotu kokonainen asennuskoodi Respondon hallintapaneelin Asennus-näkymästä. Lisää koodi sivuston yhteiseen HTML-pohjaan ohjeen osoittamaan kohtaan, tyypillisesti ennen sulkevaa body-elementtiä, ja julkaise sivusto. Varmista, että skriptin osoite on oikea ja yritystunniste kuuluu oikealle työtilalle. Älä julkaise salaisia API-avaimia HTML:ssä. Avaa julkaistu sivu yksityisessä selainikkunassa ja tarkista, latautuuko chat-kuvake ilman virheitä."
        ],
        [
          "Chatbot Shopify-verkkokauppaan",
          "Shopifyssa asennuspaikka riippuu käytössä olevasta integraatiosta ja teemasta. Jos käytössä on teemaan liitettävä asennuskoodi, tee ensin teemasta varmuuskopio ja lisää koodi Shopify-hallinnan verkkokaupan teemakoodin muokkaimessa oikeaan yhteiseen pohjaan. Jos integraatio tarjoaa Shopify-sovelluksen app embed -lohkon, käytä sen ohjeistettua aktivointia. Tarkista julkaistulla teemalla tuotesivu, ostoskori ja mobiilinäkymä. Älä sijoita samaa koodia sekä sovellukseen että teemaan: muuten chat voi latautua kahdesti."
        ],
        [
          "Entä WordPress tai sivustorakentaja?",
          "WordPress-sivustolla käytä tarvittaessa teeman tai hyväksytyn lisäosan tarjoamaa mukautetun koodin lisäystä, jotta skripti latautuu sivuston kaikilla tarkoitetuilla sivuilla. Sivustorakentajat ja Google Sites voivat estää tai rajata kolmannen osapuolen JavaScriptin suoraa käyttöä: silloin pelkkä skriptin liittäminen tekstikenttään ei välttämättä toimi. Tarkista alustan sallimat HTML-upotus- tai iframe-vaihtoehdot ja varmista, että valittu menetelmä sopii Respondon widgettiin. Älä lupaa yhteensopivuutta alustalla, jota et ole testannut."
        ],
        [
          "Tarkista chatin toiminta eri tilanteissa",
          "Käy läpi vähintään etusivu, yhteystietosivu, tuotesivu tai palvelusivu sekä mobiilinäkymä. Varmista, ettei chat peitä ostoskorin tai lomakkeen painikkeita, ettei sivu zoomaa odottamattomasti syötekenttää kosketettaessa ja että ulkoasu pysyy yrityksen brändin mukaisena. Testaa suomi, ruotsi ja englanti niissä tilanteissa, joissa yritys palvelee usealla kielellä. Varmista myös, ettei mobiilin näppäimistö peitä lähetyspainiketta."
        ],
        [
          "Asennuksen jälkeinen hyväksyntätesti",
          "Esitä kolme yrityksen tietopohjasta löytyvää kysymystä, kaksi puhekielistä jatkokysymystä, kaksi hinnan tai saatavuuden rajatapausta ja pyyntö puhua ihmiselle. Luotettava chatbot kertoo puuttuvan tiedon rehellisesti eikä vahvista tilausta, hintaa tai ajanvarausta ilman oikeaa taustajärjestelmän vahvistusta. Kirjaa virheet, korjaa tietopohja ja toista testi. Mittaa vastausten oikeellisuutta ennen kuin arvioit liidien määrää."
        ],
        [
          "Kenelle tämä käyttöönotto sopii?",
          "Käyttöönoton vaiheet soveltuvat yrityksille, jotka haluavat chatbotin verkkosivuilleen: verkkokauppaan, kampaamoon, autokorjaamoon tai palveluyritykseen. Kaikkien alustojen integrointi ei ole samanlaista ja ominaisuudet riippuvat valitusta tuotteesta. Respondo AI:n maksulliset tilaukset ovat toistaiseksi tarjolla vain suomalaisille yrityksille."
        ]
      ],
      "faq": [
        [
          "Miten chatbot lisätään verkkosivulle?",
          "Luo yrityskohtainen botti, kopioi sen asennuskoodi hallintapaneelista ja lisää koodi verkkosivun sallimaan paikkaan. Testaa julkaistu sivusto myös puhelimella."
        ],
        [
          "Voiko chatbotin asentaa Shopifyyn?",
          "Shopify-teemaan voidaan lisätä sallittua koodia tai käyttää integraation tarjoamaa app embed -lohkoa. Tarkka tapa riippuu sovelluksesta ja teemasta."
        ],
        [
          "Miksi chatbot ei näy sivulla?",
          "Mahdollisia syitä ovat väärä yritystunniste, julkaisematon teema, sisällönsuojaukset, skriptin latausvirhe tai alustan upotusrajoitukset."
        ],
        [
          "Voiko chatbot toimia ilman yrityksen tietopohjaa?",
          "Chat-ikkuna voi näkyä, mutta yrityskohtaisiin hintoihin ja palveluihin ei pidä vastata ilman hyväksyttyjä tietoja."
        ]
      ]
    },
    "sv": {
      "title": "Installera chatbot på webbplatsen – steg för steg",
      "subtitle": "Så lägger du till AI-chat på en vanlig webbplats eller en webbutik och testar både mobilläge och företagets godkända svar.",
      "sections": [
        [
          "Förbered kunskapsbasen först",
          "Innan installationen ska företagets namn, öppettider, priser, tjänster och kontaktvägar vara kontrollerade. Ett synligt chattfönster betyder inte att botten har rätt information. Välj vanliga kundfrågor och några fall där botten måste erkänna att svaret saknas."
        ],
        [
          "Installera på en vanlig HTML-webbplats",
          "Kopiera installationskoden för rätt företag i Respondos installationsvy. Lägg den på den anvisade platsen i webbplatsens gemensamma sidmall, publicera och öppna den färdiga sidan i ett privat webbläsarfönster. Kontrollera att skriptet laddas och att rätt företags chatt visas. Lägg aldrig hemliga API-nycklar i HTML."
        ],
        [
          "Lägg till chatt i Shopify",
          "Arbetssättet beror på temat och integrationen. Ta först en kopia av temat om koden ska läggas in manuellt. Om en Shopify-app erbjuder ett app embed-block, använd appens anvisningar. Testa produkt- och kassarelaterade sidor på den publicerade versionen. Lägg inte in samma skript på två platser eftersom botten då kan visas två gånger."
        ],
        [
          "WordPress och webbplatsbyggare",
          "En WordPress-installation kan göras via temats säkra kodfunktion eller ett godkänt tillägg. Andra webbplatsbyggare, inklusive Google Sites, kan begränsa JavaScript och inbäddat innehåll. Kontrollera vilken metod plattformen faktiskt tillåter och prova den innan du lovar kunden en fungerande integration."
        ],
        [
          "Kontrollera mobil och olika språk",
          "Öppna chatten på mobil, kontrollera placering, tangentbord, kontraster och att köpknappar inte blockeras. Testa svar på finska, svenska och engelska om företaget använder dem. Se till att samma verkliga tjänster och priser återges oavsett språk."
        ],
        [
          "Testa okända och svåra kundfrågor",
          "Prova dokumenterade frågor, korta följdfrågor, okända priser och önskemål att tala med en anställd. Botten ska inte hitta på bokning eller kostnad. Dokumentera fel, korrigera kunskapsbasen och testa igen innan lansering."
        ],
        [
          "Vilka företag kan använda detta?",
          "En webbplatsbot kan passa både webbutiker och tjänsteföretag, men stödet beror på deras webbplattform och verktygets funktioner. Betalda Respondo AI-abonnemang är för närvarande bara tillgängliga för finska företag."
        ]
      ],
      "faq": [
        [
          "Hur installerar man en chatbot på en webbplats?",
          "Skapa botten, kopiera installationskoden för rätt företag och lägg in den där din plattform tillåter den. Testa på den publicerade sidan."
        ],
        [
          "Kan man använda en chatbot på Shopify?",
          "Det beror på integrationen; en app embed eller korrekt tillagd temakod kan vara alternativ."
        ],
        [
          "Varför syns inte botten?",
          "Kontrollera att temat är publicerat, företagskoden är rätt och att plattformen inte blockerar skriptet."
        ],
        [
          "Fungerar botten utan kunskapsbas?",
          "Ett chattfönster kan synas men företagsspecifika svar kräver kontrollerade uppgifter."
        ]
      ]
    },
    "en": {
      "title": "How to Add an AI Chatbot to Your Website",
      "subtitle": "A practical installation checklist for HTML sites, Shopify stores and website builders, including mobile testing and grounded customer answers.",
      "sections": [
        [
          "Set up trustworthy business answers before embedding",
          "Confirm your service list, opening hours, contact details, published prices and booking rules. A visible widget is not proof of an accurate support experience. Select common customer questions and several cases where no answer is available; the chatbot should say when it does not know rather than improvise."
        ],
        [
          "Install a chatbot on an HTML website",
          "Copy the complete company-specific embed code from your Respondo installation dashboard. Insert it into the shared HTML layout at the location specified by the integration instructions, commonly before the closing body tag. Publish and open the real site in a private browser window. Verify the script URL and workspace identifier. Never place private API secrets in public HTML."
        ],
        [
          "Shopify chatbot installation",
          "The exact method depends on your integration and theme. Back up or duplicate the theme before editing its code. If a compatible Shopify app supplies an app embed block, follow that installation flow. Otherwise, use the approved theme editing route for your provider's snippet. Verify the published store, product pages and mobile cart interactions. Avoid adding the same widget through both an app and theme code."
        ],
        [
          "WordPress and other website builders",
          "WordPress sites may support a safe code insertion tool or theme hook for site-wide scripts. Builders such as Google Sites can limit direct third-party JavaScript; check their supported embed capabilities before claiming compatibility. A generic script pasted into visual page text might never execute."
        ],
        [
          "Test mobile usability, performance and languages",
          "Inspect the chat launcher, keyboard, close button and layout on a real phone. Ensure it does not cover navigation, checkout buttons or consent controls. If customers ask questions in Finnish, Swedish and English, confirm that translated answers preserve the same company-approved services, prices and policies."
        ],
        [
          "Validate unknown questions and human escalation",
          "Run known questions, paraphrases, follow-ups, unavailable pricing scenarios and a request to reach staff. A reliable website AI assistant should not fabricate an appointment, claim a payment was received or guess an individual quotation. Record failures, adjust approved knowledge and repeat the checks."
        ],
        [
          "Scope and availability",
          "The workflow applies to many service and ecommerce websites, but embedding capabilities vary by platform and plan. Respondo AI paid business subscriptions are currently available only to companies in Finland."
        ]
      ],
      "faq": [
        [
          "How do I install a website chatbot?",
          "Create a company-specific assistant, copy its approved embed code and add it through your website platform's supported method. Test the live site afterward."
        ],
        [
          "Can I add a chatbot to Shopify?",
          "Usually via a supported integration, an app embed or an approved theme code insertion, depending on the product."
        ],
        [
          "Why is the chatbot not showing?",
          "Verify the published theme, embed script URL, workspace identifier, browser errors and platform restrictions."
        ],
        [
          "Does a chatbot need a knowledge base?",
          "Company-specific service details and prices should come from approved sources, not guesses."
        ]
      ]
    }
  },
  "/guides/asiakaspalvelun-automaatio-mittarit": {
    "reading": "7",
    "topic": "measurement",
    "fi": {
      "title": "Asiakaspalvelun automaatio – mittarit ja säästölaskelma",
      "subtitle": "Milloin automatisoitu asiakaspalvelu kannattaa yritykselle? Laske toistuvien kysymysten työmäärä, arvioi kustannukset ja mittaa oikeat vastaukset ilman perusteettomia tuloslupauksia.",
      "sections": [
        [
          "Mitä asiakaspalvelun automaatio tarkoittaa?",
          "Asiakaspalvelun automaatio tarkoittaa tavallisten kysymysten, yhteydenottopyyntöjen ja tiedonhakujen käsittelyä ilman jokaisen tilanteen manuaalista vastausta. Automaattinen asiakaspalvelija voi hakea tietoa hinnastosta, palvelukuvauksesta ja aukioloajoista. Automatisoitu asiakaspalvelu ei tarkoita sitä, että kaikki asiakastilanteet jäisivät koneelle: yksilölliset tarjoukset, herkät tiedot ja epäselvät tilanteet vaativat usein työntekijää."
        ],
        [
          "Laske ensin toistuvien kysymysten käsittelyaika",
          "Kirjaa yhden viikon aikana, kuinka monta toistuvaa kysymystä tulee puhelimitse, sähköpostitse ja verkkosivuilta. Mittaa vastaamiseen käytetty aika viestimäärän sijaan. Esimerkki: 20 tuttua kysymystä päivässä, keskimäärin 3 minuuttia käsittelyä kohden ja 22 työpäivää kuukaudessa merkitsee 1 320 minuuttia eli 22 tuntia. Tämä on nykyisen työn määrän esimerkkilasku, ei automaatiolla säästyvä aika."
        ],
        [
          "Erota oikeat vastaukset viestien määrästä",
          "Botin avausten tai lähettyjen viestien määrä ei kerro onnistumisesta. Hyödyllisempi mittari on oikein ratkaistujen keskustelujen osuus: oikean vahvistetun vastauksen saaneet tapaukset jaettuna kaikilla arvioiduilla keskusteluilla. Seuraa erikseen virheellisiä vastauksia, ihmisen käsittelyyn siirrettyjä asioita, kesken jääneitä keskusteluja ja niitä asiakkaita, jotka löysivät oikean yhteydenottotavan."
        ],
        [
          "Säästön laskukaava ja realistinen esimerkki",
          "Mahdollinen ajansäästö tunneissa = toistuvien kysymysten määrä × keskimääräinen käsittelyaika minuutteina × oikein automaattisesti ratkenneiden osuus ÷ 60. Edellisen esimerkin 440 kuukausittaisesta kysymyksestä 40 prosenttia eli 176 ratkeaa oikein ja ilman jatkotyötä: laskennallinen säästö on 528 minuuttia eli 8,8 tuntia kuukaudessa. Jos ylläpitoon kuluu kaksi tuntia, nettovaikutus työaikaan on 6,8 tuntia ennen muita muuttujia. Nämä ovat havainnollistavia oletuksia, eivät Respondo AI:n mitattuja tuloksia."
        ],
        [
          "Yhteydenottojen arvo ei ole sama kuin myynti",
          "Liidin arvo voidaan arvioida kaavalla keskimääräinen kauppakate × yhteydenoton toteutunut muuttumisaste asiakkaaksi. Esimerkiksi 200 euron kate ja 10 prosentin toteutunut konversio antaa 20 euron odotusarvon yhteydenottoa kohden. Pelkkä uusi chat-viesti ei siis tarkoita uutta 200 euron myyntiä. Mittaa yhteydenottopyyntöjen laatua sekä sitä, syntyikö kauppa lopulta botin avustuksella."
        ],
        [
          "Mitä kokonaiskustannuksiin kuuluu?",
          "Tilauksen kuukausimaksun lisäksi huomioi käyttöönotto, tiedon tuonti ja tarkistus, vastausten ylläpito, mahdollisten integraatioiden kustannukset sekä henkilöstön virheellisten vastausten korjaamiseen käyttämä aika. Vertaa kuukausilaskutuksen ja vuosilaskutuksen kokonaismaksuja ajantasaisesta hinnastosta. Respondo AI:n maksulliset yritystilaukset ovat toistaiseksi saatavilla vain Suomessa."
        ],
        [
          "Neljä mittaria ensimmäiselle kuukaudelle",
          "Seuraa (1) oikein ratkaistujen kysymysten osuutta, (2) väärien tai epävarmojen vastausten määrää, (3) ihmisen käsittelyyn ohjautuneiden asioiden määrää ja vasteaikaa sekä (4) hyväksyttyjä yhteydenottopyyntöjä, jotka johtivat jatkokeskusteluun. Vertaa tuloksia lähtötilanteeseen. Korjaa tietopohjan puutteet ennen kuin tavoittelet lisää botin käyttöä."
        ]
      ],
      "faq": [
        [
          "Paljonko asiakaspalvelun automaatio säästää?",
          "Säästö riippuu todellisesta kysymysmäärästä, vastaamiseen käytetystä ajasta, oikein ratkenneiden tapausten osuudesta ja ylläpitotyöstä. Yhtä yleispätevää säästölupausta ei ole."
        ],
        [
          "Miten AI-asiakaspalvelun hyötyä mitataan?",
          "Tärkeintä on oikeiden vastausten, työntekijälle siirtyvien tapausten, läpimenneiden yhteydenottojen ja nettotyöajan muutoksen mittaaminen."
        ],
        [
          "Onko chatbotin viestimäärä hyvä mittari?",
          "Yksinään ei. Suuri viestimäärä voi myös kertoa siitä, ettei asiakas löydä vastausta. Tarkista lopputulos."
        ],
        [
          "Kannattaako pienyrityksen automatisoida asiakaspalvelu?",
          "Jos samat kysymykset toistuvat ja vastaukset voidaan vahvistaa, pieni pilotti voi olla perusteltu. Päätös tehdään mitatun hyödyn ja kokonaiskustannusten perusteella."
        ]
      ]
    },
    "sv": {
      "title": "Automatiserad kundservice – mät nytta och arbetstid",
      "subtitle": "En praktisk guide till uppföljning av AI-kundservice: korrekta svar, eskalering, kostnader och en transparent beräkningsmodell.",
      "sections": [
        [
          "Vad är kundserviceautomatisering?",
          "Automatiserad kundservice kan ta hand om återkommande frågor med godkända företagsuppgifter. Den ersätter inte mänskligt omdöme i komplicerade eller känsliga situationer. Bedöm nyttan utifrån konkreta kundproblem, inte antalet chatbotmeddelanden."
        ],
        [
          "Mät arbetstiden innan du automatiserar",
          "Räkna faktiska återkommande frågor under en vecka och hur många minuter personalen använder per fråga. Exempel: 20 frågor varje arbetsdag, 3 minuter per fråga och 22 arbetsdagar ger 1 320 minuter, alltså 22 timmars manuellt arbete per månad. Det är en illustration av utgångsläget, inte en utlovad besparing."
        ],
        [
          "Prioritera korrekta svar",
          "För att uppskatta automatiseringsgraden måste du veta hur många ärenden som avslutas med ett kontrollerat rätt svar utan mer arbete. Följ också upp fel, obesvarade frågor, överlämningar och kunder som inte hittade informationen."
        ],
        [
          "Beräkna möjlig tidsvinst",
          "Beräknad tidsvinst = antal frågor × minuter per fråga × andelen korrekt lösta ärenden ÷ 60. Om 40 procent av 440 frågor löses korrekt utan efterarbete ger det 8,8 timmar brutto. Om underhållet kräver två timmar blir den teoretiska nettovinsten 6,8 timmar. Antagandena är inte mätningar av Respondos kundresultat."
        ],
        [
          "En kontaktförfrågan är inte automatiskt en försäljning",
          "Beräkna den förväntade nyttan med täckningsbidrag per affär × verklig konverteringsgrad från förfrågan till kund. Ett extra meddelande är inte samma sak som omsättning. Använd egna utfall, inte branschlöften."
        ],
        [
          "Räkna hela kostnaden",
          "Ta hänsyn till abonnemang, installation, kvalitetssäkring, uppdatering av kunskap och personalens kontroll av problematiska svar. Kontrollerade abonnemangspriser finns på Respondos prissida. Betalda abonnemang erbjuds för närvarande bara i Finland."
        ],
        [
          "Fyra mått under den första månaden",
          "Följ andelen rätt lösta frågor, felaktiga svar, ärenden som kräver en medarbetare och kvalificerade kontakter som går vidare. Jämför med utgångsläget och förbättra kunskapsbasen innan du ökar automationsgraden."
        ]
      ],
      "faq": [
        [
          "Hur mycket tid sparar AI-kundservice?",
          "Det beror på antal frågor, korrekt automatiseringsgrad och underhållsarbete. Det finns ingen garanterad tidsvinst."
        ],
        [
          "Vad bör man mäta?",
          "Andelen korrekta lösningar, eskaleringar, felaktiga svar och verkliga kundkontakter."
        ],
        [
          "Är många chatbotmeddelanden ett gott tecken?",
          "Inte alltid. En lång konversation kan tyda på att kunden inte får svar."
        ],
        [
          "Passar automatisering småföretag?",
          "En begränsad pilot kan vara lämplig om de vanligaste frågorna har verifierade svar."
        ]
      ]
    },
    "en": {
      "title": "Customer Service Automation: ROI and Metrics",
      "subtitle": "A practical guide to measuring an AI support chatbot: correct resolution rate, staff handoffs, lead value and realistic time savings.",
      "sections": [
        [
          "What does customer service automation cover?",
          "An automated customer service agent can handle routine website questions using approved company information, including service details, listed prices and opening hours. The objective is not to pretend that every enquiry can be resolved by software. Personal quotes, sensitive data and ambiguous cases still need human judgement."
        ],
        [
          "Measure your baseline before you buy software",
          "Track the number of genuinely repetitive enquiries and the average time spent on them. For example, 20 requests per workday × three minutes × 22 workdays equals 1,320 minutes, or 22 hours of staff time per month. This describes an illustrative workload, not the time an AI chatbot will automatically save."
        ],
        [
          "Accurate resolutions matter more than message count",
          "A high number of chatbot conversations can be a warning sign rather than success. Measure the share of sampled enquiries that received a correct, verified answer without follow-up. Also track inaccurate replies, unknown questions, human escalations and requests abandoned before resolution."
        ],
        [
          "A transparent time-savings formula",
          "Potential hours saved = monthly repetitive enquiries × minutes per enquiry × share resolved correctly without staff work ÷ 60. If 40% of 440 monthly requests meet that standard, 176 requests × three minutes would theoretically free 8.8 hours. Subtract two hours of routine knowledge maintenance for an illustrative 6.8-hour net time impact. These are hypothetical assumptions, not proven Respondo AI performance figures."
        ],
        [
          "A lead is not the same as a sale",
          "Estimate expected value per qualified enquiry using contribution margin per customer × historical enquiry-to-sale conversion rate. A €200 margin and 10% conversion rate imply €20 expected value per qualified lead, not a guaranteed €200 sale for each chat message. Measure downstream sales, not only captured contact forms."
        ],
        [
          "Include the full cost of ownership",
          "Account for subscription fees, integration, knowledge approval, ongoing maintenance, error correction and staff training. Compare monthly and annual billing on the current pricing page. Respondo AI paid business subscriptions are currently available only in Finland."
        ],
        [
          "Four useful KPIs for the first month",
          "Track accurate autonomous resolution rate, unsupported or incorrect responses, human handoffs and response time, and qualified enquiries that proceed to a meaningful next step. Re-evaluate the baseline after a small pilot before expanding the assistant."
        ]
      ],
      "faq": [
        [
          "How much money does customer support automation save?",
          "There is no guaranteed average. Results depend on actual request volume, accurate automated resolution and operating costs."
        ],
        [
          "Which AI customer support metrics matter most?",
          "Correctly resolved requests, errors, escalations, qualified enquiries and net staff time changes."
        ],
        [
          "Is chat message volume a good KPI?",
          "Not by itself. More messages can mean confused customers rather than better service."
        ],
        [
          "Is AI customer service worth it for small businesses?",
          "A focused pilot can be appropriate when questions repeat and verified answers exist. Base the decision on measured outcomes."
        ]
      ]
    }
  },
  "/guides/asiakaspalvelubotin-testaus": {
    "reading": "8",
    "topic": "evaluation",
    "fi": {
      "title": "Asiakaspalvelubotin testaus – 25 kysymystä ja tarkistuslista",
      "subtitle": "Miten testaat AI-asiakaspalvelijan ennen julkaisua? Käytännön kysymykset hintoihin, ajanvaraukseen, monikielisyyteen, tietosuojaan ja ihmisen tavoittamiseen.",
      "sections": [
        [
          "Miksi bottia pitää testata ennen kuin asiakas kysyy?",
          "Chatbotin uskottava vastaus ei vielä ole oikea vastaus. Ennen julkaisua tulee selvittää, tunnistaako automaattinen asiakaspalvelija yrityksen todelliset palvelut, kieltäytyykö se keksimästä hintoja ja toimiiko keskustelu jatkokysymyksissä. Testaus on erityisen tärkeää yrityksissä, joissa väärä lupaus aiheuttaa virheellisen ajanvarauksen, ylimääräisen työmäärän tai asiakkaan menettämisen."
        ],
        [
          "1. Testaa vahvistettu tieto ja puuttuva tieto",
          "Esitä samasta palvelusta kolme erilaista kysymystä: ”Mitä huolto maksaa?”, ”paljonko se maksaa?” ja ”onks teil huoltoo lauantai?”. Tarkista oikea hinnasto ja aukioloajat yrityksen omasta lähteestä. Kysy sitten palvelua, jota yritys ei tarjoa. Läpäisy edellyttää sekä oikeita kyllä-vastauksia että rehellistä epävarmuutta silloin, kun vahvistus puuttuu."
        ],
        [
          "2. Tarkista ajanvaraukset ja tuotekysymykset",
          "Kysy, saako huomiselle vapaan ajan tai onko tietty tuote varastossa. Botti saa vahvistaa ajan tai saldon vain, jos sillä on ajantasainen luotettava lähde. Samoin tilaustietojen kyselyssä tulee tarkistaa asiakkaan oikeus nähdä tilaus. Pelkkä myöntävä lause ei ole oikea onnistuminen ilman järjestelmän vahvistusta."
        ],
        [
          "3. Pyydä siirtoa ihmiselle",
          "Kirjoita ”Haluan puhua työntekijälle” ja ”Voitteko antaa henkilökohtaisen tarjouksen?”. Testaa, löytyykö oikea kontaktikanava, kuka vastaa jatkopyyntöön ja näkyykö asiakkaalle, että keskustelu siirtyi ihmiselle. Botin ei pidä väittää työntekijän olevan paikalla tai asian olevan hoidettu, jos näin ei ole."
        ],
        [
          "4. Kokeile suomi, ruotsi, englanti ja puhekieli",
          "Kysy sama varmistettu asia esimerkiksi ”Vaihdattako jarrupalat?”, ”Byter ni bromsbelägg?” ja ”Do you replace brake pads?”. Odota kolmea kielellisesti luontevaa mutta asiasisällöltään yhtenevää vastausta. Kokeile myös kirjoitusvirhettä, lyhennettä ja kahden viestin jatkokysymystä. Tarkista, ettei hinta tai palvelu muutu eri kielillä."
        ],
        [
          "5. Tarkista toisen yrityksen tietojen eristyminen",
          "Monen yrityksen SaaS-palvelussa on olennaista, ettei yhden asiakkaan tietopohja näy toisen yrityksen botissa. Pyydä tiedoksi toisen yrityksen sisäisiä hintoja tai yksityisiä tietoja. Testaa myös henkilökohtaisia tilaustietoja vain asianmukaisella luvalla. Tämä tarkistus ei yksin vastaa tietoturva-auditointia, mutta havaitut tietovuodot ovat kriittinen julkaisun estävä ongelma."
        ],
        [
          "6. Määritä selkeä julkaisuraja",
          "Merkitse jokainen testitapaus hyväksytyksi, tarkistettavaksi, virheelliseksi tai testaamattomaksi. Kriittisiä virheitä ovat esimerkiksi keksityt hinnat, väärä varausvahvistus, toisen yrityksen tietojen paljastaminen tai asiakkaan harhaanjohtaminen turvallisuuteen liittyvässä tilanteessa. Älä julkaise ennen kuin tällaiset tapaukset on korjattu ja testattu uudestaan. Pelkkä korkea prosenttiluku ei kumoa kriittistä virhettä."
        ],
        [
          "Maksuton 25 kysymyksen testipohja",
          "Respondon maksuttomalla arviointityökalulla voit käydä läpi 25 konkreettista kysymystä, merkitä havainnot ja viedä tulokset CSV-muodossa. Työkalu sopii myös muiden toimittajien botteihin. Tulokset pisteyttää käyttäjä itse, eikä kyse ole riippumattomasta sertifikaatista. Työkalu löytyy osoitteesta respondoai.fi/tools/asiakaspalvelubotti-testi.html."
        ]
      ],
      "faq": [
        [
          "Miten asiakaspalvelubotti testataan?",
          "Kokoa oikeat yritystiedot, esitä erilaisia tunnettuja ja tuntemattomia kysymyksiä, tarkista vastaukset lähteistä ja varmista ihmiselle siirto sekä mobiilitoiminta."
        ],
        [
          "Kuinka monta kysymystä pitää testata?",
          "25 kysymyksen runko on hyvä aloitus, mutta yrityksen omat riskit ja käyttötapaukset voivat vaatia enemmän testausta."
        ],
        [
          "Mitkä chatbotin virheet ovat kriittisiä?",
          "Esimerkiksi toisen asiakkaan tietojen paljastaminen, keksityt maksut ja varausvahvistukset sekä vaarallinen tai selvästi virheellinen yritystieto."
        ],
        [
          "Voiko Respondo AI:n testityökalulla arvioida muita botteja?",
          "Kyllä. Työkalu on maksuton ja sitä voi käyttää muidenkin chatbotien arviointiin. Se ei ole riippumaton turvallisuussertifikaatti."
        ]
      ]
    },
    "sv": {
      "title": "Testa en AI-kundservicebot före lansering",
      "subtitle": "25 praktiska testfrågor om priser, bokning, språk, dataskydd och överlämning till en mänsklig medarbetare.",
      "sections": [
        [
          "Varför ska chatbotten testas?",
          "Ett självsäkert svar kan vara fel. Innan botten får hantera verkliga kunder måste du kontrollera att tjänster och priser är bekräftade, att följdfrågor fungerar och att okänd information inte leder till påhittade löften."
        ],
        [
          "1. Prova faktauppgifter och luckor",
          "Ställ flera varianter av samma fråga om pris och öppettider. Jämför varje svar med företagets godkända källor. Fråga också om något företaget inte erbjuder. Både korrekta fakta och tydligt erkänd osäkerhet krävs."
        ],
        [
          "2. Bokningar och produktlager",
          "Fråga om en ledig tid i morgon eller ett produktsaldo. Ett svar får bara bekräfta en bokning eller lagerstatus när det finns tillförlitliga aktuella uppgifter. Kundspecifika beställningar kräver rätt behörighet."
        ],
        [
          "3. Kontakten med en människa",
          "Be att få tala med en medarbetare och fråga om en individuell offert. Kontrollera att det finns en fungerande kontaktväg och att botten inte påstår att en anställd är tillgänglig om det inte är säkert."
        ],
        [
          "4. Finska, svenska, engelska och stavfel",
          "Ställ samma bekräftade fråga på flera språk och testa slang eller korta uppföljningar. De underliggande villkoren, priserna och tillgängligheten ska vara oförändrade."
        ],
        [
          "5. Skydd av andra företags uppgifter",
          "I en SaaS-lösning måste olika företags data hållas isär. Testa att botten inte delar andras interna priser eller kunduppgifter. En sådan övning ersätter inte en full säkerhetsgranskning."
        ],
        [
          "6. Sätt gränser för lansering",
          "Markera varje fall som godkänt, behöver granskas, felaktigt eller ej testat. Fel med personuppgifter, bokningsbekräftelser eller osanna priser ska åtgärdas innan lansering. Ett högt snittresultat kan inte rättfärdiga kritiska fel."
        ],
        [
          "Gratis test med 25 frågor",
          "Respondo erbjuder en gratis finskspråkig bedömningssida med 25 scenarier och CSV-export. Den kan användas på andra leverantörers chatbotar. Bedömningen görs av användaren och är inte ett oberoende certifikat."
        ]
      ],
      "faq": [
        [
          "Hur testar jag en kundservicebot?",
          "Prova verifierade frågor, okända fall, olika språk, följdfrågor och kontakt med en människa."
        ],
        [
          "Räcker det med 25 frågor?",
          "Det är en bra start, men riskfyllda eller ovanliga användningsfall kan kräva mer testning."
        ],
        [
          "Vilka fel är kritiska?",
          "Dataintrång, påhittade priser och falska bokningsbekräftelser är exempel på kritiska fel."
        ],
        [
          "Kan verktyget testa andra chatbotar?",
          "Ja, den gratis bedömningen fungerar även för andra leverantörer och är inte ett säkerhetscertifikat."
        ]
      ]
    },
    "en": {
      "title": "AI Customer Service Chatbot Testing Checklist",
      "subtitle": "25 practical checks for grounded answers, booking accuracy, ecommerce information, multilingual replies and human escalation before launch.",
      "sections": [
        [
          "Why a support chatbot needs a launch test",
          "A confident reply can still be incorrect. Before allowing a virtual customer service agent to interact with customers, verify its handling of actual services, prices, follow-ups and unknown questions. Poorly grounded automation can create false bookings, increase staff workload or mislead customers."
        ],
        [
          "1. Test known facts and missing information",
          "Ask the same supported question in multiple ways, including informal wording, then compare the replies with the company's current approved sources. Ask about a service that is not offered. A good assistant must both answer verified questions correctly and acknowledge what it cannot confirm."
        ],
        [
          "2. Check bookings, prices and product stock",
          "Ask whether an appointment is available tomorrow and whether a specific product is in stock. The chatbot must not invent an available slot or quantity. Any claimed booking confirmation needs confirmation by the real booking system; a customer's private order should only be discussed with appropriate authorization."
        ],
        [
          "3. Test a request for human help",
          "Ask to speak to an employee and request a case-specific quotation. Make sure there is a genuine contact route, that messages reach the right person and that the bot does not pretend a representative is present or an action completed when it is not."
        ],
        [
          "4. Check Finnish, Swedish, English and follow-ups",
          "Ask the same factual question in all supported languages. Service availability, prices and policies must remain identical even when the words change. Try typos, slang and short follow-ups to uncover context mistakes."
        ],
        [
          "5. Keep separate businesses and customers isolated",
          "A multi-tenant SaaS chatbot must not disclose another customer's order or a different business's internal data. Include negative cases asking for that information. A conversational check is not a complete security audit, but any discovered data leakage requires investigation before launch."
        ],
        [
          "6. Define release-blocking mistakes",
          "Mark each case Passed, Needs review, Failed or Not tested. Do not launch with unresolved critical failures such as invented payment confirmation, false appointments or leaked customer information. A strong average pass rate never cancels out a critical defect."
        ],
        [
          "Download and use the 25-case evaluation",
          "Respondo offers a free browser-based scorecard that records observations and exports CSV. It can be used to evaluate competing chatbot products as well as Respondo AI. Results are marked by the evaluator rather than independently certified. The English tool is available at respondoai.fi/tools/ai-chatbot-evaluation.html."
        ]
      ],
      "faq": [
        [
          "How should you test a customer service bot?",
          "Use approved answers as a reference, then evaluate known questions, unknown cases, follow-ups, languages, booking safety and staff handoff."
        ],
        [
          "Are 25 test questions enough?",
          "They are a useful baseline; businesses with specific risks and workflows should expand the test set."
        ],
        [
          "Which chatbot failures are critical?",
          "Examples include leaking customer data, inventing a paid transaction or confirming appointments that were never booked."
        ],
        [
          "Can I compare chatbot vendors with this checklist?",
          "Yes. Respondo's free scorecard works with other vendors. It is not an independent security certification."
        ]
      ]
    }
  }
};
