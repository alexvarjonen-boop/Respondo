import test from 'node:test';
import assert from 'node:assert/strict';
import {industryServiceAnswer,canonicalProfessionalServiceQuestion} from '../industry-service-engine.mjs';
import {generateGroundedAnswer} from '../server.mjs';
import {isConcreteServiceLabel,usableWebsiteRow} from '../website-knowledge.mjs';

const service=(id,name,options={})=>({
  id,title:'Palvelut: '+name,answer:name,category:'Palvelut',
  source_type:'website',source_url:'https://trade.example.fi/palvelut',
  approved:true,...options
});
const documented=[
  ['en','Do you replace wheel bearings?','Pyöränlaakerien vaihto','bearing'],
  ['fi','Vaihdatteko jarrunesteet?','Jarrunesteen vaihto','fluid'],
  ['sv','Byter ni tändstift?','Sytytystulppien vaihto','spark'],
  ['en','Do you replace fuel filters?','Polttoainesuodattimen vaihto','fuel'],
  ['fi','Vaihdatteko jäähdyttimiä?','Jäähdyttimen vaihto','radiator'],
  ['en','Do you replace wiper blades?','Pyyhkijänsulkien vaihto','wipers'],
  ['fi','Avaatteko viemäreitä?','Viemärin avaus','drain'],
  ['en','Do you clean ventilation ducts?','Ilmanvaihtokanavien puhdistus','duct'],
  ['fi','Asennatteko lattialämmityksiä?','Lattialämmityksen asennus','floor'],
  ['en','Can you install charging stations?','Latausasemien asennus','charge'],
  ['sv','Kan ni installera solpaneler?','Aurinkopaneelien asennus','solar'],
  ['en','Do you build wooden decks?','Terassien rakentaminen','deck'],
  ['fi','Pesettekö savupiippuja?','Savupiippujen pesu','chimney'],
  ['en','Do you repair eyebrows?','Kulmakarvojen korjaus','brow'],
  ['en','Do you install lash extensions?','Ripsienpidennysten asennus','lash'],
  ['fi','Tarjoatteko hierontaa?','Hierontapalvelu','massage'],
  ['fi','Teettekö juurihoitoja?','Juurihoito','canal'],
  ['en','Do you repair dental fillings?','Hampaan paikkauksen korjaus','filling'],
];
test('18 precise professional services resolve from Finnish facts in FI SV EN',()=>{
  for(const [lang,question,serviceName,id] of documented){
    const result=industryServiceAnswer([service(id,serviceName)],question,lang);
    assert.equal(result?.handoff,false,question+': '+JSON.stringify(result));
    assert.deepEqual(result.sourceIds,[id],question);
  }
});
test('technical overlap never conflates unrelated work or adjacent procedures',()=>{
  for(const [lang,question,serviceName] of [
    ['en','Do you replace brake pads?','Jarrunesteen vaihto'],
    ['sv','Byter ni tänder?','Sytytystulppien vaihto'],
    ['en','Do you replace cabin air filters?','Polttoainesuodattimen vaihto'],
    ['en','Do you clean solar panels?','Aurinkopaneelien asennus'],
    ['en','Can you install charging stations?','Auton akun vaihto'],
    ['fi','Avaatteko viemäreitä?','Viemärin puhdistus'],
    ['fi','Vaihdatteko jarrunesteet?','Jarrupalojen vaihto'],
    ['en','Do you install lash extensions?','Hiustenleikkaus'],
    ['fi','Teettekö juurihoitoja?','Hampaan paikkauksen korjaus'],
    ['en','Do you replace wheel bearings?','Renkaiden vaihto'],
  ]){
    const result=industryServiceAnswer([service('other',serviceName)],question,lang);
    assert.notEqual(result?.handoff,false,question+': '+JSON.stringify(result));
  }
});
test('approved evidence is mandatory and contradictions are never guessed',()=>{
  const q='Do you replace wheel bearings?';
  const yes=service('yes','Pyöränlaakerien vaihto');
  const no=service('no','Pyöränlaakerien vaihto',{answer:'Emme vaihda pyöränlaakereita.'});
  assert.equal(industryServiceAnswer([yes,no],q,'en').handoff,true);
  assert.equal(industryServiceAnswer([yes],q,'en').handoff,false);
  assert.equal(industryServiceAnswer([service('draft','Pyöränlaakerien vaihto',{approved:false})],q,'en').handoff,true);
  assert.equal(industryServiceAnswer([service('product','Pyöränlaakerien vaihto',{category:'Tuotteet'})],q,'en').handoff,true);
});
test('indirect questions retain explicit action and subject without inventing a fact',()=>{
  for(const [lang,q,canonical] of [
    ['en','Could I get wheel bearings replaced?','Do you replace wheel bearings?'],
    ['sv','Kan jag få tändstift bytta?','Byter ni tandstift?'],
    ['fi','Voiko latausaseman asentaa?','Asennatteko latausaseman?'],
  ]){
    assert.equal(canonicalProfessionalServiceQuestion(q,lang),canonical);
  }
});
test('website validation retains concrete exact trade service names, not generic headings',()=>{
  for(const name of [
    'Pyöränlaakerien vaihto','Sytytystulppien vaihto',
    'Polttoainesuodattimen vaihto','Latausaseman asennus',
    'Lattialämmityksen asennus','Terassien rakentaminen'
  ]){
    assert.equal(isConcreteServiceLabel(name),true,name);
    assert.equal(usableWebsiteRow(service('test',name)),true,name);
  }
  assert.equal(isConcreteServiceLabel('Palvelut'),false);
  assert.equal(isConcreteServiceLabel('Tutustu palveluihin'),false);
  assert.equal(isConcreteServiceLabel('Paras palvelu ikinä'),false);
});
test('end-to-end: imported Finnish auto facts support Swedish and English questions',async()=>{
  const rows=[service('bear','Pyöränlaakerien vaihto'),service('spark','Sytytystulppien vaihto')];
  for(const [lang,message,id] of [
    ['en','Do you replace wheel bearings?','bear'],
    ['sv','Byter ni tändstift?','spark']
  ]){
    const result=await generateGroundedAnswer({rows,message,lang});
    assert.equal(result.handoff,false,message+': '+JSON.stringify(result));
    assert.deepEqual(result.sourceIds,[id],message);
  }
});
test('end-to-end: new electrical job does not borrow evidence from unrelated electrical repairs',async()=>{
  const q='Can you install charging stations?';
  const missing=await generateGroundedAnswer({rows:[service('socket','Pistorasioiden asennus')],message:q,lang:'en'});
  assert.equal(missing.handoff,true,JSON.stringify(missing));
  const verified=await generateGroundedAnswer({rows:[service('charger','Latausasemien asennus')],message:q,lang:'en'});
  assert.equal(verified.handoff,false,JSON.stringify(verified));
  assert.deepEqual(verified.sourceIds,['charger']);
});
test('end-to-end: a plumbing company offering drain cleaning is not automatically a drain unblocking service',async()=>{
  const q='Avaatteko viemäreitä?';
  const cleaning=await generateGroundedAnswer({rows:[service('clean','Viemärin puhdistus')],message:q,lang:'fi'});
  assert.equal(cleaning.handoff,true,JSON.stringify(cleaning));
  const unblocking=await generateGroundedAnswer({rows:[service('unblock','Viemärin avaus')],message:q,lang:'fi'});
  assert.equal(unblocking.handoff,false,JSON.stringify(unblocking));
  assert.deepEqual(unblocking.sourceIds,['unblock']);
});

test('end-to-end: strict specialist intent cannot borrow a nearby service just because the verb matches',async()=>{
  for(const [language,question,unrelated,verified] of [
    ['en','Can you install charging stations?','Pistorasioiden asennus','Latausasemien asennus'],
    ['en','Do you clean solar panels?','Aurinkopaneelien asennus','Aurinkopaneelien puhdistus'],
    ['fi','Vaihdatteko jarrunesteet?','Jarrupalojen vaihto','Jarrunesteen vaihto'],
    ['en','Do you replace fuel filters?','Raitisilmasuodattimen vaihto','Polttoainesuodattimen vaihto'],
    ['en','Do you replace wheel bearings?','Renkaiden vaihto','Pyöränlaakerien vaihto']
  ]){
    const absent=await generateGroundedAnswer({
      rows:[service('other',unrelated)],lang:language,message:question
    });
    assert.equal(absent.handoff,true,question+': '+JSON.stringify(absent));
    assert.deepEqual(absent.sourceIds,[],question);
    const present=await generateGroundedAnswer({
      rows:[service('exact',verified)],lang:language,message:question
    });
    assert.equal(present.handoff,false,question+': '+JSON.stringify(present));
    assert.deepEqual(present.sourceIds,['exact'],question);
  }
});
