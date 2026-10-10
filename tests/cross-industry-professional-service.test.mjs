import test from 'node:test';
import assert from 'node:assert/strict';
import {generateGroundedAnswer} from '../server.mjs';
import {industryServiceAnswer} from '../industry-service-engine.mjs';
import {extractBusinessDocument,essentialWebsiteCandidates,isConcreteServiceLabel} from '../website-knowledge.mjs';

const make=(id,answer,category='Palvelut',title='Palvelut')=>({
  id,category,title,answer,source_type:'website',source_url:'https://workshop.example/services'
});
const workshop=[
  make('battery','Akun vaihto ja akkujen testaus.','Palvelut','Palvelut: Akun vaihto'),
  make('rod','Raidetankojen vaihto.','Palvelut','Palvelut: Raidetankojen vaihto'),
  make('patch','Renkaiden paikkaus.','Palvelut','Palvelut: Renkaiden paikkaus'),
  make('tire-swap','Renkaiden vaihto ja tasapainotus.','Palvelut','Palvelut: Renkaiden vaihto'),
  make('brake','Jarrupalojen vaihto.','Palvelut','Palvelut: Jarrupalojen vaihto')
];
for(const [message,id] of [
  ['Vaihdatteko akkuja?','battery'],
  ['Vaihdatteko raidetankoja?','rod'],
  ['Paikkaatteko renkaita?','patch'],
  ['Vaihdatteko jarrupaloja?','brake'],
  ['Teettekö akun vaihtoa?','battery'],
  ['Vaihatteko akkuja?','battery'],
  ['Onnistuuko renkaiden paikkaus?','patch'],
]){
  test('workshop capabilities: '+message,async()=>{
    const answer=await generateGroundedAnswer({rows:workshop,message,lang:'fi'});
    assert.equal(answer.handoff,false,JSON.stringify(answer));
    assert.deepEqual(answer.sourceIds,[id]);
    assert.match(answer.answer,/^Kyllä/i);
  });
}

for(const [lang,message,id] of [
  ['en','Do you replace car batteries?','battery'],
  ['en','Can you replace tie rods?','rod'],
  ['en','Do you repair tire punctures?','patch'],
  ['sv','Byter ni batterier?','battery'],
  ['sv','Kan ni byta styrstag?','rod'],
  ['sv','Lagar ni punkteringar på däck?','patch'],
]){
  test('cross-language professional operation: '+message,async()=>{
    const answer=await generateGroundedAnswer({rows:workshop,lang,message});
    assert.equal(answer.handoff,false,JSON.stringify(answer));
    assert.deepEqual(answer.sourceIds,[id]);
    assert.match(answer.answer,lang==='sv'?/^Ja/i:/^Yes/i);
  });
}

