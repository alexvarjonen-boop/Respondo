import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveIndustryServiceFollowup, industryServiceAnswer} from '../industry-service-engine.mjs';
import {generateGroundedAnswer} from '../server.mjs';

const fact=(id,work)=>({
  id,title:'Palvelut: '+work,answer:work+'.',category:'Palvelut',
  source_type:'website',source_url:'https://business.example/services',approved:true
});
const previous=(question,options={})=>[{question,answer:'A previous bot reply is not new evidence.',...options}];
const resolve=(question,earlier,lang='fi',options={})=>
  resolveIndustryServiceFollowup({message:question,history:previous(earlier,options),lang});

test('cross-industry subject changes use the earlier explicit operation, all three languages',()=>{
  for(const [now,was,lang,expected] of [
    ['Entä jarrulevyt?','Vaihdatteko jarrupaloja?','fi','Vaihdatteko jarrulevyt?'],
    ['And brake discs?','Do you replace brake pads?','en','Do you replace brake discs?'],
    ['Och bromsskivor?','Byter ni bromsbelägg?','sv','Byter ni bromsskivor?'],
    ['Entä pistorasiat?','Asennatteko valaisimia?','fi','Asennatteko pistorasiat?'],
    ['What about water heaters?','Do you install heat pumps?','en','Do you install water heaters?'],
    ['Och vindrutor?','Byter ni bromsskivor?','sv','Byter ni vindrutor?']
  ]) assert.equal(resolve(now,was,lang),expected,now);
});
test('unambiguous pronouns retain the entire earlier customer question',()=>{
  for(const [now,was,lang] of [
    ['Vaihdatteko ne?','Vaihdatteko jarrulevyjä?','fi'],
    ['Can you replace those?','Do you replace timing belts?','en'],
    ['Byter ni dem?','Byter ni bromsskivor?','sv'],
    ['Asennatteko sen?','Asennatteko pistorasioita?','fi']
  ]) assert.equal(resolve(now,was,lang),was,now);
});
test('changing the action never inherits the wrong operation',()=>{
  assert.equal(resolve('Can you repair it?','Do you replace brake discs?','en'),null);
  assert.equal(resolve('Asennatteko sen?','Vaihdatteko jarrupaloja?'),null);
  assert.equal(resolve('Lagar ni dem?','Byter ni bromsskivor?','sv'),null);
});
test('ambiguous context and interrupted topics do not resurrect an older subject',()=>{
  assert.equal(resolve('Entä jarrulevyt?','Mitä auton akun vaihto maksaa?'),null);
  assert.equal(resolve('Entä jarrulevyt?','Vaihdatteko jarrupaloja ja jarrulevyjä?'),null);
  assert.equal(resolve('Entä jarrulevyt?','Vaihdatteko jarrupaloja?','fi',{handoff:true}),null);
  assert.equal(resolveIndustryServiceFollowup({message:'Entä jarrulevyt?',history:[
    {question:'Vaihdatteko jarrupaloja?'},
    {question:'Mikä on osoitteenne?'}
  ]}),null);
  assert.equal(resolveIndustryServiceFollowup({message:'Entä jarrulevyt?',history:[]}),null);
});
test('price, delivery, scheduling, arbitrary names, multiple objects and unknown details stay separate',()=>{
  for(const question of [
    'Entä hinta?','Entä huomenna?','Entä pistorasiat ja valaisimet?',
    'What about Tesla?','What about delivery?','And 2026 brake discs?',
    'Och bokning?'
  ]) assert.equal(resolve(question,'Vaihdatteko jarrupaloja?','fi'),null,question);
});
test('new subjects do not silently drop brands or years from previous customer question',()=>{
  assert.equal(resolve('Entä jarrulevyt?','Vaihdatteko Teslan jarrupaloja?'),null);
  assert.equal(resolve('And brake discs?','Do you replace Toyota brake pads?','en'),null);
  assert.equal(resolve('And brake discs?','Do you replace 2023 brake pads?','en'),null);
  assert.equal(resolve('Entä jarrulevyt?','Vaihdatteko sähköauton jarrupaloja?'),null);
});
test('pronoun followups never use a previous assistant response as company evidence',()=>{
  const standalone=resolve('Can you replace those?','Do you replace brake discs?','en');
  assert.ok(standalone);
  const answer=industryServiceAnswer([],standalone,'en');
  assert.equal(answer.handoff,true);
  assert.deepEqual(answer.sourceIds,[]);
});
test('end-to-end Finnish automotive follow-up verifies only the newly named service',async()=>{
  const rows=[fact('brake','Jarrupalojen vaihto'),fact('disc','Jarrulevyjen vaihto')];
  const result=await generateGroundedAnswer({
    rows,message:'Entä jarrulevyt?',history:previous('Vaihdatteko jarrupaloja?'),lang:'fi'
  });
  assert.equal(result.handoff,false,JSON.stringify(result));
  assert.deepEqual(result.sourceIds,['disc']);
  assert.match(result.answer,/jarrulevyt/i);
});
test('end-to-end Swedish automotive follow-up uses Finnish company facts',async()=>{
  const rows=[fact('brake','Jarrupalojen vaihto'),fact('disc','Jarrulevyjen vaihto')];
  const result=await generateGroundedAnswer({
    rows,message:'Och bromsskivor?',history:previous('Byter ni bromsbelägg?'),lang:'sv'
  });
  assert.equal(result.handoff,false,JSON.stringify(result));
  assert.deepEqual(result.sourceIds,['disc']);
  assert.match(result.answer,/^Ja/i);
});
test('end-to-end English electrical and heating subjects are still company-scoped',async()=>{
  for(const [now,was,rows,id] of [
    ['What about water heaters?','Do you install heat pumps?',[
      fact('pump','Heat pump installation'),fact('heater','Water heater installation')],'heater'],
    ['And brake discs?','Do you replace brake pads?',[
      fact('brake','Jarrupalojen vaihto'),fact('disc','Jarrulevyjen vaihto')],'disc']
  ]){
    const result=await generateGroundedAnswer({rows,message:now,history:previous(was),lang:'en'});
    assert.equal(result.handoff,false,JSON.stringify(result));
    assert.deepEqual(result.sourceIds,[id]);
  }
});
test('missing, denied and conflicting service facts never result in a positive follow-up',async()=>{
  const cases=[
    [[],true,[]],
    [[fact('unrelated','Jarrupalojen vaihto')],true,[]],
    [[{...fact('no','Jarrulevyjen vaihto'),answer:'Emme vaihda jarrulevyjä.'}],false,['no']],
    [[fact('yes','Jarrulevyjen vaihto'),{...fact('no','Jarrulevyjen vaihto'),answer:'Emme vaihda jarrulevyjä.'}],true,[]]
  ];
  for(const [rows,expectedHandoff,expectedSources] of cases){
    const result=await generateGroundedAnswer({
      rows,message:'Entä jarrulevyt?',history:previous('Vaihdatteko jarrupaloja?'),lang:'fi'
    });
    assert.equal(result.handoff,expectedHandoff,JSON.stringify(result));
    assert.deepEqual(result.sourceIds,expectedSources);
  }
});
test('new industry followups cannot treat products as services',async()=>{
  const rows=[{id:'product',title:'Jarrulevyt',category:'Tuotteet',
    answer:'Myymme jarrulevyjä verkkokaupassa.',source_type:'website'}];
  const result=await generateGroundedAnswer({
    rows,message:'Entä jarrulevyt?',history:previous('Vaihdatteko jarrupaloja?'),lang:'fi'
  });
  assert.equal(result.handoff,true,JSON.stringify(result));
  assert.deepEqual(result.sourceIds,[]);
});
