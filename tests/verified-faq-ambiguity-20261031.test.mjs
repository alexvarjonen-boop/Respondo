import test from 'node:test';
import assert from 'node:assert/strict';
import { generateGroundedAnswer } from '../server.mjs';

const question = 'Can visitors bring pets inside the museum?';
const make = (id, title, answer) => ({
  id, category:'Usein kysytyt', title, answer,
  source_type:'website', source_url:'https://museum.example/faq',
  keywords:['visitors','pets','museum','rules']
});

test('never choose an arbitrary answer when two verified FAQs contradict each other', async () => {
  const rows=[
    make('yes',question,'Yes. Visitors may bring pets inside the museum.'),
    make('no',question,'No. Visitors may not bring pets inside the museum.')
  ];
  const result=await generateGroundedAnswer({rows,message:question,lang:'en',companyName:'Test Museum'});
  assert.equal(result.handoff,true,JSON.stringify(result));
  assert.equal(result.answer,'');
  assert.equal(result.confidence,0.2);
  assert.deepEqual(result.sourceIds,[]);
});

test('the same published FAQ repeated on another page does not create a false conflict', async () => {
  const rows=[
    make('a',question,'No. Pets are not permitted in the museum.'),
    {...make('b',question,'No. Pets are not permitted in the museum.'),source_url:'https://museum.example/visiting'}
  ];
  const result=await generateGroundedAnswer({rows,message:question,lang:'en',companyName:'Test Museum'});
  assert.equal(result.handoff,false,JSON.stringify(result));
  assert.match(result.answer,/not permitted/i);
});

test('different published questions do not create invented conflicts', async () => {
  const rows=[
    make('a',question,'No. Pets are not permitted in the museum.'),
    make('b','Can visitors bring bags inside the museum?','Yes. Visitors may bring bags inside the museum.')
  ];
  const result=await generateGroundedAnswer({rows,message:question,lang:'en',companyName:'Test Museum'});
  assert.equal(result.handoff,false,JSON.stringify(result));
  assert.match(result.answer,/pets are not permitted/i);
});
