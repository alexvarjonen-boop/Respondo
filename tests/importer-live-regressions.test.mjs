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


test('physical address questions ignore e-invoicing identifiers',async()=>{
  const rows=[
    {id:'1',category:'Sijainti ja myymälät',title:'Osoite',answer:'E-invoicing address: 003726574803 Operator: Apix Messaging Oy (003723327487)',keywords:['address'],source_type:'website',source_url:'https://example.fi/contact'},
    {id:'2',category:'Sijainti ja myymälät',title:'Osoite',answer:'Maariankatu 3',keywords:['osoite'],source_type:'website',source_url:'https://example.fi/store'},
    {id:'3',category:'Sijainti ja myymälät',title:'Osoite',answer:'20100 Turku',keywords:['osoite'],source_type:'website',source_url:'https://example.fi/store'},
  ];
  const result=await (await import('../server.mjs')).generateGroundedAnswer({companyName:'Example',rows,message:'Mikä teidän osoite on?',history:[],lang:'fi'});
  assert.equal(result.handoff,false);
  assert.match(result.answer,/Maariankatu 3/);
  assert.match(result.answer,/20100 Turku/);
  assert.doesNotMatch(result.answer,/invoice|Apix|003726574803/i);
});

test('feedback headings and membership counts do not become returns or opening hours',()=>{
  const bundle={
    finalUrl:'https://example.fi/',
    products:[],
    pageDocuments:[{
      url:'https://example.fi/',
      blocks:[
        {text:'M Room location my feedback concerns:',heading:'Palautteet'},
        {text:'Gold includes 15–20 services per year and is redeemable Monday–Wednesday.',heading:'Memberships'},
      ],
      links:[],products:[],text:''
    }],
  };
  const candidates=essentialWebsiteCandidates(bundle);
  assert.ok(!candidates.some((row)=>row.category==='Palautukset ja vaihdot'),JSON.stringify(candidates));
  assert.ok(!candidates.some((row)=>row.category==='Aukioloajat'),JSON.stringify(candidates));
});



test('direct English and Swedish haircut questions are grounded in imported services',async()=>{
  const { generateGroundedAnswer }=await import('../server.mjs');
  const rows=[
    {id:'svc',category:'Palvelut',title:'Palvelut: M Cut',answer:'M Cut on ylläpitävä hiustenleikkaus.',keywords:['hiustenleikkaus'],source_type:'website',source_url:'https://example.fi/services'},
  ];
  for(const [lang,message,expected] of [
    ['en','Do you cut hair?',/haircut/i],
    ['en','Do you offer a normal haircut?',/haircut/i],
    ['sv','Klipper ni hår?',/hår|klipp/i],
    ['sv','Har ni vanlig hårklippning?',/hårklipp/i],
  ]){
    const result=await generateGroundedAnswer({companyName:'Example',rows,message,history:[],lang});
    assert.equal(result.handoff,false,message+' '+JSON.stringify(result));
    assert.match(result.answer,expected,message+' '+result.answer);
  }
});

test('generic haircut price follow-ups prefer the base service over add-ons in all languages',async()=>{
  const { generateGroundedAnswer }=await import('../server.mjs');
  const rows=[
    {id:'svc',category:'Palvelut',title:'Palvelut: M Cut',answer:'M Cut on ylläpitävä hiustenleikkaus.',keywords:['hiustenleikkaus','M Cut'],source_type:'website',source_url:'https://example.fi/prices'},
    {id:'base',category:'Hinnat',title:'Hinnat: M Cut: 36 €',answer:'M Cut: 36 €',keywords:['hinta','maksaa'],source_type:'website',source_url:'https://example.fi/prices'},
    {id:'addon',category:'Hinnat',title:'Hinnat: M Razor: 7 €',answer:'M Razor -lisäpalvelu hiuksiin: 7 €',keywords:['hinta','maksaa'],source_type:'website',source_url:'https://example.fi/prices'},
  ];
  const cases=[
    ['fi','Leikkaatteko hiuksia?','Kyllä, leikkaamme hiuksia.','Paljonko se maksaa?'],
    ['en','Do you cut hair?','Yes, we cut hair.','How much does that cost?'],
    ['sv','Klipper ni hår?','Ja, vi klipper hår.','Vad kostar det?'],
  ];
  for(const [lang,question,answer,message] of cases){
    const result=await generateGroundedAnswer({
      companyName:'Example',
      rows,
      message,
      history:[{question,answer}],
      lang,
    });
    assert.equal(result.handoff,false,lang+' '+JSON.stringify(result));
    assert.match(result.answer,/36\s*€/i,lang+' '+result.answer);
    assert.doesNotMatch(result.answer,/7\s*€/i,lang+' '+result.answer);
  }
});

test('Finnish where-are-you phrasing uses the full verified physical address',async()=>{
  const { generateGroundedAnswer }=await import('../server.mjs');
  const rows=[
    {id:'street',category:'Sijainti ja myymälät',title:'Osoite',answer:'Maariankatu 3',keywords:['osoite'],source_type:'website',source_url:'https://example.fi/store'},
    {id:'postal',category:'Sijainti ja myymälät',title:'Osoite',answer:'20100 Turku',keywords:['osoite'],source_type:'website',source_url:'https://example.fi/store'},
  ];
  const result=await generateGroundedAnswer({
    companyName:'Example',rows,message:'Missä te sijaitsette?',history:[],lang:'fi'
  });
  assert.equal(result.handoff,false);
  assert.match(result.answer,/Maariankatu 3/);
  assert.match(result.answer,/20100 Turku/);
});

