import test from 'node:test';
import assert from 'node:assert/strict';
import {dateISO,exceptionQueryDate,branchExceptionFacts,answerBranchException} from '../branch-exceptions.mjs';
import {extractStoreAvailability,storeAvailabilityAnswer} from '../store-availability.mjs';

const fixed=new Date('2026-10-31T10:00:00.000Z');
const exception=(branch,date,info,id=branch)=>({
  id,category:'Poikkeusaukioloajat',title:'Poikkeusaukioloajat: '+branch,
  answer:date+': '+info
});
const turku=exception('Turku','2026-11-01','10:00 - 16:00','turku');
const raisio=exception('Raisio','2026-11-01','suljettu','raisio');

test('validates actual Gregorian calendar dates',()=>{
  assert.equal(dateISO('2026-02-29'),'');
  assert.equal(dateISO('2024-02-29'),'2024-02-29');
  assert.equal(dateISO('31.11.2026'),'');
  assert.equal(dateISO('01.11.2026'),'2026-11-01');
});
test('tomorrow is the next local calendar date on the autumn DST transition',()=>{
  // 2026-10-24 21:30 UTC is 2026-10-25 00:30 in Helsinki.
  assert.equal(exceptionQueryDate('Huomenna',new Date('2026-10-24T21:30:00Z')),'2026-10-26');
  assert.equal(exceptionQueryDate('Tomorrow',new Date('2026-10-24T21:30:00Z')),'2026-10-26');
});
test('tomorrow advances correctly across spring DST and year boundary',()=>{
  assert.equal(exceptionQueryDate('imorgon',new Date('2026-03-28T22:30:00Z')),'2026-03-30');
  assert.equal(exceptionQueryDate('huomenna',new Date('2026-12-31T18:00:00Z')),'2027-01-01');
});
test('today uses Helsinki, not host UTC day',()=>{
  assert.equal(exceptionQueryDate('tänään',new Date('2026-10-30T22:30:00Z')),'2026-10-31');
});
test('explicit date overrides relative date',()=>{
  assert.equal(exceptionQueryDate('huomenna 2.11.2026',fixed),'2026-11-02');
});
test('returns only verified exception for selected branch',()=>{
  const result=answerBranchException({rows:[turku,raisio],message:'Onko Turun myymälä huomenna auki?',now:fixed});
  assert.match(result.answer,/Turku.*10:00 - 16:00/);
  assert.deepEqual(result.sourceIds,['turku']);
});
test('works for closed branch in English',()=>{
  const result=answerBranchException({rows:[turku,raisio],message:'Is Raisio open tomorrow?',lang:'en',now:fixed});
  assert.match(result.answer,/Raisio.*closed/);
  assert.deepEqual(result.sourceIds,['raisio']);
});
test('does not invent a branch when no branch is selected',()=>{
  assert.equal(answerBranchException({rows:[turku,raisio],message:'Oletteko huomenna auki?',now:fixed}),null);
});
test('does not select multiple branches when user mentions both',()=>{
  assert.equal(answerBranchException({rows:[turku,raisio],message:'Onko Turku ja Raisio huomenna auki?',now:fixed}),null);
});
test('does not confuse delivery tomorrow with opening hours',()=>{
  assert.equal(answerBranchException({rows:[turku],message:'Toimitatteko huomenna tuotteita Turkuun?',now:fixed}),null);
});
test('inherits explicitly selected location from an opening-hours conversation',()=>{
  const history=[
    {question:'Miten Turun myymälä on auki?',answer:'Turku: ma-pe 08–20.'},
    {question:'Entä tänään?',answer:'Turku: auki 08–20.'}
  ];
  const result=answerBranchException({rows:[turku,raisio],message:'Entä huomenna?',history,now:fixed});
  assert.match(result.answer,/Turku.*10:00/);
});
test('refuses conflicting exception facts for same branch and date',()=>{
  const conflict=exception('Turku','2026-11-01','suljettu','other');
  assert.equal(answerBranchException({rows:[turku,conflict],message:'Onko Turku huomenna auki?',now:fixed}),null);
});
test('allows identical exception facts with multiple citations',()=>{
  const duplicate=exception('Turku','2026-11-01','10:00 - 16:00','other');
  const result=answerBranchException({rows:[turku,duplicate],message:'Onko Turku huomenna auki?',now:fixed});
  assert.deepEqual(result.sourceIds,['turku','other']);
});
test('extracts explicit exception only from location-scoped page',()=>{
  const doc={url:'https://example.test/toimipisteet/turku',blocks:[
    {heading:'Poikkeusaukioloajat',text:'2026-11-01: 10:00 - 16:00'}
  ]};
  assert.equal(branchExceptionFacts(doc)[0].answer,'2026-11-01: 10:00 - 16:00');
});
test('generic homepage cannot create branch exception facts',()=>{
  const doc={url:'https://example.test/',blocks:[
    {heading:'Poikkeusaukioloajat',text:'2026-11-01: 10:00 - 16:00'}
  ]};
  assert.deepEqual(branchExceptionFacts(doc),[]);
});

