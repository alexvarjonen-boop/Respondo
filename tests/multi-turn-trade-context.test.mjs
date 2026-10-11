import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveIndustryServiceFollowup} from '../industry-service-engine.mjs';
import {generateGroundedAnswer} from '../server.mjs';

const service=(id,name,answer=name+'.')=>({
  id,title:'Palvelut: '+name,answer,category:'Palvelut',
  source_type:'website',source_url:'https://example.fi/palvelut',approved:true
});
const turns=(...questions)=>questions.map(question=>({question,answer:'Automaattinen keskusteluviesti.'}));
const resolve=(message,questions,lang='fi')=>
  resolveIndustryServiceFollowup({message,history:turns(...questions),lang});

test('chains two service-subject switches in Finnish without forgetting the operation',()=>{
  assert.equal(resolve('Entä kytkimet?',[
    'Vaihdatteko jarrupaloja?','Entä jarrulevyt?'
  ]),'Vaihdatteko kytkimet?');
});
test('chains service-subject switches in Swedish and English',()=>{
  assert.equal(resolve('Och kopplingar?',[
    'Byter ni bromsbelägg?','Och bromsskivor?'
  ],'sv'),'Byter ni kopplingar?');
  assert.equal(resolve('What about timing chains?',[
    'Do you replace brake pads?','And brake discs?'
  ],'en'),'Do you replace timing chains?');
});
test('a pronoun follows the most recently named object in a multi-turn chain',()=>{
  assert.equal(resolve('Can you replace those?',[
    'Do you replace brake pads?','And brake discs?'
  ],'en'),'Do you replace brake discs?');
  assert.equal(resolve('Vaihdatteko ne?',[
    'Vaihdatteko jarrupaloja?','Entä jarrulevyt?'
  ]),'Vaihdatteko jarrulevyt?');
});
test('pronoun-only intermediate questions keep the original service subject',()=>{
  assert.equal(resolve('What about brake discs?',[
    'Do you replace brake pads?','Can you replace those?'
  ],'en'),'Do you replace brake discs?');
  assert.equal(resolve('Entä kytkimet?',[
    'Vaihdatteko jarrupaloja?','Vaihdatteko ne?','Entä jarrulevyt?'
  ]),'Vaihdatteko kytkimet?');
});
test('acknowledgements do not break an otherwise continuous topic',()=>{
  assert.equal(resolve('Entä kytkimet?',[
    'Vaihdatteko jarrupaloja?','Kiitos','Entä jarrulevyt?','Joo'
  ]),'Vaihdatteko kytkimet?');
});
test('a product/contact topic switch breaks service memory',()=>{
  assert.equal(resolve('Entä kytkimet?',[
    'Vaihdatteko jarrupaloja?','Entä jarrulevyt?','Mikä osoitteenne on?'
  ]),null);
  assert.equal(resolve('What about timing chains?',[
    'Do you replace brake pads?','And brake discs?','What do you sell?'
  ],'en'),null);
});
test('an unverified or handed-off intermediary breaks the chain',()=>{
  const result=resolveIndustryServiceFollowup({
    message:'Entä kytkimet?',lang:'fi',
    history:[
      {question:'Vaihdatteko jarrupaloja?',handoff:false},
      {question:'Entä jarrulevyt?',handoff:true},
    ]
  });
  assert.equal(result,null);
});
test('price, warranty, and scheduling remain independent of earlier service questions',()=>{
  for(const question of ['Entä hinta?','Entä takuu?','Entä huomenna?','Paljonko se maksaa?']){
    assert.equal(resolve(question,['Vaihdatteko jarrupaloja?','Entä jarrulevyt?']),null,question);
  }
});
test('multi-object questions or manufacturer restrictions break unsafe inheritance',()=>{
  assert.equal(resolve('Entä kytkimet?',[
    'Vaihdatteko jarrupaloja?','Vaihdatteko jarrulevyt ja kytkimet?'
  ]),null);
  assert.equal(resolve('Entä kytkimet?',[
    'Vaihdatteko jarrupaloja?','Entä Teslan jarrulevyt?'
  ]),null);
});
test('the context window is bounded and must not resurrect old subjects',()=>{
  assert.equal(resolve('Entä kytkimet?',[
    'Vaihdatteko jarrupaloja?','Kiitos','OK','Thanks','Joo','Fine','OK','Kiitos'
  ]),null);
});
test('end to end: third service followup is independently verified from Finnish company rows',async()=>{
  const rows=[
    service('pads','Jarrupalojen vaihto'),
    service('discs','Jarrulevyjen vaihto'),
    service('clutch','Kytkimien vaihto')
  ];
  const result=await generateGroundedAnswer({
    rows,message:'Entä kytkimet?',lang:'fi',
    history:turns('Vaihdatteko jarrupaloja?','Entä jarrulevyt?')
  });
  assert.equal(result.handoff,false,JSON.stringify(result));
  assert.deepEqual(result.sourceIds,['clutch']);
  assert.match(result.answer,/kytkimet|kytkimi/i);
});
test('end to end: English followup resolves only this company actual timing chain service',async()=>{
  const rows=[service('chain','Timing chain replacement')];
  const result=await generateGroundedAnswer({
    rows,message:'What about timing chains?',lang:'en',
    history:turns('Do you replace brake pads?','And brake discs?')
  });
  assert.equal(result.handoff,false,JSON.stringify(result));
  assert.deepEqual(result.sourceIds,['chain']);
});
test('end to end: when third service is absent, bot does not hallucinate it',async()=>{
  const rows=[service('pads','Jarrupalojen vaihto'),service('discs','Jarrulevyjen vaihto')];
  const result=await generateGroundedAnswer({
    rows,message:'Entä kytkimet?',lang:'fi',
    history:turns('Vaihdatteko jarrupaloja?','Entä jarrulevyt?')
  });
  assert.equal(result.handoff,true,JSON.stringify(result));
  assert.deepEqual(result.sourceIds,[]);
});
test('end to end: a declined third service never becomes an affirmative',async()=>{
  const rows=[
    service('discs','Jarrulevyjen vaihto'),
    service('no-clutch','Kytkimien vaihto','Emme vaihda kytkimiä.')
  ];
  const result=await generateGroundedAnswer({
    rows,message:'Entä kytkimet?',lang:'fi',
    history:turns('Vaihdatteko jarrupaloja?','Entä jarrulevyt?')
  });
  assert.doesNotMatch(result.answer,/^Kyllä/i,JSON.stringify(result));
});
test('end to end: other companies knowledge never supports the third service',async()=>{
  const rows=[service('a','Jarrupalojen vaihto')];
  const result=await generateGroundedAnswer({
    rows,message:'Entä kytkimet?',lang:'fi',
    history:turns('Vaihdatteko jarrupaloja?','Entä jarrulevyt?')
  });
  assert.equal(result.handoff,true,JSON.stringify(result));
  assert.deepEqual(result.sourceIds,[]);
});
