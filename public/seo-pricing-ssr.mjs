// Localized public pricing; direct self-service ordering and optional demo.
export const SEO_PRICING_TIERS=Object.freeze([{name:'Respondo AI',code:'respondo_monthly',monthly:350}]);
const data={
fi:['AI-asiakaspalvelu yrityksille','Yksi tilaus. Kaikki ominaisuudet.','350 €/kk (sis. ALV Suomessa)','Valinnainen käyttöönottopalvelu: 200 € kertamaksu (sis. ALV Suomessa).','Varaa maksuton demo'],
sv:['AI-kundservice för företag','Ett abonnemang. Alla funktioner.','350 €/mån (inkl. moms i Finland)','Valfri installationstjänst: 200 € engångsavgift (inkl. moms i Finland).','Boka en kostnadsfri demo'],
en:['AI customer service for businesses','One subscription. All features.','€350/month (includes VAT in Finland)','Optional assisted setup: €200 one-time fee (includes VAT in Finland).','Book a free demo']
};
export function seoPricingMarkup(lang='fi'){
 const L=Object.hasOwn(data,lang)?lang:'fi',d=data[L],order={fi:'Tilaa nyt',sv:'Beställ nu',en:'Subscribe now'}[L];
 return '<main class="ai-topic-page seo-pricing-page"><section class="seo-landing-hero"><div class="container seo-landing-hero-inner"><h1>'+d[0]+'</h1><p>'+d[1]+'</p></div></section><section class="section ai-topic-body"><div class="container ai-topic-prose"><article class="ai-topic-section seo-pricing-choice"><h2>Respondo AI</h2><p><strong>'+d[2]+'</strong></p><p>'+d[3]+'</p><a class="seo-pricing-buy" href="/tilaus?plan=respondo_monthly&amp;lang='+L+'">'+order+' →</a> <a class="seo-pricing-buy" href="/yhteystiedot?intent=demo&amp;lang='+L+'">'+d[4]+' →</a></article></div></section></main>';
}
