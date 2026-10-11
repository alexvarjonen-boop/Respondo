import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveSpecialistConversationReference, matchVerifiedSpecialistService} from '../service-semantics.mjs';
import {generateGroundedAnswer} from '../server.mjs';

// Imported one-line snippets are accepted only if they contain a concrete
// business fact. A mere navigation heading is intentionally rejected.
const fact=(id,title,answer='Tarjoamme palvelun '+title+'.')=>({
  id,title:'Palvelut: '+title,answer,category:'Palvelut',source_type:'website',
  source_url:'https://workshop.example/works',approved:true
});
const history=(question,options={})=>[
  {question, answer:'The company confirmed the service.',handoff:false,...options}
];
const resolve=(message,question,lang='fi',options={})=>
  resolveSpecialistConversationReference({message,history:history(question,options),lang});

test('pronouns preserve only the last explicitly named service, across Finnish, Swedish and English',()=>{
  for(const [msg,prev,lang,expected] of [
    ['Vaihdatteko ne?','Vaihdatteko jarrupaloja?','fi','Vaihdatteko jarrupaloja?'],
    ['Byter ni dem?','Byter ni bromsbelägg?','sv','Byter ni bromsbelägg?'],
    ['Can you replace those?','Do you replace brake pads?','en','Do you replace brake pads?'],
    ['Do you replace it?','Do you replace car batteries?','en','Do you replace car batteries?']
  ]) assert.equal(resolve(msg,prev,lang),expected);
});
test('an explicitly different service subject inherits the procedure, not the old part',()=>{
  assert.equal(resolve('Entä raidetangon päät?','Vaihdatteko jarrupaloja?','fi'),
    'Vaihdatteko raidetangon päitä?');
  assert.equal(resolve('What about brake pads?','Do you replace car batteries?','en'),
    'Do you replace brake pads?');
  assert.equal(resolve('Och styrleder?','Byter ni bromsbelägg?','sv'),null); // new Swedish subject switch requires explicit opener
});
test('named vehicle follow-up does not silently reuse previous positive answer',()=>{
  assert.equal(resolve('What about Tesla?','Do you replace car batteries?','en'),
    'Do you replace car batteries tesla?');
  assert.equal(resolve('Entä Toyota?','Vaihdatteko jarrupaloja?'),
    'Vaihdatteko jarrupaloja toyota?');
});
test('never carry a subject through unverified, price, unrelated or compound history',()=>{
  assert.equal(resolve('Vaihdatteko ne?','Vaihdatteko jarrupaloja?','fi',{handoff:true}),null);
  assert.equal(resolve('What about Tesla?','How much does car battery replacement cost?','en'),null);
  assert.equal(resolve('Vaihdatteko ne?','Mitä maksaa jarrupalojen vaihto?'),null);
  assert.equal(resolve('Vaihdatteko ne?','Do you replace brake pads and car batteries?','en'),null);
  assert.equal(resolveSpecialistConversationReference({message:'Vaihdatteko ne?',history:[],lang:'fi'}),null);
});
test('explicitly changing the action is not misinterpreted as the prior operation',()=>{
  assert.equal(resolve('Can you repair it?','Do you replace brake pads?','en'),null);
  assert.equal(resolve('Asennatteko sen?','Vaihdatteko auton akkuja?','fi'),null);
  assert.equal(resolve('Byter ni dem?','Lagar ni punkteringar på däck?','sv'),null);
});
test('policy, cost, schedule and ambiguous multi-clause requests are not rewritten as service confirmation',()=>{
  for(const msg of ['What about the price?','What about shipping?','What about Tesla and BMW?',
     'Entä hinta?','Entä huomenna?','Can you replace them and brake pads?']){
    assert.equal(resolve(msg,'Do you replace car batteries?','en'),null,msg);
  }
});
test('no previously generated answer becomes service evidence when resolving a pronoun',()=>{
  const resolved=resolve('Can you replace those?','Do you replace brake pads?','en');
  assert.ok(resolved);
  const noEvidence=matchVerifiedSpecialistService({message:resolved,rows:[],lang:'en'});
  assert.equal(noEvidence.handoff,true);
  assert.deepEqual(noEvidence.sourceIds,[]);
});
test('end-to-end: contextual service pronouns are verified against current company information',async()=>{
  const rows=[fact('brakes','Jarrupalojen vaihto')];
  const result=await generateGroundedAnswer({
    rows,message:'Can you replace those?',history:history('Do you replace brake pads?'),lang:'en'
  });
  assert.equal(result.handoff,false,JSON.stringify(result));
  assert.deepEqual(result.sourceIds,['brakes']);
  assert.match(result.answer,/brake pads/i);
});
test('end-to-end: newer subject is independent of an earlier affirmative service',async()=>{
  const rows=[fact('brakes','Jarrupalojen vaihto')];
  const result=await generateGroundedAnswer({
    rows,message:'Entä raidetangon päät?',history:history('Vaihdatteko jarrupaloja?'),lang:'fi'
  });
  assert.equal(result.handoff,true,JSON.stringify(result));
  assert.deepEqual(result.sourceIds,[]);
});
test('end-to-end: a vehicle qualifier must be documented and remain tenant scoped',async()=>{
  const base=history('Do you replace car batteries?');
  const q='What about Tesla?';
  const generic=await generateGroundedAnswer({
    rows:[fact('battery','Car battery replacement')],message:q,history:base,lang:'en'
  });
  assert.equal(generic.handoff,true,JSON.stringify(generic));
  assert.deepEqual(generic.sourceIds,[]);
  const verified=await generateGroundedAnswer({
    rows:[fact('tesla','Tesla car battery replacement')],message:q,history:base,lang:'en'
  });
  assert.equal(verified.handoff,false,JSON.stringify(verified));
  assert.deepEqual(verified.sourceIds,['tesla']);
});
test('end-to-end: switching an explicitly named service works only with matching approved fact',async()=>{
  const rows=[fact('rod','Raidetangonpään vaihto'),fact('brake','Jarrupalojen vaihto')];
  const result=await generateGroundedAnswer({
    rows,message:'Entä raidetangon päät?',history:history('Vaihdatteko jarrupaloja?'),lang:'fi'
  });
  assert.equal(result.handoff,false,JSON.stringify(result));
  assert.deepEqual(result.sourceIds,['rod']);
});
