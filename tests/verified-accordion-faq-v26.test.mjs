import test from 'node:test';
import assert from 'node:assert/strict';
import {extractBusinessDocument,essentialWebsiteCandidates,usableWebsiteRow} from '../website-knowledge.mjs';
import {generateGroundedAnswer} from '../server.mjs';

const site='https://nosto-example.fi';
function factsFrom(html){
  const doc=extractBusinessDocument(html,site+'/usein-kysytyt/');
  const facts=essentialWebsiteCandidates({finalUrl:site+'/',pageDocuments:[doc]});
  return {doc,rows:facts.map((x,i)=>({...x,id:'faq-'+i,source_type:'website',source_url:x.sourceUrl}))};
}
test('FAQ accordion content is retrievable even if closed HTML panels are not visible in the normal DOM extractor',async()=>{
  const {doc,rows}=factsFrom(`
  <section class="faq">
    <button class="accordion-button collapsed" aria-expanded="false" aria-controls="faqAccess">Tarvitaanko nostokaluston käyttöön kulkulupa?</button>
    <div id="faqAccess" class="accordion-collapse collapse" aria-hidden="true">
      <div class="accordion-body"><p>Kulkulupa tarvitaan tehdasalueelle. Tilaaja järjestää sen ennen työmaalle saapumista.</p></div>
    </div>
    <button class="accordion-button" aria-expanded="false" aria-controls="faqSupport">Voiko nostoon saada kuljetusavustajan?</button>
    <section id="faqSupport"><p>Kuljetusavustaja järjestetään erillisellä tilauksella asiakkaan pyynnöstä.</p></section>
  </section>
  `);
  assert.equal(doc.faqPairs.length,2,JSON.stringify(doc.faqPairs));
  const faq=rows.find(x=>x.title==='Tarvitaanko nostokaluston käyttöön kulkulupa?');
  assert.ok(faq,JSON.stringify(rows));
  assert.match(faq.answer,/Tilaaja järjestää/);
  assert.equal(faq.source_url,site+'/usein-kysytyt/');
  assert.equal(usableWebsiteRow(faq),true);
  const res=await generateGroundedAnswer({companyName:'Nostourakka Oy',rows,message:'Tarvitaanko nostokaluston käyttöön kulkulupa?',lang:'fi'});
  assert.equal(res.handoff,false,JSON.stringify(res));
  assert.match(res.answer,/Kulkulupa tarvitaan tehdasalueelle/);
  assert.ok(res.sourceIds.includes(faq.id),JSON.stringify(res));
});
test('Bootstrap data-bs-target panel works; never swap two answers',()=>{
  const {doc}=factsFrom(`
  <div class="accordion">
   <button aria-expanded="false" data-bs-target="#faqDelivery">How are the machines delivered?</button>
   <div id="faqDelivery" class="collapse"><p>Machines are delivered using a documented heavy transport service agreed with the customer.</p></div>
   <button aria-expanded="false" data-bs-target="#faqSafety">What safety training is required?</button>
   <div id="faqSafety" class="collapse"><p>Every site visitor must complete the contractor-specific safety induction before entry.</p></div>
  </div>`);
  assert.equal(doc.faqPairs.length,2,JSON.stringify(doc.faqPairs));
  const delivery=doc.faqPairs.find(x=>x.title.startsWith('How are'));
  assert.match(delivery.answer,/heavy transport service/);
  assert.doesNotMatch(delivery.answer,/safety induction/);
  const safety=doc.faqPairs.find(x=>x.title.startsWith('What safety'));
  assert.match(safety.answer,/safety induction/);
});
test('navigation and irrelevant hidden panels are not imported as company answers',()=>{
  const {doc,rows}=factsFrom(`
    <nav><button aria-controls="menuPanel">Open menu</button><div id="menuPanel">Product links News Contact</div></nav>
    <button aria-controls="cookiePanel">What are the cookie settings?</button><div id="cookiePanel">We store cookies to improve browsing and use cookies for marketing.</div>
    <button aria-controls="reviewPanel">What do reviewers say?</button><div id="reviewPanel">Five stars! The best team ever according to customer reviews.</div>
    <button aria-controls="unknownPanel">How much is transport?</button>
    <button aria-controls="separatePanel">Can I return used equipment?</button><div id="separatePanel">Yes</div>
  `);
  assert.equal(doc.faqPairs.length,0,JSON.stringify(doc.faqPairs));
  assert.ok(!rows.some(r=>r.title==='How much is transport?'));
});
test('accordion retrieval preserves source evidence without inventing price or calendar facts',async()=>{
  const {rows}=factsFrom(`
    <button aria-controls="answerOne">Mitä nostokaluston suunnitteluun sisältyy?</button>
    <div id="answerOne"><p>Suunnitteluun sisältyy kohteen mitoitus, kaluston valinta ja kirjallinen nostosuunnitelma.</p></div>
  `);
  const answered=await generateGroundedAnswer({rows,message:'Mitä nostokaluston suunnitteluun sisältyy?',lang:'fi'});
  assert.equal(answered.handoff,false,JSON.stringify(answered));
  assert.match(answered.answer,/kirjallinen nostosuunnitelma/);
  const missing=await generateGroundedAnswer({rows,message:'Onko ensi viikon maanantaille vapaa varausaika?',lang:'fi'});
  assert.doesNotMatch(missing.answer||'',/kyllä.*vapa|maanantaille on vapa|varaus on vahvistettu/i);
});
