// Visible, localized homepage introduction for people and crawlers.
// Shared by server-side HTML and the interactive page; never render SEO-only hidden text.
const topics = [
  ['/asiakaspalvelubotti', ['AI-asiakaspalvelija ja asiakaspalvelubotti', 'AI-kundservicebot för företag', 'AI customer service chatbot']],
  ['/tekoaly-asiakaspalvelu', ['Tekoäly asiakaspalvelussa', 'AI i kundservice', 'AI in customer service']],
  ['/asiakaspalvelun-automatisointi', ['Asiakaspalvelun automatisointi', 'Automatisera kundservice', 'Customer service automation']],
  ['/tekoaly-yrityksille', ['Tekoäly yrityksille', 'AI för företag', 'AI for businesses']],
  ['/verkkokauppa-chatbot', ['Chatbot verkkokauppaan', 'Chatbot för webbutik', 'Ecommerce chatbot']],
  ['/guides/ai-chatbot-vs-live-chat', ['Chatbot vai lomake? Vertailu', 'Chatbot eller formulär? Jämförelse', 'Chatbot vs live chat vs contact form']]
];
const copy = {
  fi: {
    title:'AI-asiakaspalvelija yrityksen verkkosivuille',
    intro:'Respondo AI on verkkosivulle asennettava AI-asiakaspalvelija eli asiakaspalvelubotti. Se vastaa asiakkaan kysymyksiin yrityksen hyväksymillä tiedoilla myös työajan ulkopuolella ja voi ohjata yhteydenotot tai epäselvät asiat työntekijälle.',
    detail:'Automaattinen asiakaspalvelu kannattaa aloittaa yleisistä kysymyksistä: palvelut, hinnat, aukioloajat, toimitukset ja ajanvaraus. Tutustu käyttötapoihin ja vertaa vaihtoehtoja ennen botin käyttöönottoa.',
    navigation:'Tutustu Respondo AI -ratkaisuihin'
  },
  sv: {
    title:'AI-kundservice för företagets webbplats',
    intro:'Respondo AI är en AI-kundservicebot för webbplatser. Den hjälper besökare med frågor utifrån företagets godkända uppgifter, även utanför öppettider, och kan föra osäkra ärenden vidare till en medarbetare.',
    detail:'Börja med återkommande frågor om tjänster, priser, öppettider, leverans och bokning. Läs om olika användningsområden och jämför möjligheterna före installation.',
    navigation:'Utforska Respondo AI-lösningar'
  },
  en: {
    title:'AI customer service chatbot for business websites',
    intro:'Respondo AI is an AI customer service chatbot that answers website visitors using company-approved information, including outside business hours. When facts are missing, it can capture an enquiry or help pass a conversation to a person.',
    detail:'Start customer service automation with frequently asked questions about services, pricing, opening hours, deliveries and bookings. Explore real use cases and compare options before setting up a chatbot.',
    navigation:'Explore Respondo AI solutions'
  }
};
const escapeHtml = value => String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
export function homeSearchMarkup(lang='en') {
  const language=['fi','sv','en'].includes(lang)?lang:'en';
  const d=copy[language], index=language==='fi'?0:language==='sv'?1:2;
  const links=topics.map(([path,labels])=>{
    const href=path + (language==='en'?'':'?lang='+language);
    return '<a href="'+escapeHtml(href)+'">'+escapeHtml(labels[index])+' →</a>';
  }).join('');
  return '<section class="respondo-search-overview" aria-labelledby="respondo-search-overview-heading">'+
    '<div class="container respondo-search-inner">'+
    '<h2 id="respondo-search-overview-heading">'+escapeHtml(d.title)+'</h2>'+
    '<p>'+escapeHtml(d.intro)+'</p><p>'+escapeHtml(d.detail)+'</p>'+
    '<nav class="respondo-search-links" aria-label="'+escapeHtml(d.navigation)+'">'+links+'</nav>'+
    '</div></section>';
}
