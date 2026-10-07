import test from 'node:test';
import assert from 'node:assert/strict';
import { generateGroundedAnswer } from '../server.mjs';

const jagRows=[{
  id:'returns-jag',
  category:'Palautukset ja vaihdot',
  title:'Palautukset ja vaihdot',
  answer:'Return within 45 days of purchase. Duties & taxes are non-refundable.',
  keywords:['return','refund','palautus','retur'],
  source_type:'website',
  source_url:'https://example.fi/returns',
}];

for(const [lang,message,expected] of [
  ['fi','Voinko palauttaa tuotteen?',/45 päivän/i],
  ['en','Can I return an item?',/45 days/i],
  ['sv','Kan jag returnera en produkt?',/45 dagar/i],
]){
  test('45-day return policy is available in '+lang+' without translator',async()=>{
    const result=await generateGroundedAnswer({rows:jagRows,message,history:[],lang});
    assert.equal(result.handoff,false,JSON.stringify(result));
    assert.equal(result.intent,'Palautukset');
    assert.match(result.answer,expected);
  });
}

const finnishRows=[{
  id:'returns-fi',
  category:'Palautukset ja vaihdot',
  title:'Palautusoikeus',
  answer:'Tuotteilla on 100 päivän palautusoikeus.',
  keywords:['palautus','return','retur'],
  source_type:'website',
  source_url:'https://example.fi/palautus',
}];

for(const [lang,message,expected] of [
  ['fi','Millainen palautusoikeus teillä on?',/100 päivän/i],
  ['en','What is your return policy?',/100 days/i],
  ['sv','Hur fungerar er returpolicy?',/100 dagar/i],
]){
  test('Finnish 100-day return policy is localized in '+lang,async()=>{
    const result=await generateGroundedAnswer({rows:finnishRows,message,history:[],lang});
    assert.equal(result.handoff,false,JSON.stringify(result));
    assert.equal(result.intent,'Palautukset');
    assert.match(result.answer,expected);
  });
}
