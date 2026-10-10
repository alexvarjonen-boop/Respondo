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
    assert.ok(html.includes('<link rel="canonical" href="https://respondoai.fi/opas/' + slug + '.html">'));
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
  assert.match(server, /Contact (?:Respondo AI \| Support and Sales|\| Respondo AI)/);
});


test('canonical host is the verified apex domain for sitemap, social cards and client links', () => {
  const server = read('server.mjs');
  const client = read('public/app.js');
  assert.ok(server.includes("process.env.NODE_ENV === 'production' ? 'https://respondoai.fi' : BASE"));
  assert.ok(client.includes("https://respondoai.fi"));
  assert.ok(!client.includes("https://www.respondoai.fi"));
  for(const slug of ['asiakaspalvelun-automatisointi','chatbot-verkkokauppaan','chatbot-yritykselle-testikysymykset']) {
    const html = read('public/opas/' + slug + '.html');
    assert.match(html, /<link rel="canonical" href="https:\/\/respondoai\.fi\/opas\//);
    assert.ok(!html.includes('https://www.respondoai.fi'));
  }
});

test('new cross-industry guide is substantive, discoverable and linked', () => {
  const html = read('public/opas/chatbot-yritykselle-testikysymykset.html');
  const server = read('server.mjs');
  const client = read('public/app.js');
  assert.match(html, /<html lang="fi">/);
  assert.match(html, /<h1>Chatbot yritykselle:/);
  assert.ok((html.match(/<li>/g)||[]).length >= 40);
  assert.match(html, /application\/ld\+json/);
  assert.ok(server.includes("'/opas/chatbot-yritykselle-testikysymykset.html'"));
  assert.ok(client.includes('href="/opas/chatbot-yritykselle-testikysymykset.html"'));
  assert.ok(html.includes('href="/asiakaspalvelubotti"'));
});
