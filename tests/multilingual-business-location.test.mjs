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
