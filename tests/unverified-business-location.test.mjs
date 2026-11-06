import test from 'node:test';
import assert from 'node:assert/strict';
import {generateGroundedAnswer} from '../server.mjs';
const rows=[{
 id:'product',category:'Tuotteet',title:'Example putter',
 answer:'Designed and assembled in Turku, Finland. Hinta: 199 EUR',
 source_type:'website',source_url:'https://merchant.example/products/putter',
 keywords:['putter','products']
}];
test('business address is not fabricated from a product assembly city',async()=>{
 for(const [lang,message,pattern] of [
   ['fi','Missä yritys sijaitsee?',/käyntiosoitetta ei ole vahvistettu/],
   ['en','Where are you based?',/visiting address has not been verified/],
   ['sv','Var finns företaget?',/besöksadress har inte bekräftats/]
 ]){
   const result=await generateGroundedAnswer({companyName:'Example',rows,message,lang});
   assert.equal(result.handoff,true,JSON.stringify(result));
   assert.match(result.answer,pattern);
   assert.doesNotMatch(result.answer,/(?:toimipaikkamme on|we are based in|vi finns i).*Turku/i);
   assert.deepEqual(result.sourceIds,[]);
 }
});
