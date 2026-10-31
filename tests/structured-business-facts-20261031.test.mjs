import test from 'node:test';
import assert from 'node:assert/strict';
import {extractBusinessDocument, essentialWebsiteCandidates, essentialWebsiteProfile, usableWebsiteRow} from '../website-knowledge.mjs';
import {structuredBusinessFacts} from '../structured-business-facts.mjs';
import {generateGroundedAnswer} from '../server.mjs';

const url='https://chain.example/';
const store=(name,suffix,weekdayHours)=>{
  const [opens,closes]=weekdayHours;
  return {
    '@type':'Store', name:'Example '+name,
    url:'https://chain.example/tavaratalot/'+suffix,
    address:{'@type':'PostalAddress',addressLocality:name,streetAddress:'Esimerkkikatu 2'},
    openingHoursSpecification:[
      { '@type':'OpeningHoursSpecification',dayOfWeek:[
        'https://schema.org/Monday','https://schema.org/Tuesday',
        'https://schema.org/Wednesday','https://schema.org/Thursday',
        'https://schema.org/Friday'
      ],opens,closes },
      { '@type':'OpeningHoursSpecification',dayOfWeek:'https://schema.org/Saturday',opens:'10:00',closes:'17:00' }
    ]
  };
};
const documentWithJson=payload=>'<html><head><script id="data" type="application/ld+json">'+JSON.stringify(payload)+'</script></head><body></body></html>';

test('schema.org @graph exports separate, correctly sourced opening hours for every branch',async()=>{
  const html=documentWithJson({'@context':'https://schema.org','@graph':[
    store('Turku','turku',['08:00','20:00']),store('Raisio','raisio',['09:00','19:00'])
  ]});
  const doc=extractBusinessDocument(html,url);
  assert.equal(doc.structuredFacts.length,2,JSON.stringify(doc.structuredFacts));
  const bundle={finalUrl:url,pageDocuments:[{...doc,url}],products:[]};
  const facts=essentialWebsiteCandidates(bundle).filter(x=>x.category==='Aukioloajat');
  assert.equal(facts.length,2,JSON.stringify(facts));
  const rows=facts.map((item,i)=>({
    id:'store-'+i,title:item.title,answer:item.answer,category:item.category,
    source_url:item.sourceUrl,source_type:'website',keywords:item.keywords
  }));
  for(const row of rows)assert.equal(usableWebsiteRow(row),true,JSON.stringify(row));
  const initial=await generateGroundedAnswer({rows,lang:'fi',message:'Mitkä ovat aukioloajat?'});
  assert.equal(initial.intent,'Toimipisteen valinta',JSON.stringify(initial));
  assert.deepEqual(initial.branchChoices,['Raisio','Turku']);
  const target=await generateGroundedAnswer({rows,lang:'fi',message:'Turun aukioloajat?'});
  assert.equal(target.handoff,false,JSON.stringify(target));
  assert.match(target.answer,/Turku: Maanantai: 08:00 - 20:00/);
  assert.doesNotMatch(target.answer,/09:00 - 19:00/);
  assert.equal(target.sourceIds.length,1);
});

test('openingHours strings, ISO weekdays, and separately listed days are parsed without inventing closures',()=>{
  const html=documentWithJson({
    '@type':'LocalBusiness',name:'Kampaamo',address:{addressLocality:'Espoo'},
    openingHours:['Mo-Fr 9:00-18:00','Sa 10:00-15:00']
  });
  const facts=structuredBusinessFacts(html,url);
  assert.equal(facts.length,1,JSON.stringify(facts));
  assert.match(facts[0].answer,/Ma: 09:00 - 18:00/);
  assert.match(facts[0].answer,/La: 10:00 - 15:00/);
  assert.doesNotMatch(facts[0].answer,/Su:/);
});

test('service regions and explicit appointment action populate imported business profile',()=>{
  const bookingUrl='https://booking.example/book/abc123';
  const html=documentWithJson({
    '@type':'Plumber',name:'Esimerkki LVI Oy',
    areaServed:[{'@type':'City',name:'Turku'},{'@type':'City',name:'Kaarina'}],
    potentialAction:{'@type':'ReserveAction',target:bookingUrl}
  });
  const doc=extractBusinessDocument(html,url);
  const bundle={finalUrl:url,pageDocuments:[{...doc,url}],products:[]};
  const facts=essentialWebsiteCandidates(bundle);
  assert.ok(facts.some(x=>x.title==='Toimialue' && x.answer==='Turku, Kaarina'));
  assert.ok(facts.some(x=>x.title==='Ajanvarauslinkki' && x.answer===bookingUrl));
  const profile=essentialWebsiteProfile(bundle);
  assert.equal(profile.serviceArea,'Turku, Kaarina');
  assert.equal(profile.bookingUrl,bookingUrl);
});

test('verified appointment CTA imports, while unrelated contact and quote links do not',()=>{
  const html=[
    '<a href="https://booking.example/appointments/1">Varaa aika</a>',
    '<a href="/contact">Varaa aika</a>',
    '<a href="/quote">Varaa aika</a>',
    '<a href="https://example.com/policies">Booking policy</a>'
  ].join('\n');
  const doc=extractBusinessDocument(html,url);
  const candidates=essentialWebsiteCandidates({finalUrl:url,pageDocuments:[{...doc,url}],products:[]})
    .filter(x=>x.title==='Ajanvarauslinkki');
  assert.equal(candidates.length,1,JSON.stringify(candidates));
  assert.equal(candidates[0].answer,'https://booking.example/appointments/1');
});

test('untrusted foreign organization URLs cannot masquerade as same-site branch evidence',()=>{
  const html=documentWithJson({
    '@type':'Store',name:'Foreign',url:'https://unrelated.example/tavaratalot/turku',
    openingHoursSpecification:[{dayOfWeek:'Monday',opens:'08:00',closes:'20:00'}]
  });
  const facts=structuredBusinessFacts(html,url);
  assert.ok(facts.every(x=>x.sourceUrl.startsWith(url)));
  assert.ok(facts.every(x=>!x.sourceUrl.includes('unrelated.example')));
});

test('no checkout or appointment destination is invented from generic site contact data',()=>{
  const html=documentWithJson({'@type':'Organization',name:'Test',url,contactPoint:{
    '@type':'ContactPoint',contactType:'customer service',url:'https://other.example/contact'
  }});
  const facts=structuredBusinessFacts(html,url);
  assert.ok(!facts.some(x=>x.title==='Ajanvarauslinkki'),JSON.stringify(facts));
});
