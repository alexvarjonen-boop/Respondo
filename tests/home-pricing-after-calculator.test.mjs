import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { appleHomeMarkup } from '../public/apple-home.js';

test('the existing pricing cards slot follows the homepage calculator', () => {
  const pricing = '<section class="pricing-section" id="pricing"><p>Advanced · Premium · Enterprise</p></section>';
  const markup = appleHomeMarkup((fi) => fi, 'fi', 0, pricing);
  const calculatorStart = markup.indexOf('<section class="apple-lead-calculator"');
  const pricingStart = markup.indexOf(pricing);
  const finalCtaStart = markup.indexOf('<section class="apple-bottom-cta"');
  assert.ok(calculatorStart >= 0, 'the homepage calculator is present');
  assert.ok(pricingStart > calculatorStart, 'pricing follows the calculator');
  assert.ok(finalCtaStart > pricingStart, 'pricing comes before the final CTA');
  assert.equal(markup.split(pricing).length - 1, 1, 'pricing is inserted once');
});

test('the homepage renders the same pricing section as the dedicated pricing page', () => {
  const source = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.match(source, /appleHomeMarkup\(appText,currentLang\(\),FEATURE_COUNT,pricingSection\(\)\)/);
  assert.match(source, /path === '\/hinnat'[\s\S]*?pricingSection\(\)/);
});
