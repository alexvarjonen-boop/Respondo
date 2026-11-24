// Localized public pricing; ordering is contact-only pending billing migration.
export const SEO_PRICING_TIERS=Object.freeze([{name:'Respondo AI',code:'business',monthly:350}]);
const data={
fi:['AI-asiakaspalvelu yrityksille','Yksi tilaus. Kaikki ominaisuudet.','350 €/kk + soveltuva ALV','Valinnainen käyttöönottopalvelu: 200 € kertamaksu + soveltuva ALV.','Varaa maksuton demo'],
sv:['AI-kundservice för företag','Ett abonnemang. Alla funktioner.','350 €/mån + tillämplig moms','Valfri installationstjänst: 200 € engångsavgift + tillämplig moms.','Boka en kostnadsfri demo'],
en:['AI customer service for businesses','One subscription. All features.','€350/month + applicable VAT','Optional assisted setup: €200 one-time fee + applicable VAT.','Book a free demo']
};
export function seoPricingMarkup(lang='fi'){
 const L=Object.hasOwn(data,lang)?lang:'fi',d=data[L];
 return '<main class="ai-topic-page seo-pricing-page"><section class="seo-landing-hero"><div class="container seo-landing-hero-inner"><h1>'+d[0]+'</h1><p>'+d[1]+'</p></div></section><section class="section ai-topic-body"><div class="container ai-topic-prose"><article class="ai-topic-section seo-pricing-choice"><h2>Respondo AI</h2><p><strong>'+d[2]+'</strong></p><p>'+d[3]+'</p><a class="seo-pricing-buy" href="/yhteystiedot?intent=demo&amp;lang='+L+'">'+d[4]+' →</a></article></div></section></main>';
}
