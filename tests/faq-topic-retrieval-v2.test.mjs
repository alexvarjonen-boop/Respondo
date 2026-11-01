import test from 'node:test';
import assert from 'node:assert/strict';
import {faqTopicEvidence,faqAnswersMateriallyConflict} from '../faq-topic-evidence.mjs';
import {generateGroundedAnswer} from '../server.mjs';

const compatible = [
  {topic:'gift card purchase',questions:[
    'Voinko ostaa lahjakortin?','Mistä voin ostaa lahjakortteja?',
    'Can I purchase a gift card?','Do you sell gift cards?',
    'Kan jag köpa ett presentkort?','Säljer ni presentkort?'
  ],titles:[
    'Lahjakorttien ostaminen','How to buy gift cards','Köpa presentkort'
  ]},
  {topic:'wifi availability',questions:[
    'Onko teillä wifi?','Löytyykö langatonta verkkoa?',
    'Is there Wi-Fi?','Do you have WiFi?',
    'Finns det trådlöst nät?','Har ni wifi?'
  ],titles:[
    'WiFi access','Onko langaton verkko käytettävissä','Trådlöst nät'
  ]},
  {topic:'gift card redemption',questions:[
    'Voiko lahjakortteja käyttää?','Saako lahjakortilla maksaa?',
    'Can I redeem a gift card?','Do you accept gift vouchers?',
    'Kan jag använda presentkort?'
  ],titles:[
    'Lahjakortin käyttö','How to redeem a gift card','Använda presentkort'
  ]},
  {topic:'warranty duration',questions:[
    'Kuinka kauan takuu kestää?','Kauanko takuu on voimassa?',
    'How long is the warranty?','How many years of guarantee?',
    'Hur länge gäller garantin?'
  ],titles:[
    'Takuun kesto','Warranty duration','Hur länge gäller garantin'
  ]},
  {topic:'return deadline',questions:[
    'Kuinka kauan palautukseen on aikaa?',
    'How many days do I have to return products?',
    'Hur länge har jag på mig att göra retur?'
  ],titles:[
    'Palautusaika','How long is the return window','Retur i 14 dagar'
  ]},
  {topic:'shipping cost',questions:[
    'Mitä toimitus maksaa?', 'How much does shipping cost?',
    'What is the delivery fee?', 'Vad kostar frakt?'
  ],titles:[
    'Toimituskulut','Shipping costs','Fraktavgift'
  ]},
  {topic:'shipping duration',questions:[
    'Kauanko toimitus kestää?', 'When will delivery arrive?',
    'How long does shipping take?', 'Hur länge tar leveransen?'
  ],titles:[
    'Toimitusaika','Delivery time','Leveranstid'
  ]},
  {topic:'booking cancellation',questions:[
    'Voinko peruuttaa ajanvarauksen?', 'How can I cancel my appointment?',
    'Kan jag avboka min tid?'
  ],titles:[
    'Ajanvarauksen peruminen','Cancel a booking','Avboka bokning'
  ]},
  {topic:'order cancellation',questions:[
    'Voiko tilauksen peruuttaa?', 'How can I cancel my order?',
    'Kan jag avbeställa en beställning?'
  ],titles:[
    'Tilauksen peruutus','Cancel an order','Avbeställa beställning'
  ]},
  {topic:'accepted payment methods',questions:[
    'Mitä maksutapoja hyväksytte?', 'Which payment methods can I use?',
    'Vilka betalsätt erbjuder ni?'
  ],titles:[
    'Maksutavat','Accepted payment methods','Betalsätt'
  ]}
];

