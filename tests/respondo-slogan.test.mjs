import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { brandedEmailHtml, RESPONDO_BRAND_LINE } from '../email-branding.mjs';

const brandLine = 'RESPONDO AI - Älykkäämpää asiakaspalvelua';
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('public footer displays the permanent brand line', () => {
  const app = read('../public/app.js');
  const footer = app.slice(app.indexOf('function footer() {'), app.indexOf('function heroVisual()'));
  assert.match(footer, /<div class="footer-brand-identity">/);
  assert.match(footer, /<span class="brand-slogan">Älykkäämpää asiakaspalvelua<\/span>/);
  assert.doesNotMatch(footer, /<span class="brand-word">RESPONDO AI <span class="brand-slogan">/);
  const css = read('../public/footer-refinement.css');
  assert.match(css, /\.brand-slogan\s*\{[^}]*font-weight:400!important/s);
  assert.match(css, /\.footer-brand-identity\s*\{[^}]*flex-direction:column/s);
});

test('transactional email header has no slogan and footer is localized', () => {
  assert.equal(RESPONDO_BRAND_LINE, brandLine);
  const translations = {
    fi:'RESPONDO AI - Älykkäämpää asiakaspalvelua',
    sv:'RESPONDO AI - Smartare kundservice',
    en:'RESPONDO AI - Smarter customer service',
  };
  for (const language of ['fi', 'sv', 'en']) {
    const html=brandedEmailHtml({ language, title:'Test', content:'<p>Test</p>' });
    const header=html.split('<tr><td class="mail-header"')[1]?.split('<tr><td class="mail-main"')[0] || '';
    const footer=html.split('<tr><td class="mail-footer"')[1] || '';
    assert.match(header,/RESPONDO AI/);
    assert.ok(!/Älykkäämpää asiakaspalvelua|Smartare kundservice|Smarter customer service/.test(header),language+' header');
    assert.ok(footer.includes(translations[language]),language+' footer');
    for(const [locale,line] of Object.entries(translations)){
      if(locale!==language) assert.ok(!footer.includes(line),language+' footer should not include '+locale);
    }
    assert.ok(html.includes('respondo-email-arrow-20261012-2fe95894.png'),language);
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
