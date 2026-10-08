import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/footer-refinement.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const start=app.indexOf('function footer() {');
const end=app.indexOf('function heroVisual()',start);
const footer=app.slice(start,end);
test('public footer removes duplicate business IDs and repeated brand pill',()=>{
  assert.ok(start>=0 && end>start,'Footer exists');
  assert.doesNotMatch(footer,/Y-tunnus|FO-nummer|Business ID|businessId|3599437-5/);
  assert.doesNotMatch(footer,/seller-chip/);
  assert.match(footer,/© \$\{new Date\(\)\.getFullYear\(\)\} RESPONDO AI/);
});
test('legal documents and subscription service-provider identification remain available',()=>{
  assert.match(app,/legal-seller/);
  assert.match(app,/<small>\$\{appText\('Y-tunnus','FO-nummer','Business ID'\)\}/);
  assert.match(app,/\['1\. Palveluntarjoaja'/);
});
test('footer brand text is readable on dark pages while legal pages remain light',()=>{
  assert.match(css,/#app :is\(\.apple-home-page,\.features-page,\.contact-page,\.seo-landing-page,\.pricing-page\) \.footer \.foot-brand \.logo \.brand-word/);
  assert.match(css,/-webkit-text-fill-color:#f8fafc!important/);
  assert.match(css,/-webkit-text-fill-color:#17181c!important/);
  assert.match(html,/footer-refinement\.css\?v=20261009-v1/);
  assert.match(html,/footer-business-id-contrast-v1/);
});
