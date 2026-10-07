import test from 'node:test';
import assert from 'node:assert/strict';
import {generateGroundedAnswer,chatActions} from '../server.mjs';

const product={id:'putter',category:'Tuotteet',title:'JAG Satin Black - Putter',answer:'Tuote: JAG Satin Black - Putter. Merkki: JAG Putters. Linkki: https://shop.example/products/black.',keywords:['putter','product'],source_type:'website',source_url:'https://shop.example/products/black'};
const delivery={id:'delivery',category:'Toimitus ja seuranta',title:'Toimitusaika',answer:'Toimitusaika on 3–5 arkipäivää.',keywords:['toimitus','toimitusaika'],source_type:'website',source_url:'https://shop.example/shipping'};
const history=[{question:'Mitä tuotteita myytte?',answer:product.answer}];

for(const message of ['kuinka kauan toimituksessa kestää','entä toimitusaika?','kuinka kauan sen toimitus kestää?','kuinka kauan JAG Satin Black - Putterin toimitus kestää?']) {
  test(`delivery question replaces the previous product topic: ${message}`,async()=>{
    const rows=[product,delivery];
    const result=await generateGroundedAnswer({rows,message,history,lang:'fi'});
    assert.equal(result.handoff,false);
    assert.match(result.answer,/3–5 arkipäivää/);
    assert.deepEqual(result.sourceIds,['delivery']);
    assert.equal(chatActions(rows,message,result.handoff,'fi',result.selected).some(action=>action.type==='product'),false);
  });
}
test('missing delivery information hands off instead of answering with a product',async()=>{
  const result=await generateGroundedAnswer({rows:[product],message:'kuinka kauan toimituksessa kestää',history,lang:'fi'});
  assert.equal(result.handoff,true);
  assert.deepEqual(result.sourceIds,[]);
  assert.equal(result.selected.length,0);
});
