import test from 'node:test';
import assert from 'node:assert/strict';
import { extractProducts, parseProductKnowledgeRow } from '../website-knowledge.mjs';
import { generateGroundedAnswer, verifiedProductCards } from '../server.mjs';

const url='https://shop.example.fi/products/valkoinen-sohva';
const image='https://cdn.example.fi/assets/sohva.webp';
const row={
  id:'sohva-1',
  category:'Tuotteet',
  title:'Valkoinen kolmen istuttava sohva',
  answer:'Tuote: Valkoinen kolmen istuttava sohva. Hinta: 795.00 EUR. Linkki: '+url+'. Kuva: '+image+'. Kuvaus: Mukava valkoinen sohva.',
  source_url:url,
  approved:true,
};

test('JSON-LD product image and price are discovered from the actual product page',()=>{
  const html='<script type="application/ld+json">'+JSON.stringify({
    '@context':'https://schema.org','@type':'Product',
    name:'Valkoinen kolmen istuttava sohva',
    image:[{ '@type':'ImageObject',url:image }],
    description:'Mukava valkoinen sohva',
    offers:{'@type':'Offer',price:'795.00',priceCurrency:'EUR',url},
  })+'</script>';
  const items=extractProducts(html,url);
  assert.equal(items.length,1);
  assert.equal(items[0].imageUrl,image);
  assert.equal(items[0].price,795);
});

test('product rows preserve image metadata and render only grounded selections',()=>{
  const parsed=parseProductKnowledgeRow(row);
  assert.equal(parsed.imageUrl,image);
  assert.equal(parsed.price,795);
  const cards=verifiedProductCards({intent:'Tuotteet',handoff:false,selected:[row]});
  assert.equal(cards.length,1);
  assert.equal(cards[0].name,row.title);
  assert.equal(cards[0].url,url);
  assert.equal(cards[0].imageUrl,image);
  assert.equal(cards[0].price,795);
  assert.equal(verifiedProductCards({intent:'Tuotteet',handoff:true,selected:[row]}).length,0);
  assert.equal(verifiedProductCards({intent:'Toimitus',handoff:false,selected:[row]}).length,0);
  assert.equal(verifiedProductCards({intent:'Tuotteet',handoff:false,selected:[{
    ...row,id:'unsafe',source_url:'javascript:alert(1)',
    answer:'Tuote: Bad. Hinta: 3 EUR. Linkki: javascript:alert(1)'
  }]}).length,0);
});

test('browsing product names and generic catalog questions select cards',async()=>{
  const browse=await generateGroundedAnswer({
    companyName:'Testikauppa',rows:[row],message:'Näytä sohva',lang:'fi',
  });
  assert.equal(browse.handoff,false);
  assert.equal(browse.intent,'Tuotteet');
  assert.deepEqual(verifiedProductCards(browse).map(x=>x.url),[url]);

  const generic=await generateGroundedAnswer({
    companyName:'Testikauppa',rows:[row],message:'Mitä te myytte?',lang:'fi',
  });
  assert.equal(generic.handoff,false);
  assert.deepEqual(verifiedProductCards(generic).map(x=>x.url),[url]);
});

test('realistic older JAG product rows keep price and link for visual cards',async()=>{
  const putters=['Black','Bronze','Steel'].map((shade,index)=>({
    id:'jag-'+index,
    category:'Tuotteet',
    title:'JAG Satin '+shade+' - Putter',
    answer:'Tuote: JAG Satin '+shade+' - Putter. Hinta: 199.00 EUR. Linkki: https://jagputters.fi/products/jag-'+shade.toLowerCase()+'-blade-putter. Kuvaus: JAG Satin '+shade+' custom blade putter.',
    source_url:'https://jagputters.fi/products/jag-'+shade.toLowerCase()+'-blade-putter',
    approved:true,
  }));
  const result=await generateGroundedAnswer({
    companyName:'JAG Putters',
    rows:putters,
    message:'Mitä puttereita myytte',
    lang:'fi',
  });
  assert.equal(result.handoff,false);
  const cards=verifiedProductCards(result);
  assert.equal(cards.length,3);
  assert.ok(cards.every((card)=>card.price===199 && card.currency==='EUR' && card.name.startsWith('JAG Satin')));
  assert.ok(cards.every((card)=>card.url.startsWith('https://jagputters.fi/products/')));
  // Missing historical image metadata never produces invented image URLs.
  assert.ok(cards.every((card)=>card.imageUrl===''));
});

test('Try Bot asset version is updated for previously opened iOS clients',async()=>{
  const {readFile}=await import('node:fs/promises');
  const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
  const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
  assert.match(html,/ecommerce-product-cards-20261011/);
  assert.match(app,/appendPreviewProductCards\(bubble,result\.products,currentLang\(\)\)/);
  assert.match(app,/!hasProducts\|\|action\.type!=='product'/);
});

test('product metadata fills missing JSON-LD image from the same product page only',()=>{
  const productUrl='https://store.example.fi/products/headcover';
  const img='https://cdn.shopify.com/s/files/1/1234/files/headcover.jpg';
  const json={
    '@context':'https://schema.org','@graph':[
      {'@type':'Product',name:'Headcover',url:productUrl,offers:{'@type':'Offer',price:'15',priceCurrency:'EUR'}},
      {'@type':'Product',name:'Unrelated grip',url:'https://store.example.fi/products/grip',offers:{'@type':'Offer',price:'29',priceCurrency:'EUR'}},
    ],
  };
  const html='<meta property="og:image" content="'+img+'"><script type="application/ld+json">'+JSON.stringify(json)+'</script>';
  const products=extractProducts(html,productUrl);
  assert.equal(products.find(p=>p.name==='Headcover').imageUrl,img);
  assert.equal(products.find(p=>p.name==='Unrelated grip').imageUrl,'');
});

test('public site CSP permits legitimate HTTPS product CDN images',async()=>{
  const {readFile}=await import('node:fs/promises');
  const server=await readFile(new URL('../server.mjs',import.meta.url),'utf8');
  assert.match(server,/imgSrc:\["'self'","data:","blob:","https:"\]/);
  assert.match(server,/Promise\.allSettled\(requests\)/);
  assert.match(server,/featured_image \|\| data\.image \|\| data\.images\?\.\[0\]/);
  assert.match(server,/productCardImageCache/);
});
