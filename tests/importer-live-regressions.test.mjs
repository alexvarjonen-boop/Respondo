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



test('direct Finnish, English and Swedish haircut questions are grounded in imported services',async()=>{
  const { generateGroundedAnswer }=await import('../server.mjs');
  const rows=[
    {id:'svc',category:'Palvelut',title:'Palvelut: M Cut',answer:'M Cut on ylläpitävä hiustenleikkaus.',keywords:['hiustenleikkaus'],source_type:'website',source_url:'https://example.fi/services'},
  ];
  for(const [lang,message,expected] of [
    ['fi','Leikkaatteko hiuksia?',/hiustenleikka|leikka/i],
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

test('natural Finnish haircut availability paraphrases use verified service evidence',async()=>{
  const { generateGroundedAnswer }=await import('../server.mjs');
  const rows=[
    {id:'svc',category:'Palvelut',title:'Palvelut: M Cut',answer:'M Cut on ylläpitävä hiustenleikkaus.',keywords:['hiustenleikkaus'],source_type:'website',source_url:'https://example.fi/services'},
  ];
  for(const message of ['Saako teiltä tavallisen hiustenleikkauksen?','Onnistuuko hiustenleikkaus?']){
    const result=await generateGroundedAnswer({companyName:'Example',rows,message,history:[],lang:'fi'});
    assert.equal(result.handoff,false,message+' '+JSON.stringify(result));
    assert.match(result.answer,/Kyllä|hiustenleikka/i,message+' '+result.answer);
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


test('returns heading requires a concrete return rule',()=>{
  const bundle={
    finalUrl:'https://example.fi/',
    products:[],
    pageDocuments:[{
      url:'https://example.fi/',
      blocks:[
        {text:'Memberships are available in Silver, Gold and Platinum tiers and can be purchased online.',heading:'Returns'},
        {text:'Unused products can be returned within 30 days with proof of purchase.',heading:'Returns'},
      ],
      links:[],products:[],text:''
    }],
  };
  const rows=essentialWebsiteCandidates(bundle).filter((row)=>row.category==='Palautukset ja vaihdot');
  assert.equal(rows.length,1,JSON.stringify(rows));
  assert.match(rows[0].answer,/30 days/i);
  assert.doesNotMatch(rows[0].answer,/Memberships/i);
});

test('crawler prioritizes contacts and excludes template/archive routes',()=>{
  const server=fs.readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
  assert.match(server,/Essentials outrank product detail pages/);
  assert.match(server,/product-tag\|product-category/);
  assert.match(server,/home\[-_\]\?\\d\+/);
  assert.ok(server.indexOf('return 300;')>=0);
  assert.ok(server.indexOf('return 180;')>server.indexOf('return 300;'));
});


test('compact weekly hours keep Saturday separate from weekday range in all languages',async()=>{
  const { generateGroundedAnswer }=await import('../server.mjs');
  const rows=[
    {id:'hours',category:'Aukioloajat',title:'Aukioloajat',answer:'Ma-Pe : 09:00–19:00La : 09:00 -17:00',keywords:['aukioloajat'],source_type:'website',source_url:'https://example.fi/'},
  ];
  for(const [lang,message,label] of [
    ['fi','Oletteko auki lauantaina?','Lauantai'],
    ['en','Are you open on Saturday?','Saturday'],
    ['sv','Har ni öppet på lördag?','Lördag'],
  ]){
    const result=await generateGroundedAnswer({companyName:'Example',rows,message,history:[],lang});
    assert.equal(result.handoff,false,message+' '+JSON.stringify(result));
    assert.match(result.answer,new RegExp('^'+label+': 09:00 - 17:00'),result.answer);
    assert.doesNotMatch(result.answer,/Friday|Perjantai|Fredag/);
  }
});

test('Finnish normal haircut wording resolves from imported service evidence',async()=>{
  const { generateGroundedAnswer }=await import('../server.mjs');
  const rows=[
    {id:'svc',category:'Palvelut',title:'Palvelut: HIUSTEN LEIKKAUS (Tavallinen)',answer:'HIUSTEN LEIKKAUS (Tavallinen)',keywords:['palvelut','hiustenleikkaus'],source_type:'website',source_url:'https://example.fi/'},
    {id:'price',category:'Hinnat',title:'Hinnat: HIUSTEN LEIKKAUS (Tavallinen): €25',answer:'HIUSTEN LEIKKAUS (Tavallinen): €25',keywords:['hinta'],source_type:'website',source_url:'https://example.fi/'},
  ];
  const result=await generateGroundedAnswer({companyName:'Example',rows,message:'Teettekö tavallista hiustenleikkausta?',history:[],lang:'fi'});
  assert.equal(result.handoff,false,JSON.stringify(result));
  assert.match(result.answer,/Kyllä/i);
  assert.match(result.answer,/hiustenleikka/i);
});

test('orphan numeric prices never enter imported knowledge',()=>{
  const bundle={
    finalUrl:'https://example.fi/',
    products:[],
    pageDocuments:[{
      url:'https://example.fi/',
      blocks:[{text:'Palvelut',heading:''},{text:'€40',heading:''},{text:'$0.00 0',heading:''}],
      links:[],products:[],text:'Palvelut €40 $0.00 0'
    }],
  };
  const rows=essentialWebsiteCandidates(bundle);
  const text=candidateTextForTest(rows);
  assert.doesNotMatch(text,/(?:^|\s)€40(?:\s|$)|\$0\.00 0/i,JSON.stringify(rows));
});


test('branded barber service heading keeps its detached base price',()=>{
  const doc={
    url:'https://example.fi/prices',
    blocks:[
      {text:'M Cut™',heading:''},
      {text:'36 €',heading:'M Cut™'},
      {text:'M Cut XL™',heading:''},
      {text:'44 €',heading:'M Cut XL™'},
    ],
    links:[],products:[],text:'M Cut™ 36 € M Cut XL™ 44 €'
  };
  const rows=essentialWebsiteCandidates({finalUrl:'https://example.fi/',products:[],pageDocuments:[doc]});
  const text=candidateTextForTest(rows);
  assert.match(text,/M Cut™?: 36 €/i,JSON.stringify(rows));
  assert.match(text,/M Cut XL™?: 44 €/i,JSON.stringify(rows));
});


test('bare Finnish phone number is imported even without a phone heading',()=>{
  const doc={
    url:'https://example.fi/',
    blocks:[
      {text:'050 325 4690',heading:''},
      {text:'miestenparturiturku@gmail.com',heading:''},
    ],
    links:[],products:[],text:'050 325 4690 miestenparturiturku@gmail.com'
  };
  const bundle={finalUrl:'https://example.fi/',products:[],pageDocuments:[doc]};
  const profile=essentialWebsiteProfile(bundle);
  assert.match(profile.phone,/050\s*325\s*4690/);
  assert.equal(profile.email,'miestenparturiturku@gmail.com');
});

test('Duda and builder metadata never becomes customer knowledge',()=>{
  const doc={
    url:'https://example.fi/',
    blocks:[
      {text:'{"ssr_script":"","headsection":" ","current_url":"","collections":"e30=","sidebarPosition":"NA","pageFontSizeStyle":"@media (min-width: 1025px) { [data-version] .size-24 {--font-size:24;} }","extensionsToRender":{}}',heading:''},
      {text:'Hiustenleikkaus 31€',heading:'Hinnasto'},
    ],
    links:[],products:[],text:''
  };
  const rows=essentialWebsiteCandidates({finalUrl:'https://example.fi/',products:[],pageDocuments:[doc]});
  const text=candidateTextForTest(rows);
  assert.doesNotMatch(text,/ssr_script|pageFontSizeStyle|extensionsToRender|data-version|@media/i,JSON.stringify(rows));
  assert.match(text,/Hiustenleikkaus 31€/i);
});


test('email inside a skipped page-builder button is still imported',()=>{
  const html='<main><button class="email-widget">Lähetä meille sähköpostia (miestenparturiturku@gmail.com)</button><p>050 325 4690</p></main>';
  const doc=extractBusinessDocument(html,'https://example.fi/');
  const bundle={finalUrl:'https://example.fi/',products:[],pageDocuments:[doc]};
  const profile=essentialWebsiteProfile(bundle);
  assert.equal(profile.email,'miestenparturiturku@gmail.com');
  assert.match(profile.phone,/050\s*325\s*4690/);
});


test('merchant registry contact outranks unrelated branch contact on a generic ecommerce import',()=>{
  const branch={
    url:'https://shop.example/barbershop/riihimaki',
    blocks:[
      {text:'050 553 0478',heading:'Yhteystiedot'},
      {text:'Hämeenkatu 31, 11100 Riihimäki',heading:'Yhteystiedot'},
    ],
    links:[],products:[],text:''
  };
  const registry={
    url:'https://shop.example/pages/rekisteriseloste',
    blocks:[
      {text:'GF Lab Oy',heading:'Rekisterinpitäjä'},
      {text:'Postiosoite: Hallituskatu 9, 33200 Tampere',heading:'Rekisterinpitäjä'},
      {text:'asiakas@shop.example',heading:'Rekisterin vastaavan yhteystiedot'},
      {text:'040 654 5654',heading:'Rekisterin vastaavan yhteystiedot'},
    ],
    links:[],products:[],text:''
  };
  const profile=essentialWebsiteProfile({
    finalUrl:'https://shop.example/',
    products:[],
    pageDocuments:[branch,registry],
  });
  assert.equal(profile.email,'asiakas@shop.example');
  assert.match(profile.phone,/040\s*654\s*5654/);
  assert.equal(profile.address,'Hallituskatu 9, 33200 Tampere');
  assert.doesNotMatch([profile.phone,profile.email,profile.address].join(' '),/050\s*553|Hämeenkatu\s*31/i);
});

test('shipping-cost answer combines paid delivery options with the free-shipping threshold',async()=>{
  const { generateGroundedAnswer }=await import('../server.mjs');
  const rows=[
    {id:'free',category:'Toimitus',title:'Toimitus',answer:'Ilmainen toimitus 60€ ostoksiin.',keywords:['toimitus'],source_type:'website',source_url:'https://shop.example/shipping'},
    {id:'budbee-box',category:'Toimitus',title:'Toimitus',answer:'Budbee pakettiautomaatti: 4,80€',keywords:['toimitus'],source_type:'website',source_url:'https://shop.example/shipping'},
    {id:'budbee-home',category:'Toimitus',title:'Toimitus',answer:'Budbee kotiinkuljetus: 6,90€',keywords:['toimitus'],source_type:'website',source_url:'https://shop.example/shipping'},
    {id:'posti-box',category:'Toimitus',title:'Toimitus',answer:'Posti pakettiautomaatti tai noutopiste: 4,90€',keywords:['toimitus'],source_type:'website',source_url:'https://shop.example/shipping'},
    {id:'posti-home',category:'Toimitus',title:'Toimitus',answer:'Posti kotiinkuljetus: 9,90€',keywords:['toimitus'],source_type:'website',source_url:'https://shop.example/shipping'},
  ];
  for(const [lang,message] of [
    ['fi','Paljonko toimitus maksaa?'],
    ['en','How much does shipping cost?'],
    ['sv','Vad kostar frakten?'],
  ]){
    const result=await generateGroundedAnswer({companyName:'Shop',rows,message,history:[],lang});
    assert.equal(result.handoff,false,JSON.stringify(result));
    assert.match(result.answer,/4[.,]80/i,result.answer);
    assert.match(result.answer,/4[.,]90/i,result.answer);
    assert.match(result.answer,/60\s*€/i,result.answer);
  }
});


test('same-language return FAQ question is converted into a factual return answer',async()=>{
  const { generateGroundedAnswer }=await import('../server.mjs');
  const rows=[
    {id:'return-faq',category:'Palautukset ja vaihdot',title:'Palautukset ja vaihdot',answer:'Mitä 100 päivän palautusoikeus tarkoittaa?',keywords:['palautus'],source_type:'website',source_url:'https://shop.example/returns'},
  ];
  const result=await generateGroundedAnswer({
    companyName:'Shop',rows,message:'Millainen palautusoikeus teillä on?',history:[],lang:'fi'
  });
  assert.equal(result.handoff,false,JSON.stringify(result));
  assert.match(result.answer,/100\s+päivän/i,result.answer);
  assert.doesNotMatch(result.answer,/\?\s*$/,result.answer);
});

test('catalog product names are excluded from company service summary',()=>{
  const bundle={
    finalUrl:'https://shop.example/',
    products:[
      {name:'Hair Kit',url:'https://shop.example/products/hair-kit',price:46.99,currency:'EUR'},
      {name:'Shave Kit',url:'https://shop.example/products/shave-kit',price:49.90,currency:'EUR'},
    ],
    pageDocuments:[{
      url:'https://shop.example/',
      blocks:[
        {text:'Hair Kit',heading:'Palvelut'},
        {text:'Shave Kit',heading:'Palvelut'},
        {text:'Hair Cut',heading:'Hinnasto'},
        {text:'40€',heading:'Hair Cut'},
      ],
      links:[],products:[],text:''
    }]
  };
  const profile=essentialWebsiteProfile(bundle);
  assert.doesNotMatch(profile.services,/Hair Kit|Shave Kit/i,profile.services);
  assert.match(profile.services,/Hair Cut/i,profile.services);
});


test('natural address paraphrases resolve the same verified location in fi en sv',async()=>{
  const { generateGroundedAnswer }=await import('../server.mjs');
  const rows=[
    {id:'addr',category:'Sijainti ja myymälät',title:'Osoite',answer:'Maariankatu 3, 20100 Turku',keywords:['osoite'],source_type:'website',source_url:'https://example.fi/contact'},
  ];
  for(const [lang,message] of [
    ['fi','Voitko antaa tarkan osoitteen?'],
    ['fi','Missä teidän toimipiste on?'],
    ['en','Can you give me your exact address?'],
    ['en','Where is your location?'],
    ['sv','Kan jag få er exakta adress?'],
    ['sv','Var ligger ert verksamhetsställe?'],
  ]){
    const result=await generateGroundedAnswer({companyName:'Example',rows,message,history:[],lang});
    assert.equal(result.handoff,false,message+' '+JSON.stringify(result));
    assert.match(result.answer,/Maariankatu 3/i,message+' '+result.answer);
    assert.match(result.answer,/20100 Turku/i,message+' '+result.answer);
  }
});
