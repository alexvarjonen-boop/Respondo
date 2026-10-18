import { spiralHeroMarkup } from './spiral-hero.js?v=20261019-chat-first-v1';
// The spiral is the single feature story. Pricing follows without duplicated
// feature cards, homepage calculator or illustrative growth section.
export function appleHomeMarkup(t,lang,count,pricingMarkup=''){
  return `${spiralHeroMarkup(t, lang)}
  ${pricingMarkup}
`;
}
