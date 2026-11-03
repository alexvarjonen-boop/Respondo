// Deterministic language and phrasing audit for Mainio's source-grounded
// business process FAQ. No mocked AI provider, fabricated bookings, or
// production customer data: each expression exercises the same resolver
// used by the signed-in preview and customer widget.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mainioBusinessMoveProcessQuestion} from '../mainio-business-move-process.mjs';
import {mainioPublicFactAnswer} from '../mainio-public-fact-answer.mjs';
import {mainioVerifiedHandoverAnswer} from '../mainio-handover-guards.mjs';
import {mainioOfficialPublicFacts} from '../mainio-official-public-facts.mjs';
import {mainioBookingStatusQuestion,mainioBookingStatusReply} from '../mainio-moving-intake.mjs';

const rows=mainioOfficialPublicFacts();
const approved=rows.find(row=>row.title==='Yritysmuuton eteneminen');
assert.ok(approved,'approved company-move source must exist');

const normalized=s=>String(s).toLowerCase().replace(/[!?.,:–]/g,'').trim();
const auditPositive=(question,lang='fi',previous='')=>{
  assert.equal(mainioBusinessMoveProcessQuestion(question,previous),true,
    'MISS '+lang+' '+JSON.stringify(question));
  const answer=mainioPublicFactAnswer(rows,question,lang,previous);
  assert.ok(answer&&!answer.handoff,'NO_ANSWER '+lang+' '+JSON.stringify(question));
  assert.equal(answer.intent,'Yritysmuuton eteneminen',question);
  assert.equal(answer.verified,true,question);
  assert.deepEqual(answer.sourceIds,[approved.id],question);
  assert.ok(answer.answer.length>180&&answer.answer.length<650,question);
  const phrases={fi:['suunnittelu- ja arviokäynnillä','muuttovastaavan','pakkaustarvikkeet'],
    sv:['planerings- och uppskattningsbesök','flyttansvarig','förpackningsmaterial'],
    en:['planning and assessment visit','move coordinator','packing materials']};
  for(const phrase of phrases[lang])assert.ok(answer.answer.includes(phrase),lang+' '+question+' '+phrase);
};

const fiSubjects=[
  'yritysmuutto','yritysmuutossa','yritysmuuton','toimistomuutto',
  'toimistomuutossa','toimistomuuton','konttorimuutto','firman muutto',
  'yrityksen muutto','yrityksemme muutto','firmamme muutto',
  'toimiston muutto','toimitilojen muutto','liiketilan muutto',
  'toimiston siirto','toimistomuuttoa','yritys muutto',
];
const fiForms=[
  s=>'Miten '+s+' etenee?',
  s=>'Miten '+s+' hoidetaan?',
  s=>'Kuinka '+s+' järjestetään?',
  s=>'Mitä vaiheita '+s+' sisältää?',
  s=>'Kerro '+s+' prosessi.',
  s=>'Miten '+s+' sujuu käytännössä?',
  s=>'Millä tavalla '+s+' etenee?',
  s=>'Miten te toteutatte '+s+'?',
  s=>'Mistä '+s+' aloitetaan?',
  s=>'Mitäs '+s+', miten se menee?',
  s=>'Miten '+s+' toimii?',
];
const svSubjects=[
  'företagsflytt','företagsflytten','kontorsflytt','kontorsflytten',
  'verksamhetsflytt','flytt av företaget','flytt av kontoret',
  'flytta kontoret','företaget flyttar',
];
const svForms=[
  s=>'Hur går '+s+' till?',
  s=>'Hur fungerar '+s+'?',
  s=>'Hur ordnar ni '+s+'?',
  s=>'Vilka steg ingår i '+s+'?',
  s=>'Vad är processen för '+s+'?',
  s=>'Hur sköter ni '+s+'?',
  s=>'Hur genomför ni '+s+'?',
  s=>'Vad händer vid '+s+'?',
];
const enSubjects=[
  'business move','company move','office move','corporate relocation',
  'office relocation','moving offices','moving our office',
  'relocating our company','moving a business','relocating an office',
];
const enForms=[
  s=>'How does '+s+' work?',
  s=>'What are the steps for '+s+'?',
  s=>'What is the process for '+s+'?',
  s=>'How do you handle '+s+'?',
  s=>'How is '+s+' organized?',
  s=>'Can you explain how '+s+' works?',
  s=>'What happens during '+s+'?',
  s=>'How do you arrange '+s+'?',
];
const wrappers={
 fi:[q=>q,q=>'Hei, '+q,q=>'Moi! '+q,q=>'Kysymys: '+q,q=>'Voisitko kertoa: '+q,q=>'Pikainen kysymys, '+q],
 sv:[q=>q,q=>'Hej! '+q,q=>'En fråga: '+q,q=>'Skulle du kunna förklara: '+q],
 en:[q=>q,q=>'Hi, '+q,q=>'Quick question: '+q,q=>'Could you explain: '+q]
};

