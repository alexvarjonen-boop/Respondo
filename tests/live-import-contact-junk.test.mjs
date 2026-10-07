import test from 'node:test';
import assert from 'node:assert/strict';
import { extractBusinessDocument, essentialWebsiteCandidates, businessFactKind } from '../website-knowledge.mjs';

test('standalone Finnish mobile number is imported as contact information',()=>{
  const html=`
    <section>
      <h2>Ota yhteyttä</h2>
      <p>Tavoitat parhaiten WhatsApilla, tekstiviestillä tai sähköpostilla työpäivän aikana.</p>
      <p>050 325 4690</p>
      <a href="mailto:miestenparturiturku@gmail.com">Lähetä meille sähköpostia</a>
    </section>`;
  const doc=extractBusinessDocument(html,'https://example.com/');
  const rows=essentialWebsiteCandidates({finalUrl:'https://example.com/',products:[],pageDocuments:[doc]});
  const text=rows.map((row)=>row.answer).join('\n');
  assert.match(text,/050\s*325\s*4690/);
  assert.match(text,/miestenparturiturku@gmail\.com/i);
});

test('serialized CMS state can never become customer knowledge',()=>{
  const blob='","ssr_script":"","headsection":" ","current_url":"","collections":"e30=","sidebarPosition":"NA","pageFontSizeStyle":"@media (min-width: 1025px) { [data-version] .size-24 {--font-size: 24;} }","extensionsToRender":{}';
  assert.equal(businessFactKind(blob,'Koot ja mitat'),'');
  const doc={
    url:'https://example.com/',
    text:blob,
    products:[],
    links:[],
    blocks:[{heading:'Koot ja mitat',text:blob}],
  };
  const rows=essentialWebsiteCandidates({finalUrl:'https://example.com/',products:[],pageDocuments:[doc]});
  assert.equal(rows.some((row)=>/ssr_script|pageFontSizeStyle|data-version/i.test(row.answer)),false);
});
