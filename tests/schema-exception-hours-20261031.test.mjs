import test from 'node:test';
import assert from 'node:assert/strict';
import {extractBusinessDocument,essentialWebsiteCandidates} from '../website-knowledge.mjs';
import {generateGroundedAnswer} from '../server.mjs';

test('schema.org Store date-specific exceptions override weekly hours without cross-store leakage',async()=>{
  const doc='https://chain.example/tavaratalot/turku';
  const html='<script type="application/ld+json">'+JSON.stringify({
    '@type':'Store',name:'Example Turku',url:doc,
    openingHoursSpecification:{dayOfWeek:'Monday',opens:'08:00',closes:'20:00'},
    specialOpeningHoursSpecification:[
      {validFrom:'2026-12-24',validThrough:'2026-12-24',opens:'00:00',closes:'00:00'},
      {validFrom:'2026-12-31',validThrough:'2026-12-31',opens:'10:00',closes:'16:00'}
    ]
  })+'</script>';
  const page=extractBusinessDocument(html,doc);
  const facts=essentialWebsiteCandidates({finalUrl:'https://chain.example/',pageDocuments:[page],products:[]});
  const exceptions=facts.filter(x=>x.category==='Poikkeusaukioloajat');
  assert.equal(exceptions.length,2,JSON.stringify(exceptions));
  const rows=facts.map((x,i)=>({
    id:'e'+i,title:x.title,category:x.category,answer:x.answer,
    source_url:x.sourceUrl,source_type:'website',keywords:x.keywords
  }));
  const a=await generateGroundedAnswer({rows,lang:'fi',message:'Onko Turun myymälä auki 24.12.2026?'});
  assert.match(a.answer,/suljettu/);
  assert.equal(a.sourceIds.length,1);
  const b=await generateGroundedAnswer({rows,lang:'fi',message:'Turun aukioloajat 31.12.2026'});
  assert.match(b.answer,/10:00 - 16:00/);
  assert.equal(b.sourceIds.length,1);
});
