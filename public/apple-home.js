import { spiralHeroMarkup } from './spiral-hero.js?v=20261026-orbit10-v1-observatory-v1';
// Ten cinematic scenes and existing paid-plan checkout remain on the homepage.
// Long-form SEO articles belong on their dedicated landing pages, not below pricing.
export function appleHomeMarkup(t,lang,count,pricingMarkup=''){
  return `${spiralHeroMarkup(t, lang)}
  ${pricingMarkup}
`;
}
