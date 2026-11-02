import test from 'node:test';
import assert from 'node:assert/strict';
import {mainioMultilingualTariffAnswer} from '../mainio-multilingual-tariffs.mjs';
import {mainioOfficialPublicFacts} from '../mainio-official-public-facts.mjs';
import {mainioPublicFactAnswer} from '../mainio-public-fact-answer.mjs';

const rows=mainioOfficialPublicFacts();
const cases={
  fi:[
    ['Mitä paku maksaa?',3,'50 €'],
    ['Paljonko paku on?',3,'50 €'],
    ['Paljonko paku maksaa 3h?',1,'50 €'],
    ['Mitä maksaa paku viideksi tunniksi?',1,'70 €'],
    ['Paljol saa pakun päiväksi?',1,'90 €'],
    ['Kerro kaikki pakettiauton vuokrahinnat',3,'50 €'],
    ['Paljonko muuttolaatikot maksaa?',1,'0,20 €'],
    ['Mikä on laatikoiden kuljetusmaksu?',1,'25 €'],
  ],
  sv:[
    ['Vad kostar det att hyra en skåpbil?',3,'50 €'],
    ['Hur mycket kostar skåpbilen i tre timmar?',1,'50 €'],
    ['Vad kostar skåpbil 5 timmar?',1,'70 €'],
    ['Vad kostar skåpbil per dygn?',1,'90 €'],
    ['Hur mycket kostar flyttlådor?',1,'0,20 €'],
    ['Vad kostar leverans av flyttlådor?',1,'25 €'],
  ],
  en:[
    ['How much does a van cost?',3,'€50'],
    ['What is the price for a van for 3 hours?',1,'€50'],
    ['How much does van rental for 5 hours cost?',1,'€70'],
    ['What is the price for a van for 24 hours?',1,'€90'],
    ['How much are moving boxes?',1,'€0.20'],
    ['How much does moving box delivery cost?',1,'€25'],
  ]
};
test('720 FI SV EN utterance variants return their specific verified rental tariff',()=>{
  let count=0;
  for(const [lang,examples] of Object.entries(cases)){
    for(const [q,sourceCount,expected] of examples){
      for(const prefix of ['','Hello, ','Hej, ','Moi, ']){
        for(const transform of [x=>x,x=>x.toLowerCase(),x=>x.toUpperCase()]){
          for(const suffix of ['','?',' kiitos']){
            const message=prefix+transform(q)+suffix;
            const result=mainioPublicFactAnswer(rows,message,lang);
            assert.ok(result&&!result.handoff,lang+': '+message);
            assert.equal(result.sourceIds.length,sourceCount,lang+': '+message);
            assert.ok(result.answer.includes(expected) || (lang==='fi' && result.answer.includes(expected.replace(' €',' euroa'))),lang+': '+message+' -> '+result.answer);
            assert.equal(result.verified,true);
            count++;
          }
        }
      }
    }
  }
  assert.equal(count,720);
});
test('do not invent availability, approve fake sources, or price a different service',()=>{
  for(const [lang,q] of [
    ['fi','Onko paku vapaana huomenna?'],
    ['sv','Är skåpbilen ledig imorgon?'],
    ['en','Is the van available tomorrow?'],
    ['en','How much does a house move cost?'],
    ['fi','Mitä muuttopalvelu maksaa?'],
    ['sv','Vad kostar en flyttfirma?']
  ]) assert.equal(mainioMultilingualTariffAnswer(rows,q,lang),null,q);
  for(const lang of ['fi','sv','en']){
    const q={fi:'Mitä paku maksaa?',sv:'Vad kostar en skåpbil?',en:'How much does a van cost?'}[lang];
    assert.equal(mainioMultilingualTariffAnswer([],q,lang),null);
    assert.equal(mainioMultilingualTariffAnswer(rows.map(r=>({...r,approved:false})),q,lang),null);
    assert.equal(mainioMultilingualTariffAnswer(rows.map(r=>({...r,source_url:'https://mainiomuuttopalvelu.fi.evil.example/prices'})),q,lang),null);
    assert.equal(mainioMultilingualTariffAnswer(rows.map(r=>({...r,answer:r.answer.replace('110 euroa','111 euroa')})),q,lang),null);
  }
  assert.equal(mainioPublicFactAnswer(rows,'Mitä paku maksaa?','en'),null);
});
test('short follow-up inherits only the explicit previous vehicle topic',()=>{
  assert.equal(mainioMultilingualTariffAnswer(rows,'And what does it cost?','en','Can I rent a van?')?.sourceIds.length,3);
  assert.equal(mainioMultilingualTariffAnswer(rows,'Paljonko se maksaa?','fi','Mistä pakettiauto haetaan?')?.sourceIds.length,3);
  assert.equal(mainioMultilingualTariffAnswer(rows,'How much does a house move cost?','en','Can I rent a van?'),null);
  assert.equal(mainioMultilingualTariffAnswer(rows,'How much are moving boxes?','en','How much does a van cost?')?.sourceIds.length,1);
});
