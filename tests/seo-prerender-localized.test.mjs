import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../server.mjs';

test('localized landing content and homepage cinematic hero are present without JavaScript', async (t) => {
  const server = await new Promise(resolve => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  t.after(() => new Promise((resolve, reject) =>
    server.close(err => err ? reject(err) : resolve())));
  const origin = 'http://127.0.0.1:' + server.address().port;

  // On slow phones, first paint must match the new homepage—not show the
  // older, full-page SEO explainer until client hydration completes.
  for (const [url, heading, lang] of [
    ['/', 'Smarter', 'en'],
    ['/?lang=fi', 'Älykkäämpää', 'fi'],
    ['/?lang=sv', 'Smartare', 'sv'],
    ['/?lang=en', 'Smarter', 'en']
  ]) {
    const response = await fetch(origin + url);
    assert.equal(response.status, 200, url);
    const html = await response.text();
    assert.match(html, new RegExp('<html lang="' + lang + '"'), url);
    assert.match(html, /<div id="app"><div class="home-page apple-home-page">/);
    assert.match(html, /<main class="immersive-home apple-home">/);
    assert.ok(html.includes('<h1 id="apple-home-title">' + heading), 'missing localized cinematic hero for ' + url);
    assert.match(html, /class="rs-studio-orbit-art"/);
    assert.doesNotMatch(html, /class="respondo-search-overview"/);
    assert.match(response.headers.get('cache-control') || '', /no-store/);
    assert.equal(response.headers.get('x-respondo-homepage'), 'cinematic-blue-mobile-firstpaint-v2');
    assert.match(html, /rel="alternate" hreflang="en"/);
    assert.match(html, /rel="alternate" hreflang="sv"/);
    assert.match(html, /rel="canonical"/);
  }

  for (const [url, expectedH1, lang] of [
    ['/kenelle-sopii?lang=sv', 'Vem passar Respondo AI för?', 'sv'],
    ['/kenelle-sopii?lang=en', 'Who is Respondo AI for?', 'en'],
    ['/autokorjaamo-chatbot?lang=en', 'Chatbot for auto repair shops', 'en'],
    ['/lvi-chatbot?lang=sv', 'Chatbot för VVS-företag', 'sv']
  ]) {
    const response = await fetch(origin + url);
    assert.equal(response.status, 200, url);
    const html = await response.text();
    assert.match(html, new RegExp('<html lang="' + lang + '"'), url);
    const initial = html.split('<div id="app">')[1]?.split('</div>')[0] || '';
    assert.ok(initial.startsWith('<main>'), 'no visible server-rendered main for ' + url);
    assert.ok(initial.includes('<h1>' + expectedH1 + '</h1>'), 'missing localized h1 for ' + url);
    assert.ok(!initial.includes('<noscript>'), 'public main should not be gated by noscript for ' + url);
    assert.match(html, /rel="alternate" hreflang="en"/);
    assert.match(html, /rel="alternate" hreflang="sv"/);
    assert.match(html, /rel="canonical"/);
  }

  for (const lang of ['sv', 'en']) {
    const html = await (await fetch(origin + '/kenelle-sopii?lang=' + lang)).text();
    const initial = html.split('<div id="app">')[1]?.split('</div>')[0] || '';
    for (const path of ['/autokorjaamo-chatbot','/lvi-chatbot','/verkkokauppa-chatbot','/asiakaspalvelubotti','/ajanvaraus-chatbot'])
      assert.ok(initial.includes('href="' + path + (lang === 'en' ? '' : '?lang=' + lang) + '"'),
        'missing localized internal link ' + path + ' for ' + lang);
  }
});
