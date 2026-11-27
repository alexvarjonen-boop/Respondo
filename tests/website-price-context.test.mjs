import test from 'node:test';
import assert from 'node:assert/strict';
import { extractBusinessDocument, essentialWebsiteCandidates } from '../website-knowledge.mjs';
const url='https://example.com/pricing';
function rows(html){return essentialWebsiteCandidates({finalUrl:url,pageDocuments:[extractBusinessDocument(html,url)]});}
test('pricing cards retain their named plan and billing period',()=>{
  const results=rows('<h1>Pricing</h1><h2>Advanced</h2><p>49 €/month</p><h2>Premium</h2><p>129 €/month</p>');
  assert.ok(results.some(row=>row.answer==='Advanced: 49 €/month'));
  assert.ok(results.some(row=>row.answer==='Premium: 129 €/month'));
});
test('unbound amounts are not imported as a company price',()=>{
  assert.ok(!rows('<h1>Pricing</h1><p>49 €</p>').some(row=>row.category==='Hinnat'));
});
test('specific service headings and price tables keep context',()=>{
  assert.ok(rows('<h2>Ikkunanpesu</h2><p>50 €</p>').some(row=>row.answer==='Ikkunanpesu: 50 €'));
  assert.ok(rows('<table><tr><td>Ikkunanpesu</td><td>50 €</td></tr></table>').some(row=>row.answer==='Ikkunanpesu: 50 €'));
});
test('multiple phone numbers in a single contact block are retained',()=>{
  assert.equal(rows('<p>Phone: +358 40 123 4567, +358 50 987 6543</p>').filter(row=>row.title==='Puhelinnumero').length,2);
});
