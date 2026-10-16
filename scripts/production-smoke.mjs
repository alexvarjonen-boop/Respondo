import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const defaultOrigin = 'https://www.respondoai.fi';

async function request(origin, path, { method = 'GET', expectedStatus = 200 } = {}) {
  const url = new URL(path, origin);
  const response = await fetch(url, {
    method,
    redirect: 'follow',
    signal: AbortSignal.timeout(15_000),
    headers: { 'user-agent': 'Respondo-Production-Smoke/1.0' },
  });
  assert.equal(response.status, expectedStatus, method + ' ' + path + ': expected HTTP ' + expectedStatus + ', got ' + response.status);
  return { response, body: method === 'HEAD' ? '' : await response.text() };
}

export async function checkSite(origin = defaultOrigin) {
  const { body: healthText } = await request(origin, '/api/health');
  const health = JSON.parse(healthText);
  assert.equal(health.ok, true, 'Health endpoint must report a healthy application');
  assert.equal(health.database, true, 'Health endpoint must verify its database connection');

  await request(origin, '/api/public/config');

  // Every route below is important either for signups or Google discoverability.
  const publicPages = [
    '/', '/ominaisuudet', '/hinnat', '/yhteystiedot',
    '/tietosuoja', '/kayttoehdot', '/assistant',
    '/asiakaspalvelubotti', '/verkkokauppa-chatbot',
  ];
  for (const path of publicPages) {
    const { response, body } = await request(origin, path);
    assert.match(response.headers.get('content-type') || '', /text\/html/i, path + ' must serve HTML');
    assert.match(body, /<title>[^<]+<\/title>/i, path + ' needs a server-rendered title');
  }

  for (const lang of ['fi', 'sv', 'en']) {
    const path = '/verkkokauppa-chatbot' + (lang === 'fi' ? '' : '?lang=' + lang);
    const { body } = await request(origin, path);
    assert.match(body, new RegExp('<html\\s+lang=["\']' + lang + '["\']', 'i'), path + ' must return localized SSR HTML');
    assert.match(body, /<h1\b/i, path + ' must include crawlable H1');
    for (const code of ['fi', 'sv', 'en']) {
      assert.match(body, new RegExp('hreflang=["\']' + code + '["\']', 'i'), path + ' missing ' + code + ' hreflang');
    }
  }

  for (const path of ['/hinnat', '/verkkokauppa-chatbot?lang=en']) {
    const { response, body } = await request(origin, path, { method: 'HEAD' });
    assert.equal(body, '', path + ' HEAD must not contain a response body');
    assert.match(response.headers.get('content-type') || '', /text\/html/i);
  }

  const { body: sitemap } = await request(origin, '/sitemap.xml');
  assert.match(sitemap, /<urlset\b/i, 'Sitemap XML is missing its URL set');
  assert.match(sitemap, /<loc>/i, 'Sitemap XML does not list any URLs');
  const { body: robots } = await request(origin, '/robots.txt');
  assert.match(robots, /^Sitemap:\s*https:\/\//im, 'robots.txt must disclose the sitemap URL');
  await request(origin, '/__respondo_smoke_unknown_route_404', { expectedStatus: 404 });

  return { ok: true, checkedPages: publicPages.length, checkedLanguages: 3 };
}

async function run() {
  const origin = process.env.RESPONDO_SMOKE_ORIGIN || defaultOrigin;
  const attempts = Math.max(1, Math.min(10, Number(process.env.RESPONDO_SMOKE_ATTEMPTS || 8)));
  const waitMs = Math.max(0, Math.min(60_000, Number(process.env.RESPONDO_SMOKE_RETRY_MS || 20_000)));
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const result = await checkSite(origin);
      console.log('Respondo production smoke PASS: ' + result.checkedPages + ' pages, ' + result.checkedLanguages + ' localized SEO variants, health, HEAD and 404.');
      return;
    } catch (error) {
      console.error('Respondo production smoke ' + attempt + '/' + attempts + ' failed: ' + error.message);
      if (attempt === attempts) process.exitCode = 1;
      else await sleep(waitMs);
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await run();
}
