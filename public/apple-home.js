import { spiralHeroMarkup } from './spiral-hero.js?v=20261018-demo-only-v4';
// The spiral is the single feature story. Pricing follows without duplicated
// feature cards, homepage calculator or illustrative growth section.
export function appleHomeMarkup(t,lang,count,pricingMarkup=''){
  return `${spiralHeroMarkup(t, lang)}
  ${pricingMarkup}
`;
}
