import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mediaCandidates,documentAsPage,mediaTextFromBytes,importCoverage,documentCandidateLimits} from '../web-document-import.mjs';
import {dateISO,branchExceptionFacts,answerBranchException} from '../branch-exceptions.mjs';
import {extractStoreAvailability,storeAvailabilityAnswer} from '../store-availability.mjs';
import {hydratedBusinessData} from '../hydrated-business-data.mjs';
import {autoRefreshEligible,acceptedRefreshCandidate} from '../website-refresh-policy.mjs';
import {extractBusinessDocument,essentialWebsiteCandidates} from '../website-knowledge.mjs';
import {generateGroundedAnswer} from '../server.mjs';

test('media discovery is same origin and avoids fetching unrelated images or site policy PDFs',()=>{
  const html='<a href="/files/hinnasto.pdf">Lataa hinnasto</a>'+
    '<a href="https://external.example/menu.pdf">Menu</a>'+
    '<img src="/assets/ruokalista.png" alt="Ruokalista">'+
    '<img src="/assets/company-logo.png" alt="Logo">'+
    '<a href="/legal/privacy.pdf">Privacy policy</a>';
  const found=mediaCandidates(html,'https://company.example/');
  assert.ok(found.some(x=>x.type==='pdf'&&x.url.endsWith('/files/hinnasto.pdf')));
  assert.ok(found.some(x=>x.type==='image'&&x.url.endsWith('/assets/ruokalista.png')));
  assert.ok(found.every(x=>new URL(x.url).hostname==='company.example'));
  assert.ok(!found.some(x=>x.url.includes('company-logo')));
  assert.ok(documentCandidateLimits('pdf').maxBytes<=8_000_000);
});
test('PDF-readable document facts are HTML-escaped and keep line boundaries',()=>{
  const parsed=documentAsPage('Renkaanvaihto 49 €\nIlmastoinnin huolto 89 €\n<script>danger</script>','https://company.example/hinnasto.pdf');
  assert.ok(parsed);
  assert.match(parsed.html,/Renkaanvaihto 49 €/);
  assert.doesNotMatch(parsed.html,/<script>/);
});
test('invalid PDF and disabled image OCR do not invent text',async()=>{
  assert.equal(await mediaTextFromBytes(Buffer.from('not a PDF document, really'), 'pdf'),'');
  assert.equal(await mediaTextFromBytes(Buffer.from('pretend image bytes 1234567890'),'image',{ocrEnabled:false}),'');
});
test('coverage marks missing knowledge as unverified and reports partial imports',()=>{
  const c=importCoverage({
    pages:['https://c.example/'],
    media:[{type:'pdf',ok:true}],attempted:2,failed:1,
    candidates:[{category:'Palvelut'},{category:'Aukioloajat'}]
  });
  assert.equal(c.documentFilesRead,1);
  assert.equal(c.pagesScanned,1);
  assert.equal(c.partial,true);
  assert.equal(c.found.hours,true);
  assert.ok(c.notVerified.includes('products'));
});
test('dated holiday exception is distinct from normal schedule',async()=>{
  assert.equal(dateISO('31.02.2026'),'');
  assert.equal(dateISO('24.12.2026'),'2026-12-24');
  const url='https://chain.example/tavaratalot/turku';
  const doc=extractBusinessDocument('<h2>Poikkeusaukioloajat</h2><p>24.12.2026: suljettu</p><h2>Normaalit aukioloajat</h2><p>Ma-Pe: 08:00–20:00</p>',url);
  const exceptions=branchExceptionFacts(doc);
  assert.equal(exceptions.length,1,JSON.stringify(exceptions));
  assert.equal(exceptions[0].answer,'2026-12-24: suljettu');
  const rows=[...exceptions.map((x,i)=>({
    id:'ex'+i,title:x.title,answer:x.answer,category:x.category,source_type:'website',source_url:x.sourceUrl
  }))];
  const r=answerBranchException({rows,message:'Onko Turun myymälä auki 24.12.2026?',lang:'fi'});
  assert.match(r.answer,/suljettu/);
  assert.deepEqual(r.sourceIds,['ex0']);
  const actual=await generateGroundedAnswer({rows,message:'Onko Turun myymälä auki 24.12.2026?',lang:'fi'});
  assert.match(actual.answer,/suljettu/);
});
test('per-store published availability is isolated to exact product and branch',async()=>{
  const html='<script type="application/ld+json">'+JSON.stringify({
    '@type':'Product',name:'JAG Satin Black Putter',url:'https://shop.example/products/satin-black',
    offers:[
      {availability:'https://schema.org/InStock',availableAtOrFrom:{'@type':'Place',name:'Turku'}},
      {availability:'https://schema.org/OutOfStock',availableAtOrFrom:{'@type':'Place',name:'Raisio'}}
    ]
  })+'</script>';
  const facts=extractStoreAvailability(html,'https://shop.example/');
  assert.equal(facts.length,2,JSON.stringify(facts));
  const rows=facts.map((x,i)=>({...x,id:'a'+i,source_type:'website',source_url:x.sourceUrl}));
  const a=storeAvailabilityAnswer(rows,'Onko JAG Satin Black Putter varastossa Turku?');
  assert.match(a.answer,/sivuston mukaan varastossa/);
  assert.match(a.answer,/ei ole reaaliaikainen/i);
  const b=storeAvailabilityAnswer(rows,'Onko JAG Satin Black Putter varastossa Raisio?');
  assert.match(b.answer,/ei varastossa/);
  const productOnly=storeAvailabilityAnswer(rows,'Onko JAG Satin Black Putter varastossa?');
  assert.deepEqual(productOnly.branchChoices,['Turku','Raisio']);
  const imported=extractBusinessDocument(html,'https://shop.example/');
  const candidates=essentialWebsiteCandidates({finalUrl:'https://shop.example/',pageDocuments:[imported],products:[]});
  assert.equal(candidates.filter(x=>x.category==='Myymäläsaatavuus').length,2);
});
test('framework hydration extracts approved FAQ/service pairs without executing JS',()=>{
  const html='<script id="__NEXT_DATA__" type="application/json">'+JSON.stringify({
    props:{pageProps:{faqItems:[{question:'Voinko palauttaa tuotteen?',answer:'Tuotteen voi palauttaa 14 päivän kuluessa.'}],
      services:[{name:'Ikkunanpesu',description:'Pesemme ikkunoita koteihin ja yrityksiin Varsinais-Suomessa.'}]}}
  })+'</script>';
  const parsed=hydratedBusinessData(html);
  assert.equal(parsed.faqPairs.length,1,JSON.stringify(parsed));
  assert.equal(parsed.servicePairs.length,1,JSON.stringify(parsed));
  const imported=extractBusinessDocument(html,'https://company.example/');
  assert.equal(imported.faqPairs.length,1);
  assert.equal(imported.servicePairs.length,1);
});
test('scheduled refresh is opt-in, daily and restricted to trusted same-site facts',()=>{
  const now=Date.now();
  assert.equal(autoRefreshEligible(now,null,false,'active','https://c.example'),false);
  assert.equal(autoRefreshEligible(now,null,true,'active','https://c.example'),true);
  assert.equal(autoRefreshEligible(now,now-60_000,true,'active','https://c.example'),false);
  assert.equal(autoRefreshEligible(now,null,true,'canceled','https://c.example'),false);
  const sample={title:'Aukioloajat',answer:'Ma-Pe: 09:00 - 18:00',category:'Aukioloajat',sourceUrl:'https://c.example/hours'};
  const usable=()=>true;
  assert.ok(acceptedRefreshCandidate(sample,'https://c.example',usable));
  assert.equal(acceptedRefreshCandidate({...sample,sourceUrl:'https://foreign.example/hours'},'https://c.example',usable),null);
  assert.equal(acceptedRefreshCandidate({...sample,answer:'Cookie consent'},'https://c.example',usable),null);
});
test('dashboard exposes owner-controlled refresh and import coverage without auto opt-in',()=>{
  const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
  assert.match(source,/id="websiteAutoRefresh"/);
  assert.match(source,/api\/app\/import-website\/auto-refresh/);
  assert.match(source,/result\.coverage/);
});
