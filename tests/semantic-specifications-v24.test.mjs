import test from 'node:test';
import assert from 'node:assert/strict';
import {extractBusinessDocument,essentialWebsiteCandidates,usableWebsiteRow} from '../website-knowledge.mjs';
import {generateGroundedAnswer} from '../server.mjs';

const website='https://lift-example.fi';
function importFrom(markup,path='/kalusto/'){
  const doc=extractBusinessDocument('<html><main>'+markup+'</main></html>',website+path);
  const facts=essentialWebsiteCandidates({finalUrl:website+'/',pageDocuments:[doc]});
  const rows=facts.map((fact,id)=>({
    ...fact,id:'fact-'+id,source_type:'website',source_url:fact.sourceUrl
  }));
  return {doc,facts,rows};
}

test('semantic equipment definition lists preserve quantitative, source-linked specifications',async()=>{
  const {doc,facts,rows}=importFrom(
    '<h2>Tekniset tiedot</h2><dl class="technical-data">'+
    '<dt>Puomin ulottuma</dt><dd><strong>32 m</strong></dd>'+
    '<dt>Kantavuus</dt><dd>80 t</dd>'+
    '<dt>Sertifiointi</dt><dd>ISO 9001</dd>'+
    '</dl>'
  );
  assert.equal(doc.specPairs.length,3,JSON.stringify(doc.specPairs));
  const specs=facts.filter(x=>x.category==='Yrityksen tiedot' &&
    ['Puomin ulottuma','Kantavuus','Sertifiointi'].includes(x.title));
  assert.deepEqual(specs.map(x=>x.answer),
    ['Puomin ulottuma: 32 m','Kantavuus: 80 t','Sertifiointi: ISO 9001']);
  assert.ok(specs.every(x=>x.sourceUrl===website+'/kalusto/'));
  assert.ok(rows.filter(x=>specs.some(y=>y.title===x.title)).every(usableWebsiteRow));
  const result=await generateGroundedAnswer({
    companyName:'Nostokone-esimerkki Oy',rows,
    message:'Mikä on puomin ulottuma?',lang:'fi'
  });
  assert.equal(result.handoff,false,JSON.stringify(result));
  assert.match(result.answer,/32 m/);
  assert.ok(result.sourceIds.some(x=>x.startsWith('fact-')));
});

test('definition tables cannot introduce marketing statistics, detached prices or generic headings',()=>{
  const {doc,facts}=importFrom(
    '<dl class="technical-data">'+
    '<dt>Asiakastyytyväisyys</dt><dd>100 %</dd>'+
    '<dt>Toimitushinta</dt><dd>4 €</dd>'+
    '<dt>Tekniset tiedot</dt><dd>28 m</dd>'+
    '<dt>Suositteluprosentti</dt><dd>100 %</dd>'+
    '<dt>Kantavuus</dt><dd>80 t</dd>'+
    '</dl>'+
    '<dl class="cookie-banner"><dt>Ulottuma</dt><dd>999 m</dd></dl>'
  );
  assert.deepEqual(doc.specPairs.map(x=>x.title),['Kantavuus'],JSON.stringify(doc.specPairs));
  assert.ok(!facts.some(x=>x.category==='Yrityksen tiedot' &&
    /999 m|4 €|Asiakastyytyväisyys|Suositteluprosentti/i.test(x.answer)));
  assert.equal(usableWebsiteRow({
    category:'Yrityksen tiedot',title:'Asiakastyytyväisyys',
    answer:'Asiakastyytyväisyys: 100 %',source_type:'website',
    source_url:website+'/kalusto/',
  }),false);
});

test('do not apply unrelated product specs or policy footers as business-wide technical knowledge',()=>{
  const product=importFrom('<dl><dt>Nostokorkeus</dt><dd>12 m</dd></dl>','/products/nosturi/');
  assert.ok(!product.facts.some(x=>x.category==='Yrityksen tiedot'&&x.title==='Nostokorkeus'));
  const privacy=importFrom('<dl><dt>Nostokorkeus</dt><dd>100 m</dd></dl>','/tietosuoja/');
  assert.ok(!privacy.facts.some(x=>x.category==='Yrityksen tiedot'&&x.title==='Nostokorkeus'));
});
