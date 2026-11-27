import test from 'node:test';
import assert from 'node:assert/strict';
import {generateGroundedAnswer,chatActions} from '../server.mjs';

const rows=[
  {id:'headcover',category:'Tuotteet',title:'JAG Headcover',answer:'Tuote: JAG Headcover. Hinta: 39 EUR.',source_type:'website',source_url:'https://example.com/products/headcover',approved:true},
  {id:'putter',category:'Tuotteet',title:'JAG Putter',answer:'Tuote: JAG Putter. Hinta: 299 EUR.',source_type:'website',source_url:'https://example.com/products/putter',approved:true},
  {id:'catalog',category:'Verkkokauppa',title:'Tuotekatalogi',answer:'https://example.com/collections/all',source_type:'website',approved:true},
];

for(const [lang,message] of [['fi','Miten voin tilata headcoverin'],['en','How can I order the headcover?'],['sv','Hur kan jag beställa headcover?']]){
  test('specific order selects the product page: '+lang,async()=>{
    const result=await generateGroundedAnswer({companyName:'Example',rows,message,lang});
    assert.deepEqual(result.selected.map(row=>row.id),['headcover']);
    const actions=chatActions(rows,message,result.handoff,lang,result.selected);
    assert.ok(actions.some(action=>action.type==='product'&&action.url===rows[0].source_url));
    assert.ok(!actions.some(action=>action.type==='catalog'));
  });
}
test('generic ordering still offers the catalog',async()=>{
  const message='Miten voin tilata tuotteita?';
  const result=await generateGroundedAnswer({companyName:'Example',rows,message,lang:'fi'});
  assert.ok(chatActions(rows,message,result.handoff,'fi',result.selected).some(action=>action.type==='catalog'));
});
