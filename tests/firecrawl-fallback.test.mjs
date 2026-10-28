import test from 'node:test';
import assert from 'node:assert/strict';
import {
  firecrawlEnabled, firecrawlMaxPages, permittedFirecrawlTarget, fetchFirecrawlRenderedHtml,
} from '../firecrawl-fallback.mjs';
import { extractBusinessDocument, essentialWebsiteCandidates } from '../website-knowledge.mjs';

test('Firecrawl is disabled by default and enforces a strict per-import budget', () => {
  assert.equal(firecrawlEnabled({ FIRECRAWL_API_KEY: 'fc-test' }), false);
  assert.equal(firecrawlEnabled({ FIRECRAWL_ENABLED: 'true' }), false);
  assert.equal(firecrawlEnabled({ FIRECRAWL_ENABLED: 'true', FIRECRAWL_API_KEY: 'fc-test' }), true);
  assert.equal(firecrawlMaxPages({ FIRECRAWL_MAX_PAGES: '9999' }), 3);
  assert.equal(firecrawlMaxPages({ FIRECRAWL_MAX_PAGES: '-2' }), 0);
  assert.equal(firecrawlMaxPages({}), 2);
});

test('Firecrawl only accepts public same-host URLs previously validated by the native fetcher', () => {
  const good = 'https://shop.example.fi/pages/contact';
  assert.equal(permittedFirecrawlTarget(good, 'shop.example.fi'), true);
  for (const url of [
    'https://not-example.fi/pages/contact',
    'http://127.0.0.1/secrets',
    'http://localhost/secrets',
    'https://shop.example.fi.evil.org/',
    'https://username:password@shop.example.fi/',
    'https://shop.example.fi:8443/',
    'file:///etc/passwd',
    'https://10.0.0.1/',
  ]) {
    assert.equal(permittedFirecrawlTarget(url, 'shop.example.fi'), false, url);
  }
});

test('renders a sparse JS-first business site and extracts grounded service facts', async () => {
  let requests = 0;
  const html = '<html><main><h1>Huoltopalvelut</h1><p>Tarjoamme polkupyörien huoltoa ja rengaskorjauksia Turussa.</p><h2>Hinnat</h2><p>Perushuolto 59 €.</p><h2>Yhteystiedot</h2><p>info@example.fi</p></main></html>';
  const fetchImpl = async (endpoint, options) => {
    requests++;
    assert.equal(endpoint, 'https://api.firecrawl.dev/v2/scrape');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Authorization, 'Bearer fc-test');
    const body = JSON.parse(options.body);
    assert.equal(body.url, 'https://shop.example.fi/');
    assert.deepEqual(body.formats, ['html']);
    return {
      ok: true,
      headers: { get: () => null },
      text: async () => JSON.stringify({
        success: true,
        data: { html, metadata: { sourceURL: 'https://shop.example.fi/' } },
      }),
    };
  };
  const rendered = await fetchFirecrawlRenderedHtml('https://shop.example.fi/', {
    verifiedHostname: 'shop.example.fi', apiKey: 'fc-test', fetchImpl,
  });
  assert.equal(requests, 1);
  const document = extractBusinessDocument(rendered, 'https://shop.example.fi/');
  const candidates = essentialWebsiteCandidates({
    finalUrl: 'https://shop.example.fi/',
    pageDocuments: [document],
  });
  assert.ok(candidates.some(row => /59\s*€/i.test(row.answer)), JSON.stringify(candidates));
  assert.ok(candidates.some(row => /huolto|rengas/i.test(row.answer)), JSON.stringify(candidates));
});

test('offsite metadata and API failures cannot pollute imported facts', async () => {
  let requests = 0;
  const fetchImpl = async () => {
    requests++;
    return {
      ok: true,
      headers: { get: () => null },
      text: async () => JSON.stringify({
        success: true, data: { html: '<p>Wrong company</p>', metadata: { sourceURL: 'https://attacker.example/' } },
      }),
    };
  };
  assert.equal(await fetchFirecrawlRenderedHtml('https://example.fi/', {
    verifiedHostname: 'example.fi', apiKey: 'fc-test', fetchImpl,
  }), null);
  assert.equal(requests, 1);
  const rejected = await fetchFirecrawlRenderedHtml('https://127.0.0.1/admin', {
    verifiedHostname: '127.0.0.1', apiKey: 'fc-test', fetchImpl,
  });
  assert.equal(rejected, null);
  assert.equal(requests, 1);
  assert.equal(await fetchFirecrawlRenderedHtml('https://example.fi/', {
    verifiedHostname: 'example.fi', apiKey: 'fc-test',
    fetchImpl: async () => ({ok: false, status: 402}),
  }), null);
});
