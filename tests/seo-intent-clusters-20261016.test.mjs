import test from 'node:test';
import assert from 'node:assert/strict';
import { SEO_INTENT_PATHS, seoIntentMeta, seoIntentMarkup } from '../public/seo-intent-pages.mjs';

const expected = [
  '/asiakaspalvelun-automatisointi',
  '/shopify-chatbot',
  '/liidien-keruu-chatbotilla',
  '/monikielinen-chatbot'
];

test('new SEO pages target distinct business intents', () => {
  assert.deepEqual(SEO_INTENT_PATHS, expected);
  assert.equal(new Set(SEO_INTENT_PATHS).size, SEO_INTENT_PATHS.length);
});

for (const path of expected) {
  for (const lang of ['fi','sv','en']) {
    test(`SSR-ready localized content for ${path} (${lang})`, () => {
      const meta=seoIntentMeta(path,lang);
      assert.equal(meta.length,2);
      assert.ok(meta[0].length>30 && meta[0].length<110,'use a meaningful title');
      assert.ok(meta[1].length>85 && meta[1].length<250,'use a helpful description');
      const html=seoIntentMarkup(path,lang);
      assert.match(html,/^<main class="ai-topic-page">/);
      assert.match(html,/<h1>/);
      assert.match(html,/<h2>/);
      assert.match(html,/class="ai-topic-faq"/);
      assert.match(html,/href="\/hinnat(?:\?lang=(?:sv|en))?"/);
      assert.match(html,/href="\/asiakaspalvelubotti(?:\?lang=(?:sv|en))?"/);
      assert.ok(html.length>1500,'avoid thin, boilerplate-only content');
      assert.doesNotMatch(html,/<script/i,'keep rendered content inert');
    });
  }
}
