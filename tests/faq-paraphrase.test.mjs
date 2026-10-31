import test from 'node:test';
import assert from 'node:assert/strict';
import {faqParaphraseEvidence} from '../faq-paraphrase-evidence.mjs';
import {generateGroundedAnswer} from '../server.mjs';

const groups=[
  {
    name:'pet-permission inside',
    titles:['Can visitors bring pets inside the museum?','Are animals permitted indoors?','Får man ta med husdjur inomhus?','Saako lemmikkejä tuoda sisälle?'],
    questions:['Are dogs allowed inside?','Can we take a cat indoors?','Saako koiran tuoda sisälle?','Får jag ta med en hund inomhus?']
  },{
    name:'pet-permission terrace',
    titles:['Can visitors bring pets to the terrace?','Are animals allowed outdoors?','Saako lemmikkejä tuoda terassille?','Får man ta med husdjur utomhus?'],
    questions:['Are cats allowed outside?','Can we bring a dog to the terrace?','Saako koiran tuoda terassille?','Får jag ta med en hund på terrassen?']
  },{
    name:'wheelchair accessibility',
    titles:['Is the building wheelchair accessible?','Onko museoon esteetön pääsy?','Är lokalen tillgänglig för rullstol?'],
    questions:['Can wheelchair users enter?','Onko paikka esteetön?','Är lokalen tillgänglig med rullstol?']
  },{
    name:'stroller permission',
    titles:['Are strollers allowed inside?','Saako lastenvaunut tuoda sisälle?','Får man ta med barnvagn?'],
    questions:['Can I bring a stroller?','Saako rattaat ottaa mukaan?','Får jag ta med en barnvagn?']
  },{
    name:'photography permission',
    titles:['Can visitors take photos?','Saako täällä valokuvata?','Får man fotografera?'],
    questions:['Are photos allowed?','Voiko täällä ottaa kuvia?','Kan jag fotografera?']
  }
];
for(const group of groups){
  for(const publishedQuestion of group.titles){
    for(const visitorQuestion of group.questions){
      test('paraphrase '+group.name+': '+visitorQuestion+' / '+publishedQuestion,()=>{
        assert.ok(faqParaphraseEvidence(visitorQuestion,publishedQuestion), 'expected conservative concept evidence');
      });
    }
  }
}
const counterexamples=[
  ['Can I bring my dog inside?','Can I bring my cat inside?'],
  ['Are pets allowed indoors?','Can I bring my dog indoors?'],
  ['Can I take my dog outside?','Can I bring my pet indoors?'],
  ['Saako kissan tuoda sisään?','Saako koiran tuoda terassille?'],
  ['Is parking free?','Is parking available?'],
  ['Can I charge my electric car?','Is parking free?'],
  ['Do you allow pets?','Can we take photos?'],
  ['Can I photograph the building?','Is the museum wheelchair accessible?'],
  ['What are your opening hours?','Can I bring pets inside?'],
  ['Can I bring my stroller?','Can I bring my dog?'],
  ['Is a smoking terrace available?','Can I bring my pet to the terrace?'],
  ['Can I take my dog inside, except on Saturdays?','Can visitors bring pets inside?'],
  ['Can I bring dogs inside?','Dogs are allowed outside only?'],
  ['What is the warranty on electric products?','Is wheelchair access available?']
];
for(const [question,title] of counterexamples){
  test('does not conflate policies: '+question+' / '+title,()=>{
    assert.equal(faqParaphraseEvidence(question,title),null);
  });
}
const faq=(id,title,answer)=>({
  id,category:'Usein kysytyt',title,answer,
  source_type:'website',source_url:'https://museum.example/faq',
  keywords:['faq','visitors','rules']
});
const question='Can visitors bring pets inside the museum?';
test('real grounded answer engine resolves an English paraphrase with source IDs',async()=>{
  const rows=[faq('pets',question,'No. Pets are not permitted inside the museum.')];
  const response=await generateGroundedAnswer({
    companyName:'Example Museum',rows,lang:'en',message:'Are dogs allowed inside?',history:[]
  });
  assert.equal(response.handoff,false);
  assert.match(response.answer,/pets are not permitted/i);
  assert.deepEqual(response.sourceIds,['pets']);
});
test('grounded answer engine rejects contradicting equivalent FAQ headlines',async()=>{
  const rows=[
    faq('deny','Can visitors bring pets inside the museum?','No. Pets are not permitted inside the museum.'),
    faq('allow','Are animals allowed indoors?','Yes. Animals are welcome inside our museum.')
  ];
  const response=await generateGroundedAnswer({
    companyName:'Example Museum',rows,lang:'en',message:'Are dogs allowed inside?',history:[]
  });
  assert.equal(response.handoff,true);
  assert.deepEqual(response.sourceIds,[]);
});
test('approved FAQ on terrace cannot assert an indoor pet policy',async()=>{
  const rows=[faq('outdoor','Can visitors bring pets to the terrace?','Yes. Dogs are allowed outside on the terrace.')];
  const response=await generateGroundedAnswer({
    companyName:'Example Museum',rows,lang:'en',message:'Are dogs allowed inside?',history:[]
  });
  assert.ok(response.handoff || !/allowed outside on the terrace/i.test(response.answer));
});
