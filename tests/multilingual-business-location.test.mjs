import test from 'node:test';
import assert from 'node:assert/strict';
import { generateGroundedAnswer } from '../server.mjs';

const rows=[{
  id:'location-jag',
  category:'Sijainti ja myymälät',
  title:'Sijainti ja myymälät',
  answer:'From our home base in Turku, Finland, we are building a brand that combines Finnish craftsmanship and a passion for golf.',
  keywords:['sijainti','location','Turku','Finland'],
  source_type:'website',
  source_url:'https://example.fi/about',
}];

for(const [lang,message,expected] of [
  ['fi','Missä yritys sijaitsee?',/Turku, Finland/i],
  ['en','Where are you based?',/Turku, Finland/i],
  ['sv','Var finns företaget?',/Turku, Finland/i],
]){
  test('company location resolves directly in '+lang,async()=>{
    const result=await generateGroundedAnswer({rows,message,history:[],lang});
    assert.equal(result.handoff,false,JSON.stringify(result));
    assert.equal(result.intent,'Sijainti');
    assert.match(result.answer,expected);
    assert.doesNotMatch(result.answer,/idrottare|vänner|företagare|athlete|friends|entrepreneur/i);
  });
}


for(const [lang,message] of [
  ['fi','Missä päin yritys toimii?'],
  ['fi','Mikä on yrityksen sijainti?'],
  ['en','What location are you based in?'],
  ['sv','Vilken ort finns företaget på?'],
]){
  test('natural company-location paraphrase resolves verified base in '+lang+' — '+message,async()=>{
    const result=await generateGroundedAnswer({companyName:'Example',rows,message,history:[],lang});
    assert.equal(result.handoff,false,message+' '+JSON.stringify(result));
    assert.equal(result.intent,'Sijainti');
    assert.match(result.answer,/Turku, Finland/i,message+' '+result.answer);
    assert.doesNotMatch(result.answer,/athlete|friends|entrepreneur|idrottare|vänner|företagare/i,result.answer);
  });
}
