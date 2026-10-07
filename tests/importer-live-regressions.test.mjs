import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { queryTopic } from '../server.mjs';
import { classifyIntentByGrammar } from '../intent-utterances.mjs';
import { essentialWebsiteProfile, essentialWebsiteCandidates, extractBusinessDocument } from '../website-knowledge.mjs';

test('Swedish e-postadress is contact, never physical address',()=>{
  assert.equal(classifyIntentByGrammar('Vad är er e-postadress?'),'contact');
  assert.equal(queryTopic('Vad är er e-postadress?'),'contact');
});

test('profile combines street and postal locality from the same source page',()=>{
  const bundle={
    finalUrl:'https://example.fi/store/turku',
    products:[],
    pageDocuments:[{
      url:'https://example.fi/store/turku',
      blocks:[
        {text:'Maariankatu 3',heading:'Osoite'},
        {text:'20100 Turku',heading:'Osoite'},
      ],
      links:[],
      products:[],
      text:'Maariankatu 3\n20100 Turku',
    }],
  };
  const profile=essentialWebsiteProfile(bundle);
  assert.match(profile.address,/Maariankatu 3/i);
  assert.match(profile.address,/20100 Turku/i);
});

test('marketing guarantee verb is not imported as warranty',()=>{
  const html='<main><p>Our cheerful team guarantees a good vibe and a clean result.</p><p>Haircuts and beard services are available.</p></main>';
  const doc=extractBusinessDocument(html,'https://example.fi/');
  const candidates=essentialWebsiteCandidates({finalUrl:'https://example.fi/',products:[],pageDocuments:[doc]});
  assert.ok(!candidates.some((row)=>row.category==='Takuu'),JSON.stringify(candidates));
});

test('location-detail crawl explicitly rejects sibling branch paths',()=>{
  const server=fs.readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
  assert.match(server,/locationDetailSeed/);
  assert.match(server,/hasSameFamily && !sameDetail/);
  assert.match(server,/sibling location facts/);
});
