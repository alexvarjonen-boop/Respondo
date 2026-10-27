// Crawlable, localized pricing summary for the initial HTML response.
// Keep these figures aligned with pricingSection() and checkout plan options in public/app.js.
const tiers=[
  {name:'Advanced',code:'basic',monthly:49,annualEquivalent:39,annualTotal:468},
  {name:'Premium',code:'advanced',monthly:129,annualEquivalent:119,annualTotal:1428},
  {name:'Enterprise',code:'business',monthly:149,annualEquivalent:139,annualTotal:1668}
];
const labels={
  fi:{
    heading:'AI-asiakaspalvelubotin hinnat yrityksille',
    lead:'Vertaa Respondo AI:n kuukausi- ja vuositilauksia. Kaikkiin paketteihin kuuluu kolmen päivän maksuton kokeilu. Valitse yrityksesi tarpeisiin sopiva asiakaspalvelubotti.',
    monthly:'Kuukausitilaus',yearly:'Vuositilaus',perMonth:'€/kk',annualText:'vuodessa, laskutus vuosittain',saving:'Säästö vuodessa',
    choose:'Valitse paketti',annualChoose:'Valitse vuositilaus',help:'Epävarma valinnasta? Kokeile bottia tai kysy meiltä käyttöönotosta.',demo:'Kokeile bottia',
    section:'Mistä AI-chatbotin hinta muodostuu?',
    details:'Valintaa tehdessä huomioi asiakaspalvelun kysymysten määrä, omien tietojen ylläpito, mahdollinen tuote- tai ajanvaraustarve ja työntekijöiden osallistuminen keskusteluihin. Kuukausihinnan lisäksi arvioi käyttöönoton ja tietopohjan päivittämisen vaatima työ. Vertaa aina pakettien ajantasaiset ominaisuudet ja ehdot ennen tilausta.',
    faq:'Usein kysytyt kysymykset hinnoittelusta',
    questions:[
      ['Paljonko AI-asiakaspalvelubotti maksaa?','Respondo AI:n kuukausipaketit ovat Advanced 49 €, Premium 129 € ja Enterprise 149 €. Vuositilaus laskutetaan ennakkoon, ja sen kuukausikohtainen hinta on alhaisempi.'],
      ['Onko ilmainen kokeilu käytettävissä?','Paketteihin kuuluu kolmen päivän maksuton kokeilu. Tarkista tilauksen ehdot ja mahdollinen jatkolaskutus ennen tilauksen vahvistamista.'],
      ['Kannattaako valita kuukausi- vai vuositilaus?','Kuukausitilaus tarjoaa joustavuutta. Vuositilaus säästää 120 € vuodessa jokaisessa paketissa, mutta se laskutetaan vuosittain.'],
      ['Voinko ottaa yhteyttä ennen tilausta?','Kyllä. Voit tutustua ominaisuuksiin ja pyytää lisätietoja ennen paketin valintaa.']
    ],
    linksHeading:'Tutustu ennen tilausta',features:'Kaikki ominaisuudet',bot:'Mikä on asiakaspalvelijabotti?',automation:'Asiakaspalvelun automatisointi',contact:'Ota yhteyttä',
    notice:'Maksulliset Respondo AI -yritystilaukset ovat tällä hetkellä saatavilla Suomessa.'
  },
  sv:{
    heading:'Priser för AI-kundservicebot till företag',
    lead:'Jämför månads- och årsabonnemang för Respondo AI. Alla paket har tre dagars gratis provperiod. Välj en kundservicebot som passar företagets behov.',
    monthly:'Månadsabonnemang',yearly:'Årsabonnemang',perMonth:'€/mån',annualText:'per år, faktureras årsvis',saving:'Besparing per år',
    choose:'Välj paket',annualChoose:'Välj årsabonnemang',help:'Osäker? Testa chatbotten eller fråga oss om installationen.',demo:'Testa chatbotten',
    section:'Vad påverkar kostnaden för en AI-chatbot?',
    details:'Bedöm hur många återkommande kundfrågor som ska hanteras, hur kunskapsbasen underhålls och om ni behöver hjälp med produkter, bokning eller överlämning till personal. Utöver abonnemanget kan installation och uppdateringar innebära arbetstid. Kontrollera alltid aktuella funktioner och villkor före beställning.',
    faq:'Vanliga frågor om priser',
    questions:[
      ['Vad kostar en AI-kundservicebot?','Respondo AI:s månadspriser är Advanced 49 €, Premium 129 € och Enterprise 149 €. Årsabonnemangen betalas årsvis till en lägre månadsekvivalent.'],
      ['Finns en gratis provperiod?','Alla paket inkluderar en gratis provperiod på tre dagar. Läs villkoren och informationen om fortsatt fakturering före beställning.'],
      ['Månadsabonnemang eller årsabonnemang?','Månadsabonnemang ger större flexibilitet. Årsabonnemang sparar 120 € per år på varje paket men faktureras årsvis.'],
      ['Kan jag kontakta er före köpet?','Ja. Läs om funktionerna och kontakta oss om företagets behov innan du väljer paket.']
    ],
    linksHeading:'Läs mer före beställning',features:'Alla funktioner',bot:'Vad är en kundservicebot?',automation:'Automatiserad kundservice',contact:'Kontakta oss',
    notice:'Betalda Respondo AI-abonnemang för företag finns för närvarande tillgängliga i Finland.'
  },
  en:{
    heading:'AI customer service chatbot pricing for businesses',
    lead:'Compare Respondo AI monthly and annual plans. Every plan includes a three-day free trial. Review the pricing and choose a customer support chatbot for your business website.',
    monthly:'Monthly billing',yearly:'Annual billing',perMonth:'€/month',annualText:'per year, billed annually',saving:'Annual saving',
    choose:'Choose plan',annualChoose:'Choose annual plan',help:'Not sure which plan fits? Try the bot or ask us about getting started.',demo:'Try the chatbot',
    section:'What determines the cost of an AI customer service chatbot?',
    details:'Consider the volume of recurring support questions, the quality and upkeep of the business knowledge base, ecommerce or booking needs and human support workflows. Beyond the subscription, allow time for installation, testing and maintaining accurate company answers. Check current plan features and terms before purchasing.',
    faq:'Frequently asked questions about chatbot pricing',
    questions:[
      ['How much does an AI customer service chatbot cost?','Respondo AI monthly plans cost €49 for Advanced, €129 for Premium and €149 for Enterprise. Annual plans are billed upfront at a lower equivalent monthly price.'],
      ['Can I try the chatbot for free?','Each plan includes a three-day free trial. Review the checkout terms and any continuation of billing before confirming a subscription.'],
      ['Should I choose monthly or annual billing?','Monthly billing is more flexible. Annual billing saves €120 per year on each plan, but requires annual billing upfront.'],
      ['Can I ask questions before signing up?','Yes. Explore features and contact Respondo AI before choosing a plan.']
    ],
    linksHeading:'Explore before you subscribe',features:'All features',bot:'What is a customer service chatbot?',automation:'Customer service automation',contact:'Contact us',
    notice:'Respondo AI paid business subscriptions are currently available in Finland.'
  }
};
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const href=(path,lang)=>path+(lang==='en'?'':'?lang='+lang);
export const SEO_PRICING_TIERS=Object.freeze(tiers);
export function seoPricingMarkup(lang='fi'){
  const L=['fi','sv','en'].includes(lang)?lang:'fi', d=labels[L];
  const cards=tiers.map(t=>'<article class="ai-topic-section seo-pricing-choice"><h3>'+t.name+'</h3><p><strong>'+esc(d.monthly)+': '+t.monthly+' '+esc(d.perMonth)+'</strong></p>'+
    '<p>'+esc(d.yearly)+': '+t.annualEquivalent+' '+esc(d.perMonth)+' ('+t.annualTotal+' € '+esc(d.annualText)+')</p>'+
    '<p>'+esc(d.saving)+': 120 €</p>'+
    '<div class="seo-pricing-actions"><a class="seo-pricing-buy" href="/tilaus?plan='+t.code+'_monthly&amp;lang='+L+'">'+esc(d.choose)+' '+esc(t.name)+' →</a>'+
    '<a class="seo-pricing-annual" href="/tilaus?plan='+t.code+'_yearly&amp;lang='+L+'">'+esc(d.annualChoose)+' →</a></div></article>').join('');
  const faq=d.questions.map(([q,a])=>'<details class="ai-topic-faq"><summary>'+esc(q)+'</summary><p>'+esc(a)+'</p></details>').join('');
  const paths=[
    ['/ominaisuudet',d.features],['/asiakaspalvelubotti',d.bot],['/asiakaspalvelun-automatisointi',d.automation],['/yhteystiedot',d.contact]
  ];
  const links=paths.map(([path,name])=>'<a href="'+esc(href(L==='en'&&path==='/ominaisuudet'?'/features':L==='sv'&&path==='/ominaisuudet'?'/funktioner':path,L))+'">'+esc(name)+' →</a>').join('');
  return '<main class="ai-topic-page seo-pricing-page">'+
    '<section class="seo-landing-hero"><div class="container seo-landing-hero-inner"><h1>'+esc(d.heading)+'</h1><p>'+esc(d.lead)+'</p></div></section>'+
    '<section class="section ai-topic-body"><div class="container ai-topic-prose"><div class="seo-pricing-tier-grid">'+cards+'</div>'+
    '<div class="seo-pricing-help"><p>'+esc(d.help)+'</p><a href="'+esc(href('/assistant',L))+'">'+esc(d.demo)+' →</a> · <a href="'+esc(href('/yhteystiedot',L))+'">'+esc(d.contact)+' →</a></div>'+
    '<section class="ai-topic-section"><h2>'+esc(d.section)+'</h2><p>'+esc(d.details)+'</p></section></div></section>'+
    '<section class="section ai-topic-faq-area"><div class="container ai-topic-prose"><h2>'+esc(d.faq)+'</h2>'+faq+'</div></section>'+
    '<section class="section seo-landing-closing"><div class="container"><div class="seo-landing-closing-card"><h2>'+esc(d.linksHeading)+'</h2><nav class="ai-topic-links" aria-label="'+esc(d.linksHeading)+'">'+links+'</nav><p class="ai-topic-notice">'+esc(d.notice)+'</p></div></div></section></main>';
}
