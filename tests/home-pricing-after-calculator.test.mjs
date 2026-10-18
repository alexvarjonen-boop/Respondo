import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { appleHomeMarkup } from '../public/apple-home.js';

test('the same pricing cards follow the spiral directly without duplicate panels', () => {
  const pricing = '<section class="pricing-section" id="pricing"><p>Advanced · Premium · Enterprise</p></section>';
  const markup = appleHomeMarkup((fi) => fi, 'fi', 0, pricing);
  const spiralStart = markup.indexOf('<section class="apple-hero rs-spiral-section"');
  const spiralEnd = markup.indexOf('</section>', spiralStart) + '</section>'.length;
  const pricingStart = markup.indexOf(pricing);

  assert.ok(spiralStart >= 0 && spiralEnd > spiralStart, 'spiral is present');
  assert.equal((markup.match(/data-rs-card\b/g)||[]).length, 7, 'seven features stay inside the spiral');
  assert.ok(pricingStart > spiralEnd, 'pricing follows the spiral');
  assert.equal(markup.slice(spiralEnd, pricingStart).trim(), '', 'no extra sections before pricing');
  assert.doesNotMatch(markup,/apple-bottom-cta|Valmis vastaamaan|Aloita ilmainen kokeilu/);
  assert.doesNotMatch(markup, /apple-highlights|apple-lead-calculator|rg-growth-section/);
  assert.equal(markup.split(pricing).length - 1, 1, 'pricing is inserted once');
});

test('the homepage renders the same pricing section as the dedicated pricing page', () => {
  const source = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.match(source, /appleHomeMarkup\(appText,currentLang\(\),FEATURE_COUNT,pricingSection\(\)\)/);
  assert.match(source, /path === '\/hinnat'[\s\S]*?pricingSection\(\)/);
});
