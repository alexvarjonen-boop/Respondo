import test from 'node:test';
import assert from 'node:assert/strict';
import { checkSite } from '../scripts/production-smoke.mjs';

const originalFetch = globalThis.fetch;
const html = (lang = 'fi') =>
  '<html lang="' + lang + '"><head><title>Respondo AI</title>' +
  '<link rel="alternate" hreflang="fi" href="/" />' +
  '<link rel="alternate" hreflang="sv" href="/?lang=sv" />' +
  '<link rel="alternate" hreflang="en" href="/?lang=en" /></head><body><h1>Respondo</h1></body></html>';

function fakeResponse(url, init, { unhealthy = false, brokenSwedish = false, apexUnavailable = false } = {}) {
  const u = new URL(url);
  let body = html(u.searchParams.get('lang') || (u.pathname === '/ominaisuudet' ? 'fi' : 'en'));
  let status = 200;
  let contentType = 'text/html';
  if (u.pathname === '/api/health') {
    status = unhealthy ? 503 : 200;
    contentType = 'application/json';
    body = JSON.stringify({ ok: !unhealthy, database: !unhealthy });
  } else if (u.pathname === '/api/public/config') {
    contentType = 'application/json';
    body = '{}';
  } else if (u.pathname === '/sitemap.xml') {
    contentType = 'application/xml';
    body = '<urlset><url><loc>https://www.respondoai.fi/</loc></url></urlset>';
  } else if (u.pathname === '/robots.txt') {
    contentType = 'text/plain';
    body = 'User-agent: *\nSitemap: https://www.respondoai.fi/sitemap.xml\n';
  } else if (u.pathname.startsWith('/__respondo_smoke_unknown_route_404')) {
    status = 404;
  } else if (brokenSwedish && u.searchParams.get('lang') === 'sv') {
    body = html('fi');
  }
  if (apexUnavailable && u.hostname === 'respondoai.fi') status = 503;
  return Promise.resolve(new Response(init?.method === 'HEAD' ? null : body, {
    status,
    headers: { 'content-type': contentType },
  }));
}

test('production smoke verifies health, critical pages, localized SSR, HEAD and 404', async t => {
  t.after(() => { globalThis.fetch = originalFetch; });
  let count = 0;
  globalThis.fetch = (url, init) => { count++; return fakeResponse(url, init); };
  const outcome = await checkSite('https://www.respondoai.fi');
  assert.equal(outcome.ok, true);
  assert.ok(count >= 18, 'Production smoke must probe more than just the homepage');
});

test('production smoke fails on unhealthy database rather than reporting success', async t => {
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = (url, init) => fakeResponse(url, init, { unhealthy: true });
  await assert.rejects(checkSite('https://www.respondoai.fi'), /expected HTTP 200, got 503/);
});

test('production smoke catches wrong-language server HTML', async t => {
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = (url, init) => fakeResponse(url, init, { brokenSwedish: true });
  await assert.rejects(checkSite('https://www.respondoai.fi'), /must return localized SSR HTML/);
});

test('production smoke detects an unavailable apex domain even when www works', async t => {
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = (url, init) => fakeResponse(url, init, { apexUnavailable: true });
  await assert.rejects(checkSite('https://www.respondoai.fi'), /expected HTTP 200, got 503/);
});
