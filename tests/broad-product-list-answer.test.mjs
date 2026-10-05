import test from 'node:test';
import assert from 'node:assert/strict';
import {generateGroundedAnswer,chatActions} from '../server.mjs';

test('broad what-do-you-sell question returns a clean catalog answer without raw product records or button spam', async()=>{
  const rows=[
    {id:'grip',category:'Tuotteet',title:'SuperStroke Pistol 1',answer:'Tuote: SuperStroke Pistol 1. Tuoteryhmä: Golf grips. Hinta: 21 USD. Linkki: https://shop.example/products/grip.',keywords:['superstroke','grip','product'],source_type:'website',source_url:'https://shop.example/products/grip'},
    {id:'cover',category:'Tuotteet',title:'JAG Headcover',answer:'Tuote: JAG Headcover. Brändi: JAG Putters. Hinta: 29 EUR. Linkki: https://shop.example/products/headcover.',keywords:['jag','headcover','product'],source_type:'website',source_url:'https://shop.example/products/headcover'},
    {id:'stamp',category:'Tuotteet',title:'Custom Stamping',answer:'Tuote: Custom Stamping. Brändi: JAG. Hinta: 35 EUR. Linkki: https://shop.example/products/custom-stamping.',keywords:['custom','stamping','product'],source_type:'website',source_url:'https://shop.example/products/custom-stamping'},
    {id:'putter',category:'Tuotteet',title:'JAG Satin Black - Putter',answer:'Tuote: JAG Satin Black - Putter. Tuoteryhmä: Putter. Hinta: 199 EUR. Linkki: https://shop.example/products/satin-black.',keywords:['jag','putter','product'],source_type:'website',source_url:'https://shop.example/products/satin-black'},
  ];

  const result=await generateGroundedAnswer({rows,message:'Mitä myytte?',lang:'fi'});
  assert.equal(result.handoff,false,JSON.stringify(result));
  assert.match(result.answer,/^Valikoimassamme on esimerkiksi /);
  assert.doesNotMatch(result.answer,/Tuote:|Tuoteryhmä:|Brändi:|Katso /i);
  assert.equal(result.selected.length,0);

  const actions=chatActions(rows,'Mitä myytte?',false,'fi',result.selected);
  assert.equal(actions.filter((action)=>action.type==='product').length,0);
});
