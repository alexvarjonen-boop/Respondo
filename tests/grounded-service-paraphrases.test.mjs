import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalProfessionalServiceQuestion, industryServiceAnswer } from '../industry-service-engine.mjs';
import { generateGroundedAnswer } from '../server.mjs';

const service=(id,label,answer=label+'.')=>({
  id,title:'Palvelut: '+label,answer,category:'Palvelut',approved:true,
  source_type:'website',source_url:'https://example.com/services'
});
const examples=[
  ['fi','Saako teillä vaihdettua jarrupalat?','Vaihdatteko jarrupalat?'],
  ['fi','Voiko teillä asentaa pistorasiat?','Asennatteko pistorasiat?'],
  ['fi','Hoituuko tuulilasin korjaus?','Korjaatteko tuulilasin?'],
  ['en','Could I get brake pads replaced?','Do you replace brake pads?'],
  ['en','Can I have the timing belt replaced?','Do you replace timing belt?'],
  ['en','Could your team install an electrical outlet?','Do you install electrical outlet?'],
  ['sv','Kan jag få bromsbelägg bytta?','Byter ni bromsbelagg?'],
  ['sv','Är det möjligt att installera en vattenkran?','Kan ni installera vattenkran?'],
  ['en','Would it be possible to have the mobile phone repaired?','Do you repair mobile phone?'],
  ['en','Is brake pad replacement available?','Do you replace brake pad?']
];

test('polite and indirect FI SV EN professional service requests map to explicit operations',()=>{
  for(const [lang,input,expected] of examples) {
    assert.equal(canonicalProfessionalServiceQuestion(input,lang),expected,input);
  }
});
test('canonicalization never claims availability without exact company-approved service facts',()=>{
  const question=canonicalProfessionalServiceQuestion('Could I get brake pads replaced?','en');
  const missing=industryServiceAnswer([],question,'en');
  assert.equal(missing.handoff,true);
  assert.deepEqual(missing.sourceIds,[]);
  const unrelated=industryServiceAnswer([service('tire','Renkaiden vaihto')],question,'en');
  assert.equal(unrelated.handoff,true);
  assert.deepEqual(unrelated.sourceIds,[]);
});
test('selling spare parts cannot prove a fitting or replacement service',()=>{
  const product={id:'part',title:'Brake pad replacement parts',answer:'Buy brake pad replacement parts',
    category:'Products',source_type:'website',approved:true};
  const answer=industryServiceAnswer([product],'Do you replace brake pads?','en');
  assert.equal(answer.handoff,true);
  assert.deepEqual(answer.sourceIds,[]);
});
test('ambiguous actions, multi-subject lists and car specifications are not simplified',()=>{
  const blocked=[
    ['en','Can I buy brake pads?'],
    ['en','Can I have the brake pads repaired or replaced?'],
    ['en','Could I get Tesla brake pads replaced?'],
    ['fi','Saako jarrupalojen vaihdon huomenna?'],
    ['en','Can I have brake pads and brake discs replaced?'],
    ['fi','Saako teillä akun vaihdon ilmaiseksi?'],
    ['en','Could I get AGM car batteries replaced?'],
    ['en','Can I have car batteries replaced in a Toyota 2023?'],
    ['sv','Kan jag få däck och bromsbelägg bytta?'],
    ['sv','Kan jag köpa bromsbelägg?']
  ];
  for(const [lang,q] of blocked) assert.equal(
    canonicalProfessionalServiceQuestion(q,lang),null,q
  );
});
test('existing direct questions continue through established priority resolvers',()=>{
  for(const [lang,q] of [
    ['fi','Vaihdatteko jarrupaloja?'],
    ['sv','Byter ni bromsbelägg?'],
    ['en','Do you replace brake pads?'],
    ['fi','Onnistuuko renkaiden paikkaus?']
  ]) assert.equal(canonicalProfessionalServiceQuestion(q,lang),null,q);
});
test('end-to-end: indirect Finnish question matches a documented vehicle repair',async()=>{
  const result=await generateGroundedAnswer({
    rows:[service('wind','Tuulilasin korjaus')],
    message:'Hoituuko tuulilasin korjaus?',lang:'fi'
  });
  assert.equal(result.handoff,false,JSON.stringify(result));
  assert.deepEqual(result.sourceIds,['wind']);
});
test('end-to-end: indirect Swedish service question finds matching Finnish company evidence',async()=>{
  const result=await generateGroundedAnswer({
    rows:[service('brakes','Jarrupalojen vaihto')],
    message:'Kan jag få bromsbelägg bytta?',lang:'sv'
  });
  assert.equal(result.handoff,false,JSON.stringify(result));
  assert.deepEqual(result.sourceIds,['brakes']);
  assert.match(result.answer,/^Ja/i);
});
test('end-to-end: indirect English question checks one precise service, not general workshop category',async()=>{
  const question='Could I get brake pads replaced?';
  const available=await generateGroundedAnswer({
    rows:[service('brakes','Jarrupalojen vaihto')],
    message:question,lang:'en'
  });
  assert.equal(available.handoff,false,JSON.stringify(available));
  assert.deepEqual(available.sourceIds,['brakes']);
  const generic=await generateGroundedAnswer({
    rows:[service('general','Autohuolto')],
    message:question,lang:'en'
  });
  assert.equal(generic.handoff,true,JSON.stringify(generic));
  assert.deepEqual(generic.sourceIds,[]);
});
test('end-to-end: plumbing installation uses exact tap evidence, not generic plumbing',async()=>{
  const q='Är det möjligt att installera en vattenkran?';
  const yes=await generateGroundedAnswer({
    rows:[service('tap','Vesihanojen asennus')],message:q,lang:'sv'
  });
  assert.equal(yes.handoff,false,JSON.stringify(yes));
  assert.deepEqual(yes.sourceIds,['tap']);
  const noProof=await generateGroundedAnswer({
    rows:[service('pipes','Putkiremontti')],message:q,lang:'sv'
  });
  assert.equal(noProof.handoff,true,JSON.stringify(noProof));
});
test('end-to-end: explicit refusal and conflicting approved rows are never converted to yes',async()=>{
  const q='Could I get brake pads replaced?';
  const denial={...service('no','Jarrupalojen vaihto'),answer:'Emme vaihda jarrupaloja.'};
  const refused=await generateGroundedAnswer({rows:[denial],message:q,lang:'en'});
  assert.equal(refused.handoff,false,JSON.stringify(refused));
  assert.doesNotMatch(refused.answer,/^Yes/i);
  const conflicting=await generateGroundedAnswer({
    rows:[service('yes','Jarrupalojen vaihto'),denial],message:q,lang:'en'
  });
  assert.equal(conflicting.handoff,true,JSON.stringify(conflicting));
  assert.deepEqual(conflicting.sourceIds,[]);
});
test('end-to-end: absent or rejected service cannot leak from a different company',async()=>{
  const q='Saako teillä vaihdettua jarrupalat?';
  const missing=await generateGroundedAnswer({rows:[],message:q,lang:'fi'});
  assert.equal(missing.handoff,true,JSON.stringify(missing));
  assert.deepEqual(missing.sourceIds,[]);
  const unapproved=await generateGroundedAnswer({
    rows:[{...service('draft','Jarrupalojen vaihto'),approved:false}],message:q,lang:'fi'
  });
  assert.equal(unapproved.handoff,true,JSON.stringify(unapproved));
  assert.deepEqual(unapproved.sourceIds,[]);
});
