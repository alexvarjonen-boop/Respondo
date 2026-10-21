import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../server.mjs';

test('public landing content is present in the initial HTML without JavaScript', async (t) => {
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  t.after(() => new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve())));
  const origin = 'http://127.0.0.1:' + server.address().port;

  for (const [url, expectedH1, lang] of [
    ['/', 'AI customer service bot for businesses 24/7', 'en'],
    ['/?lang=fi', 'AI-asiakaspalvelubotti yrityksille 24/7', 'fi'],
    ['/?lang=en', 'AI customer service bot for businesses 24/7', 'en'],
    ['/kenelle-sopii?lang=sv', 'Vem passar Respondo AI för?', 'sv'],
    ['/kenelle-sopii?lang=en', 'Who is Respondo AI for?', 'en'],
    ['/autokorjaamo-chatbot?lang=en', 'Chatbot for auto repair shops', 'en'],
    ['/lvi-chatbot?lang=sv', 'Chatbot för VVS-företag', 'sv'],
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
    for (const path of ['/autokorjaamo-chatbot', '/lvi-chatbot', '/verkkokauppa-chatbot', '/asiakaspalvelubotti', '/ajanvaraus-chatbot']) {
      assert.ok(initial.includes('href="' + path + (lang === 'en' ? '' : '?lang=' + lang) + '"'), 'missing localized internal link ' + path + ' for ' + lang);
    }
  }
});
