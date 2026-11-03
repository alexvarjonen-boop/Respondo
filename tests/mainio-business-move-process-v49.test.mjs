import test from 'node:test';
import assert from 'node:assert/strict';
import {mainioBusinessMoveProcessQuestion,mainioBusinessMoveProcessAnswer} from '../mainio-business-move-process.mjs';
import {mainioPublicFactAnswer} from '../mainio-public-fact-answer.mjs';
import {mainioOfficialPublicFacts} from '../mainio-official-public-facts.mjs';

const rows=mainioOfficialPublicFacts();
const approved=rows.find(row=>row.title==='Yritysmuuton eteneminen');

test('Mainio publishes verified business move process evidence before the generic FAQ rows',()=>{
  assert.ok(approved);
  assert.equal(approved.approved,true);
  assert.equal(approved.source_type,'website');
  assert.equal(approved.source_url,'https://www.mainiomuuttopalvelu.fi/yritysmuutot');
  for(const text of ['maksuttomalla suunnittelu- ja arviokäynnillä','muuttovastaavan','pakkaustarvikkeet','kalusteasennukset','välivarastointia']){
    assert.ok(approved.answer.includes(text),text);
  }
});

test('real screenshot: how to proceed with a company move returns the verified process rather than a furniture tip',()=>{
  const r=mainioPublicFactAnswer(rows,'miten yritysmuutossa edetään','fi');
  assert.ok(r && !r.handoff);
  assert.equal(r.verified,true);
  assert.equal(r.intent,'Yritysmuuton eteneminen');
  assert.deepEqual(r.sourceIds,[approved.id]);
  assert.match(r.answer,/maksuttomalla suunnittelu- ja arviokäynnillä/);
  assert.match(r.answer,/aikataulun/);
  assert.match(r.answer,/henkilöstöä/);
  assert.match(r.answer,/kalusteasennustyöt/);
  assert.match(r.answer,/tarjouksen/);
  assert.doesNotMatch(r.answer,/suurista tai painavista erikoiskalusteista/);
  assert.ok(r.answer.length<600);
});

test('Finnish paraphrases, Swedish and English process variants are recognized',()=>{
  const queries={
    fi:[
      'miten yritysmuutossa edetään',
      'miten yritysmuutto etenee?',
      'mitkä ovat yritysmuuton vaiheet?',
      'Miten toimistomuutto hoidetaan?',
      'kuinka yritysmuutto sujuu',
      'yritysmuuton prosessi',
      'Miten te toteutatte toimistomuuton?'
    ],
    sv:[
      'Hur går en företagsflytt till?',
      'Hur fungerar en kontorsflytt?',
      'Vilka steg ingår i en företagsflytt?'
    ],
    en:[
      'How does a business move work?',
      'How do you handle office relocation?',
      'What is the process for an office move?',
      'What are the steps of a company move?'
    ],
  };
  for(const [lang,questions] of Object.entries(queries)){
    for(const question of questions){
      assert.equal(mainioBusinessMoveProcessQuestion(question),true,question);
      const r=mainioPublicFactAnswer(rows,question,lang);
      assert.ok(r && !r.handoff,lang+': '+question);
      assert.deepEqual(r.sourceIds,[approved.id],lang+': '+question);
      assert.equal(r.verified,true);
    }
  }
  assert.match(mainioPublicFactAnswer(rows,'How does a business move work?','en').answer,/free planning and assessment visit/);
  assert.match(mainioPublicFactAnswer(rows,'Hur går en företagsflytt till?','sv').answer,/kostnadsfritt planerings/);
});

test('brief follow-ups retain company-move process but never borrow unrelated factual details',()=>{
  const r=mainioPublicFactAnswer(rows,'miten se etenee?','fi','Meille olisi tulossa yritysmuutto.');
  assert.ok(r && r.intent==='Yritysmuuton eteneminen');
  assert.equal(mainioBusinessMoveProcessQuestion('miten se etenee?','haluan vuokrata pakettiauton'),false);
  assert.equal(mainioBusinessMoveProcessQuestion('miten se etenee?','yritysmuuton hinta'),true);
});

test('prices, availability, rental, time and packing subquestions do not receive generic process instead',()=>{
  for(const question of [
    'Paljonko yritysmuutto maksaa?',
    'Miten yritysmuuton hinta määräytyy?',
    'Kuinka kauan yritysmuutto kestää?',
    'Onnistuuko yritysmuutto huomenna?',
    'Miten muuttolaatikot toimitetaan yritysmuutossa?',
    'Miten yritysmuuton varausvahvistus toimii?',
    'Miten muuttopäivänä toimitaan?',
    'How much does an office move cost?',
    'How long does a business move take?',
    'Hur mycket kostar en företagsflytt?'
  ]){
    assert.equal(mainioBusinessMoveProcessQuestion(question),false,question);
  }
});

test('no company process answer without approved same-host exact-page source evidence',()=>{
  assert.equal(mainioBusinessMoveProcessAnswer([],'miten yritysmuutossa edetään'),null);
  const variants=[
    {...approved,approved:false},
    {...approved,source_type:'manual'},
    {...approved,source_url:'https://other-movers.example/yritysmuutot'},
    {...approved,source_url:'http://www.mainiomuuttopalvelu.fi/yritysmuutot'},
    {...approved,source_url:'https://www.mainiomuuttopalvelu.fi/muuttajan-muistilistat'},
    {...approved,answer:'Mainio kehottaa ilmoittamaan erikoiskalusteista.'}
  ];
  for(const item of variants)
    assert.equal(mainioBusinessMoveProcessAnswer([item],'miten yritysmuutossa edetään'),null);
  assert.equal(mainioBusinessMoveProcessAnswer(rows,'paljonko pakun 3 tunnin vuokra maksaa'),null);
});
