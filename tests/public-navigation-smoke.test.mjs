import test from 'node:test';
import assert from 'node:assert/strict';
import {discoverPublicLinks} from '../scripts/production-smoke.mjs';

test('smoke audit discovers only public same-origin HTML navigation targets',()=>{
 const html=`
 <a href="/ominaisuudet">Features</a>
 <a class="nav" href="/guides/ai-customer-service-chatbot?lang=fi#top">Guide</a>
 <a href="https://www.respondoai.fi/hinnat">Pricing</a>
 <a href="https://elsewhere.example/private">External</a>
 <a href="mailto:team@example.com">Mail</a>
 <a href="/api/health">API</a>
 <a href="/app?section=integrations">Owner only</a>
 <a href="/widget.js">Script</a>
 <a href="/ominaisuudet">Duplicate</a>`;
 assert.deepEqual(discoverPublicLinks(html,'https://www.respondoai.fi'),[
  '/ominaisuudet','/guides/ai-customer-service-chatbot?lang=fi','/hinnat'
 ]);
});
test('navigation smoke limit is bounded and malformed links cannot escape the site',()=>{
 const html='<a href="/one">One</a><a href="/two">Two</a>'+
  '<a href="//attacker.example/">Bad</a><a href="javascript:alert(1)">Bad</a>';
 assert.deepEqual(discoverPublicLinks(html,'https://www.respondoai.fi',1),['/one']);
 assert.deepEqual(discoverPublicLinks(html,'https://www.respondoai.fi',10),['/one','/two']);
});
