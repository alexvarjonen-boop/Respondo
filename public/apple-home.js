import { spiralHeroMarkup } from './spiral-hero.js?v=20261018-spiral-v1';
// The spiral is the single feature story. Pricing follows without duplicated
// feature cards, homepage calculator or illustrative growth section.
export function appleHomeMarkup(t,lang,count,pricingMarkup=''){
  return `${spiralHeroMarkup(t, lang)}
  ${pricingMarkup}
  <section class="apple-bottom-cta"><p>${t('Valmis vastaamaan ensimmäiseen kysymykseen?','Redo att svara på den första frågan?','Ready for your first conversation?')}</p><a class="apple-pill apple-pill-primary" href="/tilaus">${t('Aloita ilmainen kokeilu','Börja gratis provperiod','Start your free trial')}</a><a class="apple-buyer-guide-link" href="/asiakaspalvelubotti?lang=${lang}">${t('Mikä on asiakaspalvelijabotti?','Så fungerar en AI-kundservicebot','How an AI customer service chatbot works')} →</a></section>`;
}
