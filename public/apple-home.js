import { spiralHeroMarkup } from './spiral-hero.js?v=20261021-fullscreen-chapters-v1-studio-green-20261026';
// Homepage keeps the interactive pricing and cinematic hero.
// Long-form search overview remains available on the dedicated SEO landing pages.
export function appleHomeMarkup(t,lang,count,pricingMarkup=''){
  return `${spiralHeroMarkup(t, lang)}
  ${pricingMarkup}
`;
}
