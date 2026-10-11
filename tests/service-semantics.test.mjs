import test from 'node:test';
import assert from 'node:assert/strict';
import { matchVerifiedSpecialistService, matchVerifiedCompoundSpecialistServices } from '../service-semantics.mjs';

const service = (title, answer=title, id='verified-1', category='Palvelut') =>
  ({id, title, answer, category, approved:true});
const ask=(message,rows,lang='fi',history=[]) =>
  matchVerifiedSpecialistService({message,rows,lang,history});

test('Finnish inflections and compound words find only verified specialist services',()=>{
  const rows=[service('Raidetangonpään vaihto')];
  const out=ask('Vaihdatteko raidetangon päitä?',rows);
  assert.equal(out.handoff,false);
  assert.match(out.answer,/raidetangon päitä/);
  assert.deepEqual(out.sourceIds,['verified-1']);
});
test('Swedish and English name the same verified service without translation API',()=>{
  const rows=[service('Raidetangonpään vaihto')];
  assert.match(ask('Kan ni byta styrleder?',rows,'sv').answer,/byter styrleder/);
  assert.match(ask('Can you replace tie rod ends?',rows,'en').answer,/replace tie rod ends/);
  assert.equal(ask('Fixar ni styrleder?',rows,'sv').handoff,false);
});
test('does not infer a specific repair from a generic workshop heading',()=>{
  const rows=[service('Alustan ja ohjausjärjestelmän korjaus')];
  const out=ask('Vaihdatteko raidetangon päitä?',rows);
  assert.equal(out.handoff,true);
  assert.equal(out.sourceIds.length,0);
});
test('does not treat part replacement, repair, and puncture patching as equivalent',()=>{
  const rows=[service('Renkaiden vaihto'),service('Raidetangonpään vaihto')];
  assert.equal(ask('Paikkaatteko renkaita?',rows).handoff,true);
  assert.equal(ask('Korjaatteko raidetangon päitä?',rows),null);
});
test('tyre patching is understood in Finnish, Swedish and English',()=>{
  const rows=[service('Renkaiden paikkaus')];
  for(const [question,lang] of [
    ['Paikkaatteko renkaita?','fi'],
    ['Kan ni laga punkterade däck?','sv'],
    ['Do you repair tyre punctures?','en'],
  ]) assert.equal(ask(question,rows,lang)?.handoff,false,question);
});
test('car battery requires a car-specific evidence, not any battery replacement',()=>{
  assert.equal(ask('Vaihdatteko auton akkuja?',[service('Puhelimien akkujen vaihto')]).handoff,true);
  assert.equal(ask('Vaihdatteko auton akkuja?',[service('Auton akun vaihto')]).handoff,false);
});
test('negative evidence and contradictory rows do not produce affirmative claims',()=>{
  assert.equal(ask('Vaihdatteko jarrupaloja?',[service('Emme tee jarrupalojen vaihtoja')]).handoff,false);
  assert.match(ask('Do you replace brake pads?',[service('Emme tee jarrupalojen vaihtoja')],'en').answer,/not offered/);
  const conflicting=[service('Jarrupalojen vaihto'),service('Emme tee jarrupalojen vaihtoja','Emme tee jarrupalojen vaihtoja','no')];
  assert.equal(ask('Vaihdatteko jarrupaloja?',conflicting).handoff,true);
});
test('questions on price or time remain with existing price/schedule pipelines',()=>{
  const rows=[service('Raidetangonpään vaihto')];
  assert.equal(ask('Paljonko raidetangon pään vaihto maksaa?',rows),null);
  assert.equal(ask('Can you replace tie rod ends tomorrow?',rows,'en'),null);
});
test('multi-service questions are not silently answered from one service',()=>{
  const rows=[service('Raidetangonpään vaihto')];
  assert.equal(ask('Vaihdatteko raidetangon päät ja jarrupalat?',rows),null);
});
test('product listings and customer reviews are never service confirmations',()=>{
  const rows=[service('Raidetangonpään vaihto','Saatavilla nyt','product','Tuotteet')];
  assert.equal(ask('Vaihdatteko raidetangon päitä?',rows).handoff,true);
});
test('follow-ups can inherit previous action but not previous unrelated subject',()=>{
  const rows=[service('Jarrupalojen vaihto'),service('Raidetangonpään vaihto')];
  const history=[{question:'Vaihdatteko jarrupaloja?',answer:'Kyllä.'}];
  assert.equal(ask('Entä raidetangon päät?',rows,'fi',history).handoff,false);
});
test('tenant isolation: other companies facts cannot be consulted',()=>{
  assert.equal(ask('Vaihdatteko jarrupaloja?',[]).handoff,true);
});

