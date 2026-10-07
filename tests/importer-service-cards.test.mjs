import test from 'node:test';
import assert from 'node:assert/strict';
import { extractBusinessDocument, essentialWebsiteCandidates } from '../website-knowledge.mjs';

function bundleFrom(html,url='https://example.fi/'){
  const document=extractBusinessDocument(html,url);
  return {
    finalUrl:url,
    products:[],
    pageDocuments:[{url,...document}],
    pages:[url],
    text:document.text,
    links:document.links.map((x)=>x.url),
  };
}

test('plain service card followed by a detached price stays attached to that service',()=>{
  const bundle=bundleFrom(`
    <main>
      <div>HIUSTEN LEIKKAUS (Tavallinen)</div>
      <div>€25</div>
      <div>PARRAN AJO</div>
      <div>€20</div>
    </main>
  `);
  const facts=essentialWebsiteCandidates(bundle);
  const text=facts.map((x)=>x.category+' | '+x.title+' | '+x.answer).join('\n');
  assert.match(text,/Palvelut[\s\S]*HIUSTEN LEIKKAUS/i);
  assert.match(text,/Hinnat[\s\S]*HIUSTEN LEIKKAUS \(Tavallinen\): €25/i);
  assert.match(text,/Hinnat[\s\S]*PARRAN AJO: €20/i);
  assert.doesNotMatch(text,/Hinnat[^\n]*\| €25(?:\n|$)/i);
});

test('ThemeREX demo content and service-plus prices never enter company knowledge',()=>{
  const url='https://example.fi/service-plus/';
  const document=extractBusinessDocument(`
    <section>
      <p>Our primary goal is developing a secure and customizable theme framework that meets the needs of the end user.</p>
      <p>Installation + Logo change: $39</p>
      <p>WP plugins installation: $49</p>
      <p>Ready to use Website: $350</p>
      <a href="https://themerex.net/support">Support</a>
    </section>
  `,url);
  const facts=essentialWebsiteCandidates({
    finalUrl:'https://example.fi/',
    products:[],
    pageDocuments:[{url,...document}],
    pages:[url],
    text:document.text,
    links:document.links.map((x)=>x.url),
  });
  assert.equal(facts.length,0);
});

test('Finnish option wording is not misclassified as a return or exchange policy',()=>{
  const bundle=bundleFrom(`
    <section>
      <h2>Jäsenyys</h2>
      <p>Jäsentasoja on kolme, joista Silver- ja Gold-tasot tarjoavat asiakkaidemme erilaiset tarpeet huomioivia vaihtoehtoja.</p>
    </section>
  `);
  const facts=essentialWebsiteCandidates(bundle);
  assert.equal(facts.some((x)=>x.category==='Palautukset ja vaihdot'),false);
});

test('a bare template shop link does not make a service company look like an ecommerce store',()=>{
  const bundle=bundleFrom(`
    <nav><a href="/shop/">Shop</a></nav>
    <main><h2>Palvelut</h2><p>Tarjoamme hiustenleikkauksia ja parran muotoilua.</p></main>
  `);
  const facts=essentialWebsiteCandidates(bundle);
  assert.equal(facts.some((x)=>x.title==='Tuotekatalogi'),false);
});


test('billing and e-invoicing details never become customer-facing services',()=>{
  const bundle=bundleFrom(`
    <section>
      <h2>Yhteystiedot</h2>
      <p>Verkkolaskutusosoite: 003726574803 Operaattori: Apix Messaging Oy (003723327487) Ostolaskujen skannauspalvelu.</p>
      <p>Tarjoamme hiustenleikkauksia ja parran muotoilua.</p>
    </section>
  `);
  const facts=essentialWebsiteCandidates(bundle);
  const text=facts.map((x)=>x.answer).join('\n');
  assert.doesNotMatch(text,/verkkolask|apix|skannauspalvelu/i);
  assert.match(text,/hiustenleikkauksia/i);
});