test('thousands of distinct colloquial and formal process questions return the SAME correct source-backed answer (FI/SV/EN)',()=>{
  const groups=[
    ['fi',fiSubjects,fiForms],
    ['sv',svSubjects,svForms],
    ['en',enSubjects,enForms],
  ];
  const seen=new Set();
  const counts={fi:0,sv:0,en:0};
  for(const [lang,subjects,forms] of groups)
    for(const subject of subjects)for(const form of forms)
      for(const wrap of wrappers[lang]){
        const question=wrap(form(subject));
        const key=lang+'|'+normalized(question);
        if(seen.has(key))continue;
        seen.add(key);
        auditPositive(question,lang);
        counts[lang]++;
      }
  assert.ok(counts.fi>=1000,JSON.stringify(counts));
  assert.ok(counts.sv>=250,JSON.stringify(counts));
  assert.ok(counts.en>=300,JSON.stringify(counts));
  assert.ok(seen.size>=1550,JSON.stringify(counts));
});

test('real Finnish slang, inflections, speech-to-text quirks and typos still identify intent',()=>{
  const questions=[
    'mites yritysmuutto menee käytännössä',
    'mite yritysmuutossa edetään',
    'miten yritysmuuto hoidetaan',
    'miten toimisto muutto etenee',
    'kuis yritysmuutto sujuu',
    'millä tavalla firman muutto onnistuu käytännössä',
    'miten yrityksen muutto hoidetaan',
    'miten firman muutossa edetään',
    'millai toimiston siirto etenee',
    'mitenkäs yritysmuutto etenee',
    'Mitä vaiheita toimistomuutossa on?',
    'Mites te hoidatte yritysmuuton?',
  ];
  for(const question of questions)auditPositive(question);
});

test('short follow-up context: 3 languages and punctuation, without copying unrelated topics',()=>{
  const valid=[
    ['fi','miten se etenee?','Meille on tulossa yritysmuutto.'],
    ['fi','no miten se menee?','Tarvitsisimme toimistomuuton.'],
    ['fi','ja miten homma sujuu?','yrityksen muutto'],
    ['fi','mitkä sen vaiheet?','firman muutto'],
    ['sv','Hur går det till?','Vi funderar på en företagsflytt.'],
    ['sv','Hur fungerar det?','Vi planerar en kontorsflytt.'],
    ['en','How does it work?','We need an office relocation.'],
    ['en','What are the steps?','Moving our office is coming up.'],
  ];
  for(const [lang,question,previous] of valid)
    auditPositive(question,lang,previous);
  const invalid=[
    ['miten se etenee?','paljonko yritysmuutto maksaa?'],
    ['miten se etenee?','pakettiauton vuokra'],
    ['miten se etenee?','laatikoiden toimitus'],
    ['how does it work?','How much does an office move cost?'],
    ['Hur fungerar det?','Vad kostar en kontorsflytt?']
  ];
  for(const [q,p] of invalid)
    assert.equal(mainioBusinessMoveProcessQuestion(q,p),false,q+' | '+p);
});

test('false-positive controls: cost, dates, duration, bookings, availability and accessory rentals stay out of generic process',()=>{
  const negatives=[
    'Paljonko yritysmuutto maksaa?',
    'Miten yritysmuuton hinta muodostuu?',
    'Miten toimistomuutto hinnoitellaan?',
    'Miten yritysmuuton tarjouspyyntö tehdään?',
    'Onko yritysmuutto varattu huomiseksi?',
    'Miten yritysmuutto saadaan huomiseksi?',
    'Kuinka kauan yritysmuutto kestää?',
    'Miten toimistomuuton kesto arvioidaan?',
    'Milloin yritysmuutto alkaa?',
    'Miten yritysmuuttoon varataan pakettiauto?',
    'Miten muuttolaatikot toimitetaan yritysmuutossa?',
    'Miten yritysmuuton pakkaaminen tehdään?',
    'Miten yritysmuutossa pakataan arkaluontoiset asiakirjat?',
    'Miten toimistomuutto järjestetään ulkomaille?',
    'Pystyttekö hoitamaan yritysmuuton?',
    'Hoidatteko firman muutot?',
    'Tarjoatteko toimistomuuttoa?',
    'Onko yritysmuutto mahdollista?',
    'How much does an office relocation cost?',
    'How long does a company move take?',
    'When can we book an office move?',
    'How do you price a business move?',
    'Can you handle an office move?',
    'Do you offer corporate relocation?',
    'How do you book an office relocation?',
    'Hur mycket kostar en företagsflytt?',
    'Hur länge tar en kontorsflytt?',
    'När kan ni flytta företaget?',
    'Kan ni sköta en kontorsflytt?',
    'Hur bokar jag en företagsflytt?',
  ];
  const prefix=['','Hei, ','Moi, ','Hello, ','Hej, ','Kysymys: '];
  let count=0;
  for(const question of negatives)for(const before of prefix){
    const q=before+question;
    assert.equal(mainioBusinessMoveProcessQuestion(q),false,'WRONG_INTENT '+q);
    const answer=mainioPublicFactAnswer(rows,q,'fi');
    assert.notEqual(answer?.intent,'Yritysmuuton eteneminen','WRONG_ANSWER '+q);
    count++;
  }
  assert.equal(count,negatives.length*prefix.length);
});

