// Search-intent page for broad ecommerce chat questions. This is one buyer-helpful
// resource in three languages, not one doorway page per keyword.
const copy={
  fi:{
    title:'Chat-palvelu verkkokauppaan: tuotteet ja asiakaspalvelu | Respondo AI',
    description:'Verkkokaupan chat-palvelu vastaa tuote-, toimitus- ja palautuskysymyksiin yrityksen tiedoilla. Näin valitset ja testaat AI-chatbotin.',
    tag:'VERKKOKAUPAN CHAT-PALVELU',
    h1:'Chat-palvelu verkkokauppaan – oikeat vastaukset ennen ostopäätöstä',
    lead:'Verkkokaupan asiakkaat haluavat tietää tuotteen hinnan, vaihtoehdot, toimitusajan ja palautusehdot. AI-chatbot voi vastata yrityksen hyväksytyillä tiedoilla ja ohjata tarvittaessa ihmiselle.',
    sections:[
      ['Mitä verkkokaupan chat-palvelu tekee?','Chat-palvelu verkkokauppaan on asiakkaan kanssa keskusteleva tuki ostopolun aikana. Se voi kertoa tuotteista, yrityksen ilmoittamista hinnoista, toimitusvaihtoehdoista, palautuskäytännöistä ja yhteystiedoista. Asiakas voi kysyä vapaalla tekstillä eikä hänen tarvitse etsiä tietoa useilta sivuilta. Vastauksen tulee perustua ajantasaiseen tuotetietoon – ei arvattuun varastosaldoon tai toimituslupaukseen.'],
      ['AI-chatbot vai tavallinen livechat?','Perinteinen livechat yhdistää asiakkaan työntekijään ja toimii parhaiten, kun henkilökunta pystyy vastaamaan nopeasti. AI-chatbot voi käsitellä yleisiä kysymyksiä myös silloin, kun asiakaspalvelija ei ole paikalla. Monelle kaupalle sopii yhdistelmä: automaattiset vastaukset yleisiin kysymyksiin ja yhteydenotto tai ihmisen keskusteluun liittyminen, kun asia on poikkeuksellinen.'],
      ['Tuote-, toimitus- ja palautustiedot kuntoon','Kerää ensin verkkokaupan todelliset tuotekuvaukset, hinnat, toimitusmaksut, palautusehdot sekä asiakaspalvelun yhteystiedot. Respondo AI:ssa verkkosivuston tietojen tuontia voi hyödyntää tietopohjan rakentamisessa, mutta tulokset pitää tarkistaa ennen niiden käyttämistä asiakasvastauksissa. Jos tieto muuttuu, myös tietopohja on päivitettävä.'],
      ['Shopify-chatbotin asentaminen ja testaaminen','Shopify-verkkokauppaan chat-widget voidaan lisätä kaupan teeman ohjeiden mukaisesti. Ennen julkaisua testaa esimerkiksi: ”Onko tästä muita kokoja?”, ”Paljonko toimitus maksaa?”, ”Voinko palauttaa tuotteen?” ja ”Mistä löydän tuotteen?”. Tarkista, että vastauksissa näkyvät oikeat tuotelinkit eikä botti väitä olematonta alennusta, kokoa tai toimitusaikaa.'],
      ['Miten chat-palvelun hyötyä seurataan?','Seuraa esimerkiksi tuotteisiin johtavia klikkauksia, oikein vastattuja kysymyksiä, jatkokäsittelyyn siirrettyjä tilanteita ja yhteydenottopyyntöjen laatua. Pelkkä keskustelujen määrä ei kerro myynnin kasvusta. Mittaa muutosta riittävän pitkällä ajanjaksolla ja huomioi mahdolliset muutokset kävijämäärissä.']
    ],
    questions:[
      ['Voiko verkkokaupan chatbot vastata tuotteiden hinnoista?','Kyllä, kun hinta löytyy yrityksen hyväksytyistä ja päivitetyistä tuotetiedoista. Botti ei saa keksiä puuttuvaa hintaa tai alennusta.'],
      ['Sopiiko Respondo AI Shopify-verkkokauppaan?','Respondo AI:n verkkosivubotin voi asentaa Shopify-kauppaan teeman mukaisesti. Käyttöönotto ja mahdolliset integraatiot riippuvat kaupan asetuksista.'],
      ['Onko AI-chatbot sama kuin livechat?','Ei aivan. AI-chatbot vastaa automaattisesti dokumentoituihin kysymyksiin, kun taas livechatissa vastaa yleensä ihminen. Tarvittaessa molemmat voidaan yhdistää.'],
      ['Entä jos asiakkaan kysymykseen ei löydy vastausta?','Botti voi kertoa tiedon puuttuvan ja ohjata asiakkaan yhteydenottoon tai henkilökunnan jatkokäsittelyyn.']
    ],
    related:'Lue myös', notice:'Respondo AI:n maksulliset yritystilaukset ovat tällä hetkellä saatavilla Suomessa.', demo:'Kokeile bottia', prices:'Katso hinnat'
  },
  sv:{
    title:'Chattjänst för webbutik och AI-chatbot | Respondo AI',
    description:'Så hjälper en chattjänst webbutikens kunder med produkter, leveranser och returer. En praktisk guide till AI-chatbot och Shopify.',
    tag:'CHATTJÄNST FÖR WEBBUTIK',
    h1:'Chattjänst för webbutik – hjälp kunderna före köpet',
    lead:'Besökare vill hitta rätt produkt, pris, leveranssätt och returvillkor. En AI-chatbot kan svara med butikens godkända uppgifter och överlämna osäkra frågor till personal.',
    sections:[
      ['Vad gör en chatbot i en webbutik?','En chattjänst kan hjälpa kunder att hitta produktuppgifter, priser, leveransalternativ, returvillkor och kontaktvägar. Besökaren ställer frågor med egna ord. Svaren ska komma från butikens aktuella och godkända information, inte från påhittade lagerantal eller leveranslöften.'],
      ['AI-chatbot eller vanlig livechatt?','I en traditionell livechatt svarar en anställd. En AI-chatbot kan hantera dokumenterade rutinfrågor även utanför bemannade tider. De kan komplettera varandra när svåra frågor behöver mänskligt omdöme eller en individuell bedömning.'],
      ['Granska produkt- och leveransinformation','Samla verkliga produktbeskrivningar, priser, leveransavgifter, returregler och kontaktuppgifter. Respondo AI kan hjälpa till att hämta information från en webbplats, men företaget behöver granska den och hålla kunskapsbasen uppdaterad när villkoren ändras.'],
      ['Installation och tester för Shopify','Lägg till webbplatswidgeten enligt instruktionerna för butikens tema. Prova frågor om produktvarianter, leveranskostnader, returvillkor och direkta produktlänkar. Kontrollera att chatbotten inte hittar på rabatter eller lagersaldon.'],
      ['Mät kundnytta, inte bara chattvolym','Följ korrekta svar, relevanta produktklick, kontaktförfrågningar och ärenden som lämnas över till personal. En hög chattvolym betyder inte automatiskt högre försäljning.']
    ],
    questions:[
      ['Kan en chatbot svara på produktpriser?','Ja, när aktuella priser finns i butikens granskade information. Saknade priser ska inte gissas.'],
      ['Fungerar Respondo AI med Shopify?','Webbplatswidgeten kan installeras i ett Shopify-tema enligt butikens installationsinställningar.'],
      ['Är en AI-chatbot samma sak som livechatt?','Nej. AI-chatboten besvarar rutinfrågor automatiskt medan en anställd vanligtvis svarar i livechatt.'],
      ['Vad händer om svaret saknas?','Kunden bör kunna kontakta företaget eller få frågan vidarebefordrad för mänsklig uppföljning.']
    ],
    related:'Relaterade guider',notice:'Betalda Respondo AI-abonnemang finns för närvarande tillgängliga i Finland.',demo:'Testa chatbotten',prices:'Se priser'
  },
  en:{
    title:'Ecommerce Customer Service Chatbot for Online Stores | Respondo AI',
    description:'Learn how an ecommerce customer service chatbot helps with product questions, shipping, returns and Shopify customer support using verified store data.',
    tag:'ECOMMERCE CUSTOMER SERVICE CHATBOT',
    h1:'Ecommerce customer service chatbot for online stores',
    lead:'Shoppers need accurate product details, shipping information and return policies before ordering. An AI customer service chatbot can answer recurring questions using approved store information and hand complex issues to a person.',
    sections:[
      ['What does an online store chatbot answer?','A website chat service helps shoppers ask about products, variants, prices, delivery options, return policies and contact details in natural language. Answers should reflect the store’s current approved facts. A customer service AI chatbot should not invent availability, promotions or arrival dates when the shop has not provided them.'],
      ['AI customer service chatbot versus live chat','Traditional live chat relies on a person being available to respond. An AI chatbot can handle well-documented questions outside staffed support hours, while human agents remain important for disputes, unusual orders, refunds and individual assessments. Many shops benefit from offering both options.'],
      ['Build reliable product and policy knowledge','Collect product descriptions, actual prices, shipping fees, returns terms and store contact information. Respondo AI offers website-information import to help build a knowledge base, but the business must review imported answers and update them when products or policies change. Accurate sourcing matters more than generating an answer to every question.'],
      ['Shopify setup and practical tests','Install the website chat widget according to your Shopify theme instructions. Test sample questions about size options, shipping costs, product links and refunds. Review whether the bot points to the right products, maintains correct prices and acknowledges missing details rather than confidently guessing.'],
      ['Measure the impact on the customer journey','Track validated answers, clicks to relevant product pages, useful contact requests and human handoffs. Conversation counts alone do not prove additional sales. Compare results over a meaningful period and account for changes in traffic and promotions.']
    ],
    questions:[
      ['Can an AI customer service chatbot show product prices?','Yes, when the store provides verified, current prices. Missing prices or discounts should not be invented.'],
      ['Can I use Respondo AI with Shopify?','The Respondo AI website chat widget can be installed on a Shopify storefront according to the theme setup instructions.'],
      ['Is a customer service AI chatbot the same as live chat?','No. AI chatbots answer documented questions automatically, while live chat generally connects a customer to a human employee.'],
      ['What if the chatbot cannot answer a question?','It should acknowledge uncertainty and offer contact details or a way to hand the issue to a person.']
    ],
    related:'Related guides',notice:'Respondo AI paid business subscriptions are currently available in Finland.',demo:'Try the chatbot',prices:'Compare plans'
  }
};
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const url=(path,l)=>path+(l==='en'?'':'?lang='+l);
export function ecommerceCustomerServiceMeta(lang='fi'){
  const d=copy[['fi','sv','en'].includes(lang)?lang:'fi'];
  return [d.title,d.description];
}
export function ecommerceCustomerServiceMarkup(lang='fi'){
  const L=['fi','sv','en'].includes(lang)?lang:'fi',d=copy[L];
  const sections=d.sections.map(([title,body])=>'<section class="ai-topic-section"><h2>'+esc(title)+'</h2><p>'+esc(body)+'</p></section>').join('');
  const faqs=d.questions.map(([q,a])=>'<details class="ai-topic-faq"><summary>'+esc(q)+'</summary><p>'+esc(a)+'</p></details>').join('');
  const labels={
    fi:['Shopify-chatbotin opas','Monikielinen asiakaspalvelubotti','Asiakaspalvelijabotti yritykselle','Kysy lisää'],
    sv:['Guide till Shopify-chatbot','Flerspråkig kundservicebot','Kundservicebot för företag','Kontakta oss'],
    en:['Shopify chatbot setup','Multilingual customer service bot','AI customer support bot','Contact us']
  }[L];
  const links=['/shopify-chatbot','/monikielinen-chatbot','/asiakaspalvelubotti','/yhteystiedot']
    .map((path,i)=>'<a href="'+esc(url(path,L))+'">'+esc(labels[i])+' →</a>').join('');
  return '<main class="ai-topic-page ecommerce-customer-service">'+
    '<section class="seo-landing-hero"><div class="container seo-landing-hero-inner"><span class="section-kicker">'+esc(d.tag)+'</span>'+
    '<h1>'+esc(d.h1)+'</h1><p>'+esc(d.lead)+'</p>'+
    '<div class="seo-landing-actions"><a class="btn ink" href="'+esc(url('/assistant',L))+'">'+esc(d.demo)+'</a><a class="btn ghost" href="'+esc(url('/hinnat',L))+'">'+esc(d.prices)+'</a></div></div></section>'+
    '<section class="section ai-topic-body"><div class="container ai-topic-prose">'+sections+'</div></section>'+
    '<section class="section ai-topic-faq-area"><div class="container ai-topic-prose"><h2>'+esc({fi:'Usein kysyttyä verkkokaupan chat-palvelusta',sv:'Vanliga frågor om webbutikschatt',en:'Frequently asked questions about ecommerce chatbots'}[L])+'</h2>'+faqs+'</div></section>'+
    '<section class="section seo-landing-closing"><div class="container"><div class="seo-landing-closing-card"><h2>'+esc(d.related)+'</h2><nav class="ai-topic-links" aria-label="'+esc(d.related)+'">'+links+'</nav><p class="ai-topic-notice">'+esc(d.notice)+'</p></div></div></section></main>';
}
