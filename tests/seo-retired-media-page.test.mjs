import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { app } from '../server.mjs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('the retired media page and its public links are removed', () => {
  assert.equal(existsSync(new URL('../public/media/index.html', import.meta.url)), false);
  for (const file of [
    '../public/app.js',
    '../public/tools/asiakaspalvelubotti-testi.html',
    '../public/tools/ai-chatbot-evaluation.html'
  ]) {
    assert.equal(read(file).includes('/media/'), false, file + ' must not link to the retired media page');
  }
  const server = read('../server.mjs');
  assert.equal(server.includes("SEO_CANONICAL_ORIGIN + '/media/'"), false, 'No sitemap entry for the retired media page');
  assert.doesNotMatch(server, /Respondo AI tuotetiedot medialle/, 'No SEO fallback link');
});

test('all former media-kit URLs return HTTP 410 and stay out of the sitemap', async t => {
  const listener = await new Promise(resolve => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  t.after(() => new Promise((resolve,reject) => listener.close(e => e ? reject(e) : resolve())));
  const base = 'http://127.0.0.1:' + listener.address().port;
  for (const route of ['/media', '/media/', '/media/index.html', '/media/?lang=en']) {
    const response = await fetch(base + route, {redirect:'manual'});
    assert.equal(response.status, 410, route + ' must be gone');
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
  const sitemap = await fetch(base + '/sitemap.xml');
  assert.equal(sitemap.status,200);
  assert.equal((await sitemap.text()).includes('/media/'), false);
  const home = await fetch(base + '/');
  assert.equal(home.status,200);
  assert.equal((await home.text()).includes('href="/media/"'), false);
});
