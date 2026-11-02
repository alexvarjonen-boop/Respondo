import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mainioVerifiedHandoverAnswer} from '../mainio-handover-guards.mjs';
import {mainioConversationContextQuestion} from '../mainio-moving-intake.mjs';
import {mainioOfficialPublicFacts} from '../mainio-official-public-facts.mjs';
import {mainioPublicFactAnswer} from '../mainio-public-fact-answer.mjs';

const source=mainioOfficialPublicFacts();
function answer(lang,message,history=[],rows=source){
  const previousCustomerQuestion=mainioConversationContextQuestion(
    history.map(question=>({question})));
  return mainioVerifiedHandoverAnswer(rows,message,lang,previousCustomerQuestion) ||
    mainioPublicFactAnswer(rows,message,lang,previousCustomerQuestion);
}
const testcases=[
  // Every case was observed failing in the production browser on 2026-11-02.
  ['fi',['Mitä paku maksaa?'],'Entä viideksi tunniksi?',/13 m³ pakettiauto 70 €/],
  ['en',['How much does a van cost?'],'What about five hours?',/13 m³ van €70/],
  ['sv',['Vad kostar en skåpbil?'],'Och i fem timmar?',/13 m³ skåpbil 70 €/],
  ['fi',[],'Riittääkö B-ajokortti?',/B-ajokortilla/],
  ['sv',[],'Räcker B-körkort?',/B-körkort/],
  ['en',['How much does a van cost?','What about five hours?'],'Can I rent it overnight?',/cannot be booked through the online reservation/],
  ['sv',['Vad kostar en skåpbil?','Och i fem timmar?'],'Kan jag hyra den över natten?',/inte bokas via nätbokningen/],
  ['fi',['Mitä paku maksaa?'],'Saako pakettiauton yöksi?',/erikseen asiakaspalvelumme/],
  ['fi',['Entä laatikot?','Kuinka monta laatikkoa tarvitsen 60 m² asuntoon?'],'Moneksi päiväksi saan ne?',/Enimmäisvuokra-aikaa ei ole ilmoitettu/],
  ['en',['How much are moving boxes?'],'How many days can I keep them?',/does not specify a maximum rental period/],
  ['sv',['Vad kostar flyttlådor?'],'Hur länge kan jag hyra dem?',/längsta hyrestid anges inte/],
  ['en',['How much are moving boxes?'],'How much does the move cost?',/cost of a move depends on/],
  ['sv',['Vad kostar flyttlådor?'],'Vad kostar själva flytten?',/Priset för en flytt beror/],
  ['fi',['Mitä paku maksaa?'],'Paljonko muutto maksaa?',/Muuton lopullinen hinta riippuu/],
  ['en',['How much does the move cost?'],'Can you confirm a move for tomorrow?',/cannot guarantee a move for tomorrow/],
  ['sv',['Vad kostar flyttlådor?'],'Kan ni garantera flytt imorgon?',/kan inte garantera en flytt imorgon/],
  ['fi',[],'Voitteko varmasti muuttaa meidät huomenna?',/En voi luvata muuttoa huomiseksi/],
  ['en',[],'Can I request a quote?',/request a moving quote/],
  ['sv',[],'Jag vill begära offert.',/begära en flyttoffert/],
  ['fi',[],'Haluan jättää tarjouspyynnön.',/pyytää muuttotarjouksen/],
  ['fi',[],'Kiitos avusta!',/Ole hyvä/],
  ['en',[],'Thanks for your help!',/You are welcome/],
  ['sv',[],'Tack för hjälpen!',/Varsågod/],
  ['fi',[],'Saanko luvanvaraiset sähkötyöt samalla?',/Emme tee luvanvaraisia sähkö/],
  ['en',[],'Do you perform licensed electrical installations?',/do not perform electrical/],
  ['sv',[],'Utför ni elinstallationer som kräver behörighet?',/utför inte el-/],
  ['sv',[],'Var hämtar jag hyrbilen?',/Tavarakatu 1, 20250 Turku/],
  ['en',[],'Where do I pick up the rental van?',/Tavarakatu 1, 20250 Turku/],
];
test('all 28 real live-browser failures have source-verified corrections',()=>{
  assert.equal(testcases.length,28);
  for(const [lang,history,q,pattern] of testcases){
    const a=answer(lang,q,history);
    assert.ok(a?.answer,lang+': '+q);
    assert.match(a.answer,pattern,lang+': '+q);
    assert.equal(a.handoff,false,lang+': '+q);
  }
});
test('moving-service price never inherits the 0.20 euro box-day price',()=>{
  for(const [lang,q] of [
    ['en','How much does the move cost?'],
    ['en','How much does a full-service move cost?'],
    ['sv','Vad kostar själva flytten?'],
    ['fi','Paljonko muutto maksaa?']
  ]){
    const a=answer(lang,q,['How much are moving boxes?']);
    assert.ok(a?.verified,lang+': '+q);
    assert.doesNotMatch(a.answer,/(?:0[,.]20|€0\.20|20 cents)/);
    assert.equal(a.selected[0].title,'Muuton hinta');
    assert.ok(a.actions?.some(x=>x.url==='https://tarjous.mainiomuuttopalvelu.fi/'));
  }
});
test('tomorrow and confirmed-booking safety override vague or marketing assertions',()=>{
  for(const [lang,q] of [
    ['fi','Voitteko varmasti muuttaa meidät huomenna?'],
    ['en','Can you guarantee a move tomorrow?'],
    ['en','Can you confirm a move for tomorrow?'],
    ['sv','Kan ni garantera flytt imorgon?'],
    ['sv','Kan ni bekräfta flytten imorgon?']
  ]){
    const a=answer(lang,q,['How much are moving boxes?']);
    assert.ok(a?.verified,lang+': '+q);
    assert.equal(a.selected[0].title,'Muuton toimialue');
    assert.doesNotMatch(a.answer,/^(?:Ja[, .]|Yes[, .]|Kyllä[, .])/);
    assert.ok(a.actions.some(x=>x.url==='https://tarjous.mainiomuuttopalvelu.fi/'));
  }
});
test('real quote links exist on each language when text promises a button',()=>{
  for(const [lang,q] of [
    ['fi','Haluan jättää tarjouspyynnön.'],
    ['sv','Jag vill begära offert.'],
    ['en','Can I request a quote?']
  ]){
    const a=answer(lang,q);
    assert.ok(a?.verified,lang+': '+q);
    assert.ok(a.actions.some(x=>x.type==='quote'&&x.url==='https://tarjous.mainiomuuttopalvelu.fi/'),lang+': '+q);
    assert.equal(a.intent,'Muuttotarjouspyyntö');
  }
});
test('no unapproved or cross-site source permits safety facts or fake rental prices',()=>{
  const critical=['Kan ni garantera flytt imorgon?','Vad kostar själva flytten?','Räcker B-körkort?','Kan jag hyra den över natten?'];
  const invalid=[
    source.map(r=>({...r,approved:false})),
    source.map(r=>({...r,source_type:'customer'})),
    source.map(r=>({...r,source_url:'https://mainiomuuttopalvelu.fi.attacker.invalid/prices'})),
    source.map(r=>({...r,id:''})),
  ];
  for(const rows of invalid)for(const question of critical){
    assert.equal(mainioVerifiedHandoverAnswer(rows,question,'sv','Vad kostar en skåpbil?'),null,question);
  }
});
test('existing verified box and van prices and moving route remain intact',()=>{
  for(const [lang,q,pattern] of [
    ['fi','Mitä paku maksaa?',/3 h: 13 m³ 50 €/],
    ['fi','Paljonko muuttolaatikot maksavat?',/0,20 euroa/],
    ['en','How much are moving boxes?',/€0\.20 per box per day/],
    ['sv','Vad kostar flyttlådor?',/0,20 € per låda/],
    ['en','How much does a van cost?',/3 hours: 13 m³ €50/]
  ]){
    assert.match(answer(lang,q)?.answer||'',pattern,lang+': '+q);
  }
});
test('both public demo and widget enforce same verified guard before route/retrieval',()=>{
  const code=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
  assert.match(code,/const mainioGuardPreview=[\s\S]{0,220}mainioVerifiedHandoverAnswer/);
  assert.match(code,/const mainioGuardWidget=[\s\S]{0,220}mainioVerifiedHandoverAnswer/);
  assert.match(code,/mainioStatusPreview \? mainioStatusPreview : mainioGuardPreview \? mainioGuardPreview : mainioRoutePreview/);
  assert.match(code,/mainioBookingReply \? mainioBookingReply : mainioGuardWidget \? mainioGuardWidget : mainioRouteReply/);
  assert.match(code,/mainioGuardPreview\.actions/);
  assert.match(code,/mainioGuardWidget\.actions/);
});
