import test from 'node:test';
import assert from 'node:assert/strict';
import { homeSearchMarkup } from '../public/home-search-content.mjs';

test('homepage search overview is readable, visible and localized', () => {
  for (const [lang, title] of [
    ['fi', 'AI-asiakaspalvelija yrityksen verkkosivuille'],
    ['sv', 'AI-kundservice för företagets webbplats'],
    ['en', 'AI customer service chatbot for business websites'],
  ]) {
    const html = homeSearchMarkup(lang);
    assert.match(html, new RegExp(title));
    assert.match(html, /<section class="respondo-search-overview"/);
    assert.match(html, /<nav class="respondo-search-links"/);
    assert.equal((html.match(/<a href=/g) || []).length, 5);
    assert.match(html, /\/asiakaspalvelubotti/);
    assert.match(html, /\/tekoaly-asiakaspalvelu/);
    assert.match(html, /\/asiakaspalvelun-automatisointi/);
    assert.doesNotMatch(html, /style="[^"]*display:\s*none/i);
    assert.equal(html.includes('?lang=fi'), lang === 'fi');
    assert.equal(html.includes('?lang=sv'), lang === 'sv');
  }
});
