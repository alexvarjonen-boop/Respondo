import test from 'node:test';
import assert from 'node:assert/strict';
import {generateGroundedAnswer} from '../server.mjs';

const rows=[
  {
    id:'jag-restricted-returns',category:'Palautukset',title:'Return Policy',
    answer:'As each putter is made-to-order, we do not accept returns unless there is a clear flaw or mistake in the putter. Customers must contact us within 14 days of purchase.',
    source_type:'website',source_url:'https://jagputters.fi/policies/refund-policy',keywords:['return','policy'],
  },
  {
    id:'jag-return-deadline',category:'Palautukset',title:'Returns',
    answer:'Returns are only accepted within 14 days of the purchase.',
    source_type:'website',source_url:'https://jagputters.fi/policies/refund-policy',keywords:['return','14 days'],
  },
];

test('defect-only return policies do not become unconditional 14-day returns in any language',async()=>{
  for(const [lang,message,restriction] of [
    ['fi','Voinko palauttaa tuotteen?',/vain, jos tuotteessa on selvä virhe/],
    ['en','Can I return an item?',/only if the product has a clear defect/],
    ['sv','Kan jag returnera en produkt?',/endast om produkten har ett tydligt fel/],
  ]){
    const r=await generateGroundedAnswer({companyName:'JAG Putters',rows,message,lang});
    assert.equal(r.handoff,false);
    assert.match(r.answer,restriction);
    assert.match(r.answer,/14/);
    assert.ok(r.sourceIds.includes('jag-restricted-returns'));
    assert.doesNotMatch(r.answer,/^(?:You can return the product within|Du kan returnera produkten inom|Tuotteen voi palauttaa)/i);
  }
});
