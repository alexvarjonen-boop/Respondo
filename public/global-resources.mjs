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
}
};
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
  if (!source) return '<main class="global-guide-main"><div class="container"><header class="global-guide-hero"><span class="global-guide-kicker">'+['ASIANTUNTIJAOPPAAT','PRAKTISKA GUIDER','PRACTICAL GUIDES'][i]+'</span><h1>'+['AI-asiakaspalvelun oppaat','Guider till AI-kundservice','Guides to AI customer support'][i]+'</h1><p>'+['Tietoa yrityksen verkkosivujen chatbotista, luotettavasta tietopohjasta ja paremmasta asiakaspalvelusta.','Praktiska råd om webbplatsbotar, kunskapsbaser och bättre kundservice.','Practical, vendor-aware guidance on website chatbots, reliable business knowledge, and better customer service.'][i]+'</p></header><div class="global-guide-grid">'+list+'</div>'+scorecard+'<div class="global-guide-footer-notice">'+['Respondo AI:n maksulliset yritystilaukset ovat tällä hetkellä saatavilla vain Suomessa.','Betalda företagsabonnemang för Respondo AI är för närvarande endast tillgängliga i Finland.','Respondo AI paid business subscriptions are currently available only in Finland.'][i]+' <a href="'+pathWithLang('/yhteystiedot',L)+'">'+['Ota yhteyttä','Kontakta oss','Contact us'][i]+'</a>.</div></div></main>';
  const articleSections=source.sections.map(([h,p])=>'<section class="global-guide-section"><h2>'+quote(h)+'</h2><p>'+quote(p)+'</p></section>').join('');
  const faqs=source.faq.map(([q,a])=>'<details class="global-guide-faq"><summary>'+quote(q)+'</summary><p>'+quote(a)+'</p></details>').join('');
  const other=Object.entries(guides).filter(([url])=>url!==path).map(([url,info])=>'<a href="'+pathWithLang(url,L)+'">'+quote(info[L].title)+' →</a>').join('');
  return '<main class="global-guide-main"><div class="container global-guide-article"><nav class="global-guide-crumb"><a href="'+pathWithLang('/guides',L)+'">'+['Kaikki oppaat','Alla guider','All guides'][i]+'</a><span> / </span><span>'+['Opas','Guide','Guide'][i]+'</span></nav><header class="global-guide-hero"><span class="global-guide-kicker">RESPONDO AI · '+infoLabel(L)+'</span><h1>'+quote(source.title)+'</h1><p>'+quote(source.subtitle)+'</p></header><div class="global-guide-prose">'+articleSections+'<section class="global-guide-section"><h2>'+['Usein kysytyt kysymykset','Vanliga frågor','Frequently asked questions'][i]+'</h2>'+faqs+'</section><div class="global-guide-next"><h2>'+['Jatka lukemista','Läs vidare','Continue reading'][i]+'</h2>'+other+'</div>'+scorecard+'<div class="global-guide-cta"><h2>'+['Kokeile, miten botti vastaa','Prova hur botten svarar','See how a chatbot answers'][i]+'</h2><p>'+['Respondo AI perustaa vastauksensa yrityksen hyväksymiin tietoihin ja voi ohjata epävarmat asiat ihmiselle.','Respondo AI använder företagets godkända uppgifter och kan lämna osäkra frågor vidare till en medarbetare.','Respondo AI uses company-approved information and can hand uncertain questions to a person.'][i]+'</p><a href="'+pathWithLang('/assistant',L)+'">'+['Testaa bottia','Testa botten','Try the demo'][i]+' →</a></div><p class="global-guide-footer-notice">'+['Maksulliset tilaukset saatavilla toistaiseksi vain suomalaisille yrityksille.','Betalda abonnemang är tills vidare endast tillgängliga för finska företag.','Paid subscriptions are currently available only to Finnish businesses.'][i]+'</p></div></div></main>';
}
function infoLabel(lang){return lang==='en'?'GUIDE':lang==='sv'?'GUIDE':'OPAS';}
