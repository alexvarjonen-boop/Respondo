import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GLOBAL_GUIDE_PATHS, globalGuideData, globalResourcesMarkup } from '../public/global-resources.mjs';

const path = '/guides/ai-chatbot-pricing';
const serverSource = readFileSync(new URL('../server.mjs', import.meta.url), 'utf8');
const browserSource = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');

test('transparent pricing guide has substantial, non-promissory Finnish, Swedish and English content', () => {
  assert.ok(GLOBAL_GUIDE_PATHS.includes(path));
  for (const lang of ['fi','sv','en']) {
    const data = globalGuideData(path, lang);
    assert.ok(data, 'missing pricing guide for ' + lang);
    assert.ok(data.sections.length >= 7, 'too few useful buyer sections in ' + lang);
    assert.ok(data.faq.length >= 4, 'missing buyer FAQs for ' + lang);
    const html = globalResourcesMarkup(path, lang);
    assert.match(html, /<main/);
    assert.match(html, /<h1>/);
    assert.ok(html.length > 4000, 'thin pricing content for ' + lang);
    for (const [plan,amount] of [['Advanced','49'],['Premium','129'],['Enterprise','149']]) {
      const localizedPrice = lang === 'en' ? '€'+amount : amount+' €';
      assert.ok(html.includes(localizedPrice), lang + ' missing monthly price ' + plan + ' '+localizedPrice);
    }
    assert.ok(!/guaranteed savings|säästät varmasti|garanterad besparing/i.test(html), 'unsubstantiated savings claim');
    assert.ok(globalResourcesMarkup('/guides', lang).includes(path), 'guide directory missing ' + lang + ' link');
    assert.ok(html.includes('href="/hinnat' + (lang === 'en' ? '' : '?lang=' + lang) + '"'), 'localized pricing page CTA missing for ' + lang);
  }
});

test('pricing page is indexable with matching metadata and an RSS feed entry', () => {
  const indexable = serverSource.match(/const SEO_INDEXABLE_PATHS = new Set\(\[([\s\S]+?)\]\)/)?.[1] || '';
  assert.ok(indexable.includes("'"+path+"'"), 'server must index pricing guide');
  assert.ok(serverSource.includes('...GLOBAL_GUIDE_PATHS'), 'sitemap must dynamically include all guide URLs');
  assert.ok(browserSource.includes("'"+path+"'"), 'browser metadata missing');
  const rss = readFileSync(new URL('../public/guides/feed.xml', import.meta.url), 'utf8');
  assert.ok(rss.includes(path + '?lang=en'));
  const shell = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.ok(shell.includes('-comparison-v1-pricing-v1'), 'cache-busted bundle not loaded');
  assert.ok(browserSource.includes('-comparison-v1-pricing-v1'), 'browser is still importing stale resource data');
});

test('Google-readable localized pricing pages are present in the first HTML response and sitemap', async (t) => {
  const { app } = await import('../server.mjs');
  const server = await new Promise(resolve => {
    const handle = app.listen(0, '127.0.0.1', () => resolve(handle));
  });
  t.after(() => new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve())));
  const root = 'http://127.0.0.1:' + server.address().port;
  for (const lang of ['fi','sv','en']) {
    const target = path + (lang === 'en' ? '' : '?lang=' + lang);
    const response = await fetch(root + target);
    assert.equal(response.status, 200, target);
    const html = await response.text();
    assert.match(html, new RegExp('<html lang="' + lang + '"'));
    assert.match(html, /<meta name="robots" content="index,follow/);
    assert.ok(html.includes('<h1>' + globalGuideData(path, lang).title + '</h1>'), lang + ' crawler HTML not localized');
    assert.match(html, /hreflang="en"/);
    assert.match(html, /hreflang="sv"/);
  }
  const map = await (await fetch(root + '/sitemap.xml')).text();
  assert.ok(map.includes('/guides/ai-chatbot-pricing'));
  assert.ok(map.includes('/guides/ai-chatbot-pricing?lang=fi'));
  assert.ok(map.includes('/guides/ai-chatbot-pricing?lang=sv'));
  assert.ok(map.includes('/guides/ai-chatbot-pricing</loc>'));
});
