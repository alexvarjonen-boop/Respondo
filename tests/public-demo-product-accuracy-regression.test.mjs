import test from 'node:test';
import assert from 'node:assert/strict';
import {generateGroundedAnswer,chatActions} from '../server.mjs';
import {extractProducts} from '../website-knowledge.mjs';

const root='https://example.com';
const rows=[
 {id:'catalog',category:'Verkkokauppa',title:'Tuotekatalogi',answer:root+'/collections/all',source_type:'website',source_url:root},
 ...['JAG Headcover','JAG Putter'].map((title,i)=>({id:'product-'+i,category:'Tuotteet',title,answer:'Tuote: '+title+'. Hinta: '+(i?299:39)+' EUR. Linkki: '+root+'/products/'+(i?'putter':'headcover')+'.',source_type:'website',source_url:root+'/products/'+(i?'putter':'headcover')}))
];
for(const [lang,message] of [['fi','Miten voin tilata headcoverin?'],['en','How can I order the headcover?'],['sv','Hur kan jag beställa headcover?']]){
 test('named product has its own link: '+lang,async()=>{
  const result=await generateGroundedAnswer({rows,message,lang,disableAIFallback:true});
  assert.equal(result.handoff,false);
  assert.deepEqual(result.selected.map(row=>row.id),['product-0']);
  const actions=chatActions(rows,message,false,lang,result.selected);
  assert.ok(actions.some(action=>action.type==='product'&&action.url===rows[1].source_url));
  assert.ok(!actions.some(action=>action.type==='catalog'));
 });
}
const product=offers=>extractProducts('<script type="application/ld+json">'+JSON.stringify({'@type':'https://schema.org/Product',name:'Test product',offers})+'</script>',root+'/products/test')[0];
test('missing price is not free and sold-out stock is not available',()=>{
 const p=product({'@type':'Offer',price:'',availability:'https://schema.org/OutOfStock'});
 assert.ok(p);
 assert.equal(p.price,null);
 assert.equal(p.availability,'ei varastossa');
});
test('genuine zero is preserved and mixed availability is not guessed',()=>{
 assert.equal(product({'@type':'Offer',price:0}).price,0);
 assert.equal(product([{price:10,availability:'InStock'},{price:20,availability:'OutOfStock'}]).availability,'');
});
