import test from 'node:test';
import assert from 'node:assert/strict';
import { generateGroundedAnswer } from '../server.mjs';

const rows=[
  {
    id:'mainio-source-area',
    category:'Muuttopalvelut',
    title:'Muuton toimialue',
    answer:'Mainio palvelee Turussa ja Varsinais-Suomessa, esimerkiksi Raisiossa, Kaarinassa, Liedossa, Maskussa ja Naantalissa. Muutot voivat suuntautua myös muualle Suomeen; tarkka reitti ja toteutus sovitaan erikseen.',
    source_type:'website',
    source_url:'https://www.mainiomuuttopalvelu.fi/avaimet-kateen-muutto-vai-omatoiminen-muutto-vaihtoehdot-vertailussa',
  },
  {
    id:'mainio-source-contact',
    category:'Yritystiedot',
    title:'Mainio Muuttopalvelu yhteystiedot',
    answer:'Mainio Muuttopalvelu Oy:n puhelin on 044 566 5937 ja sähköposti info@mainiomuuttopalvelu.fi. Toimipaikka on Tavarakatu 1, 20250 Turku.',
    source_type:'website',
    source_url:'https://www.mainiomuuttopalvelu.fi/yhteystiedot',
  }
];

for(const question of ['missä päin toimitte','missä te toimitte?','Missä kaikkialla toimitte?','Millä alueella palvelette?']){
  test('Mainio service-area question chooses area over contact info: '+question,async()=>{
    const result=await generateGroundedAnswer({companyName:'Mainio Muuttopalvelu',rows,message:question,history:[],lang:'fi'});
    assert.equal(result.handoff,false,JSON.stringify(result));
    assert.equal(result.intent,'Sijainti');
    assert.deepEqual(result.sourceIds,['mainio-source-area']);
    assert.match(result.answer,/Mainio palvelee Turussa ja Varsinais-Suomessa/);
    assert.match(result.answer,/myös muualle Suomeen/);
    assert.doesNotMatch(result.answer,/044 566|info@mainio|Toimipaikka on/);
    assert.doesNotMatch(result.answer,/Toimialueemme on Mainio palvelee/);
  });
}
