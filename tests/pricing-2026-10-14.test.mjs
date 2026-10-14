import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const server = read('server.mjs');
const app = read('public/app.js');
const effects = read('public/effects.js');
const html = read('public/index.html');
const guide = read('public/global-resources.mjs');

test('2026-10-14 monthly tiers have the approved prices and unchanged seat limits', () => {
  for (const [code, amount, seats] of [
    ['basic_monthly', 49, 2],
    ['advanced_monthly', 129, 10],
    ['business_monthly', 149, 20]
  ]) {
    const line = server.split('\n').find((line) => line.trimStart().startsWith(code + ':'));
    assert.ok(line, 'missing plan ' + code);
    assert.match(line, new RegExp('monthlyPrice:' + amount + '(?!\\d)'));
    assert.match(line, new RegExp('agentSeats:' + seats + '(?!\\d)'));
  }
  assert.match(server, /NEW_MONTHLY_PRICE_CENTS = Object\.freeze\(\{ basic_monthly:4900, advanced_monthly:12900, business_monthly:14900 \}\)/);
});

test('new checkouts refuse grandfathered annual plans and verify Stripe prices', () => {
  assert.match(server, /if \(normalizedPlan\.endsWith\('_yearly'\)\)/);
  assert.match(server, /if \(plan\.endsWith\('_yearly'\)\)/);
  assert.match(server, /await assertCurrentCheckoutPrice\(normalizedPlan, price\)/);
  assert.match(server, /await assertCurrentCheckoutPrice\(plan,price\)/);
  assert.match(server, /const NEW_MONTHLY_PRODUCT_NAMES = Object\\.freeze/);
  assert.match(server, /basic_monthly:'Respondo Advanced'/);
  assert.match(server, /advanced_monthly:'Respondo Premium'/);
  assert.match(server, /business_monthly:'Respondo Enterprise'/);
  assert.match(server, /stripe\\.products\\.retrieve\\(productId\\)/);
  assert.match(server, /product\\.name !== NEW_MONTHLY_PRODUCT_NAMES\\[plan\\]/);
  assert.match(server, /basic_yearly:\{tier:'basic'/);
  assert.match(server, /advanced_yearly:\{tier:'advanced'/);
  assert.match(server, /business_yearly:\{tier:'business'/);
});

test('website and demo display the approved monthly tiers without annual purchase links', () => {
  const pricing = app.split('function pricingSection() {')[1]?.split('function cinematicConversationScene()')[0] || '';
  assert.ok(pricing);
  assert.match(pricing, /card\('Advanced',49,/);
  assert.match(pricing, /card\('Premium',129,/);
  assert.match(pricing, /card\('Enterprise',149,/);
  assert.doesNotMatch(pricing, /_yearly|annual-save-note|yearlyMonthly/);

  for (const source of [app, effects]) {
    assert.doesNotMatch(source, /href="\/tilaus\?plan=(?:basic|advanced|business)_yearly"/);
    assert.doesNotMatch(source, /(?:Starter 34,90|Advanced 44,90|Business 54,90)/);
  }
});

test('searchable marketing and guides do not advertise obsolete plan pricing', () => {
  for (const source of [html, guide]) {
    assert.doesNotMatch(source, /(?:Starter 34[,.]90|Advanced 44[,.]90|Business 54[,.]90)/);
    assert.match(source, /(?:Respondo Advanced|Advanced 49|Advanced €49|Advanced 49 €)/);
  }
});

test('no stale public prices remain across localized FAQ, legal pages or conversion content', () => {
  for (const path of [
    'public/app.js',
    'public/effects.js',
    'public/index.html',
    'public/global-resources.mjs',
    'public/legal-content.js',
    'public/customer-service-landing.mjs',
    'public/ai-topic-pages.mjs',
    'respondo-faq.mjs',
  ]) {
    const source = read(path);
    assert.doesNotMatch(source, /(?:29|34|39|44|49|54)[,.]90|(?:€29|€34|€39|€44|€49|€54)\.90/, 'outdated amount found in ' + path);
  }
});
