import test from 'node:test';
import assert from 'node:assert/strict';
import { generateGroundedAnswer } from '../server.mjs';
import {
  essentialWebsiteCandidates,
  essentialWebsiteProfile,
  extractBusinessDocument,
} from '../website-knowledge.mjs';

const shippingRows=[
  {id:'free',category:'Toimitus',title:'Toimitus',answer:'Ilmainen toimitus 60€ tilauksiin',keywords:['toimitus'],source_type:'website',source_url:'https://shop.example/pages/toimitus'},
  {id:'budbee-locker',category:'Toimitus',title:'Toimitus',answer:'Budbee pakettiautomaatti: 4,80€',keywords:['toimitus'],source_type:'website',source_url:'https://shop.example/pages/toimitus'},
  {id:'budbee-home',category:'Toimitus',title:'Toimitus',answer:'Budbee kotiinkuljetus: 6,90€',keywords:['toimitus'],source_type:'website',source_url:'https://shop.example/pages/toimitus'},
  {id:'posti',category:'Toimitus',title:'Toimitus',answer:'Posti pakettiautomaatti tai noutopiste: 4,90€',keywords:['toimitus'],source_type:'website',source_url:'https://shop.example/pages/toimitus'},
];

for(const [lang,message] of [
  ['fi','Mitä toimitus maksaa?'],
  ['en','What are your shipping prices?'],
  ['sv','Vad kostar leveransen?'],
]){
  test('shipping cost answer combines paid rates and free threshold in '+lang,async()=>{
    const result=await generateGroundedAnswer({companyName:'Shop',rows:shippingRows,message,history:[],lang});
    assert.equal(result.handoff,false,JSON.stringify(result));
    assert.match(result.answer,/4[.,]80|4[.,]90|6[.,]90/);
    assert.match(result.answer,/60/);
  });
}

test('product-detail manufacturer contacts never become merchant profile contacts',()=>{
  const product=extractBusinessDocument(`
    <section><h2>Valmistajan tiedot</h2>
      <p>Partawa Oy</p>
      <p>Hämeenkatu 31, 11100 Riihimäki</p>
      <p>manufacturer@example.com</p>
      <p>050 111 2222</p>
    </section>
  `,'https://shop.example/products/razor');
  const support=extractBusinessDocument(`
    <section><h2>Asiakaspalvelu</h2>
      <p>asiakas@shop.example</p>
      <p>040 654 5654</p>
      <p>Osoite: Hallituskatu 9, 33200 Tampere</p>
    </section>
  `,'https://shop.example/pages/asiakas');
  const bundle={finalUrl:'https://shop.example/',products:[],pageDocuments:[product,support]};
  const facts=essentialWebsiteCandidates(bundle);
  const text=facts.map((x)=>x.answer).join('\n');
  const profile=essentialWebsiteProfile(bundle);
  assert.doesNotMatch(text,/manufacturer@example\.com|050\s*111\s*2222|Hämeenkatu\s*31/i);
  assert.equal(profile.email,'asiakas@shop.example');
  assert.match(profile.phone,/040\s*654\s*5654/);
  assert.equal(profile.address,'Hallituskatu 9, 33200 Tampere');
});

test('product-detail service-like product names do not enter the company service profile',()=>{
  const product=extractBusinessDocument(`
    <section><h2>Shave Kit</h2><p>Shave Kit: 49,90 €</p></section>
    <section><h2>Beard Care Kit</h2><p>Beard Care Kit: 29,90 €</p></section>
  `,'https://shop.example/products/shave-kit');
  const service=extractBusinessDocument(`
    <section><h2>Palvelut</h2><p>Tarjoamme hiustenleikkauksia.</p></section>
  `,'https://shop.example/palvelut');
  const profile=essentialWebsiteProfile({finalUrl:'https://shop.example/',products:[],pageDocuments:[product,service]});
  assert.match(profile.services,/hiustenleikka/i);
  assert.doesNotMatch(profile.services,/Shave Kit|Beard Care Kit/i);
});


for(const [lang,message] of [
  ['fi','Paljonko postikulut ovat?'],
  ['fi','Mitä toimituksesta veloitetaan?'],
  ['en','What do you charge for delivery?'],
  ['en','How much are the postage fees?'],
  ['sv','Hur mycket kostar frakten?'],
  ['sv','Vad tar ni betalt för leveransen?'],
]){
  test('natural shipping-cost paraphrase resolves in '+lang+' — '+message,async()=>{
    const result=await generateGroundedAnswer({companyName:'Shop',rows:shippingRows,message,history:[],lang});
    assert.equal(result.handoff,false,message+' '+JSON.stringify(result));
    assert.match(result.answer,/4[.,]80|4[.,]90|6[.,]90/,result.answer);
    assert.match(result.answer,/60/,result.answer);
  });
}