test('approved owner FAQ can verify a service but its question alone cannot',()=>{
  const positive=[service('Vaihdatteko raidetangon päitä?','Kyllä, vaihdamme.','faq','Usein kysytyt kysymykset')];
  assert.equal(ask('Do you replace tie rod ends?',positive,'en').handoff,false);
  const uncertain=[service('Vaihdatteko raidetangon päitä?','Ota yhteyttä lisätietoja varten.','faq','Usein kysytyt kysymykset')];
  assert.equal(ask('Do you replace tie rod ends?',uncertain,'en').handoff,true);
  const negative=[service('Vaihdatteko raidetangon päitä?','Ei, emme vaihda.','faq','Usein kysytyt kysymykset')];
  assert.match(ask('Do you replace tie rod ends?',negative,'en').answer,/not offered/);
});
test('selling a car battery and servicing one are different intents',()=>{
  const rows=[service('Auton akun vaihto')];
  assert.equal(ask('Do you sell car batteries?',rows,'en'),null);
  assert.equal(ask('Do you charge car batteries?',rows,'en'),null);
  assert.equal(ask('Do you replace car batteries?',rows,'en').handoff,false);
});
test('do not make a partial affirmative claim for services joined with and',()=>{
  const rows=[service('Ikkunanpesu')];
  assert.equal(ask('Pesettekö ikkunat ja aurinkopaneelit?',rows),null);
});


const askCompound=(message,rows,lang='fi') =>
  matchVerifiedCompoundSpecialistServices({message,rows,lang});

