// Public SEO landing pages. Marketing copy only; no tenant data or chatbot logic.
export const VERTICAL_LANDING_PATHS = ["/kampaamo-chatbot","/siivousyritys-chatbot"];
const pages = {
  "/kampaamo-chatbot": {
    "fi": {
      "title": "Chatbot kampaamolle – ajanvaraus ja hinnat | Respondo AI",
      "description": "Kampaamon AI-chatbot vastaa palvelu-, hinta- ja ajanvarauskysymyksiin kampaamon omilla tiedoilla ja kerää yhteydenottopyynnöt myös aukioloaikojen ulkopuolella.",
      "tag": "KAMPAAMOT JA PARTURIT",
      "h1": "Chatbot kampaamolle ja parturille",
      "lead": "Asiakkaasi haluaa tietää, mitä leikkaus maksaa, kuuluuko värjäykseen sävytys ja mistä varataan aika. Respondo AI voi auttaa vastaamaan yrityksesi omilla vahvistetuilla tiedoilla.",
      "introTitle": "Vastaukset yleisiin kampaamokysymyksiin ilman jatkuvaa puhelinrumbaa",
      "intro": "Kampaamossa työskennellään usein asiakkaan hiusten parissa silloin, kun seuraava asiakas soittaa. Verkkosivun chatbot voi kertoa julkaistut hinnastot, palvelujen sisällöt, aukioloajat ja varauskäytännöt silloinkin, kun työntekijä ei ehdi vastata. Botti ei arvioi hiusten käsittelyyn tarvittavaa aikaa tai yksilöllistä hintaa ilman liikkeen vahvistamia sääntöjä. Epävarmoissa tapauksissa se ohjaa pyytämään henkilökohtaisen arvion.",
      "features": [
        [
          "Palvelut ja hinnasto",
          "Asiakas voi kysyä esimerkiksi naisten tai miesten hiustenleikkauksesta, lasten leikkauksesta, värjäyksestä tai kampauksista. Botti vastaa vain palveluista ja hinnoista, jotka liike on itse määrittänyt."
        ],
        [
          "Ajanvaraus ilman keksittyjä vapaita aikoja",
          "Respondo voi ohjata liikkeen omaan ajanvarauslinkkiin ja auttaa varauskäytäntöjen kanssa. Vapaita aikoja ei pidä luvata, ellei järjestelmässä ole ajantasaista, erikseen määritettyä saatavuustietoa."
        ],
        [
          "Tuotekysymykset ja käytännöt",
          "Yritys voi lisätä tietoa myytävistä hiustuotteista, peruutusehdoista, osoitteesta, pysäköinnistä ja maksutavoista. Näin asiakkaan ei tarvitse etsiä eri vastauksia usealta sivulta."
        ],
        [
          "Yhteydenotto ammattilaiselle",
          "Esimerkiksi vaativan värinkorjauksen hinta tai mahdolliset käsittelyrajoitukset voivat edellyttää ammattilaisen arviota. Botti voi kerätä yhteydenottopyynnön arvailun sijasta."
        ]
      ],
      "faq": [
        [
          "Voiko chatbot varata asiakkaalle ajan?",
          "Se voi ohjata kampaamon omaan ajanvaraukseen tai tukea varauspyyntöä, kun liike on määrittänyt toimintatavan. Vapaan ajan vahvistaminen edellyttää ajantasaista saatavuustietoa."
        ],
        [
          "Mistä botti tietää kampaamon hinnat?",
          "Liike lisää hinnaston ja mahdolliset hinnoitteluehdot itse tai tarkistaa verkkosivuilta tuodut tiedot. Yksilöllistä hinta-arviota ei pidä keksiä."
        ],
        [
          "Toimiiko botti myös ruotsiksi ja englanniksi?",
          "Respondo tukee suomea, ruotsia ja englantia. Kampaamon oma palvelusanasto ja hinnat kannattaa testata jokaisella asiakkaiden käyttämällä kielellä."
        ],
        [
          "Sopiiko ratkaisu yhden henkilön kampaamolle?",
          "Mahdollisesti, jos verkkosivulla tulee toistuvia kysymyksiä ja työ keskeytyy niiden vuoksi. Jos kysymyksiä tulee vähän, yksinkertainen yhteydenottotapa saattaa riittää."
        ]
      ],
      "closing": "Tee asiakkaalle helpoksi löytää oikea palvelu, hinnasto ja ajanvaraus. Kokeile botin toimintaa ja varmista, että vastaukset vastaavat oman liikkeesi todellisia käytäntöjä."
    },
    "sv": {
      "title": "Chatbot för frisörsalong – bokning och priser | Respondo AI",
      "description": "En AI-chatbot för frisörer som svarar på frågor om tjänster, prislista och bokning utifrån salongens godkända information och kan samla kontaktförfrågningar.",
      "tag": "FRISÖRER OCH BARBERARE",
      "h1": "Chatbot för frisörsalong och barberare",
      "lead": "Kunder vill veta vad en klippning kostar, vilka färgbehandlingar ni erbjuder och hur man bokar. Respondo AI kan ge svar med salongens egen bekräftade information.",
      "introTitle": "Färre avbrott under kundbesöken",
      "intro": "När frisören behandlar en kund kan det vara svårt att svara i telefon. En chatbot på webbplatsen kan hjälpa besökare med salongens publicerade tjänster, priser, öppettider och bokningsrutiner. Den bör däremot inte uppskatta priset på en komplicerad färgbehandling eller lova en viss behandlingstid utan bekräftade regler. När en fråga kräver professionell bedömning kan kunden lämna en förfrågan till personalen.",
      "features": [
        [
          "Tjänster och prislista",
          "Kunden kan fråga om dam-, herr- och barnklippning, färgning, styling eller andra behandlingar. Svaren ska baseras på salongens faktiska tjänsteutbud och godkända priser."
        ],
        [
          "Bokning med korrekt tillgänglighet",
          "Botten kan länka till den egna bokningssidan och förklara hur man bokar eller avbokar. Lediga tider får bara anges om ett aktuellt tillgänglighetsunderlag finns."
        ],
        [
          "Produkter och salongsinformation",
          "Lägg till verifierade uppgifter om hårprodukter, adress, öppettider, avbokningsvillkor och betalningssätt. Då kan besökaren hitta svar utan att leta på flera undersidor."
        ],
        [
          "Kontakt med en frisör",
          "Avancerad färgkorrigering, individuella rekommendationer och specialpris kan kräva en yrkespersons bedömning. Botten kan samla en kontaktförfrågan i stället för att gissa."
        ]
      ],
      "faq": [
        [
          "Kan chatboten boka en tid?",
          "Den kan hänvisa till salongens bokningssystem eller stödja en bokningsförfrågan enligt inställningarna. En tid får bara bekräftas med aktuell tillgänglighetsinformation."
        ],
        [
          "Hur känner botten till salongens priser?",
          "Företaget lägger in eller kontrollerar sina egna prislistor och regler. Botten ska inte gissa priset på en individuell behandling."
        ],
        [
          "Kan den svara på finska och engelska?",
          "Respondo stöder finska, svenska och engelska. Testa salongens egna behandlingsnamn på de språk kunderna använder."
        ],
        [
          "Passar den en liten salong?",
          "Ja, om återkommande webbfrågor tar mycket arbetstid. Om frågorna är få kan ett tydligt kontaktformulär vara tillräckligt."
        ]
      ],
      "closing": "Gör det enkelt att hitta rätt tjänst, prisuppgift och bokningssida utan att utlova obekräftade tider. Testa hur Respondo hanterar verkliga frågor från era kunder."
    },
    "en": {
      "title": "AI Chatbot for Hair Salons – Booking & Prices | Respondo AI",
      "description": "An AI chatbot for hair salons and barbershops that answers booking, service and price-list questions with salon-approved information and captures customer enquiries.",
      "tag": "HAIR SALONS & BARBERS",
      "h1": "AI chatbot for hair salons and barbershops",
      "lead": "Your visitors want to know the price of a haircut, what a colour treatment includes and how to book. Respondo AI can answer using the information your salon has approved.",
      "introTitle": "Answer common salon questions without interrupting appointments",
      "intro": "Hairdressers are often working with one customer when the next calls to ask about a service. A website chatbot can answer questions about your published haircut prices, colouring services, opening hours, cancellation policy and booking process while your team is busy. It should not improvise an individual colour-correction quote or guarantee appointment availability without verified live information. More complex questions can be routed to your staff for review.",
      "features": [
        [
          "Hair services and price lists",
          "Visitors can ask about women's or men's haircuts, children's appointments, colouring and styling. The bot should use only the services and prices actually confirmed by your business."
        ],
        [
          "Booking without invented appointments",
          "Respondo can guide visitors to your salon's existing booking link or help with booking enquiries. Available slots should only be quoted when up-to-date availability has been provided."
        ],
        [
          "Products, policies and practical details",
          "Add verified hair-care products, cancellation terms, address, opening hours and payment information. Customers can find these practical answers in one conversation."
        ],
        [
          "Human follow-up for specialist work",
          "Complex colour correction, uncertain treatment suitability and bespoke pricing may require a qualified stylist. The bot can capture an enquiry rather than make an unsupported promise."
        ]
      ],
      "faq": [
        [
          "Can the chatbot book salon appointments?",
          "It can direct customers to your existing booking system or support appointment requests, depending on how your business configures it. Confirming free slots requires current availability data."
        ],
        [
          "Where does the chatbot get haircut prices?",
          "Your salon supplies or reviews its own price list and pricing rules. The bot should not invent a quote for a treatment that requires an individual assessment."
        ],
        [
          "Can it answer customers in Finnish or Swedish?",
          "Respondo supports Finnish, Swedish and English. Test your actual service names and policies in the languages your customers use."
        ],
        [
          "Is a chatbot worthwhile for a single-chair salon?",
          "It can be useful when repeated website questions interrupt appointments. A simpler contact form may be more appropriate when the question volume is very low."
        ]
      ],
      "closing": "Help customers find the right service, trusted price information and booking route. Test the bot against your salon's real questions before publishing it."
    }
  },
  "/siivousyritys-chatbot": {
    "fi": {
      "title": "Chatbot siivousyritykselle – tarjoukset ja palvelut | Respondo AI",
      "description": "Siivousyrityksen AI-chatbot auttaa kotisiivouksen, toimistosiivouksen, muuttosiivouksen, palvelualueiden ja tarjouspyyntöjen kysymyksissä yrityksen omilla tiedoilla.",
      "tag": "SIIVOUS- JA PUHTAUSPALVELUT",
      "h1": "Chatbot siivousyritykselle",
      "lead": "Kotisiivouksen hinta, muuttosiivouksen sisältö, toimistosiivouksen aikataulu ja palvelualue ovat kysymyksiä, joihin asiakas haluaa vastauksen ennen tarjouspyyntöä.",
      "introTitle": "Muuta toistuvat palvelukysymykset selkeiksi tarjouspyynnöiksi",
      "intro": "Siivouspalveluiden ostajat vertailevat usein palvelun sisältöä, työn laajuutta, hintoja, mahdollisia lisätöitä ja saatavuutta. Respondo AI voi auttaa kertomaan, mitä yritys todella tarjoaa: kotisiivousta, toimitilasiivousta, muuttosiivousta tai muuta yrityksen ilmoittamaa palvelua. Jos hinta riippuu esimerkiksi neliömäärästä, tilan kunnosta, matkasta tai palvelukerroista, botti ei saa keksiä lopullista hintaa. Sen sijaan se voi neuvoa, mitä tietoja tarjouspyyntöön tarvitaan.",
      "features": [
        [
          "Palvelut erotellaan oikein",
          "Kotisiivous, viikkosiivous, muuttosiivous, ikkunoiden pesu ja toimistosiivous voivat olla eri palveluja. Botti kertoo vain yrityksen vahvistamasta tarjonnasta ja sisällöstä."
        ],
        [
          "Tarjouspyynnön valmistelu",
          "Botti voi auttaa keräämään yhteystiedot ja ohjata kertomaan esimerkiksi kohteen koon, sijainnin, toivotun ajan ja siivoustarpeen. Se ei lupaa tarjouksen lopullista hintaa ilman vahvistettua hinnoittelua."
        ],
        [
          "Palvelualueet ja käytännöt",
          "Asiakas voi tarkistaa yrityksen ilmoittamat paikkakunnat, aukioloajat, peruutuskäytännöt ja mahdollisen avainten luovutuksen ohjeistuksen. Yrityksen tulee pitää nämä tiedot ajan tasalla."
        ],
        [
          "Ammattihenkilön arvio tarvittaessa",
          "Esimerkiksi vahinkosiivous, erikoispintojen käsittely tai turvallisuuteen liittyvä kysymys voi vaatia ammattilaisen arvion. Chatbot ohjaa eteenpäin, eikä anna perusteettomia kemikaali- tai turvallisuusohjeita."
        ]
      ],
      "faq": [
        [
          "Voiko chatbot laskea kotisiivouksen hinnan?",
          "Se voi antaa yrityksen vahvistaman tuntihinnan tai hinnoittelusäännön ja kerätä tarvittavat lisätiedot. Tarkkaa loppuhintaa ei pidä keksiä."
        ],
        [
          "Osaako se kertoa, kuuluuko ikkunoiden pesu muuttosiivoukseen?",
          "Vain, jos siivousyritys on vahvistanut asian palvelukuvauksessa tai tietopohjassa. Palvelujen sisältö voi vaihdella yrityksittäin."
        ],
        [
          "Voiko botti ottaa vastaan tarjouspyynnön?",
          "Botti voi tukea yhteydenottopyyntöjen keräämistä ja ohjata yrityksen määrittämään tarjouskanavaan. Työn toteutus ja tarjous vahvistetaan yrityksessä."
        ],
        [
          "Sopiiko botti myös toimitilasiivoukseen?",
          "Kyllä, jos yrityksen omaan tietopohjaan on lisätty toimistojen, liiketilojen ja muiden kohteiden oikeat palvelukuvaukset."
        ]
      ],
      "closing": "Anna asiakkaalle selkeä kuva palveluistasi ennen yhteydenottoa ja ohjaa tapauskohtaiset hinnat tarjouspyyntöön. Tarkista tiedot oman siivousyrityksesi käytäntöjä vasten."
    },
    "sv": {
      "title": "AI-chatbot för städföretag – offerter och tjänster | Respondo AI",
      "description": "En chatbot för städföretag som hjälper kunder med hemstädning, flyttstädning, kontorsstädning, serviceområden och offertförfrågningar utifrån bekräftad information.",
      "tag": "STÄDNING OCH LOKALVÅRD",
      "h1": "AI-chatbot för städföretag",
      "lead": "Kunder frågar om priset på hemstädning, vad flyttstädning omfattar, tider för kontorsstädning och vilka orter ni betjänar. Svaren påverkar valet av leverantör.",
      "introTitle": "Förvandla återkommande frågor till tydliga offertförfrågningar",
      "intro": "Kunder som köper städtjänster jämför arbetsinnehåll, lokalens storlek, priser, eventuella tillägg och tillgänglighet. Respondo AI kan hjälpa till att förklara företagets verkliga tjänster, exempelvis hemstädning, kontorsstädning eller flyttstädning. Om priset påverkas av kvadratmeter, skick, resväg eller hur ofta arbetet utförs ska botten inte hitta på ett slutpris. Den kan i stället förklara vilka uppgifter som behövs för att företaget ska kunna lämna offert.",
      "features": [
        [
          "Rätt innehåll för varje städtjänst",
          "Veckostädning, flyttstädning, fönsterputsning och kontorsstädning kan ha olika villkor. Botten utgår endast från tjänster och omfattning som företaget har bekräftat."
        ],
        [
          "Underlag för en offert",
          "Botten kan samla kontaktuppgifter och vägleda kunden att beskriva yta, plats, önskat datum och städbehov. Ett fast pris bör bara nämnas om det stöds av företagets egna regler."
        ],
        [
          "Områden och praktiska villkor",
          "Besökare kan fråga om orter, öppettider, avbokningsvillkor och rutiner för nyckelöverlämning när företaget har publicerat sådan information."
        ],
        [
          "Professionell bedömning när det behövs",
          "Sanering efter skada, specialytor eller kemikaliefrågor kan kräva en utbildad medarbetare. Botten bör eskalera i stället för att ge ogrundade säkerhetsråd."
        ]
      ],
      "faq": [
        [
          "Kan chatboten räkna ut priset för hemstädning?",
          "Den kan återge en verifierad timtaxa eller prisregel och fråga efter relevanta detaljer. Den ska inte hitta på ett individuellt slutpris."
        ],
        [
          "Kan den bekräfta om fönsterputs ingår i flyttstädning?",
          "Bara om städföretaget har bekräftat detta i sina tjänsteuppgifter. Paketinnehåll varierar mellan leverantörer."
        ],
        [
          "Kan botten samla offertförfrågningar?",
          "Den kan hjälpa kunden att lämna kontaktuppgifter och gå vidare enligt företagets offertprocess. Företaget bekräftar sedan pris och utförande."
        ],
        [
          "Fungerar det även för kontorsstädning?",
          "Ja, om företaget har lagt in korrekt information om kontor, affärslokaler och andra objekt i sin kunskapsbas."
        ]
      ],
      "closing": "Hjälp besökare att förstå tjänster och villkor innan de ber om offert. Kontrollera att chatbotens svar motsvarar ditt städföretags verkliga erbjudande."
    },
    "en": {
      "title": "AI Chatbot for Cleaning Companies – Quotes & FAQs | Respondo AI",
      "description": "An AI chatbot for cleaning businesses that answers housekeeping, office cleaning, end-of-tenancy cleaning, service-area and quote questions using approved company information.",
      "tag": "CLEANING BUSINESSES",
      "h1": "AI chatbot for cleaning companies",
      "lead": "What does a move-out clean include? How much is regular housekeeping? Do you clean offices in my area? Clear answers can help customers decide whether to request a quote.",
      "introTitle": "Turn service questions into better-qualified cleaning enquiries",
      "intro": "People comparing cleaning companies often ask what the service includes, how prices are calculated, whether extras are available and which areas the team covers. Respondo AI can answer from the cleaning company's own approved descriptions of domestic cleaning, commercial cleaning, move-out cleaning or other real services. If a quote depends on floor area, condition of the property, travel distance or cleaning frequency, a chatbot should not fabricate a final price. It can instead help the customer describe the job and prepare a useful enquiry.",
      "features": [
        [
          "Clear scope for different cleaning services",
          "Regular house cleaning, end-of-tenancy cleaning, window cleaning and office cleaning can each have different inclusions. Answers should reflect only your confirmed service list and conditions."
        ],
        [
          "Collect the details a quote needs",
          "The bot can guide visitors to provide their contact details, property size, location, preferred date and type of cleaning. It should only quote a fixed price when your company has supplied the pricing rules."
        ],
        [
          "Service areas and practical arrangements",
          "Customers can check published service areas, opening hours, cancellation policies and access instructions when those details have been approved and kept current by the business."
        ],
        [
          "Escalate specialist or safety-related requests",
          "Post-damage cleaning, specialist surfaces and chemical safety may require a trained employee. A chatbot should hand those questions over, not invent cleaning or safety instructions."
        ]
      ],
      "faq": [
        [
          "Can an AI chatbot calculate a house-cleaning quote?",
          "It can provide a company-approved hourly rate or pricing rule and request missing information. It should not make up a personalised final price."
        ],
        [
          "Can it tell customers whether windows are included in a move-out clean?",
          "Only if that inclusion is stated in the cleaning company's approved service information. Packages differ between businesses."
        ],
        [
          "Can the chatbot capture quote requests?",
          "It can support collecting customer contact details and direct them to the company's configured quote process. The company remains responsible for confirming the actual scope and price."
        ],
        [
          "Does it work for commercial office cleaners too?",
          "Yes, when the company supplies reliable service descriptions for offices, retail spaces or other sites."
        ]
      ],
      "closing": "Make your service scope and booking process clear before an enquiry arrives. Use your cleaning company's real prices and policies, and escalate requests requiring an individual assessment."
    }
  }
};
const h = value => String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const language = lang => ['fi','sv','en'].includes(lang) ? lang : 'fi';
const url = (path,lang) => path + (lang === 'fi' ? '' : '?lang=' + lang);

