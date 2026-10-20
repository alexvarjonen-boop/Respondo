import test from 'node:test';
import assert from 'node:assert/strict';
import {generateGroundedAnswer, respondoProductFaqMatch} from '../server.mjs';

test('Respondo answers what do you do in Finnish, English and Swedish',()=>{
  for(const [question,lang,needle] of [
    ['mitä teette','fi',/asiakaspalvelubotin/i],
    ['what do you do','en',/customer-service chatbot/i],
    ['vad gör ni','sv',/kundtjänstbot/i],
  ]){
    const faq=respondoProductFaqMatch(question,lang);
    assert.ok(faq,question);
    assert.equal(faq.id,'respondo-faq-company-overview');
    assert.match(faq.answer,needle);
  }
});

test('general business question uses approved About company description',async()=>{
  const rows=[
    {id:'approved-about',category:'Tietoa yrityksestä',title:'Yrityksen kuvaus',
      answer:'Olemme Turussa toimiva polkupyörähuolto. Huollamme ja korjaamme polkupyöriä.',
      source_type:'website',source_url:'https://example.fi/meista',keywords:['yritys']},
    {id:'phone',category:'Yhteystiedot',title:'Puhelinnumero',
      answer:'+358 50 123 4567',source_type:'profile'},
  ];
  const response=await generateGroundedAnswer({rows,message:'mitä teette',lang:'fi'});
  assert.equal(response.handoff,false,JSON.stringify(response));
  assert.deepEqual(response.sourceIds,['approved-about']);
  assert.match(response.answer,/polkupyörähuolto|polkupyöriä/i);
  assert.doesNotMatch(response.answer,/50 123/);
});

test('general business question does not invent a description from contact fields',async()=>{
  const rows=[
    {id:'phone',category:'Yhteystiedot',title:'Puhelinnumero',
      answer:'+358 50 123 4567',source_type:'profile'},
    {id:'homepage',title:'Verkkosivu',category:'Yrityksen perustiedot',
      answer:'https://example.fi',source_type:'profile'},
  ];
  const response=await generateGroundedAnswer({rows,message:'mitä teette',lang:'fi'});
  assert.equal(response.handoff,true,JSON.stringify(response));
});

test('first-party company summary does not swallow pricing questions',()=>{
  assert.notEqual(respondoProductFaqMatch('Paljonko Advanced maksaa?','fi')?.id,'respondo-faq-company-overview');
});