test('service FAQ question is not itself positive evidence',()=>{
  const uncertain=[service('Vaihdatteko jarrupaloja?','Kysy lisää puhelimitse.','uncertain','Palvelut')];
  const result=ask('Vaihdatteko jarrupaloja?',uncertain);
  assert.equal(result.handoff,true);
  assert.equal(result.sourceIds.length,0);
});
test('a service heading never overrides an explicit negative answer',()=>{
  const refused=[service('Jarrupalojen vaihto','Emme tee tätä työtä.','no','Palvelut')];
  const result=ask('Vaihdatteko jarrupaloja?',refused);
  assert.equal(result.handoff,false);
  assert.match(result.answer,/ei tarjota/);
  assert.deepEqual(result.sourceIds,['no']);
});
test('a direct negative FAQ reply takes precedence even in service category',()=>{
  const refused=[service('Vaihdatteko raidetangon päitä?','Ei, emme tee tätä.','no','Palvelut')];
  assert.match(ask('Vaihdatteko raidetangon päitä?',refused).answer,/ei tarjota/);
});
test('compound specialist services are independently grounded in all languages',()=>{
  const rows=[
    service('Jarrupalojen vaihto','Jarrupalojen vaihto','brakes'),
    service('Raidetangonpään vaihto','Raidetangonpään vaihto','rods'),
  ];
  for(const [lang,question] of [
    ['fi','Vaihdatteko jarrupaloja ja raidetangon päitä?'],
    ['sv','Byter ni bromsbelägg och styrleder?'],
    ['en','Do you replace brake pads and tie rod ends?'],
  ]){
    const result=askCompound(question,rows,lang);
    assert.ok(result,question);
    assert.equal(result.handoff,false,question);
    assert.deepEqual(result.sourceIds,['brakes','rods'],question);
    assert.match(result.answer,/^1\. /);
    assert.match(result.answer,/\n2\. /);
  }
});
test('a multi-service request never treats one service as proof of the other',()=>{
  const result=askCompound(
    'Vaihdatteko jarrupaloja ja raidetangon päitä?',
    [service('Jarrupalojen vaihto','Jarrupalojen vaihto','brakes')]
  );
  assert.ok(result);
  assert.equal(result.handoff,true);
  assert.deepEqual(result.sourceIds,['brakes']);
  assert.match(result.answer,/vahvistusta raidetangon/);
  assert.match(result.answer,/Kyllä, vaihdamme jarrupaloja/);
});
test('compound service is precise when one part is refused',()=>{
  const result=askCompound('Do you replace brake pads and tie rod ends?',[
    service('Jarrupalojen vaihto','Jarrupalojen vaihto','brakes'),
    service('Raidetangonpään vaihto','Emme tee tätä työtä.','rods')
  ],'en');
  assert.equal(result.handoff,false);
  assert.deepEqual(result.sourceIds,['brakes','rods']);
  assert.match(result.answer,/not offered/);
});
test('do not split technical questions with two same or unknown subjects',()=>{
  assert.equal(askCompound('Vaihdatteko jarrupaloja ja jarrulevyjä?',[]),null);
  assert.equal(askCompound('Vaihdatteko raidetangon päitä ja raidetangon päitä?',[]),null);
  assert.equal(askCompound('Paljonko jarrupalojen ja raidetangon päiden vaihto maksaa?',[]),null);
});
test('compound question cannot consult knowledge from another company',()=>{
  const result=askCompound('Vaihdatteko jarrupaloja ja raidetangon päitä?',[]);
  assert.ok(result);
  assert.equal(result.handoff,true);
  assert.deepEqual(result.sourceIds,[]);
});

test('a generic mechanic service does not prove compatibility with a named vehicle',()=>{
  const rows=[service('Car battery replacement','Car battery replacement','battery')];
  const q='Do you replace car batteries in a Tesla?';
  const answer=ask(q,rows,'en');
  assert.equal(answer.handoff,true);
  assert.deepEqual(answer.sourceIds,[]);
  assert.doesNotMatch(answer.answer,/^Yes/);
});
test('specific vehicle compatibility is supported only by explicit approved evidence',()=>{
  const rows=[service('Tesla car battery replacement','Tesla car battery replacement','battery')];
  const result=ask('Do you replace car batteries in a Tesla?',rows,'en');
  assert.equal(result.handoff,false);
  assert.deepEqual(result.sourceIds,['battery']);
});
test('a specialist brake service does not imply every manufacturer',()=>{
  const generic=[service('Jarrupalojen vaihto','Jarrupalojen vaihto','brakes')];
  assert.equal(ask('Do you replace brake pads for Toyota?',generic,'en').handoff,true);
  const exact=[service('Toyota brake pad replacement','Toyota brake pad replacement','toyota')];
  assert.equal(ask('Do you replace brake pads for Toyota?',exact,'en').handoff,false);
});
test('combined specialist questions verify named-vehicle work independently',()=>{
  const facts=[
    service('Tesla car battery replacement','Tesla car battery replacement','tesla'),
    service('Jarrupalojen vaihto','Jarrupalojen vaihto','brakes'),
  ];
  const q='Do you replace car batteries for Tesla and brake pads?';
  const result=askCompound(q,facts,'en');
  assert.ok(result);
  assert.equal(result.handoff,false);
  assert.deepEqual(result.sourceIds,['tesla','brakes']);
  const missing=askCompound(q,[facts[1]],'en');
  assert.ok(missing);
  assert.equal(missing.handoff,true);
  assert.deepEqual(missing.sourceIds,['brakes']);
});