test('a tire change is NOT evidence for puncture repair',()=>{
  const result=industryServiceAnswer([workshop[3]],'Paikkaatteko renkaita?','fi');
  assert.equal(result.handoff,true);
  assert.deepEqual(result.sourceIds,[]);
  assert.doesNotMatch(result.answer,/^Kyllä/);
});
test('rod-end repair is NOT evidence for changing the entire tie rod',()=>{
  const onlyEnd=[make('end','Raidetangon päiden vaihto','Palvelut','Palvelut: Raidetangon päiden vaihto')];
  const answer=industryServiceAnswer(onlyEnd,'Vaihdatteko raidetankoja?','fi');
  assert.equal(answer.handoff,true);
});
test('changing entire tie rods is NOT evidence for a specific tie-rod end',()=>{
  const answer=industryServiceAnswer([workshop[1]],'Vaihdatteko raidetangon päitä?','fi');
  assert.equal(answer.handoff,true);
});
test('AGM and start-stop claims require that exact verified specification',()=>{
  const onlyGeneric=[workshop[0]];
  for(const question of ['Vaihdatteko AGM-akkuja?','Vaihdatteko Toyota Prius 2018 akkuja?']){
    const answer=industryServiceAnswer(onlyGeneric,question,'fi');
    assert.equal(answer.handoff,true,JSON.stringify(answer));
  }
  const agm=[make('agm','AGM-akkujen vaihto ja start-stop-akkujen vaihto.','Palvelut','Palvelut: AGM-akkujen vaihto')];
  const answer=industryServiceAnswer(agm,'Vaihdatteko AGM-akkuja?','fi');
  assert.equal(answer.handoff,false,JSON.stringify(answer));
  assert.deepEqual(answer.sourceIds,['agm']);
});
test('only a documented operation may be affirmed',()=>{
  const batteryOnly=[workshop[0]];
  const answer=industryServiceAnswer(batteryOnly,'Vaihdatteko jarrulevyjä?','fi');
  assert.equal(answer.handoff,true);
  assert.deepEqual(answer.sourceIds,[]);
});
test('explicitly declined work is NOT advertised as offered',()=>{
  const source=make('negative','Emme paikkaa renkaita. Vaihdamme renkaita.','Palvelut','Palvelut');
  const no=industryServiceAnswer([source],'Paikkaatteko renkaita?','fi');
  assert.equal(no.handoff,false);
  assert.deepEqual(no.sourceIds,['negative']);
  assert.match(no.answer,/emme tarjoa/i);
  const yes=industryServiceAnswer([source],'Vaihdatteko renkaita?','fi');
  assert.equal(yes.handoff,false,JSON.stringify(yes));
  assert.match(yes.answer,/Kyllä/i);
});
test('different tenant data never fills missing auto workshop services',async()=>{
  const result=await generateGroundedAnswer({
    rows:[make('store','Myymme auton akkuja ja renkaita.','Tuotteet','Autotarvikkeet')],
    message:'Vaihdatteko akkuja?',lang:'fi'
  });
  assert.equal(result.handoff,true,JSON.stringify(result));
  assert.deepEqual(result.sourceIds,[]);
});
test('professional details do not become guesses about car compatibility',()=>{
  const result=industryServiceAnswer(workshop,'Vaihdatteko Tesla 2023 akkuja?','fi');
  assert.equal(result.handoff,true);
  assert.deepEqual(result.sourceIds,[]);
});
test('generalized verified services work for HVAC, electrical, hair and dental industries',()=>{
  const scenarios=[
    [make('heat','Ilmalämpöpumppujen asennus.','Palvelut','Palvelut'), 'Asennatteko ilmalämpöpumppuja?'],
    [make('socket','Pistorasioiden asennus.','Palvelut','Palvelut'), 'Asennatteko pistorasioita?'],
    [make('hair','Hiusten leikkaus.','Palvelut','Palvelut'), 'Leikkaatteko hiuksia?'],
    [make('tooth','Hampaiden tarkastus.','Palvelut','Palvelut'), 'Tarkastatteko hampaita?']
  ];
  for(const [row,q] of scenarios) {
    const answer=industryServiceAnswer([row],q,'fi');
    // Some generic service verbs are handled by other established resolvers.
    if(answer){assert.equal(answer.handoff,false,q+' '+JSON.stringify(answer));assert.deepEqual(answer.sourceIds,[row.id]);}
  }
});
test('concrete technical service names are recognized during import',()=>{
  for(const label of ['Akun vaihto','Renkaiden paikkaus','Raidetankojen vaihto','Jarrupalojen vaihto','Nelipyöräsuuntaus']){
    assert.equal(isConcreteServiceLabel(label),true,label);
  }
  assert.equal(isConcreteServiceLabel('Palvelut'),false);
  assert.equal(isConcreteServiceLabel('Varaa aika'),false);
  const url='https://workshop.example/';
  const html='<main><h2>Autokorjaamon palvelut</h2>'+
    '<a href="/services/akku/">Akun vaihto</a>'+
    '<a href="/services/renkaat/">Renkaiden paikkaus</a>'+
    '<a href="/services/raide/">Raidetankojen vaihto</a></main>';
  const doc=extractBusinessDocument(html,url);
  const bundle={finalUrl:url,products:[],pageDocuments:[{url,...doc}],pages:[url],
    text:doc.text,links:doc.links.map(x=>x.url)};
  const facts=essentialWebsiteCandidates(bundle);
  const offerings=facts.filter(x=>x.category==='Palvelut').map(x=>x.answer);
  assert.ok(offerings.some(x=>/Akun vaihto/.test(x)),JSON.stringify(offerings));
  assert.ok(offerings.some(x=>/Renkaiden paikkaus/.test(x)),JSON.stringify(offerings));
  assert.ok(offerings.some(x=>/Raidetankojen vaihto/.test(x)),JSON.stringify(offerings));
});
