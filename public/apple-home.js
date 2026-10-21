import { homeSearchMarkup } from './home-search-content.mjs?v=20261021-organic-discovery-v1';
import { spiralHeroMarkup } from './spiral-hero.js?v=20261021-fullscreen-chapters-v1';
// The spiral is the single feature story. Pricing follows without duplicated
// feature cards, homepage calculator or illustrative growth section.
export function appleHomeMarkup(t,lang,count,pricingMarkup=''){
  return `${spiralHeroMarkup(t, lang)}
  ${pricingMarkup}
  ${homeSearchMarkup(lang)}
`;
}
