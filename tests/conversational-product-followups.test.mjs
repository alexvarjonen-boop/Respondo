import test from 'node:test';
import assert from 'node:assert/strict';
import {generateGroundedAnswer,chatActions} from '../server.mjs';

const rows=[
  {id:'h',title:'JAG Headcover',category:'Tuotteet',answer:'Tuote: JAG Headcover. Hinta: 39 EUR.',source_type:'website',source_url:'https://example.com/products/headcover',approved:true},
  {id:'p',title:'JAG Putter',category:'Tuotteet',answer:'Tuote: JAG Putter. Hinta: 299 EUR.',source_type:'website',source_url:'https://example.com/products/putter',approved:true}
];
const history=[{question:'Miten voin tilata headcoverin?',answer:'Tästä pääset suoraan tilaamaan: JAG Headcover.'}];
for(const [lang,message] of [['fi','Paljonko?'],['fi','Entä hinta?'],['en','How much?'],['sv','Vad kostar den?']]){
  test('short price follow-up retains the single verified product: '+message,async()=>{
    const result=await generateGroundedAnswer({companyName:'Example',rows,message,history,lang});
    assert.equal(result.handoff,false);
    assert.deepEqual(result.selected.map(row=>row.id),['h']);
    assert.match(result.answer,/39/);
    assert.doesNotMatch(result.answer,/299/);
    assert.ok(chatActions(rows,message,false,lang,result.selected).some(action=>action.url===rows[0].source_url));
  });
}
test('ambiguous short price follow-up asks rather than guessing',async()=>{
  const result=await generateGroundedAnswer({companyName:'Example',rows,message:'Paljonko?',history:[{question:'Mitä myytte?',answer:'JAG Headcover ja JAG Putter'}],lang:'fi'});
  assert.equal(result.handoff,false);
  assert.equal(result.selected.length,0);
  assert.match(result.answer,/\?/);
});
