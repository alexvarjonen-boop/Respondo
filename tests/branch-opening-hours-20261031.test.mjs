import test from 'node:test';
import assert from 'node:assert/strict';
import {generateGroundedAnswer} from '../server.mjs';
import {branchNameFromHoursRow} from '../branch-hours.mjs';
import {readFileSync} from 'node:fs';

const store=(id,name,hours)=>({
  id,category:'Aukioloajat',title:'Aukioloajat',answer:hours,
  keywords:['aukiolo','aukioloajat','opening hours'],
  source_type:'website',source_url:'https://stores.example/tavaratalot/'+name.toLowerCase()
});
const rows=[
  store('turku','Turku','Ma-Pe: 09:00–20:00 La: 09:00–18:00 Su: 11:00–17:00'),
  store('kaarina','Kaarina','Ma-Pe: 08:00–19:00 La: 10:00–16:00 Su: suljettu'),
  store('raisio','Raisio','Ma-Pe: 10:00–21:00 La: 10:00–19:00 Su: 12:00–16:00')
];

test('generic chain hours question asks which branch with clickable choices',async()=>{
  for(const [lang,message] of [
    ['fi','Mitkä ovat aukioloajat?'],
    ['en','What are your opening hours?'],
    ['sv','Vilka är era öppettider?']
  ]){
    const r=await generateGroundedAnswer({rows,message,lang,companyName:'Example stores'});
    assert.equal(r.handoff,false,JSON.stringify(r));
    assert.equal(r.intent,'Toimipisteen valinta');
    assert.deepEqual(r.branchChoices,['Kaarina','Raisio','Turku']);
    assert.doesNotMatch(r.answer,/09:00|08:00|10:00/);
  }
});

test('each specific branch is answered only from its own verified source',async()=>{
  const cases=[
    ['Turun myymälän aukioloajat?','turku','09:00 - 20:00','08:00 - 19:00'],
    ['Kaarinan myymälän aukioloajat?','kaarina','08:00 - 19:00','09:00 - 20:00'],
    ['Raision tavaratalon aukioloajat?','raisio','10:00 - 21:00','09:00 - 20:00'],
  ];
  for(const [message,id,expected,forbidden] of cases){
    const r=await generateGroundedAnswer({rows,message,lang:'fi',companyName:'Example stores'});
    assert.equal(r.handoff,false,message+': '+JSON.stringify(r));
    assert.deepEqual(r.sourceIds,[id],message);
    assert.match(r.answer,new RegExp(expected));
    assert.doesNotMatch(r.answer,new RegExp(forbidden));
  }
});

test('button choice after prompt resolves to the correct branch',async()=>{
  const history=[{question:'Mitkä ovat aukioloajat?',answer:'Minkä toimipisteen aukioloajat haluat tietää?'}];
  const r=await generateGroundedAnswer({rows,message:'Turku',lang:'fi',history});
  assert.equal(r.handoff,false,JSON.stringify(r));
  assert.deepEqual(r.sourceIds,['turku']);
  assert.match(r.answer,/Turku:/);
  assert.match(r.answer,/09:00 - 20:00/);
});

test('a weekday follow-up stays with previously chosen location',async()=>{
  const history=[
    {question:'Mitkä ovat aukioloajat?',answer:'Minkä toimipisteen aukioloajat haluat tietää?'},
    {question:'Kaarina',answer:'Kaarina: Maanantai: 08:00 - 19:00, Lauantai: 10:00 - 16:00.'}
  ];
  const r=await generateGroundedAnswer({rows,message:'Entä lauantaina?',lang:'fi',history});
  assert.equal(r.handoff,false,JSON.stringify(r));
  assert.deepEqual(r.sourceIds,['kaarina']);
  assert.match(r.answer,/Lauantai: 10:00 - 16:00/);
  assert.doesNotMatch(r.answer,/09:00 - 18:00/);
});

test('ambiguous or contradictory store hours are never borrowed from another branch',async()=>{
  const disputed=[...rows,store('turku-other','Turku','Ma-Pe: 07:00–18:00')];
  const r=await generateGroundedAnswer({rows:disputed,message:'Turun aukioloajat?',lang:'fi'});
  assert.equal(r.handoff,false,JSON.stringify(r));
  assert.match(r.answer,/ristiriita/);
  assert.deepEqual(r.sourceIds,[]);
  assert.doesNotMatch(r.answer,/09:00 - 20:00/);
});

test('single-company general hours continue to work without branch markers',async()=>{
  const simple=[{id:'general',category:'Aukioloajat',title:'Aukioloajat',answer:'Ma-Pe: 09:00–17:00',keywords:['aukiolo'],source_type:'profile'}];
  const r=await generateGroundedAnswer({rows:simple,message:'Mitkä ovat aukioloajat?',lang:'fi'});
  assert.equal(r.handoff,false,JSON.stringify(r));
  assert.equal(r.branchChoices,undefined);
  assert.match(r.answer,/09:00 - 17:00/);
});

test('only explicit location URLs or titled facts count as verified store branches',()=>{
  assert.equal(branchNameFromHoursRow(rows[0]),'Turku');
  assert.equal(branchNameFromHoursRow({title:'Aukioloajat',source_url:'https://stores.example/contact'}),'');
  assert.equal(branchNameFromHoursRow({title:'Aukioloajat: Raisio',source_type:'profile'}),'Raisio');
});

test('both real chat clients render branch choices as sendable buttons',()=>{
  const widget=readFileSync(new URL('../public/widget.js',import.meta.url),'utf8');
  const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
  assert.match(widget,/function renderBranchChoices\(items = \[\]\)/);
  assert.match(widget,/sendMessage\(name\)/);
  assert.match(widget,/renderBranchChoices\(data\.branchChoices \|\| \[\]\)/);
  assert.match(app,/result\.branchChoices/);
  assert.match(app,/form\.requestSubmit\(\)/);
});

test('choosing a Finnish branch preserves Finnish despite English UI fallback',async()=>{
  const history=[{question:'Mitkä ovat aukioloajat?',answer:'Minkä toimipisteen aukioloajat haluat tietää?'}];
  const r=await generateGroundedAnswer({rows,message:'Turku',lang:'en',history});
  assert.equal(r.handoff,false,JSON.stringify(r));
  assert.deepEqual(r.sourceIds,['turku']);
  assert.match(r.answer,/Turku: Maanantai:/);
  assert.doesNotMatch(r.answer,/Monday/);
});
