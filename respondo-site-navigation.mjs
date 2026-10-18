// Public Respondo website navigation: explicit, same-site destinations only.
// The marketing assistant uses this directory to guide visitors without a
// separate "Site pages" list in the footer. Customer widgets never use it.
const normalize=(value)=>String(value||'').toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s-]/g,' ')
  .replace(/\s+/g,' ').trim();
const tr=(lang,fi,sv,en)=>lang==='sv'?sv:lang==='en'?en:fi;
const pages=[
  {type:'site_login',path:'/kirjaudu',
   match:/\b(kirjau[dt]\w*|sisaan kirjaut\w*|logga in|logga in|inloggn\w*|login|log in|sign in|my account|mitt konto)\b/,
   labels:['Avaa kirjautuminen','Öppna inloggning','Open sign in']},
  {type:'site_signup',path:'/tilaus',ids:['respondo-faq-buy','respondo-faq-trial'],
   match:/\b(luo tili|luoda tili|luoda tilin|luo tilin|uusi tili|rekistero\w*|tilaa\b|ostaa\b|osta\b|aloita kokeilu|aloittaa kokeilu|kokeile ilmaiseksi|free trial|start trial|start free|sign up|create (?:an? )?account|register|registrera|prova gratis|borja prova|starta prov)\b/,
   labels:['Luo tili ja aloita','Skapa konto och börja','Create account and start']},
  {type:'site_demo',path:'/assistant',
   match:/\b(kokeile bottia|kokeilla bottia|testaa bottia|testa bottia|testibotti|kokeile demo|kokeilla demoa|kokeile demoa|testa botten|prova botten|try the bot|test the bot|try a demo|demo|demobotti)\b/,
   labels:['Kokeile bottia','Testa botten','Try the bot']},
  {type:'site_features',path:'/ominaisuudet',ids:['respondo-faq-features-overview','respondo-faq-benefits','respondo-faq-knowledge-base','respondo-faq-appearance'],
   match:/\b(ominaisu\w*|toiminnall\w*|mit[a]? kaikkea|mita osaa|tietopohj\w*|features?|capabilit\w*|functions?|funktioner|egenskaper|kunskapsbas\w*)\b/,
   labels:['Tutustu ominaisuuksiin','Se funktionerna','Explore features']},
  {type:'site_pricing',path:'/hinnat',ids:['respondo-faq-pricing','respondo-faq-monthly-pricing','respondo-faq-annual-pricing','respondo-faq-basic','respondo-faq-advanced','respondo-faq-business'],
   match:/\b(hinta\w*|hinnat|hinnoittel\w*|paljonko maks\w*|maksaa\b|maksavat\b|paket\w*|price\w*|pricing|cost\w*|priser|prisplan\w*|kostar|abonnemang\w*)\b/,
   labels:['Katso hinnat ja paketit','Se priser och paket','View pricing and plans']},
  {type:'site_contact',path:'/yhteystiedot',ids:['respondo-faq-company-contact'],
   match:/\b(yhteystied\w*|yhteytt\w*|sahkopost\w*|tavoittaa|ota yhteytta|contact|kontakt\w*|kontakta|reach you|email address)\b/,
   labels:['Yhteystiedot ja yhteydenotto','Kontaktuppgifter','Contact details']},
  {type:'site_ecommerce',path:'/verkkokauppa-chatbot',
   match:/\b(verkkokaup\w*|tuotetied\w*|tuotekatalog\w*|ecommerce|e commerce|webshop\w*|natbutik\w*|online store\w*|webbutik\w*)\b/,
   labels:['Respondo verkkokaupoille','Respondo för webbutiker','Respondo for online stores']},
  {type:'site_booking',path:'/ajanvaraus-chatbot',
   match:/\b(ajanvarau\w*|varaa aika|varata ajan|ajan varaamin\w*|booking\w*|appointment\w*|boka tid|tidsbokning\w*)\b/,
   labels:['Tutustu ajanvarauksiin','Utforska bokningar','Explore bookings']},
  {type:'site_security',path:'/tietoturva',ids:['respondo-faq-security'],
   match:/\b(tietoturv\w*|turvallisuu\w*|gdpr|security|secure|datasakerhet\w*|sakerhet\w*)\b/,
   labels:['Tietoturva','Datasäkerhet','Security']},
  {type:'site_privacy',path:'/tietosuoja',
   match:/\b(tietosuoj\w*|henkilotie\w*|privacy|privacy policy|integritet\w*|personuppgift\w*)\b/,
   labels:['Tietosuojaseloste','Integritetspolicy','Privacy policy']},
  {type:'site_terms',path:'/kayttoehdot',
   match:/\b(kayttoehdo\w*|sopimusehdo\w*|ehdot\b|terms|terms of service|villkor|anvandarvillkor\w*)\b/,
   labels:['Käyttöehdot','Användarvillkor','Terms of service']},
  {type:'site_cookies',path:'/evasteet',
   match:/\b(evaste\w*|cookies?\b|kakor\b)/,
   labels:['Evästekäytäntö','Cookiepolicy','Cookie policy']},
  {type:'site_dpa',path:'/dpa',
   match:/\b(tietojenkasittel\w*|dpa\b|data processing agreement|personuppgiftsbitrade\w*)\b/,
   labels:['Tietojenkäsittelysopimus','Personuppgiftsbiträdesavtal','Data processing agreement']},
  {type:'site_industries',path:'/kenelle-sopii',
   match:/\b(kenelle sopii|toimial\w*|sopii yrityks\w*|millaisille yrityksille|industry|industries|who is it for|vilka foretag\w*)\b/,
   labels:['Kenelle Respondo sopii','Vem passar Respondo för','Who Respondo is for']},
  {type:'site_product',path:'/asiakaspalvelubotti',
   match:/\b(tuote\b|tuotteeseen|miten respondo toimii|kayttoonott\w*|asenn\w*|upot\w*|product\b|how it works|installation|installera|hur fungerar respondo\b|embed\w*)\b/,
   labels:['Näin Respondo toimii','Så fungerar Respondo','How Respondo works']},
  {type:'site_guides',path:'/guides',
   match:/\b(oppaa\w*|oppaat|ohjeet|guide\w*|guider|tutorial\w*)\b/,
   labels:['Oppaat','Guider','Guides']},
  {type:'site_home',path:'/',
   match:/\b(etusivu\w*|takaisin alkuun|startsida\w*|homepage|home page)\b/,
   labels:['Etusivu','Startsida','Home']},
];
const genericPages=/\b(sivut\b|sivusto\w*|linkit\b|linkkilista\w*|valikko\w*|navigointi\w*|page list|site pages|menu\b|navigation\b|webbplatsens sidor|webbsidor\w*)\b/;
function localPath(page,lang){
  if(page.path==='/ominaisuudet')return lang==='sv'?'/funktioner':lang==='en'?'/features':'/ominaisuudet';
  return page.path;
}
export function respondoSiteNavigationActions(message,lang='fi',faqId='',origin='https://www.respondoai.fi'){
  const language=['fi','sv','en'].includes(lang)?lang:'fi';
  const q=normalize(message);
  const matched=pages.filter(p=>(p.ids||[]).includes(faqId)||p.match.test(q));
  if(matched.length===0&&genericPages.test(q)){
    matched.push(...['site_features','site_pricing','site_demo','site_contact'].map(key=>pages.find(p=>p.type===key)));
  }
  const used=new Set();
  return matched.filter(p=>{if(!p||used.has(p.path))return false;used.add(p.path);return true;})
    .slice(0,4).map(p=>{
      const url=new URL(localPath(p,language),origin);
      if(language!=='fi')url.searchParams.set('lang',language);
      return {type:p.type,label:tr(language,...p.labels),url:url.href};
    });
}
export function respondoSiteNavigationAnswer(message,lang='fi',origin='https://www.respondoai.fi'){
  const language=['fi','sv','en'].includes(lang)?lang:'fi';
  const q=normalize(message);
  let answer='';
  if(/\b(kirjau[dt]\w*|logga in|inloggn\w*|login|log in|sign in|my account|mitt konto)\b/.test(q)){
    answer=tr(language,'Voit kirjautua sisään alla olevasta painikkeesta. Jos sinulla ei vielä ole tiliä, voit luoda sen valitsemalla tilauspaketin.','Du kan logga in med knappen nedan. Om du saknar konto kan du skapa ett genom att välja ett abonnemang.','Use the button below to sign in. If you do not have an account yet, choose a plan to create one.');
  }else if(/\b(luo tili|luoda tili|luoda tilin|luo tilin|rekistero\w*|uusi tili|create (?:an? )?account|sign up|register|registrera|skapa konto)\b/.test(q)){
    answer=tr(language,'Luo uusi tili valitsemalla ensin sopiva paketti. Maksutapa lisätään turvallisesti Stripessä, ja saat kolmen päivän maksuttoman kokeilun.','Skapa ett konto genom att först välja ett abonnemang. Betalmetoden läggs till säkert via Stripe och du får tre dagars gratis provperiod.','To create an account, first choose a plan. Add your payment method securely through Stripe and get a three-day free trial.');
  }else if(/\b(kokeile bottia|testaa bottia|kokeilla bottia|testa botten|try the bot|test the bot|try a demo|demobotti)\b/.test(q)){
    answer=tr(language,'Voit kokeilla Respondo-bottia demossa. Lisää esimerkkiyrityksen tiedot ja kysy botilta kuten oikea asiakas.','Du kan testa Respondo i demon. Lägg till ett exempelföretags uppgifter och ställ frågor som en riktig kund.','You can try Respondo in the demo. Enter example company details and ask questions as a customer would.');
  }else if(genericPages.test(q)&&/\b(mita|mitka|miss[a]?|nayta|lista\w*|haluan|kaikki|where|show|list|which|what|vilka|visa|alla|var)\b/.test(q)){
    answer=tr(language,'Tällä sivulla voit kysyä suoraan chatbotilta hinnoista, ominaisuuksista, kirjautumisesta, kokeilusta ja yhteystiedoista. Vastaan kysymykseen ja näytän tarvittaessa painikkeen oikealle sivulle.','Här kan du fråga chatten om priser, funktioner, inloggning, demo och kontaktuppgifter. Jag svarar och visar en knapp till rätt sida när det behövs.','Ask this chatbot about pricing, features, sign-in, the demo or contact details. I will answer and show a button to the right page when useful.');
  }
  if(!answer)return null;
  const actions=respondoSiteNavigationActions(message,language,'',origin);
  if(/\b(kirjau[dt]\w*|logga in|inloggn\w*|login|log in|sign in)\b/.test(q)&&!actions.some(a=>a.type==='site_signup')){
    const signup=pages.find(p=>p.type==='site_signup');const url=new URL(signup.path,origin);
    if(language!=='fi')url.searchParams.set('lang',language);
    actions.push({type:signup.type,label:tr(language,...signup.labels),url:url.href});
  }
  return {answer,actions:actions.slice(0,4)};
}
