import test from 'node:test';
import assert from 'node:assert/strict';
import { credibleServiceName, verifiedServiceOverview, serviceOverviewQuestion } from '../service-overview.mjs';
import { generateGroundedAnswer } from '../server.mjs';
import { extractBusinessDocument, essentialWebsiteCandidates } from '../website-knowledge.mjs';

const row=(answer,path='/palvelut/',source_type='website')=>({
  id:answer,source_type,source_url:'https://example.fi'+path,
  category:'Palvelut',title:'Palvelut: '+answer,answer,keywords:['palvelut']
});

test('broad questions are recognized but specific service questions are not intercepted',()=>{
  for(const q of ['Mitä teette?', 'Mitä palveluja tarjoatte?', 'What do you do?', 'Vad gör ni?']){
    assert.equal(serviceOverviewQuestion(q),true,q);
  }
  for(const q of ['Teettekö purkutöitä?', 'Paljonko purkutyöt maksavat?', 'Milloin teette purkutyöt?', 'Onko betonimursketta?']){
    assert.equal(serviceOverviewQuestion(q),false,q);
  }
});

test('service evidence excludes staff, project stories and recruitment even from legacy knowledge',()=>{
  const noisy=[
    row('Purkupiha järjesti talontyhjennystempauksia Vaasassa','/'),
    row('Purkupiha toteutti vaativan teollisuuspurun Seinäjoen tehtaalla','/'),
    row('Liiketoimintapäällikkö, Kierrätyspalvelut ja betonimurske','/'),
    row('Aluepäällikkö, purkutyöt','/'),
    row('Tarjouslaskenta, rakennusten purkutyöt','/'),
    row('Asbesti- ja haitta-ainekartoitus','/ajankohtaista/case-study/')
  ];
  for(const n of noisy.slice(0,5)) assert.equal(credibleServiceName(n.answer), '', n.answer);
  // A real service name is still valid text, but a news-page URL cannot prove it.
  assert.equal(credibleServiceName(noisy[5].answer),noisy[5].answer);
  const actual=[
    row('Asbesti- ja haitta-ainekartoitus','/palvelut/kartoitus/'),
    row('Asbesti- ja haitta-ainepurku','/palvelut/asbesti/'),
    row('Rakennusten kokonaispurku','/palvelut/kokonaispurku/'),
    row('Kierrätyspalvelut','/kierratys/'),
  ];
  const result=verifiedServiceOverview([...noisy,...actual],{lang:'fi'});
  assert.ok(result);
  assert.deepEqual(result.names,actual.map(x=>x.answer));
  assert.doesNotMatch(result.answer,/Purkupiha|päällikkö|tarjouslaskenta|tehtaalla/i);
});

test('manual approved service list wins and deduplicates website links',()=>{
  const rows=[
    row('Saneerauspurku','/palvelut/saneerauspurku/'),
    {id:'manual',source_type:'profile',category:'Yrityksen perustiedot',title:'Palvelut',
      answer:'Saneerauspurku, Rakennusten kokonaispurku, Asbesti- ja haitta-ainekartoitus'},
  ];
  const result=verifiedServiceOverview(rows,{lang:'fi'});
  assert.ok(result);
  assert.equal(result.names.filter(x=>x==='Saneerauspurku').length,1);
  assert.equal(result.names[0],'Saneerauspurku');
  assert.equal(result.names.length,3);
});

test('end-to-end company overview is a short, clean, evidence-only answer',async()=>{
  const rows=[
    row('Purkupiha järjestettiin talkoot Vaasassa','/'),
    row('Toimialapäällikkö, asbestipurku','/'),
    row('Asbesti- ja haitta-ainekartoitus','/palvelut/asbesti/'),
    row('Rakennusten kokonaispurku','/palvelut/purku/'),
    row('Saneerauspurku','/palvelut/saneeraus/')
  ];
  const result=await generateGroundedAnswer({rows,message:'mitä teette',lang:'fi'});
  assert.equal(result.handoff,false,JSON.stringify(result));
  assert.match(result.answer,/Rakennusten kokonaispurku/);
  assert.doesNotMatch(result.answer,/talkoot|päällikkö|Vaasassa/i);
  assert.ok(result.answer.length<300);
  assert.equal(result.selected.every(r=>rows.includes(r)),true);
});

test('unsupported business offerings are never fabricated',async()=>{
  const result=await generateGroundedAnswer({rows:[
    row('Yritys järjesti huoltopäivän Tampereella','/uutiset/huoltopaiva')
  ],message:'mitä teette',lang:'fi'});
  assert.equal(result.handoff,true);
});

test('language framing is localized without mixing the wrong company data',()=>{
  const rows=[row('Asbesti- ja haitta-ainekartoitus','/palvelut/asbesti/')];
  const en=verifiedServiceOverview(rows,{lang:'en'});
  const sv=verifiedServiceOverview(rows,{lang:'sv'});
  assert.match(en.answer,/^We offer services such as /);
  assert.match(sv.answer,/^Vi erbjuder bland annat /);
});

test('named unsupported services do not match an unrelated category-only row',async()=>{
  const rows=[
    row('Ikkunanpesu','/palvelut/ikkunanpesu/'),
    row('Katonpesu','/palvelut/katonpesu/'),
  ];
  for(const question of ['Asennatteko latausasemia?', 'Korjaatteko auton pakoputkia?']){
    const result=await generateGroundedAnswer({rows,message:question,lang:'fi'});
    assert.equal(result.handoff,true,question+' '+JSON.stringify(result));
    assert.doesNotMatch(result.answer||'',/ikkuna|katonpesu/i);
  }
});
