import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../server.mjs';

test('HEAD responds like GET on public pages and SEO URLs', async (t) => {
  const listener = await new Promise(resolve => {
    const handle = app.listen(0, '127.0.0.1', () => resolve(handle));
  });
  t.after(() => new Promise((resolve, reject) =>
    listener.close(error => error ? reject(error) : resolve())));
  const base = 'http://127.0.0.1:' + listener.address().port;
  const urls = [
    '/', '/tilaus', '/kirjaudu', '/hinnat', '/kayttoehdot',
    '/tietosuoja', '/asiakaspalvelubotti', '/shopify-chatbot',
    '/asiakaspalvelun-automatisointi', '/monikielinen-chatbot',
    '/liidien-keruu-chatbotilla?lang=sv', '/guides?lang=en',
  ];
  for (const url of urls) {
    const get = await fetch(base + url);
    const head = await fetch(base + url, { method: 'HEAD' });
    assert.equal(get.status, 200, 'GET ' + url);
    assert.equal(head.status, get.status, 'HEAD ' + url);
    assert.match(head.headers.get('content-type') || '', /text\/html/, url);
    assert.equal(head.headers.get('content-language'),
      get.headers.get('content-language'), 'language for ' + url);
    assert.equal(head.headers.get('link'), get.headers.get('link'),
      'canonical for ' + url);
    assert.equal(await head.text(), '', 'HEAD has no HTML body ' + url);
  }
  for (const method of ['GET','HEAD']) {
    const missing = await fetch(base + '/nonexistent-seo-page-20261016', { method });
    assert.equal(missing.status, 404, method + ' unknown URL should remain 404');
  }
  const favicon = await fetch(base + '/favicon.png');
  assert.equal(favicon.status, 200);
  assert.match(favicon.headers.get('content-type')||'', /image\/png/);
});