test('location-detail crawl explicitly rejects sibling branch paths',()=>{
  const server=fs.readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
  assert.match(server,/locationDetailSeed/);
  assert.match(server,/hasSameFamily && !sameDetail/);
  assert.match(server,/hasSameFamily && !sameDetail/);
});


test('inline email anchor does not swallow the following physical address',()=>{
  const html='<section><h4>Sijainti</h4><p><a href="mailto:info@turkishbarber.fi">info@turkishbarber.fi</a>Hallituskatu 11, 33200 Tampere, Suomi</p><p><a href="tel:+358505774490">+358 50 5774490</a></p></section>';
  const doc=extractBusinessDocument(html,'https://example.fi/');
  const candidates=essentialWebsiteCandidates({finalUrl:'https://example.fi/',products:[],pageDocuments:[doc]});
  const profile=essentialWebsiteProfile({finalUrl:'https://example.fi/',products:[],pageDocuments:[doc]});
  assert.equal(profile.email,'info@turkishbarber.fi');
  assert.match(profile.address,/Hallituskatu\s*11/);
  assert.match(profile.address,/33200\s+Tampere/);
  assert.match(profile.phone,/358\s*50\s*5774490/);
  assert.ok(!candidateTextForTest(candidates).includes('fiHallituskatu'));
});

function candidateTextForTest(candidates){
  return candidates.map((x)=>String(x.title||'')+' '+String(x.answer||'')).join('\n');
}

test('template demo products and placeholder contacts never become imported knowledge',()=>{
  const fakeProduct={
    name:'Herbal Essence Oil',
    url:'https://example.fi/product/herbal-essence-oil/',
    price:55,
    currency:'USD',
    description:'Lorem ipsum dolor sit amet, consectetur adipisicing elit.',
  };
  const fakeDoc={
    url:'https://example.fi/how-to-find-a-top-notch-barbershop-2/',
    blocks:[
      {text:'admin@example.com',heading:'Contact'},
      {text:'128 Winston st, New York, NY 05120',heading:'Location'},
    ],
    links:[],
    products:[fakeProduct],
    text:'admin@example.com 128 Winston st, New York, NY 05120 Lorem ipsum dolor sit amet',
  };
  const candidates=essentialWebsiteCandidates({
    finalUrl:'https://example.fi/',
    products:[fakeProduct],
    pageDocuments:[fakeDoc],
  });
  const text=candidateTextForTest(candidates);
  assert.doesNotMatch(text,/lorem ipsum|admin@example\.com|128 Winston|Herbal Essence Oil/i);
});

test('English direct haircut answer is natural and not duplicated',async()=>{
  const { generateGroundedAnswer }=await import('../server.mjs');
  const rows=[
    {id:'svc',category:'Palvelut',title:'Palvelut: M Cut',answer:'M Cut on ylläpitävä hiustenleikkaus.',keywords:['hiustenleikkaus'],source_type:'website',source_url:'https://example.fi/services'},
  ];
  const result=await generateGroundedAnswer({companyName:'Example',rows,message:'Do you cut hair?',history:[],lang:'en'});
  assert.equal(result.handoff,false);
  assert.equal(result.answer,'Yes, we offer haircuts.');
});


test('concatenated rendered contact text still yields the real email and physical address',()=>{
  const doc={
    url:'https://example.fi/',
    blocks:[{text:'info@turkishbarber.fiHallituskatu 11, 33200 Tampere, Suomi',heading:'Yhteystiedot'}],
    links:[],
    products:[],
    text:'info@turkishbarber.fiHallituskatu 11, 33200 Tampere, Suomi',
  };
  const bundle={finalUrl:'https://example.fi/',products:[],pageDocuments:[doc]};
  const candidates=essentialWebsiteCandidates(bundle);
  const profile=essentialWebsiteProfile(bundle);
  const text=candidateTextForTest(candidates);
  assert.equal(profile.email,'info@turkishbarber.fi');
  assert.match(text,/Hallituskatu\s*11/i);
  assert.match(text,/33200\s+Tampere/i);
  assert.match(profile.address,/Hallituskatu\s*11/i);
  assert.match(profile.address,/33200\s+Tampere/i);
  assert.doesNotMatch(text,/fiHallituskatu/i);
});

test('template-dominated catalog never adds a storefront link to a service business',()=>{
  const fake=(name)=>({name,url:'https://example.fi/product/'+name.toLowerCase().replace(/\s+/g,'-')+'/',price:55,currency:'USD',description:'Lorem ipsum dolor sit amet.'});
  const root={
    url:'https://example.fi/',
    blocks:[{text:'Hiustenleikkaus 25 €',heading:'Palvelut ja hinnat'}],
    links:[{url:'https://example.fi/shop/',label:'Shop',context:''}],
    products:[],
    text:'Hiustenleikkaus 25 €',
  };
  const bundle={finalUrl:'https://example.fi/',products:[fake('Demo One'),fake('Demo Two'),fake('Demo Three')],pageDocuments:[root]};
  const candidates=essentialWebsiteCandidates(bundle);
  const text=candidateTextForTest(candidates);
  assert.doesNotMatch(text,/Tuotekatalogi|\/shop\//i);
});
