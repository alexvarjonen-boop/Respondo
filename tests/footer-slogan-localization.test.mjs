import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');

test('footer slogan is localized to Finnish, Swedish and English', () => {
  const start = app.indexOf('function footer()');
  const end = app.indexOf('function heroVisual()', start);
  assert.ok(start >= 0 && end > start);
  const footer = app.slice(start, end);
  assert.match(footer, /<span class="brand-slogan">\$\{appText\('Älykkäämpää asiakaspalvelua','Smartare kundservice','Smarter customer service'\)\}<\/span>/);
  assert.doesNotMatch(footer, /<span class="brand-slogan">Älykkäämpää asiakaspalvelua<\/span>/);
});

test('frontend cache version changes to deliver the localized footer on mobile', () => {
  assert.match(html, /app\.js\?v=[^"]*footer-slogan-i18n-20261027-v1/);
});
