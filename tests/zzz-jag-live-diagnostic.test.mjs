import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchWebsiteBundle,websiteKnowledgeCandidates} from '../server.mjs';
import {explicitShippingThresholdFacts} from '../website-knowledge.mjs';
test('temporary live JAG policy sample diagnostic', {timeout:110000},async()=>{
  const url='https://jagputters.fi/';
  const b=await fetchWebsiteBundle(url,55,35000,null,{storefrontLimit:500,storefrontBudgetMs:5000,sitemapLimit:1000});
  const product=await fetch('https://jagputters.fi/products/superstroke-pistol-1-0',{signal:AbortSignal.timeout(10000)});
  const raw=await product.text();
  const needles=[...raw.matchAll(/280|free.{0,50}shipping|shipping.{0,50}free/gi)].slice(0,35);
  console.log('JAG_RAW_DIAG',JSON.stringify({status:product.status,htmlLength:raw.length,matches:needles.map(m=>raw.slice(Math.max(0,m.index-170),Math.min(raw.length,m.index+220)).replace(/\\s+/g,' ').slice(0,400))}));
  const facts=websiteKnowledgeCandidates(b);
  const records=b.pageDocuments.map(d=>({url:d.url,thresholds:d.shippingThresholdFacts?.slice(0,3)||[],nearby:d.blocks?.filter(x=>/shipping.{0,60}280|280.{0,60}shipping/i.test(x.text)).slice(0,2).map(x=>x.text)||[]}));
  console.log('JAG_POLICY_DIAG',JSON.stringify({pages:b.pageDocuments.length,productCount:b.products?.length,records:records.slice(0,30),shippingFacts:facts.filter(x=>/280/.test(x.answer)).slice(0,8)}));
  assert.ok(facts.some(x=>/free shipping.{0,80}280\s*€/i.test(x.answer)), 'Shipping threshold absent in sample');
});
