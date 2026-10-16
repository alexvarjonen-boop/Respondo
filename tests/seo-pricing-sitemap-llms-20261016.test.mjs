import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { app } from '../server.mjs';
import { seoPricingMarkup, SEO_PRICING_TIERS } from '../public/seo-pricing-ssr.mjs';

test('pricing SSR accurately represents the actual package prices and annual billing',()=>{
  const client=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
  assert.equal(SEO_PRICING_TIERS.length,3);
  for(const tier of SEO_PRICING_TIERS){
    assert.equal(tier.monthly-tier.annualEquivalent,10);
    assert.equal(tier.annualEquivalent*12,tier.annualTotal);
    // Client pricing card derives the same package price and annual discount.
    assert.ok(client.includes('monthly-10'),'client annual discount must remain aligned');
    assert.ok(client.includes('pricingSection()'),'pricing page should use live client card generator');
  }
  for(const lang of ['fi','sv','en']){
    const html=seoPricingMarkup(lang);
    assert.equal((html.match(/<h1>/g)||[]).length,1);
    assert.ok((html.match(/<h2>/g)||[]).length>=3);
    assert.ok(html.length>2800,lang+' should have meaningful pricing and FAQs');
    for(const price of ['49','129','149','468','1428','1668'])
      assert.ok(html.includes(price),lang+' missing valid price '+price);
    assert.ok(html.includes('120 €'),lang+' annual saving');
    for(const p of ['/asiakaspalvelubotti','/asiakaspalvelun-automatisointi','/yhteystiedot']){
      const suffix=lang==='fi'?'':'?lang='+lang;
      assert.ok(html.includes('href="'+p+suffix+'"'),lang+' link '+p);
    }
  }
});

test('public pricing is rendered on server without JS; sitemap URLs are unique and llms content is properly separated',async(t)=>{
  const server=await new Promise(resolve=>{
    const listening=app.listen(0,'127.0.0.1',()=>resolve(listening));
  });
  t.after(()=>new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve())));
  const origin='http://127.0.0.1:'+server.address().port;
  for(const lang of ['fi','sv','en']){
    const url='/hinnat'+(lang==='fi'?'':'?lang='+lang);
    const res=await fetch(origin+url);
    assert.equal(res.status,200,url);
    const html=await res.text();
    const first=html.split('<div id="app">')[1]?.split('</div>')[0] || '';
    assert.ok(first.startsWith('<main '),lang+' SEO markup present on initial load');
    assert.match(html,/<h1>[^<]+<\/h1>/,lang+' heading');
    assert.ok(html.includes('<h3>Advanced</h3>'),lang+' tier');
    assert.ok(html.includes('<h3>Premium</h3>'),lang+' tier');
    assert.ok(html.includes('<h3>Enterprise</h3>'),lang+' tier');
    assert.ok(html.includes('hreflang="en"'),lang+' cross language URL');
    assert.ok(html.includes('rel="canonical"'),lang+' canonical');
    assert.ok(html.includes('<html lang="'+lang+'">'),lang+' document language');
    assert.ok(html.includes('AI') || html.includes('kundservice'),lang+' search description');
  }
  const sitemap=await fetch(origin+'/sitemap.xml');
  assert.equal(sitemap.status,200);
  const xml=await sitemap.text();
  const locs=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
  assert.ok(locs.length>30,'sitemap is substantive');
  assert.equal(locs.length,new Set(locs).size,'sitemap must not repeat canonical localized URLs');
  // The integration suite runs with NODE_ENV=test and a localhost canonical
  // origin, while production emits https://respondoai.fi. Verify URLs by path
  // and query rather than assuming the production hostname inside unit tests.
  for(const lang of ['fi','sv','en']){
    const match=locs.some((loc)=>{
      const u=new URL(loc.replace(/&amp;/g,'&'));
      return u.pathname==='/hinnat' && u.searchParams.get('lang')===(lang==='fi'?null:lang);
    });
    assert.ok(match,lang+' pricing URL in sitemap');
  }
  const llms=await fetch(origin+'/llms.txt');
  assert.equal(llms.status,200);
  const body=await llms.text();
  assert.ok(body.split('\n').length>20,'llms.txt must contain real newlines');
  assert.ok(body.includes('\n## Pricing\n'),'pricing section on separate lines');
  assert.ok(body.includes('\n## Public pages\n'),'public pages section on separate lines');
  assert.doesNotMatch(body,/\\n## Pricing/,'must not emit escaped literal newline');
});
