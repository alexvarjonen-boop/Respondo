import test from 'node:test';
import assert from 'node:assert/strict';
import { interpretCustomerQuestion } from '../query-typos.mjs';
import { generateGroundedAnswer, app, detectConversationLanguage } from '../server.mjs';

const examples={
  fi:[
    ['Paljo toimitus maksa?',/paljonko toimitus maksaa/i],
    ['Onks teil auki huomen?',/onko teillä auki huomenna/i],
    ['Kui kaua toimitus kestää?',/kuinka kauan toimitus kestää/i],
    ['Voiks tän palautaa?',/voiko tän palauttaa/i],
    ['Mitä värei teil o?',/mitä värit teillä o/i],
    ['Paljokse maksaa?',/paljonko se maksaa/i],
    ['Oks tuotet varastos?',/onko tuotteet varastossa/i],
    ['Voiko varat aja?',/voiko varata aja/i],
    ['Entä toimtius?',/entä toimitus/i],
    ['Millo ootteks auki?',/milloin oletteko auki/i]
  ],
  sv:[
    ['Vad kostaar frackt?',/vad kostar frakt/i],
    ['Hur lang leveransitd?',/hur lang leveranstid/i],
    ['Har ni oppettider imorn?',/har ni öppettider imorgon/i],
    ['Och undergransen?',/och under gränsen/i],
  ],
  en:[
    ['How long des delivry tkae?',/how long does delivery take/i],
    ['Whta is the shiping caost?',/what is the shipping cost/i],
    ['Whre can I get a waranty?',/where can I get a warranty/i],
    ['What about belwo the threshold?',/what about below the threshold/i],
    ['Can I bokking an appoitment?',/can i booking an appointment/i]
  ]
};
for(const [language,cases] of Object.entries(examples)){
  test('common '+language+' keyboard mistakes and colloquial wording',()=>{
    for(const [input,expected] of cases){
      const result=interpretCustomerQuestion(input,language);
      assert.match(result.text,expected,input+' -> '+result.text);
    }
  });
}
test('protects prices, identifiers, emails, links and unknown merchant names',()=>{
  for(const text of [
    'JAG Satin Black 280€',
    'Tuote SKU-XR349 maksaa 299 €',
    'alex@example.com https://example.com/return-policy',
    'Mistä saan StarTrac L1000?',
    'Värivaihtoehto burgundy?',
    'Musta putteri on saatavilla',
    'Hyvää huomenta',
    'Mites sen summan alle jäävät ostokset'
  ]) assert.equal(interpretCustomerQuestion(text,'fi').text,text);
});
test('corrects follow-up spelling but keeps verified shipping evidence',async()=>{
  const rows=[
    {id:'free',category:'Toimitus ja seuranta',title:'Ilmainen toimitus',answer:'Toimitus on ilmainen yli 280€ tilauksille.',source_type:'website',source_url:'https://shop.example/shipping'},
    {id:'paid',category:'Toimitus ja seuranta',title:'Toimitusmaksu',answer:'Posti 5,90€.',source_type:'website',source_url:'https://shop.example/shipping'}
  ];
  const history=[{question:'Paljo toimitus maksa?',answer:'Toimitus on ilmainen yli 280€ tilauksille.'}];
  const result=await generateGroundedAnswer({rows,message:'Entä toimiTUSKULT sen alle?',history,lang:'fi'});
  assert.equal(result.handoff,false,JSON.stringify(result));
  assert.match(result.answer,/5,90|280/,result.answer);
  assert.ok(result.sourceIds.every(id=>['free','paid'].includes(id)));
});
test('misspelled delivery question uses approved facts in all three languages',async()=>{
  const rows=[{id:'time',category:'Toimitus ja seuranta',title:'Toimitusaika',answer:'Domestic orders arrive in 3-5 business days.',source_type:'website',source_url:'https://shop.example/shipping'}];
  for(const [lang,message] of [
    ['fi','Kuikn kaua toimitus kestää?'],
    ['en','How long des delivry tkae?'],
    ['sv','Hur lång leveransitd?']
  ]){
    const result=await generateGroundedAnswer({rows,message,lang});
    assert.equal(result.handoff,false,lang+': '+JSON.stringify(result));
    assert.match(result.answer,/3[-–]5/,lang+': '+result.answer);
  }
});
test('no merchant evidence means never invent a product, price or delivery claim',async()=>{
  const result=await generateGroundedAnswer({rows:[],message:'Paljo toimitus maksa?',lang:'fi'});
  assert.equal(result.handoff,true);
  assert.equal(result.sourceIds.length,0);
});
test('English page-language override detects common English typos',()=>{
  assert.equal(detectConversationLanguage('how long des delivery tkae','fi'),'en');
});