test('general service capabilities are not misclassified as step-by-step process',()=>{
  const questions=[
    'teettekö yritysmuuttoja?',
    'hoidatteko toimistojen muutot?',
    'onnistuuko firman muutto?',
    'voiko yrityksen muuttaa teidän avulla?',
    'Can you move an office?',
    'Do you handle business moving?',
    'Can you relocate our office?',
    'Sköter ni företagsflyttar?',
    'Kan ni flytta kontoret?',
  ];
  for(const question of questions)
    assert.equal(mainioBusinessMoveProcessQuestion(question),false,question);
});

test('adjacent Mainio topics: selected rental/box facts keep their original source and do not become moving-process answers',()=>{
  const cases=[
    ['Mikä on pakettiauton omavastuu?','Pakettiautojen omavastuu',/1300/],
    ['Paljonko pakun omavastuu on?','Pakettiautojen omavastuu',/1300/],
    ['Voiko pakettiautoa ajaa B-kortilla?','Pakettiautojen ajokortti',/B-ajokortilla/],
    ['Onnistuuko pakun vuokraus yöksi?','Pakettiautojen yövuokraus',/asiakaspalvelu/],
    ['Paljonko pakettiauton 3 tunnin vuokra maksaa?','Paljonko pakettiauton 3 tunnin vuokra maksaa?',/50 euroa/],
    ['Paljonko pakun viiden tunnin vuokra maksaa?','Pakettiauton 5 tunnin vuokrahinnat',/70 euroa/],
    ['Paljonko muuttolaatikoiden vuokra maksaa?','Muuttolaatikoiden hinta',/0,20/],
    ['Mitkä ovat muuttolaatikoiden mitat?','Muuttolaatikoiden mitat',/600/],
    ['Paljonko laatikoiden toimitus maksaa?','Laatikoiden kuljetusmaksu',/25 euroa/],
    ['Montako muuttolaatikkoa tarvitsen 50 neliön asuntoon?','Kuinka monta muuttolaatikkoa tarvitsen?',/suuntaa-antava/],
    ['Voitteko toimittaa muuttolaatikot kotiin?','Laatikoiden toimitus ja palautus',/Toimitamme/],
  ];
  let checked=0;
  for(const [question,title,expected] of cases){
    for(const prefix of ['','Moi, ','Hei, ','Kysymys: ']){
      const q=prefix+question;
      assert.equal(mainioBusinessMoveProcessQuestion(q),false,q);
      const result=mainioPublicFactAnswer(rows,q,'fi');
      const row=rows.find(r=>r.title===title);
      assert.ok(result&&!result.handoff,q);
      assert.deepEqual(result.sourceIds,[row.id],q);
      assert.match(result.answer,expected,q);
      checked++;
    }
  }
  assert.equal(checked,cases.length*4);
});

test('booking state must never be treated as published availability or confirmation',()=>{
  const queries=[
    'Onko muutto jo varattu minulle?',
    'Onko pakettiauto huomenna vapaana?',
    'Onko firman muutto varmistettu ensi viikolle?',
  ];
  for(const q of queries){
    assert.equal(mainioBookingStatusQuestion(q),true,q);
    const reply=mainioBookingStatusReply('fi');
    assert.match(reply.answer,/En voi tarkistaa tästä chatista/);
    assert.equal(mainioBusinessMoveProcessQuestion(q),false);
  }
});

test('unapproved, other-company and edited source rows cannot produce confident business-process facts',()=>{
  const q='miten yrityksen muutto etenee';
  const variants=[
    [],
    [Object.assign({},approved,{approved:false})],
    [Object.assign({},approved,{source_url:'https://other.example/yritysmuutot'})],
    [Object.assign({},approved,{answer:'Ota yhteyttä asiakaspalveluun.'})],
  ];
  for(const set of variants){
    const result=mainioPublicFactAnswer(set,q,'fi');
    assert.notEqual(result?.intent,'Yritysmuuton eteneminen');
  }
  // Adjacent safety handler must not invent reservation availability or prices.
  assert.equal(mainioVerifiedHandoverAnswer(rows,'miten yrityksen muutto etenee','fi'),null);
});
