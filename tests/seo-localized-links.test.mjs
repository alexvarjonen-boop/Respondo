import test from 'node:test';
import assert from 'node:assert/strict';
import { globalResourcesMarkup } from '../public/global-resources.mjs';
import { customerServiceLandingMarkup } from '../public/customer-service-landing.mjs';
import { aiTopicMarkup } from '../public/ai-topic-pages.mjs';
import { seoIntentMarkup } from '../public/seo-intent-pages.mjs';
import { seoPricingMarkup } from '../public/seo-pricing-ssr.mjs';
import { VERTICAL_LANDING_PATHS, verticalLandingMarkup } from '../public/vertical-landing.mjs';

test('Finnish public content links to Finnish canonical URLs when English is default', () => {
  const pages = [
    globalResourcesMarkup('/guides', 'fi'),
    customerServiceLandingMarkup('fi'),
    aiTopicMarkup('/tekoaly-asiakaspalvelu', 'fi'),
    seoIntentMarkup('/asiakaspalvelun-automatisointi', 'fi'),
    seoPricingMarkup('fi'),
    verticalLandingMarkup(VERTICAL_LANDING_PATHS[0], 'fi'),
  ];
  for (const html of pages) {
    assert.equal(typeof html, 'string');
    assert.match(html, /href="\/(?:asiakaspalvelubotti|hinnat|tekoaly-asiakaspalvelu|ominaisuudet|guides)(?:\/[^"]*)?\?lang=fi"/);
  }
});