export function verticalMetaForPath(path) {
  const item = pages[path];
  if (!item) return null;
  return Object.fromEntries(['fi','sv','en'].map(lang => [lang,[item[lang].title,item[lang].description]]));
}

export function verticalLandingMarkup(path, lang='fi') {
  const item = pages[path];
  if (!item) return '';
  const L=language(lang);
  const p=item[L];
  const card=p.features.map(([title,body]) => '<article><h3>'+h(title)+'</h3><p>'+h(body)+'</p></article>').join('');
  const faq=p.faq.map(([question,answer]) => '<details class="vertical-faq-item"><summary>'+h(question)+'</summary><p>'+h(answer)+'</p></details>').join('');
  const t={
    fi:{demo:'Kokeile bottia',prices:'Tutustu hintoihin',faq:'Usein kysyttyä',more:'Muut toimialat',note:'Botti käyttää yrityksen hyväksymiä tietoja. Se ei saa luvata vahvistamattomia hintoja tai aikoja.'},
    sv:{demo:'Testa botten',prices:'Se priser',faq:'Vanliga frågor',more:'Andra branscher',note:'Botten använder företagets godkända information och ska inte lova obekräftade priser eller tider.'},
    en:{demo:'Try the bot',prices:'View pricing',faq:'Frequently asked questions',more:'Other industries',note:'The chatbot uses company-approved information and should not promise unverified prices or appointment times.'}
  }[L];
  return '<main class="vertical-landing">'+
    '<section class="seo-landing-hero"><div class="container seo-landing-hero-inner"><div class="section-kicker">'+h(p.tag)+'</div><h1>'+h(p.h1)+'</h1><p>'+h(p.lead)+'</p><div class="seo-landing-actions"><a class="btn ink" href="'+url('/assistant',L)+'">'+h(t.demo)+'</a><a class="btn ghost" href="'+url('/hinnat',L)+'">'+h(t.prices)+'</a></div></div></section>'+
    '<section class="section seo-landing-copy"><div class="container"><div class="seo-landing-intro"><h2>'+h(p.introTitle)+'</h2><p>'+h(p.intro)+'</p></div><div class="seo-landing-grid">'+card+'</div></div></section>'+
    '<section class="section"><div class="container vertical-faq-wrap"><h2>'+h(t.faq)+'</h2><div class="vertical-faq-list">'+faq+'</div></div></section>'+
    '<section class="section seo-landing-closing"><div class="container"><div class="seo-landing-closing-card"><h2>'+h(p.h1)+'</h2><p>'+h(p.closing)+'</p><p class="vertical-landing-note">'+h(t.note)+'</p><a class="vertical-back-link" href="'+url('/kenelle-sopii',L)+'">'+h(t.more)+' →</a></div></div></section></main>';
}
