import { spiralHeroMarkup } from './spiral-hero.js?v=20261021-fullscreen-chapters-v1-studio-green-20261026';
// Seven cinematic scenes and existing paid-plan checkout remain on the homepage.
// Long-form SEO articles belong on their dedicated landing pages, not below pricing.
export function appleHomeMarkup(t,lang,count,pricingMarkup=''){
  return `${spiralHeroMarkup(t, lang)}
  ${pricingMarkup}
`;
}
