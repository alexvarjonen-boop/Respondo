import test from 'node:test';
import assert from 'node:assert/strict';
import {generateGroundedAnswer} from '../server.mjs';

const free=[{id:'free',category:'Toimitus ja seuranta',title:'Ilmainen toimitus',
  answer:'Toimitus on ilmainen yli 280€ tilauksille.',keywords:['toimitus','hinta'],
  source_type:'website',source_url:'https://shop.example/toimitus'}];
const paid={id:'price',category:'Toimitus ja seuranta',title:'Toimituskulut',
  answer:'Posti: 5,90 €. Matkahuolto: 6,90 €.',keywords:['postikulut','toimitus'],
  source_type:'website',source_url:'https://shop.example/toimitus'};
const unrelated={id:'time',category:'Toimitus ja seuranta',title:'Toimitusaika',
  answer:'Fast and effortless delivery, straight to your pickup point! Domestic orders usually arrive in 3-5 business days.',
  keywords:['toimitusaika'],source_type:'website',source_url:'https://shop.example/delivery'};

for(const [lang,previousQuestion,question,words] of [
  ['fi','Mitä toimitus maksaa?','Entä alle?',/alle 280.*toimitushintaa ei ole ilmoitettu/],
  ['fi','Mitä toimitus maksaa?','Entä sen alle',/alle 280.*toimitushintaa ei ole ilmoitettu/],
  ['en','What does shipping cost?','What about below?',/below 280.*not specified/],
  ['sv','Vad kostar frakten?','Och under?',/under 280.*anges inte/]
]){
 test('free-shipping threshold follow-up uses verified policy in '+lang+': '+question,async()=>{
   const result=await generateGroundedAnswer({companyName:'Shop',rows:[unrelated,...free],
     message:question,history:[{question:previousQuestion,answer:'Toimitus on ilmainen yli 280€ tilauksille.'}],lang});
   assert.equal(result.handoff,false,JSON.stringify(result));
   assert.match(result.answer,words);
   assert.deepEqual(result.sourceIds,['free']);
   assert.doesNotMatch(result.answer,/fast and effortless|pickup point|3-5 business days/i);
 });
}
test('below-threshold follow-up combines verified paid prices',async()=>{
 const result=await generateGroundedAnswer({companyName:'Shop',rows:[unrelated,...free,paid],
   message:'Entä alle?',history:[{question:'Mitä toimitus maksaa?',answer:'Toimitus on ilmainen yli 280€ tilauksille.'}],lang:'fi'});
 assert.equal(result.handoff,false);
 assert.match(result.answer,/5,90/);
 assert.match(result.answer,/6,90/);
 assert.match(result.answer,/280/);
 assert.deepEqual(new Set(result.sourceIds),new Set(['free','price']));
});
test('short under/below without earlier shipping context is not treated as delivery',async()=>{
 const result=await generateGroundedAnswer({rows:[unrelated,...free],message:'Entä alle?',
   history:[{question:'Onko teillä tuotteita?',answer:'Kyllä.'}],lang:'fi'});
 assert.notEqual(result.intent,'Toimitus');
});
test('an unverified free-shipping threshold is not invented from a previous bot answer',async()=>{
 const result=await generateGroundedAnswer({rows:[unrelated],message:'Entä alle?',
   history:[{question:'Mitä toimitus maksaa?',answer:'Toimitus on ilmainen yli 280€ tilauksille.'}],lang:'fi'});
 assert.equal(result.handoff,false);
 assert.match(result.answer,/ei löydy vahvistettua toimitushintaa/i);
 assert.doesNotMatch(result.answer,/280/);
});
