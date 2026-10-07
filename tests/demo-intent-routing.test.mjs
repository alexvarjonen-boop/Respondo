import test from 'node:test';
import assert from 'node:assert/strict';
import { generateGroundedAnswer } from '../server.mjs';
import { businessFactKind, essentialWebsiteCandidates, extractBusinessDocument } from '../website-knowledge.mjs';

test('shipping-cost question retrieves shipping policy instead of generic pricing',async()=>{
  const rows=[
    {
      id:'delivery-free',
      category:'Toimitus ja seuranta',
      title:'Toimitus',
      answer:'Free shipping available on orders over 280€',
      keywords:['toimitus','shipping','delivery'],
      source_type:'website',
      source_url:'https://example.fi/products/item',
    },
    {
      id:'product-price',
      category:'Tuotteet',
      title:'Example Putter',
      answer:'Tuote: Example Putter. Hinta: 199 EUR. Saatavuus: varastossa. Linkki: https://example.fi/products/item.',
      keywords:['tuote','putter'],
      source_type:'website',
      source_url:'https://example.fi/products/item',
    },
  ];

  const result=await generateGroundedAnswer({
    rows,
    message:'How much does shipping cost?',
    lang:'en',
  });

  assert.equal(result.handoff,false,JSON.stringify(result));
  assert.equal(result.intent,'Toimitus');
  assert.match(result.answer,/free shipping/i);
  assert.match(result.answer,/280/);
});

test('where are you located answers from an imported About-page base location',async()=>{
  const rows=[
    {
      id:'location-1',
      category:'Sijainti ja myymälät',
      title:'Sijainti ja myymälät',
      answer:'From our home base in Turku, Finland, we are building a brand that combines Finnish craftsmanship and a passion for golf.',
      keywords:['sijainti','location','store'],
      source_type:'website',
      source_url:'https://example.fi/about',
    },
  ];

  const result=await generateGroundedAnswer({
    rows,
    message:'Where are you located?',
    lang:'en',
  });

  assert.equal(result.handoff,false,JSON.stringify(result));
  assert.equal(result.intent,'Sijainti');
  assert.equal(result.answer,'We are based in Turku, Finland.');
});

test('ambiguous safety question asks a useful clarification instead of requesting contact details',async()=>{
  const rows=[
    {
      id:'product-1',
      category:'Tuotteet',
      title:'Example Putter',
      answer:'Tuote: Example Putter. Hinta: 199 EUR. Linkki: https://example.fi/products/item.',
      keywords:['tuote','putter'],
      source_type:'website',
      source_url:'https://example.fi/products/item',
    },
  ];

  const result=await generateGroundedAnswer({
    rows,
    message:'Is this safe?',
    history:[{question:'What do you sell?',answer:'We sell golf equipment.'}],
    lang:'en',
  });

  assert.equal(result.handoff,false,JSON.stringify(result));
  assert.equal(result.intent,'Clarification');
  assert.match(result.answer,/product.*safe|safe.*product/i);
  assert.match(result.answer,/ordering.*payment|payment.*ordering/i);
});

test('About-page home base sentence is imported as location knowledge',()=>{
  assert.equal(
    businessFactKind(
      'From our home base in Turku, Finland, we are building a brand that combines Finnish craftsmanship and a passion for golf.',
      'About Us',
    ),
    'location',
  );

  const doc=extractBusinessDocument(
    '<h2>About Us</h2><p>From our home base in Turku, Finland, we are building a brand that combines Finnish craftsmanship and a passion for golf.</p>',
    'https://example.fi/about',
  );
  const rows=essentialWebsiteCandidates({pageDocuments:[doc],products:[]});
  assert.ok(rows.some((row)=>row.category==='Sijainti ja myymälät' && /Turku, Finland/i.test(row.answer)),JSON.stringify(rows));
});


test('Swedish e-postadress wording resolves the verified email instead of location',async()=>{
  const rows=[
    {
      id:'email-1',
      category:'Yhteystiedot',
      title:'Sähköposti',
      answer:'turku@mroom.fi',
      keywords:['yhteystiedot','contact','kontakt'],
      source_type:'website',
      source_url:'https://mroom.com/fi/parturit/turku/maariankatu/',
    },
    {
      id:'location-1',
      category:'Sijainti ja myymälät',
      title:'Osoite',
      answer:'Maariankatu 3, 20100 Turku',
      keywords:['sijainti','osoite','location'],
      source_type:'website',
      source_url:'https://mroom.com/fi/parturit/turku/maariankatu/',
    },
  ];

  for(const message of ['Vad är er e-postadress?','Vilken e-postadress har ni?','Hur kontaktar jag er via e-post?']){
    const result=await generateGroundedAnswer({rows,message,lang:'sv'});
    assert.equal(result.handoff,false,message+' '+JSON.stringify(result));
    assert.equal(result.intent,'Yhteystiedot');
    assert.match(result.answer,/turku@mroom\.fi/i);
    assert.doesNotMatch(result.answer,/20100|Turku|Åbo/i);
  }
});

test('specific location import combines street and postal code and rejects sibling location facts',()=>{
  const targetUrl='https://mroom.com/fi/parturit/turku/maariankatu/';
  const target=extractBusinessDocument(
    '<h1>Maariankatu</h1><p>Maariankatu 3</p><p>20100 Turku</p><p>turku@mroom.fi</p><p>ma 11:00 - 19:00</p>',
    targetUrl,
  );
  const sibling=extractBusinessDocument(
    '<h1>Kamppi</h1><p>Fredrikinkatu 63</p><p>00100 Helsinki</p><p>helsinki@example.fi</p><p>Mon 09:00 - 21:00</p>',
    'https://mroom.com/en/barbers/helsinki/kamppi/',
  );
  const rows=essentialWebsiteCandidates({
    finalUrl:targetUrl,
    products:[],
    pageDocuments:[target,sibling],
  });
  const text=rows.map((row)=>row.title+' '+row.answer).join('\n');
  assert.match(text,/Maariankatu 3,\s*20100 Turku/i);
  assert.match(text,/turku@mroom\.fi/i);
  assert.match(text,/11:00\s*[-–]\s*19:00/i);
  assert.doesNotMatch(text,/Fredrikinkatu|00100 Helsinki|helsinki@example\.fi|21:00/i);
});
