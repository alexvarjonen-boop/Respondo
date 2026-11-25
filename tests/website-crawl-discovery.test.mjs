import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizedCrawlUrl,crawlUrlKey,crawlPageLinks,sitemapEntries,selectSitemapPages} from '../website-crawl-discovery.mjs';
import {extractBusinessDocument,essentialWebsiteCandidates} from '../website-knowledge.mjs';

const root='https://example.test/';
test('tracking duplicates collapse but genuine product variants remain distinct',()=>{
  assert.equal(crawlUrlKey(root+'palvelut?utm_source=x#more'),crawlUrlKey(root+'palvelut/'));
  assert.notEqual(crawlUrlKey(root+'products/coat?variant=1'),crawlUrlKey(root+'products/coat?variant=2'));
  for(const bad of ['https://evil.test/contact','https://user@example.test/a','http://example.test:8080/a','/checkout','/products/a?add-to-cart=1','/search?q=a','/image.webp']){
    assert.equal(normalizedCrawlUrl(bad,root),'',bad);
  }
});
test('visible link labels prioritize otherwise opaque routes and unquoted hrefs',()=>{
  const links=crawlPageLinks('<a href=/p/42><span>Hinnasto</span></a><a href="/a">Welcome</a><a href="/p/42?utm_source=ad">Hinnasto</a><script>const fake="<a href=/fake>Contact</a>"</script>',root);
  assert.equal(links.length,2);
  assert.equal(links[0].url,root+'p/42');
  assert.ok(links[0].score>links[1].score);
});
test('sitemap indexes preserve nested maps and reject foreign hosts',()=>{
  const xml='<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>https://example.test/product-sitemap.xml</loc></sitemap><sitemap><loc>https://evil.test/sitemap.xml</loc></sitemap></sitemapindex>';
  assert.deepEqual(sitemapEntries(xml,root).map(x=>[x.url,x.index]),[[root+'product-sitemap.xml',true]]);
});
test('sitemap selection prioritizes important pages regardless of their location in XML',()=>{
  const products=Array.from({length:50},(_,i)=>'<url><loc>'+root+'products/'+i+'</loc><image:image><image:loc>'+root+'photo.jpg</image:loc></image:image></url>').join('');
  const xml='<urlset>'+products+'<url><loc><![CDATA[https://example.test/yhteystiedot]]></loc></url><url><loc>https://example.test/hinnasto?utm_source=xml</loc></url></urlset>';
  assert.deepEqual(selectSitemapPages(sitemapEntries(xml,root),2),[root+'yhteystiedot',root+'hinnasto']);
});
test('extracts explicit delivery and return rules from sales terms rather than contact or legal noise',()=>{
  const url=root+'terms-and-conditions';
  const doc=extractBusinessDocument('<h2>Delivery</h2><p>Orders are delivered within 3 business days.</p><h2>Returns</h2><p>You may return unused items within 30 days.</p><h2>Other information</h2><p>Contact the supplier at info@vendor.test.</p>',url);
  const rows=essentialWebsiteCandidates({finalUrl:root,pageDocuments:[doc]});
  assert.ok(rows.some(r=>/3 business days/.test(r.answer)));
  assert.ok(rows.some(r=>/30 days/.test(r.answer)));
  assert.ok(!rows.some(r=>/vendor\.test/.test(r.answer)));
});
test('bare service numbers do not become monetary claims',()=>{
  const url=root+'palvelut';
  const doc=extractBusinessDocument('<h2>Ikkunanpesu</h2><p>45</p><h2>Toimistosiivous</h2><p>75 €</p>',url);
  const rows=essentialWebsiteCandidates({finalUrl:root,pageDocuments:[doc]});
  assert.ok(!rows.some(r=>r.category==='Hinnat'&&/45/.test(r.answer)));
  assert.ok(rows.some(r=>r.category==='Hinnat'&&/75 €/.test(r.answer)));
});

test('price table retains column labels, currency and duration for the same service',()=>{
  const url=root+'hinnasto';
  const doc=extractBusinessDocument('<table><tr><th>Palvelu</th><th>Kesto (min)</th><th>Hinta (€)</th></tr><tr><td>Ikkunanpesu</td><td>45</td><td>80</td></tr><tr><td>Toimistosiivous</td><td>60</td><td>95</td></tr></table>',url);
  const rows=essentialWebsiteCandidates({finalUrl:root,pageDocuments:[doc]});
  assert.ok(rows.some(r=>r.category==='Hinnat'&&/Ikkunanpesu.*Kesto \(min\): 45.*Hinta \(€\): 80 €/.test(r.answer)));
  assert.ok(rows.some(r=>r.category==='Hinnat'&&/Toimistosiivous.*Hinta \(€\): 95 €/.test(r.answer)));
  assert.ok(!rows.some(r=>r.category==='Hinnat'&&/Ikkunanpesu.*95/.test(r.answer)));
});
test('nested sections restore outer heading after child content',()=>{
  const doc=extractBusinessDocument('<section><h2>Ikkunanpesu</h2><section><h3>Työvälineet</h3><p>Käytämme puhdistusvälineitä.</p></section><p>Hinta 80 €.</p></section>',root+'palvelut');
  assert.ok(doc.blocks.some(b=>b.heading==='Ikkunanpesu'&&b.text==='Hinta 80 €.'));
});
test('table header currency does not leak to following tables',()=>{
  const doc=extractBusinessDocument('<table><tr><th>Palvelu</th><th>Hinta (€)</th></tr><tr><td>Ikkunanpesu</td><td>80</td></tr></table><table><tr><td>Toimistosiivous</td><td>60</td></tr></table>',root+'palvelut');
  assert.ok(!doc.blocks.some(b=>b.verifiedPriceTable&&/Toimistosiivous/.test(b.text)));
});

test('hidden table cells cannot shift currency onto another column',()=>{
  const doc=extractBusinessDocument('<table><tr><th>Palvelu</th><th>Hinta (€)</th><th>Kesto</th></tr><tr><td>Ikkunanpesu</td><td hidden>80</td><td>45</td></tr></table>',root+'hinnasto');
  assert.ok(!doc.blocks.some(b=>b.verifiedPriceTable));
});
