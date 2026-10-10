import test from 'node:test';
import assert from 'node:assert/strict';
import {verifiedIndustryServiceAnswer} from '../industry-service-intelligence.mjs';
import {generateGroundedAnswer} from '../server.mjs';

const row=(id,title,answer,category='Palvelut')=>({
  id,category,title,answer,source_type:'website',source_url:'https://example.fi/palvelut'
});
const facts=[
  row('battery','Palvelut: Auton akun vaihto','Auton akun vaihto ja akun testaus.'),
  row('rod','Palvelut: Raidetangon vaihto','Raidetangon vaihto ja ohjauskulmien tarkastus.'),
  row('tire','Palvelut: Renkaan paikkaus','Renkaan paikkaus pistovaurion jälkeen.'),
  row('brake','Palvelut: Jarrupalojen vaihto','Jarrupalojen vaihto ja jarrujen tarkastus.'),
];

test('direct FI mechanic questions match precisely the correct procedure and part',async()=>{
  const examples=[
    ['Vaihdatteko akkuja?','battery'],
    ['Vaihdatteko raidetankoja?','rod'],
    ['Paikkaatteko renkaita?','tire'],
    ['Vaihdatteko jarrupaloja?','brake'],
  ];
  for(const [message,id] of examples){
    const result=await generateGroundedAnswer({companyName:'Autokorjaamo',rows:facts,message,lang:'fi'});
    assert.equal(result.handoff,false,message+' '+JSON.stringify(result));
    assert.deepEqual(result.sourceIds,[id],message);
    assert.match(result.answer,/^Kyllä/i,message);
  }
});

test('the same verified jobs can be asked in English and Swedish',async()=>{
  const examples=[
    ['en','Do you replace car batteries?','battery'],
    ['en','Can you replace tie rods?','rod'],
    ['en','Do you patch tires?','tire'],
    ['sv','Byter ni bilbatterier?','battery'],
    ['sv','Byter ni styrstag?','rod'],
  ];
  for(const [lang,message,id] of examples){
    const result=await generateGroundedAnswer({companyName:'Autokorjaamo',rows:facts,message,lang});
    assert.equal(result.handoff,false,message+' '+JSON.stringify(result));
    assert.deepEqual(result.sourceIds,[id],message);
    assert.match(result.answer,lang==='en'?/^Yes/i:/^Ja/i);
  }
});

test('specific job is not inferred from a broad autokorjaamo or tire-service category',async()=>{
  const vague=[row('general','Autohuolto','Teemme auton huoltoja, rengastöitä ja alustan korjauksia.')];
  for(const message of ['Vaihdatteko raidetankoja?','Paikkaatteko renkaita?','Vaihdatteko akkuja?']){
    const result=await generateGroundedAnswer({rows:vague,message,lang:'fi'});
    assert.equal(result.handoff,true,message+' '+JSON.stringify(result));
    assert.deepEqual(result.sourceIds,[],message);
  }
});

test('replacement, puncture repair and other operations are not interchangeable',async()=>{
  const tireOnly=[row('change','Palvelut: Renkaan vaihto','Renkaan vaihto ja tasapainotus.')];
  const change=await generateGroundedAnswer({rows:tireOnly,message:'Vaihdatteko renkaita?',lang:'fi'});
  assert.equal(change.handoff,false,JSON.stringify(change));
  const patch=await generateGroundedAnswer({rows:tireOnly,message:'Paikkaatteko renkaita?',lang:'fi'});
  assert.equal(patch.handoff,true,JSON.stringify(patch));
  assert.deepEqual(patch.sourceIds,[]);
  const repair=await generateGroundedAnswer({rows:[facts[1]],message:'Korjaatteko raidetankoja?',lang:'fi'});
  assert.equal(repair.handoff,true,JSON.stringify(repair));
});

test('tie-rod-end and complete tie-rod jobs do not silently substitute for one another',async()=>{
  const result=await generateGroundedAnswer({rows:[facts[1]],message:'Vaihdatteko raidetangon päitä?',lang:'fi'});
  assert.equal(result.handoff,true,JSON.stringify(result));
  assert.deepEqual(result.sourceIds,[]);
});

test('approved contradiction blocks a guessed affirmative answer',async()=>{
  const no=row('no','Palvelut: Akun vaihto','Emme vaihda auton akkuja.');
  const result=await generateGroundedAnswer({rows:[facts[0],no],message:'Vaihdatteko akkuja?',lang:'fi'});
  assert.equal(result.handoff,true,JSON.stringify(result));
  assert.deepEqual(result.sourceIds,[]);
});

test('ecommerce product rows and other tenants never count as evidence of workshop services',async()=>{
  const product={id:'product',category:'Tuotteet',title:'Auton akku',answer:'Akkua voi ostaa verkkokaupasta.',source_type:'website'};
  const result=await generateGroundedAnswer({rows:[product],message:'Vaihdatteko akkuja?',lang:'fi'});
  assert.equal(result.handoff,true,JSON.stringify(result));
  assert.deepEqual(result.sourceIds,[]);
});

test('professional electric vehicle restrictions need explicit matching competence',async()=>{
  for(const message of ['Vaihdatteko sähköauton akkuja?','Vaihdatteko korkeajänniteakkuja?']){
    const result=await generateGroundedAnswer({rows:[facts[0]],message,lang:'fi'});
    assert.equal(result.handoff,true,message+' '+JSON.stringify(result));
  }
});

test('other industries: plumbing and accounting use concrete source facts',async()=>{
  const plumbing=[row('drain','Palvelut: Viemärin avaus','Teemme viemärin avauksia ja puhdistuksia.')];
  const plumbingResult=await generateGroundedAnswer({rows:plumbing,message:'Avaatteko viemäreitä?',lang:'fi'});
  assert.equal(plumbingResult.handoff,false,JSON.stringify(plumbingResult));
  assert.deepEqual(plumbingResult.sourceIds,['drain']);
  const accountant=verifiedIndustryServiceAnswer([row('payroll','Palvelut: Palkanlaskenta','Palkanlaskenta yrityksille.')],
    'Teettekö palkanlaskentaa?','fi');
  assert.equal(accountant?.handoff,false,JSON.stringify(accountant));
});

test('time, money and promises cannot be inferred from service availability alone',()=>{
  const r=verifiedIndustryServiceAnswer(facts,'Vaihdatteko akkuja ilmaiseksi?','fi');
  assert.equal(r,null);
});

test('multiple tenants retain independent service availability',async()=>{
  const a=await generateGroundedAnswer({rows:[facts[0]],lang:'fi',message:'Vaihdatteko akkuja?'});
  const b=await generateGroundedAnswer({rows:[facts[2]],lang:'fi',message:'Vaihdatteko akkuja?'});
  assert.equal(a.handoff,false);
  assert.equal(b.handoff,true);
});
