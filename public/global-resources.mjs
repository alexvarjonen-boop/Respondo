import { SEO_SPECIALIST_GUIDES } from './seo-specialist-guides.mjs';
// Editorial guides shared by the browser and the server-rendered search fallback.
// No customer data, API access or marketing tracking is used in this module.
const guides = {
  '/guides/ai-customer-service-chatbot': {
    reading:'5',
    fi:{
      title:'Mikä on AI-asiakaspalvelubotti?',
      subtitle:'Käytännön opas yrityksille: mitä verkkosivujen AI-botti tekee, milloin se kannattaa ottaa käyttöön ja mitä sen ei pitäisi luvata.',
      sections:[
        ['Mitä AI-asiakaspalvelubotti tekee?','AI-asiakaspalvelubotti vastaa verkkosivun kävijän kysymyksiin luonnollisella kielellä. Yritys määrittää botille tietolähteet: esimerkiksi palvelut, hinnat, toimitusehdot, palautukset ja yhteystiedot. Hyvä botti etsii vastauksen hyväksytyistä yritystiedoista eikä keksi puuttuvaa hintaa tai palvelua. Tämä erottaa yrityksen omiin tietoihin perustuvan botin yleisestä keskustelutyökalusta.'],
        ['Missä yritys hyötyy siitä eniten?','Tyypillisiä tilanteita ovat verkkokaupan tuote- ja palautuskysymykset, huoltoyrityksen palvelu- ja ajanvarauskysymykset sekä LVI-yrityksen toimialue- ja tarjouspyynnöt. Näissä asiakas haluaa vastauksen silloin, kun työntekijä ei ehkä ehdi vastata. Botti voi auttaa löytämään vastauksen tai kerätä yhteydenottopyynnön ilman, että asiakasta pakotetaan etsimään sähköpostiosoitetta.'],
        ['Mitä botin pitää tehdä, kun tieto puuttuu?','Tärkeintä on epävarmuuden hallinta. Jos yritys ei ole vahvistanut huoltohintaa tai palvelun saatavuutta, botin kuuluu kertoa ettei se voi vahvistaa asiaa, ja tarjota yhteydenottoa työntekijään. Erityisesti teknisissä, turvallisuuteen liittyvissä ja hinnoittelua koskevissa kysymyksissä arvailu voi vahingoittaa asiakaskokemusta.'],
        ['Näin aloitat järkevästi','Kerää ensin 20 yleisintä kysymystä ja niiden oikeat vastaukset. Lisää yrityksen palvelut ja yhteystiedot, kokeile kysymysten eri sanamuotoja ja tarkista, miten botti käyttäytyy tuntemattomassa tilanteessa. Mittaa asiakkailta tulleita keskusteluja, onnistuneita vastauksia ja ihmisen käsittelyyn siirtyneitä tapauksia ennen kuin laajennat tietopohjaa.']
      ],
      faq:[
        ['Korvaako AI-botti asiakaspalvelijan?','Ei välttämättä. Se voi hoitaa toistuvia kysymyksiä, mutta epäselvät ja henkilökohtaista arviota vaativat tilanteet kannattaa siirtää ihmiselle.'],
        ['Voiko botti vastata yrityksen omilla hinnoilla?','Kyllä, kun yritys on antanut hyväksytyt hinnat tai niiden laskentaperusteet. Puuttuvia hintoja ei pidä arvata.'],
        ['Mihin toimialoihin ratkaisu sopii?','Esimerkiksi verkkokauppoihin, autokorjaamoihin ja LVI-yrityksiin sekä muihin verkkosivuilla asiakaskysymyksiä vastaanottaviin yrityksiin.']
      ]},
    sv:{
      title:'Vad är en AI-kundservicebot?',
      subtitle:'En praktisk guide för företag: hur en AI-bot på webbplatsen fungerar, när den är användbar och hur man undviker gissningar.',
      sections:[
        ['Vad gör en AI-kundservicebot?','En AI-kundservicebot svarar på webbplatsbesökarens frågor med naturligt språk. Företaget bestämmer vilka källor som används, exempelvis tjänster, priser, leverans- och returvillkor samt kontaktuppgifter. En pålitlig bot söker svar i företagets godkända information och hittar inte på priser eller tjänster som saknas i underlaget.'],
        ['När är den till nytta?','Vanliga situationer är produkt- och returfrågor i webbutiker, frågor om service och tidsbokning på en bilverkstads webbplats eller frågor om serviceområden och offerter hos ett VVS-företag. Kunder vill ofta ha ett svar när medarbetarna är upptagna. Botten kan då hjälpa till eller samla kontaktuppgifter för uppföljning.'],
        ['Vad händer när svaret saknas?','En bra bot är tydlig med osäkerhet. Om en tjänst, ett pris eller tillgänglighet inte har bekräftats ska botten inte gissa. Den bör hänvisa till en medarbetare eller ta emot en kontaktförfrågan. Det är särskilt viktigt för tekniska frågor, säkerhet och kostnadsuppskattningar.'],
        ['Så kommer du i gång','Börja med 20 vanliga kundfrågor och korrekta svar. Lägg till tjänster och kontaktuppgifter, testa olika sätt att ställa samma fråga och kontrollera hur botten svarar när information saknas. Följ upp samtal, användbara svar och ärenden som lämnas vidare till personalen.']
      ],
      faq:[
        ['Ersätter AI-botten en kundservicemedarbetare?','Inte nödvändigtvis. Den kan hantera återkommande frågor men svårare ärenden bör kunna lämnas över till en person.'],
        ['Kan botten använda företagets egna priser?','Ja, när företaget har angett priser eller tydliga prisregler. Saknade priser ska inte hittas på.'],
        ['Vilka företag kan använda botten?','Till exempel webbutiker, bilverkstäder, VVS-företag och andra verksamheter som får kundfrågor via webbplatsen.']
      ]},
    en:{
      title:'What Is an AI Customer Service Chatbot?',
      subtitle:'A practical guide for small businesses: what website AI chatbots do, when they help, and how to avoid unreliable answers.',
      sections:[
        ['What does an AI customer service chatbot actually do?','A website AI customer service chatbot answers visitors in natural language. Instead of relying on a generic script, it can use information approved by the business: services, published prices, delivery and return policies, operating hours, and contact details. The important distinction is the source of its answers. A business chatbot should use relevant company knowledge rather than inventing facts that sound plausible. It can guide a visitor to the next action, but it should not claim a service or price that the company has not confirmed.'],
        ['Where does a website chatbot provide the most value?','The most useful conversations are often repetitive and time-sensitive. Shoppers ask which product fits their needs, whether an item can be returned, or what delivery costs. Auto repair customers ask whether a workshop replaces brake pads or accepts booking requests. Plumbing and HVAC customers ask about service regions, available work, and how to request a quote. These questions matter even when employees are helping other customers. A well-configured bot can answer known questions and collect an enquiry when a person needs to follow up.'],
        ['What should happen when the answer is unknown?','Uncertainty is a product feature, not a failure to hide. If the knowledge base does not contain a verified repair price or confirm emergency availability, the chatbot should say so. It can offer a contact form or a human handoff instead. This is particularly important with technical advice, regulated topics, availability, and costs. A confident but incorrect answer can create more work than a missed message.'],
        ['A sensible first implementation','Start with the 20 questions your business hears most often. Write a clear answer for each, add your actual services and contact details, and test multiple phrasings of the same question. Include tests the bot should refuse to guess, such as unavailable prices or unsupported services. Monitor the conversations that helped customers, the enquiries generated, and the cases handed to employees. Expand the knowledge base from real customer needs rather than trying to predict every possible question at launch.']
      ],
      faq:[
        ['Does a chatbot replace human customer support?','Not necessarily. It can handle routine questions while employees remain available for unusual or sensitive cases.'],
        ['Can it give product or service prices?','Yes, if the company has supplied the correct prices or clear pricing rules. It should not invent missing prices.'],
        ['Is it only for online stores?','No. Repair shops, plumbing and HVAC companies, appointment-based businesses, and many other service providers may benefit.']
      ]}
  },
  '/guides/website-chatbot-knowledge-base':{
    reading:'6',
    fi:{
      title:'Näin rakennat chatbotille luotettavan tietopohjan',
      subtitle:'Käytännön muistilista yrityksen verkkosivun asiakaspalvelubotin käyttöönottoon ja vastausten laadun varmistamiseen.',
      sections:[
        ['Aloita asiakkaan kysymyksestä','Tietopohja ei ole vain kopio yrityksen etusivusta. Kerää asiakaspalvelun sähköpostit ja yleiset kysymykset, ja laadi niihin lyhyet, selkeät vastaukset. Muotoile tieto niin, että jokaisella palvelulla on nimi, tärkeimmät ehdot sekä tarvittaessa yhteydenottotapa.'],
        ['Tuo tuotteet ja palvelut hallitusti','Verkkosivun tuonti voi nopeuttaa työtä, mutta sisältö pitää tarkistaa. Poista vanhentuneet hinnat, erota tuotehuolto itse tuotteista ja tarkista toimitus- ja palautusehdot. Eri yritysten tietoja ei koskaan pidä sekoittaa toisiinsa.'],
        ['Testaa myös epäselvät tilanteet','Kysy botilta kysymyksiä, joihin tietopohjassa ei ole vastausta. Osaako se pyytää tarkennusta tai ohjata ihmiseen? Testaa myös yleiset puhekieliset muodot, eri kielet ja jatkokysymykset kuten ”Paljonko se maksaa?”.'],
        ['Pidä tieto ajan tasalla','Nimeä yrityksestä vastuuhenkilö, joka päivittää poikkeusaukioloajat, hinnat ja palvelualueet. Käy läpi asiakaskeskustelut säännöllisesti ja korjaa vastaukset, jotka aiheuttavat turhaa yhteydenottoa.']
      ],
      faq:[
        ['Kannattaako tuoda koko verkkosivu?','Verkkosivutietojen tuonti voi auttaa, mutta tärkeät vastaukset ja hinnat täytyy silti tarkistaa.'],
        ['Mitä tehdä, jos tietopohjassa ei ole vastausta?','Botti voi pyytää tarkennusta tai ohjata asiakkaan työntekijälle. Vastauksen keksiminen ei ole suositeltavaa.'],
        ['Kuinka usein tietopohjaa päivitetään?','Aina, kun hinnat, aukioloajat, palveluvalikoima tai yhteystiedot muuttuvat.']
      ]},
    sv:{
      title:'Så bygger du en pålitlig kunskapsbas för en chatbot',
      subtitle:'En praktisk checklista för att lansera en webbplatsbot och hålla kundsvaren korrekta.',
      sections:[
        ['Utgå från kundens frågor','En kunskapsbas är mer än en kopia av startsidan. Samla vanliga frågor från kundservice och skriv korta, tydliga svar. Beskriv varje tjänst med namn, villkor och en kontaktväg när kunden behöver mer hjälp.'],
        ['Importera produkter och tjänster med kontroll','Information från webbplatsen kan spara tid, men måste granskas. Ta bort gamla priser, skilj produktförsäljning från installationstjänster och kontrollera leverans- och returvillkor. Uppgifter från olika företag får aldrig blandas.'],
        ['Testa även osäkra fall','Ställ frågor där svaret saknas. Ber botten om förtydligande eller hänvisar den till en människa? Testa också vardagliga formuleringar, olika språk och följdfrågor som ”Vad kostar det?”.'],
        ['Håll kunskapen aktuell','Utse någon som ansvarar för att uppdatera öppettider, priser och serviceområden. Gå igenom samtalen regelbundet och rätta felaktiga eller otydliga svar.']
      ],
      faq:[
        ['Är det bra att importera hela webbplatsen?','Import kan vara en bra start, men viktiga svar och prisuppgifter behöver kontrolleras.'],
        ['Om kunskapsbasen saknar svar?','Botten bör kunna fråga vidare eller hänvisa till en medarbetare i stället för att gissa.'],
        ['Hur ofta ska informationen uppdateras?','När priser, öppettider, tjänster eller kontaktuppgifter förändras.']
      ]},
    en:{
      title:'How to Build a Reliable Knowledge Base for Your Website Chatbot',
      subtitle:'A practical implementation checklist for accurate AI customer support answers, including testing, escalation, and ongoing updates.',
      sections:[
        ['Start with real customer questions','A useful knowledge base is not simply a copy of your homepage. Begin with the actual questions your support team receives: what a service includes, how much it costs, whether a product is available, what the delivery conditions are, and how to contact a person. Write one clear answer for each topic. Add examples of different phrases customers use. This creates a stronger starting point than feeding a chatbot a large set of unrelated marketing paragraphs.'],
        ['Import your website information carefully','A website import can help collect product descriptions, service lists, hours, delivery details and return policies. Imported material still needs review. Remove expired promotions and outdated prices, distinguish products from installation services, and verify contact details. An online store selling an automotive part is not automatically a repair shop that fits it. Customer-specific information must stay isolated: answers for one company must never be sourced from another company’s knowledge base.'],
        ['Make the chatbot prove that it can say “I don’t know”','Before publishing, test questions that have no verified answer. Ask for a price you have not supplied, a service you do not offer, and an emergency response time not listed on your website. The bot should request clarification, explain the limitation, or route the question to a person. Then test follow-up questions: “What about the cheaper option?” or “How long does that take?” Finally, test the languages your customers actually use instead of assuming a translated interface guarantees accurate translated answers.'],
        ['Keep knowledge and responsibilities current','Assign an owner to the information: pricing, service areas, seasonal hours, delivery policies and business contact details will change. Review conversations that needed escalation and correct confusing answers. Monitor whether the bot reduces repeated questions and sends visitors to the right next step, rather than counting chat volume alone. The goal is a trustworthy customer experience, not the maximum number of automated replies.']
      ],
      faq:[
        ['Can I simply import my entire website?','It can be a useful starting point, but the important service, price, delivery and contact details still need human verification.'],
        ['What if my business data cannot answer a question?','The chatbot should acknowledge uncertainty, request clarification, or refer the customer to a person instead of fabricating an answer.'],
        ['How often should a chatbot knowledge base be updated?','Whenever services, prices, hours, policies or contact details change, with regular checks based on real customer conversations.']
      ]}
  },
  '/guides/multilingual-customer-support-chatbot': {
  "reading": "7",
  "fi": {
    "title": "Monikielinen asiakaspalvelubotti: 8 käytännön testiä",
    "subtitle": "Testaa suomen-, ruotsin- ja englanninkielistä verkkosivubottia oikeilla asiakaskysymyksillä ennen käyttöönottoa.",
    "sections": [
      [
        "1. Kysymyksen kieli vastaan sivuston kieli",
        "Jätä verkkosivu suomeksi ja kirjoita asiakkaan kysymys ruotsiksi tai englanniksi. Botin pitää käsitellä asiakkaan todellinen kysymys, ei vain kopioida suomenkielistä vakiovastausta. Tarkista erikseen valikoiden kieli, viestin tunnistettu kieli ja lopullisen vastauksen kieli."
      ],
      [
        "2. Sama palvelu kolmella kielellä",
        "Kysy autokorjaamolta ”Vaihdatteko jarrupalat?”, ”Byter ni bromsbelägg?” ja ”Do you replace brake pads?”. Vastauksen sisältö pitää pysyä samana. Jos korjaamo ei ole vahvistanut palvelua, botti ei saa keksiä myöntävää vastausta millään kielellä."
      ],
      [
        "3. Yksi luotettava tietopohja",
        "Palvelut, hinnat ja aukioloajat eivät saa muuttua käännöksessä. Jos yritys ilmoittaa renkaanvaihdon hinnaksi 40 euroa, ruotsinkielisessä vastauksessa tulee olla sama hinta. Pelkkä rengaspalvelu ei myöskään tarkoita, että korjaamo tarjoaa rengashotellia."
      ],
      [
        "4. Jatkokysymykset ja kielenvaihto",
        "Kysy ”Paljonko huolto maksaa?” ja jatka ”And how long does it take?”. Botin pitäisi säilyttää palvelun asiayhteys, mutta työn kestoa ei saa arvata, ellei yritys ole antanut sitä. Testaa myös lyhyet kysymykset ”Entä huomenna?” ja ”What about Friday?”."
      ],
      [
        "5. Verkkokaupan maakohtaiset ehdot",
        "Kysy toimituskulut Suomeen ja sitten Ruotsiin. Kotimaan maksuton toimitus ei tarkoita automaattisesti maksutonta toimitusta ulkomaille. Testaa palautusajat, toimitusrajoitukset ja tilausten kyselyt niin, ettei asiakas saa toisen henkilön tilaustietoja."
      ],
      [
        "6. Kirjoitusvirheet ja lyhenteet",
        "Kokeile muotoja ”paljo maksaa”, ”byt däck?” ja ”can u book huolto?”. Botin kannattaa tunnistaa yleiset sanamuodot tai pyytää tarkennusta. Virheellinen varma hintatieto on pahempi kuin yksi selventävä kysymys."
      ],
      [
        "7. Ihmiselle siirto ja yritysten eristäminen",
        "Kun vahvistettua vastausta ei löydy, botti voi kerätä yhteydenottopyynnön ja siirtää asian ammattilaiselle. Tarkista lisäksi, ettei kahden eri yrityksen tuotteita, hintoja tai yhteystietoja sekoiteta toisiinsa edes vanhan keskustelun jatkokysymyksissä."
      ],
      [
        "8. Tee vertailutaulukko",
        "Kirjaa jokaiselle testille kieli, kysymys, yrityksen vahvistettu tieto, odotettu tulos, botin vastaus ja arvio: oikein, vaatii tarkennusta tai virheellinen. Korjaa ensin keksityt hinnat, väärät palvelut, toimimattomat linkit ja epäonnistuneet ihmiselle siirrot. Testaa uudelleen ennen julkaisua."
      ]
    ],
    "faq": [
      [
        "Pitääkö vastaukset kirjoittaa kaikilla kielillä?",
        "Ei aina. Yrityksen yksi hyväksytty tietopohja voi toimia usean kielen pohjana, mutta käännökset ja ammattisanasto pitää testata."
      ],
      [
        "Voiko botti vastata ruotsiksi suomenkielisellä sivulla?",
        "Se riippuu käytetyn tuotteen kielentunnistuksesta ja asetuksista. Testaa juuri tämä tilanne ennen käyttöönottoa."
      ],
      [
        "Voiko Respondoa ostaa ulkomailla?",
        "Respondo AI:n maksulliset yritystilaukset ovat tällä hetkellä saatavilla vain suomalaisille yrityksille."
      ]
    ]
  },
  "sv": {
    "title": "Flerspråkig kundservicebot: 8 praktiska tester",
    "subtitle": "Så testar du en webbplatsbot på finska, svenska och engelska med riktiga kundfrågor före lansering.",
    "sections": [
      [
        "1. Frågans språk och webbplatsens språk",
        "Låt webbplatsen vara på finska men ställ en fråga på svenska eller engelska. Botten ska förstå kundens fråga i stället för att återge ett finskt standardsvar. Kontrollera gränssnitt, språkidentifiering och svar separat."
      ],
      [
        "2. Samma tjänst på tre språk",
        "Fråga ”Vaihdatteko jarrupalat?”, ”Byter ni bromsbelägg?” och ”Do you replace brake pads?”. Innehållet bör vara likvärdigt. Om verkstaden inte har bekräftat tjänsten får botten inte hitta på ett positivt svar på något språk."
      ],
      [
        "3. En tillförlitlig kunskapsbas",
        "Tjänster, priser och öppettider får inte ändras genom översättningen. Om företaget anger ett pris för däckbyte ska samma pris gälla på svenska och engelska. Däckservice innebär inte automatiskt däckhotell."
      ],
      [
        "4. Följdfrågor och språkbyte",
        "Fråga först ”Vad kostar servicen?” och därefter ”And how long does it take?”. Botten bör minnas vilken tjänst som avses men får inte gissa hur lång tid arbetet tar. Testa även korta frågor om lediga tider utan en verifierad kalender."
      ],
      [
        "5. Leveransvillkor för olika länder",
        "Fråga om frakt till Finland och sedan till Sverige. Gratis inrikesleverans innebär inte nödvändigtvis gratis frakt utomlands. Kontrollera även returtider, leveransvillkor och att ingen annan kunds orderuppgifter visas."
      ],
      [
        "6. Stavfel och förkortningar",
        "Använd exempel som ”byt däck?”, ”paljo maksaa” och ”can u book huolto?”. Botten bör tolka vardagligt språk eller be om förtydligande. Ett klart besked om osäkerhet är bättre än ett påhittat pris."
      ],
      [
        "7. Överlämning och företagsisolering",
        "Om svaret saknas ska kunden kunna lämna en förfrågan eller få mänsklig hjälp. Testa också att två olika företags produkter och kontaktuppgifter aldrig blandas ihop, inte ens i följdfrågor."
      ],
      [
        "8. Bedöm svaren systematiskt",
        "Skriv upp språk, fråga, bekräftat underlag, förväntat svar, faktiskt svar och bedömning. Prioritera felaktiga tjänstelöften, prisuppgifter, länkar och misslyckad överlämning. Testa sedan på nytt."
      ]
    ],
    "faq": [
      [
        "Måste alla svar skrivas på varje språk?",
        "Inte alltid. En gemensam godkänd kunskapsbas kan användas, men företagets termer och priser måste kontrolleras."
      ],
      [
        "Kan botten svara på svenska på en finsk webbplats?",
        "Det beror på produktens språkidentifiering och inställningar. Testa detta uttryckligen."
      ],
      [
        "Kan utländska företag köpa Respondo?",
        "Betalda företagsabonnemang är för närvarande bara tillgängliga för finska företag."
      ]
    ]
  },
  "en": {
    "title": "Multilingual Customer Support Chatbot: 8 Practical Tests",
    "subtitle": "A hands-on evaluation guide to English, Finnish and Swedish website chatbots: grounded answers, context, safe handoff and data isolation.",
    "sections": [
      [
        "1. Question language versus website language",
        "Leave the website interface in Finnish, then ask a question in English or Swedish. A multilingual assistant should address the actual question rather than repeating a canned Finnish answer. Evaluate language detection, the displayed interface and the final response separately."
      ],
      [
        "2. Ask the same service question three ways",
        "Try “Vaihdatteko jarrupalat?”, “Byter ni bromsbelägg?” and “Do you replace brake pads?”. If the auto shop offers that service, the factual answer should agree across all three languages. If the service is unconfirmed, the bot should admit uncertainty instead of inventing a yes."
      ],
      [
        "3. Keep one approved source of truth",
        "Prices, opening hours and service boundaries must survive translation. If the business supplies a tyre-change price, its Swedish and English responses must preserve the amount and conditions. Offering tyre replacement does not prove that the garage also offers tyre storage."
      ],
      [
        "4. Preserve context across follow-up questions",
        "Ask “How much is a service?” followed by “Entä kauanko se kestää?”. The bot should understand the same service is being discussed, but must not invent its duration when only the price is documented. Try short availability follow-ups without connecting a real calendar."
      ],
      [
        "5. Test country-specific ecommerce policies",
        "Ask an online store for shipping to Finland and then to Sweden. Free domestic shipping does not imply free international shipping. Check delivery restrictions and returns, and ensure a visitor never sees another customer's order or tracking details."
      ],
      [
        "6. Include typos, abbreviations and mixed languages",
        "Real customers write “can u book huolto?”, “byt däck?” or “paljo maksaa”. A useful bot can understand common wording or request clarification. A confident but unsupported price or appointment is worse than asking one sensible follow-up."
      ],
      [
        "7. Validate handoff and customer-data separation",
        "Ask for an unlisted repair price and check that the bot offers a contact request or a human rather than guessing. For multi-business platforms, run similar questions for two different companies; neither a new chat nor an older follow-up may expose the other company's products or contact details."
      ],
      [
        "8. Build a repeatable scorecard",
        "Record the question, language, approved source fact, expected answer, actual response and one outcome: correct, clarification needed or incorrect. Fix invented prices, unsupported services, broken links and failed human handoffs first. Rerun the cases after each significant knowledge-base update."
      ]
    ],
    "faq": [
      [
        "Does every answer need to be translated in advance?",
        "Not always. An approved knowledge base can support several languages, but business terminology, conditions and prices must be tested."
      ],
      [
        "Can it answer in English on a Finnish website?",
        "That depends on the product's language detection and configuration. Make this a deliberate test case."
      ],
      [
        "Can businesses outside Finland buy Respondo AI?",
        "Respondo AI's paid business subscriptions are currently available only to Finnish companies."
      ]
    ]
  }
},
  "/guides/ai-chatbot-vs-live-chat": {
    "reading": "7",
    "fi": {
      "title": "AI-chatbot, livechat vai yhteydenottolomake? Vertailu yritykselle",
      "subtitle": "Mitä eroa on automaattisella botilla, ihmisen livechatilla ja tavallisella yhteydenottolomakkeella? Vertaa käytännön tilanteita ennen valintaa.",
      "sections": [
        [
          "Kolme kanavaa, kolme erilaista tehtävää",
          "Yhteydenottolomake välittää viestin työntekijälle myöhempää vastausta varten. Livechat tarjoaa ihmisen vastauksen silloin, kun henkilöstöä on paikalla. AI-chatbot voi hoitaa toistuvia, yrityksen hyväksyttyihin tietoihin perustuvia kysymyksiä myös työajan jälkeen. Kanavia ei tarvitse valita vain yhtä: monessa yrityksessä toimiva ratkaisu on yhdistelmä, jossa asiakas pääsee tarvittaessa aina ihmisen luo."
        ],
        [
          "Yhteydenottolomake toimii yksilöllisissä tapauksissa",
          "Lomake sopii erityisesti tarjouksiin, joita ei voi laskea ilman kohteen tietoja, sekä harvinaisiin ja tapauskohtaisiin pyyntöihin. Se on helppo ylläpitää ja voi kerätä oikeat lisätiedot, esimerkiksi työn sijainnin ja kuvauksen. Asiakas ei kuitenkaan saa heti vastausta vaikkapa aukioloajoista tai toimitustavoista. Kerro siksi selvästi, milloin vastaatte, ja pidä lomake löydettävissä, vaikka ottaisitte käyttöön botin."
        ],
        [
          "Livechat sopii monimutkaiseen palveluun",
          "Ihmisen livechat on hyvä reklamaatioissa, asiakaskohtaisissa poikkeuksissa ja tilanteissa, joissa asiakkaan asian ratkaiseminen vaatii harkintaa. Haittana on henkilöstön tarve: jos chat lupaa vastausta heti mutta kukaan ei ole tavoitettavissa, pettymys voi olla suurempi kuin hyvin toteutetussa yhteydenottolomakkeessa. Ilmoita oikeat palveluajat ja tarjoa viestin jättämistä myös silloin, kun livechat on suljettu."
        ],
        [
          "AI-chatbotin tehtävä on vastata oikeilla tiedoilla",
          "Botti toimii parhaiten tuotteiden, palvelujen, hinnastojen, toimitusehtojen, palautusten ja usein kysyttyjen kysymysten yhteydessä. Autokorjaamo voi esimerkiksi kertoa, kuuluuko renkaiden vaihto palveluihin, ja verkkokauppa voi näyttää palautusehdot. Jos korjauksen hinta tai vapaa aika ei ole tiedossa, botin ei pidä keksiä vastausta. Sen tulee kertoa epävarmuudesta ja ohjata yhteydenottoon. Tietopohjaa täytyy päivittää, kun yrityksen tiedot muuttuvat."
        ],
        [
          "Vertaa kustannuksia mitattujen lukujen avulla",
          "Laske kuukauden aikana tulleet toistuvat kysymykset sekä keskimääräinen vastaamiseen kulunut aika. Esimerkki: 120 kysymystä kertaa 3 minuuttia on yhteensä 6 tuntia. Jos botti vastaa oikein puoleen ilman työntekijää, säästö on teoriassa enintään 3 tuntia ennen ylläpitoa, tarkistuksia ja palvelun hintaa. Kyse on havainnollistuksesta, ei taatusta tuloksesta. Seuraa erikseen onnistuneita vastauksia ja niitä tapauksia, joihin työntekijä joutui palaamaan."
        ],
        [
          "Tee päätös näin",
          "Kirjaa 20 todellista asiakaskysymystä, niiden vahvistetut vastaukset ja se, tarvitseeko ihminen osallistua. Testaa ne kaikissa käyttöön otettavissa kielissä. Vertaa lomakkeen, livechatin ja botin kykyä vastata tai ohjata kysymys turvallisesti. Arvioi myös ylläpito, yhteydenottojen laatu ja palvelun saatavuus. Respondo AI:n maksulliset tilaukset ovat tällä hetkellä saatavilla vain suomalaisille yrityksille."
        ]
      ],
      "faq": [
        [
          "Korvaako AI-chatbot työntekijän?",
          "Ei kaikissa tilanteissa. Epäselvät, henkilökohtaiset ja vaativat asiakasasiat kannattaa ohjata ihmiselle."
        ],
        [
          "Onko AI aina edullisempi kuin livechat?",
          "Ei. Vertaa henkilöstö-, ohjelmisto-, ylläpito- ja laadunvarmistuskustannuksia todellisilla kysymysmäärillä."
        ],
        [
          "Voiko AI ilmoittaa hinnan?",
          "Voi, jos yritys on vahvistanut hinnan tai hinnoittelusäännön tietopohjaan. Muussa tapauksessa kannattaa ohjata tarjouspyyntöön."
        ],
        [
          "Mikä on hyvä ensimmäinen testi?",
          "Kysy sama asia eri sanamuodoilla ja selvitä, kertooko botti rehellisesti, kun vahvistettua tietoa ei löydy."
        ]
      ]
    },
    "sv": {
      "title": "AI-chatbot, livechatt eller kontaktformulär? En företagsguide",
      "subtitle": "Jämför svarstid, bemanning, kvalitet och kostnader innan du väljer kundservice på webbplatsen.",
      "sections": [
        [
          "Tre kanaler löser olika uppgifter",
          "Ett kontaktformulär samlar frågor som besvaras senare. Livechatt ger svar från en person när personal finns på plats. En AI-chatbot kan besvara återkommande frågor med företagets egna godkända uppgifter, även utanför öppettiderna. Ofta fungerar en kombination bäst: enkla frågor besvaras direkt och svåra ärenden går vidare till en människa."
        ],
        [
          "När räcker ett kontaktformulär?",
          "Ett formulär passar individuella offerter och ovanliga frågor som kräver mer information. Det är lätt att sköta och kan samla relevanta detaljer. Däremot får kunden normalt vänta även på enkla svar om till exempel öppettider eller leveransvillkor. Ange en realistisk svarstid och håll formuläret synligt också när webbplatsen använder AI."
        ],
        [
          "När behövs livechatt med personal?",
          "Livechatt är särskilt användbar vid klagomål, kundspecifika undantag och situationer som kräver omdöme. Kostnaden beror på bemanning och öppettider. Lova inte svar i realtid om ingen faktiskt kan svara. Erbjud en möjlighet att lämna ett meddelande när personalen inte är tillgänglig."
        ],
        [
          "När tillför AI-chatboten värde?",
          "AI kan besvara frågor om produkter, tjänster, priser, returer och bokningsrutiner utifrån verifierade företagsuppgifter. Den ska inte hitta på reparationspriser, lediga tider eller tekniska råd som inte har bekräftats. När information saknas ska kunden få en tydlig förklaring och möjlighet att kontakta en anställd. Kunskapsbasen måste hållas aktuell."
        ],
        [
          "Beräkna nyttan utan orealistiska löften",
          "Mät antalet återkommande frågor och tiden för att svara. Ett räkneexempel: 120 frågor som tar 3 minuter var innebär 6 timmars arbete. Om hälften kan lösas korrekt av en bot är den möjliga besparingen högst 3 timmar före underhåll, kontroll och abonnemangskostnader. Det är ingen prognos. Följ upp hur många frågor som verkligen löstes utan mänsklig efterbehandling."
        ],
        [
          "Gör ett jämförbart test",
          "Samla 20 riktiga kundfrågor, skriv ner korrekta svar och markera när en människa behövs. Kör samma frågor genom den valda lösningen och prova alla språk som kunderna använder. Jämför riktiga svar, eskalering och underhållsarbete. Respondo AI:s betalda abonnemang är för närvarande tillgängliga bara för företag i Finland."
        ]
      ],
      "faq": [
        [
          "Ersätter AI helt en kundservicemedarbetare?",
          "Nej. Komplicerade, känsliga eller personliga ärenden bör fortfarande kunna nå en människa."
        ],
        [
          "Är AI alltid billigare?",
          "Nej. Räkna på personal, licens, underhåll och hur många ärenden som faktiskt löses."
        ],
        [
          "Kan en chatbot svara på priser?",
          "Ja, om företaget har godkänt prisuppgiften eller prisregeln. Annars bör kunden kunna be om offert."
        ],
        [
          "Vad bör testas först?",
          "Ställ samma fråga på flera sätt och kontrollera att botten inte hittar på uppgifter när svaret saknas."
        ]
      ]
    },
    "en": {
      "title": "AI Chatbot vs Live Chat vs Contact Form: A Small Business Guide",
      "subtitle": "Compare immediate answers, real human coverage, customer experience and costs before choosing how visitors contact your business.",
      "sections": [
        [
          "Three channels serve different customer needs",
          "A contact form collects a question for later follow-up. Live chat provides a conversation with a person if staff are available. An AI chatbot may answer repetitive questions using company-approved information, including outside office hours. None is inherently superior in every situation. A good website can combine all three: instant answers for known facts, direct human support for difficult cases and a simple way to leave a request."
        ],
        [
          "When is a contact form the right option?",
          "A form works well for custom quotations, work requiring a site visit and rare questions that need an individual assessment. It is relatively simple to maintain and can collect the facts an employee will need. The drawback is waiting for an answer, even if the visitor only wants to know opening hours or return conditions. Publish a realistic response window and keep the form accessible instead of hiding it behind a chatbot."
        ],
        [
          "When does live chat outperform automation?",
          "Live chat is well suited to complaints, account-specific exceptions, emotionally difficult conversations and problems requiring judgement. A human can understand nuance and check information not available to a bot. But live chat requires real staffing. Advertising instant help while leaving visitors unanswered can be worse than offering an honest contact form. Make agent availability and offline fallback clear."
        ],
        [
          "Where does an AI chatbot actually help?",
          "AI chatbots are most useful when customers repeatedly ask about products, services, opening hours, prices, returns and booking procedures. A repair shop can answer whether it provides brake servicing; a store can explain its shipping policy. Automation should never invent an unconfirmed repair quote, available slot or safety instruction. When the approved source has no answer, acknowledge that and offer a human follow-up. Keep the knowledge base updated as policies change."
        ],
        [
          "Calculate potential savings without an inflated ROI claim",
          "Start with your monthly volume of repeat questions and average manual handling time. For illustration, 120 questions at three minutes each equal six hours of answering. If a well-tested bot correctly resolves half with no human follow-up, the theoretical saving is at most three hours before maintenance time, quality checks and subscription charges. This is an example, not a performance guarantee. Measure genuinely resolved requests rather than counting every chatbot conversation as a success."
        ],
        [
          "Make a decision with reproducible tests",
          "Collect 20 real customer questions and their verified answers. Mark where a person must take over. Test those cases in your actual languages, including a follow-up question and a case with missing pricing data. Compare answer accuracy, escalation, the quality of captured enquiries and monthly maintenance effort. For structured testing, use the free 25-question chatbot evaluation scorecard linked below. Respondo AI paid business plans are currently available only in Finland."
        ]
      ],
      "faq": [
        [
          "Can an AI chatbot replace live chat entirely?",
          "Not in every case. Complicated, personal and sensitive questions should still have access to a human."
        ],
        [
          "Is an AI chatbot automatically cheaper?",
          "No. Compare software fees, staffing, quality assurance, knowledge-base maintenance and real resolution rates."
        ],
        [
          "Can an AI chatbot give a price?",
          "Only when the price or rule is verified by the business. Otherwise, a request for a quote is safer."
        ],
        [
          "What should I test first?",
          "Ask the same question in several ways, then verify that the bot does not invent facts when the approved answer is missing."
        ]
      ]
    }
  },
  '/guides/ai-chatbot-pricing': {
    "reading": "7",
    "fi": {
      "title": "Paljonko AI-asiakaspalvelubotti maksaa yritykselle?",
      "subtitle": "Vertaa verkkosivun chatbotin kuukausihintaa, käyttöönottoa ja todellisia kustannuksia – sekä arvioi, milloin botti kannattaa.",
      "sections": [
        [
          "Mitä yrityksen AI-chatbot maksaa?",
          "AI-asiakaspalvelubotin hinta riippuu yleensä siitä, mitä se osaa tehdä, miten suuri sen tietopohja on, kuinka monta työntekijää palvelua käyttää ja millaisia integraatioita tarvitaan. Pelkkä halpa kuukausihinta ei kerro kokonaiskustannusta. Vertaile myös tietojen tuontia, käyttöönottoa, mahdollisia käyttörajoja, tukea ja työntekijöiden tekemää ylläpitoa. Pyydä selvitys siitä, veloitetaanko viesteistä, käyttäjistä tai erillisistä palveluista lisää."
        ],
        [
          "Respondo AI:n julkiset hinnat",
          "Respondo AI:n kuukausihinnat ovat Advanced 49 €/kk, Premium 129 €/kk ja Enterprise 149 €/kk. Vuositilaus maksaa Advanced 39 €/kk (468 €/vuosi), Premium 119 €/kk (1 428 €/vuosi) tai Enterprise 139 €/kk (1 668 €/vuosi). Säästö on 120 €/vuosi, ja koko vuosi maksetaan kerralla. Nykyisiin tilauksiin sisältyy kolmen päivän maksuton kokeilu. Tarkista lopullinen laskutettava summa ja saatavilla olevat ominaisuudet aina tilausnäkymästä ennen maksua. Maksulliset tilaukset ovat toistaiseksi vain suomalaisille yrityksille."
        ],
        [
          "Mitä pakettien välillä kannattaa vertailla?",
          "Aloita siitä, tarvitsetko vain omien kysymysten ja vastausten hallintaa vai myös verkkosivun tietojen tuontia, useampia työntekijätunnuksia ja laajempaa keskustelujen hallintaa. Tarkista myös, miten botti käyttää yrityksen vahvistamia tuote-, hinta-, aukioloaika- ja palvelutietoja sekä mitä tapahtuu, kun vastausta ei tiedetä. Varmista, että palvelu tukee niitä kieliä, joita asiakkaasi käyttävät. Tarkka pakettien ominaisuusvertailu löytyy Respondon hinnastosivulta."
        ],
        [
          "Mahdolliset lisäkustannukset",
          "Huomioi verkkosivulle asentamiseen käytetty aika, tietopohjan ensimmäinen tarkistus, poikkeusaukioloaikojen ja hintojen päivitys sekä henkilökunnan perehdytys. Joissakin palveluissa erilliset WhatsApp-, tekstiviesti-, puhelin-, CRM- tai muut ulkoiset integraatiot voivat maksaa lisää, eivätkä ne välttämättä sisälly verkkosivubotin tilaukseen. Älä oleta, että kolmannen osapuolen palvelu tai rajaton viestimäärä kuuluu hintaan ilman kirjallista vahvistusta."
        ],
        [
          "Laskuesimerkki: kuinka paljon aikaa voi säästyä?",
          "Kuvitellaan yritys, joka saa kuukaudessa 120 toistuvaa asiakaskysymystä. Niihin vastaaminen vie keskimäärin kolme minuuttia, eli työtä kertyy kuusi tuntia kuukaudessa. Jos botti ratkaisee puolet kysymyksistä oikein ilman ihmisen jatkokäsittelyä, teoreettinen säästö on kolme tuntia. Tämä ei ole tulosennuste. Vähennä hyötylaskelmasta ylläpitoon, tarkistukseen ja vaikeiden kysymysten käsittelyyn kuluva aika sekä ohjelmiston kustannus. Mittaa ratkaistuja asioita, älä pelkkiä lähetettyjä botin viestejä."
        ],
        [
          "Milloin chatbot ei välttämättä kannata?",
          "Jos yrityksen verkkosivulle tulee hyvin vähän kysymyksiä, hinnoittelu ja palvelut muuttuvat päivittäin tai lähes jokainen asia vaatii asiantuntijan tapauskohtaisen arvion, yksinkertainen yhteydenottolomake saattaa olla järkevämpi. Samoin botti on huono hankinta, jos kukaan ei pidä sen tietoja ajan tasalla. Aloita mittaamalla yleisimmät kysymykset ja kokeilemalla bottia omalla palvelu- ja hintatiedolla."
        ],
        [
          "Ostajan seitsemän tarkistuskysymystä",
          "Kysy toimittajalta: 1) Onko hinta kuukausittainen vai vuosittain laskutettu? 2) Sisältyykö verkkosivun tietojen tuonti? 3) Onko viesteille tai käyttäjille rajoituksia? 4) Mistä botin vastaukset tulevat? 5) Mitä se tekee, kun hintaa tai palvelua ei ole vahvistettu? 6) Voiko ihminen ottaa keskustelun haltuun? 7) Mitä tapahtuu tietojen ja laskutuksen kanssa, jos tilaus päättyy? Kokeile vastaukset todellisilla asiakaskysymyksillä ennen sitoutumista."
        ]
      ],
      "faq": [
        [
          "Paljonko Respondo AI maksaa kuukaudessa?",
          "Kuukausitilausten hinnat ovat Advanced 49 €, Premium 129 € ja Enterprise 149 €. Vuositilaus maksaa Advanced 39 €/kk (468 €/vuosi), Premium 119 €/kk (1 428 €/vuosi) tai Enterprise 139 €/kk (1 668 €/vuosi). Säästö on 120 €/vuosi, ja koko vuosi maksetaan kerralla."
        ],
        [
          "Voiko asiakaspalvelubottia kokeilla maksutta?",
          "Respondo AI:n nykyisiin paketteihin sisältyy kolmen päivän maksuton kokeilu. Tarkista kokeilun ja tilauksen ehdot tilausnäkymästä."
        ],
        [
          "Onko halvin chatbot aina paras?",
          "Ei. Oleellisinta on vastausten luotettavuus, sopiva tietopohja, oikeat jatkotoiminnot ja todellinen kokonaiskustannus."
        ],
        [
          "Saavatko ulkomaiset yritykset tilata Respondon?",
          "Maksulliset Respondo AI -yritystilaukset ovat tällä hetkellä saatavilla vain suomalaisille yrityksille."
        ]
      ]
    },
    "sv": {
      "title": "Vad kostar en AI-kundservicebot för företag?",
      "subtitle": "Jämför månadspris, installation och verkliga kostnader för en chatbot på webbplatsen – och bedöm om nyttan motiverar priset.",
      "sections": [
        [
          "Vad avgör priset för en AI-chatbot?",
          "Priset på en AI-kundservicebot beror på funktioner, hur företagets information hanteras, antal användare och eventuella integrationer. Ett lågt månadspris är inte samma sak som en låg totalkostnad. Jämför även import av webbplatsinnehåll, införande, användningsgränser, support och underhåll av kunskapsbasen. Kontrollera om meddelanden, anställdas konton eller externa tjänster faktureras separat."
        ],
        [
          "Respondo AI:s publicerade priser",
          "Respondo AI erbjuder Advanced för 49 €/månad, Premium för 129 €/månad och Enterprise för 149 €/månad. Årsabonnemang kostar Advanced 39 €/mån (468 €/år), Premium 119 €/mån (1 428 €/år) och Enterprise 139 €/mån (1 668 €/år). Du sparar 120 €/år och betalar årsvis. En gratis provperiod på tre dagar ingår i de aktuella paketen. Kontrollera alltid slutligt belopp och funktioner i beställningen. Betalda företagsabonnemang är för närvarande endast tillgängliga för företag i Finland."
        ],
        [
          "Vilka abonnemangsfunktioner är viktiga?",
          "Börja med att kontrollera om du bara behöver lägga in egna frågor och svar eller även vill importera information från webbplatsen och låta flera medarbetare hantera dialoger. En viktig kvalitetsfråga är om botten använder företagets bekräftade priser, tjänster och öppettider och kan avstå från att gissa när underlaget saknas. Testa språk som dina verkliga kunder använder. Den aktuella funktionsjämförelsen finns på Respondos prissida."
        ],
        [
          "Kostnader som lätt glöms bort",
          "Tid för installation, granskning av importerade uppgifter, uppdatering av prislistor och utbildning av personalen påverkar den totala investeringen. Vissa leverantörer tar separat betalt för WhatsApp, SMS, telefoni, CRM och andra externa integrationer. Sådana tjänster ingår inte automatiskt i en webbplatschatbot. Be om tydliga uppgifter om användningsgränser och kostnader innan du köper."
        ],
        [
          "Räkneexempel: möjlig tidsbesparing",
          "Anta att en verksamhet får 120 återkommande frågor varje månad och att ett manuellt svar tar tre minuter. Det motsvarar sex timmars arbete. Om botten kan lösa hälften korrekt utan mänsklig uppföljning blir den teoretiska besparingen tre timmar. Detta är ett exempel, inte en garanti. Dra av underhåll, kvalitetskontroller, licenskostnaden och tid för ärenden som fortfarande behöver en person. Räkna bara verkligt lösta frågor som sparad tid."
        ],
        [
          "När kanske en chatbot inte lönar sig?",
          "Om webbplatsen får få frågor, nästan alla ärenden kräver personlig bedömning eller uppgifterna ändras så ofta att ingen hinner kontrollera dem, kan ett kontaktformulär vara bättre. En bot med gamla priser kan skapa fler problem än den löser. Samla därför riktiga kundfrågor och pröva lösningen innan du köper en större plan."
        ],
        [
          "Sju frågor att ställa före köp",
          "Fråga: 1) Är priset månadsvis eller årsfakturerat? 2) Ingår webbplatsimport? 3) Finns begränsningar för meddelanden och personal? 4) Vilka källor styr svaren? 5) Vad händer vid okända priser eller tjänster? 6) Kan en anställd ta över? 7) Hur hanteras företagsuppgifter och fakturering när abonnemanget avslutas? Testa leverantören mot dina egna kundfrågor."
        ]
      ],
      "faq": [
        [
          "Vad kostar Respondo AI per månad?",
          "Advanced kostar 49 €, Premium 129 € och Enterprise 149 € per månad. Årsabonnemang kostar Advanced 39 €/mån (468 €/år), Premium 119 €/mån (1 428 €/år) och Enterprise 139 €/mån (1 668 €/år). Du sparar 120 €/år och betalar årsvis."
        ],
        [
          "Finns det en gratis provperiod?",
          "Respondo AI erbjuder för närvarande tre dagars gratis provperiod i sina paket. Kontrollera aktuella villkor vid beställningen."
        ],
        [
          "Är den billigaste chatboten alltid bäst?",
          "Nej. Tillförlitliga svar, rätt information, möjlighet till mänsklig hjälp och total ägandekostnad är viktigare än priset ensamt."
        ],
        [
          "Kan ett företag utanför Finland teckna abonnemang?",
          "Betalda abonnemang på Respondo AI erbjuds just nu bara företag i Finland."
        ]
      ]
    },
    "en": {
      "title": "How Much Does an AI Customer Service Chatbot Cost?",
      "subtitle": "A small-business buyer’s guide to website chatbot pricing, setup work, hidden costs and realistic return on investment.",
      "sections": [
        [
          "What determines the cost of a website AI chatbot?",
          "Website chatbot pricing depends on the features included, how business knowledge is managed, the number of employee accounts and the integrations required. A low monthly headline price is not necessarily a low total cost. Compare knowledge-base setup, website importing, message or usage limits, support, maintenance and human handoff. Ask each provider whether messages, employee seats or external services create additional charges. A chatbot that gives unreliable answers can also generate a real operational cost."
        ],
        [
          "Respondo AI monthly pricing",
          "Respondo AI currently offers Advanced at €49/month, Premium at €129/month and Enterprise at €149/month. Annual plans are Advanced €39/month (€468/year), Premium €119/month (€1,428/year) and Enterprise €139/month (€1,668/year), paid annually, saving €120/year. The current plans include a three-day free trial. Always review the actual checkout total, current plan features and terms before paying. Paid Respondo AI business subscriptions are presently available only to businesses in Finland."
        ],
        [
          "Compare plan capabilities rather than price alone",
          "Decide whether you need only manually maintained questions and answers or also controlled website-information importing, multiple employee accounts and more extensive customer-conversation workflows. Test whether the bot uses your approved service descriptions, prices, opening hours and policies instead of improvising. Language handling and the ability to route an uncertain conversation to a person are also worth testing. Respondo's current feature-by-feature package comparison is available on its pricing page."
        ],
        [
          "Allow for setup and ongoing maintenance",
          "Your total cost may include time spent installing the website widget, reviewing imported information, keeping prices and opening hours current and training staff. Across the industry, integrations such as WhatsApp, texting, telephony or a CRM can carry separate third-party fees; they should not be assumed to be included in a basic website chatbot subscription. Check the vendor's usage limits, cancellation conditions, data-export options and support before committing."
        ],
        [
          "A realistic savings calculation, not a guarantee",
          "Suppose a business receives 120 repetitive customer questions per month and an employee spends an average of three minutes answering each. That is six hours of work. If a chatbot correctly resolves half of those requests with no human follow-up, the theoretical time saving is three hours per month. This is an illustrative scenario, not a promised outcome. Subtract time spent maintaining the knowledge base, checking answers and handling escalations, as well as the subscription fee. Measure accurately resolved customer requests, not raw chatbot message volume."
        ],
        [
          "When might a chatbot not be worth it?",
          "If a website receives almost no customer questions, most enquiries require a complex specialist judgement, or service details change daily without anyone available to maintain the information, a clear contact form may be more appropriate. Incorrect automated pricing or appointment promises can create extra support work. Start with a small set of authentic FAQs and compare the experience with human support before selecting a paid plan."
        ],
        [
          "Seven questions to ask every chatbot vendor",
          "Ask: 1) Is the displayed price monthly, or a monthly equivalent billed annually? 2) Can the product import and verify website information? 3) Are messages or seats limited? 4) What approved sources underpin each answer? 5) What happens when prices or services cannot be verified? 6) Can a human take over? 7) What happens to your company data and billing when you cancel? Run the same real customer questions against every shortlisted option, including unknown-price and follow-up scenarios."
        ]
      ],
      "faq": [
        [
          "How much does Respondo AI cost per month?",
          "Monthly plans are Advanced €49, Premium €129 and Enterprise €149. Annual billing saves €120/year: Advanced €468/year, Premium €1,428/year and Enterprise €1,668/year."
        ],
        [
          "Is there a free chatbot trial?",
          "Respondo AI currently includes a three-day free trial. Check the latest trial and subscription terms at checkout."
        ],
        [
          "Is the cheapest AI chatbot necessarily the best choice?",
          "No. Accurate, company-grounded answers, appropriate features, human escalation and total ownership cost matter more than the subscription price alone."
        ],
        [
          "Can businesses outside Finland subscribe?",
          "Paid Respondo AI subscriptions are currently available only to Finnish businesses."
        ]
      ]
    }
  }
};
// Distinct educational resources belong in the existing footer-linked Guides library,
// not the homepage. Preserve existing guide URLs and add only useful new topics.
Object.assign(guides, SEO_SPECIALIST_GUIDES);
export const GLOBAL_GUIDE_PATHS = ['/guides', ...Object.keys(guides)];
export function globalGuideData(path,lang='fi') {
  const normalized=['fi','sv','en'].includes(lang)?lang:'fi';
  return guides[path]?.[normalized] || null;
}
const quote=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const pathWithLang=(p,lang)=>p+(lang==='fi'?'':'?lang='+lang);
export function globalResourcesMarkup(path,lang='fi') {
  const L=['fi','sv','en'].includes(lang)?lang:'fi';
  const i=L==='sv'?1:L==='en'?2:0;
  const source=globalGuideData(path,L);
  const list=Object.entries(guides).map(([link,info])=>{
    const story=info[L];
    return '<a class="global-guide-card" href="'+pathWithLang(link,L)+'"><span class="global-guide-card-category">'+['OPAS','GUIDE','GUIDE'][i]+' · '+info.reading+' min</span><h3>'+quote(story.title)+'</h3><p>'+quote(story.subtitle)+'</p><span class="global-guide-more">'+['Lue opas','Läs guiden','Read guide'][i]+' →</span></a>';
  }).join('');
  const scorecard='<a class="global-guide-scorecard" href="/ai-chatbot-evaluation-scorecard.csv" download="ai-chatbot-evaluation-scorecard.csv"><span class="global-guide-scorecard-title">'+['Lataa 25 testikysymyksen arviointipohja','Ladda ner utvärderingsmallen med 25 testfrågor','Download the 25-question evaluation scorecard'][i]+'</span><span class="global-guide-scorecard-subtitle">'+['Maksuton CSV-pohja: kysymykset, odotettu toiminta, riski ja testitulos.','Gratis CSV-mall: frågor, förväntat beteende, risk och resultat.','Free CSV template with test questions, expected behaviour, risk levels and review fields.'][i]+' <span aria-hidden="true">↓</span></span></a>';
  const interactiveScorecard='<a class="global-guide-scorecard" href="'+(L==='en'?'/tools/ai-chatbot-evaluation.html':'/tools/asiakaspalvelubotti-testi.html')+'"><span class="global-guide-scorecard-title">'+['Testaa bottia interaktiivisella 25 kysymyksen arvioinnilla','Utvärdera en chatbot med 25 interaktiva frågor','Evaluate an AI chatbot with 25 interactive tests'][i]+'</span><span class="global-guide-scorecard-subtitle">'+['Merkitse vastaukset ja lataa arviointisi CSV-tiedostona. Ei kirjautumista.','Bedöm svaren och exportera resultaten som CSV. Ingen inloggning.','Score real answers, flag critical failures and export your results. No login.'][i]+' <span aria-hidden="true">↗</span></span></a>';
  // All discovery stays behind the existing footer link /guides.
  // Do not add these cards or any section to the homepage.
  const topicNav='<nav class="global-guide-topic-nav" aria-label="'+['Aiheeseen liittyvät kokonaisuudet','Relaterade ämnen','Related topics'][i]+'">'+[
    ['/tekoaly-asiakaspalvelu',['Tekoäly asiakaspalvelussa','AI i kundservice','AI in customer service'][i]],
    ['/tekoaly-yrityksille',['Tekoäly yrityksille','AI för företag','AI for businesses'][i]],
    ['/asiakaspalvelubotti',['AI-asiakaspalvelija yritykselle','AI-kundservicebot för företag','Business AI customer support bot'][i]],
    ['/asiakaspalvelun-automatisointi',['Asiakaspalvelun automatisointi','Automatiserad kundservice','Customer service automation'][i]],
    ['/verkkokauppa-chatbot',['Chat-palvelu verkkokauppaan','Chattjänst för webbutik','Ecommerce customer service chatbot'][i]],
    ['/shopify-chatbot',['Shopify-chatbot','Shopify-chatbot för webbutik','Shopify chatbot'][i]],
    ['/liidien-keruu-chatbotilla',['Liidien kerääminen chatbotilla','Samla förfrågningar med chatbot','Chatbot lead capture'][i]],
    ['/monikielinen-chatbot',['Monikielinen chatbot','Flerspråkig chatbot','Multilingual chatbot'][i]]
  ].map(([url,label])=>'<a href="'+pathWithLang(url,L)+'">'+quote(label)+' →</a>').join('')+'</nav>';
  // Keep the existing English assessment discoverable for past links and
  // integration tests, while prioritising the Finnish tool for FI/SV readers.
  const scorecardLinks=interactiveScorecard+(L==='en'?'':'<p class="global-guide-legacy-test"><a href="/tools/ai-chatbot-evaluation.html" lang="en">English 25-question assessment →</a></p>');
  if (!source) return '<main class="global-guide-main"><div class="container"><header class="global-guide-hero"><span class="global-guide-kicker">'+['ASIANTUNTIJAOPPAAT','PRAKTISKA GUIDER','PRACTICAL GUIDES'][i]+'</span><h1>'+['AI-asiakaspalvelun oppaat','Guider till AI-kundservice','Guides to AI customer support'][i]+'</h1><p>'+['Tietoa yrityksen verkkosivujen chatbotista, luotettavasta tietopohjasta ja paremmasta asiakaspalvelusta.','Praktiska råd om webbplatsbotar, kunskapsbaser och bättre kundservice.','Practical, vendor-aware guidance on website chatbots, reliable business knowledge, and better customer service.'][i]+'</p></header>'+topicNav+'<div class="global-guide-grid">'+list+'</div>'+scorecardLinks+scorecard+'<div class="global-guide-footer-notice">'+['Respondo AI:n maksulliset yritystilaukset ovat tällä hetkellä saatavilla vain Suomessa.','Betalda företagsabonnemang för Respondo AI är för närvarande endast tillgängliga i Finland.','Respondo AI paid business subscriptions are currently available only in Finland.'][i]+' <a href="'+pathWithLang('/yhteystiedot',L)+'">'+['Ota yhteyttä','Kontakta oss','Contact us'][i]+'</a>.</div></div></main>';
  const articleSections=source.sections.map(([h,p])=>'<section class="global-guide-section"><h2>'+quote(h)+'</h2><p>'+quote(p)+'</p></section>').join('');
  const faqs=source.faq.map(([q,a])=>'<details class="global-guide-faq"><summary>'+quote(q)+'</summary><p>'+quote(a)+'</p></details>').join('');
  const other=Object.entries(guides).filter(([url])=>url!==path).map(([url,info])=>'<a href="'+pathWithLang(url,L)+'">'+quote(info[L].title)+' →</a>').join('');
  const pricingCta = path === '/guides/ai-chatbot-pricing'
    ? '<a class="global-guide-pricing-action" href="'+pathWithLang('/hinnat',L)+'">'+['Vertaile Respondon paketteja','Jämför Respondos abonnemang','Compare Respondo plans'][i]+' →</a>'
    : '';
  return '<main class="global-guide-main"><div class="container global-guide-article"><nav class="global-guide-crumb"><a href="'+pathWithLang('/guides',L)+'">'+['Kaikki oppaat','Alla guider','All guides'][i]+'</a><span> / </span><span>'+['Opas','Guide','Guide'][i]+'</span></nav><header class="global-guide-hero"><span class="global-guide-kicker">RESPONDO AI · '+infoLabel(L)+'</span><h1>'+quote(source.title)+'</h1><p>'+quote(source.subtitle)+'</p></header><div class="global-guide-prose">'+articleSections+'<section class="global-guide-section"><h2>'+['Usein kysytyt kysymykset','Vanliga frågor','Frequently asked questions'][i]+'</h2>'+faqs+'</section><div class="global-guide-next"><h2>'+['Jatka lukemista','Läs vidare','Continue reading'][i]+'</h2>'+other+'</div>'+scorecardLinks+scorecard+'<div class="global-guide-cta"><h2>'+['Kokeile, miten botti vastaa','Prova hur botten svarar','See how a chatbot answers'][i]+'</h2><p>'+['Respondo AI perustaa vastauksensa yrityksen hyväksymiin tietoihin ja voi ohjata epävarmat asiat ihmiselle.','Respondo AI använder företagets godkända uppgifter och kan lämna osäkra frågor vidare till en medarbetare.','Respondo AI uses company-approved information and can hand uncertain questions to a person.'][i]+'</p><a href="'+pathWithLang('/assistant',L)+'">'+['Testaa bottia','Testa botten','Try the demo'][i]+' →</a>'+pricingCta+'</div><p class="global-guide-footer-notice">'+['Maksulliset tilaukset saatavilla toistaiseksi vain suomalaisille yrityksille.','Betalda abonnemang är tills vidare endast tillgängliga för finska företag.','Paid subscriptions are currently available only to Finnish businesses.'][i]+'</p></div></div></main>';
}
function infoLabel(lang){return lang==='en'?'GUIDE':lang==='sv'?'GUIDE':'OPAS';}
