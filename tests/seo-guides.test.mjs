import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('Finnish evergreen guides are crawlable HTML with unique canonical and title', () => {
  for (const slug of ['asiakaspalvelun-automatisointi','chatbot-verkkokauppaan']) {
    const html = read('public/opas/' + slug + '.html');
    assert.match(html, /<html lang="fi">/);
    assert.match(html, /<h1>[^<]{25,}<\/h1>/);
    assert.match(html, /<meta name="description" content="[^"]{70,}">/);
    assert.ok(html.includes('<link rel="canonical" href="https://www.respondoai.fi/opas/' + slug + '.html">'));
    assert.ok(html.includes('href="/tilaus"'));
    assert.ok(html.includes('href="/verkkokauppa-chatbot"'));
  }
  assert.ok(read('public/opas/guide.css').includes('@media'));
});

test('editorial guides are in the sitemap and linked from the visible product footer', () => {
  const server = read('server.mjs');
  const client = read('public/app.js');
  for (const slug of ['asiakaspalvelun-automatisointi','chatbot-verkkokauppaan']) {
    assert.ok(server.includes("'/opas/" + slug + ".html'"));
    assert.ok(client.includes('href="/opas/' + slug + '.html"'));
  }
});

test('contact page has distinct Finnish, Swedish and English SEO metadata', () => {
  const server = read('server.mjs');
  assert.match(server, /Yhteystiedot \| Respondo AI/);
  assert.match(server, /Kontakt \| Respondo AI/);
  assert.match(server, /Contact Respondo AI \| Support and Sales/);
});
