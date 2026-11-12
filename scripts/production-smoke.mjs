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

// Public anchor links only. Protected dashboard buttons need authenticated
// browser tests and are deliberately not included in this result.
export function discoverPublicLinks(html, origin, maximum = 45) {
  const found = new Set();
  for(const match of String(html||'').matchAll(/<a\b[^>]*\bhref\s*=\s*(['"])(.*?)\1/gi)) {
    let url;
    try { url = new URL(match[2].replace(/&amp;/gi,'&'), origin); } catch { continue; }
    if(url.origin !== new URL(origin).origin) continue;
    if(/^\/(?:api|app|dashboard|logout|request-status)(?:\/|$)/i.test(url.pathname)) continue;
    if(/\.(?:svg|png|webp|jpe?g|pdf|css|js|zip|mp4)$/i.test(url.pathname)) continue;
    found.add(url.pathname + (url.searchParams.has('lang') ? '?lang='+encodeURIComponent(url.searchParams.get('lang')) : ''));
    if(found.size >= maximum) break;
  }
  return [...found];
}


/**
 * Read-only capability smoke: each owner-only API must exist and reject a
 * visitor without a session. This does NOT test authenticated button flows.
 */
export async function checkProtectedCapabilityRoutes(origin = defaultOrigin, fetcher = fetch) {
  const routes = [
    '/api/app/native/reliability',
    '/api/app/native/quality',
    '/api/app/import-website/auto-refresh',
    '/api/app/import-website/refresh-reviews',
    '/api/app/native/free-workflows',
    '/api/app/native/conversions',
    '/api/app/native/quality/scheduled',
    '/api/app/native/capability-health',
    '/api/app/native/sales',
  ];
  for (const path of routes) {
    const response = await fetcher(new URL(path, origin), {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
      headers: { 'user-agent': 'Respondo-Capability-Smoke/1.0' },
    });
    // The branded www domain permanently redirects to the apex domain.
    // Follow it, but never accept a redirected response from another host
    // or an unexpected path as proof that an owner endpoint is protected.
    if (response.url) {
      const finalUrl = new URL(response.url);
      const initial = new URL(origin);
      const allowedHosts = new Set([initial.hostname]);
      if (['www.respondoai.fi','respondoai.fi'].includes(initial.hostname)) {
        allowedHosts.add('www.respondoai.fi');
        allowedHosts.add('respondoai.fi');
      }
      assert.equal(finalUrl.protocol, initial.protocol, 'Unexpected protocol redirect: ' + path);
      assert.ok(allowedHosts.has(finalUrl.hostname), 'Off-site capability redirect: ' + path);
      assert.equal(finalUrl.pathname, path, 'Unexpected capability redirect path: ' + path);
    }
    assert.equal(response.status, 401, 'Protected API missing or accessible anonymously: ' + path);
    assert.match(response.headers.get('content-type') || '', /application\/json/i, path + ' must return JSON');
  }
  return { tested: routes.length, authenticatedWorkflowsVerified: false };
}

export async function checkSite(origin = defaultOrigin) {
  const { body: healthText } = await request(origin, '/api/health');
  const health = JSON.parse(healthText);
  assert.equal(health.ok, true, 'Health endpoint must report a healthy application');
  assert.equal(health.database, true, 'Health endpoint must verify its database connection');

  await request(origin, '/api/public/config');
  const capabilitySmoke = await checkProtectedCapabilityRoutes(origin);
  // A healthy homepage is insufficient if the embeddable bot or onboarding
  // scripts return a 404 or an HTML error document after deployment.
  const criticalAssets=['/widget.js','/instant-website-demo-ui.js','/integration-onboarding.js','/owner-growth-center.js','/reliability-console.js'];
  for (const path of criticalAssets) {
    const {response,body}=await request(origin,path);
    assert.match(response.headers.get('content-type')||'',/javascript|ecmascript/i,
      path+' must be a JavaScript asset');
    assert.ok(body.length>500,path+' must not be empty or an error page');
  }
  const {response:reliabilityCss}=await request(origin,'/reliability-console.css');
  assert.match(reliabilityCss.headers.get('content-type')||'',/text\/css/i,
    'Reliability Console styles must load');
  const {response:clarityCss}=await request(origin,'/operational-clarity.css');
  assert.match(clarityCss.headers.get('content-type')||'',/text\/css/i,
    'Operator workflow and evidence styles must load');
  const {response:styleResponse}=await request(origin,'/owner-growth-center.css');
  assert.match(styleResponse.headers.get('content-type')||'',/text\/css/i,
    'Growth Center stylesheet must load');
  const {response:logoResponse}=await request(origin,'/respondo-symbol.svg');
  assert.match(logoResponse.headers.get('content-type')||'',/image\/svg\+xml/i,
    'Approved brand symbol must load as SVG');

  // Both the apex and www domains are advertised publicly. Their health
  // must be tested independently so DNS/certificate/redirect regressions
  // cannot leave half of Respondo's visitors on a broken host.
  if (new URL(origin).hostname === 'www.respondoai.fi') {
    const { response, body } = await request('https://respondoai.fi', '/');
    assert.match(response.headers.get('content-type') || '', /text\/html/i, 'Apex domain must serve HTML');
    assert.match(body, /<title>[^<]+<\/title>/i, 'Apex domain must render a page title');
  }

  // Every route below is important either for signups or Google discoverability.
  const publicPages = [
    '/', '/ominaisuudet', '/hinnat', '/yhteystiedot',
    '/tietosuoja', '/kayttoehdot', '/assistant',
    '/asiakaspalvelubotti', '/verkkokauppa-chatbot',
  ];
  const discoveredLinks = new Set();
  for (const path of publicPages) {
    const { response, body } = await request(origin, path);
    assert.match(response.headers.get('content-type') || '', /text\/html/i, path + ' must serve HTML');
    assert.match(body, /<title>[^<]+<\/title>/i, path + ' needs a server-rendered title');
    for (const href of discoverPublicLinks(body, origin)) discoveredLinks.add(href);
  }
  // A broken link in the public SSR navigation is a deploy regression.
  const linkedPages = [...discoveredLinks].filter(path => !publicPages.includes(path)).slice(0, 55);
  for (const path of linkedPages) {
    const { response } = await request(origin, path);
    assert.match(response.headers.get('content-type') || '', /text\/html/i,
      path + ' is a public navigation target and must serve HTML');
  }

  for (const lang of ['fi', 'sv', 'en']) {
    // English is the public default; Finnish and Swedish use explicit ?lang.
    const path = '/verkkokauppa-chatbot' + (lang === 'en' ? '' : '?lang=' + lang);
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

  return { ok: true, checkedPages: publicPages.length + linkedPages.length, checkedLanguages: 3, checkedAssets: 9, protectedCapabilityRoutes: capabilitySmoke.tested, authenticatedWorkflowsVerified: false };
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
