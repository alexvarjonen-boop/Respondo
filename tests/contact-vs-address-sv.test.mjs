import test from 'node:test';
import assert from 'node:assert/strict';
import { generateGroundedAnswer, queryTopic } from '../server.mjs';

const rows=[
  {
    id:'email',
    category:'Yhteystiedot',
    title:'Sähköposti',
    answer:'turku@mroom.fi',
    keywords:['sähköposti','email','e-post'],
    source_type:'website',
    source_url:'https://mroom.com/fi/parturit/turku/maariankatu/',
  },
  {
    id:'address',
    category:'Sijainti ja myymälät',
    title:'Osoite',
    answer:'Maariankatu 3, 20100 Turku',
    keywords:['osoite','address','adress'],
    source_type:'website',
    source_url:'https://mroom.com/fi/parturit/turku/maariankatu/',
  },
];

test('Swedish e-postadress is contact intent, never street-address intent',async()=>{
  assert.equal(queryTopic('Vad är er e-postadress?'),'contact');
  const result=await generateGroundedAnswer({
    companyName:'M Room Maariankatu',
    rows,
    message:'Vad är er e-postadress?',
    history:[],
    lang:'sv',
  });
  assert.equal(result.handoff,false);
  assert.equal(result.intent,'Yhteystiedot');
  assert.match(result.answer,/turku@mroom\.fi/i);
  assert.doesNotMatch(result.answer,/Maariankatu|20100|Åbo/i);
});

test('Swedish physical address question still routes to location',async()=>{
  assert.equal(queryTopic('Vad är er adress?'),'stores');
  const result=await generateGroundedAnswer({
    companyName:'M Room Maariankatu',
    rows,
    message:'Vad är er adress?',
    history:[],
    lang:'sv',
  });
  assert.equal(result.handoff,false);
  assert.equal(result.intent,'Sijainti');
  assert.match(result.answer,/Maariankatu 3|20100 Turku/i);
});


test('common Swedish address wording returns one complete address without duplicating the street',async()=>{
  const locationRows=[
    {
      id:'street',
      category:'Sijainti ja myymälät',
      title:'Osoite',
      answer:'Hallituskatu 11',
      keywords:['osoite','address','adress'],
      source_type:'website',
      source_url:'https://www.turkishbarber.fi/',
    },
    {
      id:'full-address',
      category:'Sijainti ja myymälät',
      title:'Osoite',
      answer:'Hallituskatu 11, 33200 Tampere',
      keywords:['osoite','address','adress'],
      source_type:'website',
      source_url:'https://www.turkishbarber.fi/contacts/',
    },
    {
      id:'postal',
      category:'Sijainti ja myymälät',
      title:'Osoite',
      answer:'33200 Tampere',
      keywords:['osoite','address','adress'],
      source_type:'website',
      source_url:'https://www.turkishbarber.fi/contacts/',
    },
  ];
  for(const message of ['Vad har ni för adress?','Var ligger ni?','Var hittar jag er?']){
    assert.equal(queryTopic(message),'stores',message);
    const result=await generateGroundedAnswer({
      companyName:'Turkish Barber Shop',
      rows:locationRows,
      message,
      history:[],
      lang:'sv',
    });
    assert.equal(result.handoff,false,message);
    assert.match(result.answer,/Hallituskatu 11, 33200 Tampere/i);
    assert.doesNotMatch(result.answer,/Hallituskatu 11,\s*Hallituskatu 11/i);
  }
});
