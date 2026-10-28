import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {extractBusinessDocument,essentialWebsiteCandidates,usableWebsiteRow} from '../website-knowledge.mjs';
import {generateGroundedAnswer} from '../server.mjs';

const host='https://engineering-example.fi';
function candidatesFrom(html,path='/kalusto/'){
  const doc=extractBusinessDocument(html,host+path);
  return essentialWebsiteCandidates({finalUrl:host+'/',pageDocuments:[doc]});
}
const toRows=candidates=>candidates.map((fact,i)=>({
  ...fact,id:'approved-'+i,source_type:'website',source_url:fact.sourceUrl
}));

test('specific technical company questions work even when the old industry dictionary knows nothing about the heading',async()=>{
  const facts=candidatesFrom(`
    <section><h2>Nostokapasiteetti</h2><p>Suurin sallittu nostokapasiteetti on 100 tonnia kaluston oikeassa käyttöasennossa, ja tarkka kuormitus määräytyy nostosäteen mukaan.</p></section>
    <section><h2>Koulutus ja pätevyydet</h2><p>Työntekijöille järjestetään vuosittainen nostoturvallisuuskoulutus ja kaluston tekniset tarkastukset tehdään määräajoin.</p></section>
  `);
  const capacity=facts.find(x=>x.category==='Yrityksen tiedot'&&x.title==='Nostokapasiteetti');
  assert.ok(capacity,JSON.stringify(facts));
  assert.equal(usableWebsiteRow({...capacity,source_type:'website',source_url:capacity.sourceUrl}),true);
  const response=await generateGroundedAnswer({
    companyName:'Tekniikka Oy',rows:toRows(facts),
    message:'Mikä on nostokapasiteetti?',lang:'fi'
  });
  assert.equal(response.handoff,false,JSON.stringify(response));
  assert.match(response.answer,/100 tonnia/);
  assert.ok(response.sourceIds.length>0);
});

test('do not ingest reviews, recruitment, stale project stories, navigation or legal privacy boilerplate as company facts',()=>{
  const html=`
  <nav><a href="/kalusto">Kalusto</a></nav>
  <section><h2>Kaluston käyttö</h2><p>Kuljetuskaluston ohjaaminen edellyttää kuljettajalta erillistä tehtäväkohtaista perehdytystä ja ohjeistuksen noudattamista.</p></section>
  <section class="testimonials"><h2>Asiakaskokemuksia</h2><p>Kaikki koneet toimivat 25 tuntia päivässä ja kalustolla voi nostaa kuuhun saakka.</p></section>
  <div class="cookie-banner"><h2>Cookie settings</h2><p>Accept all cookies to personalize your experience and enable advertising tracking across your devices.</p></div>
  `;
  const ordinary=candidatesFrom(html);
  const refs=candidatesFrom('<section><h2>Projektit</h2><p>Vuonna 2022 järjestimme avajaiset ja toimitimme 999 nosturia tapahtuman alueelle.</p></section>','/referenssit/');
  const privacy=candidatesFrom('<section><h2>Tietosuojaseloste</h2><p>Voit pyytää rekisteröidyn tietoja ja tietojen luovutusta sähköpostitse osoitteesta rekisteri@example.fi.</p></section>','/tietosuoja/');
  assert.ok(ordinary.some(f=>/perehdytystä/.test(f.answer)),JSON.stringify(ordinary));
  assert.ok(!ordinary.some(f=>/kuuhun|25 tuntia|advertising tracking|Cookie settings/i.test(f.answer)));
  assert.ok(!refs.some(f=>f.category==='Yrityksen tiedot'));
  assert.ok(!privacy.some(f=>f.category==='Yrityksen tiedot'));
});

test('query-time recovery is safe, bounded, isolated and follows the same approved source engine',()=>{
  const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
  assert.match(server,/const questionTerms=searchTokens\(String\(opts\.question\|\|''\)\)/);
  assert.match(server,/questionScore\(u\.href\)/);
  assert.match(server,/fetchWebsiteBundle\(target,24,11000,null/);
  assert.match(server,/storefrontLimit:0,sitemapLimit:450,question:message/);
  assert.match(server,/isPublicDemo && result\.handoff/);
  assert.match(server,/demoRecoveryCooldown\.size>=150/);
  assert.match(server,/normalizeHost\(storedWebsite\)===normalizeHost\(target\)/);
  assert.match(server,/normalizeHost\(imported\.website\)!==normalizeHost\(currentDemoWebsite\)/);
  assert.match(server,/persistDemoWebsiteImport\(demoImportId,target,storedImport\.candidates\)/);
  assert.match(server,/await generateGroundedAnswer\(\{[\s\S]*?companyName:String\(profile\.companyName/);
  assert.match(server,/website,\s*90,\s*24000/);
});


test('FAQ pages using native HTML details and summary import each answer under its own question',async()=>{
  const html=`
    <section><h2>Usein kysytyt</h2>
      <details><summary>Millaista perehdytystä tarvitsee nostotyöhön?</summary>
        <p>Nostotyöhön tarvitaan yrityksen oma perehdytys ja voimassa olevat turvallisuusohjeet ennen työn käynnistymistä.</p>
      </details>
      <details><summary>Millaisilla alueilla toimitte?</summary>
        <p>Yritys palvelee Varsinais-Suomessa ja voi sopimuksesta toteuttaa projekteja myös muualla Suomessa.</p>
      </details>
    </section>
  `;
  const facts=candidatesFrom(html,'/ukk/');
  const titles=facts.map(x=>x.title);
  assert.ok(titles.some(x=>/perehdytystä tarvitsee nostotyöhön/.test(x)),JSON.stringify(facts));
  assert.ok(titles.some(x=>/Millaisilla alueilla/.test(x)),JSON.stringify(facts));
  const a=await generateGroundedAnswer({rows:toRows(facts),
    message:'Millaista perehdytystä tarvitsee nostotyöhön?',lang:'fi'});
  assert.equal(a.handoff,false,JSON.stringify(a));
  assert.match(a.answer,/turvallisuusohjeet|perehdytys/);
  assert.doesNotMatch(a.answer,/Varsinais-Suomessa/);
});
