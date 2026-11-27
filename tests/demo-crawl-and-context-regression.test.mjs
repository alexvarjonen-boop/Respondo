import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizedCrawlUrl,crawlPageLinks,sitemapEntries,customerPageScore} from '../website-crawl-discovery.mjs';
import {extractProducts} from '../website-knowledge.mjs';
import {generateGroundedAnswer,chatActions} from '../server.mjs';

const root='https://example.com';
test('discovery ignores fragments, fake href attributes and unsafe action paths',()=>{
  assert.equal(normalizedCrawlUrl('',root),'');
  assert.equal(normalizedCrawlUrl('#section',root),'');
  assert.equal(normalizedCrawlUrl('/checkout',root,{sitemap:true}),'');
  assert.equal(normalizedCrawlUrl('/sitemap.xml.gz',root,{sitemap:true}),root+'/sitemap.xml.gz');
  assert.deepEqual(crawlPageLinks('<a data-href="/bad">Fake</a><a href="/contact">Contact</a>',root).map(x=>x.url),[root+'/contact']);
  assert.ok(customerPageScore('/toimialue')>=300);
});
test('sitemaps prefer page loc over image extensions',()=>{
  const xml='<urlset><url><image:image><image:loc>https://example.com/wrong</image:loc></image:image><loc>https://example.com/right</loc></url></urlset>';
  assert.deepEqual(sitemapEntries(xml,root).map(x=>x.url),[root+'/right']);
});
const html=x=>'<script type="application/ld+json">'+JSON.stringify(x)+'</script>';
const p=(name,url)=>({'@type':'Product',name,...(url?{url}:{}),offers:{price:10,priceCurrency:'EUR'}});
test('a shared collection URL is not the direct URL of several products',()=>{
  assert.equal(extractProducts(html([p('Item A'),p('Item B')]),root+'/collection').length,0);
  assert.equal(extractProducts(html([p('Item A','/products/a'),p('Item B','/products/b')]),root+'/collection').length,2);
  assert.equal(extractProducts(html(p('Item A')),root+'/products/a')[0].url,root+'/products/a');
});
const rows=['JAG Headcover','JAG Putter'].map((title,i)=>({id:'product-'+i,category:'Tuotteet',title,answer:'Tuote: '+title+'. Hinta: '+(i?299:39)+' EUR. Linkki: '+root+'/products/'+(i?'putter':'headcover')+'.',source_type:'website',source_url:root+'/products/'+(i?'putter':'headcover')}));
const history=[{question:'Miten voin tilata headcoverin?',answer:'Tässä on suora linkki tuotteeseen JAG Headcover.'}];
for(const [lang,message] of [['fi','Paljonko?'],['fi','Entä hinta?'],['en','How much?'],['sv','Vad kostar?']]){
  test('short price question retains the named product: '+message,async()=>{
    const result=await generateGroundedAnswer({rows,message,history,lang,disableAIFallback:true});
    assert.equal(result.handoff,false,JSON.stringify(result));
    assert.deepEqual(result.selected.map(row=>row.id),['product-0']);
    assert.match(result.answer,/39/);
    assert.doesNotMatch(result.answer,/299/);
  });
}
test('product CTA must be based on a current row rather than an unrelated selected row',()=>{
  const forged={...rows[0],id:'foreign',source_url:'https://other.example/product'};
  assert.ok(!chatActions(rows,'Miten voin tilata headcoverin?',false,'fi',[forged]).some(x=>x.type==='product'));
});
