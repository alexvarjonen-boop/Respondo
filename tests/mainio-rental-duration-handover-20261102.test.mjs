import test from 'node:test';
import assert from 'node:assert/strict';
import {mainioConversationContextQuestion} from '../mainio-moving-intake.mjs';
import {mainioPublicFactAnswer} from '../mainio-public-fact-answer.mjs';
import {mainioOfficialPublicFacts} from '../mainio-official-public-facts.mjs';

const official=mainioOfficialPublicFacts();
const samples={
  en:[
    'How many days can I rent the boxes?',
    'How many days can I rent them?',
    'How many days can I keep them?',
    'How long can I rent the boxes?',
    'How long can I rent them?',
    'What is the maximum rental duration?',
    'Can I rent the boxes for seven days?'
  ],
  fi:[
    'Kuinka kauan voin vuokrata muuttolaatikoita?',
    'Kuinka kauan voin vuokrata niitä?',
    'Moneksi päiväksi saan laatikot?',
    'Montako päivää saan pitää niitä?',
    'Kuinka monta päivää voin pitää laatikoita?',
    'Kauanko saan pitää laatikot?'
  ],
  sv:[
    'Hur länge kan jag hyra flyttlådor?',
    'Hur länge kan jag hyra dem?',
    'Hur många dagar kan jag hyra lådorna?',
    'Hur lång tid kan jag behålla dem?'
  ]
};
const seed={en:'How much are moving boxes?',fi:'Paljonko muuttolaatikot maksavat?',sv:'Vad kostar flyttlådor?'};
const unit={en:/€0\.20 per box per day/,fi:/0,20 €\/laatikko\/vrk/,sv:/0,20 € per låda och dygn/};
const caveat={en:/does not specify a maximum rental period/,fi:/Enimmäisvuokra-aikaa ei ole ilmoitettu/,sv:/Någon längsta hyrestid anges inte/};
const context=history=>mainioConversationContextQuestion(history.map(question=>({question})));
test('real public-chat rental-duration failure: verified FI SV EN answers and all follow-ups',()=>{
  let count=0;
  for(const [lang,questions] of Object.entries(samples)){
    for(const q of questions){
      for(const message of [q,q.toLowerCase(),q.toUpperCase(),'Hello, '+q,'No '+q]){
        const p=context([seed[lang]]);
        const result=mainioPublicFactAnswer(official,message,lang,p);
        assert.ok(result?.verified&&result.handoff===false,lang+': '+message);
        assert.match(result.answer,unit[lang],lang+': '+message);
        assert.match(result.answer,caveat[lang],lang+': '+message);
        assert.doesNotMatch(result.answer,/packaging technology|people carrying|moving men|kuolinpesä|tavaramäärä/i);
        assert.deepEqual(result.sourceIds,['demo-mainio-official-02']);
        count++;
      }
    }
  }
  assert.equal(count,85);
});
test('context survives 4+ rental period follow-ups without assuming a booked duration',()=>{
  const chats=[
    ['en',[
      'How much are moving boxes?',
      'How many days can I rent them?',
      'How long can I rent the boxes?',
      'How many days can I keep them?',
      'What is the maximum rental duration?',
      'Can I rent the boxes for seven days?'
    ]],
    ['fi',[
      'Mitä paku maksaa?','Entä laatikot?',
      'Kuinka kauan voin vuokrata niitä?',
      'Moneksi päiväksi saan laatikot?',
      'Montako päivää saan pitää niitä?'
    ]],
    ['sv',[
      'Vad kostar flyttlådor?',
      'Hur länge kan jag hyra dem?',
      'Hur många dagar kan jag hyra lådorna?',
      'Hur lång tid kan jag behålla dem?'
    ]]
  ];
  for(const [lang,chat] of chats){
    const history=[];
    for(const [index,q] of chat.entries()){
      const result=mainioPublicFactAnswer(official,q,lang,context(history));
      assert.ok(result,lang+': '+q);
      if(index>=(lang==='fi'?2:1))assert.match(result.answer,caveat[lang]);
      history.push(q);
    }
  }
});
test('never fabricate a booking or maximum duration without verifiable official tariff',()=>{
  for(const lang of Object.keys(samples)){
    const q=samples[lang][0],p=seed[lang];
    for(const altered of [
      official.map(r=>({...r,approved:false})),
      official.map(r=>({...r,id:''})),
      official.map(r=>({...r,source_type:'customer'})),
      official.map(r=>({...r,source_url:'https://mainiomuuttopalvelu.fi.evil.invalid/facts'})),
      official.filter(r=>r.title!=='Muuttolaatikoiden hinta'),
    ]){
      const result=mainioPublicFactAnswer(altered,q,lang,p);
      assert.equal(result,null,lang+': '+q);
    }
  }
});
test('unrelated context blocks pronoun-only box duration assumptions',()=>{
  for(const [lang,q] of [['en','How many days can I rent them?'],['fi','Kuinka kauan voin vuokrata niitä?'],['sv','Hur länge kan jag hyra dem?']]){
    assert.equal(mainioPublicFactAnswer(official,q,lang,context([seed[lang],'What is your email address?'])),null,lang);
  }
});
