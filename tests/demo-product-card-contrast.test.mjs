import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const server = readFileSync(new URL('../server.mjs', import.meta.url), 'utf8');

test('demo products keep readable text on light cards even under dark chat styles', () => {
  assert.match(app, /\.preview-bubble\.bot \.preview-product-card\{background:#fafafa!important;color:#171923!important;opacity:1!important/);
  for (const className of ['preview-product-copy strong', 'preview-product-desc', 'preview-product-price', 'preview-product-go']) {
    assert.ok(app.includes('.preview-bubble.bot .preview-product-card .' + className + '{color:'), 'missing explicit contrasting color for ' + className);
  }
  assert.match(app, /\.preview-bubble\.bot \.preview-product-card \.preview-product-desc\{color:#414653!important\}/);
});

test('Finnish shopping questions are recognized despite English demo UI', () => {
  assert.match(server, /'löytyykö','myytte','myyttekö','myymme','myydä','valikoima','tuotteita','tuotteet','tuote','putterit'/);
  assert.match(server, /function broadProductQuestion\(value\)/);
  assert.match(server, /const detectedLang=detectConversationLanguage\(message,lang\)/);
});