for(const group of compatible){
  for(const question of group.questions)for(const title of group.titles){
    test('grounded topic '+group.topic+': '+question+' / '+title,()=>{
      const result=faqTopicEvidence(question,title);
      assert.ok(result,JSON.stringify({question,title}));
      assert.ok(result.score>=0.8&&result.score<1);
    });
  }
}
const unrelated = [
  ['Can I redeem my gift card?','Do you sell gift cards?'],
  ['Can I buy a gift card?','How do I redeem a gift card?'],
  ['Is the WiFi free?','WiFi password'],
  ['What is the wireless password?','Is there WiFi?'],
  ['How long can I return it?','How much is the return fee?'],
  ['Is the return shipping free?','Return policy duration'],
  ['What does warranty cover?','How long is the warranty?'],
  ['How much does shipping cost?','How long does delivery take?'],
  ['Do you deliver internationally?','How much is shipping?'],
  ['Can I cancel my booking?','How can I cancel an order?'],
  ['What is the cancellation fee?','How do I cancel a booking?'],
  ['How can I cancel an order?','How do I cancel an appointment?'],
  ['Can I bring my dog inside?','Gift cards'],
  ['Do you accept payments?','What are the opening hours?'],
  ['Can I pay in cash?','Delivery price'],
  ['How much does shipping cost, except in winter?','Delivery costs']
];
for(const [question,title] of unrelated){
  test('does not conflate FAQ policies: '+question+' / '+title,()=>{
    assert.equal(faqTopicEvidence(question,title),null);
  });
}
const agreements=[
  ['Yes. Pets are welcome inside.','Yes, pets are allowed inside.',false],
  ['Ei. Koirat eivät ole sallittuja.','Ei, koirien tuonti on kielletty.',false],
  ['Kyllä, toimitamme tuotteita.','Ei, emme toimita tuotteita.',true],
  ['Yes, 14 days for returns.','Yes, 30 days for returns.',true],
  ['Yes, gift cards are accepted.','No, we do not accept gift cards.',true],
  ['Yes, gift cards are accepted.','Yes, only corporate gift cards are accepted.',true],
  ['Our delivery time is 2-4 days.','Shipping takes 3-5 days.',true],
  ['Refunds are processed after 3 days.','Refunds are processed after 3 days.',false]
];
for(const [a,b,expected] of agreements){
  test('compares policy materiality: '+a+' / '+b,()=>{
    assert.equal(faqAnswersMateriallyConflict(a,b),expected);
  });
}
const faq=(id,title,answer,category='Usein kysytyt')=>({
  id,title,category,answer,source_type:'website',source_url:'https://tenant.example/faq',
  keywords:['faq','merchant']
});
const generate=(rows,message,lang='en')=>generateGroundedAnswer({
  companyName:'Fixture tenant',rows,message,lang,history:[]
});
test('real answer engine supports unpunctuated merchant FAQ headings',async()=>{
  const rows=[faq('w1','WiFi access','Yes, visitors can use our WiFi.')];
  const r=await generate(rows,'Do you have WiFi?');
  assert.equal(r.handoff,false);
  assert.match(r.answer,/visitors can use our WiFi/i);
  assert.deepEqual(r.sourceIds,['w1']);
});
test('real answer engine does not need matching language to align verified FAQ title',async()=>{
  const rows=[faq('g1','Lahjakorttien ostaminen','Yes, we sell gift cards.')];
  const r=await generate(rows,'Can I purchase a gift card?');
  assert.equal(r.handoff,false);
  assert.match(r.answer,/sell gift cards/i);
  assert.deepEqual(r.sourceIds,['g1']);
});
test('generic unrelated service page cannot masquerade as a FAQ without a question mark',async()=>{
  const rows=[faq('g1','Lahjakorttien ostaminen','Yes, we sell gift cards.','Palvelut')];
  const r=await generate(rows,'Can I purchase a gift card?');
  assert.notEqual(r.intent,'Usein kysytyt');
});
test('no approval provenance means no verified FAQ answer',async()=>{
  const rows=[{...faq('w1','WiFi access','Yes, free WiFi.'),source_url:''}];
  const r=await generate(rows,'Do you have WiFi?');
  assert.ok(r.handoff || !r.sourceIds.includes('w1'));
});
test('different but compatible approved FAQ phrasing no longer forces handoff',async()=>{
  const rows=[
    faq('w1','WiFi access','Yes. WiFi is available to our visitors.'),
    faq('w2','Onko langaton verkko käytettävissä','Yes, visitors can access WiFi.')
  ];
  const r=await generate(rows,'Do you have WiFi?');
  assert.equal(r.handoff,false);
  assert.ok(r.sourceIds.includes('w1')||r.sourceIds.includes('w2'));
});
test('contradictory approved FAQ remains a handoff',async()=>{
  const rows=[
    faq('w1','WiFi access','Yes. WiFi is available to our visitors.'),
    faq('w2','Onko langaton verkko käytettävissä','No. There is no customer WiFi.')
  ];
  const r=await generate(rows,'Do you have WiFi?');
  assert.equal(r.handoff,true);
  assert.deepEqual(r.sourceIds,[]);
});
