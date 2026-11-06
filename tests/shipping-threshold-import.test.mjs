import test from 'node:test';
import assert from 'node:assert/strict';
import {extractBusinessDocument,essentialWebsiteCandidates,explicitShippingThresholdFacts} from '../website-knowledge.mjs';

const url='https://shop.example/products/putter';
test('explicit free-shipping threshold inside a store promotion is grounded delivery knowledge',()=>{
 const doc=extractBusinessDocument(`<html><body><button class="offer">
  <span>Free shipping available on orders over 280€</span></button>
  <p>In-stock orders ship within 3-5 business days.</p></body></html>`,url);
 assert.deepEqual(doc.shippingThresholdFacts,['Free shipping available on orders over 280€']);
 const facts=essentialWebsiteCandidates({finalUrl:'https://shop.example',products:[],pageDocuments:[doc]});
 const policy=facts.filter(x=>x.category==='Toimitus ja seuranta' && /280/.test(x.answer));
 assert.equal(policy.length,1,JSON.stringify(facts));
 assert.equal(policy[0].sourceUrl,url);
});
test('progress widgets, scripts and vague advertising do not invent shipping conditions',()=>{
 const html=`<script>Free shipping available on orders over 999€</script>
 <div>You're €18 away from free shipping</div>
 <div>Spend €20 more to unlock free shipping</div>
 <div>Free shipping on selected products</div>`;
 assert.deepEqual(explicitShippingThresholdFacts(html),[]);
 assert.deepEqual(explicitShippingThresholdFacts('<button>Free shipping available on orders over 280</button>'),[]);
});

test('published Finnish-only free delivery amount remains scoped and is not inferred worldwide',()=>{
 const html='<html><body><div role="region" aria-label="Announcement"><p><span>Free shipping in 🇫🇮 on orders over 250€</span></p></div></body></html>';
 assert.deepEqual(explicitShippingThresholdFacts(html),['Free shipping in 🇫🇮 on orders over 250€']);
 const doc=extractBusinessDocument(html,url);
 const facts=essentialWebsiteCandidates({finalUrl:'https://shop.example',products:[],pageDocuments:[doc]});
 assert.ok(facts.some(x=>x.answer==='Free shipping in 🇫🇮 on orders over 250€' && x.sourceUrl===url));
 assert.ok(!facts.some(x=>x.answer.includes('280')));
});
