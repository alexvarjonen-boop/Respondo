import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('retired guides do not appear in website footer or sitemap', () => {
  const server = read('server.mjs');
  const client = read('public/app.js');
  const slugs = ['asiakaspalvelun-automatisointi', 'chatbot-verkkokauppaan', 'chatbot-yritykselle-testikysymykset'];
  for (const slug of slugs) {
    assert.ok(!client.includes('/opas/' + slug + '.html'), 'footer must not link '+slug);
    assert.ok(!server.includes("'/opas/" + slug + ".html'"), 'sitemap must not list '+slug);
    assert.ok(!fs.existsSync(path.join(root,'public/opas',slug+'.html')), 'guide file must be deleted');
  }
  assert.match(server, /app\.get\(\/\^\\\/opas/);
  assert.match(server, /status\(410\)/);
  assert.match(server, /X-Robots-Tag/);
  assert.ok(!fs.existsSync(path.join(root,'public/opas/guide.css')));
  assert.ok(!fs.existsSync(path.join(root,'public/opas/guide.js')));
});

test('contact page retains Finnish, Swedish and English SEO metadata', () => {
  const server = read('server.mjs');
  assert.match(server, /Yhteystiedot \| Respondo AI/);
  assert.match(server, /Kontakt \| Respondo AI/);
  assert.match(server, /Contact (?:Respondo AI \| Support and Sales|\| Respondo AI)/);
});

test('canonical domain remains the verified apex domain', () => {
  const server = read('server.mjs');
  const client = read('public/app.js');
  assert.ok(server.includes("process.env.NODE_ENV === 'production' ? 'https://respondoai.fi' : BASE"));
  assert.ok(client.includes("https://respondoai.fi"));
  assert.ok(!client.includes("https://www.respondoai.fi"));
});
