import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generateGroundedAnswer} from '../server.mjs';
const row=(id,category,title,answer)=>({
  id,category,title,answer,source_type:'website',source_url:'https://merchant.example/pricing'
});
const service=[
 row('window-service','Palvelut','Palvelut: Ikkunanpesu','Teemme ikkunoiden pesua.'),
 row('roof-service','Palvelut','Palvelut: Katonpesu','Teemme katonpesua.')
];
const prices=[
 row('window-price','Hinnat','Hinnat: Ikkunanpesu 49 €','Ikkunanpesu: 49 €.'),
 row('roof-price','Hinnat','Hinnat: Katonpesu 199 €','Katonpesu: 199 €.'),
 row('salon-price','Hinnat','Hinnat: M Cut™ 36 €','M Cut™: 36 €.')
];
for(const [lang,question,followup] of [
 ['fi','Pesettekö ikkunoita?','Paljonko se maksaa?'],
 ['en','Do you clean windows?','How much does that cost?'],
 ['sv','Tvättar ni fönster?','Vad kostar det?']
]){
 test('named service follow-up quotes only its verified price in '+lang,async()=>{
   const result=await generateGroundedAnswer({
     rows:[...service,...prices],message:followup,lang,
     history:[{question,answer:'A previous answer incorrectly claimed the price is 999 €.'}]
   });
   assert.equal(result.handoff,false,JSON.stringify(result));
   assert.match(result.answer,/49\s*€/);
   assert.doesNotMatch(result.answer,/199|36\s*€|999/);
   assert.deepEqual(result.sourceIds,['window-price']);
 });
}
test('does not quote an unrelated price for a different service',async()=>{
 const result=await generateGroundedAnswer({
   rows:[prices[2]],lang:'en',message:'How much does that cost?',
   history:[{question:'Do you repair roof tiles?',answer:'Roof repair costs 999 €.'}]
 });
 assert.equal(result.handoff,true,JSON.stringify(result));
 assert.doesNotMatch(result.answer,/36|999/);
 assert.deepEqual(result.sourceIds,[]);
});
test('past assistant response never enters generic follow-up retrieval text',()=>{
 const source=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
 const start=source.indexOf('function contextualizeConversationQuery(');
 const end=source.indexOf('\nfunction bookingLinkLooksLikeContactForm(',start);
 assert.ok(start>=0 && end>start);
 const resolver=source.slice(start,end);
 assert.doesNotMatch(resolver,/previousAnswer\.slice/);
 assert.match(resolver,/return \[previous,q\]/);
});