const source='https://shop.example/products/jag-headcover';
const entry=(name,store,availability,id=store)=>({
  id,category:'Myymäläsaatavuus',title:'Myymäläsaatavuus: '+name+' – '+store,
  answer:availability,source_url:source
});
const inStock='Sivuston mukaan varastossa.';
const outOfStock='Sivuston mukaan ei varastossa.';
const turkuHeadcover=entry('JAG Headcover','Turku',inStock,'t');
const raisioHeadcover=entry('JAG Headcover','Raisio',outOfStock,'r');
function jsonLd(offers){
  return '<script type="application/ld+json">'+JSON.stringify({
    '@type':'Product',name:'JAG Headcover',url:source,offers
  })+'</script>';
}
const offer=(name,availability)=>({
  availability:'https://schema.org/'+availability,
  availableAtOrFrom:{name}
});

test('extracts store-specific in-stock and out-of-stock records',()=>{
  const found=extractStoreAvailability(jsonLd([
    offer('Turku','InStock'),offer('Raisio','OutOfStock')
  ]),source);
  assert.equal(found.length,2);
  assert.ok(found.some(x=>x.title.includes('Raisio')&&x.answer.includes('ei varastossa')));
});
test('does not publish conflicting JSON-LD offers for same store',()=>{
  const found=extractStoreAvailability(jsonLd([
    offer('Turku','InStock'),offer('Turku','OutOfStock')
  ]),source);
  assert.deepEqual(found,[]);
});
test('deduplicates identical offers',()=>{
  const found=extractStoreAvailability(jsonLd([
    offer('Turku','InStock'),offer('Turku','InStock')
  ]),source);
  assert.equal(found.length,1);
});
test('rejects unverified availability in JSON-LD',()=>{
  assert.deepEqual(extractStoreAvailability(jsonLd([
    offer('Turku','PreOrder')
  ]),source),[]);
});
test('asks the store rather than guessing stock',()=>{
  const response=storeAvailabilityAnswer([turkuHeadcover,raisioHeadcover],
    'Onko JAG Headcoveria varastossa?');
  assert.match(response.answer,/Minkä myymälän/);
  assert.deepEqual(response.branchChoices,['Turku','Raisio']);
});
test('answers Finnish product inflections for a selected branch',()=>{
  const response=storeAvailabilityAnswer([turkuHeadcover,raisioHeadcover],
    'Onko JAG Headcoveria varastossa Turun myymälässä?');
  assert.match(response.answer,/Turku.*varastossa/);
  assert.deepEqual(response.sourceIds,['t']);
});
test('resolves branch-only follow-up after location question',()=>{
  const history=[{question:'Onko JAG Headcoveria varastossa?',answer:'Minkä myymälän saatavuuden haluat tarkistaa?'}];
  const response=storeAvailabilityAnswer([turkuHeadcover,raisioHeadcover],'Raisio',history);
  assert.match(response.answer,/Raisio.*ei varastossa/);
  assert.deepEqual(response.sourceIds,['r']);
});
test('discloses non-real-time stock source in English',()=>{
  const response=storeAvailabilityAnswer([turkuHeadcover],
    'Is JAG Headcover in stock in Turku?',[],'en');
  assert.match(response.answer,/not a real-time stock check/i);
});
test('does not turn an unknown row answer into an in-stock claim',()=>{
  const broken=entry('JAG Headcover','Turku','Availability unknown','broken');
  const response=storeAvailabilityAnswer([broken],'Is JAG Headcover in stock in Turku?',[],'en');
  assert.equal(response.handoff,true);
  assert.deepEqual(response.sourceIds,[]);
  assert.doesNotMatch(response.answer,/listed as in stock/);
});
test('does not choose from contradictory imported stock facts',()=>{
  const conflict=entry('JAG Headcover','Turku',outOfStock,'conflict');
  const response=storeAvailabilityAnswer([turkuHeadcover,conflict],
    'Onko JAG Headcover varastossa Turussa?');
  assert.equal(response.handoff,true);
  assert.deepEqual(response.sourceIds,[]);
});
test('deduplicates consistent imported stock facts with sources',()=>{
  const duplicate=entry('JAG Headcover','Turku',inStock,'dup');
  const response=storeAvailabilityAnswer([turkuHeadcover,duplicate],
    'Onko JAG Headcover Turussa varastossa?');
  assert.equal(response.handoff,false);
  assert.deepEqual(response.sourceIds,['t','dup']);
});
test('does not misattribute different branch stock levels',()=>{
  const response=storeAvailabilityAnswer([turkuHeadcover,raisioHeadcover],
    'Onko JAG Headcover Raisiossa varastossa?');
  assert.match(response.answer,/Raisio.*ei varastossa/);
  assert.doesNotMatch(response.answer,/Turku/);
});
test('refuses ambiguous similar products at one branch',()=>{
  const other=entry('JAG Headcover Pro','Turku',outOfStock,'other');
  assert.equal(storeAvailabilityAnswer([turkuHeadcover,other],
    'Onko JAG Headcover Turussa varastossa?'),null);
});
