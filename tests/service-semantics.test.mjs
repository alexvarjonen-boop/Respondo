import test from 'node:test';
import assert from 'node:assert/strict';
import { matchVerifiedSpecialistService } from '../service-semantics.mjs';

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

test('specialist layer leaves roof subtypes and windows to established resolvers',()=>{
  for(const q of ['Pesettekö kattoja?','Pesettekö peltikattoja?','Onnistuuko ikkunanpesu?','Entä ikkunanpesu?']){
    assert.equal(ask(q,[service('Peltikattojen pesu'),service('Ikkunanpesu')]),null,q);
  }
});
