import { spiralHeroMarkup } from './spiral-hero.js?v=20261125-restore-orbit-v1';
// Preserve the original interactive orbit; add a sales CTA without changing its motion.
export function demoFirstHero(t,lang){
  const L=['fi','sv','en'].includes(lang)?lang:'en';
  const html=spiralHeroMarkup(t,L);
  const demo='<a class="rs-book-demo" href="/yhteystiedot?intent=demo&amp;lang='+L+'">'+t('Varaa demo','Boka demo','Book a demo')+'</a>';
  return html.replace(/<a class="rs-product-jump"[^>]*>[\s\S]*?<\/a>/,demo);
}
export function appleHomeMarkup(t,lang,count,pricingMarkup=''){
  return `${demoFirstHero(t,lang)}${pricingMarkup}`;
}
