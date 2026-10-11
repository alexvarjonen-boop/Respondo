import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { brandedEmailHtml, RESPONDO_BRAND_LINE } from '../email-branding.mjs';

const brandLine = 'RESPONDO AI - Älykkäämpää asiakaspalvelua';
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('public footer displays the permanent brand line', () => {
  const app = read('../public/app.js');
  const footer = app.slice(app.indexOf('function footer() {'), app.indexOf('function heroVisual()'));
  assert.match(footer, /RESPONDO AI <span class="brand-slogan">- Älykkäämpää asiakaspalvelua/);
  assert.match(read('../public/footer-refinement.css'), /\.brand-slogan/);
});

test('all transactional languages include exact Respondo tagline', () => {
  assert.equal(RESPONDO_BRAND_LINE, brandLine);
  for (const language of ['fi', 'sv', 'en']) {
    const html = brandedEmailHtml({ language, title:'Test', content:'<p>Test</p>' });
    assert.ok(html.includes(brandLine), language);
    assert.ok(html.includes('respondo-email-logo.png'), language);
  }
});

test('verification, onboarding, password reset and contact notifications use one branded shell', () => {
  const server = read('../server.mjs');
  for (const section of [
    ['sendSignupVerificationEmail', 'sendWelcomeEmailOnce'],
    ['sendWelcomeEmailOnce', 'sendHomepageContactEmail'],
    ['sendHomepageContactEmail', 'sendPasswordResetEmail'],
    ['sendPasswordResetEmail', 'function '],
  ]) {
    const start = server.indexOf('async function ' + section[0] + '(');
    const end = server.indexOf(section[1], start + section[0].length + 22);
    const content = server.slice(start, end > start ? end : undefined);
    assert.ok(content.includes('brandedEmailHtml('), section[0]);
  }
});

test('all saved cold outreach and partner template bodies use one tagline', () => {
  const outreach = JSON.parse(read('../marketing/outreach-templates.json'));
  for (const templates of Object.values(outreach.sequences)) {
    for (const template of templates) assert.ok(template.body.endsWith(brandLine));
  }
  const partners = JSON.parse(read('../marketing/partner-outreach-templates.json'));
  for (const template of Object.values(partners.partner)) assert.ok(template.body.endsWith(brandLine));
});
