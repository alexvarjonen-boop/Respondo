export const RESPONDO_OWNER_FAQ_VERSION = '2026-10-04-v1';

const faq = (key, category, answers, questions, keywords = []) => ({
  key, category, answers, questions, keywords
});

export const RESPONDO_OWNER_FAQ = [
  faq('what-is-respondo','Tuote',{
    fi:'Respondo AI on yritysten verkkosivuille asennettava asiakaspalvelubotti. Se vastaa asiakkaiden kysymyksiin yrityksen omilla hyväksytyillä tiedoilla ympäri vuorokauden ja ohjaa epävarmat kysymykset yritykselle.',
    sv:'Respondo AI är en kundservicebot som installeras på företags webbplatser. Den svarar dygnet runt med företagets egna godkända uppgifter och skickar osäkra frågor vidare till företaget.',
    en:'Respondo AI is a customer-service bot installed on business websites. It answers around the clock using company-approved information and routes uncertain questions to the business.'
  },{
    fi:['Mikä Respondo on?','Mitä Respondo tekee?','Mikä Respondo AI on?','Mihin Respondoa käytetään?','Kerro lyhyesti Respondosta.'],
    sv:['Vad är Respondo?','Vad gör Respondo?','Vad är Respondo AI?','Vad används Respondo till?','Berätta kort om Respondo.'],
    en:['What is Respondo?','What does Respondo do?','What is Respondo AI?','What is Respondo used for?','Tell me briefly about Respondo.']
  },['asiakaspalvelubotti','customer service bot','kundservicebot','24/7']),

  faq('who-for','Tuote',{
    fi:'Respondo on tarkoitettu yrityksille, jotka haluavat vastata verkkosivukävijöiden kysymyksiin nopeasti myös silloin, kun henkilökunta ei ole paikalla.',
    sv:'Respondo är avsett för företag som vill svara snabbt på webbplatsbesökarnas frågor även när personalen inte är tillgänglig.',
    en:'Respondo is designed for businesses that want to answer website visitors quickly even when staff are not available.'
  },{
    fi:['Kenelle Respondo sopii?','Millaisille yrityksille tämä on?','Onko Respondo yrityksille?','Sopiiko tämä pienyritykselle?','Kenelle palvelu on tarkoitettu?'],
    sv:['Vem passar Respondo för?','Vilka företag passar tjänsten för?','Är Respondo för företag?','Passar det småföretag?','Vem är tjänsten avsedd för?'],
    en:['Who is Respondo for?','What kind of businesses is this for?','Is Respondo for businesses?','Is it suitable for small businesses?','Who is the service intended for?']
  },['yritys','business','företag']),

  faq('monthly-price','Hinnoittelu',{
    fi:'Kuukausitilaus maksaa 49,99 € kuukaudessa ja hinta sisältää ALV:n 25,5 %.',
    sv:'Månadsabonnemanget kostar 49,99 € per månad och priset inkluderar 25,5 % moms.',
    en:'The monthly plan costs €49.99 per month and includes 25.5% VAT.'
  },{
    fi:['Mitä Respondo maksaa kuukaudessa?','Paljonko tämä maksaa?','Mikä kuukausihinta on?','Paljonko tilaus maksaa kuussa?','Mikä Respondon hinta on?'],
    sv:['Vad kostar Respondo per månad?','Hur mycket kostar det?','Vad är månadspriset?','Vad kostar abonnemanget per månad?','Vad kostar Respondo?'],
    en:['How much is Respondo per month?','How much does it cost?','What is the monthly price?','What does the subscription cost monthly?','What is the price of Respondo?']
  },['49,99','49.99','hinta','price','pris','kuukausi','monthly','månad']),

  faq('annual-price','Hinnoittelu',{
    fi:'Vuositilaus vastaa hintaa 44,99 € kuukaudessa ja laskutetaan 539,88 € kerran vuodessa. Hinta sisältää ALV:n 25,5 %.',
    sv:'Årsabonnemanget motsvarar 44,99 € per månad och faktureras med 539,88 € en gång per år. Priset inkluderar 25,5 % moms.',
    en:'The annual plan is equivalent to €44.99 per month and is billed at €539.88 once per year. The price includes 25.5% VAT.'
  },{
    fi:['Mitä vuositilaus maksaa?','Paljonko vuosipaketti maksaa?','Mikä vuosihinta on?','Laskutetaanko vuosi kerralla?','Onko vuosijäsenyys halvempi?'],
    sv:['Vad kostar årsabonnemanget?','Hur mycket kostar årsplanen?','Vad är årspriset?','Faktureras hela året på en gång?','Är årsabonnemanget billigare?'],
    en:['How much is the annual plan?','What does the yearly plan cost?','What is the annual price?','Is the year billed in one payment?','Is the annual plan cheaper?']
  },['44,99','44.99','539,88','539.88','vuosi','annual','yearly','år']),

  faq('vat','Hinnoittelu',{
    fi:'Kyllä. Sivulla ilmoitetut 49,99 €/kk ja 539,88 €/vuosi sisältävät ALV:n 25,5 %.',
    sv:'Ja. Priserna 49,99 €/månad och 539,88 €/år som visas på webbplatsen inkluderar 25,5 % moms.',
    en:'Yes. The displayed prices of €49.99/month and €539.88/year include 25.5% VAT.'
  },{
    fi:['Sisältääkö hinta ALV:n?','Tuleeko ALV hinnan päälle?','Onko vero mukana hinnassa?','Onko 49,99 euroa verollinen hinta?','Paljonko hinta on ALV:n kanssa?'],
    sv:['Ingår moms i priset?','Tillkommer moms?','Är skatten inkluderad?','Är 49,99 euro priset inklusive moms?','Vad kostar det inklusive moms?'],
    en:['Does the price include VAT?','Is VAT added on top?','Is tax included?','Is €49.99 VAT inclusive?','What is the price including VAT?']
  },['alv','vat','moms','25,5','25.5']),

  faq('trial','Tilaus',{
    fi:'Respondoa voi kokeilla 3 päivää ilmaiseksi. Jos et halua jatkaa maksullisena, peruuta tilaus ennen kokeilun päättymistä.',
    sv:'Du kan prova Respondo gratis i 3 dagar. Om du inte vill fortsätta som betalande kund ska du säga upp abonnemanget innan provperioden slutar.',
    en:'You can try Respondo free for 3 days. If you do not want to continue as a paid subscriber, cancel before the trial ends.'
  },{
    fi:['Onko ilmainen kokeilu?','Kuinka pitkä kokeilu on?','Saako Respondoa kokeilla ilmaiseksi?','Millainen kokeilujakso on?','Veloitetaanko kokeilusta?'],
    sv:['Finns en gratis provperiod?','Hur lång är provperioden?','Kan jag prova Respondo gratis?','Hur fungerar provperioden?','Kostar provperioden något?'],
    en:['Is there a free trial?','How long is the trial?','Can I try Respondo for free?','How does the trial work?','Am I charged during the trial?']
  },['3 päivää','3 days','3 dagar','kokeilu','trial','provperiod']),

  faq('payment-method','Maksaminen',{
    fi:'Maksutapa lisätään turvallisesti Stripen maksunäkymässä. Korttitiedot menevät suoraan Stripelle, eivät Respondon omaan tietokantaan.',
    sv:'Betalningsmetoden läggs till säkert i Stripes betalningsvy. Kortuppgifterna går direkt till Stripe och lagras inte i Respondos egen databas.',
    en:'Your payment method is added securely through Stripe. Card details go directly to Stripe and are not stored in Respondo’s own database.'
  },{
    fi:['Miten maksan?','Mihin korttitiedot syötetään?','Miten lisään maksutavan?','Voinko maksaa kortilla?','Kuka käsittelee maksun?'],
    sv:['Hur betalar jag?','Var anger jag kortuppgifterna?','Hur lägger jag till en betalningsmetod?','Kan jag betala med kort?','Vem hanterar betalningen?'],
    en:['How do I pay?','Where do I enter card details?','How do I add a payment method?','Can I pay by card?','Who processes the payment?']
  },['stripe','kortti','card','kort','maksu','payment','betalning']),

  faq('start-subscription','Tilaus',{
    fi:'Aloita tilaus valitsemalla Respondon sivulta kuukausi- tai vuositilaus, luo tili tai jatka Googlella ja viimeistele maksutapa Stripessä. Uusi asiakas saa 3 päivän ilmaisen kokeilun.',
    sv:'Starta abonnemanget genom att välja månads- eller årsplan på Respondos webbplats, skapa ett konto eller fortsätta med Google och slutför betalningsmetoden i Stripe. Nya kunder får 3 dagars gratis provperiod.',
    en:'Start by choosing the monthly or annual plan on the Respondo website, create an account or continue with Google, and complete the payment method in Stripe. New customers receive a 3-day free trial.'
  },{
    fi:['Miten aloitan tilauksen?','Mistä tilaan Respondon?','Miten pääsen asiakkaaksi?','Miten rekisteröidyn?','Miten otan Respondon käyttöön?'],
    sv:['Hur startar jag ett abonnemang?','Var beställer jag Respondo?','Hur blir jag kund?','Hur registrerar jag mig?','Hur börjar jag använda Respondo?'],
    en:['How do I start a subscription?','Where do I subscribe to Respondo?','How do I become a customer?','How do I sign up?','How do I get started with Respondo?']
  },['tilaus','subscribe','abonnemang','rekisteröidy','sign up']),

  faq('cancel','Tilaus',{
    fi:'Tilauksen voi perua milloin tahansa hallintapaneelin Laskutus-kohdasta avaamalla Stripen tilauksen hallinnan. Peruminen estää seuraavan laskutusjakson uusiutumisen.',
    sv:'Du kan säga upp abonnemanget när som helst från Fakturering i kontrollpanelen genom att öppna Stripes abonnemangshantering. Uppsägningen stoppar nästa förnyelse.',
    en:'You can cancel at any time from Billing in the dashboard by opening Stripe subscription management. Cancellation prevents the next billing-period renewal.'
  },{
    fi:['Miten peruutan tilauksen?','Mistä tilaus perutaan?','Voinko lopettaa milloin tahansa?','Miten katkaisen laskutuksen?','Haluan perua Respondon.'],
    sv:['Hur säger jag upp abonnemanget?','Var avslutar jag abonnemanget?','Kan jag avsluta när som helst?','Hur stoppar jag faktureringen?','Jag vill säga upp Respondo.'],
    en:['How do I cancel my subscription?','Where do I cancel?','Can I cancel anytime?','How do I stop billing?','I want to cancel Respondo.']
  },['peruuta','cancel','säga upp','billing','laskutus','fakturering']),

  faq('after-cancel','Tilaus',{
    fi:'Kun peruutat, seuraava uusiutuminen estyy. Jo maksettu laskutuskausi jatkuu normaalisti kauden loppuun.',
    sv:'När du säger upp abonnemanget stoppas nästa förnyelse. En redan betald period fortsätter normalt till periodens slut.',
    en:'When you cancel, the next renewal is stopped. An already-paid billing period normally remains available until the end of that period.'
  },{
    fi:['Loppuuko käyttö heti peruutuksen jälkeen?','Saanko käyttää palvelua kauden loppuun?','Mitä tapahtuu kun perun?','Menetänkö pääsyn heti?','Milloin peruutettu tilaus päättyy?'],
    sv:['Slutar tjänsten fungera direkt efter uppsägning?','Kan jag använda tjänsten till periodens slut?','Vad händer när jag säger upp?','Förlorar jag åtkomsten direkt?','När upphör ett uppsagt abonnemang?'],
    en:['Does access end immediately after cancellation?','Can I use it until the period ends?','What happens when I cancel?','Do I lose access immediately?','When does a cancelled subscription end?']
  },['kauden loppu','period end','periodens slut']),

  faq('renewal','Tilaus',{
    fi:'Tilaus uusiutuu automaattisesti valitun laskutusjakson mukaan, kunnes se perutaan.',
    sv:'Abonnemanget förnyas automatiskt enligt vald faktureringsperiod tills det sägs upp.',
    en:'The subscription renews automatically according to the selected billing period until it is cancelled.'
  },{
    fi:['Uusiutuuko tilaus automaattisesti?','Onko tilaus jatkuva?','Veloitetaanko seuraava kuukausi automaattisesti?','Uusiutuuko vuosipaketti?','Pitääkö tilaus uusia itse?'],
    sv:['Förnyas abonnemanget automatiskt?','Är abonnemanget löpande?','Debiteras nästa månad automatiskt?','Förnyas årsplanen?','Måste jag förnya manuellt?'],
    en:['Does the subscription renew automatically?','Is this a recurring subscription?','Is the next month charged automatically?','Does the annual plan renew?','Do I have to renew manually?']
  },['uusiutuu','renew','förnyas','recurring']),

  faq('billing-portal','Maksaminen',{
    fi:'Hallintapaneelin Laskutus-kohdasta voit avata Stripen asiakasportaalin, jossa voit hallita maksutapaa, laskuja ja tilauksen perumista.',
    sv:'Från Fakturering i kontrollpanelen kan du öppna Stripes kundportal där du kan hantera betalningsmetod, fakturor och uppsägning.',
    en:'From Billing in the dashboard you can open Stripe’s customer portal to manage payment methods, invoices, and cancellation.'
  },{
    fi:['Mistä vaihdan maksukortin?','Mistä näen laskut?','Missä hallitsen laskutusta?','Miten vaihdan maksutapaa?','Missä on tilauksen hallinta?'],
    sv:['Var byter jag betalkort?','Var ser jag fakturor?','Var hanterar jag faktureringen?','Hur byter jag betalningsmetod?','Var finns abonnemangshanteringen?'],
    en:['Where do I change my card?','Where can I see invoices?','Where do I manage billing?','How do I change my payment method?','Where is subscription management?']
  },['asiakasportaali','customer portal','kundportal','lasku','invoice','faktura']),

  faq('google-login','Tili',{
    fi:'Kyllä. Respondossa voi luoda tilin tai kirjautua Googlella, jos Google-kirjautuminen on käytössä.',
    sv:'Ja. I Respondo kan du skapa konto eller logga in med Google när Google-inloggning är tillgänglig.',
    en:'Yes. You can create an account or sign in to Respondo with Google when Google sign-in is available.'
  },{
    fi:['Voinko kirjautua Googlella?','Toimiiko Google-kirjautuminen?','Voinko luoda tilin Googlella?','Miten kirjaudun Google-tilillä?','Tarvitsenko salasanan jos käytän Googlea?'],
    sv:['Kan jag logga in med Google?','Fungerar Google-inloggning?','Kan jag skapa konto med Google?','Hur loggar jag in med Google?','Behöver jag lösenord om jag använder Google?'],
    en:['Can I sign in with Google?','Does Google login work?','Can I create an account with Google?','How do I log in with Google?','Do I need a password if I use Google?']
  },['google','kirjautuminen','login','inloggning']),

  faq('languages','Kielet',{
    fi:'Respondo tukee suomea, ruotsia ja englantia. Botti tunnistaa asiakkaan kysymyksen kielen ja pyrkii vastaamaan samalla kielellä.',
    sv:'Respondo stöder finska, svenska och engelska. Botten identifierar språket i kundens fråga och svarar på samma språk.',
    en:'Respondo supports Finnish, Swedish, and English. The bot detects the customer’s question language and answers in the same language.'
  },{
    fi:['Mitä kieliä Respondo tukee?','Toimiiko tämä englanniksi?','Vastaako botti ruotsiksi?','Osaako botti suomea ruotsia ja englantia?','Vaihtaako botti kieltä asiakkaan mukaan?'],
    sv:['Vilka språk stöder Respondo?','Fungerar det på engelska?','Svarar botten på svenska?','Kan botten finska svenska och engelska?','Byter botten språk efter kunden?'],
    en:['What languages does Respondo support?','Does it work in English?','Can the bot answer in Swedish?','Does it support Finnish Swedish and English?','Does the bot switch language for the customer?']
  },['suomi','ruotsi','englanti','finnish','swedish','english','finska','svenska','engelska']),

  faq('knowledge-base','Tietopohja',{
    fi:'Tietopohjaan tallennetaan yrityksen hyväksymät tiedot ja kysymys–vastausparit. Botti hakee kysymykseen sopivimman tiedon ja vastaa sen perusteella.',
    sv:'Kunskapsbasen innehåller företagets godkända uppgifter och frågor med svar. Botten hittar den information som bäst passar frågan och svarar utifrån den.',
    en:'The knowledge base stores company-approved information and Q&A pairs. The bot finds the information that best matches the question and answers from it.'
  },{
    fi:['Miten tietopohja toimii?','Mikä tietopohja on?','Mistä botti tietää vastaukset?','Mihin vastaukset tallennetaan?','Miten botti hakee tiedon?'],
    sv:['Hur fungerar kunskapsbasen?','Vad är kunskapsbasen?','Hur vet botten svaren?','Var sparas svaren?','Hur hittar botten informationen?'],
    en:['How does the knowledge base work?','What is the knowledge base?','How does the bot know the answers?','Where are answers stored?','How does the bot retrieve information?']
  },['tietopohja','knowledge base','kunskapsbas']),

  faq('website-import','Tietopohja',{
    fi:'Hallintapaneelin Hae tiedot sivultani -toiminto voi hakea yrityksen verkkosivulta olennaisia tietoja tietopohjaan, kuten palveluja, hintoja, yhteystietoja, aukioloaikoja ja tarjouspyyntölinkkejä.',
    sv:'Funktionen Hämta information från min webbplats kan hämta relevant information till kunskapsbasen, till exempel tjänster, priser, kontaktuppgifter, öppettider och offertlänkar.',
    en:'The Import from my website feature can bring relevant information into the knowledge base, such as services, prices, contact details, opening hours, and quote-request links.'
  },{
    fi:['Voiko Respondo hakea tiedot verkkosivultani?','Mitä Hae tiedot sivultani tekee?','Voinko tuoda sivuston tiedot automaattisesti?','Mitä tietoja sivulta haetaan?','Pitääkö kaikki vastaukset kirjoittaa itse?'],
    sv:['Kan Respondo hämta information från min webbplats?','Vad gör funktionen hämta från webbplats?','Kan jag importera webbplatsens information automatiskt?','Vilken information hämtas från sidan?','Måste jag skriva alla svar själv?'],
    en:['Can Respondo import information from my website?','What does Import from my website do?','Can I import website information automatically?','What information is imported from the site?','Do I need to write every answer manually?']
  },['import','verkkosivu','website','webbplats','palvelut','hinnat','aukioloajat']),

  faq('edit-knowledge','Tietopohja',{
    fi:'Kyllä. Tietopohjan kysymyksiä ja vastauksia voi lisätä, muokata ja poistaa hallintapaneelista.',
    sv:'Ja. Frågor och svar i kunskapsbasen kan läggas till, redigeras och tas bort i kontrollpanelen.',
    en:'Yes. Knowledge-base questions and answers can be added, edited, and removed from the dashboard.'
  },{
    fi:['Voinko muokata vastauksia?','Miten vaihdan botin vastauksen?','Voinko lisätä omia kysymyksiä?','Voinko poistaa tietopohjan vastauksen?','Saako tietoja päivitettyä myöhemmin?'],
    sv:['Kan jag redigera svaren?','Hur ändrar jag bottens svar?','Kan jag lägga till egna frågor?','Kan jag ta bort ett svar?','Kan informationen uppdateras senare?'],
    en:['Can I edit answers?','How do I change a bot answer?','Can I add my own questions?','Can I delete a knowledge-base answer?','Can I update information later?']
  },['muokkaa','edit','redigera','lisää','add','lägg till']),

  faq('unknown-answer','Botin toiminta',{
    fi:'Respondo ei arvaa. Jos yrityksen hyväksytyistä tiedoista ei löydy varmaa vastausta, botti kertoo sen ja kysymys voidaan ohjata yritykselle vastattavaksi.',
    sv:'Respondo gissar inte. Om det inte finns ett säkert svar i företagets godkända information säger botten det och frågan kan skickas vidare till företaget.',
    en:'Respondo does not guess. If no reliable answer exists in the company-approved information, the bot says so and the question can be routed to the business.'
  },{
    fi:['Mitä jos botti ei tiedä vastausta?','Keksiikö botti vastauksia?','Mitä tapahtuu jos tietoa ei löydy?','Voiko botti vastata väärin tahallaan?','Miten epävarmat kysymykset käsitellään?'],
    sv:['Vad händer om botten inte vet svaret?','Hittar botten på svar?','Vad händer om information saknas?','Gissar botten?','Hur hanteras osäkra frågor?'],
    en:['What happens if the bot does not know the answer?','Does the bot make up answers?','What happens if information is missing?','Does the bot guess?','How are uncertain questions handled?']
  },['ei arvaa','no guessing','gissar inte','handoff']),

  faq('lead-capture','Yhteydenotot',{
    fi:'Jos vastausta ei löydy, asiakas voi jättää nimensä sekä puhelinnumeron tai sähköpostin. Yhteydenottopyyntö näkyy yrityksen hallintapaneelissa.',
    sv:'Om ett svar saknas kan kunden lämna namn samt telefonnummer eller e-post. Kontaktförfrågan visas i företagets kontrollpanel.',
    en:'If an answer is missing, the customer can leave their name and either a phone number or email. The contact request appears in the company dashboard.'
  },{
    fi:['Voiko asiakas jättää yhteystietonsa?','Mihin asiakkaan yhteydenotto tallentuu?','Voiko botti kerätä liidejä?','Saanko asiakkaan puhelinnumeron botin kautta?','Voiko asiakas jättää sähköpostin?'],
    sv:['Kan kunden lämna sina kontaktuppgifter?','Var sparas kundens kontaktförfrågan?','Kan botten samla leads?','Kan jag få kundens telefonnummer via botten?','Kan kunden lämna e-post?'],
    en:['Can a customer leave contact details?','Where is a contact request saved?','Can the bot capture leads?','Can I get a customer phone number through the bot?','Can the customer leave an email address?']
  },['liidi','lead','yhteystiedot','contact details','kontaktuppgifter']),

  faq('conversations','Hallintapaneeli',{
    fi:'Hallintapaneelissa näet asiakkaiden keskusteluja ja kysymyksiä, jotta voit seurata mitä asiakkaat oikeasti kysyvät ja täydentää puuttuvia vastauksia.',
    sv:'I kontrollpanelen kan du se kundernas konversationer och frågor så att du ser vad kunder faktiskt frågar och kan komplettera saknade svar.',
    en:'The dashboard shows customer conversations and questions so you can see what customers actually ask and fill in missing answers.'
  },{
    fi:['Näenkö asiakkaiden kysymykset?','Tallentuuko keskustelut?','Mistä näen mitä asiakkaat kysyvät?','Onko keskusteluhistoriaa?','Voinko seurata botin keskusteluja?'],
    sv:['Kan jag se kundernas frågor?','Sparas konversationerna?','Var ser jag vad kunder frågar?','Finns samtalshistorik?','Kan jag följa bottens konversationer?'],
    en:['Can I see customer questions?','Are conversations saved?','Where can I see what customers ask?','Is there conversation history?','Can I monitor bot conversations?']
  },['keskustelut','conversations','konversationer','historia','history']),

  faq('human-takeover','Asiakaspalvelu',{
    fi:'Yritys voi luoda asiakaspalvelijaprofiileja ja ottaa keskustelun ihmiselle silloin, kun sitä tarvitaan. Keskustelu voidaan ohjata sopivaa kieltä osaavalle asiakaspalvelijalle.',
    sv:'Företaget kan skapa kundtjänstprofiler och ta över en konversation när det behövs. Samtalet kan styras till en medarbetare som kan rätt språk.',
    en:'A business can create support-agent profiles and take over a conversation when needed. Chats can be routed to an agent who speaks the appropriate language.'
  },{
    fi:['Voiko ihminen ottaa chatin haltuun?','Onko live-asiakaspalvelua?','Voinko luoda työntekijätilejä?','Voiko työntekijä vastata asiakkaalle?','Ohjataanko keskustelu oikean kielen osaajalle?'],
    sv:['Kan en människa ta över chatten?','Finns livekundservice?','Kan jag skapa medarbetarkonton?','Kan en anställd svara kunden?','Kan samtalet styras efter språk?'],
    en:['Can a human take over the chat?','Is live support available?','Can I create employee accounts?','Can an employee reply to a customer?','Can chats be routed by language?']
  },['live','työntekijä','employee','medarbetare','takeover']),

  faq('installation','Asennus',{
    fi:'Asennus tehdään kopioimalla hallintapaneelin Asennus-kohdassa oleva scriptikoodi verkkosivun HTML:ään juuri ennen sulkevaa </body>-tagia.',
    sv:'Installationen görs genom att kopiera skriptkoden från Installation i kontrollpanelen till webbplatsens HTML precis före den avslutande </body>-taggen.',
    en:'Installation is done by copying the script code from Installation in the dashboard into the website HTML just before the closing </body> tag.'
  },{
    fi:['Miten Respondo asennetaan?','Mihin asennuskoodi laitetaan?','Miten lisään botin sivuilleni?','Tarvitaanko koodausta?','Mistä saan asennuskoodin?'],
    sv:['Hur installerar jag Respondo?','Var ska installationskoden placeras?','Hur lägger jag botten på min webbplats?','Behövs kodning?','Var får jag installationskoden?'],
    en:['How do I install Respondo?','Where do I place the installation code?','How do I add the bot to my website?','Do I need coding skills?','Where do I get the installation code?']
  },['asennus','installation','script','body','HTML']),

  faq('one-website','Asennus',{
    fi:'Nykyinen tilaus on sidottu yhteen määritettyyn verkkosivuun. Hallintapaneelin asennuskoodi toimii sille sivustolle, joka on asetettu yrityksen verkkosivuksi.',
    sv:'Det nuvarande abonnemanget är kopplat till en angiven webbplats. Installationskoden fungerar för den webbplats som har angetts för företaget.',
    en:'The current subscription is linked to one configured website. The installation code works for the website set as the company website.'
  },{
    fi:['Monelle sivustolle botin voi asentaa?','Voinko käyttää samaa koodia kahdella sivulla?','Onko tilaus yhdelle verkkosivulle?','Mihin domainiin asennuskoodi toimii?','Voinko asentaa botin moneen domainiin?'],
    sv:['På hur många webbplatser kan botten installeras?','Kan jag använda samma kod på två webbplatser?','Är abonnemanget för en webbplats?','Vilken domän fungerar installationskoden på?','Kan jag installera botten på flera domäner?'],
    en:['How many websites can I install the bot on?','Can I use the same code on two websites?','Is the plan for one website?','Which domain does the install code work on?','Can I install the bot on multiple domains?']
  },['1 sivusto','one website','en webbplats','domain']),

  faq('customize-bot','Ulkoasu',{
    fi:'Kyllä. Hallintapaneelissa voit vaihtaa botin nimen ja kuvan, jotka näkyvät asiakkaalle chatissa.',
    sv:'Ja. I kontrollpanelen kan du ändra bottens namn och bild som visas för kunden i chatten.',
    en:'Yes. In the dashboard you can change the bot name and image shown to customers in chat.'
  },{
    fi:['Voiko botin ulkoasua muokata?','Voinko vaihtaa botin nimen?','Voinko vaihtaa botin kuvan?','Saako chatista oman näköisen?','Mistä muutan botin profiilia?'],
    sv:['Kan jag ändra bottens utseende?','Kan jag byta namn på botten?','Kan jag byta bottens bild?','Kan jag anpassa chatten?','Var ändrar jag botprofilen?'],
    en:['Can I customize the bot appearance?','Can I change the bot name?','Can I change the bot image?','Can I customize the chat?','Where do I edit the bot profile?']
  },['botin nimi','bot name','botnamn','avatar','kuva','image']),

  faq('security','Tietoturva',{
    fi:'Respondo käyttää salattuja HTTPS-yhteyksiä. Salasanat tallennetaan yksisuuntaisesti hajautettuina, OAuth-tunnisteita suojataan palvelimella ja maksukorttitiedot käsittelee Stripe.',
    sv:'Respondo använder krypterade HTTPS-anslutningar. Lösenord lagras som envägshashar, OAuth-uppgifter skyddas på servern och kortuppgifter behandlas av Stripe.',
    en:'Respondo uses encrypted HTTPS connections. Passwords are stored as one-way hashes, OAuth credentials are protected server-side, and payment-card details are handled by Stripe.'
  },{
    fi:['Onko Respondo turvallinen?','Miten tietoturva on hoidettu?','Onko yhteys salattu?','Miten salasanat säilytetään?','Tallentaako Respondo korttitietoni?'],
    sv:['Är Respondo säkert?','Hur fungerar datasäkerheten?','Är anslutningen krypterad?','Hur lagras lösenord?','Lagrar Respondo mina kortuppgifter?'],
    en:['Is Respondo secure?','How is security handled?','Is the connection encrypted?','How are passwords stored?','Does Respondo store my card details?']
  },['https','tietoturva','security','säkerhet','hash','stripe']),

  faq('privacy','Tietosuoja',{
    fi:'Respondo käsittelee henkilötietoja palvelun toteuttamiseen ja turvalliseen toimintaan. Yritysasiakkaan puolesta käsiteltäviä tietoja käsitellään palvelun käyttötarkoituksen ja asiakkaan ohjeiden mukaisesti. Tarkemmat tiedot löytyvät tietosuojaselosteesta ja tietojenkäsittelysivulta.',
    sv:'Respondo behandlar personuppgifter för att leverera tjänsten och hålla den säker. Uppgifter som behandlas för företagskunden hanteras enligt tjänstens syfte och kundens instruktioner. Mer information finns i integritetspolicyn och sidan om databehandling.',
    en:'Respondo processes personal data to provide and secure the service. Data processed on behalf of a business customer is handled according to the service purpose and customer instructions. Details are available in the Privacy Policy and Data Processing page.'
  },{
    fi:['Miten tietosuoja toimii?','Mitä henkilötietoja käsittelette?','Missä tietosuojaseloste on?','Onko GDPR huomioitu?','Miten asiakastietoja käsitellään?'],
    sv:['Hur fungerar integriteten?','Vilka personuppgifter behandlar ni?','Var finns integritetspolicyn?','Hur hanteras GDPR?','Hur behandlas kunduppgifter?'],
    en:['How does privacy work?','What personal data do you process?','Where is the privacy policy?','How is GDPR handled?','How is customer data processed?']
  },['tietosuoja','privacy','integritet','gdpr','henkilötiedot']),

  faq('data-ownership','Tietosuoja',{
    fi:'Asiakas säilyttää oikeudet itse Respondoon lisäämäänsä aineistoon. Respondo saa vain palvelun toteuttamiseen tarvittavan käyttöoikeuden.',
    sv:'Kunden behåller rättigheterna till material som kunden själv lägger in i Respondo. Respondo får endast den användningsrätt som behövs för att leverera tjänsten.',
    en:'The customer retains rights to the material they add to Respondo. Respondo receives only the usage rights needed to provide the service.'
  },{
    fi:['Kuka omistaa tietopohjan tiedot?','Säilyykö omistusoikeus omiin tietoihini?','Omistaako Respondo asiakkaan sisällön?','Mitä oikeuksia annan Respondolle?','Kenen data tietopohjassa on?'],
    sv:['Vem äger informationen i kunskapsbasen?','Behåller jag rättigheterna till min information?','Äger Respondo kundens innehåll?','Vilka rättigheter ger jag Respondo?','Vems data finns i kunskapsbasen?'],
    en:['Who owns the knowledge-base content?','Do I retain rights to my data?','Does Respondo own customer content?','What rights do I give Respondo?','Whose data is in the knowledge base?']
  },['omistus','ownership','äganderätt','data']),

  faq('24-7','Botin toiminta',{
    fi:'Kyllä. Verkkosivubotti on tarkoitettu vastaamaan asiakkaiden kysymyksiin ympäri vuorokauden silloin, kun palvelu ja asiakkaan verkkosivusto ovat käytettävissä.',
    sv:'Ja. Webbplatsbotten är avsedd att svara på kundfrågor dygnet runt när tjänsten och kundens webbplats är tillgängliga.',
    en:'Yes. The website bot is designed to answer customer questions around the clock while the service and customer website are available.'
  },{
    fi:['Vastaako botti 24/7?','Toimiiko Respondo öisin?','Saako asiakas vastauksen viikonloppuna?','Onko botti aina päällä?','Toimiiko asiakaspalvelu ympäri vuorokauden?'],
    sv:['Svarar botten dygnet runt?','Fungerar Respondo på natten?','Får kunden svar på helgen?','Är botten alltid på?','Fungerar kundservicen dygnet runt?'],
    en:['Does the bot answer 24/7?','Does Respondo work at night?','Can customers get answers on weekends?','Is the bot always on?','Does customer service work around the clock?']
  },['24/7','ympäri vuorokauden','dygnet runt','around the clock']),

  faq('benefits','Tuote',{
    fi:'Respondon hyöty on se, että asiakas saa vastauksen nopeasti myös silloin, kun yrityksen henkilö ei ehdi vastaamaan. Samalla toistuvat kysymykset vähenevät ja puuttuvat tiedot näkyvät hallintapaneelissa täydennettäviksi.',
    sv:'Fördelen med Respondo är att kunden får ett snabbt svar även när företagets personal inte hinner svara. Samtidigt minskar upprepade frågor och saknade svar blir synliga i kontrollpanelen.',
    en:'The benefit of Respondo is that customers get fast answers even when staff are busy. Repetitive questions are reduced and missing information becomes visible in the dashboard for improvement.'
  },{
    fi:['Mitä hyötyä Respondosta on?','Miksi käyttäisin Respondoa?','Mitä arvoa tästä saa?','Miten tämä auttaa yritystä?','Miksi asiakaspalvelubotti kannattaa?'],
    sv:['Vad är nyttan med Respondo?','Varför ska jag använda Respondo?','Vilket värde ger tjänsten?','Hur hjälper det företaget?','Varför är en kundservicebot bra?'],
    en:['What are the benefits of Respondo?','Why should I use Respondo?','What value does it provide?','How does it help a business?','Why use a customer-service bot?']
  },['hyöty','benefit','nytta','nopea vastaus']),

  faq('contact','Yhteydenotot',{
    fi:'Voit ottaa Respondoon yhteyttä verkkosivun Ota yhteyttä -osiosta tai sivustolla näkyvän tukisähköpostin kautta.',
    sv:'Du kan kontakta Respondo via avsnittet Kontakta oss på webbplatsen eller via supportadressen som visas där.',
    en:'You can contact Respondo through the Contact section on the website or via the support email shown there.'
  },{
    fi:['Miten otan yhteyttä?','Mistä saan yhteyden Respondoon?','Missä on asiakaspalvelun yhteystiedot?','Mikä on tukisähköposti?','Mihin voin lähettää viestin?'],
    sv:['Hur kontaktar jag er?','Hur får jag kontakt med Respondo?','Var finns kundtjänstens kontaktuppgifter?','Vad är supportadressen?','Var kan jag skicka ett meddelande?'],
    en:['How do I contact you?','How can I contact Respondo?','Where are the support contact details?','What is the support email?','Where can I send a message?']
  },['ota yhteyttä','contact','kontakta','support']),

  faq('calendar','Integraatiot',{
    fi:'Respondo voi käyttää asiakkaan erikseen yhdistämää Google Calendaria esimerkiksi varausten saatavuuden tarkistamiseen ja kalenteritapahtumien luomiseen.',
    sv:'Respondo kan använda Google Calendar som kunden själv ansluter, till exempel för att kontrollera lediga tider och skapa kalenderhändelser.',
    en:'Respondo can use a Google Calendar connected by the customer, for example to check booking availability and create calendar events.'
  },{
    fi:['Voiko Google Calendarin yhdistää?','Toimiiko ajanvaraus Google Kalenterilla?','Voiko botti tarkistaa vapaat ajat?','Voiko botti tehdä kalenterimerkinnän?','Mitä Google Calendar -integraatio tekee?'],
    sv:['Kan Google Calendar anslutas?','Fungerar bokning med Google Kalender?','Kan botten kontrollera lediga tider?','Kan botten skapa kalenderhändelser?','Vad gör Google Calendar-integrationen?'],
    en:['Can I connect Google Calendar?','Does booking work with Google Calendar?','Can the bot check available times?','Can the bot create calendar events?','What does the Google Calendar integration do?']
  },['google calendar','ajanvaraus','booking','bokning','kalenteri']),

  faq('quotes','Toiminnot',{
    fi:'Respondo voi käsitellä tarjous- ja yhteydenottopyyntöjä, jos yritys on määrittänyt tarvittavat tiedot ja toiminnot hallintapaneelissa.',
    sv:'Respondo kan hantera offert- och kontaktförfrågningar när företaget har konfigurerat nödvändiga uppgifter och funktioner i kontrollpanelen.',
    en:'Respondo can handle quote and contact requests when the business has configured the required information and actions in the dashboard.'
  },{
    fi:['Voiko botilta pyytää tarjouksen?','Voiko Respondo tehdä tarjouspyynnön?','Toimiiko tarjouslaskuri?','Voiko asiakas jättää tarjouspyynnön chatissa?','Miten tarjouspyynnöt toimivat?'],
    sv:['Kan kunden begära offert via botten?','Kan Respondo skapa en offertförfrågan?','Finns offertberäkning?','Kan kunden lämna offertförfrågan i chatten?','Hur fungerar offertförfrågningar?'],
    en:['Can a customer request a quote from the bot?','Can Respondo create a quote request?','Does quote calculation work?','Can customers leave quote requests in chat?','How do quote requests work?']
  },['tarjous','quote','offert']),

  faq('customer-payments','Toiminnot',{
    fi:'Yritys voi yhdistää oman Stripe-tilinsä, jolloin chatissa muodostettu tarjous voi ohjata asiakkaan maksamaan suoraan yrityksen omalle Stripe-tilille.',
    sv:'Företaget kan ansluta sitt eget Stripe-konto så att en offert i chatten kan leda kunden till betalning direkt till företagets Stripe-konto.',
    en:'A business can connect its own Stripe account so a quote created in chat can direct the customer to pay directly to the business’s Stripe account.'
  },{
    fi:['Voiko asiakas maksaa chatissa?','Voinko yhdistää yritykseni Stripen?','Meneekö asiakkaan maksu minun Stripeeni?','Voiko tarjouksesta siirtyä maksuun?','Onko maksulinkki mahdollista?'],
    sv:['Kan kunden betala via chatten?','Kan jag ansluta företagets Stripe?','Går kundens betalning till mitt Stripe-konto?','Kan en offert leda till betalning?','Kan botten skapa en betalningslänk?'],
    en:['Can a customer pay from the chat?','Can I connect my business Stripe account?','Does the customer payment go to my Stripe?','Can a quote lead to payment?','Can the bot provide a payment link?']
  },['stripe connect','maksu','payment','betalning']),

  faq('legal','Lakiasiat',{
    fi:'Respondon sivustolta löytyvät käyttöehdot, tietosuojaseloste, evästetiedot, tietojenkäsittelyä koskevat tiedot ja tietoturvasivu.',
    sv:'På Respondos webbplats finns användarvillkor, integritetspolicy, cookieinformation, databehandlingsinformation och en sida om datasäkerhet.',
    en:'The Respondo website includes Terms of Service, Privacy Policy, cookie information, Data Processing information, and a Security page.'
  },{
    fi:['Mistä löydän käyttöehdot?','Onko tietosuojaselostetta?','Missä DPA on?','Mistä löydän evästetiedot?','Onko tietoturvasivua?'],
    sv:['Var hittar jag användarvillkoren?','Finns en integritetspolicy?','Var finns DPA-informationen?','Var hittar jag cookieinformationen?','Finns en sida om datasäkerhet?'],
    en:['Where can I find the terms?','Is there a privacy policy?','Where is the DPA information?','Where can I find cookie information?','Is there a security page?']
  },['käyttöehdot','terms','användarvillkor','privacy','dpa','cookies']),

  faq('cookies','Tietosuoja',{
    fi:'Respondo käyttää palvelun toiminnan kannalta välttämättömiä evästeitä. Valinnainen kävijäanalytiikka käynnistyy vain käyttäjän valinnan mukaisesti, ja evästeasetuksia voi muuttaa sivustolla.',
    sv:'Respondo använder nödvändiga cookies för tjänstens funktion. Valfri besöksanalys används enligt användarens val, och cookieinställningarna kan ändras på webbplatsen.',
    en:'Respondo uses cookies necessary for the service to function. Optional visitor analytics follows the user’s choice, and cookie preferences can be changed on the website.'
  },{
    fi:['Käyttääkö Respondo evästeitä?','Voinko estää analytiikkaevästeet?','Miten muutan evästeasetuksia?','Mitä evästeitä käytätte?','Onko analytiikka pakollinen?'],
    sv:['Använder Respondo cookies?','Kan jag neka analyscookies?','Hur ändrar jag cookieinställningar?','Vilka cookies används?','Är analys obligatorisk?'],
    en:['Does Respondo use cookies?','Can I reject analytics cookies?','How do I change cookie settings?','What cookies do you use?','Is analytics mandatory?']
  },['eväste','cookie','analytics','analytiikka']),

  faq('service-availability','Palvelu',{
    fi:'Palvelua kehitetään jatkuvasti. Huollot, tietoliikennehäiriöt tai ulkopuolisten palvelujen häiriöt voivat joskus aiheuttaa käyttökatkoja.',
    sv:'Tjänsten utvecklas kontinuerligt. Underhåll, nätverksproblem eller störningar i externa tjänster kan ibland orsaka avbrott.',
    en:'The service is continuously developed. Maintenance, network issues, or outages in external services can sometimes cause interruptions.'
  },{
    fi:['Voiko palvelussa olla käyttökatkoja?','Onko Respondo aina saatavilla?','Mitä jos palvelu on alhaalla?','Voiko huolto katkaista palvelun?','Onko 100 prosentin käyttöaikatakuuta?'],
    sv:['Kan tjänsten ha avbrott?','Är Respondo alltid tillgängligt?','Vad händer om tjänsten ligger nere?','Kan underhåll orsaka avbrott?','Finns 100 procents drifttidsgaranti?'],
    en:['Can the service have outages?','Is Respondo always available?','What if the service is down?','Can maintenance interrupt service?','Is there a 100 percent uptime guarantee?']
  },['käyttökatko','outage','avbrott','maintenance','huolto']),

  faq('data-update','Tietopohja',{
    fi:'Kun muutat yrityksen tietoja tai tietopohjan vastauksia hallintapaneelissa, botti käyttää päivitettyjä hyväksyttyjä tietoja tuleviin vastauksiin.',
    sv:'När du uppdaterar företagsuppgifter eller svar i kunskapsbasen använder botten den uppdaterade godkända informationen i kommande svar.',
    en:'When you update company details or knowledge-base answers in the dashboard, the bot uses the updated approved information for future replies.'
  },{
    fi:['Milloin muutokset päivittyvät bottiin?','Käyttääkö botti uusinta tietoa?','Jos muutan hintaa niin päivittyykö vastaus?','Miten päivitän aukioloajat?','Voinko korjata väärän tiedon?'],
    sv:['När uppdateras ändringar i botten?','Använder botten den senaste informationen?','Uppdateras svaret om jag ändrar priset?','Hur uppdaterar jag öppettider?','Kan jag rätta fel information?'],
    en:['When do changes update in the bot?','Does the bot use the latest information?','If I change a price will the answer update?','How do I update opening hours?','Can I correct wrong information?']
  },['päivitä','update','uppdatera','uusin tieto']),

  faq('no-paid-ai-required','Tekniikka',{
    fi:'Respondon nykyinen perusvastauslogiikka ja tietopohjahaku on rakennettu toimimaan palvelun omalla toteutuksella. Mahdolliset ulkopuoliset integraatiot riippuvat niiden omista asetuksista ja palveluista.',
    sv:'Respondos nuvarande grundläggande svarlogik och kunskapsbassökning är byggd för att fungera i tjänstens egen implementation. Externa integrationer beror på respektive tjänsts inställningar.',
    en:'Respondo’s current core answer logic and knowledge-base retrieval are built into the service. Optional external integrations depend on their own configuration and providers.'
  },{
    fi:['Tarvitseeko asiakkaan ostaa erillinen AI-API?','Pitääkö minun hankkia OpenAI-avain?','Tuleeko botista erillisiä API-kuluja?','Tarvitsenko oman tekoälytilin?','Toimiiko perusbotti ilman omaa API-avainta?'],
    sv:['Behöver kunden köpa ett separat AI-API?','Måste jag skaffa en OpenAI-nyckel?','Tillkommer separata API-kostnader?','Behöver jag ett eget AI-konto?','Fungerar grundbotten utan egen API-nyckel?'],
    en:['Do customers need to buy a separate AI API?','Do I need my own OpenAI key?','Are there separate API charges for the bot?','Do I need my own AI account?','Does the core bot work without my own API key?']
  },['api','openai','erillinen kulu','separate api']),

  faq('company-control','Tietopohja',{
    fi:'Yritys päättää, mitä tietoja botille annetaan. Respondo käyttää hyväksyttyä tietopohjaa, ja yritys voi muokata sitä hallintapaneelista.',
    sv:'Företaget bestämmer vilken information botten får. Respondo använder den godkända kunskapsbasen och företaget kan redigera den i kontrollpanelen.',
    en:'The business decides what information the bot receives. Respondo uses the approved knowledge base, which the business can edit in the dashboard.'
  },{
    fi:['Kuka päättää mitä botti sanoo?','Voinko hallita botin tietoja?','Saanko hyväksyä vastaukset itse?','Mistä botin tieto tulee?','Onko yrityksellä kontrolli vastauksista?'],
    sv:['Vem bestämmer vad botten säger?','Kan jag styra bottens information?','Kan jag själv godkänna svaren?','Var kommer bottens information från?','Har företaget kontroll över svaren?'],
    en:['Who decides what the bot says?','Can I control the bot information?','Can I approve answers myself?','Where does the bot information come from?','Does the business control the answers?']
  },['hallinta','control','kontroll','approved']),

  faq('mobile','Käyttö',{
    fi:'Respondo on verkkopohjainen palvelu ja hallintapaneelia sekä verkkosivubottia voi käyttää nykyaikaisella puhelimen tai tietokoneen selaimella.',
    sv:'Respondo är en webbaserad tjänst och både kontrollpanelen och webbplatsbotten kan användas i moderna webbläsare på mobil och dator.',
    en:'Respondo is web-based, and both the dashboard and website bot can be used in modern mobile and desktop browsers.'
  },{
    fi:['Toimiiko Respondo puhelimella?','Voinko käyttää hallintapaneelia mobiilissa?','Toimiiko botti tietokoneella?','Tarvitaanko sovellus?','Onko palvelu selainpohjainen?'],
    sv:['Fungerar Respondo på mobilen?','Kan jag använda kontrollpanelen på mobil?','Fungerar botten på dator?','Behöver jag en app?','Är tjänsten webbaserad?'],
    en:['Does Respondo work on mobile?','Can I use the dashboard on my phone?','Does the bot work on desktop?','Do I need an app?','Is the service web-based?']
  },['mobiili','mobile','mobil','selain','browser','webbläsare'])
];

export function respondoOwnerFaqRows() {
  const rows = [];
  for (const item of RESPONDO_OWNER_FAQ) {
    for (const lang of ['fi','sv','en']) {
      const qs = item.questions[lang] || [];
      const answer = item.answers[lang];
      qs.forEach((title, index) => {
        rows.push({
          key: item.key + ':' + lang + ':' + index,
          category: item.category + ' · ' + lang.toUpperCase(),
          title,
          answer,
          keywords: [...item.keywords, item.key, lang],
          lang
        });
      });
    }
  }
  return rows;
}
