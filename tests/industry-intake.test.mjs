import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceIndustryIntake } from '../industry-intake.mjs';

const serviceRows = [
  {title:'Ikkunanpesu',answer:'Ikkunanpesu yrityksille ja kotitalouksille.'},
  {title:'Bilverkstad och oljebyte',answer:'Vi erbjuder oljebyte.'},
  {title:'Moving service',answer:'Local moving service for homes.'},
];
const step = (message,language='fi',previous,topic) => advanceIndustryIntake({
  message,language,previous,topic,serviceRows,hasCatalog:true
});

test('Finnish cleaning quote skips supplied scope, quantity and time, then asks confirmation',()=>{
  const first=step('Haluaisin tarjouksen 12 ikkunan pesusta ensi tiistaina.');
  assert.equal(first.state.stage,'review');
  assert.match(first.answer,/12 ikkunan/);
  assert.match(first.answer,/ensi tiistaina/);
  assert.equal(first.summary,undefined);

  const corrected=step('Tarkoitin 20 ikkunaa, ensi perjantaina klo 15.', 'fi', first.state);
  assert.equal(corrected.state.stage,'review');
  assert.match(corrected.answer,/20 ikkunaa/);
  assert.match(corrected.answer,/ensi perjantaina klo 15/);
  assert.doesNotMatch(corrected.answer,/12 ikkunan|tiistaina/);
  assert.equal(corrected.summary,undefined);

  const confirmed=step('Kyllä', 'fi', corrected.state);
  assert.equal(confirmed.state.stage,'confirmed');
  assert.match(confirmed.summary,/Tarjouspyyntö/);
  assert.match(confirmed.summary,/20 ikkunaa/);
  assert.doesNotMatch(confirmed.answer,/varaus.*vahvistettu|lähetetty/);
});

test('Swedish workshop request asks only for unknown vehicle data',()=>{
  const first=step('Jag vill boka oljebyte på fredag.', 'sv');
  assert.equal(first.state.pending,'vehicle');
  assert.match(first.answer,/märke, vilken modell/i);
  const second=step('Toyota Corolla 2018', 'sv', first.state);
  assert.equal(second.state.stage,'review');
  assert.match(second.answer,/Toyota Corolla 2018/);
  assert.match(second.answer,/Oljebyte|oljebyte/);
  assert.match(second.answer,/fredag/);
  assert.equal(step('Det stämmer', 'sv', second.state).state.stage,'confirmed');
});

test('English moving request carries locations and date while asking about the size',()=>{
  const first=step('I need a quote for moving from Turku to Tampere next Monday.', 'en');
  assert.equal(first.state.pending,'load');
  assert.match(first.answer,/How big is the move/);
  const second=step('3 rooms', 'en', first.state);
  assert.equal(second.state.stage,'review');
  assert.match(second.answer,/Turku → Tampere/);
  assert.match(second.answer,/3 rooms/);
  assert.match(second.answer,/next Monday/);
});

test('retail intake follows customer language and stops before asserting stock',()=>{
  const first=step('Could you help me choose an outdoor jacket under 100 euros.', 'en');
  assert.equal(first.state.stage,'review');
  assert.match(first.answer,/outdoor jacket/);
  assert.match(first.answer,/under 100 euros/);
  const confirmed=step('Kylla', 'fi', first.state);
  assert.equal(confirmed.state.stage,'confirmed');
  assert.match(confirmed.answer,/Voit nyt jättää yhteystietosi/);
  assert.doesNotMatch(confirmed.summary,/varastossa|saatavilla/);
});

test('ordinary questions, unsupported services, or a denied capability cannot start intake',()=>{
  assert.equal(step('Paljonko ikkunanpesu maksaa?'),null);
  assert.equal(step('I am looking for the blue Rainy jacket.', 'en'),null);
  assert.equal(step('Mikä on tarjouspyynnön tila ikkunanpesulle?'),null);
  assert.equal(step('En halua pyytää tarjousta ikkunanpesusta.'),null);
  assert.equal(advanceIndustryIntake({message:'I want a quote for window cleaning.',language:'en',
    serviceRows:[{title:'Window cleaning',answer:'We do not offer window cleaning.'}]}),null);
  assert.equal(advanceIndustryIntake({message:'I am looking for a bag.',language:'en',serviceRows:[]}),null);
});

test('no-contact paths clear or revise the request and never mark a lead ready',()=>{
  const first=step('I would like a quote for moving from Turku to Tampere next Monday.', 'en');
  assert.equal(step('What are your opening hours?', 'en', first.state,'hours'),null);
  assert.equal(step('Cancel', 'en', first.state).state.stage,'cancelled');
  assert.equal(step('Yes', 'en', first.state).state.pending,'load');

  const review=step('3 rooms','en',first.state);
  const revision=step('No','en',review.state);
  assert.equal(revision.state.stage,'revision');
  assert.equal(revision.summary,undefined);
  const revised=step('Actually, Friday','en',revision.state);
  assert.equal(revised.state.stage,'review');
  assert.match(revised.answer,/Friday/);
  assert.doesNotMatch(revised.answer,/Monday/);
});

test('property maintenance intake handles three additional approved trades', () => {
  for (const [language,message,title] of [
    ['fi','Haluaisin tarjouksen putkitöistä ensi maanantaina.','Putkityöt'],
    ['sv','Jag vill ha en offert för målning nästa vecka.','Målning'],
    ['en','I need a quote for lawn mowing next Friday.','Lawn mowing']
  ]) {
    const serviceRows = [{title,answer:title}];
    assert.equal(advanceIndustryIntake({language,message,serviceRows:[]}),null);
    const request = advanceIndustryIntake({language,message,serviceRows});
    assert.equal(request.state.pending,'site');
    assert.equal(advanceIndustryIntake({language,message:'120 m2',serviceRows,previous:request.state}).state.stage,'review');
  }
});
