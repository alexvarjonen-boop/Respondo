import test from 'node:test';
import assert from 'node:assert/strict';
import { extractBusinessDocument, essentialWebsiteCandidates } from '../website-knowledge.mjs';

test('visible builder email text is captured even without a mailto href',()=>{
  const url='https://example.fi/';
  const document=extractBusinessDocument(`
    <main>
      <p>Tavoitat parhaiten sähköpostilla työpäivän aikana.</p>
      <a href="/contact">Lähetä meille sähköpostia (miestenparturiturku@gmail.com)</a>
      <p>050 325 4690</p>
    </main>
  `,url);
  const facts=essentialWebsiteCandidates({
    finalUrl:url,
    products:[],
    pageDocuments:[{url,...document}],
    pages:[url],
    text:document.text,
    links:document.links.map((x)=>x.url),
  });
  const email=facts.find((x)=>x.title==='Sähköposti');
  assert.equal(email?.answer,'miestenparturiturku@gmail.com');
});

test('placeholder visible email is still rejected',()=>{
  const url='https://example.fi/';
  const document=extractBusinessDocument('<p>hello@example.com</p>',url);
  const facts=essentialWebsiteCandidates({
    finalUrl:url,
    products:[],
    pageDocuments:[{url,...document}],
    pages:[url],
    text:document.text,
    links:[],
  });
  assert.equal(facts.some((x)=>x.title==='Sähköposti'),false);
});
