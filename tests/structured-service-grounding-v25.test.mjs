import test from 'node:test';
import assert from 'node:assert/strict';
import {extractBusinessDocument,essentialWebsiteCandidates,usableWebsiteRow} from '../website-knowledge.mjs';
import {generateGroundedAnswer} from '../server.mjs';

const site='https://example-industrial.fi/';
const schemaPage=(schema,path='/palvelut/')=>
  extractBusinessDocument('<html><body><script type="application/ld+json">'+JSON.stringify(schema)+'</script></body></html>',site.replace(/\/$/,'')+path);
const factsFrom=(doc)=>essentialWebsiteCandidates({finalUrl:site,pageDocuments:[doc]});
const rowsFrom=(facts)=>facts.map((fact,i)=>({...fact,id:'source-'+i,source_type:'website',source_url:fact.sourceUrl}));

test('nested OfferCatalog services are imported even on pages without visible HTML copy',async()=>{
  const doc=schemaPage({
    '@context':'https://schema.org',
    '@type':'LocalBusiness',
    name:'Testipalvelu Oy',
    hasOfferCatalog:{'@type':'OfferCatalog',name:'Palvelut',itemListElement:[
      {'@type':'OfferCatalog',name:'Nostot',itemListElement:[
        {'@type':'Offer',itemOffered:{'@type':'Service',
          name:'Raskaat teollisuusnostot',
          description:'Toteutamme teollisuusnostoja nostokalustolla. Suurin ilmoitettu nostokapasiteetti on 80 tonnia kohteissa, joissa olosuhteet sen sallivat.'}},
      ]},
      {'@type':'Offer',itemOffered:{'@type':'Service',
        name:'Koneasennusten suunnittelu',
        description:'Suunnittelemme koneiden asennusvaiheet yhdessä tilaajan kanssa ja dokumentoimme nostotöiden valmistelun ennen toteutusta.'}},
    ]},
  });
  assert.equal(doc.servicePairs.length,2,JSON.stringify(doc.servicePairs));
  const facts=factsFrom(doc);
  const services=facts.filter(f=>f.category==='Palvelut');
  assert.ok(services.some(f=>/80 tonnia/.test(f.answer)),JSON.stringify(facts));
  assert.ok(services.some(f=>/Koneasennusten suunnittelu/.test(f.answer)));
  assert.ok(services.every(f=>f.sourceUrl===site+'palvelut/'));
  const rows=rowsFrom(facts);
  assert.ok(rows.filter(r=>r.category==='Palvelut').some(usableWebsiteRow));
  const reply=await generateGroundedAnswer({companyName:'Testipalvelu Oy',rows,
    message:'Mitä teette?',lang:'fi'});
  assert.equal(reply.handoff,false,JSON.stringify(reply));
  assert.ok(reply.sourceIds.length>0);
  assert.match(reply.answer,/teollisuusnost|koneasennus/i);
});

test('Service schema can answer a narrow approved question with actual published source evidence',async()=>{
  const doc=schemaPage({'@context':'https://schema.org','@graph':[
    {'@type':'Service',name:'Teollisuuden haalauspalvelu',
      description:'Raskaiden koneiden siirrot suoritetaan hydraulisilla siirtolaitteilla sekä nostimilla asiakkaan teollisuustiloissa.'}
  ]});
  const rows=rowsFrom(factsFrom(doc));
  const answer=await generateGroundedAnswer({rows,companyName:'Teollisuus Oy',
    message:'Miten Teollisuuden haalauspalvelu toteutetaan?',lang:'fi'});
  assert.equal(answer.handoff,false,JSON.stringify(answer));
  assert.match(answer.answer,/hydraulisilla siirtolaitteilla/i);
  assert.ok(answer.sourceIds.length>0);
});

test('product, unrelated provider, review and legal page schemas never create business services',()=>{
  const product=schemaPage({'@type':'Product',name:'Korjausavustin',
    description:'Tuote auttaa moottorin huollossa ja koneiden korjaustyössä.'},'/products/avustin/');
  const remote=schemaPage({'@type':'Service',name:'Tekninen neuvonta',
    description:'Huollamme asiakkaiden laitteita tarkkojen valmistajan ohjeiden mukaisesti.',
    provider:{'@type':'Organization',url:'https://different-supplier.example/' }});
  const marketing=schemaPage({'@type':'Service',name:'Welcome',
    description:'Read more about our professional top quality customer service and privacy policy.'});
  const legal=schemaPage({'@type':'Service',name:'Laitehuolto',
    description:'Huollamme teollisuusasiakkaiden laitteita yrityksen kalustolla ja sovituin työvaihein.'},'/tietosuoja/');
  assert.equal(product.servicePairs.length,0);
  assert.equal(remote.servicePairs.length,0);
  assert.equal(marketing.servicePairs.length,0);
  assert.equal(factsFrom(legal).some(f=>f.category==='Palvelut'),false);
});

test('service facts do not invent price, availability, date or cross-domain links',()=>{
  const doc=schemaPage({'@type':'Service',name:'Raskas kalustohuolto',
    description:'Huollamme yritysasiakkaiden työmaakoneita sovittujen tarkastus- ja huoltokäytäntöjen mukaisesti.',
    offers:{'@type':'Offer',price:0,availability:'https://schema.org/InStock'}});
  const facts=factsFrom(doc);
  const text=facts.map(f=>f.answer).join(' ');
  assert.doesNotMatch(text,/Hinta:|0\.00|Saatavuus:|Linkki:/);
  assert.ok(facts.every(f=>new URL(f.sourceUrl).hostname==='example-industrial.fi'));
});
