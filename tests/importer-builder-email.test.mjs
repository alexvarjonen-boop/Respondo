import test from 'node:test';
import assert from 'node:assert/strict';
import { extractBusinessDocument, essentialWebsiteCandidates } from '../website-knowledge.mjs';

test('email mail link survives skipped builder button wrappers',()=>{
  const html=`
    <section>
      <button class="builder-button">
        <a href="mailto:miestenparturiturku@gmail.com">Lähetä meille sähköpostia</a>
      </button>
    </section>
  `;
  const doc=extractBusinessDocument(html,'https://example.fi/');
  const rows=essentialWebsiteCandidates({
    finalUrl:'https://example.fi/',
    products:[],
    pageDocuments:[doc],
  });
  const email=rows.find((row)=>row.title==='Sähköposti');
  assert.equal(email?.answer,'miestenparturiturku@gmail.com');
});
