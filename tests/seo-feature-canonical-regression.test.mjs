import test from 'node:test';
import assert from 'node:assert/strict';

test('dedicated feature-language paths are self-canonical and match the sitemap', async (t) => {
  const { app } = await import('../server.mjs');
  const server = await new Promise((resolve) => {
    const handle = app.listen(0, '127.0.0.1', () => resolve(handle));
  });
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const origin = 'http://127.0.0.1:' + server.address().port;

  for (const [pathname, language] of [
    ['/ominaisuudet', 'fi'],
    ['/funktioner', 'sv'],
    ['/features', 'en'],
  ]) {
    const response = await fetch(origin + pathname);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-language'), language);
    const html = await response.text();
    const canonical = html.match(/<link rel="canonical" href="([^"]+)">/)?.[1];
    assert.equal(new URL(canonical).pathname, pathname);
    assert.equal(new URL(canonical).search, '');
  }

  const sitemap = await (await fetch(origin + '/sitemap.xml')).text();
  for (const pathname of ['/ominaisuudet', '/funktioner', '/features']) {
    assert.match(sitemap, new RegExp('<loc>[^<]*' + pathname + '<\\/loc>'));
  }
});
