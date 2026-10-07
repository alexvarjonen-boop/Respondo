import test from 'node:test';
import assert from 'node:assert/strict';
import { extractBusinessDocument, essentialWebsiteCandidates } from '../website-knowledge.mjs';

test('published email inside skipped builder widget is still recovered as contact',()=>{
  const html=`
    <section>
      <h2>Ota yhteyttä</h2>
      <p>Tavoitat parhaiten WhatsApilla, tekstiviestillä tai sähköpostilla työpäivän aikana.</p>
      <button><span>Lähetä meille sähköpostia (miestenparturiturku@gmail.com)</span></button>
      <p>050 325 4690</p>
    </section>`;
  const doc=extractBusinessDocument(html,'https://example.fi/');
  const rows=essentialWebsiteCandidates({finalUrl:'https://example.fi/',products:[],pageDocuments:[doc]});
  const values=rows.map((row)=>row.answer).join('\n');
  assert.match(values,/miestenparturiturku@gmail\.com/i);
});
