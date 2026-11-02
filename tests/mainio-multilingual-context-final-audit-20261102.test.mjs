import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mainioConversationContextQuestion,
  mainioBoxRentalFollowupKind
} from '../mainio-moving-intake.mjs';
import {mainioPublicFactAnswer} from '../mainio-public-fact-answer.mjs';
import {mainioOfficialPublicFacts} from '../mainio-official-public-facts.mjs';

const facts=mainioOfficialPublicFacts();
function reply(lang,question,history=[]){
  const context=mainioConversationContextQuestion(history.map(question=>({question})));
  return mainioPublicFactAnswer(facts,question,lang,context);
}
function run(lang,turns){
  const history=[];
  for(const [question,expect] of turns){
    const result=reply(lang,question,history);
    assert.ok(result&&!result.handoff,lang+': '+question+' returned '+String(result?.answer));
    assert.match(result.answer,expect,lang+': '+question);
    assert.equal(result.verified,true,lang+': '+question);
    assert.ok(result.sourceIds.every(id=>id&&id.startsWith('demo-mainio-official-')),lang+': '+question);
    history.push(question);
  }
}
test('real EN live failure reproducer: source-grounded box tariff remains through six follow-up turns',()=>{
  run('en',[
    ['How much are moving boxes?',/€0\.20/],
    ['And how much does delivery cost?',/€25 per trip/],
    ['Can you deliver them?',/we deliver moving boxes/],
    ['How much do they cost?',/€0\.20/],
    ['How big are they?',/600 × 400 × 300 mm/],
    ['When do you deliver them?',/Mondays, Wednesdays and Fridays/]
  ]);
});
test('SV live follow-ups retain explicit flyttlådor even when customer omits subject',()=>{
  run('sv',[
    ['Vad kostar flyttlådor?',/0,20 €/],
    ['Vad kostar leveransen?',/25 € per körning/],
    ['Kan ni leverera dem?',/levererar flyttlådor/],
    ['Vad kostar de?',/0,20 €/],
    ['Hur stora är de?',/600 × 400 × 300 mm/],
    ['När levererar ni dem?',/måndagar, onsdagar och fredagar/]
  ]);
});
test('original Finnish van to boxes to delivery fee conversation remains unchanged',()=>{
  run('fi',[
    ['Mitä paku maksaa?',/50 €/],
    ['Entä laatikot?',/0,20 euroa/],
    ['Paljonko ne maksaa?',/0,20 euroa/],
    ['Toimitatteko kotiin?',/Toimitamme muuttolaatikot/],
    ['Mitä kuljetus maksaa?',/25 euroa/]
  ]);
});
test('independent English and Swedish delivery/box follow-up variants',()=>{
  const cases=[
    ['en','How much are moving boxes?','How much does delivery cost?',/€25 per trip/],
    ['en','How much are moving boxes?','Can you deliver them?',/deliver moving boxes/],
    ['en','How much are moving boxes?','Do you offer delivery?',/deliver moving boxes/],
    ['en','How much are moving boxes?','What size are they?',/600 × 400/],
    ['en','How much are moving boxes?','How much do they cost?',/€0\.20/],
    ['en','How much are moving boxes?','How much does shipping cost?',/€25 per trip/],
    ['sv','Vad kostar flyttlådor?','Vad kostar transporten?',/25 € per körning/],
    ['sv','Vad kostar flyttlådor?','Hur mycket kostar leveransen?',/25 € per körning/],
    ['sv','Vad kostar flyttlådor?','Levererar ni hem?',/levererar flyttlådor/],
    ['sv','Vad kostar flyttlådor?','Vilken storlek har de?',/600 × 400/],
    ['sv','Vad kostar flyttlådor?','Vad kostar de?',/0,20 €/]
  ];
  for(const [lang,previous,q,pattern] of cases)assert.match(reply(lang,q,[previous])?.answer||'',pattern,lang+': '+q);
});
test('no cross-topic leakage, fabricated availability, personal confirmations, or invented delivery',()=>{
  const negatives=[
    ['en',['How much are moving boxes?','What is your email address?'],'How much does delivery cost?'],
    ['en',['How much are moving boxes?','How do I recycle cardboard?'],'How much does delivery cost?'],
    ['en',['How much does a van cost?'],'How much does delivery cost?'],
    ['en',[],'How much do they cost?'],
    ['en',[],'Can you deliver them?'],
    ['en',['How much are moving boxes?'],'Can you deliver them tomorrow?'],
    ['en',['How much are moving boxes?'],'Is the delivery booked for tomorrow?'],
    ['en',['How much are moving boxes?'],'How much does moving service cost?'],
    ['sv',['Vad kostar flyttlådor?','Vad är er e-postadress?'],'Vad kostar leveransen?'],
    ['sv',['Vad kostar flyttlådor?'],'Är leveransen bokad?'],
    ['fi',['Mitä paku maksaa?'],'Mitä kuljetus maksaa?']
  ];
  for(const [lang,history,q] of negatives){
    assert.equal(reply(lang,q,history),null,lang+': '+q+' after '+history.join('; '));
  }
});
test('new replies require approved exact Mainio source rows and never trust other tenants',()=>{
  const context='How much are moving boxes?';
  for(const bad of [
    facts.map(x=>({...x,approved:false})),
    facts.map(x=>({...x,id:''})),
    facts.map(x=>({...x,source_type:'customer'})),
    facts.map(x=>({...x,source_url:'https://mainiomuuttopalvelu.fi.evil.example/prices'})),
    facts.filter(x=>x.title!=='Laatikoiden toimitus ja palautus')
  ]){
    assert.equal(mainioPublicFactAnswer(bad,'Can you deliver them?','en',context),null);
  }
});
